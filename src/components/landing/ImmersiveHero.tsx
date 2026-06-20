interface ImmersiveHeroProps {
  children: React.ReactNode;
}

export function ImmersiveHero({ children }: ImmersiveHeroProps) {
  return (
    <div className="relative flex items-center justify-center py-20 lg:py-32">
      {/* Background graphic removed for now — to be replaced with an
          upgraded hero visual (Spline 3D scene under exploration). */}
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
