"use client";
import { Popover, PopoverContent, PopoverTrigger } from "@reui/ui/popover";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Eye,
  History,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@reui/ui/button";
import { OptionMenu } from "@/components/ui/option-menu";

import styles from "./catalogue-table.module.css";

type Action = {
  label: string;
  href: string;
  icon?: "view" | "source" | "history";
};
export function CatalogueRowActions({
  code,
  label,
  extraActions = [],
  links,
  onSelectForImport,
}: {
  code?: string;
  label?: string;
  extraActions?: { label: string; icon: ReactNode; onSelect: () => void }[];
  links: Action[];
  onSelectForImport?: () => void;
}) {
  const targetLabel = label ?? code ?? "row";
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const items = links.map((link, index) => ({
    value: String(index),
    label: link.label,
    icon:
      link.icon === "source" ? (
        <ExternalLink />
      ) : link.icon === "history" ? (
        <History />
      ) : (
        <Eye />
      ),
  }));
  if (code) items.push({ value: "copy", label: "Copy code", icon: <Copy /> });
  extraActions.forEach((action, index) =>
    items.push({
      value: `extra-${index}`,
      label: action.label,
      icon: <>{action.icon}</>,
    }),
  );
  if (onSelectForImport)
    items.push({
      value: "select",
      label: "Select for import",
      icon: <RefreshCw />,
    });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Actions for ${targetLabel}`}
          size="icon-sm"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={`Actions for ${targetLabel}`}
        align="end"
        className={styles.actions}
      >
        <OptionMenu
          items={items}
          value={null}
          onSelect={(value) => {
            setOpen(false);
            if (value === "copy" && code) {
              void navigator.clipboard.writeText(code).then(
                () => toast.success("Code copied"),
                () => toast.error("Could not copy the code"),
              );
            } else if (value.startsWith("extra-"))
              extraActions[Number(value.slice(6))]?.onSelect();
            else if (value === "select") onSelectForImport?.();
            else {
              const link = links[Number(value)];
              if (link.href.startsWith("https://"))
                window.open(link.href, "_blank", "noopener,noreferrer");
              else router.push(link.href);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
