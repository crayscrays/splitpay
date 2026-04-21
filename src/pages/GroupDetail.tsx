import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRightLeft, Check, Copy, ExternalLink, Plus, Receipt, Share2, UserPlus, Users, X } from "lucide-react";
import { useSplitPay } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ExpenseCard } from "@/components/ExpenseCard";
import { BalanceCard } from "@/components/BalanceCard";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";

type Tab = "expenses" | "balances" | "activity";

export function GroupDetail() {
  const { groupId = "" } = useParams();
  const sp = useSplitPay();
  const nav = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>("expenses");
  const [showInvite, setShowInvite] = useState(
    () => !!(location.state as any)?.showInvite
  );

  const group = sp.getGroup(groupId);
  const myWallet = sp.profile?.walletAddress ?? "";

  const balances = useMemo(
    () => (group ? sp.computeGroupBalances(group.id) : {}),
    [group, sp]
  );

  if (!group) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Group" back="/" />
        <div className="p-8 text-center text-text-muted">Group not found.</div>
      </div>
    );
  }

  const myNet = balances[myWallet] ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <Header
        title={group.name}
        subtitle={`${group.members.length} member${group.members.length === 1 ? "" : "s"}`}
        back="/"
      />

      {/* Summary header */}
      <section className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2 flex-1">
            {group.members.slice(0, 6).map((m) => (
              <MemberAvatar
                key={m.walletAddress}
                name={m.displayName}
                wallet={m.walletAddress}
                size="sm"
                ring
              />
            ))}
            {group.members.length > 6 && (
              <span className="text-xs text-text-muted ml-2 self-center">
                +{group.members.length - 6} more
              </span>
            )}
          </div>
          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            className="btn btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
            data-testid="button-invite"
          >
            <UserPlus size={13} /> Invite
          </button>
        </div>

        <div className="card p-4">
          <div className="text-xs text-text-muted">Your balance in this group</div>
          <div
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight",
              Math.abs(myNet) < 0.01
                ? "text-text-muted"
                : myNet > 0
                ? "text-positive"
                : "text-negative"
            )}
            data-testid="text-my-balance"
          >
            {Math.abs(myNet) < 0.01
              ? "All settled"
              : myNet > 0
              ? `+${formatCurrency(myNet)}`
              : `-${formatCurrency(-myNet)}`}
          </div>
          {Math.abs(myNet) > 0.01 && (
            <button
              onClick={() => nav(`/group/${group.id}/settle`)}
              className="btn btn-secondary mt-3 px-3 py-2 text-sm w-full"
              data-testid="button-settle-up"
            >
              <ArrowRightLeft size={14} /> Settle up
            </button>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex gap-1 p-1 bg-surface-2 rounded-lg border border-border">
          {(["expenses", "balances", "activity"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                tab === t
                  ? "bg-surface text-text shadow-soft"
                  : "text-text-muted hover:text-text"
              )}
              data-testid={`tab-${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 min-h-0">
        {tab === "expenses" && (
          <ExpensesTab group={group} myWallet={myWallet} />
        )}
        {tab === "balances" && (
          <BalancesTab group={group} myWallet={myWallet} balances={balances} />
        )}
        {tab === "activity" && <ActivityTab group={group} />}
      </div>

      {/* FAB */}
      <Link
        to={`/group/${group.id}/add`}
        className="absolute bottom-4 right-4 h-14 w-14 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent-hover transition-colors z-20"
        aria-label="Add expense"
        data-testid="button-add-expense"
      >
        <Plus size={22} />
      </Link>

      {/* Invite sheet */}
      {showInvite && (
        <InviteSheet groupId={group.id} groupName={group.name} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

function InviteSheet({
  groupId,
  groupName,
  onClose,
}: {
  groupId: string;
  groupName: string;
  onClose: () => void;
}) {
  const sp = useSplitPay();
  const [copied, setCopied] = useState(false);

  const inviteCode = sp.makeInviteCode(groupId);
  const base = window.location.href.split("#")[0];
  const inviteUrl = `${base}#/join/${inviteCode}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: show url */
    }
  };

  const shareToChat = async () => {
    try {
      await sp.shareExpenseToGroup(groupId, {
        id: "invite",
        groupId,
        description: `Join "${groupName}" on SplitPay`,
        amount: 0,
        paidBy: "",
        splitType: "equal",
        splits: [],
        createdAt: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-[480px] bg-surface border-t border-border rounded-t-2xl fade-in">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Invite to {groupName}</h3>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-text-muted">
            Share this link — anyone who opens it will be added as a member.
          </p>

          {/* Link row */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-muted truncate">
              {inviteUrl}
            </div>
            <button
              onClick={copy}
              className={cn(
                "btn flex-shrink-0 px-3 py-2 text-sm transition-colors",
                copied ? "btn-primary" : "btn-secondary"
              )}
              data-testid="button-copy-invite"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Share to 0xChat */}
          <button
            onClick={shareToChat}
            className="btn btn-secondary w-full py-2.5 text-sm"
            data-testid="button-share-invite"
          >
            <Share2 size={14} /> Share to group chat
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpensesTab({
  group,
  myWallet,
}: {
  group: ReturnType<typeof useSplitPay>["groups"][number];
  myWallet: string;
}) {
  if (group.expenses.length === 0) {
    return (
      <div className="card p-8 text-center fade-in">
        <div className="inline-flex h-12 w-12 rounded-full bg-surface-2 items-center justify-center mb-3">
          <Receipt size={20} className="text-text-muted" />
        </div>
        <div className="text-sm font-medium text-text">No expenses yet</div>
        <div className="text-xs text-text-muted mt-1">
          Tap + to add the first expense
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 fade-in">
      {group.expenses.map((e) => (
        <ExpenseCard key={e.id} expense={e} group={group} myWallet={myWallet} />
      ))}
    </div>
  );
}

function BalancesTab({
  group,
  myWallet,
  balances,
}: {
  group: ReturnType<typeof useSplitPay>["groups"][number];
  myWallet: string;
  balances: Record<string, number>;
}) {
  const nav = useNavigate();
  const anyOwing = Object.entries(balances).some(
    ([w, v]) => w === myWallet && v < -0.01
  );

  return (
    <div className="space-y-2 fade-in">
      {anyOwing && (
        <button
          onClick={() => nav(`/group/${group.id}/settle`)}
          className="btn btn-primary w-full py-2.5 text-sm"
          data-testid="button-settle-all"
        >
          <ArrowRightLeft size={14} /> Settle all my debts
        </button>
      )}
      {group.members.map((m) => {
        const net = balances[m.walletAddress] ?? 0;
        const canSettle =
          m.walletAddress !== myWallet &&
          (balances[myWallet] ?? 0) < -0.01 &&
          net > 0.01;
        return (
          <BalanceCard
            key={m.walletAddress}
            member={m}
            netAmount={net}
            myWallet={myWallet}
            canSettle={canSettle}
            onSettle={() => nav(`/group/${group.id}/settle`)}
          />
        );
      })}
    </div>
  );
}

function ActivityTab({
  group,
}: {
  group: ReturnType<typeof useSplitPay>["groups"][number];
}) {
  if (group.activity.length === 0) {
    return (
      <div className="card p-8 text-center fade-in">
        <div className="inline-flex h-12 w-12 rounded-full bg-surface-2 items-center justify-center mb-3">
          <Users size={20} className="text-text-muted" />
        </div>
        <div className="text-sm font-medium text-text">No activity yet</div>
      </div>
    );
  }
  return (
    <div className="space-y-2 fade-in">
      {group.activity.map((a) => {
        const actor = group.members.find((m) => m.walletAddress === a.actor);
        const Icon =
          a.type === "payment_settled"
            ? ArrowRightLeft
            : a.type === "group_joined"
            ? UserPlus
            : Receipt;
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors"
            data-testid={`activity-${a.id}`}
          >
            <div className="h-8 w-8 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-text-muted" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-text">
                <span className="font-medium">
                  {actor ? actor.displayName : "Someone"}
                </span>{" "}
                <span className="text-text-muted">{a.message}</span>
              </div>
              <div className="text-xs text-text-dim mt-0.5">
                {formatRelativeTime(a.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
