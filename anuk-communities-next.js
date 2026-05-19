(() => {
  if (window.__anukCommunitiesNext) return;
  window.__anukCommunitiesNext = true;
  if ((location.pathname.split('/').pop() || 'index.html') !== 'feed.html') return;

  const currentUserId = localStorage.getItem('anukCurrentUser') || 'local-user';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const now = () => new Date().toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
  const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const key = 'anukCommunitiesNext:v3';

  const seed = () => ({
    rooms: [
      { id: 'room-main', type: 'room', name: 'Hlavní roomka Anuk', privacy: 'Veřejná', desc: 'Živý prostor pro rychlý chat, live domluvy a společné příspěvky.', ownerId: currentUserId, members: [currentUserId], followers: [], pinned: 'Vítej v hlavní roomce. Sdílej nápad, domluv live nebo napiš do chatu.', rules: 'Respektuj ostatní, žádný spam a žádný toxický obsah.', posts: [], chat: [{ id: uid('msg'), user: 'Anuk', text: 'Roomka je připravená. Napiš první zprávu.', at: now() }], stats: { reach: 320, visits: 81 } },
      { id: 'room-live', type: 'room', name: 'Live domluvy', privacy: 'Pro sledující', desc: 'Místnost pro plánování živých vysílání, testy kamery a rychlé setkání.', ownerId: currentUserId, members: [], followers: [], pinned: 'Sem patří domluvy na live a testovací přenosy.', rules: 'Piš k tématu a respektuj moderátory.', posts: [], chat: [], stats: { reach: 92, visits: 27 } }
    ],
    groups: [
      { id: 'group-creators', type: 'group', name: 'Tvůrci Anuk', privacy: 'Veřejná', desc: 'Skupinka pro nápady, fotky, videa a spolupráce mezi tvůrci.', ownerId: currentUserId, members: [currentUserId], followers: [], pinned: 'Představ se komunitě a napiš, co tvoříš.', rules: 'Sdílej jen vlastní obsah nebo obsah, ke kterému máš práva.', posts: [], chat: [], stats: { reach: 184, visits: 54 } }
    ],
    pages: [
      { id: 'page-anuk', type: 'page', name: 'Anuk Fanpage', privacy: 'Veřejná stránka', desc: 'Fanpage pro novinky, oznámení a komunitní příspěvky.', ownerId: currentUserId, members: [], followers: [currentUserId], pinned: 'Oficiální stránka Anuk.', rules: 'Komentuj slušně a k věci.', posts: [], chat: [], stats: { reach: 128, visits: 42 } }
    ]
  });
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || 'null') || seed(); } catch { return seed(); } };
  const write = (data) => localStorage.setItem(key, JSON.stringify(data));
  let state = read();
  let activeType = '';
  let activeId = '';

  const types = {
    rooms: { title: 'Roomky', one: 'roomku', cta: 'Vstoupit', joined: 'Jsi uvnitř', icon: '◌', subtitle: 'Živé místnosti s chatem a rychlými příspěvky' },
    groups: { title: 'Skupinky', one: 'skupinku', cta: 'Připojit se', joined: 'Připojeno', icon: '◆', subtitle: 'Komunity s pravidly, členy a příspěvky' },
    pages: { title: 'Fanpage', one: 'fanpage', cta: 'Sledovat', joined: 'Sleduješ', icon: '✦', subtitle: 'Stránky tvůrců, projektů a komunit' }
  };
  const col = (t = activeType) => state[t] || [];
  const isMember = (item, t = activeType) => t === 'pages' ? (item.followers || []).includes(currentUserId) : (item.members || []).includes(currentUserId);
  const count = (item, t = activeType) => t === 'pages' ? (item.followers || []).length : (item.members || []).length;
  const countLabel = (t = activeType) => t === 'pages' ? 'sledujících' : 'členů';

  function mount() {
    document.getElementById('anukCommunitiesEntry')?.remove();
    const feedList = document.getElementById('feedList');
    const parent = feedList?.parentElement || document.querySelector('main') || document.body;
    const el = document.createElement('section');
    el.id = 'anukCommunitiesEntry';
    el.className = 'anuk-communities-entry anuk-next';
    el.innerHTML = `
      <div class="anuk-next-head">
        <div>
          <div class="anuk-eyebrow">Komunity</div>
          <h2>Roomky, skupinky a fanpage</h2>
          <p>Vyber sekci, otevři komunitu a piš dovnitř bez zbytečných vyskakovacích oken.</p>
        </div>
        <button class="anuk-btn anuk-btn--ghost" data-close-shell hidden>Zavřít</button>
      </div>
      <div class="anuk-next-tabs" role="tablist">
        ${Object.entries(types).map(([type, meta]) => `<button class="anuk-next-tab" data-type="${type}" role="tab"><span>${meta.icon}</span><strong>${meta.title}</strong><small>${meta.subtitle}</small></button>`).join('')}
      </div>
      <div id="anukCommunityShell" class="anuk-next-shell" aria-live="polite"></div>`;
    if (feedList) parent.insertBefore(el, feedList); else parent.prepend(el);
    el.addEventListener('click', handleClick);
  }

  function openType(type) {
    activeType = type; activeId = '';
    document.querySelector('[data-close-shell]')?.removeAttribute('hidden');
    document.querySelectorAll('.anuk-next-tab').forEach(b => b.dataset.active = String(b.dataset.type === type));
    renderList();
  }

  function renderList(filter = '') {
    const shell = document.getElementById('anukCommunityShell'); if (!shell || !activeType) return;
    shell.classList.add('is-open');
    const meta = types[activeType];
    const items = col().filter(i => `${i.name} ${i.desc} ${i.privacy}`.toLowerCase().includes(filter.toLowerCase()));
    shell.innerHTML = `
      <div class="anuk-list-head">
        <div><h3>${meta.title}</h3><p>${meta.subtitle}</p></div>
        <button class="anuk-btn" data-create>+ Vytvořit ${meta.one}</button>
      </div>
      <div class="anuk-tools"><input class="anuk-search" data-search value="${esc(filter)}" placeholder="Hledat v ${meta.title.toLowerCase()}..."></div>
      <div class="anuk-grid">${items.length ? items.map(cardHtml).join('') : `<div class="anuk-empty">Zatím tu nic není. Vytvoř první ${meta.one}.</div>`}</div>`;
  }

  function cardHtml(item) {
    const joined = isMember(item);
    return `<article class="anuk-community-card ${joined ? 'is-joined' : ''}">
      <div class="anuk-card-cover"><span>${types[activeType].icon}</span></div>
      <div class="anuk-card-body">
        <div class="anuk-card-line"><span class="anuk-pill">${esc(item.privacy)}</span><span class="anuk-pill">${count(item)} ${countLabel()}</span></div>
        <h3>${esc(item.name)}</h3>
        <p>${esc(item.desc)}</p>
        <div class="anuk-card-line"><span>${(item.posts || []).length} příspěvků</span><span>${activeType === 'rooms' ? `${(item.chat || []).length} zpráv` : `Dosah ${item.stats?.reach || 0}`}</span></div>
        <div class="anuk-actions"><button class="anuk-btn" data-open="${item.id}">${joined ? 'Otevřít' : 'Zobrazit'}</button><button class="anuk-btn anuk-btn--soft" data-join="${item.id}">${joined ? types[activeType].joined : types[activeType].cta}</button></div>
      </div>
    </article>`;
  }

  function openDetail(id) {
    activeId = id;
    const item = col().find(i => i.id === id); if (!item) return;
    const joined = isMember(item);
    const shell = document.getElementById('anukCommunityShell'); shell.classList.add('is-open');
    shell.innerHTML = `<section class="anuk-detail">
      <div class="anuk-detail-hero">
        <button class="anuk-btn anuk-btn--ghost" data-back>← Zpět na ${types[activeType].title.toLowerCase()}</button>
        <div class="anuk-detail-title"><div class="anuk-detail-icon">${types[activeType].icon}</div><div><div class="anuk-eyebrow">${types[activeType].title}</div><h2>${esc(item.name)}</h2><p>${esc(item.desc)}</p></div></div>
        <div class="anuk-detail-stats"><span class="anuk-pill">${esc(item.privacy)}</span><span class="anuk-pill">${count(item)} ${countLabel()}</span><span class="anuk-pill">${(item.posts || []).length} příspěvků</span>${activeType === 'pages' ? `<span class="anuk-pill">Dosah ${item.stats?.reach || 0}</span>` : ''}</div>
        <button class="anuk-btn" data-join="${item.id}">${joined ? types[activeType].joined : types[activeType].cta}</button>
      </div>
      <div class="anuk-detail-layout">
        <main class="anuk-detail-main">${joined ? composerHtml(item) + postsHtml(item) : lockedHtml(item)}</main>
        <aside class="anuk-detail-side">${infoHtml(item)}${activeType === 'rooms' && joined ? chatHtml(item) : ''}</aside>
      </div>
    </section>`;
  }

  function lockedHtml(item) { return `<div class="anuk-panel anuk-locked"><h3>Obsah je připravený</h3><p>Pro příspěvky, komentáře a ${activeType === 'rooms' ? 'room chat' : 'komunitní obsah'} se nejdřív připoj.</p><button class="anuk-btn" data-join="${item.id}">${types[activeType].cta}</button></div>`; }
  function composerHtml(item) { return `<form class="anuk-composer" data-post-form><textarea name="text" rows="3" placeholder="Napiš příspěvek do ${esc(item.name)}..."></textarea><div class="anuk-composer-foot"><span>Viditelné uvnitř této komunity</span><button class="anuk-btn" type="submit">Přidat příspěvek</button></div></form>`; }
  function postsHtml(item) { const posts = item.posts || []; return `<div class="anuk-post-list">${posts.length ? posts.map(postHtml).join('') : `<div class="anuk-empty">Zatím žádné příspěvky. Buď první.</div>`}</div>`; }
  function postHtml(p) {
    return `<article class="anuk-post" data-post-id="${esc(p.id)}">
      <div class="anuk-post-top"><div class="anuk-avatar">T</div><div><strong>${esc(p.user || 'Ty')}</strong><small>${esc(p.at)}</small></div></div>
      <div class="anuk-post-text">${esc(p.text)}</div>
      <div class="anuk-post-actions"><button class="anuk-mini-btn" data-like-post="${esc(p.id)}">❤ ${p.likes || 0}</button><button class="anuk-mini-btn" data-focus-comment="${esc(p.id)}">💬 ${(p.comments || []).length}</button></div>
      <div class="anuk-comments">${(p.comments || []).map(c => `<div class="anuk-comment"><div class="anuk-avatar small">T</div><div><b>${esc(c.user || 'Ty')}</b><p>${esc(c.text)}</p><small>${esc(c.at)}</small></div></div>`).join('')}</div>
      <form class="anuk-comment-bar" data-comment-form="${esc(p.id)}"><input name="text" autocomplete="off" placeholder="Napsat komentář..."><button type="submit">Poslat</button></form>
    </article>`;
  }
  function infoHtml(item) { return `<div class="anuk-panel"><h3>Připnuté</h3><p>${esc(item.pinned || 'Nic není připnuto.')}</p></div><div class="anuk-panel"><h3>${activeType === 'pages' ? 'Info stránky' : 'Pravidla'}</h3><p>${esc(item.rules || 'Bez pravidel.')}</p><small>Vlastník: ${item.ownerId === currentUserId ? 'ty' : 'uživatel'}</small></div>`; }
  function chatHtml(item) { return `<div class="anuk-panel anuk-room-chat"><h3>Room chat</h3><div class="anuk-chat-stream">${(item.chat || []).map(m => `<div class="anuk-chat-msg"><b>${esc(m.user)}</b><p>${esc(m.text)}</p><small>${esc(m.at)}</small></div>`).join('') || '<p class="anuk-muted">Zatím žádný chat.</p>'}</div><form class="anuk-chat-form" data-chat-form><input name="text" placeholder="Napiš zprávu..."><button class="anuk-btn" type="submit">Odeslat</button></form></div>`; }

  function openCreate() {
    const meta = types[activeType];
    const modal = document.createElement('div'); modal.className = 'anuk-create-modal';
    modal.innerHTML = `<div class="anuk-create-card"><div class="anuk-create-head"><h3>Vytvořit ${meta.one}</h3><button class="anuk-close" data-modal-close>×</button></div><form data-create-form class="anuk-create-form"><label>Název<input name="name" required maxlength="60" placeholder="Např. Gaming CZ/SK"></label><label>Popis<textarea name="desc" required rows="3" placeholder="O čem komunita je?"></textarea></label><label>Viditelnost<select name="privacy"><option>Veřejná</option><option>Soukromá</option><option>Pro sledující</option></select></label><label>Připnuté<textarea name="pinned" rows="2" placeholder="Důležitá zpráva nahoře"></textarea></label><label>Pravidla / info<textarea name="rules" rows="2" placeholder="Pravidla, kontakt nebo popis"></textarea></label><button class="anuk-btn" type="submit">Vytvořit a otevřít</button></form></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal || e.target.dataset.modalClose !== undefined) modal.remove(); });
  }

  function join(id) { const item = col().find(i => i.id === id); if (!item) return; const arr = activeType === 'pages' ? (item.followers ||= []) : (item.members ||= []); if (!arr.includes(currentUserId)) arr.push(currentUserId); write(state); openDetail(id); }

  function handleClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.type) return openType(b.dataset.type);
    if (b.dataset.open) return openDetail(b.dataset.open);
    if (b.dataset.join) return join(b.dataset.join);
    if (b.dataset.back !== undefined) return renderList();
    if (b.dataset.create !== undefined) return openCreate();
    if (b.dataset.closeShell !== undefined) { document.getElementById('anukCommunityShell')?.classList.remove('is-open'); b.hidden = true; activeType = ''; document.querySelectorAll('.anuk-next-tab').forEach(x => x.dataset.active = 'false'); return; }
    if (b.dataset.likePost) { const item = col().find(i => i.id === activeId); const p = (item?.posts || []).find(x => x.id === b.dataset.likePost); if (p) { p.likes = (p.likes || 0) + 1; write(state); openDetail(activeId); } return; }
    if (b.dataset.focusComment) { const input = document.querySelector(`[data-comment-form="${CSS.escape(b.dataset.focusComment)}"] input`); input?.focus(); return; }
  }

  document.addEventListener('input', e => { if (e.target.matches('[data-search]')) renderList(e.target.value); });
  document.addEventListener('submit', e => {
    if (e.target.matches('[data-create-form]')) { e.preventDefault(); const f = new FormData(e.target); const item = { id: uid(activeType.slice(0, -1)), type: activeType, name: String(f.get('name') || '').trim(), privacy: String(f.get('privacy') || 'Veřejná'), desc: String(f.get('desc') || '').trim(), ownerId: currentUserId, members: activeType === 'pages' ? [] : [currentUserId], followers: activeType === 'pages' ? [currentUserId] : [], pinned: String(f.get('pinned') || 'Nově vytvořeno.').trim(), rules: String(f.get('rules') || '').trim(), posts: [], chat: [], stats: { reach: 0, visits: 0 } }; state[activeType].unshift(item); write(state); e.target.closest('.anuk-create-modal')?.remove(); openDetail(item.id); return; }
    if (e.target.matches('[data-post-form]')) { e.preventDefault(); const item = col().find(i => i.id === activeId); const text = String(new FormData(e.target).get('text') || '').trim(); if (item && text) { item.posts ||= []; item.posts.unshift({ id: uid('post'), user: 'Ty', text, at: now(), likes: 0, comments: [] }); write(state); openDetail(activeId); } return; }
    if (e.target.matches('[data-chat-form]')) { e.preventDefault(); const item = col().find(i => i.id === activeId); const text = String(new FormData(e.target).get('text') || '').trim(); if (item && text) { item.chat ||= []; item.chat.push({ id: uid('msg'), user: 'Ty', text, at: now() }); write(state); openDetail(activeId); } return; }
    const commentForm = e.target.closest('[data-comment-form]');
    if (commentForm) { e.preventDefault(); const item = col().find(i => i.id === activeId); const post = (item?.posts || []).find(p => p.id === commentForm.dataset.commentForm); const text = String(new FormData(commentForm).get('text') || '').trim(); if (post && text) { post.comments ||= []; post.comments.push({ id: uid('comment'), user: 'Ty', text, at: now() }); write(state); openDetail(activeId); } }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
