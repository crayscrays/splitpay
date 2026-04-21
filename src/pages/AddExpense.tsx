import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, DollarSign, Users as UsersIcon } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { MemberAvatar } from "@/components/MemberAvatar";
import { MemberPicker } from "@/components/MemberPicker";
import { cn, splitEvenly } from "@/lib/utils";

export function AddExpense() {
  const { groupId = "", expenseId } = useParams();
  const sp = useSplitPay();
  const nav = useNavigate();
  const group = sp.getGroup(groupId);
  const myWallet = sp.profile?.walletAddress ?? "";

  const isEditing = !!expenseId;
  const existingExpense = isEditing ? group?.expenses.find((e) => e.id === expenseId) : undefined;

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [paidBy, setPaidBy] = useState(myWallet);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [shareToChat, setShareToChat] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

  // Initialize form — for edit mode pre-fill from existing expense
  useEffect(() => {
    if (!group || initialized.current) return;
    initialized.current = true;
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmountStr(existingExpense.amount.toString());
      setPaidBy(existingExpense.paidBy);
      setSplitType(existingExpense.splitType);
      setSelected(new Set(existingExpense.splits.map((s) => s.wallet)));
      const amounts: Record<string, string> = {};
      existingExpense.splits.forEach((s) => {
        amounts[s.wallet] = s.amount.toString();
      });
      setCustomAmounts(amounts);
    } else {
      setSelected(new Set(group.members.map((m) => m.walletAddress)));
    }
  }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = Number(amountStr) || 0;
  const selectedMembers = group ? group.members.filter((m) => selected.has(m.walletAddress)) : [];

  const equalSplits = useMemo(
    () => (amount > 0 ? splitEvenly(amount, selectedMembers.length) : []),
    [amount, selectedMembers.length]
  );

  const customTotal = useMemo(() => {
    return Object.values(customAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
  }, [customAmounts]);

  if (!group) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title={isEditing ? "Edit expense" : "Add expense"} back />
        <div className="p-8 text-center text-text-muted">Group not found.</div>
      </div>
    );
  }

  if (isEditing && !existingExpense) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Edit expense" back={`/group/${groupId}`} />
        <div className="p-8 text-center text-text-muted">Expense not found.</div>
      </div>
    );
  }

  const toggleMember = (wallet: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wallet)) next.delete(wallet);
      else next.add(wallet);
      return next;
    });
  };

  const canSubmit =
    description.trim().length > 0 &&
    amount > 0 &&
    selected.size > 0 &&
    (splitType === "equal" || Math.abs(customTotal - amount) < 0.01);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const splits =
        splitType === "equal"
          ? selectedMembers.map((m, i) => ({
              wallet: m.walletAddress,
              amount: equalSplits[i],
              settled: false,
            }))
          : selectedMembers.map((m) => ({
              wallet: m.walletAddress,
              amount: Number(customAmounts[m.walletAddress]) || 0,
              settled: false,
            }));

      if (isEditing && existingExpense) {
        const hasSettled = existingExpense.splits.some((s) => s.settled);
        if (
          hasSettled &&
          !confirm("Editing this expense will reset all settlement records. Continue?")
        ) {
          setSubmitting(false);
          return;
        }
        sp.editExpense({
          ...existingExpense,
          description: description.trim(),
          amount,
          paidBy,
          splitType,
          splits,
        });
        nav(`/group/${group.id}/expense/${existingExpense.id}`);
      } else {
        const expense = sp.addExpense({
          groupId: group.id,
          description: description.trim(),
          amount,
          paidBy,
          splitType,
          splits,
        });
        if (shareToChat) {
          try {
            await sp.shareExpenseToGroup(group.id, expense);
          } catch {
            /* ignore */
          }
        }
        nav(`/group/${group.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title={isEditing ? "Edit expense" : "Add expense"}
        subtitle={group.name}
        back={isEditing ? `/group/${group.id}/expense/${expenseId}` : `/group/${group.id}`}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Description */}
        <div>
          <label className="label block mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner at Ippudo"
            className="input"
            data-testid="input-description"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="label block mb-1.5">Amount (USDC)</label>
          <div className="relative">
            <DollarSign
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="number"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="input pl-9 text-lg font-semibold"
              data-testid="input-amount"
            />
          </div>
        </div>

        {/* Paid by */}
        <div>
          <label className="label block mb-1.5">Paid by</label>
          <div className="relative">
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="input appearance-none pr-8"
              data-testid="select-paidby"
            >
              {group.members.map((m) => (
                <option key={m.walletAddress} value={m.walletAddress}>
                  {m.walletAddress === myWallet ? "You" : m.displayName}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
              width="12"
              height="12"
              viewBox="0 0 12 12"
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="label block mb-1.5">Split type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["equal", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors",
                  splitType === t
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-surface-2 border-border text-text-muted hover:text-text"
                )}
                data-testid={`split-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Members / custom amounts */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label flex items-center gap-1.5">
              <UsersIcon size={12} /> Split among
            </label>
            {splitType === "equal" && selectedMembers.length > 0 && amount > 0 && (
              <span className="text-xs text-text-muted">
                ~${(amount / selectedMembers.length).toFixed(2)} each
              </span>
            )}
          </div>

          {splitType === "equal" ? (
            <MemberPicker
              members={group.members}
              selected={selected}
              onToggle={toggleMember}
              myWallet={myWallet}
            />
          ) : (
            <div className="space-y-2">
              {group.members.map((m) => (
                <div
                  key={m.walletAddress}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-surface-2"
                >
                  <MemberAvatar name={m.displayName} wallet={m.walletAddress} size="sm" />
                  <div className="min-w-0 flex-1 text-sm font-medium truncate">
                    {m.walletAddress === myWallet ? "You" : m.displayName}
                  </div>
                  <div className="relative w-28">
                    <DollarSign
                      size={12}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={customAmounts[m.walletAddress] ?? ""}
                      onChange={(e) =>
                        setCustomAmounts((p) => ({
                          ...p,
                          [m.walletAddress]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="input pl-6 py-1.5 text-sm"
                      data-testid={`custom-${m.walletAddress}`}
                    />
                  </div>
                </div>
              ))}
              <div
                className={cn(
                  "flex justify-between px-1 text-xs",
                  Math.abs(customTotal - amount) < 0.01
                    ? "text-text-muted"
                    : "text-negative"
                )}
              >
                <span>Total assigned</span>
                <span>
                  ${customTotal.toFixed(2)} / ${amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Share toggle — only shown when adding new expenses */}
        {!isEditing && (
          <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-2 cursor-pointer">
            <div
              className={cn(
                "h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0",
                shareToChat
                  ? "bg-accent border-accent text-white"
                  : "border-border-strong"
              )}
            >
              {shareToChat && <Check size={12} strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={shareToChat}
              onChange={(e) => setShareToChat(e.target.checked)}
              data-testid="toggle-share"
            />
            <div className="text-sm">
              <div className="font-medium text-text">Share to group chat</div>
              <div className="text-xs text-text-muted">
                Post as a card in {group.name}
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Submit */}
      <div className="shrink-0 bg-bg/95 backdrop-blur border-t border-border px-4 py-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="btn btn-primary w-full py-3 text-sm font-semibold"
          data-testid="button-submit"
        >
          {submitting
            ? isEditing
              ? "Saving…"
              : "Adding…"
            : isEditing
            ? "Save changes"
            : "Add expense"}
        </button>
      </div>
    </div>
  );
}
