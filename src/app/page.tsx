import { SplashScreen } from "@/components/landing/SplashScreen";

export default function Home() {
  return (
    <>
      <SplashScreen />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <section className="py-12 lg:py-20">
            <h2 className="text-h1 font-bold text-text-primary">
              Premium Consulting &amp; AI Automation
            </h2>
            <p className="mt-4 max-w-2xl text-text-muted">
              Helping business owners save time and make money with AI-powered
              tools, consulting, and automation systems.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
