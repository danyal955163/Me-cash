import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin-api';
import { createAdminClient } from '../../../../lib/supabase-admin';

const nameSchema = z.string().trim().min(2, 'Category name must be at least 2 characters.').max(60, 'Category name must be 60 characters or fewer.');

export async function GET() {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  const db = createAdminClient();
  const { data, error } = await db.from('categories')
    .select('id,name,sort_order,created_at,updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error('Admin category list failed:', error.message);
    return NextResponse.json({ error: 'Could not load categories.' }, { status: 500 });
  }
  return NextResponse.json({ categories: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid category name.' }, { status: 400 });

  const db = createAdminClient();
  const { data: last } = await db.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from('categories')
    .insert({ name: parsed.data.name, sort_order: (last?.sort_order || 0) + 10 })
    .select('id,name,sort_order,created_at,updated_at')
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'This category already exists.' }, { status: 409 });
    console.error('Category create failed:', error.message);
    return NextResponse.json({ error: 'Could not create category.' }, { status: 500 });
  }
  return NextResponse.json({ category: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
