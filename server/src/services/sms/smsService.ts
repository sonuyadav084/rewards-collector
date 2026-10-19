import { ISmsProvider } from './smsProvider.interface';
import { MockSmsProvider } from './mockSmsProvider';
import { TwilioSmsProvider } from './twilioSmsProvider';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

class SmsService {
  private provider: ISmsProvider;

  constructor() {
    if (env.SMS_PROVIDER === 'twilio') {
      logger.info('Initializing Twilio SMS Provider.');
      this.provider = new TwilioSmsProvider();
    } else {
      logger.info('Initializing Mock SMS Provider.');
      this.provider = new MockSmsProvider();
    }
  }

  public getProvider(): ISmsProvider {
    return this.provider;
  }

  public async sendOtp(mobileNumber: string, otp: string) {
    return this.provider.sendOtp(mobileNumber, otp);
  }
}

export const smsService = new SmsService();

