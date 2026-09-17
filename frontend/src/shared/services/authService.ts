import * as authApi from "./api/v1/auth";
import type {
  LoginPayload,
  OtpResendPayload,
  OtpVerifyPayload,
  RecoveryAnswerPayload,
  RecoveryAnswerResponse,
  RecoveryResetPayload,
  RecoveryStartPayload,
  RecoveryStartResponse,
  RegisterPayload,
  RegisterResponse,
} from "../types/auth";

/** Thin business-logic wrapper around the auth API client. */
export const authService = {
  register(payload: RegisterPayload): Promise<RegisterResponse> {
    return authApi.register(payload);
  },
  async login(payload: LoginPayload): Promise<{ accessToken: string; expiresIn: number }> {
    const { access_token: accessToken, expires_in: expiresIn } = await authApi.login(payload);
    return { accessToken, expiresIn };
  },
  async refresh(): Promise<{ accessToken: string; expiresIn: number }> {
    const { access_token: accessToken, expires_in: expiresIn } = await authApi.refresh();
    return { accessToken, expiresIn };
  },
  logout(): Promise<void> {
    return authApi.logout();
  },
  verifyOtp(payload: OtpVerifyPayload): Promise<void> {
    return authApi.verifyOtp(payload);
  },
  resendOtp(payload: OtpResendPayload): Promise<void> {
    return authApi.resendOtp(payload);
  },
  startRecovery(payload: RecoveryStartPayload): Promise<RecoveryStartResponse> {
    return authApi.startRecovery(payload);
  },
  answerRecovery(payload: RecoveryAnswerPayload): Promise<RecoveryAnswerResponse> {
    return authApi.answerRecovery(payload);
  },
  resetPassword(payload: RecoveryResetPayload): Promise<void> {
    return authApi.resetPassword(payload);
  },
};
