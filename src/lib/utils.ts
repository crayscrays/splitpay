export const normalizeWallet = (w: string) => w.toLowerCase();

// ---------- Formatting ----------

export function formatAddress(addr: string, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function formatCurrency(amount: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: abs >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (opts.sign) {
    if (amount > 0) return `+$${formatted}`;
    if (amount < 0) return `-$${formatted}`;
  }
  return `$${formatted}`;
}

export function formatUsdc(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

// ---------- IDs ----------

export function uid(prefix = ""): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${prefix ? "-" : ""}${Date.now().toString(36)}-${rand}`;
}

// ---------- Invite codes ----------

// No I or O to avoid visual confusion with 1 and 0
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function genCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

/** Write invite code info to Supabase. Fire-and-forget. */
export async function publishCode(code: string, info: object): Promise<void> {
  try {
    const { supabase } = await import("./supabase");
    if (!supabase) return;
    await supabase
      .from("invite_codes")
      .upsert({ code: code.toUpperCase(), data: info }, { onConflict: "code" });
  } catch {}
}

/** Resolve a code from Supabase. */
export async function resolveCodeRemote(code: string): Promise<Record<string, any> | null> {
  try {
    const { supabase } = await import("./supabase");
    if (!supabase) return null;
    const { data } = await supabase
      .from("invite_codes")
      .select("data")
      .eq("code", code.toUpperCase())
      .single();
    return data?.data ?? null;
  } catch { return null; }
}

// ---------- Math ----------

/**
 * Split a total evenly, distributing remainder cents deterministically.
 * Returns amounts in the same order as `count` — summed exactly to `total`.
 */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

// ---------- Balance computation ----------

export interface BalanceInput {
  expenses: {
    paidBy: string;
    splits: { wallet: string; amount: number; settled: boolean }[];
  }[];
}

/**
 * Compute net balance per wallet.
 * Positive = they are owed money. Negative = they owe money.
 * Settled splits are excluded.
 */
export function computeNetBalances(input: BalanceInput): Record<string, number> {
  const bal: Record<string, number> = {};
  const add = (wallet: string, amt: number) => {
    bal[wallet] = (bal[wallet] ?? 0) + amt;
  };
  for (const exp of input.expenses) {
    for (const s of exp.splits) {
      if (s.settled) continue;
      // Payer is owed s.amount from s.wallet (unless s.wallet === payer)
      if (s.wallet === exp.paidBy) continue;
      add(exp.paidBy, s.amount); // payer gets credit
      add(s.wallet, -s.amount); // splitter owes
    }
  }
  // round to 2dp
  for (const k of Object.keys(bal)) bal[k] = Math.round(bal[k] * 100) / 100;
  return bal;
}

export interface DebtEdge {
  from: string; // owes
  to: string; // owed
  amount: number;
}

/**
 * Greedy debt simplification. Produces a minimal set of transfers
 * that settles all net balances.
 */
export function simplifyDebts(netBalances: Record<string, number>): DebtEdge[] {
  const creditors: { wallet: string; amount: number }[] = [];
  const debtors: { wallet: string; amount: number }[] = [];
  for (const [wallet, amount] of Object.entries(netBalances)) {
    if (amount > 0.009) creditors.push({ wallet, amount });
    else if (amount < -0.009) debtors.push({ wallet, amount: -amount });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const edges: DebtEdge[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.amount, c.amount);
    edges.push({
      from: d.wallet,
      to: c.wallet,
      amount: Math.round(pay * 100) / 100,
    });
    d.amount -= pay;
    c.amount -= pay;
    if (d.amount < 0.01) i++;
    if (c.amount < 0.01) j++;
  }
  return edges;
}

// ---------- Misc ----------

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar gradient from a wallet/string
const AVATAR_GRADIENTS: [string, string][] = [
  ["#2D9B72", "#1e6b50"],
  ["#4f46e5", "#312e81"],
  ["#db2777", "#831843"],
  ["#ea580c", "#7c2d12"],
  ["#0891b2", "#164e63"],
  ["#65a30d", "#365314"],
  ["#9333ea", "#4c1d95"],
  ["#e11d48", "#881337"],
];
export function avatarGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
