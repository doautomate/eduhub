import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authService } from "../shared/services/authService";
import { ApiError } from "../shared/types/auth";

interface VerifyOtpLocationState {
  userId?: string;
  email?: string;
}

/**
 * OTP code-entry screen (US4/FR-013, FR-014): shown right after registration, or
 * reachable directly if the user already knows their account id (e.g. via the
 * `otp:userId:<email>` sessionStorage lookup used by Login's "resend code" prompt).
 */
export function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as VerifyOtpLocationState | null) ?? null;
  const email = state?.email ?? "";
  const userId = state?.userId ?? (email ? sessionStorage.getItem(`otp:userId:${email}`) : null);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState<number | null>(null);

  if (!userId) {
    return (
      <div className="screen-shell items-center">
        <Card className="screen-card max-w-md border-border/70 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl"><h1>Verify your email</h1></CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="state-message state-message--error">
              <AlertDescription>
                We couldn&apos;t find your registration details on this device. Please{" "}
                <Link to="/register">register again</Link> or check the verification email you
                originally received.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.verifyOtp({ userId: userId as string, code });
      setVerified(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.meta && "attempts_remaining" in err.meta) {
          setAttemptsRemaining(err.meta.attempts_remaining as number);
          setError("Incorrect or expired verification code.");
        } else {
          setError(err.detail);
        }
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResending(true);
    try {
      await authService.resendOtp({ userId: userId as string });
      setResendMessage("A new verification code was sent to your email.");
      setAttemptsRemaining(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const retryAfter = (err.meta?.retryAfterSeconds as number) ?? 60;
        setResendCooldownSeconds(retryAfter);
        setError("Please wait before requesting another code.");
      } else if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to resend the code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <div className="screen-shell items-center">
        <Card
          role="status"
          className="screen-card state-message state-message--success max-w-md border-success/30 bg-success/10"
        >
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl"><h1>Email verified</h1></CardTitle>
            <CardDescription className="text-success/90">
              Your account is now active. You can sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="h-10 w-full" onClick={() => navigate("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-shell items-center">
      <Card className="screen-card max-w-md border-border/70 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl"><h1>Verify your email</h1></CardTitle>
          <CardDescription>
            Enter the verification code we sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} aria-label="Verify email form" className="space-y-5">
            <div className="field">
              <Label htmlFor="otp-code">Verification code</Label>
              <Input
                id="otp-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-10"
              />
            </div>
            {attemptsRemaining !== null && (
              <div
                data-testid="attempts-remaining"
                className="state-message state-message--warning border-warning/30 bg-warning/10 text-foreground"
              >
                {attemptsRemaining} attempts remaining.
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="state-message state-message--error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {resendMessage && (
              <p role="status" className="state-message state-message--success m-0 border-success/30 bg-success/10">
                {resendMessage}
              </p>
            )}
            <div className="form-actions sm:flex-row">
              <Button
                type="submit"
                disabled={submitting}
                className={submitting ? "is-loading h-10 flex-1" : "h-10 flex-1"}
              >
                {submitting ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resending || resendCooldownSeconds !== null}
                data-testid="resend-code-button"
                className={resending ? "is-loading h-10 flex-1" : "h-10 flex-1"}
              >
                Resend code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default VerifyOtp;
