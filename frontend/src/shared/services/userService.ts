import * as usersApi from "./api/v1/users";
import type {
  UpdateAcademicProfilePayload,
  UpdateAddressPayload,
  UpdatePersonalDetailsPayload,
  UserProfile,
} from "../types/user";

/** Thin business-logic wrapper around the authenticated user profile API client. */
export const userService = {
  getProfile(accessToken: string): Promise<UserProfile> {
    return usersApi.getMe(accessToken);
  },
  updateAddress(accessToken: string, payload: UpdateAddressPayload): Promise<UserProfile> {
    return usersApi.updateMe(accessToken, payload);
  },
  updateAcademicProfile(
    accessToken: string,
    payload: UpdateAcademicProfilePayload,
  ): Promise<UserProfile> {
    return usersApi.updateAcademicProfile(accessToken, payload);
  },
  updatePersonalDetails(
    accessToken: string,
    payload: UpdatePersonalDetailsPayload,
  ): Promise<UserProfile> {
    return usersApi.updatePersonalDetails(accessToken, payload);
  },
};
