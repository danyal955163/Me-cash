import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase-server';
export async function GET(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 const {data:tasks,error}=await supabase.from('tasks').select('*').eq('status','active').order('created_at',{ascending:false});
 if(error)return NextResponse.json({error:error.message},{status:400});
 let submissions:{task_id:string;status:string;admin_note:string|null}[]=[];
 if(user){const {data}=await supabase.from('task_submissions').select('task_id,status,admin_note').eq('user_id',user.id);submissions=data||[];}
 return NextResponse.json({tasks:tasks||[],submissions});
}
