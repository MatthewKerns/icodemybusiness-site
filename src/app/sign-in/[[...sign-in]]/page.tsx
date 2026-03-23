import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AuthPageLayout } from "@/components/shared/AuthPageLayout";

export default function SignInPage() {
  return (
    <AuthPageLayout>
      <SignIn appearance={clerkAppearance} />
    </AuthPageLayout>
  );
}
