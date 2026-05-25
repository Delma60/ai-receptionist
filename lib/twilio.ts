import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

/**
 * Initialize the Twilio client
 */
export const twilioClient = twilio(accountSid, authToken);

/**
 * Send an SMS message
 */
export async function sendSMS(to: string, body: string, from?: string) {
  return twilioClient.messages.create({
    body,
    to,
    from: from || process.env.TWILIO_PHONE_NUMBER,
  });
}

/**
 * Search for and provision a new local phone number
 */
export async function provisionNumber(areaCode?: string) {
  const available = await twilioClient.availablePhoneNumbers('US').local.list({
    areaCode,
    limit: 1,
  });

  if (available.length === 0) throw new Error('No numbers available in this area code');

  return twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    // Point the new number's voice URL to our webhook
    voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`,
  });
}


