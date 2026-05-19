
(() => {
  if (window.__anukCommunitiesFeedPro) return;
  window.__anukCommunitiesFeedPro = true;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page !== 'feed.html') return;

  const currentUserId = localStorage.getItem('anukCurrentUser') || 'local-user';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const now = () => new Date().toLocaleString('cs-CZ', { dateStyle:'short', timeStyle:'short' });
  const key = 'anukCommunitiesFeedV2';
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || 'null') || seed(); } catch { return seed(); } };
  const write = (data) => localStorage.setItem(key, JSON.stringify(data));
  const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  function seed(){
    const data = {
      rooms:[{id:'room-main',type:'room',name:'Hlavní roomka Anuk',privacy:'Veřejná',desc:'Živý prostor pro chat, live domluvy a rychlé setkání komunity.',ownerId:currentUserId,members:[currentUserId],pinned:'Vítej v hlavní roomce. Domluv se, napiš do chatu nebo přidej příspěvek.',rules:'Respektuj ostatní, žádný spam.',posts:[],chat:[{id:uid('msg'),user:'Anuk',text:'Roomka je připravená. Vstup a napiš první zprávu.',at:now()}]}],
      groups:[{id:'group-creators',type:'group',name:'Tvůrci Anuk',privacy:'Veřejná',desc:'Skupinka pro nápady, obsah, fotky, videa a spolupráce.',ownerId:currentUserId,members:[currentUserId],pinned:'Představ se komunitě.',rules:'Buď v pohodě. Sdílej jen svůj obsah nebo obsah, ke kterému máš práva.',posts:[],chat:[]}],
      pages:[{id:'page-anuk',type:'page',name:'Anuk Fanpage',privacy:'Veřejná stránka',desc:'Fanpage pro novinky, oznámení a komunitní příspěvky.',ownerId:currentUserId,followers:[currentUserId],pinned:'Oficiální stránka Anuk.',rules:'Komentuj slušně.',posts:[],chat:[],stats:{reach:128,visits:42}}]
    };
    write(data); return data;
  }
  let state = read();
  let activeType = '';
  let activeId = '';

  function mount(){
    if (document.getElementById('anukCommunitiesEntry')) return;
    const target = document.querySelector('.feed-shell, main, .account-main, body');
    const el = document.createElement('section');
    el.id = 'anukCommunitiesEntry';
    el.className = 'anuk-communities-entry';
    el.innerHTML = `
      <div class="anuk-communities-entry__head">
        <div><div class="anuk-eyebrow">Komunity</div><h2>Roomky, skupinky a fanpage</h2><div class="anuk-muted">Načtou se až po kliknutí. Vstup, připoj se, sleduj a piš dovnitř.</div></div>
        <button class="anuk-btn secondary" data-anuk-close-shell hidden>Zavřít sekci</button>
      </div>
      <div class="anuk-community-tabs">
        <button class="anuk-community-tab" data-type="rooms"><strong>Roomky</strong><span>Živé místnosti s chatem a členy</span></button>
        <button class="anuk-community-tab" data-type="groups"><strong>Skupinky</strong><span>Dlouhodobé komunity a příspěvky</span></button>
        <button class="anuk-community-tab" data-type="pages"><strong>Fanpage</strong><span>Stránky tvůrců, značek a komunit</span></button>
      </div>
      <div id="anukCommunityShell" class="anuk-community-shell"></div>`;
    const feedList = document.getElementById('feedList');
    if (feedList && feedList.parentElement) feedList.parentElement.insertBefore(el, feedList); else target.prepend(el);
    el.addEventListener('click', onClick);
  }
  function label(type){ return type==='rooms'?'roomku':type==='groups'?'skupinku':'fanpage'; }
  function title(type){ return type==='rooms'?'Roomky':type==='groups'?'Skupinky':'Fanpage'; }
  function collection(type){ return state[type] || []; }
  function isJoined(item,type){ return type==='pages' ? (item.followers||[]).includes(currentUserId) : (item.members||[]).includes(currentUserId); }
  function count(item,type){ return type==='pages' ? (item.followers||[]).length : (item.members||[]).length; }
  function countLabel(type){ return type==='pages' ? 'sledujících' : 'členů'; }
  function openType(type){ activeType=type; activeId=''; document.querySelectorAll('.anuk-community-tab').forEach(b=>b.dataset.active=String(b.dataset.type===type)); document.querySelector('[data-anuk-close-shell]').hidden=false; renderList(); }
  function renderList(filter=''){
    const shell=document.getElementById('anukCommunityShell'); if(!shell) return; shell.classList.add('is-open');
    const items=collection(activeType).filter(i=>(i.name+i.desc+i.privacy).toLowerCase().includes(filter.toLowerCase()));
    shell.innerHTML=`<div class="anuk-community-toolbar"><input class="anuk-community-search" placeholder="Hledat v ${title(activeType).toLowerCase()}..." data-search value="${esc(filter)}"><button class="anuk-btn" data-create>+ Vytvořit ${label(activeType)}</button></div><div class="anuk-community-grid">${items.length?items.map(card).join(''):`<div class="anuk-empty">Zatím tu nic není. Vytvoř první ${label(activeType)}.</div>`}</div>`;
  }
  function card(item){ const joined=isJoined(item,activeType); return `<article class="anuk-community-card"><span class="anuk-pill">${esc(item.privacy)}</span><h3>${esc(item.name)}</h3><p class="anuk-muted">${esc(item.desc)}</p><div class="anuk-view-stats"><span class="anuk-pill">${count(item,activeType)} ${countLabel(activeType)}</span><span class="anuk-pill">${(item.posts||[]).length} příspěvků</span></div><div class="anuk-card-actions"><button class="anuk-btn" data-open="${item.id}">${joined?'Otevřít':'Zobrazit'}</button><button class="anuk-btn secondary" data-join="${item.id}">${activeType==='pages'?(joined?'Sledováno':'Sledovat'):(joined?'Jsi člen':'Vstoupit')}</button></div></article>`; }
  function openDetail(id){ activeId=id; const item=collection(activeType).find(i=>i.id===id); if(!item) return; const joined=isJoined(item,activeType); const shell=document.getElementById('anukCommunityShell'); shell.classList.add('is-open'); shell.innerHTML=`<div class="anuk-community-view is-open"><div class="anuk-view-hero"><div class="anuk-view-top"><div><button class="anuk-btn secondary" data-back>← Zpět na ${title(activeType).toLowerCase()}</button><div class="anuk-eyebrow">${title(activeType)}</div><h2 class="anuk-view-title">${esc(item.name)}</h2><p class="anuk-muted">${esc(item.desc)}</p><div class="anuk-view-stats"><span class="anuk-pill">${esc(item.privacy)}</span><span class="anuk-pill">${count(item,activeType)} ${countLabel(activeType)}</span><span class="anuk-pill">${(item.posts||[]).length} příspěvků</span>${activeType==='pages'?`<span class="anuk-pill">Dosah ${item.stats?.reach||0}</span>`:''}</div></div><div><button class="anuk-btn" data-join="${item.id}">${activeType==='pages'?(joined?'Sledováno':'Sledovat stránku'):(joined?'Jsi uvnitř':'Vstoupit')}</button></div></div></div><div class="anuk-view-body"><div>${joined?postPanel(item):lockedPanel(item)}</div><aside>${infoPanel(item)}${activeType==='rooms'&&joined?chatPanel(item):''}</aside></div></div>`; }
  function lockedPanel(item){ return `<div class="anuk-panel"><h3>Nejdřív se připoj</h3><p class="anuk-muted">Obsah se zobrazí po kliknutí na ${activeType==='pages'?'Sledovat stránku':'Vstoupit'}.</p><button class="anuk-btn" data-join="${item.id}">${activeType==='pages'?'Sledovat stránku':'Vstoupit'}</button></div>`; }
  function postPanel(item){ return `<div class="anuk-panel"><h3>Příspěvky</h3><form class="anuk-post-form" data-post-form><textarea rows="3" name="text" placeholder="Napiš příspěvek do ${esc(item.name)}..."></textarea><button class="anuk-btn" type="submit">Přidat příspěvek</button></form><div>${(item.posts||[]).length?item.posts.map(postHtml).join(''):'<p class="anuk-muted">Zatím žádné příspěvky. Buď první.</p>'}</div></div>`; }
  function postHtml(p){ return `<article class="anuk-post"><div class="anuk-post-meta">${esc(p.user||'Uživatel')} · ${esc(p.at)}</div><div>${esc(p.text)}</div><div class="anuk-card-actions"><button class="anuk-btn secondary" data-like-post="${p.id}">❤ ${p.likes||0}</button><button class="anuk-btn secondary" data-comment-post="${p.id}">Komentovat</button></div>${(p.comments||[]).map(c=>`<div class="anuk-comment"><b>${esc(c.user||'Uživatel')}:</b> ${esc(c.text)}</div>`).join('')}</article>`; }
  function infoPanel(item){ return `<div class="anuk-panel"><h3>Připnuté</h3><p>${esc(item.pinned||'Nic není připnuto.')}</p></div><div class="anuk-panel"><h3>${activeType==='pages'?'Info':'Pravidla'}</h3><p class="anuk-muted">${esc(item.rules||'Bez pravidel.')}</p><div class="anuk-small">Vlastník: ${item.ownerId===currentUserId?'ty':'uživatel'}</div></div>`; }
  function chatPanel(item){ return `<div class="anuk-panel"><h3>Room chat</h3><div>${(item.chat||[]).map(m=>`<div class="anuk-chat-msg"><div class="anuk-post-meta">${esc(m.user)} · ${esc(m.at)}</div>${esc(m.text)}</div>`).join('')||'<p class="anuk-muted">Zatím žádný chat.</p>'}</div><form class="anuk-chat-form" data-chat-form><input name="text" placeholder="Napiš zprávu do roomky..."><button class="anuk-btn" type="submit">Odeslat</button></form></div>`; }
  function openCreate(){ const modal=document.createElement('div'); modal.className='anuk-modal is-open'; modal.innerHTML=`<div class="anuk-modal-card"><div class="anuk-modal-head"><h3>Vytvořit ${label(activeType)}</h3><button class="anuk-close" data-modal-close>×</button></div><form class="anuk-create-form" data-create-form><input name="name" required placeholder="Název"><textarea name="desc" required rows="3" placeholder="Popis"></textarea><select name="privacy"><option>Veřejná</option><option>Soukromá</option><option>Pro sledující</option></select><textarea name="pinned" rows="2" placeholder="Připnuté oznámení"></textarea><textarea name="rules" rows="2" placeholder="Pravidla / info"></textarea><button class="anuk-btn" type="submit">Vytvořit</button></form></div>`; document.body.appendChild(modal); modal.addEventListener('click',e=>{ if(e.target.dataset.modalClose!==undefined||e.target===modal) modal.remove(); }); }
  function join(id){ const item=collection(activeType).find(i=>i.id===id); if(!item) return; const arr=activeType==='pages'?(item.followers=item.followers||[]):(item.members=item.members||[]); if(!arr.includes(currentUserId)) arr.push(currentUserId); write(state); openDetail(id); }
  function onClick(e){ const b=e.target.closest('button'); if(!b) return; if(b.dataset.type) return openType(b.dataset.type); if(b.dataset.open) return openDetail(b.dataset.open); if(b.dataset.join) return join(b.dataset.join); if(b.dataset.back!==undefined) return renderList(); if(b.dataset.create!==undefined) return openCreate(); if(b.dataset.anukCloseShell!==undefined){ document.getElementById('anukCommunityShell').classList.remove('is-open'); b.hidden=true; document.querySelectorAll('.anuk-community-tab').forEach(x=>x.dataset.active='false'); activeType=''; } if(b.dataset.likePost){ const item=collection(activeType).find(i=>i.id===activeId); const p=(item.posts||[]).find(p=>p.id===b.dataset.likePost); if(p){p.likes=(p.likes||0)+1; write(state); openDetail(activeId);} } if(b.dataset.commentPost){ const text=prompt('Napiš komentář:'); if(text){ const item=collection(activeType).find(i=>i.id===activeId); const p=(item.posts||[]).find(p=>p.id===b.dataset.commentPost); p.comments=p.comments||[]; p.comments.push({user:'Ty',text,at:now()}); write(state); openDetail(activeId);} } }
  document.addEventListener('input',e=>{ if(e.target.matches('[data-search]')) renderList(e.target.value); });
  document.addEventListener('submit',e=>{ if(e.target.matches('[data-create-form]')){ e.preventDefault(); const f=new FormData(e.target); const item={id:uid(activeType.slice(0,-1)),type:activeType,name:f.get('name'),privacy:f.get('privacy'),desc:f.get('desc'),ownerId:currentUserId,members:activeType==='pages'?undefined:[currentUserId],followers:activeType==='pages'?[currentUserId]:undefined,pinned:f.get('pinned')||'Nově vytvořeno.',rules:f.get('rules')||'',posts:[],chat:[],stats:{reach:0,visits:0}}; state[activeType].unshift(item); write(state); e.target.closest('.anuk-modal')?.remove(); openDetail(item.id); } if(e.target.matches('[data-post-form]')){ e.preventDefault(); const item=collection(activeType).find(i=>i.id===activeId); const text=new FormData(e.target).get('text').trim(); if(text){ item.posts=item.posts||[]; item.posts.unshift({id:uid('post'),user:'Ty',text,at:now(),likes:0,comments:[]}); write(state); openDetail(activeId);} } if(e.target.matches('[data-chat-form]')){ e.preventDefault(); const item=collection(activeType).find(i=>i.id===activeId); const text=new FormData(e.target).get('text').trim(); if(text){ item.chat=item.chat||[]; item.chat.push({id:uid('msg'),user:'Ty',text,at:now()}); write(state); openDetail(activeId);} } });
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
