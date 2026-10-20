import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { z } from 'zod';

const proofSchema = z.object({
  proof_images: z.array(z.string().url()).min(1).max(10),
  proof_url: z.string().trim().url().max(2048).optional().nullable(),
});

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
  if (!parsed.success) return NextResponse.json({ error: 'Please upload 1–10 proof screenshots and enter a valid proof URL if required.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: task, error: taskError } = await admin.from('tasks')
    .select('id,task_name,status,completion_type,require_url_proof')
    .eq('id', params.id)
    .maybeSingle();
  if (taskError || !task || task.status !== 'active') return NextResponse.json({ error: 'Task is not active.' }, { status: 400 });

  const proofUrl = parsed.data.proof_url?.trim() || null;
  if (task.require_url_proof && !proofUrl) return NextResponse.json({ error: 'This task requires a URL together with your screenshot.' }, { status: 400 });
  if (proofUrl) {
    try {
      const parsedUrl = new URL(proofUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('invalid_protocol');
    } catch {
      return NextResponse.json({ error: 'Proof URL must start with http:// or https://.' }, { status: 400 });
    }
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
    proof_url: proofUrl,
    proof_type: 'screenshot',
    status: 'pending',
  }).select('id,task_id,user_id,status,proof_url,created_at').single();
  if (insertError || !submission) return NextResponse.json({ error: insertError?.message || 'Could not submit proof. Please try again.' }, { status: 400 });

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
