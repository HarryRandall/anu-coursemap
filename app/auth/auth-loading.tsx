import { Skeleton } from "@reui/ui/skeleton";
import { AuthShell } from "@/app/auth/auth-shell";

/**
 * Shared skeleton for the sign-in and sign-up forms: heading, social buttons,
 * the divider, email and password fields and the submit button.
 */
export function AuthLoading({
  label,
  fields,
}: {
  label: string;
  fields: number;
}) {
  return (
    <AuthShell>
      <div aria-busy="true">
        <span className="sr-only">{label}</span>
        <Skeleton className="h-8 w-48 bg-zinc-100 sm:h-9" />
        <Skeleton className="mt-3 h-3.5 w-full bg-zinc-100" />
        <Skeleton className="mt-2 h-3.5 w-2/3 bg-zinc-100" />
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-10 rounded-lg bg-zinc-100" />
          <Skeleton className="h-10 rounded-lg bg-zinc-100" />
        </div>
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-zinc-200" />
          <Skeleton className="h-2.5 w-28 bg-zinc-100" />
          <span className="h-px flex-1 bg-zinc-200" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: fields }, (_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-3 w-20 bg-zinc-100" />
              <Skeleton className="h-10 w-full rounded-lg bg-zinc-100" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-lg bg-zinc-100" />
        </div>
        <Skeleton className="mx-auto mt-6 h-3.5 w-52 bg-zinc-100" />
      </div>
    </AuthShell>
  );
}
