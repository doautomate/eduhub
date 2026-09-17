import { describe, expect, it, vi, afterEach } from "vitest";
import { register, login, refresh, logout, verifyOtp, resendOtp, startRecovery, answerRecovery, resetPassword } from "../../../../src/shared/services/api/v1/auth";
import { ApiError, CaptchaRequiredError, EmailNotVerifiedError } from "../../../../src/shared/types/auth";

function mockFetchResponse(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
  headers: Record<string, string> = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
      headers: { get: (name: string) => headers[name] ?? null },
    } as unknown as Response),
  );
}

function mockFetchResponseWithBadJson(status: number, ok = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const registerPayload = {
  firstName: "Test",
  lastName: "User",
  email: "a@example.com",
  mobileNumber: "+15550100001",
  password: "Passw0rd1",
  country: "IN",
  stateProvince: "KA",
  pinCode: "560001",
  dateOfBirth: "2000-01-01",
  securityQuestionCode: "FIRST_PET",
  securityAnswer: "Rex",
};

describe("auth api client", () => {
  describe("register", () => {
    it("posts the snake_case payload and resolves with the response body on success", async () => {
      const response = {
        id: "1",
        first_name: "Test",
        last_name: "User",
        email: "a@example.com",
        mobile_number: "+15550100001",
        country: "IN",
        state_province: "KA",
        pin_code: "560001",
        is_verified: false,
        created_at: "2026-01-01T00:00:00Z",
      };
      mockFetchResponse(201, response);

      await expect(register(registerPayload)).resolves.toEqual(response);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/auth/register");
      expect(JSON.parse(init?.body as string)).toEqual({
        first_name: "Test",
        last_name: "User",
        email: "a@example.com",
        mobile_number: "+15550100001",
        password: "Passw0rd1",
        country: "IN",
        state_province: "KA",
        pin_code: "560001",
        date_of_birth: "2000-01-01",
        security_question_code: "FIRST_PET",
        security_answer: "Rex",
      });
    });

    it("throws ApiError with the server detail on a 409 conflict", async () => {
      mockFetchResponse(409, { detail: "Email already registered." });
      await expect(register(registerPayload)).rejects.toMatchObject({
        status: 409,
        detail: "Email already registered.",
      });
    });

    it("falls back to a generic message when the error body is not valid JSON", async () => {
      mockFetchResponseWithBadJson(500);
      await expect(register(registerPayload)).rejects.toMatchObject({
        status: 500,
        detail: "Request failed.",
      });
    });
  });

  describe("login", () => {
    it("resolves with the token response on success", async () => {
      const tokenResponse = { access_token: "tok", token_type: "bearer", expires_in: 900 };
      mockFetchResponse(200, tokenResponse);

      await expect(login({ email: "a@example.com", password: "Passw0rd1" })).resolves.toEqual(
        tokenResponse,
      );
    });

    it("throws CaptchaRequiredError on a 428 response", async () => {
      mockFetchResponse(428, { detail: "CAPTCHA verification required." }, false);
      const promise = login({ email: "a@example.com", password: "wrong" });
      await expect(promise).rejects.toBeInstanceOf(CaptchaRequiredError);
      await expect(promise).rejects.toMatchObject({
        status: 428,
        detail: "CAPTCHA verification required.",
      });
    });

    it("throws a plain ApiError on other failure statuses", async () => {
      mockFetchResponse(401, { detail: "Invalid email or password." }, false);
      await expect(
        login({ email: "a@example.com", password: "wrong" }),
      ).rejects.toBeInstanceOf(ApiError);
    });

    it("throws EmailNotVerifiedError on a 403 with reason EMAIL_NOT_VERIFIED", async () => {
      mockFetchResponse(
        403,
        { detail: { detail: "Please verify your email address.", reason: "EMAIL_NOT_VERIFIED" } },
        false,
      );
      const promise = login({ email: "a@example.com", password: "Passw0rd1" });
      await expect(promise).rejects.toBeInstanceOf(EmailNotVerifiedError);
      await expect(promise).rejects.toMatchObject({
        status: 403,
        detail: "Please verify your email address.",
      });
    });
  });

  describe("refresh", () => {
    it("resolves with the token response on success", async () => {
      const tokenResponse = { access_token: "tok-2", token_type: "bearer", expires_in: 900 };
      mockFetchResponse(200, tokenResponse);
      await expect(refresh()).resolves.toEqual(tokenResponse);
    });

    it("throws ApiError when the refresh token is invalid", async () => {
      mockFetchResponse(401, { detail: "Invalid refresh token." }, false);
      await expect(refresh()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("logout", () => {
    it("resolves without error on success", async () => {
      mockFetchResponse(204, undefined, true);
      await expect(logout()).resolves.toBeUndefined();
    });

    it("treats an already-expired session (401) as a successful logout", async () => {
      mockFetchResponse(401, { detail: "Not authenticated." }, false);
      await expect(logout()).resolves.toBeUndefined();
    });

    it("throws ApiError for any other failure status", async () => {
      mockFetchResponse(500, { detail: "Server error." }, false);
      await expect(logout()).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("verifyOtp", () => {
    it("posts the user id and code", async () => {
      mockFetchResponse(200, { verified: true });
      await expect(verifyOtp({ userId: "1", code: "123456" })).resolves.toBeUndefined();
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/auth/otp/verify");
      expect(JSON.parse(init?.body as string)).toEqual({ user_id: "1", code: "123456" });
    });

    it("attaches attempts_remaining as meta on a wrong code", async () => {
      mockFetchResponse(
        400,
        { detail: { detail: "Incorrect or expired verification code.", attempts_remaining: 2 } },
        false,
      );
      await expect(verifyOtp({ userId: "1", code: "000000" })).rejects.toMatchObject({
        status: 400,
        detail: "Incorrect or expired verification code.",
        meta: { attempts_remaining: 2 },
      });
    });
  });

  describe("resendOtp", () => {
    it("posts the user id", async () => {
      mockFetchResponse(202, { accepted: true });
      await expect(resendOtp({ userId: "1" })).resolves.toBeUndefined();
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/v1/auth/otp/resend");
      expect(JSON.parse(init?.body as string)).toEqual({ user_id: "1" });
    });

    it("attaches the Retry-After header as meta on a 429", async () => {
      mockFetchResponse(
        429,
        { detail: "Please wait before requesting another code." },
        false,
        { "Retry-After": "45" },
      );
      await expect(resendOtp({ userId: "1" })).rejects.toMatchObject({
        status: 429,
        meta: { retryAfterSeconds: 45 },
      });
    });
  });

  describe("startRecovery", () => {
    it("resolves with the question text on success", async () => {
      mockFetchResponse(200, { user_id: "1", question_text: "First pet?" });
      await expect(startRecovery({ email: "a@example.com" })).resolves.toEqual({
        user_id: "1",
        question_text: "First pet?",
      });
    });
  });

  describe("answerRecovery", () => {
    it("resolves with a reset token on a correct answer", async () => {
      mockFetchResponse(200, { reset_token: "tok" });
      await expect(answerRecovery({ userId: "1", answer: "Rex" })).resolves.toEqual({
        reset_token: "tok",
      });
    });

    it("throws ApiError on an incorrect answer", async () => {
      mockFetchResponse(401, { detail: "Incorrect answer." }, false);
      await expect(answerRecovery({ userId: "1", answer: "wrong" })).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("resetPassword", () => {
    it("resolves on a successful reset", async () => {
      mockFetchResponse(200, { reset: true });
      await expect(
        resetPassword({ resetToken: "tok", newPassword: "NewPassw0rd1!" }),
      ).resolves.toBeUndefined();
    });
  });
});
