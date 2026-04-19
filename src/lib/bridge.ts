import { createAppBridge, AppBridge } from "@0xchat/app-sdk";
import type {
  UserProfile,
  GroupSummary,
  GroupMember,
  Contact,
  AppCard,
} from "@0xchat/app-sdk";

// ---------- Mock data (for dev outside 0xChat) ----------

export const MOCK_PROFILE: UserProfile = {
  walletAddress: "0x7fA42b1C38bD4e7d9111A4AC9a8a9C1b8E3C6aB1",
  displayName: "You",
  avatar: "",
};

export const MOCK_CONTACTS: Contact[] = [
  { walletAddress: "0xAA1c3F9a2bD4e00112233445566778899aABBccD", displayName: "Alice", avatar: "" },
  { walletAddress: "0xBB2d4F8b3cD5e11223344556677889900BBccDDe", displayName: "Bob", avatar: "" },
  { walletAddress: "0xCC3e5F7c4dE6f2233445566778899AA11CCddEEf", displayName: "Charlie", avatar: "" },
  { walletAddress: "0xDD4f6F6d5fE7a3344556677889900BB22DDeeFFa", displayName: "Dana", avatar: "" },
];

export const MOCK_GROUPS: GroupSummary[] = [
  { id: "group-1", name: "Dinner Squad", avatar: "", memberCount: 4 },
  { id: "group-2", name: "Bali Trip", avatar: "", memberCount: 3 },
  { id: "group-3", name: "Apartment 4B", avatar: "", memberCount: 2 },
];

export const MOCK_GROUP_MEMBERS: Record<string, GroupMember[]> = {
  "group-1": [
    { walletAddress: MOCK_PROFILE.walletAddress, displayName: "You", avatar: "", roles: ["admin"] },
    { walletAddress: MOCK_CONTACTS[0].walletAddress, displayName: "Alice", avatar: "", roles: [] },
    { walletAddress: MOCK_CONTACTS[1].walletAddress, displayName: "Bob", avatar: "", roles: [] },
    { walletAddress: MOCK_CONTACTS[2].walletAddress, displayName: "Charlie", avatar: "", roles: [] },
  ],
  "group-2": [
    { walletAddress: MOCK_PROFILE.walletAddress, displayName: "You", avatar: "", roles: [] },
    { walletAddress: MOCK_CONTACTS[0].walletAddress, displayName: "Alice", avatar: "", roles: ["admin"] },
    { walletAddress: MOCK_CONTACTS[3].walletAddress, displayName: "Dana", avatar: "", roles: [] },
  ],
  "group-3": [
    { walletAddress: MOCK_PROFILE.walletAddress, displayName: "You", avatar: "", roles: [] },
    { walletAddress: MOCK_CONTACTS[1].walletAddress, displayName: "Bob", avatar: "", roles: [] },
  ],
};

// ---------- Bridge wrapper with fallback ----------

// Detect if we're running inside an iframe with a parent that can respond.
// If not, calls will time out — we short-circuit with mocks after a short probe.
const IN_IFRAME = typeof window !== "undefined" && window.parent !== window;

class BridgeClient {
  private bridge: AppBridge | null = null;
  private probed = false;
  private live = false; // set true once any call succeeds

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.bridge = createAppBridge({ appId: "splitpay", timeout: 2500 });
      } catch {
        this.bridge = null;
      }
    }
  }

  get isLive(): boolean {
    return this.live;
  }

  get mode(): "live" | "mock" {
    return this.live ? "live" : "mock";
  }

  private async call<T>(fn: () => Promise<T>, fallback: T | (() => T | Promise<T>)): Promise<T> {
    if (!this.bridge || !IN_IFRAME) {
      return typeof fallback === "function" ? (fallback as any)() : fallback;
    }
    try {
      const res = await fn();
      this.live = true;
      this.probed = true;
      return res;
    } catch (err) {
      this.probed = true;
      return typeof fallback === "function" ? (fallback as any)() : fallback;
    }
  }

  // Wallet
  getAddress = () =>
    this.call(() => this.bridge!.wallet.getAddress(), MOCK_PROFILE.walletAddress);

  getBalance = (token = "USDC") =>
    this.call(() => this.bridge!.wallet.getBalance({ token }), "127.48");

  sendTransaction = (params: { to: string; token: string; amount: string }) =>
    this.call<string>(
      () => this.bridge!.wallet.sendTransaction(params),
      // Mock tx hash — deterministic-looking
      () =>
        "0x" +
        Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
    );

  // User
  getProfile = () => this.call(() => this.bridge!.user.getProfile(), MOCK_PROFILE);

  // Social
  listGroups = () => this.call(() => this.bridge!.groups.list(), MOCK_GROUPS);

  getGroupMembers = (groupId: string) =>
    this.call(
      () => this.bridge!.groups.getMembers(groupId),
      () => MOCK_GROUP_MEMBERS[groupId] ?? []
    );

  listContacts = () => this.call(() => this.bridge!.contacts.list(), MOCK_CONTACTS);

  // Chat
  shareCardToGroup = (params: { groupId: string; channelId?: string; card: AppCard }) =>
    this.call(
      () =>
        this.bridge!.chat.shareCardToGroup({
          groupId: params.groupId,
          channelId: params.channelId ?? params.groupId,
          card: params.card,
        }),
      undefined as unknown as void
    );

  // Navigation
  openGroup = (groupId: string) => {
    try {
      this.bridge?.navigation.openGroup(groupId);
    } catch {
      /* ignore */
    }
  };
}

export const bridge = new BridgeClient();
