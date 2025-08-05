
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
  console.log('🔄 Starting due date notifications process...', { daysAhead, checkOverdue });
  
  const supabase = await createClient();
  const errors: string[] = [];
  const notifiedCustomers: number[] = [];
  const suspendedCustomers: number[] = [];

  try {
    // Create target date based on daysAhead parameter
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(23, 59, 59, 999); // Set to end of day to include the full target date
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Also get today's date for comparison
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get the actual local date string to compare
    const localToday = new Date();
    const localTodayStr = localToday.getFullYear() + '-' + 
      String(localToday.getMonth() + 1).padStart(2, '0') + '-' + 
      String(localToday.getDate()).padStart(2, '0');
    
    console.log('📅 Date information:');
    console.log(`  System UTC today: ${todayStr}`);
    console.log(`  Local today: ${localTodayStr}`);
    console.log(`  Target date (today + ${daysAhead} days): ${targetDateStr}`);
    console.log(`  Looking for customers with due_date <= ${targetDateStr} (includes overdue customers)`);
    
    // Get customers with due dates on or before target date who are still active
    // This will include both customers due today AND overdue customers
    const { data: customers, error: customersError } = await supabase
      .from('customer')
      .select('id, name, phone_number, due_date, area, account_status, payment_status, plan')
      .lte('due_date', targetDateStr)
      .eq('account_status', 'active');

    if (customersError) {
      console.error('❌ Database error while fetching customers:', customersError.message);
      errors.push(`Failed to fetch customers: ${customersError.message}`);
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    console.log(`📊 Found ${customers?.length || 0} customers with due dates on or before ${targetDateStr}`);

    // Let's also check what customers exist in the database for debugging
    const { data: allActiveCustomers } = await supabase
      .from('customer')
      .select('id, name, due_date, account_status, payment_status')
      .eq('account_status', 'active')
      .order('due_date', { ascending: true });
    
    console.log('🔍 All active customers in database (sorted by due date):', allActiveCustomers?.map(c => ({
      id: c.id,
      name: c.name,
      due_date: c.due_date,
      account_status: c.account_status,
      payment_status: c.payment_status
    })));

    // Show which customers match our criteria
    const matchingCustomers = allActiveCustomers?.filter(c => c.due_date <= targetDateStr);
    console.log(`🎯 Customers matching criteria (due_date <= ${targetDateStr}):`, matchingCustomers?.map(c => ({
      id: c.id,
      name: c.name,
      due_date: c.due_date,
      daysOverdue: Math.floor((new Date(targetDateStr).getTime() - new Date(c.due_date).getTime()) / (1000 * 60 * 60 * 24))
    })));

    if (!customers?.length) {
      console.log('✅ No customers found with due dates on or before target date - nothing to process');
      console.log('💡 Possible reasons:');
      console.log('  - All customers are up to date with payments');
      console.log('  - No customers have due dates matching the criteria');
      console.log('  - All overdue customers are already suspended');
      console.log(`  - Current target date (${targetDateStr}) might be too early`);
      
      // Show what would be included if we extended the date range
      const futureCustomers = allActiveCustomers?.filter(c => c.due_date > targetDateStr);
      if (futureCustomers?.length) {
        console.log('📋 Customers with future due dates (not processed today):');
        futureCustomers.slice(0, 5).forEach(c => {
          const daysUntilDue = Math.ceil((new Date(c.due_date).getTime() - new Date(targetDateStr).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`  - ${c.name}: due ${c.due_date} (${daysUntilDue} days from target date)`);
        });
      }
      
      return { notifiedCustomers, suspendedCustomers, errors };
    }

    // Categorize customers by their overdue status
    const overdueCustomers = customers.filter(c => c.due_date < todayStr);
    const dueTodayCustomers = customers.filter(c => c.due_date === todayStr);
    const dueFutureCustomers = customers.filter(c => c.due_date > todayStr);

    console.log('📋 Customer breakdown:');
    console.log(`  🔴 Overdue customers (due before ${todayStr}): ${overdueCustomers.length}`);
    console.log(`  🟡 Due today (${todayStr}): ${dueTodayCustomers.length}`);
    console.log(`  🟢 Due in future (after ${todayStr}): ${dueFutureCustomers.length}`);

    // Log customer details for debugging
    console.log('👥 All customers to process:', customers.map(c => {
      const daysOverdue = Math.floor((new Date(todayStr).getTime() - new Date(c.due_date).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        name: c.name,
        due_date: c.due_date,
        area: c.area,
        phone: c.phone_number,
        account_status: c.account_status,
        payment_status: c.payment_status,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        status: daysOverdue > 0 ? '🔴 OVERDUE' : daysOverdue === 0 ? '🟡 DUE TODAY' : '🟢 DUE FUTURE'
      };
    }));

    // Get plan labels for template replacement
    const { data: plans } = await supabase
      .from('plan')
      .select('id, label');
    
    const planMap = new Map(plans?.map(plan => [plan.id, plan.label]) || []);
    console.log(`📋 Loaded ${planMap.size} plan labels for template replacement`);

    // Helper function to send SMS and handle database updates
    const processCustomer = async (customer: any) => {
      console.log(`🔄 Processing customer ${customer.id} (${customer.name})`);
      
      try {
        // Always update customer status first (regardless of SMS success)
        if (checkOverdue) {
          console.log(`⏸️ Suspending customer ${customer.id} due to overdue payment`);
          
          const { error: updateError } = await supabase
            .from('customer')
            .update({ 
              account_status: 'suspended',
              payment_status: 'overdue'
            })
            .eq('id', customer.id);

          if (updateError) {
            console.error(`❌ Failed to suspend customer ${customer.id}:`, updateError.message);
            errors.push(`Failed to suspend customer ${customer.id}: ${updateError.message}`);
          } else {
            console.log(`✅ Successfully suspended customer ${customer.id}`);
            suspendedCustomers.push(customer.id);
          }
        }

        // Try to send SMS notification
        console.log(`📱 Looking for SMS template for area: ${customer.area}`);
        
        const { data: templates, error: templatesError } = await supabase
          .from('sms_templates')
          .select('content')
          .eq('area', customer.area)
          .limit(1);

        if (templatesError || !templates?.length) {
          console.error(`❌ No SMS template found for customer ${customer.id} in area ${customer.area}`);
          errors.push(`No SMS template found for customer ${customer.id} in area ${customer.area}`);
          return;
        }

        console.log(`📝 Found SMS template for area ${customer.area}`);

        // Prepare message content
        const messageContent = templates[0].content
          .replace(/\{\{name\}\}/g, customer.name)
          .replace(/\{\{due_date\}\}/g, new Date(customer.due_date).toLocaleDateString())
          .replace(/\{\{phone_number\}\}/g, customer.phone_number || '')
          .replace(/\{\{phone\}\}/g, customer.phone_number || '')
          .replace(/\{\{plan\}\}/g, planMap.get(customer.plan) || customer.plan || '')
          .replace(/\{\{payment_status\}\}/g, 'overdue');

        console.log(`📤 Sending SMS to ${customer.phone_number} for customer ${customer.id}`);
        console.log(`📄 Message preview: ${messageContent.substring(0, 100)}...`);

        // Send SMS
        await sendSMSServer([customer.phone_number], messageContent);
        console.log(`✅ SMS sent successfully to customer ${customer.id}`);
        notifiedCustomers.push(customer.id);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error processing customer ${customer.id}:`, errorMsg);
        errors.push(`Failed to process customer ${customer.id}: ${errorMsg}`);
      }
    };

    // Process all customers in parallel
    console.log(`🚀 Processing ${customers.length} customers in parallel...`);
    await Promise.all(customers.map(processCustomer));

    // Final summary
    console.log('📊 Processing complete! Summary:');
    console.log(`  ✅ Customers notified: ${notifiedCustomers.length}`);
    console.log(`  ⏸️ Customers suspended: ${suspendedCustomers.length}`);
    console.log(`  ❌ Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('🔍 Error details:', errors);
    }
    
    if (notifiedCustomers.length === 0 && suspendedCustomers.length === 0 && errors.length === 0) {
      console.log('ℹ️ No actions taken - all customers are up to date with their payments');
    }

    return { notifiedCustomers, suspendedCustomers, errors };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Fatal error in processDueDateNotifications:', errorMsg);
    errors.push(`Fatal error: ${errorMsg}`);
    return { notifiedCustomers, suspendedCustomers, errors };
  }
}
