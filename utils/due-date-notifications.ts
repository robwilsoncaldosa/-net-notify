
// Change this import
import { sendSMSServer } from './send-sms-server';
import { createClient } from './supabase/server';

type NotificationResult = {
  notifiedCustomers: number[];
  suspendedCustomers: number[];
  errors: string[];
};

export async function processDueDateNotifications(
  daysAhead = 0, // Changed from 3 to 0 - only process on due date
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
    
    // Get customers with due dates today OR in the past (overdue)
    const { data: customers, error: customersError } = await supabase
      .from('customer')
      .select('id, name, phone_number, due_date, area, account_status, payment_status, plan')
      .lte('due_date', todayStr) // Less than or equal to today (includes past dates)
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

    // Process each customer
    const notificationPromises = customers.map(async (customer) => {
      try {
        const customerDueDate = new Date(customer.due_date);
        customerDueDate.setHours(0, 0, 0, 0);
        
        const isOverdue = customerDueDate.getTime() < today.getTime();
        const isDueToday = customerDueDate.getTime() === today.getTime();
        
        // Handle overdue customers (past due dates) AND customers due today
        if (checkOverdue && (isOverdue || isDueToday)) {
          // Update account status to suspended and payment status to overdue FIRST
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
          }
          
          // Try to send overdue notification (separate from database update)
          try {
            const { data: templates, error: templatesError } = await supabase
              .from('sms_templates')
              .select('id, name, content')
              .eq('area', customer.area)
              .limit(1);

            if (templatesError || !templates || templates.length === 0) {
              errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
            } else {
              const template = templates[0];
              const messageContent = template.content
                .replace(/\{\{name\}\}/g, customer.name)
                .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
                .replace(/\{\{phone_number\}\}/g, customer.phone_number || '')
                .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '')
                .replace(/\{\{payment_status\}\}/g, 'overdue');
                
              // Send SMS for overdue customers
              await sendSMSServer([customer.phone_number], messageContent);
              notifiedCustomers.push(customer.id);
            }
          } catch (smsError) {
            errors.push(`Failed to send SMS to customer ${customer.id}: ${smsError instanceof Error ? smsError.message : 'Unknown SMS error'}`);
          }
        } else if (isDueToday) {
          // Try to send due date notification for customers due today
          try {
            const { data: templates, error: templatesError } = await supabase
              .from('sms_templates')
              .select('id, name, content')
              .eq('area', customer.area)
              .limit(1);
          
            if (templatesError || !templates || templates.length === 0) {
              errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
            } else {
              const template = templates[0];
              const messageContent = template.content
                .replace(/\{\{name\}\}/g, customer.name)
                .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
                .replace(/\{\{phone\}\}/g, customer.phone_number || '')
                .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '');
            
              // Send SMS
              await sendSMSServer([customer.phone_number], messageContent);
              notifiedCustomers.push(customer.id);
            }
          } catch (smsError) {
            errors.push(`Failed to send SMS to customer ${customer.id}: ${smsError instanceof Error ? smsError.message : 'Unknown SMS error'}`);
          }
        }
      } catch (error) {
        console.error(`Error processing customer ${customer.id}:`, error);
        errors.push(`Error processing customer ${customer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    await Promise.all(notificationPromises);

    return { notifiedCustomers, suspendedCustomers, errors };
    
  } catch (error) {
    console.error('Fatal error in processDueDateNotifications:', error);
    errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { notifiedCustomers, suspendedCustomers, errors };
  }
}
