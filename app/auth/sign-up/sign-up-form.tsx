"use client";

import { CircleAlert, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/browser";

export function SignUpForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || submitting) return;

    if (password !== passwordConfirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        setErrorMessage(
          message.includes("already registered") ||
            message.includes("already been registered")
            ? "An account may already exist for this email. Try signing in instead."
            : message.includes("password")
              ? "Use a stronger password with at least 8 characters."
              : "Coursemap could not create your account. Wait a moment and try again.",
        );
        return;
      }

      if (!data.session) {
        setErrorMessage(
          "Your account was created, but email confirmation is still enabled. Contact the Coursemap administrator before trying again.",
        );
        return;
      }

      window.location.assign(next);
    } catch {
      setErrorMessage(
        "Coursemap could not create your account. Check the Supabase service and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email address">
        <span className="relative block">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="name@anu.edu.au"
            required
            disabled={!configured || submitting}
            className="min-h-11 pl-10"
          />
        </span>
      </Field>

      <Field
        label="Password"
        hint="Use at least 8 characters and do not reuse your ANU password."
      >
        <span className="relative block">
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={!configured || submitting}
            className="min-h-11 pl-10"
          />
        </span>
      </Field>

      <Field label="Confirm password">
        <span className="relative block">
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="password"
            name="passwordConfirmation"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={!configured || submitting}
            className="min-h-11 pl-10"
          />
        </span>
      </Field>

      {errorMessage && (
        <Alert tone="danger" role="alert">
          <CircleAlert />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!configured || submitting}
        className="min-h-11"
      >
        {submitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
