const CACHE='dinner-reminder-static-v10-0-0';
const ASSETS=['./','./index.html?v=10.0.0','./manifest.webmanifest?v=10.0.0','./icon-192.png?v=10.0.0','./icon-512.png?v=10.0.0','./icon-180.png?v=10.0.0'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy)).catch(()=>{});}return r}).catch(()=>caches.match('./index.html?v=10.0.0'))));});
self.addEventListener('push',event=>{event.waitUntil((async()=>{let data={};try{data=event.data?event.data.json():{}}catch{try{data={body:event.data?.text()||''}}catch{}}const n=data.notification||data;const title=n.title||'今晚回家吃飯嗎？';const body=n.body||'你有一則家庭通知';const isFamily=data.kind==='family'||data.notificationId||n.kind==='family';const options={body,icon:'./icon-192.png?v=10.0.0',badge:'./icon-192.png?v=10.0.0',tag:data.notificationId||(isFamily?'family-'+Date.now():'dinner-reminder'),renotify:true,requireInteraction:true,data:{...(data.data||{}),notificationId:data.notificationId||'',kind:isFamily?'family':'dinner',time:data.time||'',navigate:data.navigate||'./?page=group'}};options.actions=isFamily?[{action:'home',title:'是'},{action:'away',title:'否'}]:[{action:'home',title:'回家吃飯'},{action:'away',title:'今天不回家'}];await self.registration.showNotification(title,options);try{const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of list)c.postMessage({type:'push-received',payload:data})}catch{}})())});
self.addEventListener('notificationclick',event=>{
  const action=event.action;
  const data=event.notification?.data||{};
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL(data.navigate||'./?page=group',self.location.origin);
    if(action==='home'||action==='away'){url.searchParams.set('reply',action);if(data.time){const d=new Date(data.time);if(!Number.isNaN(d.getTime()))url.searchParams.set('time',d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false}))}if(data.notificationId)url.searchParams.set('notificationId',data.notificationId)}
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of list){try{await c.focus();c.postMessage({type:'quick-reply',action,notificationId:data.notificationId||'',time:data.time||''});return}catch{}}
    await self.clients.openWindow(url.href);
  })());
});
