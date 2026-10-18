import { NextResponse } from 'next/server';
import { requireAdmin, audit } from '../../../../../../lib/admin-api';

type RouteContext = { params: { id: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  let body: { admin_note?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (typeof body.admin_note !== 'string' || body.admin_note.trim().length < 5) {
    return NextResponse.json({ error: 'Admin note must be at least 5 characters.' }, { status: 400 });
  }

  const { data, error } = await admin.db.from('task_submissions')
    .update({ status: 'rejected', admin_note: body.admin_note.trim(), reviewed_by: admin.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('status', 'pending')
    .select('id,user_id,task_id,status,admin_note')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Submission was already processed or not found.' }, { status: 409 });
  }

  const notices = [{
    user_id: data.user_id,
    title: 'Task Rejected',
    message: `Your task proof was rejected: ${data.admin_note}`,
    type: 'task_rejected',
    link: '/dashboard/game-history',
  }];
  const { data: profile } = await admin.db.from('profiles').select('referred_by').eq('id', data.user_id).maybeSingle();
  if (profile?.referred_by) {
    notices.push({
      user_id: profile.referred_by,
      title: 'Referral Activity',
      message: 'A referred member’s task was reviewed and rejected; no task referral reward was issued.',
      type: 'referral_activity',
      link: '/dashboard/referral',
    });
  }
  const { error: notificationError } = await admin.db.from('notifications').insert(notices);
  if (notificationError) console.error('Task rejection notification failed:', notificationError.message);

  await audit(admin.db, admin.user.id, 'reject_submission', 'task_submission', params.id, { admin_note: data.admin_note });
  return NextResponse.json({ data });
}
