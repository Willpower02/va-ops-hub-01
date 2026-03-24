import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "verifying" | "set-password" | "accept-decline" | "done" | "declined" | "error";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("verifying");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Invite metadata from user_metadata
  const [orgName, setOrgName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token_hash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const type = searchParams.get("type") || hashParams.get("type");

    console.log("[AcceptInvite] token_hash:", !!token_hash, "type:", type);

    if (token_hash && (type === "invite" || type === "magiclink" || type === "signup")) {
      supabase.auth.verifyOtp({ token_hash, type: type as any }).then(async ({ data, error: err }) => {
        if (err) {
          console.error("[AcceptInvite] verifyOtp error:", err.message);
          setError("This invite link is invalid or has expired. Please ask your admin to resend the invitation.");
          setStep("error");
          return;
        }

        // Extract metadata
        const user = data?.user;
        if (user) {
          const meta = user.user_metadata || {};
          setOrgId(meta.org_id || "");
          setRole(meta.role || "va");
          setTeamMemberId(meta.team_member_id || "");

          const rLabel = meta.role === "team_lead" ? "Team Lead" : meta.role === "admin" ? "Admin" : "Virtual Assistant";
          setRoleName(rLabel);

          // Fetch org name
          if (meta.org_id) {
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", meta.org_id)
              .maybeSingle();
            setOrgName(org?.name || "the organization");
          }
        }

        setStep("set-password");
      });
    } else {
      // Check if user is already logged in with pending invite
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const meta = user.user_metadata || {};
          if (meta.org_id && meta.team_member_id) {
            setOrgId(meta.org_id);
            setRole(meta.role || "va");
            setTeamMemberId(meta.team_member_id);
            const rLabel = meta.role === "team_lead" ? "Team Lead" : meta.role === "admin" ? "Admin" : "Virtual Assistant";
            setRoleName(rLabel);
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", meta.org_id)
              .maybeSingle();
            setOrgName(org?.name || "the organization");
            setStep("accept-decline");
            return;
          }
        }
        setError("No valid invite token found. Please use the link from your invitation email.");
        setStep("error");
      });
    }
  }, []);

  const handleSetPassword = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setStep("accept-decline");
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create organization_members record
      const { error: omError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role: role || "va",
        });

      if (omError && !omError.message.includes("duplicate")) {
        throw omError;
      }

      // Update team_members invite_status
      if (teamMemberId) {
        await supabase
          .from("team_members")
          .update({ invite_status: "accepted", status: "idle" })
          .eq("id", teamMemberId);
      }

      setStep("done");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      if (teamMemberId) {
        await supabase
          .from("team_members")
          .update({ invite_status: "declined" })
          .eq("id", teamMemberId);
      }
      setStep("declined");
    } catch {
      setError("Failed to decline invitation");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6"
      style={{ background: "linear-gradient(160deg, hsl(216 55% 8%) 0%, hsl(215 45% 14%) 50%, hsl(216 40% 10%) 100%)" }}>
      <div className="w-full max-w-md rounded-xl glass-card p-8 space-y-6">

        {step === "verifying" && (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center animate-pulse mx-auto">
              <span className="text-primary font-bold">VA</span>
            </div>
            <p className="text-muted-foreground text-sm">Verifying your invitation...</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center space-y-3">
            <h1 className="text-lg font-semibold text-foreground">Invitation Error</h1>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {step === "set-password" && (
          <>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Set Your Password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                You've been invited to join <span className="text-foreground font-medium">{orgName}</span> as a <span className="text-primary font-medium">{roleName}</span>.
              </p>
              <p className="text-sm text-muted-foreground mt-1">Create a password to get started.</p>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">New Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters" className="bg-secondary/50 border-border/50" />
              </div>
              <div>
                <Label className="text-muted-foreground">Confirm Password</Label>
                <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm your password" className="bg-secondary/50 border-border/50" />
              </div>
              <Button onClick={handleSetPassword} disabled={loading} className="w-full bg-primary hover:bg-primary/90 glow-border">
                {loading ? "Setting Password..." : "Set Password & Continue"}
              </Button>
            </div>
          </>
        )}

        {step === "accept-decline" && (
          <>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold text-lg">VA</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">You're Invited!</h1>
              <p className="text-sm text-muted-foreground mt-3">
                You've been invited to join <span className="text-foreground font-medium">{orgName}</span> as a <span className="text-primary font-medium">{roleName}</span> on VA Tracker.
              </p>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="space-y-3 pt-2">
              <Button onClick={handleAccept} disabled={loading} className="w-full bg-primary hover:bg-primary/90 glow-border">
                {loading ? "Joining..." : "Accept & Enter Dashboard"}
              </Button>
              <Button variant="outline" onClick={handleDecline} disabled={loading}
                className="w-full border-border/50 hover:bg-secondary text-muted-foreground">
                Decline
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center space-y-3">
            <h1 className="text-lg font-semibold text-success">Welcome aboard! 🎉</h1>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}

        {step === "declined" && (
          <div className="text-center space-y-3">
            <h1 className="text-lg font-semibold text-foreground">Invitation Declined</h1>
            <p className="text-sm text-muted-foreground">You have declined the invitation. You can close this page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
