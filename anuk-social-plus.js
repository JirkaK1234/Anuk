(() => {
  if (window.__anukSocialPlus) return; window.__anukSocialPlus = true;
  const store = (k, v) => v === undefined ? JSON.parse(localStorage.getItem(k) || '[]') : localStorage.setItem(k, JSON.stringify(v));
  const seed = (k, items) => { if (!localStorage.getItem(k)) store(k, items); };
  seed('anukRooms', [{id:'room-public',name:'Veřejná roomka',privacy:'veřejná',members:1,pinned:'Vítej v Anuk roomkách.',role:'majitel'}]);
  seed('anukGroups', [{id:'grp-anuk',name:'Komunita Anuk',privacy:'veřejná',members:1,rules:'Respekt, žádný spam.',role:'majitel'}]);
  seed('anukPages', [{id:'page-anuk',name:'Anuk Fanpage',followers:1,stats:{reach:0,posts:0},pinned:'Oficiální stránka projektu Anuk.'}]);
  const cssReady = () => document.documentElement.classList.add('anuk-social-ready');
  const createCallOverlay = () => {
    let el = document.getElementById('anukCallOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'anukCallOverlay'; el.hidden = true;
    el.innerHTML = `<div class="anuk-call-card" role="dialog" aria-modal="true"><h2 id="anukCallTitle">Hovor</h2><div class="anuk-muted" id="anukCallSubtitle">Hovor je vždy nad chatem.</div><div class="anuk-call-actions"><button class="anuk-good" data-call="accept">Přijmout</button><button data-call="mute">Ztlumit mikrofon</button><button data-call="camera">Vypnout kameru</button><button data-call="min">Minimalizovat</button><button class="anuk-danger" data-call="end">Ukončit</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { const a=e.target?.dataset?.call; if(!a) return; if(a==='end') el.hidden=true; if(a==='min') el.querySelector('.anuk-call-card').classList.toggle('fullscreen'); });
    return el;
  };
  window.AnukCall = { show(name='Uživatel'){ const el=createCallOverlay(); el.hidden=false; el.querySelector('#anukCallSubtitle').textContent=`Volání s: ${name}`; document.body.appendChild(el); }};
  document.addEventListener('click', e => { const t=e.target; if (t?.matches?.('[data-call-user], .call-button, .start-call, [aria-label*="vol" i]')) setTimeout(()=>window.AnukCall.show(t.dataset.callUser || t.textContent?.trim() || 'Uživatel'),0); }, true);
  const panel = document.createElement('section'); panel.className='anuk-card'; panel.innerHTML=`<h2>Anuk centrum</h2><p class="anuk-muted">Roomky, skupinky a fanpage jsou připravené jako lokální modul napojený přes localStorage. Backend rozšíření je možné doplnit do SQLite/API.</p><div class="anuk-tabbar"><button data-open-social="rooms">Roomky</button><button data-open-social="groups">Skupinky</button><button data-open-social="pages">Fanpage</button><button onclick="AnukCall.show('Test')">Test hovoru</button></div><div id="anukSocialList" class="anuk-grid"></div>`;
  const render = type => { const key = type==='rooms'?'anukRooms':type==='groups'?'anukGroups':'anukPages'; const list=document.getElementById('anukSocialList'); if(!list)return; list.innerHTML=store(key).map(x=>`<article class="anuk-card"><h3>${x.name}</h3><p class="anuk-muted">${x.privacy||'fanpage'} · ${x.members||x.followers||0} členů/sledujících</p><p>${x.pinned||x.rules||'Připraveno.'}</p><button class="anuk-pill">Otevřít</button></article>`).join(''); };
  document.addEventListener('click', e => { if(e.target?.dataset?.openSocial) render(e.target.dataset.openSocial); });
  window.addEventListener('DOMContentLoaded',()=>{ cssReady(); createCallOverlay(); const main=document.querySelector('main,.app,.container,.account-shell,.feed-shell,body'); if(main && !document.getElementById('anukSocialList')) main.appendChild(panel); render('rooms'); });
})();
