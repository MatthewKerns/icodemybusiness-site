import { HeroAuroraBackground } from "./HeroAuroraBackground";

interface ImmersiveHeroProps {
  children: React.ReactNode;
}

export function ImmersiveHero({ children }: ImmersiveHeroProps) {
  return (
    <div className="relative flex items-center justify-center py-20 lg:py-32">
      <HeroAuroraBackground />
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
