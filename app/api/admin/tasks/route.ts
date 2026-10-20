import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, audit } from '../../../../lib/admin-api';
import { TASK_CATEGORIES } from '../../../../lib/task-categories';

const categoryValues = TASK_CATEGORIES.map((category) => category.value) as [string, ...string[]];
const taskFields = {
  task_name: z.string().min(1, 'Task name required'),
  task_description: z.string().min(1, 'Description required'),
  task_steps: z.string().min(1, 'Instructions required'),
  task_type: z.enum(['open_link', 'share_message']),
  task_url: z.string().optional().nullable(),
  share_message: z.string().optional().nullable(),
  reward: z.number().min(1, 'Reward required'),
  proof_images: z.array(z.string().url()).max(10).optional().default([]),
  completion_type: z.enum(['one_time', 'repeatable']).default('one_time'),
  category: z.enum(categoryValues).default('simple'),
  is_account_task: z.boolean().default(false),
  status: z.enum(['active', 'paused', 'expired', 'draft']).default('draft'),
};
const createSchema = z.object(taskFields).superRefine((data, context) => {
  if (data.task_type === 'open_link' && !data.task_url?.trim()) context.addIssue({ code: 'custom', path: ['task_url'], message: 'Task URL is required for Open Link tasks.' });
  if (data.task_type === 'share_message' && !data.share_message?.trim()) context.addIssue({ code: 'custom', path: ['share_message'], message: 'Share Message is required for Share Message tasks.' });
});
const patchSchema = z.object(taskFields).partial().superRefine((data, context) => {
  if (data.task_type === 'open_link' && data.task_url !== undefined && !data.task_url?.trim()) context.addIssue({ code: 'custom', path: ['task_url'], message: 'Task URL is required for Open Link tasks.' });
  if (data.task_type === 'share_message' && data.share_message !== undefined && !data.share_message?.trim()) context.addIssue({ code: 'custom', path: ['share_message'], message: 'Share Message is required for Share Message tasks.' });
});

type TaskInput = z.infer<typeof createSchema>;

function toTaskData(form: Partial<TaskInput>, adminId: string) {
  const data: Record<string, unknown> = {};
  if (form.task_name !== undefined) { data.task_name = form.task_name; data.title = form.task_name; }
  if (form.task_description !== undefined) { data.task_description = form.task_description; data.description = form.task_description; }
  if (form.task_steps !== undefined) { data.task_steps = form.task_steps; data.instructions = form.task_steps; }
  if (form.task_type !== undefined) data.task_type = form.task_type;
  if (form.task_type === 'open_link') { data.task_url = form.task_url || null; data.share_message = null; data.link = form.task_url || null; }
  else if (form.task_type === 'share_message') { data.task_url = null; data.share_message = form.share_message || null; data.link = null; }
  else {
    if (form.task_url !== undefined) { data.task_url = form.task_url || null; data.link = form.task_url || null; }
    if (form.share_message !== undefined) data.share_message = form.share_message || null;
  }
  if (form.reward !== undefined) { data.reward = Number(form.reward); data.reward_coins = Number(form.reward); }
  if (form.proof_images !== undefined) { data.proof_images = form.proof_images; data.example_images = form.proof_images; }
  if (form.completion_type !== undefined) data.completion_type = form.completion_type;
  if (form.category !== undefined) data.category = form.category;
  if (form.is_account_task !== undefined) data.is_account_task = form.is_account_task;
  if (form.status !== undefined) data.status = form.status;
  data.proof_type = 'screenshot';
  data.slots = 1000;
  if (form.task_name !== undefined || form.task_description !== undefined || form.task_steps !== undefined || form.task_type !== undefined || form.reward !== undefined || form.category !== undefined || form.is_account_task !== undefined) {
    data.created_by = adminId;
  }
  return data;
}

export async function GET() {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  const { data, error } = await admin.db.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid task fields.', details: parsed.error.flatten() }, { status: 400 });

  const taskData = toTaskData(parsed.data, admin.user.id);
  const { data, error } = await admin.db.from('tasks').insert(taskData).select().single();
  if (error) {
    console.error('Task insert failed:', error);
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
  }
  await audit(admin.db, admin.user.id, 'create_task', 'task', data.id, taskData);
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid task fields.', details: parsed.error.flatten() }, { status: 400 });
  const id = typeof (body as { id?: unknown }).id === 'string' ? (body as { id: string }).id : '';
  if (!id) return NextResponse.json({ error: 'Task ID required.' }, { status: 400 });
  const taskData = toTaskData(parsed.data, admin.user.id);
  const { data, error } = await admin.db.from('tasks').update(taskData).eq('id', id).select().single();
  if (error) {
    console.error('Task update failed:', error);
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
  }
  await audit(admin.db, admin.user.id, 'update_task', 'task', id, taskData);
  return NextResponse.json({ data });
}
