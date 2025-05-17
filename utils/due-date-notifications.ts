
import { sendSMS } from './send-sms';
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
  
  const futureDueDate = new Date(today);
  futureDueDate.setDate(today.getDate() + daysAhead);
  const futureDueDateStr = futureDueDate.toISOString().split('T')[0];
  
  const oneDayAgo = new Date(today);
  oneDayAgo.setDate(today.getDate() - 1);
  const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

  // 1. Get all customers with due dates within specified days or past due
  const { data: customers, error: customersError } = await supabase
    .from('customer')
    .select('id, name, phone_number, due_date, area, account_status, payment_status')
    .or(`due_date.lte.${futureDueDateStr},due_date.gte.${oneDayAgoStr}`)
    .eq('account_status', 'active');

  if (customersError) {
    console.error('Error fetching customers:', customersError);
    errors.push(`Failed to fetch customers: ${customersError.message}`);
    return { notifiedCustomers, suspendedCustomers, errors };
  }

  if (!customers || customers.length === 0) {
    return { notifiedCustomers, suspendedCustomers, errors };
  }

  // 2. Process each customer
  const notificationPromises = customers.map(async (customer) => {
    try {
      const dueDate = new Date(customer.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const dueDateStr = customer.due_date;

      // Check if customer is more than 1 day past due and we should check for overdue accounts
      if (checkOverdue && dueDateStr < oneDayAgoStr) {
        // Update account status to suspended
        const { error: updateError } = await supabase
          .from('customer')
          .update({ account_status: 'suspended' })
          .eq('id', customer.id);

        if (updateError) {
          errors.push(`Failed to suspend customer ${customer.id}: ${updateError.message}`);
        } else {
          suspendedCustomers.push(customer.id);
        }
return; // Skip sending SMS for suspended customers
      }

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
        .replace(/\{\{phone\}\}/g, customer.phone_number || '');

      // Send SMS in parallel
      await sendSMS([customer.phone_number], messageContent);
      notifiedCustomers.push(customer.id);
      console.log(`Successfully sent SMS to customer ${customer.id}`);
    } catch (error) {
      errors.push(`Error processing customer ${customer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  await Promise.all(notificationPromises);

  return { notifiedCustomers, suspendedCustomers, errors };
}