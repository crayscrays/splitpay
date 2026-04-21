import type { GroupData } from "./splitpay-context";

const KEY = "splitpay:v2";

interface PersistedData {
  wallet: string;
  groups: GroupData[];
}

/** Load groups for the given wallet. Returns null if no data or wallet mismatch. */
export function loadGroups(wallet: string): GroupData[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: PersistedData = JSON.parse(raw);
    // Discard data that belongs to a different wallet (e.g. leftover mock data)
    if (data.wallet !== wallet) return null;
    return Array.isArray(data.groups) ? data.groups : null;
  } catch {
    return null;
  }
}

export function saveGroups(wallet: string, groups: GroupData[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ wallet, groups }));
  } catch {}
}
