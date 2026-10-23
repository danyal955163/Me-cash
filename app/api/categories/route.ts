import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: noStore });

  const admin = createAdminClient();
  const { error: schemaError } = await admin.from('categories').select('*').limit(1);
  if (schemaError) {
    console.error('Category schema check error:', schemaError.message);
    return NextResponse.json({ error: schemaError.message }, { status: 500, headers: noStore });
  }
  const { data, error } = await admin.from('categories').select('*');
  if (error) {
    console.error('Category list error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  }
  const categories = [...(data || [])].sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name || '').localeCompare(String(b.name || '')));
  return NextResponse.json({ categories }, { headers: noStore });
}
