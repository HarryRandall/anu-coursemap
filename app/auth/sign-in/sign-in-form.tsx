"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/browser";

export function SignInForm({
  next,
  configured,
  callbackOrigin,
}: {
  next: string;
  configured: boolean;
  callbackOrigin: string | null;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (!callbackOrigin) throw new Error("Missing callback origin");
      const callbackUrl = new URL("/auth/callback", callbackOrigin);
      callbackUrl.searchParams.set("next", next);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true,
        },
      });

      if (error) {
        setErrorMessage(
          "Coursemap could not request a sign-in link. Wait a moment and try again.",
        );
        return;
      }

      setSent(true);
    } catch {
      setErrorMessage(
        "Coursemap could not request a sign-in link. Check the local Supabase service and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">Check your email</h2>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
              We sent a one-time sign-in link to {email}. Open it in this
              browser to continue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email address"
        hint="For local development, the email appears in Mailpit."
      >
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
        {submitting ? "Sending link..." : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
