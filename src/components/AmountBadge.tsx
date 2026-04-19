import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  amount: number; // positive = owed to user, negative = user owes, 0 = settled
  settled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AmountBadge({ amount, settled, size = "sm", className }: Props) {
  const positive = amount > 0.009;
  const negative = amount < -0.009;
  const isSettled = settled || (!positive && !negative);

  const base = "chip font-medium";
  const tone = isSettled
    ? "bg-surface-2 text-text-muted border border-border"
    : positive
    ? "bg-positive/10 text-positive"
    : "bg-negative/10 text-negative";

  const sizing = size === "md" ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5";

  return (
    <span className={cn(base, tone, sizing, className)}>
      {isSettled ? "Settled" : formatCurrency(amount, { sign: true })}
    </span>
  );
}
