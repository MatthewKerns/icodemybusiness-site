import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black px-4">
      <h1 className="mb-8 font-accent text-2xl font-medium text-gold">
        iCodeMyBusiness
      </h1>
      <SignIn appearance={clerkAppearance} />
    </main>
  );
}
