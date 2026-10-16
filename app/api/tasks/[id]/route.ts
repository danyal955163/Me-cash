import {NextResponse} from 'next/server';
import {createClient} from '../../../../lib/supabase-server';
import {createAdminClient} from '../../../../lib/supabase-admin';
import {z} from 'zod';
const proof=z.object({proof_text:z.string().optional(),proof_url:z.string().url().optional(),proof_images:z.array(z.string()).max(6).optional()});
export async function GET(_req:Request,{params}:{params:{id:string}}){const db=await createClient();const {data,error}=await db.from('tasks').select('*').eq('id',params.id).single();if(error)return NextResponse.json({error:error.message},{status:404});return NextResponse.json({task:data});}
export async function POST(req:Request,{params}:{params:{id:string}}){
 const auth=await createClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const body=await req.json();const parsed=proof.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Invalid proof data'},{status:400});
 const admin=createAdminClient();const {data:task}=await admin.from('tasks').select('*').eq('id',params.id).single();if(!task||task.status!=='active')return NextResponse.json({error:'Task is not active'},{status:400});
 const {data:existing}=await admin.from('task_submissions').select('id,status').eq('task_id',params.id).eq('user_id',user.id).maybeSingle();if(existing)return NextResponse.json({error:existing.status==='rejected'?'Rejected — task locked for you':'Already submitted',status:existing.status},{status:409});
 if(Number(task.completed_count||0)>=Number(task.slots||0))return NextResponse.json({error:'All slots are filled'},{status:400});
 const hasText=Boolean(parsed.data.proof_text?.trim()),hasUrl=Boolean(parsed.data.proof_url),hasImages=Boolean(parsed.data.proof_images?.length);
 if(task.proof_type==='text'&&!hasText||task.proof_type==='link'&&!hasUrl||task.proof_type==='screenshot'&&!hasImages||task.proof_type==='any'&&!hasText&&!hasUrl&&!hasImages)return NextResponse.json({error:'Proof does not match task requirements'},{status:400});
 const {data,error}=await admin.from('task_submissions').insert({task_id:params.id,user_id:user.id,proof_text:parsed.data.proof_text||null,proof_url:parsed.data.proof_url||null,proof_images:parsed.data.proof_images||[],proof_type:task.proof_type,status:'pending'}).select().single();
 if(error)return NextResponse.json({error:error.code==='23505'?'Already submitted':error.message},{status:400});return NextResponse.json({data});
}
