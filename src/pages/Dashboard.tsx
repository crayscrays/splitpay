import { useMemo, useState } from "react";
import { Plus, RefreshCw, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { MemberAvatar } from "@/components/MemberAvatar";
import { GroupCard } from "@/components/GroupCard";
import { GroupSheet } from "@/components/GroupSheet";
import { fetchGroups } from "@/lib/supabase";
import { computeNetBalances, formatAddress, formatCurrency, formatUsdc } from "@/lib/utils";

export function Dashboard() {
  const sp = useSplitPay();
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [debugResult, setDebugResult] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await sp.refreshGroups();
    setRefreshing(false);
  };

  const handleDebug = async () => {
    const wallet = sp.profile?.walletAddress ?? "";
    setDebugResult("Fetching…");
    const rows = await fetchGroups(wallet);
    setDebugResult(JSON.stringify({ wallet, rows }, null, 2));
  };

  const myWallet = sp.profile?.walletAddress ?? "";

  const groupsWithBal = useMemo(() => {
    return sp.groups.map((g) => {
      const bal = computeNetBalances({ expenses: g.expenses });
      return { group: g, netBalance: bal[myWallet] ?? 0 };
    });
  }, [sp.groups, myWallet]);

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
        </div>

        {/* USDC balance */}
        <div className="mt-4 card p-4 bg-gradient-to-br from-surface to-surface-2 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Wallet size={12} /> USDC · Base Sepolia
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
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-ghost text-xs px-2 py-1"
              aria-label="Refresh groups"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="btn btn-ghost text-xs px-2 py-1 -mr-2"
              data-testid="button-add-group"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {groupsWithBal.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-surface-2 items-center justify-center mb-3">
              <Users size={20} className="text-text-muted" />
            </div>
            <div className="text-sm font-medium text-text">No groups yet</div>
            <div className="text-xs text-text-muted mt-1 mb-4">
              Create a group and invite your friends to start splitting
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="btn btn-primary px-5 py-2.5 text-sm font-semibold"
              data-testid="button-create-first-group"
            >
              <Plus size={14} /> Create a group
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

      {/* Temporary debug panel */}
      <section className="px-4 mt-4">
        <button onClick={handleDebug} className="btn btn-ghost text-xs px-3 py-1 border border-dashed w-full">
          Debug: fetch my groups from Supabase
        </button>
        {debugResult && (
          <pre className="mt-2 text-xs bg-surface-2 border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {debugResult}
          </pre>
        )}
      </section>

      {showPicker && <GroupSheet onClose={() => setShowPicker(false)} />}
    </div>
  );
}
