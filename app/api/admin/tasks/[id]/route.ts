import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, audit } from '../../../../../lib/admin-api';
import { TASK_CATEGORIES } from '../../../../../lib/task-categories';

type RouteContext = { params: { id: string } };
const categoryValues = TASK_CATEGORIES.map((category) => category.value) as [string, ...string[]];
const patchSchema = z.object({
  task_name: z.string().min(1).optional(),
  task_description: z.string().min(1).optional(),
  task_steps: z.string().min(1).optional(),
  task_type: z.enum(['open_link', 'share_message']).optional(),
  task_url: z.string().optional().nullable(),
  share_message: z.string().optional().nullable(),
  reward: z.number().min(1).optional(),
  proof_images: z.array(z.string().url()).max(10).optional(),
  completion_type: z.enum(['one_time', 'repeatable']).optional(),
  category: z.enum(categoryValues).optional(),
  is_account_task: z.boolean().optional(),
  status: z.enum(['active', 'paused', 'expired', 'draft']).optional(),
}).superRefine((data, context) => {
  if (data.task_type === 'open_link' && data.task_url !== undefined && !data.task_url?.trim()) context.addIssue({ code: 'custom', path: ['task_url'], message: 'Task URL is required for Open Link tasks.' });
  if (data.task_type === 'share_message' && data.share_message !== undefined && !data.share_message?.trim()) context.addIssue({ code: 'custom', path: ['share_message'], message: 'Share Message is required for Share Message tasks.' });
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid task fields.', details: parsed.error.flatten() }, { status: 400 });

  const form = parsed.data;
  const taskData: Record<string, unknown> = {};
  if (form.task_name !== undefined) { taskData.task_name = form.task_name; taskData.title = form.task_name; }
  if (form.task_description !== undefined) { taskData.task_description = form.task_description; taskData.description = form.task_description; }
  if (form.task_steps !== undefined) { taskData.task_steps = form.task_steps; taskData.instructions = form.task_steps; }
  if (form.task_type !== undefined) taskData.task_type = form.task_type;
  if (form.task_type === 'open_link') { taskData.task_url = form.task_url || null; taskData.share_message = null; taskData.link = form.task_url || null; }
  else if (form.task_type === 'share_message') { taskData.task_url = null; taskData.share_message = form.share_message || null; taskData.link = null; }
  else {
    if (form.task_url !== undefined) { taskData.task_url = form.task_url || null; taskData.link = form.task_url || null; }
    if (form.share_message !== undefined) taskData.share_message = form.share_message || null;
  }
  if (form.reward !== undefined) { taskData.reward = Number(form.reward); taskData.reward_coins = Number(form.reward); }
  if (form.proof_images !== undefined) { taskData.proof_images = form.proof_images; taskData.example_images = form.proof_images; }
  if (form.completion_type !== undefined) taskData.completion_type = form.completion_type;
  if (form.category !== undefined) taskData.category = form.category;
  if (form.is_account_task !== undefined) taskData.is_account_task = form.is_account_task;
  if (form.status !== undefined) taskData.status = form.status;
  if (!Object.keys(taskData).length) return NextResponse.json({ error: 'No task fields provided.' }, { status: 400 });

  const { data, error } = await admin.db.from('tasks').update(taskData).eq('id', params.id).select().single();
  if (error) {
    console.error('Task update failed:', error);
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
  }
  await audit(admin.db, admin.user.id, 'update_task', 'task', params.id, taskData);
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  await admin.db.from('task_submissions').delete().eq('task_id', params.id);
  const { error } = await admin.db.from('tasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
  await audit(admin.db, admin.user.id, 'delete_task', 'task', params.id, {});
  return NextResponse.json({ success: true });
}
