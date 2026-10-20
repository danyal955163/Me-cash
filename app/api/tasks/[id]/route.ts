import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { z } from 'zod';

const proofSchema = z.object({ proof_images: z.array(z.string().url()).min(1).max(10) });

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const db = await createClient();
  const { data, error } = await db.from('tasks').select('*').eq('id', params.id).single();
  if (error || !data) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json({ task: data });
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = proofSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Please upload 1–10 proof screenshots.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: task, error: taskError } = await admin.from('tasks')
    .select('id,task_name,status,completion_type,is_account_task')
    .eq('id', params.id)
    .maybeSingle();
  if (taskError || !task || task.status !== 'active') {
    return NextResponse.json({ error: 'Task is not active.' }, { status: 400 });
  }

  if (task.is_account_task) {
    const { data: account, error: accountError } = await admin.from('task_accounts')
      .select('id')
      .eq('task_id', params.id)
      .eq('assigned_to', user.id)
      .in('status', ['assigned', 'completed'])
      .maybeSingle();
    if (accountError) {
      console.error('Task submission account check failed:', accountError.message);
      return NextResponse.json({ error: 'Could not verify your account assignment.' }, { status: 500 });
    }
    if (!account) return NextResponse.json({ error: 'Get an account for this task before submitting proof.' }, { status: 409 });
  }

  if (task.completion_type !== 'repeatable') {
    const { data: existing, error: existingError } = await admin.from('task_submissions')
      .select('id,status')
      .eq('task_id', params.id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: 'Could not check previous submissions.' }, { status: 500 });
    if (existing) return NextResponse.json({ error: 'Already submitted', status: existing.status }, { status: 409 });
  }

  const { data: submission, error: insertError } = await admin.from('task_submissions').insert({
    task_id: params.id,
    user_id: user.id,
    proof_images: parsed.data.proof_images,
    proof_type: 'screenshot',
    status: 'pending',
  }).select('id,task_id,user_id,status,created_at').single();
  if (insertError || !submission) {
    return NextResponse.json({ error: insertError?.message || 'Could not submit proof. Please try again.' }, { status: 400 });
  }

  const notifications = [{
    user_id: user.id,
    title: 'Task Submitted',
    message: `Your proof for “${task.task_name}” is waiting for admin review.`,
    type: 'task_submitted',
    link: '/dashboard/game-history',
  }];
  const { data: profile } = await admin.from('profiles').select('referred_by').eq('id', user.id).maybeSingle();
  if (profile?.referred_by) {
    notifications.push({
      user_id: profile.referred_by,
      title: 'Referral Activity',
      message: 'A referred member submitted a task. Referral rewards are added after approval.',
      type: 'referral_activity',
      link: '/dashboard/referral',
    });
  }
  const { error: notificationError } = await admin.from('notifications').insert(notifications);
  if (notificationError) console.error('Task submission notification failed:', notificationError.message);

  return NextResponse.json({ data: submission }, { status: 201 });
}
