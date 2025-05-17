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

export async function POST(request: Request): Promise<NextResponse<SMSResponse>> {
  try {
    const { phoneNumbers, message } = await request.json();
    
    // Validate input
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Phone numbers must be a non-empty array'
      }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      }, { status: 400 });
    }

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

    const response = await fetch(
      `${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          recipients: phoneNumbers,
          message: message.trim(),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: 'Failed to send SMS',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in SMS API route:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}