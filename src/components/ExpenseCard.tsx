import { Link } from "react-router-dom";
import type { Expense, GroupData } from "@/lib/splitpay-context";
import { MemberAvatar } from "./MemberAvatar";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Check, Receipt } from "lucide-react";

interface Props {
  expense: Expense;
  group: GroupData;
  myWallet: string;
}

export function ExpenseCard({ expense, group, myWallet }: Props) {
  const payer = group.members.find((m) => m.walletAddress === expense.paidBy);
  const mySplit = expense.splits.find((s) => s.wallet === myWallet);
  const paidByMe = expense.paidBy === myWallet;

  // My impact: if I paid, others owe me their unsettled shares; if I didn't, I owe my share (if unsettled)
  let myImpact = 0;
  if (paidByMe) {
    myImpact = expense.splits
      .filter((s) => s.wallet !== myWallet && !s.settled)
      .reduce((sum, s) => sum + s.amount, 0);
  } else if (mySplit && !mySplit.settled) {
    myImpact = -mySplit.amount;
  }

  const allSettled = expense.splits.every((s) => s.settled || s.wallet === expense.paidBy);
  const myShareSettled = mySplit?.settled && !paidByMe;

  return (
    <Link
      to={`/group/${expense.groupId}/expense/${expense.id}`}
      className="card p-4 flex items-start gap-3 hover:border-border-strong transition-colors block"
      data-testid={`link-expense-${expense.id}`}
    >
      <div className="h-10 w-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
        <Receipt size={18} className="text-text-muted" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-text truncate">{expense.description}</h4>
            <div className="mt-0.5 text-xs text-text-muted flex items-center gap-1.5">
              {payer && (
                <>
                  <MemberAvatar
                    name={payer.displayName}
                    wallet={payer.walletAddress}
                    size="xs"
                  />
                  <span className="truncate">
                    {paidByMe ? "You" : payer.displayName} paid
                  </span>
                  <span>·</span>
                </>
              )}
              <span>{formatRelativeTime(expense.createdAt)}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-semibold text-text text-sm">
              {formatCurrency(expense.amount)}
            </div>
            {Math.abs(myImpact) > 0.009 ? (
              <div
                className={
                  "text-xs mt-0.5 " +
                  (myImpact > 0 ? "text-positive" : "text-negative")
                }
              >
                {myImpact > 0 ? "+" : "-"}
                {formatCurrency(Math.abs(myImpact))}
              </div>
            ) : myShareSettled ? (
              <div className="text-xs text-text-muted mt-0.5 inline-flex items-center gap-1">
                <Check size={10} /> you paid
              </div>
            ) : allSettled ? (
              <div className="text-xs text-text-muted mt-0.5 inline-flex items-center gap-1">
                <Check size={10} /> settled
              </div>
            ) : (
              <div className="text-xs text-text-muted mt-0.5">not involved</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
