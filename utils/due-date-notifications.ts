
// Change this import
import { sendSMSServer } from './send-sms-server';
import { createClient } from './supabase/server';

type NotificationResult = {
  notifiedCustomers: number[];
  suspendedCustomers: number[];
  errors: string[];
};

export async function processDueDateNotifications(
  daysAhead = 3,
  checkOverdue = true
): Promise<NotificationResult> {
  const supabase = await createClient();
  const errors: string[] = [];
  const notifiedCustomers: number[] = [];
  const suspendedCustomers: number[] = [];

  try {
    // Get current date and time
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate dates for comparison
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate future date range
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    // Calculate exactly one day after due date for overdue notifications
    const oneDayAfterDue = new Date(today);
    oneDayAfterDue.setDate(today.getDate() - 1);
    const oneDayAfterDueStr = oneDayAfterDue.toISOString().split('T')[0];
    
    console.log('Date range check:');
    console.log('Today:', todayStr);
    console.log('Current time:', now.toLocaleTimeString());
    console.log('Future date (today + ' + daysAhead + ' days):', futureDateStr);
    console.log('Overdue check date:', oneDayAfterDueStr);
    
    // Build query for date range - include today's due dates for 12 PM check
    let query = `due_date.gte.${todayStr},due_date.lte.${futureDateStr}`;
    
    // Add overdue check if enabled - include both today's dates and past due dates
    if (checkOverdue) {
      query = `or(and(due_date.gte.${todayStr},due_date.lte.${futureDateStr}),due_date.eq.${oneDayAfterDueStr})`;
    }
    
    console.log('Supabase query:', query);
    
    // Get all customers with due dates in range
    const { data: customers, error: customersError } = await supabase
      .from('customer')
      .select('id, name, phone_number, due_date, area, account_status, payment_status, plan')
      .or(query)
      .eq('account_status', 'active');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      errors.push(`Failed to fetch customers: ${customersError.message}`);
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    console.log('Customers found:', customers?.length || 0);
    if (customers && customers.length > 0) {
      console.log('Customer due dates:', customers.map(c => ({ name: c.name, due_date: c.due_date })));
    }

    if (!customers || customers.length === 0) {
      console.log('No customers found matching criteria');
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    // Fetch all plans to get labels
    const { data: plans, error: plansError } = await supabase
      .from('plan')
      .select('id, label');
      
    if (plansError) {
      console.error('Error fetching plans:', plansError);
      errors.push(`Failed to fetch plans: ${plansError.message}`);
    }
    
    // Create a map of plan IDs to plan labels for quick lookup
    const planMap = new Map();
    if (plans) {
      plans.forEach(plan => {
        planMap.set(plan.id, plan.label);
      });
    }

    // Process each customer
    const notificationPromises = customers.map(async (customer) => {
      try {
        const customerDueDate = new Date(customer.due_date);
        customerDueDate.setHours(0, 0, 0, 0);
        
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        const oneDayAfterDueDate = new Date(todayDate);
        oneDayAfterDueDate.setDate(todayDate.getDate() - 1);
        
        console.log(`Processing customer ${customer.name} with due date ${customer.due_date}`);
        
        // Check if customer is overdue
        let isOverdue = false;
        
        // Case 1: Due date is today and it's past 12 PM
        if (customerDueDate.getTime() === todayDate.getTime()) {
          const currentHour = now.getHours();
          if (currentHour >= 12) {
            isOverdue = true;
            console.log(`Customer ${customer.name} is overdue (due today, past 12 PM)`);
          }
        }
        // Case 2: Due date was yesterday or earlier
        else if (customerDueDate.getTime() <= oneDayAfterDueDate.getTime()) {
          isOverdue = true;
          console.log(`Customer ${customer.name} is overdue (due date passed)`);
        }
        
        if (checkOverdue && isOverdue) {
          console.log(`Customer ${customer.name} is overdue, suspending account`);
          
          // Update account status to suspended and payment status to overdue
          const { error: updateError } = await supabase
            .from('customer')
            .update({ 
              account_status: 'suspended',
              payment_status: 'overdue'
            })
            .eq('id', customer.id);

          if (updateError) {
            errors.push(`Failed to suspend customer ${customer.id}: ${updateError.message}`);
          } else {
            suspendedCustomers.push(customer.id);
            
            // Send overdue notification
            const { data: templates, error: templatesError } = await supabase
              .from('sms_templates')
              .select('id, name, content')
              .eq('area', customer.area)
              .limit(1);

            if (templatesError || !templates || templates.length === 0) {
              errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
              return;
            }

            const template = templates[0];
            const messageContent = template.content
              .replace(/\{\{name\}\}/g, customer.name)
              .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
              .replace(/\{\{phone_number\}\}/g, customer.phone_number || '')
              .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '')
              .replace(/\{\{payment_status\}\}/g, customer.payment_status || '');
              
            // Send SMS for overdue customers
            await sendSMSServer([customer.phone_number], messageContent);
            notifiedCustomers.push(customer.id);
            console.log(`Successfully sent overdue SMS to customer ${customer.id}`);
          }
          return; // Skip further processing for suspended customers
        }

        // Check if this customer should receive a notification (due date is within range and not overdue)
        if (customerDueDate.getTime() >= todayDate.getTime() && customerDueDate.getTime() <= futureDate.getTime() && !isOverdue) {
          console.log(`Sending notification to ${customer.name} for upcoming due date`);
          
          // Get SMS template for customer's area
          const { data: templates, error: templatesError } = await supabase
            .from('sms_templates')
            .select('id, name, content')
            .eq('area', customer.area)
            .limit(1);
        
          if (templatesError || !templates || templates.length === 0) {
            errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
            return;
          }
        
          const template = templates[0];
          const messageContent = template.content
            .replace(/\{\{name\}\}/g, customer.name)
            .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
            .replace(/\{\{phone\}\}/g, customer.phone_number || '')
            .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '');
        
          // Send SMS
          await sendSMSServer([customer.phone_number], messageContent);
          notifiedCustomers.push(customer.id);
          console.log(`Successfully sent SMS to customer ${customer.id}`);
        }
      } catch (error) {
        console.error(`Error processing customer ${customer.id}:`, error);
        errors.push(`Error processing customer ${customer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    await Promise.all(notificationPromises);

    console.log('Final results:', {
      notifiedCustomers: notifiedCustomers.length,
      suspendedCustomers: suspendedCustomers.length,
      errors: errors.length
    });

    return { notifiedCustomers, suspendedCustomers, errors };
    
  } catch (error) {
    console.error('Fatal error in processDueDateNotifications:', error);
    errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { notifiedCustomers, suspendedCustomers, errors };
  }
}
