import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const WHOP_API_KEY = Deno.env.get('WHOP_API_KEY');
  if (!WHOP_API_KEY) {
    return new Response(JSON.stringify({ error: 'WHOP_API_KEY not configured' }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    // Verify webhook via header token
    const authHeader = req.headers.get('authorization') || req.headers.get('x-whop-signature') || '';
    if (!authHeader.includes(WHOP_API_KEY)) {
      console.error('Webhook signature mismatch');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const email = data?.email || data?.user?.email;
    const membershipId = data?.id || data?.membership_id;
    const productName = (data?.product?.name || data?.plan?.product?.name || '').toLowerCase();

    // Determine plan from product name
    const plan = productName.includes('pro') ? 'pro' : 'starter';

    if (!email) {
      console.error('No email in webhook payload');
      return new Response(JSON.stringify({ error: 'No email found' }), { status: 400, headers: corsHeaders });
    }

    // Find org by owner email via profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      console.error('No profile found for email:', email);
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
    }

    const { data: orgMember } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      console.error('No org found for user:', profile.id);
      return new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404, headers: corsHeaders });
    }

    const orgId = orgMember.organization_id;

    switch (action) {
      case 'membership.went_valid': {
        await supabaseAdmin.from('organizations').update({
          plan,
          subscription_status: 'active',
          whop_membership_id: membershipId,
        }).eq('id', orgId);
        break;
      }
      case 'membership.went_invalid': {
        await supabaseAdmin.from('organizations').update({
          subscription_status: 'expired',
          plan: 'trial',
        }).eq('id', orgId);
        break;
      }
      case 'membership.renewed': {
        const periodEnd = data?.current_period_end || data?.renewal_period_end;
        await supabaseAdmin.from('organizations').update({
          current_period_end: periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', orgId);
        break;
      }
      default:
        console.log('Unhandled webhook action:', action);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
