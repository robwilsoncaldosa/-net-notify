import { NextResponse } from 'next/server';
import { processDueDateNotifications } from '@/utils/due-date-notifications';

type NotificationResponse = {
  success: boolean;
  data?: {
    notifiedCustomers: number[];
    suspendedCustomers: number[];
    errors: string[];
  };
  error?: string;
};

export async function POST(request: Request): Promise<NextResponse<NotificationResponse>> {
  try {
    // Get parameters from request body (optional override for testing)
    const { daysAhead = 0, checkOverdue = true } = await request.json().catch(() => ({}));
    
    // Use the shared utility function to process due date notifications
    const { notifiedCustomers, suspendedCustomers, errors } = 
      await processDueDateNotifications(daysAhead, checkOverdue);

    return NextResponse.json({
      success: true,
      data: {
        notifiedCustomers,
        suspendedCustomers,
        errors,
      },
    });
  } catch (error) {
    console.error('Error in send-due-notifications API route:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

// Also support GET requests for easier testing and scheduling
export async function GET(): Promise<NextResponse<NotificationResponse>> {
  try {
    // Use 0 days ahead to only process customers with due date today
    const { notifiedCustomers, suspendedCustomers, errors } = 
      await processDueDateNotifications(0, true);

    return NextResponse.json({
      success: true,
      data: {
        notifiedCustomers,
        suspendedCustomers,
        errors,
      },
    });
  } catch (error) {
    console.error('Error in send-due-notifications GET route:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}