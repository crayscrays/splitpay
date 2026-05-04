// src/types.ts
var BridgeError = class extends Error {
  constructor(message, code) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
  }
};

// src/bridge.ts
var AppBridge = class {
  constructor(config) {
    this.pending = /* @__PURE__ */ new Map();
    this.wallet = {
      getAddress: () => this.request("wallet.getAddress"),
      getChainId: () => this.request("wallet.getChainId"),
      getBalance: (params) => this.request("wallet.getBalance", params),
      sendTransaction: (params) => this.request("wallet.sendTransaction", params),
      signMessage: (params) => this.request("wallet.signMessage", params),
      readContract: (params) => this.request("wallet.readContract", params)
    };
    this.user = {
      getProfile: () => this.request("user.getProfile")
    };
    this.contacts = {
      list: () => this.request("contacts.list")
    };
    this.groups = {
      list: () => this.request("groups.list"),
      getMembers: (groupId) => this.request("groups.getMembers", { groupId })
    };
    this.chat = {
      shareCard: (params) => this.request("chat.shareCard", params),
      shareCardToGroup: (params) => this.request("chat.shareCardToGroup", params)
    };
    this.bots = {
      addToGroup: (params) => this.request("bots.addToGroup", params),
      removeFromGroup: (params) => this.request("bots.removeFromGroup", params),
      addToDm: (params) => this.request("bots.addToDm", params),
      listDeployments: (botHandle) => this.request("bots.listDeployments", { botHandle })
    };
    this.navigation = {
      openGroup: (groupId) => {
        this.request("navigation.openGroup", { groupId }).catch(() => {
        });
      },
      openDm: (peerAddress) => {
        this.request("navigation.openDm", { peerAddress }).catch(() => {
        });
      },
      openApp: (appSlug, params) => {
        this.request("navigation.openApp", { appSlug, params }).catch(() => {
        });
      }
    };
    this.appId = config.appId;
    this.timeout = config.timeout || 3e4;
    this.boundHandler = this.handleMessage.bind(this);
    window.addEventListener("message", this.boundHandler);
  }
  handleMessage(event) {
    const msg = event.data;
    if (!msg || msg.type !== "0xchat-bridge-response") return;
    const handler = this.pending.get(msg.id);
    if (!handler) return;
    clearTimeout(handler.timeout);
    this.pending.delete(msg.id);
    if (msg.error) {
      handler.reject(new BridgeError(msg.error.message, msg.error.code));
    } else {
      handler.resolve(msg.result);
    }
  }
  request(method, params) {
    return new Promise((resolve, reject) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeError("Request timed out", 408));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timeout });
      window.parent.postMessage(
        { type: "0xchat-bridge", id, method, params, appId: this.appId },
        "*"
      );
    });
  }
  destroy() {
    window.removeEventListener("message", this.boundHandler);
    for (const [, handler] of this.pending) {
      clearTimeout(handler.timeout);
      handler.reject(new BridgeError("Bridge destroyed", 499));
    }
    this.pending.clear();
  }
};
function createAppBridge(config) {
  return new AppBridge(config);
}
var BridgeProvider = class {
  constructor(bridge) {
    this.listeners = /* @__PURE__ */ new Map();
    this.bridge = bridge;
  }
  static isAvailable() {
    try {
      return window.parent !== window;
    } catch {
      return true;
    }
  }
  async request({ method, params }) {
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts": {
        const address = await this.bridge.wallet.getAddress();
        return address ? [address] : [];
      }
      case "eth_chainId": {
        const chainId = await this.bridge.wallet.getChainId();
        return "0x" + chainId.toString(16);
      }
      case "net_version": {
        const chainId = await this.bridge.wallet.getChainId();
        return String(chainId);
      }
      case "personal_sign": {
        const raw = params?.[0] ?? "";
        return this.bridge.wallet.signMessage({ message: decodeHexMessage(raw) });
      }
      case "eth_sign": {
        const raw = params?.[1] ?? "";
        return this.bridge.wallet.signMessage({ message: decodeHexMessage(raw) });
      }
      case "eth_sendTransaction": {
        const tx = params?.[0] ?? {};
        if (!tx.to) throw providerError(4001, "Missing 'to' address in transaction");
        if (tx.data && tx.data !== "0x")
          throw providerError(
            4200,
            "Contract call transactions are not supported via the 0xChat bridge"
          );
        const amount = formatWei(tx.value ? BigInt(tx.value) : 0n, 18);
        return this.bridge.wallet.sendTransaction({ to: tx.to, token: "ETH", amount });
      }
      default:
        throw providerError(4200, `Method not supported via 0xChat bridge: ${method}`);
    }
  }
  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, /* @__PURE__ */ new Set());
    this.listeners.get(event).add(listener);
    return this;
  }
  removeListener(event, listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }
  addEventListener(event, listener) {
    return this.on(event, listener);
  }
  removeEventListener(event, listener) {
    return this.removeListener(event, listener);
  }
};
function providerError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
function decodeHexMessage(raw) {
  if (!raw.startsWith("0x")) return raw;
  try {
    const hex = raw.slice(2);
    const bytes = new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return raw;
  }
}
function formatWei(wei, decimals) {
  if (wei === 0n) return "0";
  const divisor = BigInt(10 ** decimals);
  const whole = wei / divisor;
  const fraction = wei % divisor;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}

// src/mock.ts
var MockAppBridge = class {
  constructor(config) {
    this.wallet = {
      getAddress: async () => {
        this.log("wallet.getAddress");
        return this.cfg.walletAddress ?? "0xf00d000000000000000000000000000000000001";
      },
      getChainId: async () => {
        this.log("wallet.getChainId");
        return 8453;
      },
      getBalance: async (params) => {
        this.log("wallet.getBalance", params);
        return "100.00";
      },
      sendTransaction: async (params) => {
        this.log("wallet.sendTransaction", params);
        return "0xmocktxhash";
      },
      signMessage: async (params) => {
        this.log("wallet.signMessage", params);
        return "0xmocksignature";
      },
      readContract: async (params) => {
        this.log("wallet.readContract", params);
        return null;
      }
    };
    this.user = {
      getProfile: async () => {
        this.log("user.getProfile");
        return {
          walletAddress: this.cfg.walletAddress ?? "0xf00d000000000000000000000000000000000001",
          displayName: "dev.eth",
          avatar: "",
          ...this.cfg.profile
        };
      }
    };
    this.contacts = {
      list: async () => {
        this.log("contacts.list");
        return this.cfg.contacts ?? [];
      }
    };
    this.groups = {
      list: async () => {
        this.log("groups.list");
        return this.cfg.groups ?? [{ id: "mock-group-1", name: "Dev Group", avatar: "", memberCount: 2 }];
      },
      getMembers: async (groupId) => {
        this.log("groups.getMembers", { groupId });
        return [
          {
            walletAddress: "0xf00d000000000000000000000000000000000001",
            displayName: "dev.eth",
            avatar: "",
            roles: ["admin"]
          },
          {
            walletAddress: "0xbeef000000000000000000000000000000000002",
            displayName: "alice.eth",
            avatar: "",
            roles: ["member"]
          }
        ];
      }
    };
    this.chat = {
      shareCard: async (params) => {
        this.log("chat.shareCard", params);
      },
      shareCardToGroup: async (params) => {
        this.log("chat.shareCardToGroup", params);
      }
    };
    this.bots = {
      addToGroup: async (params) => {
        this.log("bots.addToGroup", params);
        return { success: true };
      },
      removeFromGroup: async (params) => {
        this.log("bots.removeFromGroup", params);
        return { success: true };
      },
      addToDm: async (params) => {
        this.log("bots.addToDm", params);
        return { success: true };
      },
      listDeployments: async (botHandle) => {
        this.log("bots.listDeployments", { botHandle });
        return [];
      }
    };
    this.navigation = {
      openGroup: (groupId) => {
        this.log("navigation.openGroup", { groupId });
      },
      openDm: (peerAddress) => {
        this.log("navigation.openDm", { peerAddress });
      },
      openApp: (appSlug, params) => {
        this.log("navigation.openApp", { appSlug, params });
      }
    };
    this.cfg = config;
  }
  log(method, params) {
    console.log(`[MockAppBridge] ${method}`, params ?? "");
    this.cfg.onCall?.(method, params);
  }
  destroy() {
    this.log("destroy");
  }
};
function createMockBridge(config) {
  return new MockAppBridge(config);
}
export {
  AppBridge,
  BridgeError,
  BridgeProvider,
  MockAppBridge,
  createAppBridge,
  createMockBridge
};
