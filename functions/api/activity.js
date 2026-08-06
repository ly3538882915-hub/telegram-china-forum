const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
  try{
    const authorization=request.headers.get('authorization')||'';
    if(!authorization.startsWith('Bearer '))return json({error:'unauthorized'},401);
    const me=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{authorization,apikey:env.SUPABASE_SERVICE_ROLE_KEY}});
    if(!me.ok)return json({error:'unauthorized'},401);
    const {id}=await me.json();
    const now=new Date(); now.setSeconds(0,0); now.setMinutes(Math.floor(now.getMinutes()/5)*5);
    const insert=await fetch(`${env.SUPABASE_URL}/rest/v1/user_activity`,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'application/json',prefer:'return=representation'},body:JSON.stringify({user_id:id,slot:now.toISOString()})});
    if(insert.status===409)return json({ok:true,awarded:false});
    if(!insert.ok)return json({error:'activity_save_failed'},500);
    const xp=await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/award_xp`,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'application/json'},body:JSON.stringify({target:id,amount:1})});
    return xp.ok?json({ok:true,awarded:true}):json({error:'xp_failed'},500);
  }catch{return json({error:'activity_failed'},500)}
}
