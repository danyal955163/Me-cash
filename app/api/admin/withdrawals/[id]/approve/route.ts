import { NextResponse } from 'next/server';
import { requireAdmin, audit } from '../../../../../../lib/admin-api';

type RouteContext = { params: { id: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  let body: { transaction_id?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (typeof body.transaction_id !== 'string' || !body.transaction_id.trim()) {
    return NextResponse.json({ error: 'Transaction ID required.' }, { status: 400 });
  }

  const { data, error } = await admin.db.from('withdrawals')
    .update({ status: 'approved', processed_by: admin.user.id, processed_at: new Date().toISOString(), admin_note: body.transaction_id.trim() })
    .eq('id', params.id)
    .eq('status', 'pending')
    .select('id,user_id,amount,red_pocket_amount,status')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Withdrawal was already processed or not found.' }, { status: 409 });
  }

  const amount = Number(data.red_pocket_amount || data.amount);
  const { error: statsError } = await admin.db.rpc('increment_withdrawn_rp', { p_user_id: data.user_id, p_amount: amount });
  if (statsError) {
    const { error: rollbackError } = await admin.db.from('withdrawals')
      .update({ status: 'pending', processed_by: null, processed_at: null, admin_note: null })
      .eq('id', data.id)
      .eq('status', 'approved');
    if (rollbackError) console.error('Withdrawal approval rollback failed:', rollbackError.message);
    return NextResponse.json({ error: statsError.message }, { status: 400 });
  }

  const { error: transactionError } = await admin.db.from('transactions').insert({
    user_id: data.user_id,
    type: 'withdrawal',
    amount,
    description: 'Red Pocket withdrawal approved',
    reference_id: data.id,
  });
  if (transactionError) console.error('Withdrawal approval transaction record failed:', transactionError.message);

  const { error: notificationError } = await admin.db.from('notifications').insert({
    user_id: data.user_id,
    title: 'Withdrawal Approved',
    message: `Your withdrawal of ${amount} RP was approved.`,
    type: 'withdrawal_approved',
    link: '/dashboard/wallet',
  });
  if (notificationError) console.error('Withdrawal approval notification failed:', notificationError.message);

  await audit(admin.db, admin.user.id, 'approve_withdrawal', 'withdrawal', params.id, { transaction_id: body.transaction_id.trim() });
  return NextResponse.json({ data });
}
