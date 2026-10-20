import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin-api';

const nameSchema = z.string().trim().min(2, 'Category name must be at least 2 characters.').max(60, 'Category name must be 60 characters or fewer.');
type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const parsed = z.object({ name: nameSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid category name.' }, { status: 400 });

  const { data, error } = await admin.db.from('categories')
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id,name,sort_order,created_at,updated_at')
    .maybeSingle();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'This category already exists.' }, { status: 409 });
    console.error('Category update failed:', error.message);
    return NextResponse.json({ error: 'Could not update category.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  return NextResponse.json({ category: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if ('error' in admin) return admin.error;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 });

  const { error } = await admin.db.from('categories').delete().eq('id', params.id);
  if (error) {
    console.error('Category delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete category.' }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
