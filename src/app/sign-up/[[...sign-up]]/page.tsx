import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-black px-4">
      <h1 className="mb-8 font-accent text-2xl font-medium text-gold">
        iCodeMyBusiness
      </h1>
      <SignUp appearance={clerkAppearance} />
    </main>
  );
}
