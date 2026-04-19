import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { GroupMember, GroupSummary, UserProfile } from "@0xchat/app-sdk";
import { bridge, MOCK_GROUP_MEMBERS, MOCK_GROUPS, MOCK_PROFILE } from "./bridge";
import { computeNetBalances, simplifyDebts, uid, type DebtEdge } from "./utils";

// ---------- Types ----------

export interface Split {
  wallet: string;
  amount: number;
  settled: boolean;
  txHash?: string;
  settledAt?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: "equal" | "custom";
  splits: Split[];
  createdAt: string; // ISO
}

export interface Activity {
  id: string;
  groupId: string;
  type: "expense_added" | "payment_settled" | "group_joined";
  message: string;
  actor: string; // wallet
  createdAt: string;
  meta?: Record<string, any>;
}

export interface GroupData {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  members: GroupMember[];
  expenses: Expense[];
  activity: Activity[];
}

// ---------- State ----------

interface State {
  profile: UserProfile | null;
  balance: string; // USDC
  groups: GroupData[];
  availableGroups: GroupSummary[]; // groups from SDK not yet added
  loading: boolean;
  mode: "live" | "mock" | "loading";
}

type Action =
  | { type: "INIT"; payload: Partial<State> }
  | { type: "SET_GROUPS"; groups: GroupData[] }
  | { type: "SET_AVAILABLE"; groups: GroupSummary[] }
  | { type: "ADD_GROUP"; group: GroupData }
  | { type: "ADD_EXPENSE"; groupId: string; expense: Expense; activity: Activity }
  | { type: "DELETE_EXPENSE"; groupId: string; expenseId: string; activity?: Activity }
  | {
      type: "SETTLE_SPLIT";
      groupId: string;
      expenseId: string;
      wallet: string;
      txHash: string;
      activity: Activity;
    }
  | { type: "SET_BALANCE"; balance: string }
  | { type: "SET_MODE"; mode: State["mode"] };

const initialState: State = {
  profile: null,
  balance: "0",
  groups: [],
  availableGroups: [],
  loading: true,
  mode: "loading",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { ...state, ...action.payload, loading: false };
    case "SET_GROUPS":
      return { ...state, groups: action.groups };
    case "SET_AVAILABLE":
      return { ...state, availableGroups: action.groups };
    case "ADD_GROUP":
      return {
        ...state,
        groups: [...state.groups, action.group],
        availableGroups: state.availableGroups.filter((g) => g.id !== action.group.id),
      };
    case "ADD_EXPENSE":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? {
                ...g,
                expenses: [action.expense, ...g.expenses],
                activity: [action.activity, ...g.activity],
              }
            : g
        ),
      };
    case "DELETE_EXPENSE":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? {
                ...g,
                expenses: g.expenses.filter((e) => e.id !== action.expenseId),
                activity: action.activity ? [action.activity, ...g.activity] : g.activity,
              }
            : g
        ),
      };
    case "SETTLE_SPLIT":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? {
                ...g,
                expenses: g.expenses.map((e) =>
                  e.id === action.expenseId
                    ? {
                        ...e,
                        splits: e.splits.map((s) =>
                          s.wallet === action.wallet
                            ? {
                                ...s,
                                settled: true,
                                txHash: action.txHash,
                                settledAt: new Date().toISOString(),
                              }
                            : s
                        ),
                      }
                    : e
                ),
                activity: [action.activity, ...g.activity],
              }
            : g
        ),
      };
    case "SET_BALANCE":
      return { ...state, balance: action.balance };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    default:
      return state;
  }
}

// ---------- Seed data ----------

function seedGroups(profileWallet: string): GroupData[] {
  // Use mock groups + members for demo so the app looks populated.
  const groups: GroupData[] = MOCK_GROUPS.slice(0, 2).map((g) => {
    const members = MOCK_GROUP_MEMBERS[g.id] ?? [];
    return {
      id: g.id,
      name: g.name,
      avatar: g.avatar,
      memberCount: g.memberCount,
      members: members.map((m) =>
        m.displayName === "You" ? { ...m, walletAddress: profileWallet } : m
      ),
      expenses: [],
      activity: [],
    };
  });

  // Dinner Squad — a few expenses
  const dinner = groups[0];
  if (dinner) {
    const you = profileWallet;
    const alice = dinner.members[1]?.walletAddress ?? "";
    const bob = dinner.members[2]?.walletAddress ?? "";
    const charlie = dinner.members[3]?.walletAddress ?? "";
    const allWallets = [you, alice, bob, charlie].filter(Boolean);

    const mk = (
      desc: string,
      amount: number,
      paidBy: string,
      daysAgo: number,
      among: string[] = allWallets
    ): Expense => {
      const per = Math.round((amount / among.length) * 100) / 100;
      const created = new Date(Date.now() - daysAgo * 86400_000).toISOString();
      return {
        id: uid("exp"),
        groupId: dinner.id,
        description: desc,
        amount,
        paidBy,
        splitType: "equal",
        splits: among.map((w, i) => ({
          wallet: w,
          amount:
            i === among.length - 1
              ? Math.round((amount - per * (among.length - 1)) * 100) / 100
              : per,
          settled: false,
        })),
        createdAt: created,
      };
    };

    dinner.expenses = [
      mk("Ramen at Ippudo", 84.5, you, 0),
      mk("Sake tasting", 46, alice, 1),
      mk("Karaoke room", 120, bob, 3),
      mk("Taxi home", 32.4, you, 3, [you, alice, bob]),
    ];
    dinner.activity = dinner.expenses.map((e) => ({
      id: uid("act"),
      groupId: dinner.id,
      type: "expense_added",
      message: `${e.description} · $${e.amount.toFixed(2)}`,
      actor: e.paidBy,
      createdAt: e.createdAt,
    }));
  }

  // Bali Trip — 1 expense
  const trip = groups[1];
  if (trip) {
    const you = profileWallet;
    const alice = trip.members[1]?.walletAddress ?? "";
    const dana = trip.members[2]?.walletAddress ?? "";
    const allWallets = [you, alice, dana];
    const amount = 240;
    const per = 80;
    const expense: Expense = {
      id: uid("exp"),
      groupId: trip.id,
      description: "Airbnb — 3 nights",
      amount,
      paidBy: alice,
      splitType: "equal",
      splits: allWallets.map((w) => ({ wallet: w, amount: per, settled: false })),
      createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
    };
    trip.expenses = [expense];
    trip.activity = [
      {
        id: uid("act"),
        groupId: trip.id,
        type: "expense_added",
        message: `${expense.description} · $${amount.toFixed(2)}`,
        actor: alice,
        createdAt: expense.createdAt,
      },
    ];
  }

  return groups;
}

// ---------- Context ----------

interface SplitPayContextValue extends State {
  totalOwed: number;
  totalOwing: number;
  addExpense(input: Omit<Expense, "id" | "createdAt">): Expense;
  deleteExpense(groupId: string, expenseId: string): void;
  settleSplit(args: {
    groupId: string;
    expenseId: string;
    wallet: string;
    amount: number;
    toWallet: string;
  }): Promise<string>;
  addGroup(group: GroupSummary): Promise<void>;
  refreshAvailableGroups(): Promise<void>;
  shareExpenseToGroup(groupId: string, expense: Expense): Promise<void>;
  getGroup(id: string): GroupData | undefined;
  computeGroupBalances(groupId: string): Record<string, number>;
  computeGroupDebts(groupId: string): DebtEdge[];
}

const Ctx = createContext<SplitPayContextValue | null>(null);

export function SplitPayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [booted, setBooted] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profile, balance] = await Promise.all([
        bridge.getProfile(),
        bridge.getBalance("USDC"),
      ]);
      if (cancelled) return;
      const seededGroups = seedGroups(profile.walletAddress);
      dispatch({
        type: "INIT",
        payload: {
          profile,
          balance,
          groups: seededGroups,
          mode: bridge.isLive ? "live" : "mock",
        },
      });
      setBooted(true);
      // Fetch available groups in background
      try {
        const available = await bridge.listGroups();
        if (cancelled) return;
        const added = new Set(seededGroups.map((g) => g.id));
        dispatch({
          type: "SET_AVAILABLE",
          groups: available.filter((g) => !added.has(g.id)),
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addExpense: SplitPayContextValue["addExpense"] = useCallback((input) => {
    const expense: Expense = {
      ...input,
      id: uid("exp"),
      createdAt: new Date().toISOString(),
    };
    const activity: Activity = {
      id: uid("act"),
      groupId: expense.groupId,
      type: "expense_added",
      message: `${expense.description} · $${expense.amount.toFixed(2)}`,
      actor: expense.paidBy,
      createdAt: expense.createdAt,
    };
    dispatch({ type: "ADD_EXPENSE", groupId: expense.groupId, expense, activity });
    return expense;
  }, []);

  const deleteExpense: SplitPayContextValue["deleteExpense"] = useCallback(
    (groupId, expenseId) => {
      const activity: Activity = {
        id: uid("act"),
        groupId,
        type: "expense_added",
        message: "Expense removed",
        actor: "",
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "DELETE_EXPENSE", groupId, expenseId, activity });
    },
    []
  );

  const settleSplit: SplitPayContextValue["settleSplit"] = useCallback(
    async ({ groupId, expenseId, wallet, amount, toWallet }) => {
      const txHash = await bridge.sendTransaction({
        to: toWallet,
        token: "USDC",
        amount: amount.toFixed(2),
      });
      const activity: Activity = {
        id: uid("act"),
        groupId,
        type: "payment_settled",
        message: `Paid $${amount.toFixed(2)} USDC`,
        actor: wallet,
        createdAt: new Date().toISOString(),
        meta: { txHash, toWallet, amount },
      };
      dispatch({
        type: "SETTLE_SPLIT",
        groupId,
        expenseId,
        wallet,
        txHash,
        activity,
      });
      return txHash;
    },
    []
  );

  const addGroup: SplitPayContextValue["addGroup"] = useCallback(async (summary) => {
    const members = await bridge.getGroupMembers(summary.id);
    const newGroup: GroupData = {
      id: summary.id,
      name: summary.name,
      avatar: summary.avatar,
      memberCount: summary.memberCount || members.length,
      members,
      expenses: [],
      activity: [
        {
          id: uid("act"),
          groupId: summary.id,
          type: "group_joined",
          message: "Group linked to SplitPay",
          actor: "",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    dispatch({ type: "ADD_GROUP", group: newGroup });
  }, []);

  const refreshAvailableGroups: SplitPayContextValue["refreshAvailableGroups"] = useCallback(
    async () => {
      const available = await bridge.listGroups();
      const added = new Set(state.groups.map((g) => g.id));
      dispatch({
        type: "SET_AVAILABLE",
        groups: available.filter((g) => !added.has(g.id)),
      });
    },
    [state.groups]
  );

  const shareExpenseToGroup: SplitPayContextValue["shareExpenseToGroup"] = useCallback(
    async (groupId, expense) => {
      await bridge.shareCardToGroup({
        groupId,
        channelId: groupId,
        card: {
          title: expense.description,
          subtitle: `$${expense.amount.toFixed(2)} · split ${expense.splitType}`,
          fields: [
            { label: "Amount", value: `$${expense.amount.toFixed(2)} USDC` },
            { label: "Split", value: `${expense.splits.length} people` },
          ],
          action: { label: "Open in SplitPay" },
        },
      });
    },
    []
  );

  const getGroup: SplitPayContextValue["getGroup"] = useCallback(
    (id) => state.groups.find((g) => g.id === id),
    [state.groups]
  );

  const computeGroupBalances: SplitPayContextValue["computeGroupBalances"] = useCallback(
    (groupId) => {
      const g = state.groups.find((x) => x.id === groupId);
      if (!g) return {};
      return computeNetBalances({ expenses: g.expenses });
    },
    [state.groups]
  );

  const computeGroupDebts: SplitPayContextValue["computeGroupDebts"] = useCallback(
    (groupId) => simplifyDebts(computeGroupBalances(groupId)),
    [computeGroupBalances]
  );

  // Aggregate owed/owing across all groups for current user
  const { totalOwed, totalOwing } = useMemo(() => {
    const me = state.profile?.walletAddress;
    if (!me) return { totalOwed: 0, totalOwing: 0 };
    let owed = 0;
    let owing = 0;
    for (const g of state.groups) {
      const bal = computeNetBalances({ expenses: g.expenses });
      const my = bal[me] ?? 0;
      if (my > 0) owed += my;
      else if (my < 0) owing += -my;
    }
    return {
      totalOwed: Math.round(owed * 100) / 100,
      totalOwing: Math.round(owing * 100) / 100,
    };
  }, [state.groups, state.profile?.walletAddress]);

  const value: SplitPayContextValue = {
    ...state,
    totalOwed,
    totalOwing,
    addExpense,
    deleteExpense,
    settleSplit,
    addGroup,
    refreshAvailableGroups,
    shareExpenseToGroup,
    getGroup,
    computeGroupBalances,
    computeGroupDebts,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSplitPay(): SplitPayContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSplitPay must be used within SplitPayProvider");
  return ctx;
}
