import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

const taskIdSchema = z.string().uuid();
const noStore = { 'Cache-Control': 'private, no-store' };

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: noStore });

  const taskId = new URL(request.url).searchParams.get('task_id');
  if (!taskIdSchema.safeParse(taskId).success) return NextResponse.json({ error: 'A valid task_id is required.' }, { status: 400, headers: noStore });

  const admin = createAdminClient();
  const { data: task, error: taskError } = await admin.from('tasks').select('id,is_account_task').eq('id', taskId!).maybeSingle();
  if (taskError) {
    console.error('Task account lookup failed:', taskError.message);
    return NextResponse.json({ error: 'Could not check account assignment.' }, { status: 500, headers: noStore });
  }
  if (!task?.is_account_task) return NextResponse.json({ error: 'This task does not use accounts.' }, { status: 404, headers: noStore });

  const { data: account, error } = await admin.from('task_accounts')
    .select('email,password,status,assigned_username')
    .eq('task_id', taskId!)
    .eq('assigned_to', user.id)
    .in('status', ['assigned', 'completed'])
    .maybeSingle();
  if (error) {
    console.error('Assigned task account lookup failed:', error.message);
    return NextResponse.json({ error: 'Could not load the account for this task.' }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ assigned: Boolean(account), account: account || null }, { headers: noStore });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: noStore });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400, headers: noStore }); }
  const parsed = z.object({
    task_id: taskIdSchema,
    username: z.string().trim().min(1, 'Enter the username you will use for this task.').max(64, 'Username must be 64 characters or fewer.'),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'A valid task ID and username are required.' }, { status: 400, headers: noStore });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('assign_task_account', {
    p_task_id: parsed.data.task_id,
    p_user_id: user.id,
    p_username: parsed.data.username,
  });
  if (error) {
    if (error.message.includes('no_available_account')) return NextResponse.json({ error: 'No accounts are available for this task right now. Please try again later.' }, { status: 409, headers: noStore });
    if (error.message.includes('task_not_available')) return NextResponse.json({ error: 'This account task is not currently active.' }, { status: 409, headers: noStore });
    if (error.message.includes('invalid_assignment_request')) return NextResponse.json({ error: 'Enter a valid username for this task.' }, { status: 400, headers: noStore });
    console.error('Task account assignment failed:', { code: error.code, message: error.message });
    return NextResponse.json({ error: 'Could not assign an account. Please try again.' }, { status: 500, headers: noStore });
  }

  const account = Array.isArray(data) ? data[0] : data;
  if (!account) return NextResponse.json({ error: 'No account was assigned.' }, { status: 409, headers: noStore });
  return NextResponse.json({ assigned: true, account }, { headers: noStore });
}
