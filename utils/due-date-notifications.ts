
// Change this import
import { sendSMSServer } from './send-sms-server';
import { createClient } from './supabase/server';

type NotificationResult = {
  notifiedCustomers: number[];
  suspendedCustomers: number[];
  errors: string[];
};

export async function processDueDateNotifications(
  daysAhead = 0,
  checkOverdue = true
): Promise<NotificationResult> {
  const supabase = await createClient();
  const errors: string[] = [];
  const notifiedCustomers: number[] = [];
  const suspendedCustomers: number[] = [];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get customers with due dates today or in the past who are still active
    const { data: customers, error: customersError } = await supabase
      .from('customer')
      .select('id, name, phone_number, due_date, area, account_status, payment_status, plan')
      .lte('due_date', todayStr)
      .eq('account_status', 'active');

    if (customersError) {
      errors.push(`Failed to fetch customers: ${customersError.message}`);
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    if (!customers?.length) {
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    // Get plan labels for template replacement
    const { data: plans } = await supabase
      .from('plan')
      .select('id, label');
    
    const planMap = new Map(plans?.map(plan => [plan.id, plan.label]) || []);

    // Helper function to send SMS and handle database updates
    const processCustomer = async (customer: any) => {
      try {
        // Always update customer status first (regardless of SMS success)
        if (checkOverdue) {
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
        }

        // Try to send SMS notification
        const { data: templates, error: templatesError } = await supabase
          .from('sms_templates')
          .select('content')
          .eq('area', customer.area)
          .limit(1);

        if (templatesError || !templates?.length) {
          errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
          return;
        }

        // Prepare message content
        const messageContent = templates[0].content
          .replace(/\{\{name\}\}/g, customer.name)
          .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
          .replace(/\{\{phone_number\}\}/g, customer.phone_number || '')
          .replace(/\{\{phone\}\}/g, customer.phone_number || '')
          .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '')
          .replace(/\{\{payment_status\}\}/g, 'overdue');

        // Send SMS
        await sendSMSServer([customer.phone_number], messageContent);
        notifiedCustomers.push(customer.id);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process customer ${customer.id}: ${errorMsg}`);
      }
    };

    // Process all customers in parallel
    await Promise.all(customers.map(processCustomer));

    return { notifiedCustomers, suspendedCustomers, errors };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Fatal error: ${errorMsg}`);
    return { notifiedCustomers, suspendedCustomers, errors };
  }
}
