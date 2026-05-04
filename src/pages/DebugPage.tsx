import { useEffect, useState } from "react";
import { createAppBridge } from "@0xchat/app-sdk";
import { USDC_BASE_SEPOLIA } from "@/lib/bridge";

interface Step {
  label: string;
  status: "pending" | "ok" | "error";
  value?: string;
  error?: string;
  ms?: number;
}

export function DebugPage() {
  const [steps, setSteps] = useState<Step[]>([
    { label: "window.parent !== window (iframe detection)", status: "pending" },
    { label: "createAppBridge()", status: "pending" },
    { label: "user.getProfile()", status: "pending" },
    { label: "wallet.getBalance({ token: 'USDC' })", status: "pending" },
  ]);

  const patch = (index: number, update: Partial<Step>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));

  useEffect(() => {
    (async () => {
      // Step 0: iframe detection
      const inIframe = typeof window !== "undefined" && window.parent !== window;
      patch(0, { status: "ok", value: String(inIframe) });

      // Step 1: bridge init
      let sdk: ReturnType<typeof createAppBridge> | null = null;
      const t1 = Date.now();
      try {
        sdk = createAppBridge({ appId: "splitpay", timeout: 5000 });
        patch(1, { status: "ok", value: "bridge created", ms: Date.now() - t1 });
      } catch (e: any) {
        patch(1, { status: "error", error: e?.message ?? String(e), ms: Date.now() - t1 });
        return;
      }

      // Step 2: getProfile
      const t2 = Date.now();
      let profile: any = null;
      try {
        profile = await sdk.user.getProfile();
        patch(2, {
          status: "ok",
          value: JSON.stringify(profile, null, 2),
          ms: Date.now() - t2,
        });
      } catch (e: any) {
        patch(2, { status: "error", error: e?.message ?? String(e), ms: Date.now() - t2 });
      }

      // Step 3: getBalance (only if profile succeeded)
      if (profile) {
        const t3 = Date.now();
        try {
          const balance = await sdk.wallet.getBalance({ token: "USDC" });
          patch(3, { status: "ok", value: `${balance} USDC`, ms: Date.now() - t3 });
        } catch (e: any) {
          patch(3, { status: "error", error: e?.message ?? String(e), ms: Date.now() - t3 });
        }
      } else {
        patch(3, { status: "error", error: "skipped — getProfile failed" });
      }
    })();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
      <h1 className="text-base font-bold">Bridge Debug</h1>
      <p className="text-xs text-text-muted">
        appId: <code className="font-mono">splitpay</code> · timeout: 5000ms · chain: Base Sepolia (84532)
      </p>
      <p className="text-xs text-text-dim font-mono break-all">
        USDC: {USDC_BASE_SEPOLIA}
      </p>

      {steps.map((step, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-surface p-3 space-y-1.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">
              {step.status === "pending" ? "⏳" : step.status === "ok" ? "✅" : "❌"}
            </span>
            <span className="text-xs font-medium font-mono">{step.label}</span>
            {step.ms !== undefined && (
              <span className="ml-auto text-xs text-text-dim">{step.ms}ms</span>
            )}
          </div>

          {step.value && (
            <pre className="text-xs text-positive bg-positive/10 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
              {step.value}
            </pre>
          )}
          {step.error && (
            <pre className="text-xs text-negative bg-negative/10 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">
              {step.error}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
