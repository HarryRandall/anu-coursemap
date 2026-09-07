import { AuthLoading } from "@/app/auth/auth-loading";

export default function SignUpLoading() {
  return <AuthLoading label="Loading sign up" fields={3} />;
}
