import { NextResponse } from 'next/server';
import { processDueDateNotifications } from '@/utils/due-date-notifications';

type CheckDueDatesResponse = {
  success: boolean;
  data?: {
    notifiedCustomers: number;
    suspendedCustomers: number;
    errors: string[];
  };
  error?: string;
};

export async function GET(): Promise<NextResponse<CheckDueDatesResponse>> {
  try {
    // Use the shared utility function to process due date notifications
    const { notifiedCustomers, suspendedCustomers, errors } = await processDueDateNotifications(3, true);

    return NextResponse.json({
      success: true,
      data: {
        notifiedCustomers: notifiedCustomers.length,
        suspendedCustomers: suspendedCustomers.length,
        errors,
      },
    });
  } catch (error) {
    console.error('Error in check-due-dates API route:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}