import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { useSplitPay, type InviteInfo } from "@/lib/splitpay-context";
import { Header } from "@/components/Header";
import { MemberAvatar } from "@/components/MemberAvatar";
import { formatAddress } from "@/lib/utils";

export function JoinGroup() {
  const { inviteCode = "" } = useParams();
  const sp = useSplitPay();
  const nav = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    try {
      const decoded: InviteInfo = JSON.parse(atob(inviteCode));
      if (decoded.id && decoded.name && decoded.creator) {
        setInvite(decoded);
      } else {
        setError("This invite link is invalid or expired.");
      }
    } catch {
      setError("This invite link is invalid or expired.");
    }
  }, [inviteCode]);

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
