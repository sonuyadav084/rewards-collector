import { ISmsProvider, SendOtpResult } from './smsProvider.interface';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class TwilioSmsProvider implements ISmsProvider {
  name = 'Twilio SMS Provider';

  async sendOtp(mobileNumber: string, otp: string): Promise<SendOtpResult> {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE } = env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE) {
      const err = 'Twilio credentials not configured in environment variables.';
      logger.error(`[TwilioSmsProvider] ${err}`);
      return { success: false, error: err };
    }

    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const body = new URLSearchParams({
        To: mobileNumber,
        From: TWILIO_FROM_PHONE,
        Body: `Your verification code is: ${otp}. It is valid for 5 minutes. Do not share this code.`,
      });

      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await response.json()) as { sid?: string; message?: string; status?: string };

      if (!response.ok) {
        logger.error(`[TwilioSmsProvider] Dispatch failed: ${data.message || response.statusText}`);
        return { success: false, error: data.message || 'Failed to send SMS via Twilio' };
      }

      logger.info(`[TwilioSmsProvider] Successfully queued SMS to ${mobileNumber}, SID: ${data.sid}`);
      return { success: true, messageId: data.sid };
    } catch (error: any) {
      logger.error('[TwilioSmsProvider] Unexpected error dispatching SMS:', error);
      return { success: false, error: error.message || 'Network error communicating with Twilio' };
    }
  }
}

