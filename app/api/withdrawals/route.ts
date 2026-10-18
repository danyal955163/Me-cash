import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { withdrawalSchema } from '../../../lib/validations';

const recent = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const now = Date.now();
    if (now - (recent.get(user.id) || 0) < 60000) {
      return NextResponse.json({ error: 'Only one withdrawal request per minute is allowed.' }, { status: 429 });
    }

    const raw = await req.json();
    const db = createAdminClient();
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('payment_method,payment_account_name,payment_account_number')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    const hasSavedDetails = Boolean(profile?.payment_method && profile?.payment_account_name && profile?.payment_account_number);
    const details = hasSavedDetails ? {
      method: profile!.payment_method,
      account_name: profile!.payment_account_name,
      account_number: profile!.payment_account_number,
    } : {
      method: raw.method,
      account_name: raw.account_name,
      account_number: raw.account_number,
    };
    const parsed = withdrawalSchema.safeParse({
      red_pocket_amount: Number(raw.red_pocket_amount ?? raw.amount),
      ...details,
    });
    if (!parsed.success) return NextResponse.json({ error: 'Please provide valid withdrawal details.' }, { status: 400 });

    const amount = parsed.data.red_pocket_amount;
    const { data: wallet, error: walletError } = await db.from('wallets')
      .select('red_pocket_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    if (walletError || !wallet) return NextResponse.json({ error: walletError?.message || 'Wallet not found.' }, { status: 400 });
    if (amount > Number(wallet.red_pocket_balance || 0)) {
      return NextResponse.json({ error: 'Withdrawal amount exceeds your Red Pocket balance.' }, { status: 400 });
    }

    const { data: pending } = await db.from('withdrawals').select('id').eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (pending) return NextResponse.json({ error: 'You already have a pending withdrawal.' }, { status: 409 });

    const payload = {
      user_id: user.id,
      amount,
      red_pocket_amount: amount,
      method: parsed.data.method,
      account_name: parsed.data.account_name,
      account_number: parsed.data.account_number,
      status: 'pending',
    };
    const { data: withdrawal, error: insertError } = await db.from('withdrawals').insert(payload).select().single();
    if (insertError || !withdrawal) {
      return NextResponse.json({ error: insertError?.message || 'Could not create withdrawal request.', details: insertError?.details }, { status: 400 });
    }

    // Keep the conditional database decrement as the final atomic check in case
    // another request changed the balance after the read above.
    const { data: deducted, error: deductError } = await db.rpc('decrement_wallet_red_pocket', { p_user_id: user.id, p_amount: amount });
    if (deductError || !deducted) {
      await db.from('withdrawals').delete().eq('id', withdrawal.id).eq('status', 'pending');
      return NextResponse.json({ error: deductError?.message || 'Insufficient Red Pocket balance. Withdrawal was rolled back.' }, { status: 400 });
    }

    await db.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount: -amount, description: 'Red Pocket withdrawal requested', reference_id: withdrawal.id });
    const { error: notificationError } = await db.from('notifications').insert({
      user_id: user.id,
      title: 'Withdrawal Requested',
      message: `Your request to withdraw ${amount} RP was submitted for review.`,
      type: 'withdrawal_requested',
      link: '/dashboard/withdraw#history',
    });
    if (notificationError) console.error('Withdrawal request notification failed:', notificationError.message);
    recent.set(user.id, now);
    const { data: updatedWallet } = await db.from('wallets').select('coin_balance,red_pocket_balance').eq('user_id', user.id).single();
    return NextResponse.json({ success: true, withdrawal, wallet: updatedWallet });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Withdrawal failed. Please retry.' }, { status: 500 });
  }
}
