// reset-fix-v3
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token_hash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const type = searchParams.get("type") || hashParams.get("type");

    console.log("[ResetPassword] token_hash:", token_hash, "type:", type);

    if (token_hash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        console.log("[ResetPassword] verifyOtp error:", error);
        if (error) {
          setError("This reset link is invalid or has expired. Please request a new one.");
        } else {
          setReady(true);
        }
      });
    } else {
      setError("Invalid reset link. Please request a new one.");
    }
  }, []);

  const handleSubmit = async () => {
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1120", color: "white" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>Reset Your Password</h1>

        {!ready && !error && (
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Verifying your reset link...</p>
        )}

        {error && (
          <p style={{ textAlign: "center", color: "#f87171" }}>{error}</p>
        )}

        {success && (
          <p style={{ textAlign: "center", color: "#4ade80" }}>Password updated! Redirecting...</p>
        )}

        {ready && !success && (
          <>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #334155", background: "#0f172a",
                color: "white", marginBottom: 12, boxSizing: "border-box" as const
              }}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid #334155", background: "#0f172a",
                color: "white", marginBottom: 20, boxSizing: "border-box" as const
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", padding: "12px", borderRadius: 8,
                background: "#3b82f6", color: "white", fontWeight: 600,
                border: "none", cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
