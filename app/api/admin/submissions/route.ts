import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-api';

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  const status = new URL(request.url).searchParams.get('status');
  let query = admin.db.from('task_submissions')
    .select('*,profiles:user_id(id,full_name,email,phone,username,referral_code,wallets(coin_balance,red_pocket_balance)),tasks:task_id(id,task_name,task_description,reward)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('Admin submissions query failed:', error.message);
    return NextResponse.json({ data: [], error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
  }
  return NextResponse.json({ data: data || [], error: null });
}
