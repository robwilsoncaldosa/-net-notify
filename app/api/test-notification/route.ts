import { NextResponse } from 'next/server';

type SMSResponse = {
  success: boolean;
  data?: {
    message: string;
    smsBatchId: string;
    recipientCount: number;
  };
  error?: string;
  details?: unknown;
};

export async function GET(): Promise<NextResponse<SMSResponse>> {
  try {
    const phoneNumber = '09914984912';
    const message = 'this is a test';
    
    // Validate environment variables
    const BASE_URL = process.env.BASE_URL;
    const DEVICE_ID = process.env.DEVICE_ID;
    const API_KEY = process.env.API_KEY;

    if (!BASE_URL || !DEVICE_ID || !API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json({
        success: false,
        error: 'SMS service configuration error'
      }, { status: 500 });
    }

    console.log(`Sending test SMS to ${phoneNumber}: "${message}"`);

    const response = await fetch(
      `${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          recipients: [phoneNumber],
          message: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('SMS API error:', errorData);
      return NextResponse.json({
        success: false,
        error: 'Failed to send test SMS',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Test SMS sent successfully:', data);
    
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        message: `Test SMS sent to ${phoneNumber}: "${message}"`
      }
    });
  } catch (error) {
    console.error('Error in test notification API route:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}