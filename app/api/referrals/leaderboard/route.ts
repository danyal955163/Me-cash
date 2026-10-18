import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type ReferralEntry = {
  referrer_id: string | null;
  total_coins_earned: number | string | null;
  total_red_pocket_earned: number | string | null;
};

function maskName(value: string) {
  const name = value.trim().replace(/\s+/g, '');
  if (!name) return 'Me Cash member';
  if (name.length <= 2) return `${name[0]}*`;
  if (name.length <= 4) return `${name[0]}${'*'.repeat(name.length - 2)}${name.at(-1)}`;
  return `${name.slice(0, 2)}${'*'.repeat(Math.min(3, name.length - 4))}${name.slice(-2)}`;
}

export async function GET() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const admin = createAdminClient();
  const referrals: ReferralEntry[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.from('referrals')
      .select('referrer_id,total_coins_earned,total_red_pocket_earned')
      .order('referrer_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error('Referral leaderboard query failed:', error.message);
      return NextResponse.json({ error: 'Could not load referral leaderboard.' }, { status: 500 });
    }
    referrals.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const totals = new Map<string, { invites: number; coins: number; redPocket: number }>();
  for (const referral of referrals) {
    if (!referral.referrer_id) continue;
    const total = totals.get(referral.referrer_id) || { invites: 0, coins: 0, redPocket: 0 };
    total.invites += 1;
    total.coins += Number(referral.total_coins_earned || 0);
    total.redPocket += Number(referral.total_red_pocket_earned || 0);
    totals.set(referral.referrer_id, total);
  }

  const ranked: Array<{ id: string; invites: number; coins: number; redPocket: number }> = [];
  totals.forEach((value, id) => ranked.push({ id, ...value }));
  const top = ranked
    .sort((a, b) => b.invites - a.invites || b.coins - a.coins || b.redPocket - a.redPocket)
    .slice(0, 5);
  if (!top.length) return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'private, no-store' } });

  const { data: profiles, error: profileError } = await admin.from('profiles')
    .select('id,full_name,username,avatar_url')
    .in('id', top.map((entry) => entry.id));
  if (profileError) {
    console.error('Referral leaderboard profile query failed:', profileError.message);
    return NextResponse.json({ error: 'Could not load referral leaderboard.' }, { status: 500 });
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const data = top.map((entry, index) => {
    const profile = profilesById.get(entry.id);
    const rawAvatar = profile?.avatar_url;
    const avatarUrl = typeof rawAvatar === 'string' && /^\/avatars\/[A-Za-z0-9._-]+$/.test(rawAvatar) ? rawAvatar : null;
    return {
      rank: index + 1,
      name: maskName(profile?.full_name || profile?.username || 'Me Cash member'),
      avatarUrl,
      invites: entry.invites,
      coinsEarned: entry.coins,
      redPocketEarned: entry.redPocket,
    };
  });

  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
