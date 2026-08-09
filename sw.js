const CACHE='telegram-cn-v4';
const CORE=['/','/index.html','/styles.css','/mobile.css','/script.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&event.request.url.includes(location.origin))caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request);
    return cached||new Response('网络暂时不可用，请刷新后重试。',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
  }));
});
