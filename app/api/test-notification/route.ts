import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendSMSServer } from '@/utils/send-sms-server';

type TestNotificationResponse = {
  success: boolean;
  data?: {
    testCustomer?: any;
    messageContent?: string;
    smsResult?: any;
    suspensionResult?: any;
    dateInfo?: any;
    processingDetails?: any;
    timestamp: string;
    executionType: string;
  };
  error?: string;
  details?: unknown;
};

export async function GET(): Promise<NextResponse<TestNotificationResponse>> {
  try {
    const testPhoneNumbers = ['+639914984912'];
    const timestamp = new Date().toISOString();
    const executionType = 'test-due-date-notification-with-conditions';
    
    console.log(`🧪 [TEST] Starting due-date notification test`);
    
    const supabase = await createClient();
    
    // Use the same date logic as processDueDateNotifications
    const daysAhead = 0;
    const checkOverdue = true;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(23, 59, 59, 999);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const localToday = new Date();
    const localTodayStr = localToday.getFullYear() + '-' + 
      String(localToday.getMonth() + 1).padStart(2, '0') + '-' + 
      String(localToday.getDate()).padStart(2, '0');
    
    const dateInfo = {
      systemUTCToday: todayStr,
      localToday: localTodayStr,
      targetDate: targetDateStr,
      daysAhead,
      checkOverdue
    };
    
    console.log(`📅 Target date: ${targetDateStr} | Looking for due_date <= ${targetDateStr}`);
    
    // Get customers with due dates on or before target date who are still active
    const { data: allCustomers, error: customersError } = await supabase
      .from('customer')
      .select('id, name, phone_number, due_date, area, account_status, payment_status, plan')
      .lte('due_date', targetDateStr)
      .eq('account_status', 'active');

    if (customersError) {
      console.error('❌ Database error:', customersError.message);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch customers: ${customersError.message}`,
        details: customersError.message
      }, { status: 500 });
    }

    console.log(`📊 Found ${allCustomers?.length || 0} customers matching criteria`);

    // Filter to only your test customer
    const testCustomer = allCustomers?.find(customer => 
      testPhoneNumbers.some(testNum => 
        customer.phone_number === testNum || 
        customer.phone_number?.replace(/\+/g, '') === testNum.replace(/\+/g, '')
      )
    );

    // Always send a test SMS regardless of whether customer is found
    let smsResult;
    let messageContent;
    let processingDetails;
    let suspensionResult;

    if (!testCustomer) {
      console.log(`❌ Test customer not found in results - sending notification SMS anyway`);
      
      // Send notification SMS that no customer was found
      const notificationMessage = `[TEST CRON] ${timestamp}: No customers found matching criteria. Target date: ${targetDateStr}. Found ${allCustomers?.length || 0} total customers with due dates <= ${targetDateStr}.`;
      
      try {
        console.log(`📤 Sending notification SMS to test numbers`);
        await sendSMSServer(testPhoneNumbers, notificationMessage);
        console.log(`✅ Notification SMS sent successfully`);
        smsResult = { success: true, message: 'Notification SMS sent - no customers found' };
      } catch (smsError) {
        console.error(`❌ Notification SMS failed:`, smsError instanceof Error ? smsError.message : 'Unknown error');
        smsResult = { error: smsError instanceof Error ? smsError.message : 'Unknown SMS error' };
      }

      messageContent = notificationMessage;
      processingDetails = {
        status: '❌ NO CUSTOMER FOUND',
        meetsDateCriteria: false,
        totalCustomersFound: allCustomers?.length || 0,
        testPhoneNumbers
      };
      suspensionResult = { message: 'No customer found, skipping suspension test' };

      return NextResponse.json({
        success: true,
        data: {
          testCustomer: null,
          messageContent,
          smsResult,
          suspensionResult,
          dateInfo,
          processingDetails,
          timestamp,
          executionType,
          foundCustomers: allCustomers?.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone_number,
            due_date: c.due_date
          }))
        }
      });
    }

    // Customer found - proceed with normal testing
    const daysOverdue = Math.floor((new Date(todayStr).getTime() - new Date(testCustomer.due_date).getTime()) / (1000 * 60 * 60 * 24));
    const customerStatus = daysOverdue > 0 ? '🔴 OVERDUE' : daysOverdue === 0 ? '🟡 DUE TODAY' : '🟢 DUE FUTURE';
    
    processingDetails = {
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      status: customerStatus,
      willBeSuspended: checkOverdue,
      meetsDateCriteria: testCustomer.due_date <= targetDateStr
    };

    console.log(`👤 Test customer: ${testCustomer.name} | ${customerStatus} | Due: ${testCustomer.due_date}`);

    // Get plan labels for template replacement
    const { data: plans } = await supabase
      .from('plan')
      .select('id, label');
    
    const planMap = new Map(plans?.map(plan => [plan.id, plan.label]) || []);

    // Get SMS template for the customer's area
    const { data: templates, error: templatesError } = await supabase
      .from('sms_templates')
      .select('content')
      .eq('area', testCustomer.area)
      .limit(1);

    if (templatesError || !templates?.length) {
      console.error(`❌ No SMS template for area: ${testCustomer.area}`);
      
      // Send notification SMS about missing template
      const templateErrorMessage = `[TEST CRON] ${timestamp}: Customer found but no SMS template for area ${testCustomer.area}. Customer: ${testCustomer.name} (${testCustomer.phone_number})`;
      
      try {
        console.log(`📤 Sending template error notification SMS`);
        await sendSMSServer(testPhoneNumbers, templateErrorMessage);
        console.log(`✅ Template error notification SMS sent`);
        smsResult = { success: true, message: 'Template error notification sent' };
      } catch (smsError) {
        console.error(`❌ Template error notification SMS failed:`, smsError instanceof Error ? smsError.message : 'Unknown error');
        smsResult = { error: smsError instanceof Error ? smsError.message : 'Unknown SMS error' };
      }

      return NextResponse.json({
        success: true,
        data: {
          testCustomer: {
            id: testCustomer.id,
            name: testCustomer.name,
            phone_number: testCustomer.phone_number,
            due_date: testCustomer.due_date,
            area: testCustomer.area,
            account_status: testCustomer.account_status,
            payment_status: testCustomer.payment_status
          },
          messageContent: templateErrorMessage,
          smsResult,
          suspensionResult: { message: 'Template error, skipping suspension test' },
          dateInfo,
          processingDetails,
          timestamp,
          executionType
        }
      });
    }

    // Prepare message content with template replacement
    messageContent = templates[0].content
      .replace(/\{\{name\}\}/g, testCustomer.name)
      .replace(/\{\{due_date\}\}/g, new Date(testCustomer.due_date).toLocaleDateString())
      .replace(/\{\{phone_number\}\}/g, testCustomer.phone_number || '')
      .replace(/\{\{phone\}\}/g, testCustomer.phone_number || '')
      .replace(/\{\{plan\}\}/g, planMap.get(testCustomer.plan) || testCustomer.plan || '')
      .replace(/\{\{payment_status\}\}/g, 'overdue');

    // Test SMS sending - ONLY sends to the single testCustomer found above
    try {
      console.log(`📤 Sending SMS to ${testCustomer.phone_number}`);
      await sendSMSServer([testCustomer.phone_number], `[TEST] ${messageContent}`);
      console.log(`✅ SMS sent successfully`);
      smsResult = { success: true, message: 'SMS sent successfully' };
    } catch (smsError) {
      console.error(`❌ SMS failed:`, smsError instanceof Error ? smsError.message : 'Unknown error');
      smsResult = { error: smsError instanceof Error ? smsError.message : 'Unknown SMS error' };
    }

    // Test customer suspension
    try {
      if (checkOverdue && testCustomer.account_status === 'active') {
        console.log(`⏸️ Testing suspension for customer ${testCustomer.id}`);
        
        const { error: updateError } = await supabase
          .from('customer')
          .update({ 
            account_status: 'suspended',
            payment_status: 'overdue'
          })
          .eq('id', testCustomer.id);

        if (updateError) {
          console.error(`❌ Suspension failed:`, updateError.message);
          suspensionResult = { error: updateError.message };
        } else {
          console.log(`✅ Customer suspended (will revert in 5s)`);
          suspensionResult = { success: true, message: 'Customer suspended successfully' };
          
          // Revert the suspension for testing purposes
          setTimeout(async () => {
            try {
              await supabase
                .from('customer')
                .update({ 
                  account_status: 'active',
                  payment_status: 'current'
                })
                .eq('id', testCustomer.id);
              console.log(`🔄 Suspension reverted`);
            } catch (revertError) {
              console.error(`❌ Failed to revert suspension`);
            }
          }, 5000);
        }
      } else if (!checkOverdue) {
        suspensionResult = { message: 'checkOverdue is false, skipping suspension' };
      } else {
        suspensionResult = { message: 'Customer already suspended, skipping suspension test' };
      }
    } catch (suspensionError) {
      console.error(`❌ Suspension test failed:`, suspensionError instanceof Error ? suspensionError.message : 'Unknown error');
      suspensionResult = { error: suspensionError instanceof Error ? suspensionError.message : 'Unknown suspension error' };
    }

    // Final summary
    console.log(`📊 Test complete | SMS: ${smsResult?.success ? '✅' : '❌'} | Suspension: ${suspensionResult?.success ? '✅' : suspensionResult?.message ? '⏭️' : '❌'}`);

    return NextResponse.json({
      success: true,
      data: {
        testCustomer: {
          id: testCustomer.id,
          name: testCustomer.name,
          phone_number: testCustomer.phone_number,
          due_date: testCustomer.due_date,
          area: testCustomer.area,
          account_status: testCustomer.account_status,
          payment_status: testCustomer.payment_status
        },
        messageContent,
        smsResult,
        suspensionResult,
        dateInfo,
        processingDetails,
        timestamp,
        executionType
      }
    });

  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`❌ Test failed:`, error instanceof Error ? error.message : 'Unknown error');
    
    // Send error notification SMS
    const testPhoneNumbers = ['+639914984912', '639914984912', '09914984912'];
    const errorMessage = `[TEST CRON ERROR] ${timestamp}: Test notification failed - ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    try {
      await sendSMSServer(testPhoneNumbers, errorMessage);
      console.log(`✅ Error notification SMS sent`);
    } catch (smsError) {
      console.error(`❌ Error notification SMS failed:`, smsError instanceof Error ? smsError.message : 'Unknown SMS error');
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}