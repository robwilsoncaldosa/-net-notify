
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

  // Get current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate dates for comparison
  const todayStr = today.toISOString().split('T')[0];
  
  // Use the daysAhead parameter to calculate future dates
  const futureDueDate = new Date(today);
  futureDueDate.setDate(today.getDate() + daysAhead);

  // Calculate exactly one day after due date for overdue notifications
  const oneDayAfterDue = new Date(today);
  oneDayAfterDue.setDate(today.getDate() - 1);
  const oneDayAfterDueStr = oneDayAfterDue.toISOString().split('T')[0];
  
  // Build the query based on parameters
  let query = `due_date.eq.${todayStr}`;
  
  // Add future dates based on daysAhead parameter
  if (daysAhead >= 2) {
    const twoDaysAhead = new Date(today);
    twoDaysAhead.setDate(today.getDate() + 2);
    const twoDaysAheadStr = twoDaysAhead.toISOString().split('T')[0];
    query += `,due_date.eq.${twoDaysAheadStr}`;
  }
  
  if (daysAhead >= 3) {
    const threeDaysAhead = new Date(today);
    threeDaysAhead.setDate(today.getDate() + 3);
    const threeDaysAheadStr = threeDaysAhead.toISOString().split('T')[0];
    query += `,due_date.eq.${threeDaysAheadStr}`;
  }
  
  // Add overdue check if enabled
  if (checkOverdue) {
    query += `,due_date.eq.${oneDayAfterDueStr}`;
  }
  
  // 1. Get all customers with due dates based on parameters
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

  if (!customers || customers.length === 0) {
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


  // 2. Process each customer
  const notificationPromises = customers.map(async (customer) => {
    try {
      const customerDueDate = new Date(customer.due_date);
      customerDueDate.setHours(0, 0, 0, 0);
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const oneDayAfterDueDate = new Date(todayDate);
      oneDayAfterDueDate.setDate(todayDate.getDate() - 1);
      
      
      // Check if customer is exactly 1 day past due and we should check for overdue accounts
      if (checkOverdue && customerDueDate.getTime() === oneDayAfterDueDate.getTime()) {
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

      // Check if this is a notification for today or future dates
      // Calculate all possible notification dates based on daysAhead parameter
      const notificationDates = [todayDate.getTime()];
      
      if (daysAhead >= 2) {
        const twoDaysAheadDate = new Date(todayDate);
        twoDaysAheadDate.setDate(todayDate.getDate() + 2);
        notificationDates.push(twoDaysAheadDate.getTime());
      }
      
      if (daysAhead >= 3) {
        const threeDaysAheadDate = new Date(todayDate);
        threeDaysAheadDate.setDate(todayDate.getDate() + 3);
        notificationDates.push(threeDaysAheadDate.getTime());
      }
      
      // Send notification if customer's due date matches any notification date
      if (notificationDates.includes(customerDueDate.getTime())) {
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
      
        // Send SMS in parallel
        await sendSMSServer([customer.phone_number], messageContent);
        notifiedCustomers.push(customer.id);
        console.log(`Successfully sent SMS to customer ${customer.id}`);
      }
    } catch (error) {
      errors.push(`Error processing customer ${customer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  await Promise.all(notificationPromises);

  return { notifiedCustomers, suspendedCustomers, errors };
}
