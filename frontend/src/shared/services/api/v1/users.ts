import { ApiError } from "../../../types/auth";
import type {
  UpdateAcademicProfilePayload,
  UpdateAddressPayload,
  UpdatePersonalDetailsPayload,
  UserProfile,
} from "../../../types/user";

const BASE_URL = "/api/v1/users";

function authHeader(accessToken: string): string {
  return "Bearer " + accessToken;
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.detail ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export async function getMe(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorDetail(response));
  }
  return response.json();
}

export async function updateMe(
  accessToken: string,
  payload: UpdateAddressPayload,
): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      country: payload.country,
      state_province: payload.stateProvince,
      pin_code: payload.pinCode,
      house_number: payload.houseNumber ?? null,
      apartment_building: payload.apartmentBuilding ?? null,
    }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorDetail(response));
  }
  return response.json();
}

export async function updateAcademicProfile(
  accessToken: string,
  payload: UpdateAcademicProfilePayload,
): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/me/academic-profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(accessToken),
    },
    body: JSON.stringify({
      board: payload.board,
      standard: payload.standard,
      board_other: payload.boardOther ?? null,
    }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorDetail(response));
  }
  return response.json();
}

export async function updatePersonalDetails(
  accessToken: string,
  payload: UpdatePersonalDetailsPayload,
): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/me/personal-details`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(accessToken),
    },
    body: JSON.stringify({
      mobile_number: payload.mobileNumber,
    }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorDetail(response));
  }
  return response.json();
}
