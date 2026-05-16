interface GroupMember {
    walletAddress: string;
    displayName: string;
    avatar: string;
    roles: string[];
}
interface AppBridgeConfig {
    appId: string;
}
interface BridgeMessage {
    type: "bevo-bridge";
    id: string;
    method: string;
    params?: any;
    appId: string;
}
interface BridgeResponse {
    type: "bevo-bridge-response";
    id: string;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}
declare class BridgeError extends Error {
    code: number;
    constructor(message: string, code: number);
}
interface UserProfile {
    walletAddress: string;
    displayName: string;
    avatar: string;
}
interface Contact {
    walletAddress: string;
    displayName: string;
    avatar: string;
}
interface GroupSummary {
    id: string;
    name: string;
    avatar: string;
    memberCount: number;
}
interface SendTransactionParams {
    to: string;
    token: string;
    amount: string;
}
interface SignMessageParams {
    message: string;
}
type CardActionKind = "callback" | "wallet_action" | "link" | "open_app";
type CardActionStyle = "primary" | "secondary" | "danger";
interface CardField {
    label: string;
    value: string;
}
interface CardAction {
    /** Unique identifier — returned in the card_action webhook event */
    id: string;
    label: string;
    kind: CardActionKind;
    style?: CardActionStyle;
    /** For "callback": opaque payload forwarded to your webhook */
    payload?: Record<string, unknown>;
    /** For "wallet_action": transaction to sign */
    tx?: {
        to: string;
        /** ERC-20 token contract address; omit for native ETH */
        token?: string;
        amount: string;
        decimals?: number;
    };
    /** For "link" */
    url?: string;
    /** For "open_app" */
    appSlug?: string;
}
interface AppCard {
    type: "app_card";
    title: string;
    subtitle?: string;
    imageUrl?: string;
    fields?: CardField[];
    actions?: CardAction[];
    /**
     * Optional metadata attached to the card.
     * - `targetWallet`: only this wallet address can interact with the card's actions.
     *   Other members see the card but buttons are disabled.
     * - `completedActions`: set by the server after an action is executed;
     *   read-only from the app's perspective.
     */
    metadata?: {
        targetWallet?: string;
        completedActions?: Record<string, {
            txHash?: string;
            at?: string;
        }>;
        [key: string]: unknown;
    };
}
/**
 * Sends a tappable "Requesting X ETH · Tap to pay" bubble into a group channel.
 * Rendered identically to the DM payment request UI.
 * When the user pays, your webhook receives a `card_action` event with
 * `actionId: "pay"` and `result: { txHash }`.
 */
interface PaymentRequestCard {
    type: "payment_request";
    amount: string;
    symbol: string;
    /** ERC-20 token contract address; omit for native ETH */
    tokenAddress?: string;
    decimals?: number;
    /** Address that receives the payment */
    requesterAddress: string;
    /**
     * If set, only this wallet can tap to pay.
     * Other members see "Not for you" and cannot interact.
     */
    targetWallet?: string;
}
interface AppCardField {
    label: string;
    value: string;
}
interface ShareCardParams {
    to: string;
    card: AppCard;
}
interface ShareCardToGroupParams {
    groupId: string;
    channelId: string;
    card: AppCard | PaymentRequestCard;
}
interface AddBotParams {
    botHandle: string;
    groupId: string;
}
interface BotDeployment {
    type: "group" | "dm";
    id: string;
    name: string;
    addedAt: string;
}
interface ReadContractParams {
    address: string;
    abi: any[];
    functionName: string;
    args?: any[];
}

declare class AppBridge {
    private pending;
    private appId;
    private timeout;
    private boundHandler;
    constructor(config: AppBridgeConfig & {
        timeout?: number;
    });
    private handleMessage;
    private request;
    destroy(): void;
    wallet: {
        getAddress: () => Promise<string>;
        getChainId: () => Promise<number>;
        getBalance: (params: {
            token?: string;
        }) => Promise<string>;
        sendTransaction: (params: SendTransactionParams) => Promise<string>;
        signMessage: (params: SignMessageParams) => Promise<string>;
        readContract: (params: ReadContractParams) => Promise<any>;
    };
    user: {
        getProfile: () => Promise<UserProfile>;
    };
    contacts: {
        list: () => Promise<Contact[]>;
    };
    groups: {
        list: () => Promise<GroupSummary[]>;
        getMembers: (groupId: string) => Promise<GroupMember[]>;
    };
    chat: {
        shareCard: (params: ShareCardParams) => Promise<void>;
        shareCardToGroup: (params: ShareCardToGroupParams) => Promise<void>;
    };
    bots: {
        addToGroup: (params: AddBotParams) => Promise<{
            success: boolean;
        }>;
        removeFromGroup: (params: AddBotParams) => Promise<{
            success: boolean;
        }>;
        addToDm: (params: {
            botHandle: string;
            peerAddress: string;
        }) => Promise<{
            success: boolean;
        }>;
        listDeployments: (botHandle: string) => Promise<BotDeployment[]>;
    };
    navigation: {
        openGroup: (groupId: string) => void;
        openDm: (peerAddress: string) => void;
        openApp: (appSlug: string, params?: Record<string, string>) => void;
    };
}
declare function createAppBridge(config: AppBridgeConfig & {
    timeout?: number;
}): AppBridge;
type EIP1193Listener = (...args: any[]) => void;
/**
 * EIP-1193 compliant Ethereum provider that routes all RPC calls through the
 * Bevo bridge. Plug into wagmi, ethers, viem, or any wallet library to
 * auto-connect with the user's embedded wallet when running inside Bevo.
 */
declare class BridgeProvider {
    private bridge;
    private listeners;
    constructor(bridge: AppBridge);
    static isAvailable(): boolean;
    request({ method, params }: {
        method: string;
        params?: unknown[];
    }): Promise<unknown>;
    on(event: string, listener: EIP1193Listener): this;
    removeListener(event: string, listener: EIP1193Listener): this;
    addEventListener(event: string, listener: EIP1193Listener): this;
    removeEventListener(event: string, listener: EIP1193Listener): this;
}

interface MockBridgeConfig extends AppBridgeConfig {
    walletAddress?: string;
    profile?: Partial<UserProfile>;
    contacts?: Contact[];
    groups?: GroupSummary[];
    onCall?: (method: string, params?: any) => void;
}
declare class MockAppBridge {
    private cfg;
    constructor(config: MockBridgeConfig);
    private log;
    destroy(): void;
    wallet: {
        getAddress: () => Promise<string>;
        getChainId: () => Promise<number>;
        getBalance: (params: {
            token?: string;
        }) => Promise<string>;
        sendTransaction: (params: SendTransactionParams) => Promise<string>;
        signMessage: (params: SignMessageParams) => Promise<string>;
        readContract: (params: ReadContractParams) => Promise<null>;
    };
    user: {
        getProfile: () => Promise<UserProfile>;
    };
    contacts: {
        list: () => Promise<Contact[]>;
    };
    groups: {
        list: () => Promise<GroupSummary[]>;
        getMembers: (groupId: string) => Promise<GroupMember[]>;
    };
    chat: {
        shareCard: (params: ShareCardParams) => Promise<void>;
        shareCardToGroup: (params: ShareCardToGroupParams) => Promise<void>;
    };
    bots: {
        addToGroup: (params: AddBotParams) => Promise<{
            success: boolean;
        }>;
        removeFromGroup: (params: AddBotParams) => Promise<{
            success: boolean;
        }>;
        addToDm: (params: {
            botHandle: string;
            peerAddress: string;
        }) => Promise<{
            success: boolean;
        }>;
        listDeployments: (botHandle: string) => Promise<BotDeployment[]>;
    };
    navigation: {
        openGroup: (groupId: string) => void;
        openDm: (peerAddress: string) => void;
        openApp: (appSlug: string, params?: Record<string, string>) => void;
    };
}
declare function createMockBridge(config: MockBridgeConfig): MockAppBridge;

export { type AddBotParams, AppBridge, type AppBridgeConfig, type AppCard, type AppCardField, type BotDeployment, BridgeError, type BridgeMessage, BridgeProvider, type BridgeResponse, type CardAction, type CardActionKind, type CardActionStyle, type CardField, type Contact, type GroupMember, type GroupSummary, MockAppBridge, type MockBridgeConfig, type PaymentRequestCard, type ReadContractParams, type SendTransactionParams, type ShareCardParams, type ShareCardToGroupParams, type SignMessageParams, type UserProfile, createAppBridge, createMockBridge };
