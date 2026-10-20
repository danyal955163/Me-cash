import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin-api';

const uploadSchema = z.object({
  task_id: z.string().uuid(),
  accounts_text: z.string().min(1).max(100_000),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  const { data: tasks, error: tasksError } = await admin.db.from('tasks')
    .select('id,task_name,category_id,status,is_account_task,categories:categories!tasks_category_id_fkey(id,name)')
    .eq('is_account_task', true)
    .order('created_at', { ascending: false });
  if (tasksError) {
    console.error('Account task list failed:', tasksError.message);
    return NextResponse.json({ error: 'Could not load account tasks.' }, { status: 500 });
  }

  const taskId = new URL(request.url).searchParams.get('task_id');
  if (!taskId) return NextResponse.json({ tasks: tasks || [], accounts: [] });
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: 'A valid task_id is required.' }, { status: 400 });
  }
  if (!(tasks || []).some((task) => task.id === taskId)) {
    return NextResponse.json({ error: 'Account task not found.' }, { status: 404 });
  }

  const { data: accounts, error: accountsError } = await admin.db.from('task_accounts')
    .select('id,email,status,assigned_to,assigned_at,profiles:assigned_to(id,full_name,email,username,referral_code)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (accountsError) {
    console.error('Task account list failed:', accountsError.message);
    return NextResponse.json({ error: 'Could not load uploaded accounts.' }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks || [], accounts: accounts || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Select a task and paste email:password accounts.' }, { status: 400 });

  const { data: task, error: taskError } = await admin.db.from('tasks')
    .select('id,is_account_task')
    .eq('id', parsed.data.task_id)
    .maybeSingle();
  if (taskError) {
    console.error('Task account upload validation failed:', taskError.message);
    return NextResponse.json({ error: 'Could not verify the selected task.' }, { status: 500 });
  }
  if (!task?.is_account_task) return NextResponse.json({ error: 'Selected task does not require accounts.' }, { status: 400 });

  const lines = parsed.data.accounts_text.split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter((item) => item.raw.length > 0);
  if (!lines.length) return NextResponse.json({ error: 'Paste at least one email:password line.' }, { status: 400 });
  if (lines.length > 500) return NextResponse.json({ error: 'Upload up to 500 accounts at a time.' }, { status: 400 });

  const accounts: { task_id: string; email: string; password: string }[] = [];
  const seen = new Set<string>();
  for (const item of lines) {
    const separator = item.raw.indexOf(':');
    if (separator <= 0 || separator === item.raw.length - 1) {
      return NextResponse.json({ error: `Line ${item.line} must use email:password format.` }, { status: 400 });
    }
    const email = item.raw.slice(0, separator).trim().toLowerCase();
    const password = item.raw.slice(separator + 1).trim();
    if (!z.string().email().safeParse(email).success || !password || password.length > 1024) {
      return NextResponse.json({ error: `Line ${item.line} must contain a valid email and a password.` }, { status: 400 });
    }
    if (seen.has(email)) return NextResponse.json({ error: `Line ${item.line} repeats an email from this upload.` }, { status: 400 });
    seen.add(email);
    accounts.push({ task_id: parsed.data.task_id, email, password });
  }

  const { data, error } = await admin.db.from('task_accounts').insert(accounts).select('id,email,status,assigned_to,assigned_at');
  if (error) {
    console.error('Task account upload failed:', { code: error.code, message: error.message });
    if (error.code === '23505') return NextResponse.json({ error: 'One or more emails already exist for this task.' }, { status: 409 });
    return NextResponse.json({ error: 'Could not upload accounts.' }, { status: 500 });
  }

  return NextResponse.json({ uploaded: data?.length || 0 });
}
