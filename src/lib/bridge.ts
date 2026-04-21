import { createAppBridge, type AppBridge } from "@0xchat/app-sdk";
import type { UserProfile, GroupSummary, GroupMember, Contact, AppCard } from "@0xchat/app-sdk";
import { formatAddress } from "./utils";

// ---------- Constants ----------

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_RPC = "https://mainnet.base.org";
const BASE_CHAIN_ID = "0x2105"; // 8453
const WALLET_KEY = "splitpay:wallet";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

// ---------- Social mock fallbacks (contacts only — no pre-populated groups) ----------

export const MOCK_CONTACTS: Contact[] = [
  { walletAddress: "0xAA1c3F9a2bD4e00112233445566778899aABBccD", displayName: "Alice", avatar: "" },
  { walletAddress: "0xBB2d4F8b3cD5e11223344556677889900BBccDDe", displayName: "Bob", avatar: "" },
  { walletAddress: "0xCC3e5F7c4dE6f2233445566778899AA11CCddEEf", displayName: "Charlie", avatar: "" },
  { walletAddress: "0xDD4f6F6d5fE7a3344556677889900BB22DDeeFFa", displayName: "Dana", avatar: "" },
];

// ---------- On-chain helpers (Base mainnet) ----------

async function fetchUsdcBalance(address: string): Promise<string> {
  try {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          { to: USDC_BASE, data: "0x70a08231" + address.replace(/^0x/, "").padStart(64, "0") },
          "latest",
        ],
      }),
    });
    const { result } = await res.json();
    const raw = parseInt(result ?? "0x0", 16);
    return (raw / 1e6).toFixed(2);
  } catch {
    return "0.00";
  }
}

async function ensureBaseChain(): Promise<void> {
  if (!window.ethereum) throw new Error("No wallet");
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === BASE_CHAIN_ID) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID }],
    });
  } catch (e: any) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_CHAIN_ID,
          chainName: "Base",
          rpcUrls: [BASE_RPC],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    } else {
      throw e;
    }
  }
}

async function sendUsdcInjected(from: string, to: string, amountStr: string): Promise<string> {
  await ensureBaseChain();
  const units = BigInt(Math.round(parseFloat(amountStr) * 1_000_000));
  const data =
    "0xa9059cbb" +
    to.replace(/^0x/, "").padStart(64, "0") +
    units.toString(16).padStart(64, "0");
  return window.ethereum!.request({
    method: "eth_sendTransaction",
    params: [{ from, to: USDC_BASE, data }],
  });
}

// ---------- Bridge client ----------

const IN_IFRAME = typeof window !== "undefined" && window.parent !== window;

class BridgeClient {
  private sdkBridge: AppBridge | null = null;
  private live = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.sdkBridge = createAppBridge({ appId: "splitpay", timeout: 2500 });
      } catch {
        this.sdkBridge = null;
      }
    }
  }

  get isLive(): boolean {
    return this.live;
  }

  /** Address saved from a previous injected wallet connection. */
  get injectedAddress(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem(WALLET_KEY) : null;
  }

  get connectionState(): "live" | "injected" | "none" {
    if (this.live) return "live";
    if (this.injectedAddress) return "injected";
    return "none";
  }

  // ---- Auth ----

  async connectInjected(): Promise<string> {
    if (!window.ethereum) {
      throw new Error(
        "No wallet detected. Install MetaMask or open in a wallet browser."
      );
    }
    const accounts: string[] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts[0]) throw new Error("No account returned from wallet.");
    localStorage.setItem(WALLET_KEY, accounts[0]);
    return accounts[0];
  }

  disconnect(): void {
    localStorage.removeItem(WALLET_KEY);
  }

  // ---- Profile ----

  /** Returns null when no wallet is connected at all. */
  async getProfileOrNull(): Promise<UserProfile | null> {
    // 1. Try 0xChat bridge (inside iframe)
    if (this.sdkBridge && IN_IFRAME) {
      try {
        const p = await this.sdkBridge.user.getProfile();
        this.live = true;
        return p;
      } catch {}
    }
    // 2. Injected wallet (MetaMask etc.)
    const addr = this.injectedAddress;
    if (addr) {
      return { walletAddress: addr, displayName: formatAddress(addr, 4), avatar: "" };
    }
    // 3. Not connected
    return null;
  }

  // ---- Wallet ----

  async getBalance(token = "USDC"): Promise<string> {
    if (this.sdkBridge && IN_IFRAME) {
      try {
        const b = await this.sdkBridge.wallet.getBalance({ token });
        this.live = true;
        return b;
      } catch {}
    }
    const addr = this.injectedAddress;
    if (addr && token === "USDC") return fetchUsdcBalance(addr);
    return "0.00";
  }

  async sendTransaction(params: { to: string; token: string; amount: string }): Promise<string> {
    if (this.sdkBridge && IN_IFRAME) {
      try {
        const h = await this.sdkBridge.wallet.sendTransaction(params);
        this.live = true;
        return h;
      } catch {}
    }
    const addr = this.injectedAddress;
    if (!addr || !window.ethereum) throw new Error("No wallet connected.");
    if (params.token !== "USDC") throw new Error("Only USDC is supported.");
    return sendUsdcInjected(addr, params.to, params.amount);
  }

  // ---- Social (falls back gracefully when not in 0xChat) ----

  private async call<T>(fn: () => Promise<T>, fallback: T | (() => T | Promise<T>)): Promise<T> {
    if (!this.sdkBridge || !IN_IFRAME) {
      return typeof fallback === "function" ? (fallback as any)() : fallback;
    }
    try {
      const res = await fn();
      this.live = true;
      return res;
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

  /** Resolve a wallet address to a Contact (name + avatar) via the 0xChat contacts list. Returns null outside 0xChat or if not found. */
  async resolveContact(walletAddress: string): Promise<Contact | null> {
    if (!this.sdkBridge || !IN_IFRAME) return null;
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
