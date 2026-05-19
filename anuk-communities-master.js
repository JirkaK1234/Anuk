(() => {
  if (window.__anukCommunitiesMaster) return;
  window.__anukCommunitiesMaster = true;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page !== 'feed.html') return;

  const uid = () => localStorage.getItem('anukCurrentUser') || 'local-user';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const nowIso = () => new Date().toISOString();
  const nowText = (v) => new Date(v || Date.now()).toLocaleString('cs-CZ', { dateStyle:'short', timeStyle:'short' });
  const key = 'anukCommunitiesMaster:v1';
  const current = uid();
  const meta = {
    rooms: { singular:'roomka', plural:'Roomky', icon:'⚡', action:'Vstoupit', inside:'Jsi uvnitř', color:'room', expl:'Živý prostor pro rychlý chat, live a společné téma.' },
    groups: { singular:'skupinka', plural:'Skupinky', icon:'👥', action:'Připojit se', inside:'Jsi člen', color:'group', expl:'Dlouhodobá komunita s pravidly, členy a příspěvky.' },
    pages: { singular:'fanpage', plural:'Fanpage', icon:'⭐', action:'Sledovat', inside:'Sleduješ', color:'page', expl:'Stránka pro tvůrce, značku nebo projekt s publikem a statistikami.' }
  };
  const seed = () => ({
    rooms: [{ id:'room-main', kind:'rooms', name:'Hlavní roomka Anuk', privacy:'Veřejná', topic:'Volný chat, rychlé live, domluvy a novinky kolem Anuku.', desc:'Místnost pro lidi, kteří chtějí být online spolu. Roomka je rychlejší než skupina a víc živá než fanpage.', rules:'Respektuj ostatní, žádný spam, live jen k tématu.', avatar:'', cover:'', ownerId:current, members:[current], createdAt:nowIso(), pinned:'Vítej v hlavní roomce. Napiš do chatu nebo přidej příspěvek.', posts:[], chat:[{id:'c1', userId:'anuk', userName:'Anuk', text:'Roomka je připravená. Vstup a napiš první zprávu.', createdAt:nowIso()}], settings:{approval:false, allowMembersPost:true, allowLive:true, discover:true} }],
    groups: [{ id:'group-creators', kind:'groups', name:'Tvůrci Anuk', privacy:'Veřejná', topic:'Nápady, tvorba obsahu, spolupráce a vylepšení profilu.', desc:'Skupinka je komunita na delší dobu. Má jasná pravidla, členy a společný feed.', rules:'Buď slušný, sdílej konstruktivní nápady, reklamu jen po domluvě.', avatar:'', cover:'', ownerId:current, members:[current], createdAt:nowIso(), pinned:'Představ se komunitě a napiš, co tvoříš.', posts:[], chat:[], settings:{approval:false, allowMembersPost:true, allowLive:false, discover:true} }],
    pages: [{ id:'page-anuk', kind:'pages', name:'Anuk Fanpage', privacy:'Veřejná', topic:'Novinky, oznámení a oficiální obsah.', desc:'Fanpage je veřejná stránka pro projekt, tvůrce nebo značku. Lidé ji sledují, ale nepíší do ní jako do roomky.', rules:'Správci publikují novinky. Sledující reagují a komentují.', avatar:'', cover:'', ownerId:current, members:[current], createdAt:nowIso(), pinned:'Sleduj fanpage a měj přehled o novinkách.', posts:[], chat:[], settings:{approval:false, allowMembersPost:false, allowLive:false, discover:true}, stats:{reach:128, weekly:32} }]
  });
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || 'null') || seed(); } catch { return seed(); } };
  const write = (data) => localStorage.setItem(key, JSON.stringify(data));
  let data = read();
  const save = () => write(data);
  let activeKind = 'rooms';
  let activeId = '';

  const findMount = () => document.getElementById('feedList') || document.querySelector('main') || document.body;
  const insert = () => {
    if (document.getElementById('anukCommunitiesMaster')) return;
    const mount = findMount();
    const wrap = document.createElement('section');
    wrap.id = 'anukCommunitiesMaster';
    wrap.className = 'anuk-communities-shell';
    mount.parentNode.insertBefore(wrap, mount);
    renderHome();
  };

  const coverStyle = (item) => item.cover ? `style="background-image:linear-gradient(135deg,rgba(0,0,0,.12),rgba(0,0,0,.28)),url('${esc(item.cover)}')"` : '';
  const avatarStyle = (item) => item.avatar ? `style="background-image:url('${esc(item.avatar)}')"` : '';
  const isIn = (item) => (item.members || []).includes(current);
  const canEdit = (item) => item.ownerId === current;

  const renderShell = (body) => {
    const root = document.getElementById('anukCommunitiesMaster');
    root.className = `anuk-communities-shell anuk-kind-${meta[activeKind].color}`;
    root.innerHTML = `
      <div class="anuk-comm-hero">
        <div class="anuk-comm-hero__top">
          <div><div class="anuk-eyebrow">Komunity Anuk</div><h2>Roomky, skupinky a fanpage</h2><p>Každý typ má jiný smysl: roomky jsou živé místnosti, skupinky jsou komunity a fanpage je veřejná stránka pro tvůrce nebo projekt.</p></div>
          <button class="anuk-btn" data-anuk-reset>Obnovit ukázková data</button>
        </div>
        <div class="anuk-comm-tabs">
          ${Object.entries(meta).map(([k,m])=>`<button class="anuk-comm-tab ${activeKind===k?'is-active':''}" data-kind="${k}"><div class="anuk-comm-tab__icon">${m.icon}</div><strong>${m.plural}</strong><span>${m.expl}</span></button>`).join('')}
        </div>
      </div>
      <div class="anuk-comm-workspace">${body}</div>`;
  };

  const renderHome = () => {
    activeId = '';
    const m = meta[activeKind];
    const items = data[activeKind] || [];
    renderShell(`
      <div class="anuk-comm-toolbar">
        <div><h3>${m.icon} ${m.plural}</h3><p>${m.expl}</p></div>
        <div class="anuk-comm-actions"><button class="anuk-btn anuk-btn--primary" data-create>+ Vytvořit ${m.singular}</button></div>
      </div>
      <div class="anuk-comm-grid">
        <div class="anuk-list">
          ${items.length ? items.map(card).join('') : `<div class="anuk-empty">Zatím tu nic není. Vytvoř první ${m.singular}.</div>`}
        </div>
        <aside class="anuk-side">
          <div class="anuk-side-box"><h4>Jaký je rozdíl?</h4><p><b>Roomka</b> je rychlá živá místnost s chatem. <b>Skupinka</b> je komunita s pravidly a členy. <b>Fanpage</b> je veřejná stránka pro obsah, sledování a novinky.</p></div>
          <div class="anuk-side-box"><h4>Tip pro tvůrce</h4><p>Po vytvoření otevři nastavení a doplň profilovku, úvodní fotku, téma, pravidla a kdo může přidávat příspěvky.</p></div>
        </aside>
      </div>`);
  };

  const card = (item) => `
    <article class="anuk-card anuk-kind-${meta[item.kind].color}">
      <div class="anuk-card__cover" ${coverStyle(item)}><div class="anuk-card__avatar" ${avatarStyle(item)}>${item.avatar?'':meta[item.kind].icon}</div></div>
      <div class="anuk-card__body">
        <div class="anuk-card__head"><div><h4>${esc(item.name)}</h4><p>${esc(item.topic || item.desc || '')}</p></div><span class="anuk-pill">${esc(item.privacy)}</span></div>
        <div class="anuk-pill-row"><span class="anuk-pill">${(item.members||[]).length} ${item.kind==='pages'?'sledujících':'členů'}</span><span class="anuk-pill">${(item.posts||[]).length} příspěvků</span>${item.settings?.approval?'<span class="anuk-pill">schvalování</span>':''}</div>
        <div class="anuk-card__footer"><button class="anuk-btn anuk-btn--primary" data-open="${esc(item.id)}">Otevřít</button><button class="anuk-btn" data-join="${esc(item.id)}">${isIn(item)?meta[item.kind].inside:meta[item.kind].action}</button></div>
      </div>
    </article>`;

  const renderDetail = (id) => {
    const item = (data[activeKind] || []).find(x => x.id === id); if (!item) return renderHome();
    activeId = id; const joined = isIn(item); const editable = canEdit(item);
    renderShell(`
      <div class="anuk-comm-toolbar"><div><h3>${meta[item.kind].icon} ${esc(item.name)}</h3><p>${esc(item.topic || '')}</p></div><div class="anuk-comm-actions"><button class="anuk-btn" data-back>← Zpět</button>${editable?'<button class="anuk-btn anuk-btn--primary" data-settings>⚙️ Nastavení</button>':''}<button class="anuk-btn ${joined?'':'anuk-btn--primary'}" data-join="${esc(item.id)}">${joined?meta[item.kind].inside:meta[item.kind].action}</button></div></div>
      <div class="anuk-detail">
        <main class="anuk-detail-main">
          <section class="anuk-detail-cover"><div class="anuk-detail-cover__image" ${coverStyle(item)}><div class="anuk-detail-avatar" ${avatarStyle(item)}>${item.avatar?'':meta[item.kind].icon}</div></div><div class="anuk-detail-info"><h3>${esc(item.name)}</h3><p>${esc(item.desc || '')}</p><div class="anuk-pill-row"><span class="anuk-pill">${esc(item.privacy)}</span><span class="anuk-pill">${(item.members||[]).length} ${item.kind==='pages'?'sledujících':'členů'}</span><span class="anuk-pill">vytvořeno ${nowText(item.createdAt)}</span></div></div></section>
          ${joined || editable ? composer(item) + posts(item) : `<div class="anuk-empty">${meta[item.kind].action} a uvidíš příspěvky, komentáře a další obsah.</div>`}
        </main>
        <aside class="anuk-detail-side">
          <div class="anuk-side-box"><h4>Připnuté</h4><p>${esc(item.pinned || 'Zatím nic připnutého.')}</p></div>
          <div class="anuk-side-box"><h4>${item.kind==='pages'?'O stránce':'Pravidla'}</h4><p>${esc(item.rules || 'Bez pravidel.')}</p></div>
          <div class="anuk-side-box"><h4>Informace</h4><p>${item.kind==='rooms'?'Roomka má vlastní chat a je určená pro rychlou živou komunikaci.':item.kind==='groups'?'Skupinka je dlouhodobá komunita s členy a pravidly.':'Fanpage je veřejná stránka pro publikování novinek a budování publika.'}</p></div>
          ${item.kind==='rooms' && (joined || editable) ? roomChat(item) : ''}
        </aside>
      </div>`);
  };

  const composer = (item) => {
    const disabled = item.kind === 'pages' && !canEdit(item) && item.settings?.allowMembersPost === false;
    if (disabled) return `<div class="anuk-side-box"><h4>Fanpage</h4><p>Na fanpage publikují hlavně správci. Sledující můžou reagovat a komentovat.</p></div>`;
    return `<section class="anuk-composer"><textarea data-post-text placeholder="Co chceš přidat do ${esc(item.name)}?"></textarea><div class="anuk-card__footer"><span class="anuk-pill">Příspěvek se uloží do této ${meta[item.kind].singular}</span><button class="anuk-btn anuk-btn--primary" data-add-post>Publikovat</button></div></section>`;
  };
  const posts = (item) => `<section class="anuk-list">${(item.posts||[]).length ? item.posts.map(p => post(item,p)).join('') : `<div class="anuk-empty">Zatím žádné příspěvky. Buď první.</div>`}</section>`;
  const post = (item,p) => `<article class="anuk-post" data-post="${esc(p.id)}"><div class="anuk-post__meta">${esc(p.userName || 'Ty')} · ${nowText(p.createdAt)}</div><div class="anuk-post__text">${esc(p.text)}</div><div class="anuk-post__actions"><button class="anuk-btn" data-like="${esc(p.id)}">❤️ ${(p.likes||[]).length}</button><button class="anuk-btn" data-focus-comment="${esc(p.id)}">💬 ${(p.comments||[]).length}</button></div><div class="anuk-comment-list">${(p.comments||[]).map(c=>`<div class="anuk-comment"><strong>${esc(c.userName||'Ty')}</strong><span>${esc(c.text)}</span></div>`).join('')}</div><div class="anuk-inline-input"><input data-comment-input="${esc(p.id)}" placeholder="Napiš komentář..."><button class="anuk-btn anuk-btn--primary" data-add-comment="${esc(p.id)}">Poslat</button></div></article>`;
  const roomChat = (item) => `<div class="anuk-side-box"><h4>Room chat</h4><div class="anuk-room-chat">${(item.chat||[]).map(c=>`<div class="anuk-chat-line"><strong>${esc(c.userName||'Ty')} · ${nowText(c.createdAt)}</strong><span>${esc(c.text)}</span></div>`).join('')}</div><div class="anuk-inline-input"><input data-chat-input placeholder="Napiš zprávu do roomky..."><button class="anuk-btn anuk-btn--primary" data-send-chat>Odeslat</button></div></div>`;

  const renderSettings = (id) => {
    const item = (data[activeKind] || []).find(x => x.id === id); if (!item) return renderHome();
    renderShell(`<div class="anuk-comm-toolbar"><div><h3>⚙️ Nastavení: ${esc(item.name)}</h3><p>Jednoduché pokročilé nastavení s vysvětlivkami. Vidí ho jen vlastník v této lokální verzi.</p></div><div class="anuk-comm-actions"><button class="anuk-btn" data-open="${esc(item.id)}">← Zpět na detail</button></div></div><div class="anuk-detail"><main class="anuk-detail-main"><section class="anuk-settings">
      <div class="anuk-setting-card"><h4>Vzhled</h4><p class="hint">Doplň profilovku a úvodní fotku. Můžeš vložit URL obrázku, nebo použít data URL/base64. Prázdné pole nechá elegantní výchozí gradient.</p><div class="anuk-preview-row"><div class="anuk-preview-avatar" ${avatarStyle(item)}>${item.avatar?'':meta[item.kind].icon}</div><div class="anuk-preview-cover" ${coverStyle(item)}></div></div><div class="anuk-form-grid"><div class="anuk-field"><label>Profilovka / logo</label><input data-set="avatar" value="${esc(item.avatar||'')}" placeholder="https://.../logo.png"></div><div class="anuk-field"><label>Úvodní fotka / cover</label><input data-set="cover" value="${esc(item.cover||'')}" placeholder="https://.../cover.jpg"></div></div></div>
      <div class="anuk-setting-card"><h4>Základní údaje</h4><p class="hint">Název je první věc, kterou uživatel uvidí. Téma říká, co se tu řeší. Popis vysvětluje, proč má člověk vstoupit nebo sledovat.</p><div class="anuk-form-grid"><div class="anuk-field"><label>Název</label><input data-set="name" value="${esc(item.name)}"></div><div class="anuk-field"><label>Viditelnost</label><select data-set="privacy"><option ${item.privacy==='Veřejná'?'selected':''}>Veřejná</option><option ${item.privacy==='Soukromá'?'selected':''}>Soukromá</option><option ${item.privacy==='Pro sledující'?'selected':''}>Pro sledující</option></select></div><div class="anuk-field anuk-field--full"><label>Co se tu řeší</label><input data-set="topic" value="${esc(item.topic||'')}" placeholder="Např. live pokec, tvorba, novinky..."></div><div class="anuk-field anuk-field--full"><label>Popis</label><textarea data-set="desc">${esc(item.desc||'')}</textarea></div></div></div>
      <div class="anuk-setting-card"><h4>Obsah a pravidla</h4><p class="hint">Připnutý text je nahoře v detailu. Pravidla pomáhají udržet komunitu čistou a srozumitelnou.</p><div class="anuk-form-grid"><div class="anuk-field anuk-field--full"><label>Připnutý text</label><textarea data-set="pinned">${esc(item.pinned||'')}</textarea></div><div class="anuk-field anuk-field--full"><label>Pravidla / info</label><textarea data-set="rules">${esc(item.rules||'')}</textarea></div></div></div>
      <div class="anuk-setting-card"><h4>Pokročilé volby</h4><p class="hint">Roomky můžou být živější, skupinky komunitnější a fanpage více řízená správcem.</p><div class="anuk-form-grid"><div class="anuk-field"><label>Schvalovat vstup</label><select data-setting="approval"><option value="false" ${!item.settings?.approval?'selected':''}>Ne</option><option value="true" ${item.settings?.approval?'selected':''}>Ano</option></select></div><div class="anuk-field"><label>Členové můžou přidávat příspěvky</label><select data-setting="allowMembersPost"><option value="true" ${item.settings?.allowMembersPost!==false?'selected':''}>Ano</option><option value="false" ${item.settings?.allowMembersPost===false?'selected':''}>Ne</option></select></div><div class="anuk-field"><label>Povolit live</label><select data-setting="allowLive"><option value="true" ${item.settings?.allowLive?'selected':''}>Ano</option><option value="false" ${!item.settings?.allowLive?'selected':''}>Ne</option></select></div><div class="anuk-field"><label>Zobrazovat v objevování</label><select data-setting="discover"><option value="true" ${item.settings?.discover!==false?'selected':''}>Ano</option><option value="false" ${item.settings?.discover===false?'selected':''}>Ne</option></select></div></div></div>
      <div class="anuk-card__footer"><button class="anuk-btn anuk-btn--danger" data-delete>Odstranit ${meta[item.kind].singular}</button><button class="anuk-btn anuk-btn--primary" data-save-settings>Uložit nastavení</button></div>
    </section></main><aside class="anuk-detail-side"><div class="anuk-side-box"><h4>Rada od designéra</h4><p>Použij krátký název, jasné téma a cover, který poznáš i v malém náhledu. Fanpage by měla mít logo, roomka výrazný cover a skupinka pravidla.</p></div></aside></div>`);
  };

  const createForm = () => {
    const m = meta[activeKind];
    renderShell(`<div class="anuk-comm-toolbar"><div><h3>+ Vytvořit ${m.singular}</h3><p>Nejdřív základ. Další úpravy najdeš po vytvoření v nastavení.</p></div><button class="anuk-btn" data-back>← Zpět</button></div><div class="anuk-detail"><main class="anuk-detail-main"><section class="anuk-settings"><div class="anuk-setting-card"><h4>Základ</h4><p class="hint">Napiš srozumitelně, co to je a proč se má člověk přidat.</p><div class="anuk-form-grid"><div class="anuk-field"><label>Název</label><input data-new="name" placeholder="Název ${m.singular}"></div><div class="anuk-field"><label>Viditelnost</label><select data-new="privacy"><option>Veřejná</option><option>Soukromá</option><option>Pro sledující</option></select></div><div class="anuk-field anuk-field--full"><label>Co se tu řeší</label><input data-new="topic" placeholder="Jednou větou napiš téma."></div><div class="anuk-field anuk-field--full"><label>Popis</label><textarea data-new="desc" placeholder="Krátký popis pro nové lidi."></textarea></div></div></div><button class="anuk-btn anuk-btn--primary" data-create-save>Vytvořit a otevřít nastavení</button></section></main><aside class="anuk-detail-side"><div class="anuk-side-box"><h4>${m.icon} ${m.plural}</h4><p>${m.expl}</p></div></aside></div>`);
  };

  const getItem = () => (data[activeKind] || []).find(x => x.id === activeId);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-kind],[data-create],[data-open],[data-back],[data-join],[data-add-post],[data-like],[data-focus-comment],[data-add-comment],[data-send-chat],[data-settings],[data-save-settings],[data-create-save],[data-delete],[data-anuk-reset]'); if (!t) return;
    if (!document.getElementById('anukCommunitiesMaster')?.contains(t)) return;
    if (t.dataset.kind) { activeKind=t.dataset.kind; renderHome(); return; }
    if (t.dataset.anukReset !== undefined) { data=seed(); save(); renderHome(); return; }
    if (t.dataset.create !== undefined) return createForm();
    if (t.dataset.back !== undefined) return renderHome();
    if (t.dataset.open) return renderDetail(t.dataset.open);
    if (t.dataset.settings !== undefined) return renderSettings(activeId);
    if (t.dataset.join) { const it=(data[activeKind]||[]).find(x=>x.id===t.dataset.join); if (it && !isIn(it)) it.members=[...(it.members||[]), current]; save(); return activeId?renderDetail(activeId):renderHome(); }
    const item = getItem(); if (!item) return;
    if (t.dataset.addPost !== undefined) { const ta=document.querySelector('[data-post-text]'); const text=ta?.value.trim(); if(text){ item.posts.unshift({id:'p'+Date.now(), userId:current, userName:'Ty', text, createdAt:nowIso(), likes:[], comments:[]}); save(); renderDetail(item.id);} return; }
    if (t.dataset.like) { const p=item.posts.find(x=>x.id===t.dataset.like); if(p){ p.likes=p.likes||[]; p.likes.includes(current)?p.likes=p.likes.filter(x=>x!==current):p.likes.push(current); save(); renderDetail(item.id);} return; }
    if (t.dataset.focusComment) { document.querySelector(`[data-comment-input="${CSS.escape(t.dataset.focusComment)}"]`)?.focus(); return; }
    if (t.dataset.addComment) { const input=document.querySelector(`[data-comment-input="${CSS.escape(t.dataset.addComment)}"]`); const text=input?.value.trim(); const p=item.posts.find(x=>x.id===t.dataset.addComment); if(text&&p){ p.comments=p.comments||[]; p.comments.push({id:'cm'+Date.now(), userId:current, userName:'Ty', text, createdAt:nowIso()}); save(); renderDetail(item.id);} return; }
    if (t.dataset.sendChat !== undefined) { const input=document.querySelector('[data-chat-input]'); const text=input?.value.trim(); if(text){ item.chat=item.chat||[]; item.chat.push({id:'ch'+Date.now(), userId:current, userName:'Ty', text, createdAt:nowIso()}); save(); renderDetail(item.id);} return; }
    if (t.dataset.createSave !== undefined) { const get=n=>document.querySelector(`[data-new="${n}"]`)?.value.trim() || ''; const id=activeKind.slice(0,-1)+'-'+Date.now(); const item={id,kind:activeKind,name:get('name')||`Nová ${meta[activeKind].singular}`,privacy:get('privacy')||'Veřejná',topic:get('topic')||'Nové téma',desc:get('desc')||'',rules:'',pinned:'',avatar:'',cover:'',ownerId:current,members:[current],createdAt:nowIso(),posts:[],chat:[],settings:{approval:false,allowMembersPost:activeKind!=='pages',allowLive:activeKind==='rooms',discover:true},stats:{reach:0,weekly:0}}; data[activeKind].unshift(item); save(); activeId=id; renderSettings(id); return; }
    if (t.dataset.saveSettings !== undefined) { document.querySelectorAll('[data-set]').forEach(el=>{ item[el.dataset.set]=el.value; }); item.settings=item.settings||{}; document.querySelectorAll('[data-setting]').forEach(el=>{ item.settings[el.dataset.setting]=el.value==='true'; }); save(); renderDetail(item.id); return; }
    if (t.dataset.delete !== undefined) { data[activeKind]=data[activeKind].filter(x=>x.id!==item.id); save(); renderHome(); return; }
  });
  window.setTimeout(insert, 250);
})();
