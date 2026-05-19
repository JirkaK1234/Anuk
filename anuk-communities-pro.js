
(() => {
  if (window.__anukCommunitiesProReady) return;
  window.__anukCommunitiesProReady = true;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page !== 'feed.html') return;
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const uid=()=>localStorage.getItem('anukCurrentUser')||'guest';
  const key='anukCommunitiesPro:v1';
  const now=()=>new Date().toISOString();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const seed=()=>({
    rooms:[{id:'room-main',kind:'rooms',name:'Veřejná roomka Anuk',privacy:'Veřejná',desc:'Hlavní prostor pro společný chat, rychlé domluvy a live.',members:[uid()],roles:{[uid()]:'majitel'},pinned:'Vítej v hlavní roomce Anuk.',posts:[{id:'p1',author:'Anuk',text:'Tady můžeš psát do roomky, připínat téma a domlouvat live.',createdAt:now(),likes:[],comments:[]}],chat:[{id:'m1',author:'Anuk',text:'Roomka je připravená.',createdAt:now()}],rules:'Respekt, žádný spam, žádné urážky.'}],
    groups:[{id:'group-main',kind:'groups',name:'Komunita Anuk',privacy:'Veřejná',desc:'Dlouhodobá skupina pro lidi kolem Anuku.',members:[uid()],roles:{[uid()]:'majitel'},pinned:'Představ se komunitě.',posts:[{id:'p2',author:'Anuk',text:'Skupinky mají členy, pravidla, příspěvky a moderaci.',createdAt:now(),likes:[],comments:[]}],requests:[],rules:'Buď slušný, sdílej relevantní obsah.'}],
    pages:[{id:'page-main',kind:'pages',name:'Anuk Fanpage',privacy:'Veřejná',desc:'Oficiální fanpage pro novinky, oznámení a fanoušky.',followers:[uid()],admins:[uid()],pinned:'Sleduj novinky Anuku.',posts:[{id:'p3',author:'Anuk Fanpage',text:'Fanpage podporuje sledující, příspěvky, připnutý obsah a statistiky.',createdAt:now(),likes:[],comments:[]}],stats:{reach:1280,posts:1,followers:1}}]
  });
  const load=()=>{try{return JSON.parse(localStorage.getItem(key))||seed()}catch{return seed()}};
  const save=d=>localStorage.setItem(key,JSON.stringify(d));
  let data=load(), activeKind='rooms', activeItem=null;
  const labels={rooms:['Roomky','roomku','Vstoupit','Členové'],groups:['Skupinky','skupinku','Přidat se','Členové'],pages:['Fanpage','fanpage','Sledovat','Sledující']};
  const findMount=()=> $('.feed-shell')||$('.feed-main')||$('main')||$('#feedList')?.parentElement||document.body;
  const build=()=>{
    if($('#anukCommunitiesPro')) return;
    const wrap=document.createElement('section'); wrap.id='anukCommunitiesPro'; wrap.className='community-pro collapsed';
    wrap.innerHTML=`<div class="community-entry"><div><p class="eyebrow">Komunity</p><h2>Roomky, skupinky a fanpage</h2><p>Profesionální centrum komunit na feed stránce. Obsah se načte až po kliknutí.</p></div><div class="community-entry-actions"><button class="btn primary" data-open-communities="rooms">Roomky</button><button class="btn" data-open-communities="groups">Skupinky</button><button class="btn" data-open-communities="pages">Fanpage</button></div></div><div class="community-panel" hidden><div class="community-top"><div class="tabs"><button data-tab="rooms">Roomky</button><button data-tab="groups">Skupinky</button><button data-tab="pages">Fanpage</button></div><button class="btn ghost" data-close-communities>Zavřít</button></div><div class="community-body"><aside><button class="btn primary wide" data-create>+ Vytvořit</button><div class="community-list"></div></aside><article class="community-detail"></article></div></div>`;
    const mount=findMount(); mount.insertBefore(wrap, mount.firstChild);
    wrap.addEventListener('click',onClick); render();
  };
  const open=k=>{activeKind=k; $('#anukCommunitiesPro')?.classList.remove('collapsed'); $('.community-panel').hidden=false; activeItem=data[k][0]?.id||null; render();};
  const close=()=>{ $('#anukCommunitiesPro')?.classList.add('collapsed'); $('.community-panel').hidden=true; };
  const onClick=e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.openCommunities) open(b.dataset.openCommunities);
    if(b.dataset.closeCommunities!==undefined) close();
    if(b.dataset.tab){activeKind=b.dataset.tab; activeItem=data[activeKind][0]?.id||null; render();}
    if(b.dataset.select){activeItem=b.dataset.select; render();}
    if(b.dataset.create!==undefined) createItem();
    if(b.dataset.join) joinItem(b.dataset.join);
    if(b.dataset.post) addPost(b.dataset.post);
    if(b.dataset.chat) addChat(b.dataset.chat);
    if(b.dataset.like) likePost(b.dataset.like);
    if(b.dataset.comment) addComment(b.dataset.comment);
  };
  const current=()=>data[activeKind].find(x=>x.id===activeItem)||data[activeKind][0];
  const render=()=>{ const root=$('#anukCommunitiesPro'); if(!root) return; $$('.tabs button',root).forEach(x=>x.classList.toggle('active',x.dataset.tab===activeKind)); renderList(); renderDetail(); };
  const renderList=()=>{ const list=$('.community-list'); if(!list) return; list.innerHTML=data[activeKind].map(i=>`<button class="community-card ${i.id===activeItem?'active':''}" data-select="${i.id}"><b>${esc(i.name)}</b><span>${esc(i.privacy)} • ${count(i)} ${labels[activeKind][3].toLowerCase()}</span><small>${esc(i.desc)}</small></button>`).join('')||'<p class="muted">Zatím nic nevytvořeno.</p>'; };
  const count=i=> activeKind==='pages' ? (i.followers||[]).length : (i.members||[]).length;
  const renderDetail=()=>{ const d=$('.community-detail'); if(!d) return; const i=current(); if(!i){d.innerHTML='<div class="empty-state">Vyber položku nebo vytvoř novou.</div>';return} const joined= activeKind==='pages' ? (i.followers||[]).includes(uid()) : (i.members||[]).includes(uid());
    d.innerHTML=`<div class="detail-hero"><div><p class="eyebrow">${labels[activeKind][0]}</p><h2>${esc(i.name)}</h2><p>${esc(i.desc)}</p><div class="chips"><span>${esc(i.privacy)}</span><span>${count(i)} ${labels[activeKind][3].toLowerCase()}</span><span>${activeKind==='pages'?'Dosah '+(i.stats?.reach||0):'Role '+esc(i.roles?.[uid()]||'návštěvník')}</span></div></div><button class="btn primary" data-join="${i.id}">${joined?'Otevřeno':labels[activeKind][2]}</button></div><div class="pinned"><b>Připnuto:</b> ${esc(i.pinned||'Žádný připnutý obsah.')}</div>${activeKind!=='pages'?`<div class="rules"><b>Pravidla:</b> ${esc(i.rules||'Bez pravidel.')}</div>`:''}<div class="composer"><textarea placeholder="Napiš příspěvek do ${labels[activeKind][1]}..."></textarea><button class="btn primary" data-post="${i.id}">Publikovat</button></div><div class="posts">${(i.posts||[]).map(postHtml).join('')}</div>${activeKind==='rooms'?`<div class="room-chat"><h3>Chat roomky</h3><div class="chat-lines">${(i.chat||[]).map(m=>`<div><b>${esc(m.author)}</b>: ${esc(m.text)}</div>`).join('')}</div><div class="chat-send"><input placeholder="Zpráva do roomky"><button class="btn" data-chat="${i.id}">Odeslat</button></div></div>`:''}`;
  };
  const postHtml=p=>`<article class="community-post"><div><b>${esc(p.author)}</b><time>${new Date(p.createdAt).toLocaleString('cs-CZ')}</time></div><p>${esc(p.text)}</p><div class="post-actions"><button data-like="${p.id}">👍 ${(p.likes||[]).length}</button><button data-comment="${p.id}">Komentář</button><button>Uložit</button><button>Sdílet</button></div>${(p.comments||[]).map(c=>`<div class="comment"><b>${esc(c.author)}</b> ${esc(c.text)}</div>`).join('')}</article>`;
  const createItem=()=>{ const name=prompt(`Název pro ${labels[activeKind][1]}:`); if(!name) return; const desc=prompt('Krátký popis:')||''; const id=activeKind+'-'+Date.now(); const item={id,kind:activeKind,name,privacy:'Veřejná',desc,pinned:'Nově vytvořeno.',posts:[],roles:{[uid()]:'majitel'}}; if(activeKind==='pages'){item.followers=[uid()];item.admins=[uid()];item.stats={reach:0,posts:0,followers:1}}else{item.members=[uid()];item.rules='Respekt a žádný spam.'; if(activeKind==='rooms') item.chat=[]; if(activeKind==='groups') item.requests=[];} data[activeKind].unshift(item); activeItem=id; save(data); render(); };
  const joinItem=id=>{ const i=data[activeKind].find(x=>x.id===id); if(!i)return; const arr=activeKind==='pages'?(i.followers||(i.followers=[])):(i.members||(i.members=[])); if(!arr.includes(uid())) arr.push(uid()); save(data); render(); };
  const addPost=id=>{ const i=data[activeKind].find(x=>x.id===id); const t=$('.community-detail textarea')?.value.trim(); if(!i||!t)return; i.posts=i.posts||[]; i.posts.unshift({id:'post-'+Date.now(),author:'Ty',text:t,createdAt:now(),likes:[],comments:[]}); if(i.stats) i.stats.posts=(i.stats.posts||0)+1; save(data); render(); };
  const addChat=id=>{ const i=data.rooms.find(x=>x.id===id); const t=$('.chat-send input')?.value.trim(); if(!i||!t)return; i.chat=i.chat||[]; i.chat.push({id:'msg-'+Date.now(),author:'Ty',text:t,createdAt:now()}); save(data); render(); };
  const likePost=pid=>{ for(const bucket of Object.values(data)) for(const i of bucket) for(const p of (i.posts||[])) if(p.id===pid){p.likes=p.likes||[]; const u=uid(); p.likes.includes(u)?p.likes=p.likes.filter(x=>x!==u):p.likes.push(u);} save(data); render(); };
  const addComment=pid=>{ const text=prompt('Komentář:'); if(!text)return; for(const bucket of Object.values(data)) for(const i of bucket) for(const p of (i.posts||[])) if(p.id===pid){p.comments=p.comments||[]; p.comments.push({author:'Ty',text,createdAt:now()});} save(data); render(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
