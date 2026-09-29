import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/shared/services/api/v1/users", () => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
  updateAcademicProfile: vi.fn(),
  updatePersonalDetails: vi.fn(),
}));

import * as usersApi from "../../../../src/shared/services/api/v1/users";
import { userService } from "../../../../src/shared/services/userService";

const PROFILE = { id: "1", first_name: "Ada" } as never;

describe("userService", () => {
  it("getProfile delegates to usersApi.getMe with the access token", async () => {
    vi.mocked(usersApi.getMe).mockResolvedValue(PROFILE);
    await expect(userService.getProfile("tok")).resolves.toBe(PROFILE);
    expect(usersApi.getMe).toHaveBeenCalledWith("tok");
  });

  it("updateAddress delegates to usersApi.updateMe with the access token and payload", async () => {
    const payload = { country: "IN", stateProvince: "KA", pinCode: "560001" };
    vi.mocked(usersApi.updateMe).mockResolvedValue(PROFILE);
    await expect(userService.updateAddress("tok", payload)).resolves.toBe(PROFILE);
    expect(usersApi.updateMe).toHaveBeenCalledWith("tok", payload);
  });

  it("updateAcademicProfile delegates to usersApi.updateAcademicProfile with the access token and payload", async () => {
    const payload = { board: "CBSE" as const, standard: "X" as const };
    vi.mocked(usersApi.updateAcademicProfile).mockResolvedValue(PROFILE);
    await expect(userService.updateAcademicProfile("tok", payload)).resolves.toBe(PROFILE);
    expect(usersApi.updateAcademicProfile).toHaveBeenCalledWith("tok", payload);
  });

  it("updatePersonalDetails delegates to usersApi.updatePersonalDetails with the access token and payload", async () => {
    const payload = { mobileNumber: "+15551234567" };
    vi.mocked(usersApi.updatePersonalDetails).mockResolvedValue(PROFILE);
    await expect(userService.updatePersonalDetails("tok", payload)).resolves.toBe(PROFILE);
    expect(usersApi.updatePersonalDetails).toHaveBeenCalledWith("tok", payload);
  });
});
