"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { helpEmailReasons } from "@/lib/help";

type EmailSupportDialogProps = {
  reasonId: string;
  onClose: () => void;
};

export function EmailSupportDialog({
  reasonId,
  onClose,
}: EmailSupportDialogProps) {
  const titleId = useId();
  const noticeId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState(reasonId);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previous = document.activeElement;
    emailRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="max-w-lg">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-[15px] font-semibold text-zinc-900">
            Email support
          </h2>
          <p id={noticeId} className="mt-0.5 text-xs text-zinc-500">
            Sending from Coursemap is coming soon. You can still draft a message
            so we know what to collect.
          </p>
        </div>
        <IconButton label="Close" onClick={onClose} className="-mr-1">
          <X size={16} />
        </IconButton>
      </div>

      <form
        className="flex flex-col gap-4 px-5 py-4"
        onSubmit={(event) => event.preventDefault()}
        aria-describedby={noticeId}
      >
        <Field label="What is this about?">
          <Select
            value={reason}
            onChange={setReason}
            aria-label="What is this about?"
            options={helpEmailReasons.map((option) => ({
              value: option.id,
              label: option.label,
            }))}
          />
        </Field>
        <Field label="Your email">
          <Input
            ref={emailRef}
            type="email"
            autoComplete="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@anu.edu.au"
          />
        </Field>
        <Field
          label="Message"
          hint="Include the page you were on and what you expected to happen."
        >
          <Textarea
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write a short description…"
          />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled
            aria-describedby={noticeId}
          >
            Coming soon
          </Button>
        </div>
      </form>
    </Modal>
  );
}
