import { createClient } from './supabase/server';

export async function sendSMSServer(phoneNumbers: string[], message: string) {
  try {
    // Use environment variables for the base URL when on server
    const BASE_URL = process.env.BASE_URL;
    const DEVICE_ID = process.env.DEVICE_ID;
    const API_KEY = process.env.API_KEY;

    if (!BASE_URL || !DEVICE_ID || !API_KEY) {
      throw new Error('Missing required environment variables for SMS service');
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
      throw new Error(`SMS API error: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending SMS from server:', error);
    throw error;
  }
}
export async function sendSMS(phoneNumbers: string[], message: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
  try {
    const response = await fetch(`${baseUrl}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumbers,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}