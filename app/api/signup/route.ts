import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const referral = (new URL(req.url).searchParams.get('ref') || '').trim().toLowerCase();
    if (!email || !password || !fullName || !username) {
      return NextResponse.json({ error: 'Please provide all required signup details.' }, { status: 400 });
    }

    const avatarUrl = `/avatars/boy${Math.floor(Math.random() * 8) + 1}.png`;
    const auth = await createClient();
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, username, referral_code: referral || null, avatar_url: avatarUrl },
        emailRedirectTo: `${new URL(req.url).origin}/dashboard/profile`,
      },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Signup could not be completed.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: avatarProfile, error: avatarError } = await admin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', data.user.id)
      .select('id')
      .maybeSingle();
    if (avatarError || !avatarProfile) {
      console.error('Signup avatar assignment failed:', avatarError?.message || 'Profile was not created.');
    }

    let referralLinked = false;
    if (referral) {
      const { data: referrer, error: referrerError } = await admin
        .from('profiles')
        .select('id')
        .eq('username', referral)
        .neq('id', data.user.id)
        .maybeSingle();

      if (referrerError) {
        console.error('Signup referrer lookup failed:', referrerError.message);
      } else if (referrer) {
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('referred_by')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Signup profile lookup failed:', profileError.message);
        } else if (profile) {
          let linkedToReferrer = profile.referred_by === referrer.id;
          if (!profile.referred_by) {
            const { data: updatedProfile, error: updateError } = await admin
              .from('profiles')
              .update({ referred_by: referrer.id })
              .eq('id', data.user.id)
              .is('referred_by', null)
              .select('id')
              .maybeSingle();
            if (updateError) console.error('Signup profile referral update failed:', updateError.message);
            else linkedToReferrer = Boolean(updatedProfile);
          }
          if (linkedToReferrer) {
            const { error: referralError } = await admin
              .from('referrals')
              .upsert({ referrer_id: referrer.id, referred_user_id: data.user.id }, { onConflict: 'referred_user_id', ignoreDuplicates: true });
            if (referralError) console.error('Signup referral record insert failed:', referralError.message);
            else referralLinked = true;
          }
        }
      }
    }

    return NextResponse.json({ user: { id: data.user.id, email: data.user.email }, hasSession: Boolean(data.session), referralLinked }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Signup could not be completed.' }, { status: 500 });
  }
}
