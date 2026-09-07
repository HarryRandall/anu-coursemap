import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import type { ImportModel } from "@/lib/admin/import-model";
import { cn } from "@/lib/cn";
import { CatalogueRowActions } from "@/ui/admin/catalogue-table/catalogue-row-actions";
import { ImportModelLogo } from "./import-model-logo";
import { ImportModelPrice } from "./import-model-price";

export type ImportModelRowAction = "refresh" | "remove" | "show" | "hide";

export function ImportModelRow({
  model,
  selected,
  pending,
  onAction,
}: {
  model: ImportModel;
  selected: boolean;
  pending: boolean;
  onAction: (action: ImportModelRowAction) => void;
}) {
  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2 py-3",
        !model.visible && "text-muted-foreground grayscale",
      )}
    >
      <ImportModelLogo model={model.id} className="size-6" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{model.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {model.provider}
          {selected ? " · Default" : ""}
        </p>
      </div>
      <ImportModelPrice model={model} />
      <CatalogueRowActions
        label={model.name}
        links={[]}
        disabled={pending}
        extraActions={[
          {
            label: "Refresh pricing",
            icon: <RefreshCw />,
            onSelect: () => onAction("refresh"),
          },
          ...(selected
            ? []
            : [
                {
                  label: model.visible ? "Hide model" : "Show model",
                  icon: model.visible ? <EyeOff /> : <Eye />,
                  onSelect: () => onAction(model.visible ? "hide" : "show"),
                },
                {
                  label: "Remove model",
                  icon: <Trash2 />,
                  onSelect: () => onAction("remove"),
                },
              ]),
        ]}
      />
    </li>
  );
}
