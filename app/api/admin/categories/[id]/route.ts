import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin-api';
import { createAdminClient } from '../../../../../lib/supabase-admin';

const nameSchema = z.string().trim().min(2, 'Category name must be at least 2 characters.').max(60, 'Category name must be 60 characters or fewer.');
type RouteContext = { params: { id: string } };

async function verifyCategoriesTable(db: ReturnType<typeof createAdminClient>) {
  return db.from('categories').select('*').limit(1);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });
  const db = createAdminClient();
  const { error: schemaError } = await verifyCategoriesTable(db);
  if (schemaError) {
    console.error('Category schema check error:', schemaError.message);
    return NextResponse.json({ error: schemaError.message }, { status: 500 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid category name.' }, { status: 400 });

  const { data, error } = await db.from('categories')
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Category update error:', error.message);
    return NextResponse.json({ error: error.message }, { status: error.code === '23505' ? 409 : 500 });
  }
  if (!data) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  return NextResponse.json({ category: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });
  const db = createAdminClient();
  const { error: schemaError } = await verifyCategoriesTable(db);
  if (schemaError) {
    console.error('Category schema check error:', schemaError.message);
    return NextResponse.json({ error: schemaError.message }, { status: 500 });
  }

  const { error } = await db.from('categories').delete().eq('id', params.id);
  if (error) {
    console.error('Category delete error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
