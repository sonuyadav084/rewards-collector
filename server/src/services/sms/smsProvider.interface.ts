export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  name: string;
  sendOtp(mobileNumber: string, otp: string): Promise<SendOtpResult>;
}

