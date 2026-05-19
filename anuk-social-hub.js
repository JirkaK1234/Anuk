(() => {
  if (window.__anukSocialHubReady) return;
  window.__anukSocialHubReady = true;

  const path = location.pathname.split('/').pop() || 'index.html';
  if (!['feed.html', 'account.html'].includes(path)) return;

  const seed = {
    rooms: [
      { name: 'Veřejná roomka Anuk', type: 'Veřejná', desc: 'Rychlý prostor pro společný chat, live a připnuté téma.', members: 24, pinned: 'Vítej v hlavní roomce.' },
      { name: 'Sledující', type: 'Pro sledující', desc: 'Roomka jen pro lidi, kteří se navzájem sledují.', members: 8, pinned: 'Domluvte si společné live.' },
      { name: 'Soukromá parta', type: 'Soukromá', desc: 'Uzavřená místnost na pozvánku.', members: 5, pinned: 'Pravidla: respekt a žádný spam.' }
    ],
    groups: [
      { name: 'Anuk komunita', type: 'Veřejná skupinka', desc: 'Dlouhodobá komunita s pravidly, rolemi a skupinovým feedem.', members: 42, pinned: 'Představ se komunitě.' },
      { name: 'Gaming CZ/SK', type: 'Soukromá skupinka', desc: 'Žádosti o vstup, moderátoři a společné příspěvky.', members: 17, pinned: 'Hledáme moderátory.' }
    ],
    pages: [
      { name: 'Anuk Official', type: 'Fanpage', desc: 'Stránka pro novinky, oznámení a připnuté příspěvky.', members: 128, pinned: 'Nové funkce: roomky, skupinky a hovory.' },
      { name: 'Tvůrci na Anuku', type: 'Fanpage', desc: 'Fanpage pro tvůrce, značky a komunitní projekty.', members: 64, pinned: 'Sdílej svůj obsah.' }
    ]
  };

  const read = () => {
    try { return JSON.parse(localStorage.getItem('anukSocialHub') || 'null') || seed; }
    catch { return seed; }
  };
  const write = (data) => localStorage.setItem('anukSocialHub', JSON.stringify(data));
  const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  let state = read();
  write(state);
  let tab = 'rooms';

  const mount = document.createElement('section');
  mount.className = 'anuk-social-hub';
  mount.innerHTML = `
    <div class="anuk-social-hub__nav" role="tablist" aria-label="Sociální části Anuku">
      <button class="anuk-social-tab active" type="button" data-social-tab="rooms">🏠 Roomky</button>
      <button class="anuk-social-tab" type="button" data-social-tab="groups">👥 Skupinky</button>
      <button class="anuk-social-tab" type="button" data-social-tab="pages">⭐ Fanpage</button>
    </div>
    <div class="anuk-social-panel">
      <div class="anuk-social-panel__head">
        <div><h2 id="anukSocialTitle">Roomky</h2><p class="account-label" id="anukSocialSubtitle">Veřejné, soukromé a pro sledující.</p></div>
        <button class="anuk-social-create" type="button" id="anukSocialCreate">＋ Vytvořit</button>
      </div>
      <div class="anuk-social-grid" id="anukSocialGrid"></div>
    </div>
    <div class="anuk-social-modal" id="anukSocialModal" hidden>
      <form class="anuk-social-modal__card" id="anukSocialForm">
        <h3 id="anukSocialFormTitle">Vytvořit</h3>
        <input name="name" maxlength="80" required placeholder="Název" />
        <select name="type">
          <option>Veřejná</option><option>Soukromá</option><option>Pro sledující</option><option>Fanpage</option>
        </select>
        <textarea name="desc" rows="4" maxlength="300" placeholder="Popis, pravidla nebo téma..."></textarea>
        <div class="anuk-social-modal__actions">
          <button class="anuk-social-tab" type="button" data-social-close>Zavřít</button>
          <button class="anuk-social-create" type="submit">Uložit</button>
        </div>
      </form>
    </div>`;

  const target = document.querySelector('main') || document.querySelector('.page-shell') || document.body;
  if (path === 'feed.html') {
    const composer = document.querySelector('.feed-composer, #feedComposer, .feed-card, .account-card');
    if (composer?.parentNode) composer.parentNode.insertBefore(mount, composer.nextSibling); else target.prepend(mount);
  } else {
    target.prepend(mount);
  }

  const title = mount.querySelector('#anukSocialTitle');
  const subtitle = mount.querySelector('#anukSocialSubtitle');
  const grid = mount.querySelector('#anukSocialGrid');
  const modal = mount.querySelector('#anukSocialModal');
  const form = mount.querySelector('#anukSocialForm');

  const labels = {
    rooms: ['Roomky', 'Veřejné, soukromé a pro sledující. Každá roomka má členy, role, chat, pravidla a připnutý příspěvek.'],
    groups: ['Skupinky', 'Dlouhodobé komunity se žádostmi o vstup, rolemi, moderací a skupinovým feedem.'],
    pages: ['Fanpage', 'Stránky pro tvůrce, značky a komunity s fanoušky, správci a statistikami.']
  };

  const render = () => {
    title.textContent = labels[tab][0];
    subtitle.textContent = labels[tab][1];
    mount.querySelectorAll('[data-social-tab]').forEach((b) => b.classList.toggle('active', b.dataset.socialTab === tab));
    grid.innerHTML = (state[tab] || []).map((item, i) => `
      <article class="anuk-social-card">
        <div class="anuk-social-card__cover"></div>
        <div class="anuk-social-badges"><span>${escape(item.type)}</span><span>${Number(item.members || 1)} členů/sledujících</span><span>Role: majitel · admin · moderátor</span></div>
        <h3>${escape(item.name)}</h3>
        <p>${escape(item.desc)}</p>
        <p>📌 ${escape(item.pinned || 'Připnutý příspěvek zatím není nastaven.')}</p>
        <button type="button" data-open-social="${i}">${tab === 'pages' ? 'Otevřít fanpage' : tab === 'groups' ? 'Otevřít skupinku' : 'Vstoupit do roomky'}</button>
      </article>`).join('');
  };

  mount.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('[data-social-tab]');
    if (tabBtn) { tab = tabBtn.dataset.socialTab; render(); return; }
    if (event.target.closest('#anukSocialCreate')) { modal.hidden = false; form.querySelector('input[name="name"]').focus(); return; }
    if (event.target.closest('[data-social-close]') || event.target === modal) { modal.hidden = true; return; }
    const open = event.target.closest('[data-open-social]');
    if (open) {
      const item = state[tab][Number(open.dataset.openSocial)];
      alert(`${item.name}\n\n${item.desc}\n\nZáklad je připravený: členové, role, pravidla, připnutý příspěvek, chat/live prostor a notifikace.`);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const item = { name: fd.get('name'), type: fd.get('type'), desc: fd.get('desc'), members: 1, pinned: 'Nově vytvořeno.' };
    state[tab] = [item, ...(state[tab] || [])];
    write(state);
    form.reset();
    modal.hidden = true;
    render();
  });

  render();
})();
