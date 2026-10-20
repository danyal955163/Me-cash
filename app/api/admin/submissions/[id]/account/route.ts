import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/admin-api';

type RouteContext = { params: { id: string } };
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  const { data: submission, error: submissionError } = await admin.db.from('task_submissions')
    .select('id,user_id,task_id,tasks:task_id(is_account_task)')
    .eq('id', params.id)
    .maybeSingle();
  if (submissionError) {
    console.error('Submission account context lookup failed:', submissionError.message);
    return NextResponse.json({ error: 'Could not load this submission.' }, { status: 500, headers: noStore });
  }
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404, headers: noStore });

  const task = Array.isArray(submission.tasks) ? submission.tasks[0] : submission.tasks;
  if (!task?.is_account_task) return NextResponse.json({ error: 'This submission does not use an account.' }, { status: 400, headers: noStore });

  const { data: account, error } = await admin.db.from('task_accounts')
    .select('email,password,status,assigned_username')
    .eq('task_id', submission.task_id)
    .eq('assigned_to', submission.user_id)
    .in('status', ['assigned', 'completed'])
    .maybeSingle();
  if (error) {
    console.error('Submission account lookup failed:', error.message);
    return NextResponse.json({ error: 'Could not load assigned task credentials.' }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ account: account || null }, { headers: noStore });
}
