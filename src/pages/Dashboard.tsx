import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { MemberAvatar } from "@/components/MemberAvatar";
import { GroupCard } from "@/components/GroupCard";
import { computeNetBalances, formatAddress, formatCurrency, formatUsdc } from "@/lib/utils";
import type { GroupSummary } from "@0xchat/app-sdk";

export function Dashboard() {
  const sp = useSplitPay();
  const [showPicker, setShowPicker] = useState(false);

  const myWallet = sp.profile?.walletAddress ?? "";

  const groupsWithBal = useMemo(() => {
    return sp.groups.map((g) => {
      const bal = computeNetBalances({ expenses: g.expenses });
      return { group: g, netBalance: bal[myWallet] ?? 0 };
    });
  }, [sp.groups, myWallet]);

  if (sp.loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-4 overflow-y-auto min-h-0">
      {/* Profile + balance */}
      <section className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <MemberAvatar
            name={sp.profile?.displayName ?? "You"}
            wallet={myWallet}
            src={sp.profile?.avatar || undefined}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-text-muted">Welcome back</div>
            <h2 className="font-semibold text-text truncate" data-testid="text-profile-name">
              {sp.profile?.displayName || "You"}
            </h2>
            <div className="text-xs text-text-dim font-mono truncate">
              {formatAddress(myWallet, 5)}
            </div>
          </div>
          {sp.mode === "mock" && (
            <span className="chip bg-surface-2 border border-border text-text-dim text-[10px]">
              demo mode
            </span>
          )}
        </div>

        {/* USDC balance */}
        <div className="mt-4 card p-4 bg-gradient-to-br from-surface to-surface-2 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Wallet size={12} /> USDC · Base
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight" data-testid="text-balance">
                {formatUsdc(Number(sp.balance) || 0)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <span className="text-accent font-bold text-sm">$</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="card p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <TrendingUp size={12} className="text-positive" /> You are owed
            </div>
            <div className="mt-1 text-lg font-semibold text-positive" data-testid="text-total-owed">
              {formatCurrency(sp.totalOwed)}
            </div>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <TrendingDown size={12} className="text-negative" /> You owe
            </div>
            <div className="mt-1 text-lg font-semibold text-negative" data-testid="text-total-owing">
              {formatCurrency(sp.totalOwing)}
            </div>
          </div>
        </div>
      </section>

      {/* Groups */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="label">Active Groups</h3>
          <button
            onClick={() => setShowPicker(true)}
            className="btn btn-ghost text-xs px-2 py-1 -mr-2"
            data-testid="button-add-group"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {groupsWithBal.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-text-muted text-sm">No groups yet.</div>
            <button
              onClick={() => setShowPicker(true)}
              className="btn btn-primary mt-4 px-4 py-2 text-sm"
            >
              <Plus size={14} /> Link a group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupsWithBal.map(({ group, netBalance }) => (
              <GroupCard
                key={group.id}
                group={group}
                myWallet={myWallet}
                netBalance={netBalance}
              />
            ))}
          </div>
        )}
      </section>

      {showPicker && <AddGroupSheet onClose={() => setShowPicker(false)} />}
    </div>
  );
}

function AddGroupSheet({ onClose }: { onClose: () => void }) {
  const sp = useSplitPay();
  const [adding, setAdding] = useState<string | null>(null);

  const add = async (g: GroupSummary) => {
    setAdding(g.id);
    try {
      await sp.addGroup(g);
      onClose();
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative w-full max-w-[480px] bg-surface border-t border-border rounded-t-2xl max-h-[70vh] flex flex-col fade-in"
        data-testid="sheet-add-group"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Link a group</h3>
          <button onClick={onClose} className="btn btn-ghost text-sm px-3 py-1">
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          {sp.availableGroups.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted">
              No other groups available to link.
            </div>
          ) : (
            sp.availableGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => add(g)}
                disabled={adding !== null}
                className="w-full card p-3 flex items-center gap-3 hover:border-border-strong text-left"
                data-testid={`add-available-${g.id}`}
              >
                <MemberAvatar name={g.name} wallet={g.id} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{g.name}</div>
                  <div className="text-xs text-text-muted">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </div>
                </div>
                {adding === g.id ? (
                  <span className="text-xs text-text-muted">Adding…</span>
                ) : (
                  <Plus size={16} className="text-text-muted" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
