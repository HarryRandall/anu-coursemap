import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={301}
      height={266}
      loading="eager"
      aria-hidden="true"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
