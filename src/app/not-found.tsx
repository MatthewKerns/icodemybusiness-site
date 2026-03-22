import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 text-center">
      <p className="font-accent text-6xl font-bold text-gold">404</p>
      <h1 className="mt-4 text-h2 font-bold text-text-primary">
        Page not found
      </h1>
      <p className="mt-2 text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
      >
        Back to Home
      </Link>
    </main>
  );
}
