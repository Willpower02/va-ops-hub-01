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

    // Verify the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: roleData } = await adminClient.rpc("get_user_org_role", { _user_id: user.id });
    if (roleData !== "admin") {
      return json({ error: "Only admins can invite members" }, 403);
    }

    // Get caller's org
    const { data: orgData } = await adminClient.rpc("get_user_org_id", { _user_id: user.id });
    if (!orgData) {
      return json({ error: "No organization found" }, 400);
    }

    const { name, email, role } = await req.json();

    if (!name?.trim()) return json({ error: "Name is required" }, 400);
    if (!email?.trim()) return json({ error: "Email is required" }, 400);

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("team_members")
      .select("id")
      .eq("organization_id", orgData)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return json({ error: "A team member with this email already exists" }, 409);
    }

    // Get org name for the invite email
    const { data: orgInfo } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", orgData)
      .single();

    const orgName = orgInfo?.name || "the organization";
    const roleName = role === "team_lead" ? "Team Lead" : role === "admin" ? "Admin" : "Virtual Assistant";

    // Insert team member first
    const { data: member, error: memberError } = await adminClient
      .from("team_members")
      .insert({
        organization_id: orgData,
        name: name.trim(),
        email: normalizedEmail,
        role: role || "va",
        status: "offline",
        invite_status: "pending",
      })
      .select()
      .single();

    if (memberError) {
      console.error("[invite-member] Insert error:", memberError.message);
      return json({ error: "Failed to create team member: " + memberError.message }, 500);
    }

    // Send invite via Supabase Auth admin API
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        org_id: orgData,
        role: role || "va",
        team_member_id: member.id,
        invited_name: name.trim(),
      },
      redirectTo: "https://vatracker.lovable.app/accept-invite",
    });

    if (inviteError) {
      console.error("[invite-member] Invite error:", inviteError.message);
      // Don't fail — the team member record is created, they can be re-invited
      if (!inviteError.message?.includes("already been registered")) {
        // Still return success since the member was created
        console.warn("[invite-member] Auth invite failed but member created");
      }
    }

    // Log activity
    await adminClient.from("activity_logs").insert({
      organization_id: orgData,
      user_id: user.id,
      action: "member_invited",
      details: { name: name.trim(), email: normalizedEmail, role: role || "va" },
    });

    return json({ member });
  } catch (err) {
    console.error("[invite-member] Unexpected error:", err);
    return json({ error: err.message || "Unexpected server error" }, 500);
  }
});
