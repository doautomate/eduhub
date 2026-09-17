export interface AuthUser {
  id: string;
  email: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
  country: string;
  stateProvince: string;
  pinCode: string;
  dateOfBirth: string;
  securityQuestionCode: string;
  securityAnswer: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  country: string;
  state_province: string;
  pin_code: string;
  is_verified: boolean;
  created_at: string;
}

export interface OtpVerifyPayload {
  userId: string;
  code: string;
}

export interface OtpResendPayload {
  userId: string;
}

export interface RecoveryStartPayload {
  email: string;
}

export interface RecoveryStartResponse {
  user_id: string;
  question_text: string;
}

export interface RecoveryAnswerPayload {
  userId: string;
  answer: string;
}

export interface RecoveryAnswerResponse {
  reset_token: string;
}

export interface RecoveryResetPayload {
  resetToken: string;
  newPassword: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    /** Optional structured detail payload (e.g. `attempts_remaining` on OTP errors),
     * preserved alongside the flattened `detail` message string above. */
    public meta?: Record<string, unknown>,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export class CaptchaRequiredError extends ApiError {}

/** Thrown by `login()` when the server rejects an otherwise-correct login with
 * `403 { reason: "EMAIL_NOT_VERIFIED" }` (US2/FR-011): the account exists and the
 * password is correct, but the email address has not yet been OTP-verified. */
export class EmailNotVerifiedError extends ApiError {}
