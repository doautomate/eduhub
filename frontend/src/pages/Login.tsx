import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useAuth } from "../shared/hooks/useAuth";
import { authService } from "../shared/services/authService";
import { ApiError, CaptchaRequiredError, EmailNotVerifiedError } from "../shared/types/auth";

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // FR-007: a user with a valid, active session is redirected away from /login to the home page.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setResendMessage(null);
    setSubmitting(true);
    try {
      await login({ email, password, captchaToken: captchaToken || undefined });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof EmailNotVerifiedError) {
        setError(err.detail);
        setUnverifiedEmail(email);
      } else if (err instanceof CaptchaRequiredError) {
        setCaptchaRequired(true);
        setError(err.detail);
      } else if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // T027/T058: the userId isn't known from a failed login response, so we look up
  // the id this browser previously cached (set by Register.tsx / VerifyOtp.tsx) for
  // this email. When unavailable we fall back to a safe, non-erroring prompt rather
  // than guessing - matching the "no-op-safe... guarded by feature availability" note.
  async function handleResendCode() {
    if (!unverifiedEmail) {
      return;
    }
    const cachedUserId = sessionStorage.getItem(`otp:userId:${unverifiedEmail}`);
    if (!cachedUserId) {
      setResendMessage(
        "We couldn't automatically resend a code from here. Please check your email for the original verification code, or register again to get a new one.",
      );
      return;
    }
    try {
      await authService.resendOtp({ userId: cachedUserId });
      setResendMessage("A new verification code was sent to your email.");
      navigate("/verify-otp", {
        state: { userId: cachedUserId, email: unverifiedEmail },
      });
    } catch {
      setResendMessage("Unable to resend the code right now. Please try again shortly.");
    }
  }

  return (
    <div className="screen-shell items-center">
      <Card className="screen-card max-w-md border-border/70 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl"><h1>Log in</h1></CardTitle>
          <CardDescription>
            Welcome back. Sign in to continue your learning journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} aria-label="Login form" className="space-y-5">
            <div className="field">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="field">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </div>
            {captchaRequired && (
              <div data-testid="captcha-widget" className="field">
                <Label htmlFor="captcha-token">CAPTCHA verification required</Label>
                <Input
                  id="captcha-token"
                  name="captchaToken"
                  value={captchaToken}
                  onChange={(e) => setCaptchaToken(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="state-message state-message--error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {unverifiedEmail && (
              <div
                data-testid="resend-otp-prompt"
                className="state-message state-message--warning space-y-3 border-warning/30 bg-warning/10 text-foreground"
              >
                <p className="m-0 font-medium">Please verify your email address to sign in.</p>
                <Button type="button" variant="secondary" className="h-10" onClick={handleResendCode}>
                  Resend verification code
                </Button>
                {resendMessage && (
                  <p role="status" className="m-0 text-sm text-muted-foreground">
                    {resendMessage}
                  </p>
                )}
              </div>
            )}
            <div className="form-actions">
              <Button
                type="submit"
                disabled={submitting}
                className={submitting ? "is-loading h-10 w-full" : "h-10 w-full"}
              >
                {submitting ? "Logging in…" : "Log in"}
              </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="m-0">
                <Link to="/recover-account">Forgot password?</Link>
              </p>
              <p className="m-0">
                Don&apos;t have an account? <Link to="/register">Register</Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
