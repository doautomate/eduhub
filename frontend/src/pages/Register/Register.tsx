import { createElement, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SearchableSelect } from "../../shared/components/SearchableSelect/SearchableSelect";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { SECURITY_QUESTIONS } from "../../shared/data/securityQuestions";
import type { CountryOption, StateOption } from "../../shared/data/locations";
import { useAuth } from "../../shared/hooks/useAuth";
import { locationService } from "../../shared/services/locationService";
import { minStrengthMet } from "../../shared/utils/passwordStrength";
import { ApiError } from "../../shared/types/auth";

const MINIMUM_REGISTRATION_AGE_YEARS = 13;
const selectClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

function computeAge(dob: string): number | null {
  if (!dob) {
    return null;
  }
  const dobDate = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(dobDate.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getUTCFullYear() - dobDate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dobDate.getUTCMonth() ||
    (today.getUTCMonth() === dobDate.getUTCMonth() && today.getUTCDate() < dobDate.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age;
}

export function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [securityQuestionCode, setSecurityQuestionCode] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    locationService.getCountries().then((list) => {
      if (active) {
        setCountries(list);
      }
    });
    return () => {
      active = false;
    };
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

  // FR-009: an already-authenticated user is never shown the registration page -
  // any attempt to navigate here instead lands on the home page.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleCountryChange(next: string) {
    setCountry(next);
    // FR-012: state/province must belong to the currently selected country, so
    // resetting it here prevents submitting a now-mismatched pair.
    setStateProvince("");
  }

  const age = computeAge(dateOfBirth);
  const passwordStrengthOk = minStrengthMet(password);
  const passwordStrengthMeter = password ? createElement(PasswordStrengthMeter, { password }) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!country || !stateProvince || !pinCode.trim()) {
      setError("Country, State/Province, and Pin/Postal code are required.");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required.");
      return;
    }
    if (age !== null && age < MINIMUM_REGISTRATION_AGE_YEARS) {
      setError(`You must be at least ${MINIMUM_REGISTRATION_AGE_YEARS} years old to register.`);
      return;
    }
    if (!securityQuestionCode) {
      setError("Please choose a security question.");
      return;
    }
    if (!securityAnswer.trim()) {
      setError("Security answer cannot be blank.");
      return;
    }
    // FR-010: block submission until the password meets the minimum acceptable
    // ("Fair") strength, mirroring the meter shown above the field.
    if (!passwordStrengthOk) {
      setError("Password is too weak. Use a longer password with mixed character types.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({
        firstName,
        lastName,
        email,
        mobileNumber,
        password,
        country,
        stateProvince,
        pinCode: pinCode.trim(),
        dateOfBirth,
        securityQuestionCode,
        securityAnswer: securityAnswer.trim(),
      });
      // T057: hand off to the OTP verification screen (US4). We stash the
      // user id keyed by email in sessionStorage too, so Login's "resend code"
      // prompt (US2) can still find it if the user navigates away and later
      // tries (and fails) to sign in before verifying.
      sessionStorage.setItem(`otp:userId:${result.email}`, result.id);
      navigate("/verify-otp", { state: { userId: result.id, email: result.email }, replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const countryOptions = countries.map((c) => ({ value: c.code, label: c.name }));
  const stateOptions = states.map((s) => ({ value: s.code, label: s.name }));

  return (
    <div className="screen-shell">
      <Card className="screen-card max-w-2xl border-border/70 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl"><h1>Create your account</h1></CardTitle>
          <CardDescription>
            Join the platform with the same registration details and verification flow you already know.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} aria-label="Registration form" className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="field">
                <Label htmlFor="register-first-name">First Name</Label>
                <Input
                  id="register-first-name"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field">
                <Label htmlFor="register-last-name">Last Name</Label>
                <Input
                  id="register-last-name"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field">
                <Label htmlFor="register-mobile-number">Mobile Number</Label>
                <Input
                  id="register-mobile-number"
                  name="mobileNumber"
                  type="tel"
                  required
                  placeholder="+15551234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field">
                <Label htmlFor="register-date-of-birth">Date of Birth</Label>
                <Input
                  id="register-date-of-birth"
                  name="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field md:col-span-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10"
                />
                <p className="m-0 text-sm text-muted-foreground">
                  Password must be at least 8 characters and include both letters and numbers.
                </p>
                {passwordStrengthMeter}
              </div>
              <div className="md:col-span-2">
                <SearchableSelect
                  id="register-country"
                  label="Country"
                  options={countryOptions}
                  value={country}
                  onChange={handleCountryChange}
                  placeholder="Search for your country"
                />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect
                  id="register-state-province"
                  label="State/Province"
                  options={stateOptions}
                  value={stateProvince}
                  onChange={setStateProvince}
                  placeholder="Search for your state/province"
                  disabled={!country}
                />
              </div>
              <div className="field">
                <Label htmlFor="register-pin-code">Pin/Postal Code</Label>
                <Input
                  id="register-pin-code"
                  name="pinCode"
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="field">
                <Label htmlFor="register-security-question">Security Question</Label>
                <select
                  id="register-security-question"
                  name="securityQuestionCode"
                  value={securityQuestionCode}
                  onChange={(e) => setSecurityQuestionCode(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Select a security question</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q.code} value={q.code}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field md:col-span-2">
                <Label htmlFor="register-security-answer">Security Answer</Label>
                <Input
                  id="register-security-answer"
                  name="securityAnswer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="state-message state-message--error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="form-actions">
              <Button
                type="submit"
                disabled={submitting}
                className={submitting ? "is-loading h-10 w-full" : "h-10 w-full"}
              >
                {submitting ? "Registering…" : "Register"}
              </Button>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Register;
