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
  TokenResponse,
} from "../../../types/auth";
import { ApiError, CaptchaRequiredError, EmailNotVerifiedError } from "../../../types/auth";

const BASE_URL = "/api/v1/auth";

async function parseErrorBody(
  response: Response,
): Promise<{ detail: string; reason?: string; meta?: Record<string, unknown> }> {
  try {
    const body = await response.json();
    if (body && typeof body.detail === "object" && body.detail !== null) {
      const { detail, reason, ...rest } = body.detail as Record<string, unknown> & {
        detail?: string;
        reason?: string;
      };
      return {
        detail: (detail as string) ?? "Request failed.",
        reason,
        meta: Object.keys(rest).length > 0 ? rest : undefined,
      };
    }
    return { detail: body?.detail ?? "Request failed." };
  } catch {
    return { detail: "Request failed." };
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      mobile_number: payload.mobileNumber,
      password: payload.password,
      country: payload.country,
      state_province: payload.stateProvince,
      pin_code: payload.pinCode,
      date_of_birth: payload.dateOfBirth,
      security_question_code: payload.securityQuestionCode,
      security_answer: payload.securityAnswer,
    }),
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
  return response.json();
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      captcha_token: payload.captchaToken,
    }),
    credentials: "include",
  });
  if (!response.ok) {
    const { detail, reason } = await parseErrorBody(response);
    if (response.status === 428) {
      throw new CaptchaRequiredError(428, detail);
    }
    if (response.status === 403 && reason === "EMAIL_NOT_VERIFIED") {
      throw new EmailNotVerifiedError(403, detail);
    }
    throw new ApiError(response.status, detail);
  }
  return response.json();
}

export async function refresh(): Promise<TokenResponse> {
  const response = await fetch(`${BASE_URL}/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok && response.status !== 401) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
}

/** US4/FR-013: submits the OTP code the user received by email. */
export async function verifyOtp(payload: OtpVerifyPayload): Promise<void> {
  const response = await fetch(`${BASE_URL}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: payload.userId, code: payload.code }),
  });
  if (!response.ok) {
    const { detail, meta } = await parseErrorBody(response);
    throw new ApiError(response.status, detail, meta);
  }
}

/** US4/FR-014: requests a new OTP code, superseding any still-active one. */
export async function resendOtp(payload: OtpResendPayload): Promise<void> {
  const response = await fetch(`${BASE_URL}/otp/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: payload.userId }),
  });
  if (!response.ok) {
    const { detail } = await parseErrorBody(response);
    const retryAfter = response.headers.get("Retry-After");
    throw new ApiError(
      response.status,
      detail,
      retryAfter ? { retryAfterSeconds: Number(retryAfter) } : undefined,
    );
  }
}

/** US5/FR-015: reveals the account's security question for a known email (never
 * discloses whether the email is unknown - callers should show a generic message). */
export async function startRecovery(payload: RecoveryStartPayload): Promise<RecoveryStartResponse> {
  const response = await fetch(`${BASE_URL}/recovery/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: payload.email }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
  return response.json();
}

/** US5/FR-016: submits the security-question answer, returning a single-use reset token. */
export async function answerRecovery(
  payload: RecoveryAnswerPayload,
): Promise<RecoveryAnswerResponse> {
  const response = await fetch(`${BASE_URL}/recovery/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: payload.userId, answer: payload.answer }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
  return response.json();
}

/** US5/FR-016: resets the password using the reset token from answerRecovery(). */
export async function resetPassword(payload: RecoveryResetPayload): Promise<void> {
  const response = await fetch(`${BASE_URL}/recovery/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset_token: payload.resetToken, new_password: payload.newPassword }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, (await parseErrorBody(response)).detail);
  }
}
