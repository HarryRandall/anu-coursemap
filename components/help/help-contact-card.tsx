"use client";
import { Button } from "@reui/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@reui/ui/card";
import { cn } from "@/lib/cn";

import { useState } from "react";
import { Bug, Database, Lightbulb, Mail } from "lucide-react";
import { EmailSupportDialog } from "@/components/help/email-support-dialog";

import { helpContactReasons } from "@/lib/help";

const reasonIcons = {
  problem: Bug,
  data: Database,
  feature: Lightbulb,
} as const;

export function HelpContactCard() {
  const [reasonId, setReasonId] = useState<string | null>(null);

  return (
    <>
      <Card className="overflow-hidden lg:sticky lg:top-20 lg:self-start">
        <CardHeader>
          <CardTitle>
            <h2>{"Contact us"}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="border-t border-border/60 px-0 pb-0">
          <div className="divide-y divide-border/60">
            {helpContactReasons.map((contact) => {
              const Icon =
                reasonIcons[contact.id as keyof typeof reasonIcons] ?? Mail;
              return (
                <Button
                  key={contact.id}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-5 py-3.5 text-left whitespace-normal"
                  aria-haspopup="dialog"
                  aria-expanded={reasonId === contact.id}
                  onClick={() => setReasonId(contact.id)}
                  type="button"
                >
                  <Icon
                    size={17}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-foreground">
                      {contact.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed font-normal whitespace-normal text-muted-foreground">
                      {contact.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={reasonId === "other"}
            onClick={() => setReasonId("other")}
            className={cn(undefined, "w-full")}
            type="button"
          >
            <Mail size={15} aria-hidden="true" />
            Email support
          </Button>
        </CardFooter>
      </Card>
      {reasonId ? (
        <EmailSupportDialog
          reasonId={reasonId}
          onClose={() => setReasonId(null)}
        />
      ) : null}
    </>
  );
}
