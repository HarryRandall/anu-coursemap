"use client";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { Button } from "@reui/ui/button";
import { Field, FieldDescription } from "@reui/ui/field";
import { Input } from "@reui/ui/input";
import { OptionPicker } from "@/components/ui/option-picker";
import { Textarea } from "@reui/ui/textarea";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@reui/ui/dialog";
import { helpEmailReasons } from "@/lib/help";

type EmailSupportDialogProps = {
  reasonId: string;
  onClose: () => void;
};

export function EmailSupportDialog({
  reasonId,
  onClose,
}: EmailSupportDialogProps) {
  const restoreFocus = useReturnFocus();
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        {...restoreFocus}
        showCloseButton={false}
        aria-labelledby={titleId}
        aria-describedby={undefined}
        className={"max-w-lg"}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <DialogTitle asChild>
              <h2
                id={titleId}
                className="text-[15px] font-semibold text-foreground"
              >
                Email support
              </h2>
            </DialogTitle>
            <p id={noticeId} className="mt-0.5 text-xs text-muted-foreground">
              Sending from Coursemap is coming soon. You can still draft a
              message so we know what to collect.
            </p>
          </div>
          <Button
            onClick={onClose}
            className="-mr-1"
            variant="outline"
            aria-label={"Close"}
            size="icon"
            type="button"
          >
            <X size={16} />
          </Button>
        </div>

        <form
          className="flex flex-col gap-4 px-5 py-4"
          onSubmit={(event) => event.preventDefault()}
          aria-describedby={noticeId}
        >
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {"What is this about?"}
              </span>
              <OptionPicker
                value={"coursemap:" + String(reason)}
                onValueChange={(nextValue) => {
                  const option = helpEmailReasons
                    .map((option) => ({
                      value: option.id,
                      label: option.label,
                    }))
                    .find(
                      (option) =>
                        "coursemap:" + String(option.value) === nextValue,
                    );
                  if (option) setReason(option.value);
                }}
                aria-label={"What is this about?"}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder={"Select..."}
                items={helpEmailReasons
                  .map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))
                  .map((option) => ({
                    value: "coursemap:" + String(option.value),
                    label: option.label,
                  }))}
              />
            </label>
          </Field>
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Your email"}</span>
              <Input
                ref={emailRef}
                type="email"
                autoComplete="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@anu.edu.au"
              />
            </label>
          </Field>
          <Field>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Message"}</span>
              <Textarea
                name="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a short description…"
              />
              <FieldDescription>
                {
                  "Include the page you were on and what you expected to happen."
                }
              </FieldDescription>
            </label>
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled
              aria-describedby={noticeId}
            >
              Coming soon
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
