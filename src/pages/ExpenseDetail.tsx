import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ExternalLink, Share2, Trash2 } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export function ExpenseDetail() {
  const { groupId = "", expenseId = "" } = useParams();
  const sp = useSplitPay();
  const nav = useNavigate();

  const group = sp.getGroup(groupId);
  const expense = group?.expenses.find((e) => e.id === expenseId);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  if (!group || !expense) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Expense" back />
        <div className="p-8 text-center text-text-muted">Expense not found.</div>
      </div>
    );
  }

  const payer = group.members.find((m) => m.walletAddress === expense.paidBy);
  const perSplitByWallet = new Map(expense.splits.map((s) => [s.wallet, s]));
  const myWallet = sp.profile?.walletAddress ?? "";

  const handleShare = async () => {
    setSharing(true);
    try {
      await sp.shareExpenseToGroup(group.id, expense);
      setShared(true);
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    if (!confirm("Delete this expense?")) return;
    sp.deleteExpense(group.id, expense.id);
    nav(`/group/${group.id}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Expense" back={`/group/${group.id}`} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Hero */}
        <div className="card p-5">
          <div className="text-xs text-text-muted">Expense</div>
          <h2 className="mt-1 text-xl font-semibold text-text" data-testid="text-description">
            {expense.description}
          </h2>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-semibold tracking-tight" data-testid="text-amount">
              {formatCurrency(expense.amount)}
            </div>
            <div className="text-sm text-text-muted">USDC</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
            {payer && (
              <MemberAvatar
                name={payer.displayName}
                wallet={payer.walletAddress}
                size="xs"
              />
            )}
            <span>
              <span className="text-text">
                {payer?.walletAddress === myWallet ? "You" : payer?.displayName}
              </span>{" "}
              paid · {formatDate(expense.createdAt)}
            </span>
          </div>
        </div>

        {/* Splits */}
        <div>
          <div className="label mb-2 px-1">Breakdown</div>
          <div className="card divide-y divide-border overflow-hidden">
            {group.members.map((m) => {
              const s = perSplitByWallet.get(m.walletAddress);
              const isPayer = m.walletAddress === expense.paidBy;
              return (
                <div
                  key={m.walletAddress}
                  className="flex items-center gap-3 p-3"
                  data-testid={`split-row-${m.walletAddress}`}
                >
                  <MemberAvatar name={m.displayName} wallet={m.walletAddress} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {m.walletAddress === myWallet ? "You" : m.displayName}
                    </div>
                    {isPayer ? (
                      <div className="text-xs text-accent">paid this</div>
                    ) : !s ? (
                      <div className="text-xs text-text-dim">not included</div>
                    ) : s.settled ? (
                      <div className="text-xs text-text-muted inline-flex items-center gap-1">
                        <Check size={10} /> settled
                        {s.txHash && (
                          <a
                            href={`https://basescan.org/tx/${s.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 hover:text-accent inline-flex items-center gap-0.5"
                          >
                            tx <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted">owes</div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isPayer || !s
                        ? "text-text-muted"
                        : s.settled
                        ? "text-text-muted line-through"
                        : "text-text"
                    )}
                  >
                    {s ? formatCurrency(s.amount) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={sharing || shared}
            className="btn btn-secondary flex-1 py-2.5 text-sm"
            data-testid="button-share"
          >
            {shared ? (
              <>
                <Check size={14} /> Shared
              </>
            ) : (
              <>
                <Share2 size={14} /> {sharing ? "Sharing…" : "Share to group"}
              </>
            )}
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-secondary px-3 py-2.5 text-sm text-negative hover:border-negative/50"
            data-testid="button-delete"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
