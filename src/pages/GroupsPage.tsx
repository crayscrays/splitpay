import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { GroupCard } from "@/components/GroupCard";
import { GroupSheet } from "@/components/GroupSheet";
import { computeNetBalances } from "@/lib/utils";

export function GroupsPage() {
  const sp = useSplitPay();
  const [showSheet, setShowSheet] = useState(false);
  const myWallet = sp.profile?.walletAddress ?? "";

  const groupsWithBal = useMemo(
    () =>
      sp.groups.map((g) => ({
        group: g,
        netBalance: computeNetBalances({ expenses: g.expenses })[myWallet] ?? 0,
      })),
    [sp.groups, myWallet]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Groups"
        subtitle={`${sp.groups.length} group${sp.groups.length === 1 ? "" : "s"}`}
      />

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

        {sp.groups.length === 0 && (
          <div className="card p-8 text-center text-sm text-text-muted">
            <div className="mb-4">No groups yet.</div>
            <button
              onClick={() => setShowSheet(true)}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              <Plus size={14} /> Create or link a group
            </button>
          </div>
        )}

        <button
          onClick={() => setShowSheet(true)}
          className="w-full card p-3 flex items-center gap-3 hover:border-border-strong text-left border border-dashed"
          data-testid="button-add-group-page"
        >
          <div className="h-9 w-9 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
            <Plus size={16} className="text-text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-text-muted">Add group</div>
            <div className="text-xs text-text-dim">Create new or link from 0xChat</div>
          </div>
        </button>
      </div>

      {showSheet && <GroupSheet onClose={() => setShowSheet(false)} />}
    </div>
  );
}
