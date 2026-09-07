import Image from "next/image";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/cn";

const logos: Record<string, string> = {
  google: "google-color.svg",
  qwen: "qwen-color.svg",
  anthropic: "claude-color.svg",
  openai: "openai.svg",
  deepseek: "deepseek-color.svg",
  mistralai: "mistral-color.svg",
};

export function ImportModelLogo({
  model,
  className,
}: {
  model: string;
  className?: string;
}) {
  const provider = model.split("/")[0]?.toLowerCase() ?? "";
  const logo = logos[provider];
  if (!logo)
    return (
      <Cpu
        aria-hidden="true"
        className={cn("size-5 shrink-0 text-muted-foreground", className)}
      />
    );
  return (
    <Image
      src={`/model-brands/${logo}`}
      width={24}
      height={24}
      alt=""
      aria-hidden="true"
      unoptimized
      className={cn(
        "size-5 shrink-0",
        provider === "openai" && "dark:invert",
        className,
      )}
    />
  );
}
