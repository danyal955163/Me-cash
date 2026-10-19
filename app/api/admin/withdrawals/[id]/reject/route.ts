import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/admin-api';
import { createAdminClient } from '../../../../../../lib/supabase-admin';

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const withdrawalId = params.id;
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from('withdrawals')
    .update({ status: 'rejected', processed_at: new Date().toISOString() })
    .eq('id', withdrawalId);

  if (error) {
    console.error('Failed to reject withdrawal:', error);
    return NextResponse.json({ error: 'Failed to reject withdrawal.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
