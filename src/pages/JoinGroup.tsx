import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useSplitPay, type InviteInfo } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { MemberAvatar } from "@/components/MemberAvatar";
import { formatAddress, resolveCodeRemote, storeCode } from "@/lib/utils";

export function JoinGroup() {
  const { inviteCode: codeParam = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sp = useSplitPay();
  const nav = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!codeParam) {
      setError("No invite code provided.");
      return;
    }

    // Try to decode invite data from ?d= query param (cross-device sharing via full URL).
    // useSearchParams auto-decodes %xx sequences, giving us the original base64 string.
    const dataParam = searchParams.get("d");
    if (dataParam) {
      try {
        const decoded: InviteInfo = JSON.parse(atob(dataParam));
        if (decoded.id && decoded.name && decoded.creator) {
          const code = codeParam.toUpperCase();
          storeCode(code, decoded);
          setInvite({ ...decoded, inviteCode: code });
          return;
        }
      } catch {
        // fall through to localStorage lookup
      }
    }

    // Fall back: localStorage first, then API (cross-device)
    resolveCodeRemote(codeParam).then((cached) => {
      if (cached?.id && cached?.name && cached?.creator) {
        setInvite(cached as InviteInfo);
      } else {
        setError("Invite code not found. Make sure you entered it correctly.");
      }
    });
  }, [codeParam, searchParams]);

  // If already a member, go straight to the group
  useEffect(() => {
    if (!invite || sp.loading) return;
    if (sp.groups.some((g) => g.id === invite.id)) {
      nav(`/group/${invite.id}`, { replace: true });
    }
  }, [invite, sp.groups, sp.loading, nav]);

  const handleJoin = async () => {
    if (!invite) return;
    setJoining(true);
    await sp.joinGroup(invite);
    nav(`/group/${invite.id}`, { replace: true });
  };

  if (sp.loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Join group" back="/" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-negative/10 border border-negative/30 flex items-center justify-center">
            <Users size={24} className="text-negative" />
          </div>
          <div>
            <div className="font-semibold text-text">Invalid invite</div>
            <div className="text-sm text-text-muted mt-1">{error}</div>
          </div>
          <button onClick={() => nav("/")} className="btn btn-secondary px-5 py-2.5 text-sm">
            Go home
          </button>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const creatorLabel = invite.creatorName ?? formatAddress(invite.creator, 4);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Join group" back="/" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Invite code badge */}
        {invite.inviteCode && (
          <div className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30">
            <span className="text-xs text-accent font-mono font-semibold tracking-widest">
              {invite.inviteCode}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <MemberAvatar name={invite.name} wallet={invite.id} size="lg" />
          <div>
            <h2 className="text-xl font-semibold">{invite.name}</h2>
            <div className="text-sm text-text-muted mt-1">
              Created by {creatorLabel}
            </div>
          </div>
        </div>

        <div className="card p-4 w-full text-sm text-text-muted text-center">
          You'll be added as a member and can start adding and tracking expenses together.
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="btn btn-primary w-full py-3 text-sm font-semibold"
          data-testid="button-join"
        >
          {joining ? "Joining…" : `Join ${invite.name}`}
        </button>
      </div>
    </div>
  );
}
