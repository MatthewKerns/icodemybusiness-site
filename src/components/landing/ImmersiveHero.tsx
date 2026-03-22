interface ImmersiveHeroProps {
  children: React.ReactNode;
}

export function ImmersiveHero({ children }: ImmersiveHeroProps) {
  return (
    <div className="relative flex items-center justify-center py-20 lg:py-32">
      {/* Gold glow effect — box-shadow only, no filter:drop-shadow */}
      <div
        className="absolute inset-0 mx-auto max-w-2xl"
        style={{
          boxShadow: "0 0 60px rgba(212,175,55,0.4)",
          borderRadius: "50%",
          top: "30%",
          bottom: "30%",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
