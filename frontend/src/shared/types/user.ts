export type Board = "CBSE" | "ICSE" | "IGCSE" | "IB" | "STATE_BOARD" | "OTHER";

export type Standard = "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII";

/** Ordered, human-readable options for the Board select (009-profile-onboarding-setup). */
export const BOARD_OPTIONS: { value: Board; label: string }[] = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "IGCSE", label: "IGCSE" },
  { value: "IB", label: "IB" },
  { value: "STATE_BOARD", label: "State Board" },
  { value: "OTHER", label: "Other" },
];

/** Ordered Standard/Grade options, IV through XII inclusive (FR-004). */
export const STANDARD_OPTIONS: Standard[] = [
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export interface UserProfile {
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
  board: Board | null;
  board_other: string | null;
  standard: Standard | null;
  academic_profile_complete: boolean;
  /** Address Details expansion (013-profile-popover-management, FR-011). */
  house_number: string | null;
  apartment_building: string | null;
}

export interface UpdateAddressPayload {
  country: string;
  stateProvince: string;
  pinCode: string;
  houseNumber?: string | null;
  apartmentBuilding?: string | null;
}

export interface UpdatePersonalDetailsPayload {
  mobileNumber: string;
}

export interface UpdateAcademicProfilePayload {
  board: Board;
  standard: Standard;
  /** Required and non-empty only when board === "OTHER" (FR-005a). */
  boardOther?: string | null;
}
