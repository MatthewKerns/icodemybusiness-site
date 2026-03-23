import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AuthPageLayout } from "@/components/shared/AuthPageLayout";

export default function SignUpPage() {
  return (
    <AuthPageLayout>
      <SignUp appearance={clerkAppearance} />
    </AuthPageLayout>
  );
}
