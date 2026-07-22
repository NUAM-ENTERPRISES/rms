import { cn } from "@/lib/utils";

type AffiniksLogoMarkProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Screen-reader label; omit when decorative beside visible brand text. */
  alt?: string;
};

const SIZE = {
  xs: { box: "h-8 w-8 p-1", img: "h-6 w-6" },
  sm: { box: "h-9 w-9 p-1.5", img: "h-6 w-6" },
  md: { box: "h-10 w-10 p-1.5", img: "h-8 w-8" },
  lg: { box: "h-12 w-12 p-2", img: "h-10 w-10" },
} as const;

/** Small Affiniks icon mark (`logoorg.png`) for sidebars, chips, and compact brand slots. */
export function AffiniksLogoMark({
  className,
  size = "md",
  alt = "Affiniks",
}: AffiniksLogoMarkProps) {
  const s = SIZE[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-slate-900 shadow-lg ring-2 ring-violet-500/30",
        s.box,
        className,
      )}
    >
      <img
        src="/logoorg.png"
        alt={alt}
        className={cn(s.img, "object-contain")}
      />
    </div>
  );
}

export default AffiniksLogoMark;
