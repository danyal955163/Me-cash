import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin-api';
import { createAdminClient } from '../../../../lib/supabase-admin';

const nameSchema = z.string().trim().min(2, 'Category name must be at least 2 characters.').max(60, 'Category name must be 60 characters or fewer.');

async function verifyCategoriesTable(db: ReturnType<typeof createAdminClient>) {
  return db.from('categories').select('*').limit(1);
}

export async function GET() {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  const db = createAdminClient();
  const { error: schemaError } = await verifyCategoriesTable(db);
  if (schemaError) {
    console.error('Category schema check error:', schemaError.message);
    return NextResponse.json({ error: schemaError.message }, { status: 500 });
  }
  const { data, error } = await db.from('categories').select('*');
  if (error) {
    console.error('Category list error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const categories = [...(data || [])].sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name || '').localeCompare(String(b.name || '')));
  return NextResponse.json({ categories }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid category name.' }, { status: 400 });
  const categoryName = parsed.data.name;
  const db = createAdminClient();
  const { error: schemaError } = await verifyCategoriesTable(db);
  if (schemaError) {
    console.error('Category schema check error:', schemaError.message);
    return NextResponse.json({ error: schemaError.message }, { status: 500 });
  }
  const { data, error } = await db.from('categories')
    .insert({ name: categoryName })
    .select('*')
    .single();
  if (error) {
    console.error('Category insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: error.code === '23505' ? 409 : 500 });
  }
  return NextResponse.json({ category: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
