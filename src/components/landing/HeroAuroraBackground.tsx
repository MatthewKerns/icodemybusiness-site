/**
 * Hero background visual — a subtle gold-on-black aurora (animated radial-gradient
 * mesh). Pure CSS, no JS/WebGL, so it carries ~zero LCP cost. The animations
 * auto-freeze under prefers-reduced-motion (global rule in globals.css + the media
 * query below). Rendered behind the z-10 hero text in ImmersiveHero (desktop-only).
 *
 * Future upgrade path: a Spline/R3F 3D scene could layer on top of this aurora,
 * which would then act as the poster / reduced-motion fallback.
 */
export function HeroAuroraBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="hero-aurora absolute inset-0">
        <span className="hero-aurora__blob hero-aurora__blob--1" />
        <span className="hero-aurora__blob hero-aurora__blob--2" />
        <span className="hero-aurora__blob hero-aurora__blob--3" />
      </div>

      <style>{`
        .hero-aurora {
          -webkit-mask-image: radial-gradient(ellipse at center, #000 50%, transparent 100%);
          mask-image: radial-gradient(ellipse at center, #000 50%, transparent 100%);
        }
        .hero-aurora__blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(64px);
          will-change: transform;
        }
        .hero-aurora__blob--1 {
          width: 30rem; height: 30rem;
          left: 50%; top: 50%; margin: -15rem 0 0 -15rem;
          background: radial-gradient(circle, rgba(212,175,55,0.28), rgba(212,175,55,0) 70%);
          animation: hero-aurora-1 20s ease-in-out infinite;
        }
        .hero-aurora__blob--2 {
          width: 22rem; height: 22rem;
          left: 30%; top: 28%; margin: -11rem 0 0 -11rem;
          background: radial-gradient(circle, rgba(232,200,74,0.20), rgba(232,200,74,0) 70%);
          animation: hero-aurora-2 24s ease-in-out infinite;
        }
        .hero-aurora__blob--3 {
          width: 24rem; height: 24rem;
          left: 70%; top: 72%; margin: -12rem 0 0 -12rem;
          background: radial-gradient(circle, rgba(160,134,40,0.22), rgba(160,134,40,0) 70%);
          animation: hero-aurora-3 22s ease-in-out infinite;
        }
        @keyframes hero-aurora-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(0, -16px) scale(1.08); }
        }
        @keyframes hero-aurora-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(28px, 18px) scale(1.06); }
        }
        @keyframes hero-aurora-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-26px, -14px) scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-aurora__blob { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
