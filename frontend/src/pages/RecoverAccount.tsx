import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authService } from "../shared/services/authService";
import { ApiError } from "../shared/types/auth";

type Step = "start" | "answer" | "reset" | "done";

/**
 * Account-recovery flow (US5/FR-015, FR-016): start (email) -> answer (security
 * question) -> reset (new password). Uses a generic, non-disclosing message when
 * the email is unknown, and surfaces the 423 lockout the backend enforces after
 * repeated failed answers.
 */
export function RecoverAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authService.startRecovery({ email });
      setUserId(result.user_id);
      setQuestionText(result.question_text);
      setStep("answer");
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setError("Account recovery is temporarily locked. Please try again later.");
      } else {
        // FR-015/non-disclosure: never reveal whether the email exists.
        setError("If an account exists for that email, you'll be asked a security question next.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await authService.answerRecovery({ userId, answer });
      setResetToken(result.reset_token);
      setStep("reset");
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setError("Too many incorrect answers. Account recovery is temporarily locked.");
      } else if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to verify your answer. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetToken) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authService.resetPassword({ resetToken, newPassword });
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Unable to reset your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="screen-shell items-center">
        <Card
          role="status"
          className="screen-card state-message state-message--success max-w-md border-success/30 bg-success/10"
        >
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl"><h1>Password reset</h1></CardTitle>
            <CardDescription className="text-success/90">
              Your password has been reset. You can now sign in with your new password.
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
          <CardTitle className="text-3xl"><h1>Recover your account</h1></CardTitle>
          <CardDescription>
            Confirm your identity in the same secure recovery flow and choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "start" && (
            <form onSubmit={handleStart} aria-label="Start account recovery form" className="space-y-5">
              <div className="field">
                <Label htmlFor="recovery-email">Email</Label>
                <Input
                  id="recovery-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
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
                  {submitting ? "Continuing…" : "Continue"}
                </Button>
              </div>
            </form>
          )}
          {step === "answer" && (
            <form onSubmit={handleAnswer} aria-label="Answer security question form" className="space-y-5">
              <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-foreground">
                <p className="m-0">{questionText}</p>
              </div>
              <div className="field">
                <Label htmlFor="recovery-answer">Answer</Label>
                <Input
                  id="recovery-answer"
                  name="answer"
                  type="text"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="h-10"
                />
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
                  {submitting ? "Submitting…" : "Submit answer"}
                </Button>
              </div>
            </form>
          )}
          {step === "reset" && (
            <form onSubmit={handleReset} aria-label="Reset password form" className="space-y-5">
              <div className="field">
                <Label htmlFor="recovery-new-password">New password</Label>
                <Input
                  id="recovery-new-password"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10"
                />
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
                  {submitting ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </form>
          )}
          <p className="m-0 text-sm text-muted-foreground">
            Remembered your password? <Link to="/login">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RecoverAccount;
