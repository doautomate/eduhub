import { describe, expect, it, vi, beforeEach } from "vitest";
import { authService } from "../../../../src/shared/services/authService";
import * as authApi from "../../../../src/shared/services/api/v1/auth";

vi.mock("../../../../src/shared/services/api/v1/auth", () => ({
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
  startRecovery: vi.fn(),
  answerRecovery: vi.fn(),
  resetPassword: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(authApi.register).mockReset();
  vi.mocked(authApi.login).mockReset();
  vi.mocked(authApi.refresh).mockReset();
  vi.mocked(authApi.logout).mockReset();
  vi.mocked(authApi.verifyOtp).mockReset();
  vi.mocked(authApi.resendOtp).mockReset();
  vi.mocked(authApi.startRecovery).mockReset();
  vi.mocked(authApi.answerRecovery).mockReset();
  vi.mocked(authApi.resetPassword).mockReset();
});

describe("authService", () => {
  it("register delegates directly to the auth API client", async () => {
    const payload = {
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
    vi.mocked(authApi.register).mockResolvedValue(response);

    await expect(authService.register(payload)).resolves.toEqual(response);
    expect(authApi.register).toHaveBeenCalledWith(payload);
  });

  it("login maps snake_case token fields to camelCase", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: "tok-1",
      token_type: "bearer",
      expires_in: 900,
    });

    await expect(
      authService.login({ email: "a@example.com", password: "Passw0rd1" }),
    ).resolves.toEqual({ accessToken: "tok-1", expiresIn: 900 });
  });

  it("refresh maps snake_case token fields to camelCase", async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      access_token: "tok-2",
      token_type: "bearer",
      expires_in: 900,
    });

    await expect(authService.refresh()).resolves.toEqual({
      accessToken: "tok-2",
      expiresIn: 900,
    });
  });

  it("logout delegates directly to the auth API client", async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authApi.logout).toHaveBeenCalledOnce();
  });

  it("verifyOtp/resendOtp delegate directly to the auth API client", async () => {
    vi.mocked(authApi.verifyOtp).mockResolvedValue(undefined);
    vi.mocked(authApi.resendOtp).mockResolvedValue(undefined);

    await authService.verifyOtp({ userId: "1", code: "123456" });
    await authService.resendOtp({ userId: "1" });

    expect(authApi.verifyOtp).toHaveBeenCalledWith({ userId: "1", code: "123456" });
    expect(authApi.resendOtp).toHaveBeenCalledWith({ userId: "1" });
  });

  it("startRecovery/answerRecovery/resetPassword delegate directly to the auth API client", async () => {
    vi.mocked(authApi.startRecovery).mockResolvedValue({ user_id: "1", question_text: "?" });
    vi.mocked(authApi.answerRecovery).mockResolvedValue({ reset_token: "tok" });
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);

    await expect(authService.startRecovery({ email: "a@example.com" })).resolves.toEqual({
      user_id: "1",
      question_text: "?",
    });
    await expect(authService.answerRecovery({ userId: "1", answer: "Rex" })).resolves.toEqual({
      reset_token: "tok",
    });
    await expect(
      authService.resetPassword({ resetToken: "tok", newPassword: "NewPassw0rd1!" }),
    ).resolves.toBeUndefined();
  });
});
