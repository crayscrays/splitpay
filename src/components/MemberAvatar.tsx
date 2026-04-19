import { avatarGradient, cn, initials } from "@/lib/utils";

interface Props {
  name: string;
  wallet?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  ring?: boolean;
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function MemberAvatar({ name, wallet, src, size = "md", className, ring }: Props) {
  const seed = wallet || name || "x";
  const [c1, c2] = avatarGradient(seed);
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 overflow-hidden select-none",
        SIZES[size],
        ring && "ring-2 ring-bg",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
      }}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
