import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { GroupCard } from "@/components/GroupCard";
import { MemberAvatar } from "@/components/MemberAvatar";
import { computeNetBalances } from "@/lib/utils";
import type { GroupSummary } from "@0xchat/app-sdk";

export function GroupsPage() {
  const sp = useSplitPay();
  const [adding, setAdding] = useState<string | null>(null);
  const myWallet = sp.profile?.walletAddress ?? "";

  const groupsWithBal = useMemo(
    () =>
      sp.groups.map((g) => ({
        group: g,
        netBalance: computeNetBalances({ expenses: g.expenses })[myWallet] ?? 0,
      })),
    [sp.groups, myWallet]
  );

  const addGroup = async (g: GroupSummary) => {
    setAdding(g.id);
    try {
      await sp.addGroup(g);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Groups" subtitle={`${sp.groups.length} linked`} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {sp.groups.length > 0 && (
          <section className="space-y-3">
            {groupsWithBal.map(({ group, netBalance }) => (
              <GroupCard
                key={group.id}
                group={group}
                myWallet={myWallet}
                netBalance={netBalance}
              />
            ))}
          </section>
        )}

        {sp.availableGroups.length > 0 && (
          <section>
            <h3 className="label mb-2">From your 0xChat groups</h3>
            <div className="space-y-2">
              {sp.availableGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => addGroup(g)}
                  disabled={adding !== null}
                  className="w-full card p-3 flex items-center gap-3 hover:border-border-strong text-left"
                  data-testid={`add-group-${g.id}`}
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
              ))}
            </div>
          </section>
        )}

        {sp.groups.length === 0 && sp.availableGroups.length === 0 && (
          <div className="card p-8 text-center text-sm text-text-muted">
            No groups available yet.
          </div>
        )}
      </div>
    </div>
  );
}
