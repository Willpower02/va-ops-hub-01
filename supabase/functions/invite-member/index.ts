import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    console.log("[invite-member] Verifying user...");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log("[invite-member] Auth failed:", userError?.message);
      return json({ error: "Unauthorized: " + (userError?.message || "no user") }, 401);
    }

    console.log("[invite-member] User verified:", user.id);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData, error: roleError } = await adminClient.rpc("get_user_org_role", { _user_id: user.id });
    if (roleError) {
      console.log("[invite-member] Role check error:", roleError.message);
      return json({ error: "Failed to check role: " + roleError.message }, 500);
    }
    if (roleData !== "admin") {
      return json({ error: "Only admins can invite members" }, 403);
    }

    const { data: orgData, error: orgError } = await adminClient.rpc("get_user_org_id", { _user_id: user.id });
    if (orgError) {
      console.log("[invite-member] Org check error:", orgError.message);
      return json({ error: "Failed to get organization: " + orgError.message }, 500);
    }
    if (!orgData) {
      return json({ error: "No organization found for this user" }, 400);
    }

    console.log("[invite-member] Org:", orgData, "Role:", roleData);

    const { name, email, role } = await req.json();

    if (!name?.trim()) return json({ error: "Name is required" }, 400);
    if (!email?.trim()) return json({ error: "Email is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email format" }, 400);

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("team_members")
      .select("id, invite_status")
      .eq("organization_id", orgData)
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return json({ error: "A team member with this email already exists" }, 409);
    }

    console.log("[invite-member] Inviting:", email, "role:", role || "va");

    // Send invite via Auth
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name, organization_id: orgData, team_role: role || "va" },
    });

    if (inviteError) {
      console.log("[invite-member] Invite error:", inviteError.message);
      if (!inviteError.message?.includes("already been registered")) {
        return json({ error: "Auth invite failed: " + inviteError.message }, 400);
      }
    }

    // Create team member record
    const { data: member, error: memberError } = await adminClient
      .from("team_members")
      .insert({
        organization_id: orgData,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role || "va",
        status: "offline",
        invite_status: "pending",
      })
      .select()
      .single();

    if (memberError) {
      console.log("[invite-member] Insert error:", memberError.message);
      return json({ error: "Failed to create team member: " + memberError.message }, 500);
    }

    console.log("[invite-member] Member created:", member.id);

    await adminClient.from("activity_logs").insert({
      organization_id: orgData,
      user_id: user.id,
      action: "member_invited",
      details: { name, email },
    });

    return json({ member });
  } catch (err) {
    console.error("[invite-member] Unexpected error:", err);
    return json({ error: err.message || "Unexpected server error" }, 500);
  }
});
