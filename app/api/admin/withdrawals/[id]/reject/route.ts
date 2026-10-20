import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/admin-api';
import { createAdminClient } from '../../../../../../lib/supabase-admin';

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const withdrawalId = params.id;
  const supabaseAdmin = createAdminClient();
  const { data: withdrawal, error: fetchError } = await supabaseAdmin
    .from('withdrawals')
    .select('id,user_id,red_pocket_amount,amount,status')
    .eq('id', withdrawalId)
    .eq('status', 'pending')
    .maybeSingle();
  if (fetchError || !withdrawal) {
    return NextResponse.json({ error: fetchError?.message || 'Withdrawal is not pending.' }, { status: 409 });
  }
  const { data: updated, error } = await supabaseAdmin
    .from('withdrawals')
    .update({ status: 'rejected', processed_at: new Date().toISOString() })
    .eq('id', withdrawalId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !updated) {
    console.error('Failed to reject withdrawal:', error);
    return NextResponse.json({ error: error?.message || 'Withdrawal is no longer pending.' }, { status: error ? 500 : 409 });
  }

  const amount = Number(withdrawal.red_pocket_amount ?? withdrawal.amount ?? 0);
  const { error: refundError } = await supabaseAdmin.rpc('refund_withdrawal_rp', {
    p_user_id: withdrawal.user_id,
    p_amount: amount,
  });
  if (refundError) {
    console.error('Failed to refund rejected withdrawal:', refundError);
    await supabaseAdmin.from('withdrawals').update({ status: 'pending', processed_at: null }).eq('id', withdrawalId).eq('status', 'rejected');
    return NextResponse.json({ error: 'Withdrawal was not rejected because the RP refund failed.' }, { status: 500 });
  }
  await supabaseAdmin.from('transactions').insert({ user_id: withdrawal.user_id, type: 'refund', amount, status: 'completed', description: 'Refund for rejected Red Pocket withdrawal', reference_id: withdrawalId });
  return NextResponse.json({ success: true });
}
