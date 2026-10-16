import {cookies} from 'next/headers';import {createServerClient} from '@supabase/ssr';
export async function createClient(){const store=cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return store.getAll()},setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}})}
export function adminEmailAllowed(email:string|null){return Boolean(email&&process.env.ADMIN_EMAILS?.split(',').map(x=>x.trim().toLowerCase()).includes(email.toLowerCase()))}
