import { AuthLoading } from "@/app/auth/auth-loading";

export default function LoginLoading() {
  return <AuthLoading label="Loading sign in" fields={2} />;
}
