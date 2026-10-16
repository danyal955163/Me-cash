import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase-server';
export async function GET(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({user:null});
  const [{data:profile},{data:wallet},{data:submissions}]=await Promise.all([
    supabase.from('profiles').select('id,full_name,email,phone,role,is_banned,created_at,referral_code,username,payment_method,payment_account_name,payment_account_number').eq('id',user.id).single(),
    supabase.from('wallets').select('*').eq('user_id',user.id).single(),
    supabase.from('task_submissions').select('id,task_id,status,admin_note,created_at').eq('user_id',user.id)
  ]);
  return NextResponse.json({user:{id:user.id,email:user.email},profile,wallet,submissions:submissions||[]});
}
