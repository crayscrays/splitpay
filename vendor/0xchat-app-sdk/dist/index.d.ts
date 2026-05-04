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
    type: "0xchat-bridge";
    id: string;
    method: string;
    params?: any;
    appId: string;
}
interface BridgeResponse {
    type: "0xchat-bridge-response";
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
interface AppCardField {
    label: string;
    value: string;
}
interface AppCardAction {
    label: string;
    deeplink?: string;
    url?: string;
}
interface AppCard {
    title: string;
    subtitle?: string;
    image?: string;
    fields?: AppCardField[];
    action?: AppCardAction;
}
interface ShareCardParams {
    to: string;
    card: AppCard;
}
interface ShareCardToGroupParams {
    groupId: string;
    channelId: string;
    card: AppCard;
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

export { type AddBotParams, AppBridge, type AppBridgeConfig, type AppCard, type AppCardAction, type AppCardField, type BotDeployment, BridgeError, type BridgeMessage, BridgeProvider, type BridgeResponse, type Contact, type GroupMember, type GroupSummary, MockAppBridge, type MockBridgeConfig, type ReadContractParams, type SendTransactionParams, type ShareCardParams, type ShareCardToGroupParams, type SignMessageParams, type UserProfile, createAppBridge, createMockBridge };
