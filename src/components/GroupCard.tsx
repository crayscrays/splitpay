import { Link } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import type { GroupData } from "@/lib/splitpay-context";
import { MemberAvatar } from "./MemberAvatar";
import { AmountBadge } from "./AmountBadge";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  group: GroupData;
  myWallet: string;
  netBalance: number; // from my perspective
}

export function GroupCard({ group, myWallet, netBalance }: Props) {
  const totalExpenses = group.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Link
      to={`/group/${group.id}`}
      className="card p-4 block hover:border-border-strong transition-colors"
      data-testid={`link-group-${group.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text truncate">{group.name}</h3>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {group.members.length}
            </span>
            <span>·</span>
            <span>
              {group.expenses.length} expense{group.expenses.length === 1 ? "" : "s"}
            </span>
            {totalExpenses > 0 && (
              <>
                <span>·</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-text-dim flex-shrink-0" />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          {group.members.slice(0, 4).map((m) => (
            <MemberAvatar
              key={m.walletAddress}
              name={m.displayName}
              wallet={m.walletAddress}
              size="sm"
              ring
            />
          ))}
          {group.members.length > 4 && (
            <div className="h-8 w-8 rounded-full bg-surface-2 border-2 border-bg flex items-center justify-center text-[10px] text-text-muted font-medium">
              +{group.members.length - 4}
            </div>
          )}
        </div>
        <div className="text-right">
          {Math.abs(netBalance) < 0.01 ? (
            <span className="text-xs text-text-muted">All settled</span>
          ) : (
            <>
              <div
                className={cn(
                  "text-xs text-text-muted",
                )}
              >
                {netBalance > 0 ? "you are owed" : "you owe"}
              </div>
              <AmountBadge amount={netBalance} size="md" />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
