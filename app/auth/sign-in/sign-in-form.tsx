"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "sign-in" | "sign-up";

export function SignInForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(
            error.message.toLowerCase().includes("invalid login credentials")
              ? "Email or password is incorrect."
              : "Coursemap could not sign you in. Wait a moment and try again.",
          );
          return;
        }

        window.location.assign(next);
        return;
      }

      if (password !== passwordConfirmation) {
        setErrorMessage("Passwords do not match.");
        return;
      }

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
          "Your account was created, but Supabase still requires email confirmation. Disable Confirm email in the hosted Supabase project to use password-only sign-up.",
        );
        return;
      }

      window.location.assign(next);
    } catch {
      setErrorMessage(
        `Coursemap could not ${mode === "sign-in" ? "sign you in" : "create your account"}. Check the Supabase service and try again.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setPasswordConfirmation("");
    setErrorMessage(null);
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
            className="pl-10"
          />
        </span>
      </Field>

      <Field
        label="Password"
        hint={
          mode === "sign-up"
            ? "Use at least 8 characters and do not reuse your ANU password."
            : undefined
        }
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
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            minLength={8}
            maxLength={128}
            required
            disabled={!configured || submitting}
            className="pl-10"
          />
        </span>
      </Field>

      {mode === "sign-up" && (
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
              className="pl-10"
            />
          </span>
        </Field>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700 ring-1 ring-rose-200"
        >
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!configured || submitting}
      >
        {submitting
          ? mode === "sign-in"
            ? "Signing in..."
            : "Creating account..."
          : mode === "sign-in"
            ? "Sign in"
            : "Create account"}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-[11px] text-zinc-400">or</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={!configured || submitting}
        onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in" ? "Create an account" : "Back to sign in"}
      </Button>
    </form>
  );
}
