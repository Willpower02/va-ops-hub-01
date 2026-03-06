import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient.rpc("get_user_org_role", { _user_id: user.id });
    if (roleData !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orgData } = await adminClient.rpc("get_user_org_id", { _user_id: user.id });
    if (!orgData) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, role } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Name and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate in team_members
    const { data: existing } = await adminClient
      .from("team_members")
      .select("id, invite_status")
      .eq("organization_id", orgData)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "A team member with this email already exists" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[invite-member] Inviting:", email, "role:", role || "va");

    // Send invite via Supabase Auth
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name, organization_id: orgData, team_role: role || "va" },
      redirectTo: `${req.headers.get("origin") || supabaseUrl}`,
    });

    if (inviteError) {
      console.log("[invite-member] Invite error:", inviteError.message);
      // If user already exists in auth, that's ok - still create team member
      if (!inviteError.message?.includes("already been registered")) {
        return json({ error: "Auth invite failed: " + inviteError.message }, 400);
      }
    }

    // Create team member record with pending status
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

    // Log activity
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
