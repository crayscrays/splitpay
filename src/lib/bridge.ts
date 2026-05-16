import { createAppBridge, type AppBridge } from "@bevo/app-sdk";
import type { UserProfile, GroupSummary, GroupMember, Contact, AppCard } from "@bevo/app-sdk";

// USDC on Base Sepolia
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ---------- Social mock fallbacks (contacts only — no pre-populated groups) ----------

export const MOCK_CONTACTS: Contact[] = [
  { walletAddress: "0xAA1c3F9a2bD4e00112233445566778899aABBccD", displayName: "Alice", avatar: "" },
  { walletAddress: "0xBB2d4F8b3cD5e11223344556677889900BBccDDe", displayName: "Bob", avatar: "" },
  { walletAddress: "0xCC3e5F7c4dE6f2233445566778899AA11CCddEEf", displayName: "Charlie", avatar: "" },
  { walletAddress: "0xDD4f6F6d5fE7a3344556677889900BB22DDeeFFa", displayName: "Dana", avatar: "" },
];

// ---------- Bridge client ----------

const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: USDC_BASE_SEPOLIA,
};

class BridgeClient {
  private sdkBridge: AppBridge | null = null;
  private txBridge: AppBridge | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        // Short timeout for profile/balance calls — fails fast when not in 0xChat
        this.sdkBridge = createAppBridge({ appId: "splitpay", timeout: 2500 });
        // Long timeout for transactions — user needs time to approve the signing prompt
        this.txBridge = createAppBridge({ appId: "splitpay", timeout: 60000 });
      } catch {
        this.sdkBridge = null;
        this.txBridge = null;
      }
    }
  }

  // ---- Profile ----

  async getProfileOrNull(): Promise<UserProfile | null> {
    if (!this.sdkBridge) return null;
    try {
      return await this.sdkBridge.user.getProfile();
    } catch {
      return null;
    }
  }

  // ---- Wallet ----

  async getBalance(token = "USDC"): Promise<string> {
    if (!this.sdkBridge) return "0.00";
    try {
      return await this.sdkBridge.wallet.getBalance({ token });
    } catch {
      return "0.00";
    }
  }

  async sendTransaction(params: { to: string; token: string; amount: string }): Promise<string> {
    const bridge = this.txBridge ?? this.sdkBridge;
    if (!bridge) throw new Error("Not connected to 0xChat.");
    // Resolve token symbol to contract address if needed
    const token = TOKEN_ADDRESSES[params.token] ?? params.token;
    return bridge.wallet.sendTransaction({ ...params, token });
  }

  // ---- Social (falls back gracefully when not in 0xChat) ----

  private async call<T>(fn: () => Promise<T>, fallback: T | (() => T | Promise<T>)): Promise<T> {
    if (!this.sdkBridge) {
      return typeof fallback === "function" ? (fallback as any)() : fallback;
    }
    try {
      return await fn();
    } catch {
      return typeof fallback === "function" ? (fallback as any)() : fallback;
    }
  }

  listGroups = (): Promise<GroupSummary[]> =>
    this.call(() => this.sdkBridge!.groups.list(), []);

  getGroupMembers = (groupId: string): Promise<GroupMember[]> =>
    this.call(() => this.sdkBridge!.groups.getMembers(groupId), []);

  listContacts = (): Promise<Contact[]> =>
    this.call(() => this.sdkBridge!.contacts.list(), MOCK_CONTACTS);

  async resolveContact(walletAddress: string): Promise<Contact | null> {
    if (!this.sdkBridge) return null;
    try {
      const contacts = await this.sdkBridge.contacts.list();
      return contacts.find((c) => c.walletAddress.toLowerCase() === walletAddress.toLowerCase()) ?? null;
    } catch {
      return null;
    }
  }

  shareCardToGroup = (params: { groupId: string; channelId?: string; card: AppCard }): Promise<void> =>
    this.call(
      () => this.sdkBridge!.chat.shareCardToGroup({
        groupId: params.groupId,
        channelId: params.channelId ?? params.groupId,
        card: params.card,
      }),
      undefined as unknown as void
    );

  openGroup = (groupId: string): void => {
    try { this.sdkBridge?.navigation.openGroup(groupId); } catch {}
  };
}

export const bridge = new BridgeClient();
