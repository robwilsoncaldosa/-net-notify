'use server'

export async function sendSMS(recipients: string[], message: string) {
    const response = await fetch(
        `${process.env.BASE_URL}/gateway/devices/${process.env.DEVICE_ID}/send-sms`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.API_KEY || "",
            },
            body: JSON.stringify({
                recipients: recipients,
                message: message,
            }),
        }
    );

    const data = await response.json();
    return data;
}
