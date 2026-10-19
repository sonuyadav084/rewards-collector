import { ISmsProvider, SendOtpResult } from './smsProvider.interface';
import { logger } from '../../utils/logger';

export class MockSmsProvider implements ISmsProvider {
  name = 'Mock SMS Provider (Dev/Testing)';

  async sendOtp(mobileNumber: string, otp: string): Promise<SendOtpResult> {
    logger.info(`[MOCK SMS DISPATCH] To: ${mobileNumber} | Message: "Your verification code is: ${otp}". Valid for 5 minutes.`);
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };
  }
}

