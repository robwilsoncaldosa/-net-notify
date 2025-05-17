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