    //   @ts-expect-error will fix this later
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
    //   @ts-expect-error will fix this later
import { format, addMonths, addDays } from 'https://esm.sh/date-fns@2.30.0';

const DEFAULT_TEMPLATE = "Hi {{name}}, your internet bill payment is due today ({{dueDate}}). Kindly settle your balance to avoid service interruption. Thank you!";

// Initialize Supabase client
const supabase = createClient(
    //   @ts-expect-error will fix this later
  process.env.get('SUPABASE_URL') ?? '',
    //   @ts-expect-error will fix this later
  process.env.get('SUPABASE_ANON_KEY') ?? ''
);

const processTemplate = (template: string, customer: any): string => {
  const dueDate = new Date(customer.due_date);
  return template
    .replace(/{{name}}/g, customer.name)
    .replace(/{{dueDate}}/g, format(dueDate, "MMMM d, yyyy"))
    .replace(/{{phoneNumber}}/g, customer.phone_number);
};

export const handler = async (_req: Request) => {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStr = today.toISOString().split('T')[0];

    // 1. Find customers with due date today
    const { data: dueCustomers, error: dueError } = await supabase
      .from('customer')
      .select('*')
      .eq('due_date', todayStr);

    if (dueError) throw dueError;

    // 2. Send SMS to customers with due date today
    for (const customer of dueCustomers || []) {
      const message = processTemplate(DEFAULT_TEMPLATE, customer);
      
      // Use the same sendSMS function
      await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers: [customer.phone_number],
          message,
        }),
      });
    }

    // 3. Update payment status and due date for paid customers
    const { data: paidCustomers, error: paidError } = await supabase
      .from('customer')
      .select('*')
      .eq('payment_status', 'paid')
      .in('due_date', [
        format(today, 'yyyy-MM-dd'),
        format(addDays(today, 1), 'yyyy-MM-dd'),
        format(addDays(today, -1), 'yyyy-MM-dd'),
      ]);

    if (paidError) throw paidError;

    // Update each paid customer
    for (const customer of paidCustomers || []) {
      const newDueDate = addMonths(new Date(customer.due_date), 1);
      
      await supabase
        .from('customer')
        .update({
          payment_status: 'unpaid',
          due_date: format(newDueDate, 'yyyy-MM-dd'),
        })
        .eq('id', customer.id);
    }

    return new Response(JSON.stringify({
      message: 'Daily notifications processed successfully',
      notificationsSent: dueCustomers?.length || 0,
      customersUpdated: paidCustomers?.length || 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};