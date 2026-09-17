import { useEffect, useState, type FormEvent } from "react";
import { CircleAlertIcon, MapPinnedIcon } from "lucide-react";

import { locationService } from "../../shared/services/locationService";
import { userService } from "../../shared/services/userService";
import { SearchableSelect } from "../../shared/components/SearchableSelect/SearchableSelect";
import { Alert, AlertDescription, AlertTitle } from "../../shared/components/ui/alert";
import { Button } from "../../shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { ApiError } from "../../shared/types/auth";
import type { UserProfile } from "../../shared/types/user";
import type { CountryOption, StateOption } from "../../shared/data/locations";

export interface AddressDetailsTabProps {
  accessToken: string;
  profile: UserProfile;
  onSaved: (updated: UserProfile) => void;
}

function countryLabel(countries: CountryOption[], code: string) {
  return countries.find((c) => c.code === code)?.name ?? code;
}

function stateLabel(states: StateOption[], code: string) {
  return states.find((s) => s.code === code)?.name ?? code;
}

/**
 * Address Details tab (013-profile-popover-management, US2): relocates the existing
 * country/state/pin editing UI from Profile.tsx, extended with new optional
 * house-number/apartment-building fields (FR-011). Defaults to a read-only view with
 * an "Edit" action; clicking it reveals the editable form with Cancel/Save changes
 * actions, mirroring the Academic Profile and Personal Details tabs.
 */
export function AddressDetailsTab({ accessToken, profile, onSaved }: AddressDetailsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [country, setCountry] = useState(profile.country);
  const [stateProvince, setStateProvince] = useState(profile.state_province);
  const [pinCode, setPinCode] = useState(profile.pin_code);
  const [houseNumber, setHouseNumber] = useState(profile.house_number ?? "");
  const [apartmentBuilding, setApartmentBuilding] = useState(profile.apartment_building ?? "");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    locationService.getCountries().then(setCountries);
  }, []);

  useEffect(() => {
    if (!country) {
      setStates([]);
      return;
    }
    let active = true;
    locationService.getStates(country).then((list) => {
      if (active) {
        setStates(list);
      }
    });
    return () => {
      active = false;
    };
  }, [country]);

  function handleCountryChange(next: string) {
    setCountry(next);
    // FR-012: reset the state/province whenever the country changes so a
    // now-mismatched pair can never be submitted.
    setStateProvince("");
  }

  function startEditing() {
    setCountry(profile.country);
    setStateProvince(profile.state_province);
    setPinCode(profile.pin_code);
    setHouseNumber(profile.house_number ?? "");
    setApartmentBuilding(profile.apartment_building ?? "");
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  }

  function handleCancel() {
    // US3: an abandoned edit must never alter the previously saved values.
    setCountry(profile.country);
    setStateProvince(profile.state_province);
    setPinCode(profile.pin_code);
    setHouseNumber(profile.house_number ?? "");
    setApartmentBuilding(profile.apartment_building ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!country || !stateProvince || !pinCode.trim()) {
      setError("Country, State/Province, and Pin/Postal code are required.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await userService.updateAddress(accessToken, {
        country,
        stateProvince,
        pinCode: pinCode.trim(),
        houseNumber: houseNumber.trim() || null,
        apartmentBuilding: apartmentBuilding.trim() || null,
      });
      onSaved(updated);
      setSuccess(true);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to update your address. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const countryOptions = countries.map((c) => ({ value: c.code, label: c.name }));
  const stateOptions = states.map((s) => ({ value: s.code, label: s.name }));

  return (
    <Card className="bg-muted/20 py-0 shadow-none ring-border/60">
      <CardHeader className="gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPinnedIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Address details</CardTitle>
            <CardDescription>
              Update your location information for account and recovery flows.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <section aria-label="Address Details">
          {isEditing ? (
            <form onSubmit={handleSubmit} aria-label="Edit address form" className="space-y-5">
              <SearchableSelect
                id="address-details-country"
                label="Country"
                options={countryOptions}
                value={country}
                onChange={handleCountryChange}
                placeholder="Search for your country"
              />
              <SearchableSelect
                id="address-details-state-province"
                label="State/Province"
                options={stateOptions}
                value={stateProvince}
                onChange={setStateProvince}
                placeholder="Search for your state/province"
                disabled={!country}
              />
              <div className="space-y-2">
                <Label htmlFor="address-details-pin-code">Pin/Postal Code</Label>
                <Input
                  id="address-details-pin-code"
                  name="pinCode"
                  type="text"
                  value={pinCode}
                  className="h-10 bg-background"
                  onChange={(e) => setPinCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-details-house-number">House/Flat Number</Label>
                <Input
                  id="address-details-house-number"
                  name="houseNumber"
                  type="text"
                  value={houseNumber}
                  maxLength={50}
                  className="h-10 bg-background"
                  onChange={(e) => setHouseNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-details-apartment-building">Building/Apartment Name</Label>
                <Input
                  id="address-details-apartment-building"
                  name="apartmentBuilding"
                  type="text"
                  value={apartmentBuilding}
                  maxLength={150}
                  className="h-10 bg-background"
                  onChange={(e) => setApartmentBuilding(e.target.value)}
                />
              </div>
              {error && (
                <Alert
                  variant="destructive"
                  className="state-message state-message--error border-destructive/30 bg-destructive/10 text-destructive"
                >
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>Unable to update address</AlertTitle>
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}
              <div className="form-actions flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-[7.5rem]"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className={submitting ? "min-w-[7.5rem] is-loading" : "min-w-[7.5rem]"}
                >
                  {submitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {profile.country ? countryLabel(countries, profile.country) : "Not set"}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">State/Province</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {profile.state_province ? stateLabel(states, profile.state_province) : "Not set"}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">Pin/Postal Code</dt>
                  <dd className="mt-1 text-sm text-foreground">{profile.pin_code || "Not set"}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                  <dt className="text-sm font-medium text-muted-foreground">House/Flat Number</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {profile.house_number || "Not set"}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-4 sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Building/Apartment Name
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {profile.apartment_building || "Not set"}
                  </dd>
                </div>
              </dl>
              {success && (
                <div
                  role="status"
                  className="state-message state-message--success rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
                >
                  Your address was updated successfully.
                </div>
              )}
              <div className="form-actions flex flex-row items-center justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="min-w-[7.5rem]"
                  onClick={startEditing}
                >
                  Edit
                </Button>
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export default AddressDetailsTab;
