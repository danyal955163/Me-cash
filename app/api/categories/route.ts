import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: noStore });

  const admin = createAdminClient();
  const { data, error } = await admin.from('categories')
    .select('id,name,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    console.error('Category list failed:', error.message);
    return NextResponse.json({ error: 'Could not load categories.' }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ categories: data || [] }, { headers: noStore });
}
