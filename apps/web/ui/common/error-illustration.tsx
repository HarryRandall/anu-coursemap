import { CompassIllustration } from "@/ui/common/compass-illustration";
import { AccessErrorArtwork } from "@/ui/common/error-artwork/access-error-artwork";
import { OfflineErrorArtwork } from "@/ui/common/error-artwork/offline-error-artwork";
import { ServerErrorArtwork } from "@/ui/common/error-artwork/server-error-artwork";
import { SigninErrorArtwork } from "@/ui/common/error-artwork/signin-error-artwork";

export type ErrorIllustrationKind =
  "server" | "signin" | "access" | "offline" | "compass";

export function ErrorIllustration({ kind }: { kind: ErrorIllustrationKind }) {
  switch (kind) {
    case "compass":
      return <CompassIllustration />;
    case "signin":
      return <SigninErrorArtwork />;
    case "access":
      return <AccessErrorArtwork />;
    case "offline":
      return <OfflineErrorArtwork />;
    default:
      return <ServerErrorArtwork />;
  }
}
