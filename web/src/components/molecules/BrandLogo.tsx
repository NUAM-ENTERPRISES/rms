import { cn } from "@/lib/utils";
import { AffiniksLogoMark } from "./AffiniksLogoMark";

type BrandLogoProps = {
  className?: string;
  /** Header uses compact sizing; auth pages use larger sizing. */
  variant?: "header" | "auth";
};

/** Affiniks brand mark — same logo + text layout in light and dark mode. */
export function BrandLogo({ className, variant = "header" }: BrandLogoProps) {
  const isAuth = variant === "auth";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <AffiniksLogoMark size={isAuth ? "lg" : "md"} alt="" />
      <div className="leading-tight">
        <p
          className={cn(
            "font-bold tracking-wide text-foreground",
            isAuth ? "text-2xl" : "text-sm",
          )}
        >
          AFFINIKS
        </p>
        <p
          className={cn(
            "font-medium uppercase tracking-[0.18em] text-muted-foreground",
            isAuth ? "text-xs" : "text-[10px]",
          )}
        >
          International
        </p>
      </div>
    </div>
  );
}

export default BrandLogo;
