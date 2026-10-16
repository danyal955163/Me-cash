import { cookies } from 'next/headers';import { createServerClient } from '@supabase/ssr';
export function createClient(){const cookieStore=cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}})}
export function adminEmailAllowed(email:string|null){return Boolean(email&&process.env.ADMIN_EMAILS?.split(',').map(x=>x.trim().toLowerCase()).includes(email.toLowerCase()))}
