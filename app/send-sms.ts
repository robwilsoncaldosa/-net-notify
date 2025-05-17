'use server';

type SMSResponse = {
  success: boolean;
  message: string;
  smsBatchId?: string;
  recipientCount?: number;
  error?: string;
};

export async function sendSMS(recipients: string[], message: string): Promise<SMSResponse> {
  try {
    // Input validation
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return {
        success: false,
        message: 'Recipients must be a non-empty array',
        error: 'INVALID_RECIPIENTS'
      };
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        success: false,
        message: 'Message is required and must be non-empty',
        error: 'INVALID_MESSAGE'
      };
    }

    // Environment variables validation
    const BASE_URL = process.env.BASE_URL;
    const DEVICE_ID = process.env.DEVICE_ID;
    const API_KEY = process.env.API_KEY;

    if (!BASE_URL || !DEVICE_ID || !API_KEY) {
      console.error('Missing required environment variables');
      return {
        success: false,
        message: 'SMS service configuration error',
        error: 'MISSING_CONFIG'
      };
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
          recipients: recipients,
          message: message.trim(),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error || 'Failed to send SMS',
        error: 'API_ERROR',
        ...errorData
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'SMS sent successfully',
      smsBatchId: data.smsBatchId,
      recipientCount: data.recipientCount
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      error: 'INTERNAL_ERROR'
    };
  }
}
