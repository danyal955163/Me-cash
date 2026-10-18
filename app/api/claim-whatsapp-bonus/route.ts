import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

const BONUS_DESCRIPTION = 'WhatsApp channel bonus';

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('description', BONUS_DESCRIPTION)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('WhatsApp bonus status failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ claimed: Boolean(data) });
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const admin = createAdminClient();
  // This security-definer function locks the user claim, checks the ledger,
  // increments the wallet and inserts the transaction atomically.
  const { data, error } = await admin.rpc('claim_whatsapp_channel_bonus', { p_user_id: user.id });
  if (error) {
    console.error('WhatsApp bonus claim failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.already_claimed) {
    return NextResponse.json({ success: false, message: 'Already claimed', alreadyClaimed: true }, { status: 409 });
  }
  return NextResponse.json({ success: true, message: 'Claimed!', coinsAwarded: Number(result.coins_awarded || 1000) });
}
