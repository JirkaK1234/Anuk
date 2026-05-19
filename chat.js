(() => {
  const currentUserId = localStorage.getItem('anukCurrentUser');
  if (!currentUserId) return;

  const ensureChatModal = () => {
    const existing = document.getElementById('chatsModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="chatsModal" aria-hidden="true">
        <div class="modal__backdrop" data-close="true" aria-hidden="true"></div>
        <div class="modal__panel modal__panel--wide modal__panel--chat" role="dialog" aria-modal="true" aria-labelledby="chatsModalTitle">
          <div class="modal__header chat-modal-header">
            <div>
              <div class="modal__title" id="chatsModalTitle">Chaty</div>
              <div class="account-label">Vzájemné sledování píše přímo, jednostranné sledování jde do žádostí.</div>
            </div>
            <button class="modal__close" type="button" aria-label="Zavřít" data-close="true">&times;</button>
          </div>
          <div class="modal__body chat-shell">
            <aside class="chat-sidebar">
              <label class="field">
                <span class="field__label">Vyhledat sledované</span>
                <input class="field__input" type="search" id="chatSearch" placeholder="Jméno uživatele..." />
              </label>
              <div class="chat-tabs" role="tablist" aria-label="Chaty">
                <button class="reaction-btn active chat-tab-btn" type="button" data-chat-tab="threads"><span class="chat-btn__icon">💬</span><span class="chat-btn__label">Chaty</span></button>
                <button class="reaction-btn chat-tab-btn" type="button" data-chat-tab="requests"><span class="chat-btn__icon">✉️</span><span class="chat-btn__label">Žádosti</span></button>
                <button class="reaction-btn chat-tab-btn" type="button" data-chat-tab="contacts"><span class="chat-btn__icon">👥</span><span class="chat-btn__label">Kontakty</span></button>
              </div>
              <div class="chat-list" id="chatList"></div>
            </aside>

            <section class="chat-panel">
              <div class="chat-panel__empty" id="chatEmpty">Vyber konverzaci nebo uživatele ze seznamu.</div>
              <div class="chat-panel__content" id="chatContent" hidden>
                <header class="chat-header">
                  <div class="user-row__left">
                    <button class="reaction-btn chat-back-btn" id="chatBackButton" type="button" aria-label="Zpět">←</button>
                    <div class="user-row__avatar" id="chatAvatar"></div>
                    <div class="user-row__name">
                      <strong id="chatName">Chat</strong>
                      <span id="chatMeta">Připraveno</span>
                    </div>
                  </div>
                  <div class="chat-call-actions">
                    <button class="reaction-btn chat-action-btn" id="chatCallAudio" type="button" aria-label="Audio hovor"><span class="chat-btn__icon">☎️</span><span class="chat-btn__label">Volat</span></button>
                    <button class="reaction-btn chat-action-btn" id="chatCallVideo" type="button" aria-label="Video hovor"><span class="chat-btn__icon">📹</span><span class="chat-btn__label">Kamera</span></button>
                    <button class="reaction-btn chat-action-btn" id="chatMediaHistoryButton" type="button" aria-label="Média"><span class="chat-btn__icon">🖼️</span><span class="chat-btn__label">Média</span></button>
                  </div>
                </header>

                <div class="chat-request-bar" id="chatRequestBar" hidden>
                  <span>✉️ Žádost o zprávu</span>
                  <button class="reaction-btn" type="button" id="chatAcceptRequest">Přijmout</button>
                  <button class="reaction-btn" type="button" id="chatRejectRequest">Odmítnout</button>
                </div>

                <div class="chat-messages" id="chatMessages"></div>

                <form class="chat-composer" id="chatForm">
                  <button class="reaction-btn chat-tools-toggle" type="button" id="chatToolsToggle" aria-label="Přílohy">＋</button>
                  <div class="chat-tools" id="chatTools" hidden>
                    <button type="button" data-chat-tool="camera">📸 Vyfotit</button>
                    <button type="button" data-chat-tool="video">🎬 Natočit video</button>
                    <button type="button" data-chat-tool="image">🖼️ Poslat foto</button>
                    <button type="button" data-chat-tool="emoji">😊 Emoji</button>
                  </div>
                  <input type="file" id="chatAttachmentInput" accept="image/*,video/*" hidden />
                  <div class="chat-compose-stack">
                    <div class="chat-quick-replies" id="chatQuickReplies" hidden>
                      <button type="button" data-quick-reply="Ahoj, jak se máš?">Ahoj</button>
                      <button type="button" data-quick-reply="Jasně, souhlasím.">Souhlasím</button>
                      <button type="button" data-quick-reply="Ozvu se později.">Později</button>
                    </div>
                    <div class="chat-attachment-chip" id="chatAttachmentChip" hidden></div>
                    <textarea id="chatMessageInput" rows="1" placeholder="Napiš zprávu..." maxlength="2000"></textarea>
                  </div>
                  <div class="chat-emoji-panel" id="chatEmojiPanel" hidden></div>
                  <button class="reaction-btn chat-send-button" type="submit" aria-label="Odeslat">➤</button>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    `);

    return document.getElementById('chatsModal');
  };

  const modal = ensureChatModal();
  const openButtons = Array.from(document.querySelectorAll('#feedChatsCorner, #accountChatsButton, #userChatButton, .js-open-chats'));
  const chatList = document.getElementById('chatList');
  const chatSearch = document.getElementById('chatSearch');
  const chatEmpty = document.getElementById('chatEmpty');
  const chatContent = document.getElementById('chatContent');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatName = document.getElementById('chatName');
  const chatMeta = document.getElementById('chatMeta');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('chatMessageInput');
  const toolsToggle = document.getElementById('chatToolsToggle');
  const tools = document.getElementById('chatTools');
  const quickReplies = document.getElementById('chatQuickReplies');
  const attachmentChip = document.getElementById('chatAttachmentChip');
  const attachmentInput = document.getElementById('chatAttachmentInput');
  const emojiPanel = document.getElementById('chatEmojiPanel');
  const requestBar = document.getElementById('chatRequestBar');
  const acceptRequest = document.getElementById('chatAcceptRequest');
  const rejectRequest = document.getElementById('chatRejectRequest');
  const callAudio = document.getElementById('chatCallAudio');
  const callVideo = document.getElementById('chatCallVideo');
  const mediaHistoryButton = document.getElementById('chatMediaHistoryButton');
  const backButton = document.getElementById('chatBackButton');

  if (!modal || !openButtons.length || !chatList || !chatContent) return;

  let threads = [];
  let contacts = [];
  let activeTab = 'threads';
  let activeThread = null;
  let activeContact = null;
  let pendingAttachment = null;
  let pollTimer = 0;
  const lastRenderedThreadSig = new Map();
  let pendingOpenUserId = '';
  let cameraStream = null;
  let callStream = null;
  let callOverlay = null;
  let callTimer = 0;
  let callStartedAt = 0;
  let callPc = null;
  let callSignalTimer = 0;
  let callLastIceTs = 0;
  let callRemoteStream = null;
  let activeCallThreadId = '';
  let activeCallMessageId = '';
  let activeCallKind = '';
  let realtimeTimer = 0;
  let handledIncomingCalls = new Set();
  let chatRecorder = null;
  let chatRecordTimer = 0;
  let chatRecordStartedAt = 0;
  let chatRecordChunks = [];
  let lastUnreadCount = 0;
  let chatUserHasScrolled = false;

  const setMobileThreadView = (enabled) => {
    // Na mobilu schová seznam a nechá jen konverzaci (víc místa na zprávy).
    modal.classList.toggle('chat-mobile-thread', Boolean(enabled));
  };

  const messagesSignature = (messages) => {
    const arr = Array.isArray(messages) ? messages : [];
    const tail = arr.slice(-12);
    return `${arr.length}:${tail.map((m) => String(m?.id || '')).join('|')}`;
  };

  const getPreferences = () => {
    try {
      return JSON.parse(localStorage.getItem('anukPreferences') || '{}') || {};
    } catch {
      return {};
    }
  };

  const playChatSound = () => {
    const prefs = getPreferences();
    if (!prefs.chatSound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  const getApiBase = () => {
    const forced = window.ANUK_API_BASE || document.querySelector('meta[name="anuk-api-base"]')?.content;
    if (forced) return String(forced).replace(/\/$/, '');
    const { protocol, origin } = window.location;
    if (protocol === 'http:' || protocol === 'https:') return origin;
    return '';
  };
  const getCookie = (name) => {
    const prefix = `${encodeURIComponent(name)}=`;
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || '';
  };

  const createApiError = (data, response, fallback) => {
    const apiError = data?.error || {};
    const title = apiError.name || data?.code || 'Chyba';
    const fix = apiError.fix || data?.message || fallback;
    const firstStep = Array.isArray(apiError.steps) && apiError.steps.length ? ` Co dál: ${apiError.steps[0]}` : '';
    const error = new Error(`${title}: ${fix}${firstStep}`);
    error.status = response.status;
    error.code = data?.code || apiError.code || '';
    error.details = apiError;
    return error;
  };

  const api = async (path, options = {}) => {
    if (!currentUserId) await syncCurrentUserFromSession();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (currentUserId) headers['x-user-id'] = currentUserId;
    const method = String(options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN'));
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }
    const fetchOptions = { credentials: 'same-origin', ...options, headers };
    if (options.body) fetchOptions.body = JSON.stringify(options.body);
    else delete fetchOptions.body;

    let response = await fetch(getApiBase() + path, fetchOptions);
    let data = await response.json().catch(() => ({}));
    if ((response.status === 401 || response.status === 403) && await syncCurrentUserFromSession()) {
      if (currentUserId) fetchOptions.headers['x-user-id'] = currentUserId;
      response = await fetch(getApiBase() + path, fetchOptions);
      data = await response.json().catch(() => ({}));
    }
    if (!response.ok) throw createApiError(data, response, 'Chyba serveru');
    return data;
  };

  const apiForm = async (path, formData, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (currentUserId) headers['x-user-id'] = currentUserId;
    const method = String(options.method || 'POST').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN'));
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }
    const response = await fetch(getApiBase() + path, {
      credentials: 'same-origin',
      ...options,
      method,
      headers,
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw createApiError(data, response, 'Chyba pri nahravani souboru');
    return data;
  };

  const uploadAsset = async (file, fileName = '') => {
    const formData = new FormData();
    formData.append('file', file, fileName || file?.name || `chat-${Date.now()}`);
    return apiForm('/api/uploads', formData);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const displayName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.contact || 'Uživatel';
  const formatTime = (value) => value ? new Date(value).toLocaleString() : '';
  const formatDuration = (seconds) => {
    const safe = Math.max(0, Number(seconds || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stopStream = (stream) => {
    stream?.getTracks?.().forEach((track) => track.stop());
  };

  const closeFloatingPanels = () => {
    if (tools) tools.hidden = true;
    if (emojiPanel) emojiPanel.hidden = true;
    if (quickReplies) quickReplies.hidden = true;
  };

  const updateAttachmentChip = () => {
    if (!attachmentChip) return;
    if (!pendingAttachment) {
      attachmentChip.hidden = true;
      attachmentChip.innerHTML = '';
      return;
    }
    const label = pendingAttachment.type === 'video' ? 'Video připravené' : 'Fotka připravená';
    attachmentChip.hidden = false;
    attachmentChip.innerHTML = `
      <span>${escapeHtml(label)} · ${escapeHtml(pendingAttachment.name || 'příloha')}</span>
      <button type="button" data-clear-attachment aria-label="Odebrat přílohu">×</button>
    `;
  };

  const setModalOpen = (open) => {
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      closeFloatingPanels();
      loadChats();
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(loadChats, 2500);
    } else {
      window.clearInterval(pollTimer);
      closeFloatingPanels();
      setMobileThreadView(false);
    }
  };

  const renderBadge = () => {
    const unread = threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0);
    if (unread > lastUnreadCount && modal.classList.contains('is-open')) {
      playChatSound();
    }
    lastUnreadCount = unread;
    openButtons.forEach((button) => {
      button.textContent = unread > 0 ? `💬 Chaty (${unread})` : '💬 Chaty';
    });
  };

  const listSource = () => {
    const q = String(chatSearch?.value || '').trim().toLowerCase();
    if (activeTab === 'contacts') {
      return contacts.filter((u) => displayName(u).toLowerCase().includes(q));
    }
    const wanted = activeTab === 'requests' ? 'requested' : 'accepted';
    return threads
      .filter((t) => t.status === wanted)
      .filter((t) => displayName(t.other).toLowerCase().includes(q));
  };

  const renderList = () => {
    const items = listSource();
    if (!items.length) {
      chatList.innerHTML = `<div class="feed-empty">Nic tu zatím není.</div>`;
      return;
    }

    chatList.innerHTML = items.map((item) => {
      const isContact = activeTab === 'contacts';
      const user = isContact ? item : item.other;
      const lastAttachment = item.lastMessage?.attachments?.[0];
      const last = isContact
        ? (item.chatAccess === 'direct' ? 'Můžete si psát přímo' : 'První zpráva půjde do žádostí')
        : (item.lastMessage?.text || lastAttachment?.name || (lastAttachment?.type === 'call' ? 'Hovor' : 'Bez zpráv'));
      const selected = (!isContact && activeThread?.id === item.id) || (isContact && activeContact?.id === user.id);
      const badge = !isContact && item.unreadCount ? `<span class="chat-unread">${item.unreadCount}</span>` : '';

      return `
        <button class="chat-list-item ${selected ? 'active' : ''}" type="button" data-${isContact ? 'contact' : 'thread'}-id="${escapeHtml(isContact ? user.id : item.id)}">
          <span class="user-row__avatar" style="background-image:url('${escapeHtml(user?.profilePhoto || '')}')"></span>
          <span class="chat-list-item__text">
            <strong>${escapeHtml(displayName(user))}</strong>
            <small>${escapeHtml(last)}</small>
          </span>
          ${badge}
        </button>
      `;
    }).join('');
  };

  const showConversation = (user, meta) => {
    chatEmpty.hidden = true;
    chatContent.hidden = false;
    chatName.textContent = displayName(user);
    chatMeta.textContent = meta || '';
    chatAvatar.style.backgroundImage = user?.profilePhoto ? `url('${user.profilePhoto}')` : '';
  };

  const renderCallAttachment = (message, attachment, mine) => {
    const kind = attachment.callKind === 'video' ? 'video' : 'audio';
    const status = attachment.callStatus || 'started';
    const label = kind === 'video' ? 'Video hovor' : 'Audio hovor';
    const statusLabel = status === 'ended'
      ? 'Ukončený hovor'
      : status === 'accepted'
        ? 'Přijatý hovor'
        : status === 'rejected'
          ? 'Odmítnutý hovor'
          : status === 'missed'
            ? 'Zmeškaný hovor'
            : 'Zahájený hovor';
    const duration = attachment.name && /^\d+$/.test(attachment.name) ? ` · ${formatDuration(Number(attachment.name))}` : '';

    return `
      <div class="chat-call-card ${mine ? 'mine' : ''}">
        <div class="chat-call-card__icon">${kind === 'video' ? '📹' : '☎️'}</div>
        <div class="chat-call-card__body">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(statusLabel)}${duration}</span>
        </div>
        <button class="reaction-btn" type="button" data-start-call="${escapeHtml(kind)}">
          ${status === 'ended' || status === 'rejected' || status === 'missed' ? 'Zavolat znovu' : 'Připojit'}
        </button>
      </div>
    `;
  };

  const renderMessages = (messages) => {
    const wasEmpty = !chatMessages.innerHTML;
    const prevScrollTop = chatMessages.scrollTop;
    const prevScrollHeight = chatMessages.scrollHeight;
    const prevClientHeight = chatMessages.clientHeight;
    const nearBottom = (prevScrollTop + prevClientHeight) >= (prevScrollHeight - 80);

    chatMessages.innerHTML = messages.length ? messages.map((message) => {
      const mine = String(message.senderId) === String(currentUserId);
      const attachments = (message.attachments || []).map((attachment) => {
        if (attachment.type === 'image') return `<img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.name || 'Fotka')}" />`;
        if (attachment.type === 'video') return `<video src="${escapeHtml(attachment.url)}" controls playsinline preload="metadata"></video>`;
        if (attachment.type === 'call') return renderCallAttachment(message, attachment, mine);
        return '';
      }).join('');

      return `
        <div class="chat-message ${mine ? 'mine' : ''}">
          ${message.text ? `<div>${escapeHtml(message.text)}</div>` : ''}
          ${attachments ? `<div class="chat-attachments">${attachments}</div>` : ''}
          <time>${escapeHtml(formatTime(message.createdAt))}</time>
        </div>
      `;
    }).join('') : `<div class="feed-empty">Začni konverzaci první zprávou.</div>`;

    // Scrollování jako v Messengeru:
    // - když je uživatel "u spodku" (nebo ještě nescrolloval), držíme chat přilepený dole
    // - když si uživatel sjel nahoru (čte historii), neskáčeme mu zpět dolů při pollingu
    if (wasEmpty || !chatUserHasScrolled || nearBottom) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return;
    }

    // Zachovat pozici při změně výšky obsahu (např. při přidání nových zpráv).
    const nextScrollHeight = chatMessages.scrollHeight;
    const delta = nextScrollHeight - prevScrollHeight;
    chatMessages.scrollTop = Math.max(0, prevScrollTop + delta);
  };

  const getThreadMedia = () => {
    const messages = Array.isArray(activeThread?.messages) ? activeThread.messages : [];
    return messages.flatMap((message) => (message.attachments || [])
      .filter((attachment) => attachment.type === 'image' || attachment.type === 'video')
      .map((attachment) => ({
        ...attachment,
        senderId: message.senderId,
        createdAt: message.createdAt
      })));
  };

  const showMediaHistory = () => {
    if (!activeThread) {
      window.alert('Nejdřív vyber konverzaci.');
      return;
    }

    const media = getThreadMedia();
    const overlay = document.createElement('div');
    overlay.className = 'chat-media-popover chat-gallery-popover';
    overlay.innerHTML = `
      <div class="chat-gallery">
        <div class="chat-media-card__head">
          <div>
            <strong>Historie médií</strong>
            <div class="account-label">${media.length ? `${media.length} uložených fotek a videí v tomto chatu` : 'Zatím tu nejsou žádné fotky ani videa.'}</div>
          </div>
          <button class="reaction-btn" type="button" data-gallery-close>Zavřít</button>
        </div>
        <div class="chat-gallery-grid">
          ${media.length ? media.map((item, index) => `
            <button class="chat-gallery-item" type="button" data-gallery-item="${index}">
              ${item.type === 'video'
                ? `<video src="${escapeHtml(item.url)}" preload="metadata" muted playsinline></video><span>▶ Video</span>`
                : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name || 'Fotka')}" />`}
              <small>${escapeHtml(formatTime(item.createdAt))}</small>
            </button>
          `).join('') : '<div class="feed-empty">Až si pošlete obrázek nebo video, uloží se sem.</div>'}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-gallery-close]').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
      const itemButton = event.target.closest('[data-gallery-item]');
      if (!itemButton) return;
      const item = media[Number(itemButton.dataset.galleryItem)];
      if (!item) return;
      const viewer = document.createElement('div');
      viewer.className = 'chat-media-popover chat-gallery-viewer';
      viewer.innerHTML = `
        <div class="chat-gallery-viewer__card">
          <button class="modal__close" type="button" aria-label="Zavřít" data-viewer-close>&times;</button>
          ${item.type === 'video'
            ? `<video src="${escapeHtml(item.url)}" controls autoplay playsinline></video>`
            : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name || 'Fotka')}" />`}
          <div class="account-label">${escapeHtml(item.name || 'Médium')} · ${escapeHtml(formatTime(item.createdAt))}</div>
        </div>
      `;
      document.body.appendChild(viewer);
      viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.remove());
      viewer.addEventListener('click', (viewerEvent) => {
        if (viewerEvent.target === viewer) viewer.remove();
      });
    });
  };

  const selectThread = async (thread, markRead = true) => {
    const prevThreadId = String(activeThread?.id || '');
    activeThread = thread;
    activeContact = thread.other;
    chatUserHasScrolled = false;
    const incomingRequest = thread.status === 'requested' && String(thread.requestedBy) !== String(currentUserId);
    showConversation(thread.other, incomingRequest ? 'Žádost o zprávu' : 'Aktivní chat');
    setMobileThreadView(true);
    requestBar.hidden = !incomingRequest;
    callAudio.disabled = incomingRequest;
    callVideo.disabled = incomingRequest;
    if (mediaHistoryButton) mediaHistoryButton.disabled = false;

    // Důležité: chat se obnovuje každých ~2.5 s. Když pokaždé přepíšeme innerHTML zpráv,
    // přehrávané video se vždy zastaví (DOM element se zničí a vytvoří znovu).
    // Proto přerenderujeme zprávy jen když se opravdu změnily.
    const threadId = String(thread?.id || '');
    const sig = messagesSignature(thread?.messages || []);
    const sameThread = prevThreadId === threadId;
    const shouldRender = !sameThread || markRead || lastRenderedThreadSig.get(threadId) !== sig;
    if (shouldRender) {
      renderMessages(thread.messages || []);
      lastRenderedThreadSig.set(threadId, sig);
    }
    renderList();

    if (markRead) {
      await api(`/api/chats/${encodeURIComponent(thread.id)}/read`, { method: 'POST' }).catch(() => {});
      loadChats().catch(() => {});
    }
  };

  const normalizeContactForChat = (contact) => ({
    ...contact,
    chatAccess: contact?.chatAccess === 'request' ? 'request' : 'direct'
  });

  const selectContact = (contact) => {
    const safeContact = normalizeContactForChat(contact || {});
    const existingThread = threads.find((t) => String(t.other?.id) === String(safeContact.id)) || null;
    if (existingThread) {
      selectThread(existingThread, false);
      return;
    }

    activeThread = null;
    activeContact = safeContact;
    chatUserHasScrolled = false;
    const isDirect = safeContact.chatAccess === 'direct';
    showConversation(safeContact, isDirect ? 'Nový chat' : 'První zpráva půjde jako žádost');
    setMobileThreadView(true);
    requestBar.hidden = true;
    callAudio.disabled = !isDirect;
    callVideo.disabled = !isDirect;
    if (mediaHistoryButton) mediaHistoryButton.disabled = true;
    renderMessages([]);
    renderList();
  };

  const respondToCall = async (threadId, messageId, action) => {
    return api(`/api/chats/${encodeURIComponent(threadId)}/calls/${encodeURIComponent(messageId)}/respond`, {
      method: 'POST',
      body: { action }
    });
  };

  const callSignalPath = (threadId, messageId, suffix) => (
    `/api/chats/${encodeURIComponent(threadId)}/calls/${encodeURIComponent(messageId)}/${suffix}`
  );
  const postCallOffer = (threadId, messageId, sdp) => api(callSignalPath(threadId, messageId, 'offer'), { method: 'POST', body: { sdp } });
  const fetchCallOffer = (threadId, messageId) => api(callSignalPath(threadId, messageId, 'offer'));
  const postCallAnswer = (threadId, messageId, sdp) => api(callSignalPath(threadId, messageId, 'answer'), { method: 'POST', body: { sdp } });
  const fetchCallAnswer = (threadId, messageId) => api(callSignalPath(threadId, messageId, 'answer'));
  const postCallIce = (threadId, messageId, to, candidate) => api(callSignalPath(threadId, messageId, 'ice'), { method: 'POST', body: { to, candidate } });
  const fetchCallIce = (threadId, messageId, to, since) => api(`${callSignalPath(threadId, messageId, 'ice')}?to=${encodeURIComponent(to)}&since=${encodeURIComponent(String(since || 0))}`);

  const makeCallPc = () => new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  const showIncomingCallPopup = (thread, message, call) => {
    const callKey = `${thread.id}:${message.id}`;
    if (handledIncomingCalls.has(callKey)) return;
    handledIncomingCalls.add(callKey);

    const caller = thread.other || {};
    const kind = call.callKind === 'video' ? 'video' : 'audio';
    const popup = document.createElement('div');
    popup.className = 'chat-incoming-call';
    popup.dataset.incomingCall = callKey;
    popup.innerHTML = `
      <div class="chat-incoming-call__avatar" style="background-image:url('${escapeHtml(caller.profilePhoto || '')}')"></div>
      <div class="chat-incoming-call__body">
        <span>${kind === 'video' ? '📹 Video hovor' : '☎️ Audio hovor'}</span>
        <strong>${escapeHtml(displayName(caller))}</strong>
        <small>Volá ti v chatu</small>
      </div>
      <div class="chat-incoming-call__actions">
        <button class="btn btn-primary" type="button" data-call-accept>Přijmout</button>
        <button class="btn btn-tertiary" type="button" data-call-decline>Zavěsit</button>
      </div>
    `;
    document.body.appendChild(popup);

    const close = () => popup.remove();
    popup.querySelector('[data-call-accept]').addEventListener('click', async () => {
      await respondToCall(thread.id, message.id, 'accept').catch(() => {});
      activeCallThreadId = thread.id;
      activeCallMessageId = message.id;
      activeCallKind = kind;
      selectThread(thread, false);
      close();
      await startCallPreview(kind, { skipHistory: true, threadId: thread.id, messageId: message.id });
    });
    popup.querySelector('[data-call-decline]').addEventListener('click', async () => {
      await respondToCall(thread.id, message.id, 'reject').catch(() => {});
      close();
      await loadChats().catch(() => {});
    });

    window.setTimeout(async () => {
      if (!document.body.contains(popup)) return;
      await respondToCall(thread.id, message.id, 'missed').catch(() => {});
      close();
      await loadChats().catch(() => {});
    }, 45000);
  };

  const checkIncomingCalls = () => {
    threads.forEach((thread) => {
      const messages = Array.isArray(thread.messages) ? thread.messages : [];
      const recentMessages = messages.slice(-8);
      recentMessages.forEach((message) => {
        if (String(message.senderId) === String(currentUserId)) return;
        const call = (message.attachments || []).find((attachment) => (
          attachment.type === 'call'
          && attachment.callStatus === 'started'
          && (Date.now() - new Date(message.createdAt).getTime()) < 60_000
        ));
        if (call) showIncomingCallPopup(thread, message, call);
      });
    });
  };

  const loadChats = async () => {
    const [nextThreads, nextContacts] = await Promise.all([
      api('/api/chats').catch(() => []),
      api('/api/chats/contacts').catch(() => [])
    ]);
    threads = Array.isArray(nextThreads) ? nextThreads : [];
    contacts = Array.isArray(nextContacts) ? nextContacts : [];
    renderBadge();
    renderList();
    checkIncomingCalls();

    if (activeThread) {
      const fresh = threads.find((t) => t.id === activeThread.id);
      if (fresh) selectThread(fresh, false);
    }

    if (pendingOpenUserId) {
      const id = pendingOpenUserId;
      pendingOpenUserId = '';
      const thread = threads.find((t) => String(t.other?.id) === String(id));
      const contact = contacts.find((u) => String(u.id) === String(id));
      if (thread) selectThread(thread);
      else if (contact) selectContact(contact);
    }
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const ensureMediaDevices = () => {
    // getUserMedia je standardně povolené jen v bezpečném kontextu (HTTPS / localhost).
    // Pro vývoj na lokální síti (např. http://192.168.x.x) to některé prohlížeče umožní jen po explicitním povolení.
    // Proto tady neblokujeme samotnou IP adresu, ale dáme srozumitelnou hlášku v případě, že mediaDevices chybí.
    if (!navigator.mediaDevices?.getUserMedia) {
      const host = String(location.hostname || '');
      const insecureHint = !window.isSecureContext
        ? ` (běžíš na ne-HTTPS adrese: ${host || 'neznámý host'})`
        : '';
      throw new Error(
        `Prohlížeč nemá dostupný přístup ke kameře/mikrofonu${insecureHint}. ` +
        `Zkontroluj, že jedeš na HTTPS. Pro lokální IP (např. 192.168.x.x) můžeš v Chrome/Edge povolit ` +
        `\"Insecure origins treated as secure\" a přidat tuto URL.`
      );
    }
  };

  const showCameraCapture = async () => {
    ensureMediaDevices();
    stopStream(cameraStream);
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });

    const overlay = document.createElement('div');
    overlay.className = 'chat-media-popover';
    overlay.innerHTML = `
      <div class="chat-media-card">
        <div class="chat-media-card__head">
          <strong>Vyfotit do chatu</strong>
          <button class="reaction-btn" type="button" data-camera-close>Zavřít</button>
        </div>
        <video autoplay playsinline muted></video>
        <canvas hidden></canvas>
        <div class="chat-media-card__actions">
          <button class="btn btn-primary" type="button" data-camera-shot>📸 Vyfotit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const video = overlay.querySelector('video');
    const canvas = overlay.querySelector('canvas');
    video.srcObject = cameraStream;

    const close = () => {
      stopStream(cameraStream);
      cameraStream = null;
      overlay.remove();
    };

    overlay.querySelector('[data-camera-close]').addEventListener('click', close);
    overlay.querySelector('[data-camera-shot]').addEventListener('click', async () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      if (!blob) return;
      pendingAttachment = {
        type: 'image',
        name: `foto-${Date.now()}.jpg`,
        file: blob
      };
      messageInput.placeholder = 'Fotka je připravená k odeslání';
      updateAttachmentChip();
      close();
      messageInput.focus();
    });
  };

  const showVideoRecorder = async () => {
    ensureMediaDevices();
    if (!window.MediaRecorder) throw new Error('Prohlížeč nepodporuje nahrávání videa.');

    stopStream(cameraStream);
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });

    const overlay = document.createElement('div');
    overlay.className = 'chat-media-popover';
    overlay.innerHTML = `
      <div class="chat-media-card">
        <div class="chat-media-card__head">
          <div>
            <strong>Natočit video do chatu</strong>
            <div class="account-label">Maximum 5 minut</div>
          </div>
          <button class="reaction-btn" type="button" data-video-close>Zavřít</button>
        </div>
        <div class="chat-recorder-preview">
          <video autoplay playsinline muted></video>
          <div class="chat-record-timer" data-video-timer>05:00</div>
        </div>
        <div class="chat-media-card__actions">
          <button class="btn btn-primary" type="button" data-video-start>Spustit záznam</button>
          <button class="btn btn-tertiary" type="button" data-video-stop hidden>Zastavit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const video = overlay.querySelector('video');
    const timer = overlay.querySelector('[data-video-timer]');
    const startBtn = overlay.querySelector('[data-video-start]');
    const stopBtn = overlay.querySelector('[data-video-stop]');
    video.srcObject = cameraStream;

    const close = () => {
      if (chatRecorder && chatRecorder.state !== 'inactive') {
        try { chatRecorder.stop(); } catch {}
      }
      window.clearInterval(chatRecordTimer);
      chatRecorder = null;
      stopStream(cameraStream);
      cameraStream = null;
      overlay.remove();
    };

    const updateTimer = () => {
      const remaining = Math.max(0, 300_000 - (Date.now() - chatRecordStartedAt));
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (remaining <= 0 && chatRecorder?.state === 'recording') chatRecorder.stop();
    };

    overlay.querySelector('[data-video-close]').addEventListener('click', close);
    startBtn.addEventListener('click', () => {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
      chatRecordChunks = [];
      chatRecorder = new MediaRecorder(cameraStream, mime ? {
        mimeType: mime,
        videoBitsPerSecond: 1_600_000,
        audioBitsPerSecond: 96_000
      } : undefined);
      chatRecorder.ondataavailable = (event) => {
        if (event.data?.size) chatRecordChunks.push(event.data);
      };
      chatRecorder.onstop = () => {
        window.clearInterval(chatRecordTimer);
        const blob = new Blob(chatRecordChunks, { type: chatRecorder.mimeType || 'video/webm' });
        pendingAttachment = {
          type: 'video',
          name: `video-${Date.now()}.webm`,
          file: blob
        };
        messageInput.placeholder = 'Video je připravené k odeslání';
        updateAttachmentChip();
        close();
        messageInput.focus();
      };
      chatRecordStartedAt = Date.now();
      chatRecorder.start(1000);
      updateTimer();
      chatRecordTimer = window.setInterval(updateTimer, 500);
      startBtn.hidden = true;
      stopBtn.hidden = false;
    });
    stopBtn.addEventListener('click', () => {
      if (chatRecorder?.state === 'recording') chatRecorder.stop();
    });
  };

  const sendCallHistory = async (kind, status, durationSeconds = 0) => {
    if (!activeContact) return;
    const result = await api('/api/chats/messages', {
      method: 'POST',
      body: {
        toUserId: activeContact.id,
        text: status === 'ended'
          ? `${kind === 'video' ? 'Video hovor' : 'Audio hovor'} ukončen`
          : `${kind === 'video' ? 'Video hovor' : 'Audio hovor'} zahájen`,
        attachments: [{
          type: 'call',
          callKind: kind,
          callStatus: status,
          name: String(durationSeconds || '')
        }]
      }
    }).catch(() => {});
    await loadChats().catch(() => {});
    return result;
  };

  const startCallSignaling = async (role) => {
    if (!activeCallThreadId || !activeCallMessageId || !window.RTCPeerConnection) return;

    if (callPc) {
      try { callPc.close(); } catch {}
      callPc = null;
    }
    window.clearInterval(callSignalTimer);
    callLastIceTs = 0;
    callRemoteStream = new MediaStream();

    const remoteVideo = callOverlay?.querySelector('.chat-call-video--remote');
    const remoteAudio = callOverlay?.querySelector('.chat-call-remote-audio');
    if (remoteVideo) remoteVideo.srcObject = callRemoteStream;
    if (remoteAudio) remoteAudio.srcObject = callRemoteStream;

    callPc = makeCallPc();
    callStream?.getTracks?.().forEach((track) => callPc.addTrack(track, callStream));
    callPc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream) {
        if (remoteVideo) remoteVideo.srcObject = stream;
        if (remoteAudio) remoteAudio.srcObject = stream;
        return;
      }
      callRemoteStream.addTrack(event.track);
    };
    callPc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await postCallIce(
        activeCallThreadId,
        activeCallMessageId,
        role === 'caller' ? 'callee' : 'caller',
        event.candidate
      ).catch(() => {});
    };

    if (role === 'caller') {
      const offer = await callPc.createOffer();
      await callPc.setLocalDescription(offer);
      await postCallOffer(activeCallThreadId, activeCallMessageId, offer);
      callSignalTimer = window.setInterval(async () => {
        const answer = await fetchCallAnswer(activeCallThreadId, activeCallMessageId).catch(() => null);
        if (answer?.answer && !callPc.currentRemoteDescription) {
          await callPc.setRemoteDescription(new RTCSessionDescription(answer.answer)).catch(() => {});
        }
        const ice = await fetchCallIce(activeCallThreadId, activeCallMessageId, 'caller', callLastIceTs).catch(() => null);
        callLastIceTs = ice?.now || callLastIceTs;
        for (const item of (ice?.candidates || [])) {
          await callPc.addIceCandidate(new RTCIceCandidate(item.candidate)).catch(() => {});
        }
      }, 900);
      return;
    }

    callSignalTimer = window.setInterval(async () => {
      if (!callPc || callPc.signalingState === 'closed') return;
      const offer = await fetchCallOffer(activeCallThreadId, activeCallMessageId).catch(() => null);
      if (offer?.offer && !callPc.currentRemoteDescription) {
        await callPc.setRemoteDescription(new RTCSessionDescription(offer.offer)).catch(() => {});
        const answer = await callPc.createAnswer();
        await callPc.setLocalDescription(answer);
        await postCallAnswer(activeCallThreadId, activeCallMessageId, answer).catch(() => {});
      }
      const ice = await fetchCallIce(activeCallThreadId, activeCallMessageId, 'callee', callLastIceTs).catch(() => null);
      callLastIceTs = ice?.now || callLastIceTs;
      for (const item of (ice?.candidates || [])) {
        await callPc.addIceCandidate(new RTCIceCandidate(item.candidate)).catch(() => {});
      }
    }, 900);
  };

  const endCall = async (kind, notify = true) => {
    const duration = callStartedAt ? Math.round((Date.now() - callStartedAt) / 1000) : 0;
    window.clearInterval(callTimer);
    window.clearInterval(callSignalTimer);
    callTimer = 0;
    callSignalTimer = 0;
    callStartedAt = 0;
    if (callPc) {
      try { callPc.close(); } catch {}
      callPc = null;
    }
    callRemoteStream = null;
    stopStream(callStream);
    callStream = null;
    if (callOverlay) {
      callOverlay.remove();
      callOverlay = null;
    }
    if (notify && duration > 1) {
      if (activeCallThreadId && activeCallMessageId) {
        await respondToCall(activeCallThreadId, activeCallMessageId, 'end').catch(() => {});
        await loadChats().catch(() => {});
      } else {
        await sendCallHistory(kind, 'ended', duration);
      }
    }
    activeCallThreadId = '';
    activeCallMessageId = '';
    activeCallKind = '';
  };

  const startCallPreview = async (kind, options = {}) => {
    if (!activeContact) {
      window.alert('Nejdřív vyber uživatele v chatu.');
      return;
    }

    try {
      ensureMediaDevices();
    } catch (err) {
      window.alert(err?.message || 'Hovor nejde spustit (kamera/mikrofon nejsou dostupné).');
      return;
    }
    const acceptedThreadId = options.threadId || activeCallThreadId;
    const acceptedMessageId = options.messageId || activeCallMessageId;
    const constraints = kind === 'video'
      ? { audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
      : { audio: true, video: false };

    try {
      await endCall(kind, false);
      callStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const need = kind === 'video' ? 'kameru i mikrofon' : 'mikrofon';
      const base = `Hovor nejde spustit. Zařízení nemá dostupný ${need}, nebo není povolený přístup.`;
      const secureNote = !window.isSecureContext
        ? `\n\nPoznámka: Kamera/mikrofon většinou vyžadují HTTPS. Na lokální IP (192.168.x.x) to v prohlížeči často nejde bez ručního povolení/HTTPS.`
        : '';
      window.alert(base + secureNote);
      return;
    }

    if (!options.skipHistory) {
      const callResult = await sendCallHistory(kind, 'started');
      activeCallThreadId = callResult?.threadId || activeThread?.id || '';
      activeCallMessageId = callResult?.message?.id || '';
      activeCallKind = kind;
    } else {
      activeCallThreadId = acceptedThreadId || activeThread?.id || '';
      activeCallMessageId = acceptedMessageId || '';
      activeCallKind = kind;
    }

    callOverlay = document.createElement('div');
    callOverlay.className = `chat-media-popover chat-call-popover chat-call-popover--${kind}`;
    callOverlay.innerHTML = `
      <div class="chat-call-window">
        <div class="chat-call-topbar">
          <div class="chat-call-user">
            <div class="user-row__avatar" style="background-image:url('${escapeHtml(activeContact?.profilePhoto || '')}')"></div>
            <div>
              <strong>${escapeHtml(displayName(activeContact))}</strong>
              <span>${kind === 'video' ? 'Video hovor' : 'Audio hovor'} · <b data-call-clock>00:00</b></span>
            </div>
          </div>
          <div class="chat-call-state">Pozvánka je v chatu</div>
        </div>

        <div class="chat-call-stage">
          ${kind === 'video'
            ? '<video class="chat-call-video chat-call-video--remote" autoplay playsinline></video><video class="chat-call-local-video" autoplay playsinline muted></video>'
            : `<div class="chat-call-avatar"><div class="user-row__avatar" style="background-image:url('${escapeHtml(activeContact?.profilePhoto || '')}')"></div><strong>${escapeHtml(displayName(activeContact))}</strong><span>Mikrofon je aktivní</span><audio class="chat-call-remote-audio" autoplay></audio></div>`}
          <div class="chat-call-wave" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        </div>

        <div class="chat-call-controls">
          <button class="reaction-btn" type="button" data-call-mute>🎙️ Mikrofon</button>
          <button class="reaction-btn" type="button" data-call-camera ${kind === 'audio' ? 'hidden' : ''}>📹 Kamera</button>
          <button class="btn btn-tertiary" type="button" data-call-close>☎️ Zavěsit</button>
        </div>
      </div>
    `;
    document.body.appendChild(callOverlay);

    const localVideo = callOverlay.querySelector('.chat-call-local-video');
    if (localVideo) localVideo.srcObject = callStream;
    startCallSignaling(options.skipHistory ? 'callee' : 'caller').catch(() => {});

    const clock = callOverlay.querySelector('[data-call-clock]');
    callStartedAt = Date.now();
    callTimer = window.setInterval(() => {
      if (clock) clock.textContent = formatDuration(Math.round((Date.now() - callStartedAt) / 1000));
    }, 500);

    callOverlay.querySelector('[data-call-close]').addEventListener('click', () => endCall(kind));
    callOverlay.querySelector('[data-call-mute]').addEventListener('click', (event) => {
      const track = callStream?.getAudioTracks?.()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      event.currentTarget.classList.toggle('active', !track.enabled);
      event.currentTarget.textContent = track.enabled ? '🎙️ Mikrofon' : '🔇 Ztlumeno';
    });
    callOverlay.querySelector('[data-call-camera]')?.addEventListener('click', (event) => {
      const track = callStream?.getVideoTracks?.()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      event.currentTarget.classList.toggle('active', !track.enabled);
      event.currentTarget.textContent = track.enabled ? '📹 Kamera' : '🚫 Kamera vypnutá';
    });
  };

  const sendMessage = async () => {
    if (!activeContact) return;
    const text = messageInput.value.trim();
    let attachment = pendingAttachment;
    if (attachment?.file) {
      const uploaded = await uploadAsset(attachment.file, attachment.name);
      attachment = {
        type: attachment.type,
        url: uploaded.url,
        name: attachment.name
      };
    }
    const attachments = attachment ? [attachment] : [];
    if (!text && !attachments.length) return;

    await api('/api/chats/messages', {
      method: 'POST',
      body: { toUserId: activeContact.id, text, attachments }
    });

    messageInput.value = '';
    messageInput.placeholder = 'Napiš zprávu...';
    pendingAttachment = null;
    updateAttachmentChip();
    await loadChats();
    const fresh = threads.find((t) => String(t.other?.id) === String(activeContact.id));
    if (fresh) {
      activeTab = fresh.status === 'requested' && String(fresh.requestedBy) !== String(currentUserId) ? 'requests' : 'threads';
      document.querySelectorAll('[data-chat-tab]').forEach((b) => b.classList.toggle('active', b.dataset.chatTab === activeTab));
      selectThread(fresh);
    }
  };

  document.querySelectorAll('[data-chat-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.chatTab || 'threads';
      document.querySelectorAll('[data-chat-tab]').forEach((b) => b.classList.toggle('active', b === button));
      renderList();
    });
  });

  chatList.addEventListener('click', (event) => {
    const threadBtn = event.target.closest('[data-thread-id]');
    if (threadBtn) {
      const thread = threads.find((t) => t.id === threadBtn.dataset.threadId);
      if (thread) selectThread(thread);
      return;
    }

    const contactBtn = event.target.closest('[data-contact-id]');
    if (contactBtn) {
      const contact = contacts.find((u) => String(u.id) === String(contactBtn.dataset.contactId));
      if (contact) selectContact(contact);
    }
  });

  chatMessages.addEventListener('click', (event) => {
    const callButton = event.target.closest('[data-start-call]');
    if (callButton) {
      startCallPreview(callButton.dataset.startCall || 'audio')
        .catch((err) => window.alert(err?.message || 'Hovor se nepodařilo spustit.'));
    }
  });
  chatMessages.addEventListener('scroll', () => {
    // Jakmile uživatel začne scrollovat, přestaneme mu při pollingu skákat dolů.
    chatUserHasScrolled = true;
  }, { passive: true });

  chatSearch?.addEventListener('input', renderList);
  openButtons.forEach((button) => button.addEventListener('click', () => {
    pendingOpenUserId = button.dataset.chatUserId || '';
    if (!pendingOpenUserId && button.id === 'userChatButton') {
      pendingOpenUserId = new URLSearchParams(window.location.search).get('id') || '';
    }
    setModalOpen(true);
  }));

  modal.querySelectorAll('[data-close="true"]').forEach((el) => el.addEventListener('click', () => setModalOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) setModalOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.chat-composer')) closeFloatingPanels();
  });

  chatForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage().catch((err) => window.alert(err.message || 'Zprávu se nepodařilo odeslat.'));
  });

  messageInput?.addEventListener('keydown', (event) => {
    const prefs = getPreferences();
    if (event.key === 'Enter' && !event.shiftKey && prefs.enterToSend !== false) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  messageInput?.addEventListener('focus', () => {
    if (quickReplies && !messageInput.value.trim()) quickReplies.hidden = false;
  });

  quickReplies?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick-reply]');
    if (!button) return;
    messageInput.value = button.getAttribute('data-quick-reply') || '';
    quickReplies.hidden = true;
    messageInput.focus();
  });

  attachmentChip?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-clear-attachment]');
    if (!button) return;
    pendingAttachment = null;
    messageInput.placeholder = 'Napiš zprávu...';
    updateAttachmentChip();
    messageInput.focus();
  });

  toolsToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (emojiPanel) emojiPanel.hidden = true;
    tools.hidden = !tools.hidden;
  });

  tools?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-chat-tool]');
    if (!button) return;
    tools.hidden = true;

    if (button.dataset.chatTool === 'camera') {
      showCameraCapture().catch((err) => window.alert(err?.message || 'Kameru se nepodařilo spustit.'));
      return;
    }

    if (button.dataset.chatTool === 'video') {
      showVideoRecorder().catch((err) => window.alert(err?.message || 'Video se nepodařilo spustit.'));
      return;
    }

    if (button.dataset.chatTool === 'emoji') {
      // Emoji panel se otevře z "plus" menu, ať je kompozitor jednodušší na mobilu.
      if (emojiPanel) emojiPanel.hidden = !emojiPanel.hidden;
      return;
    }

    attachmentInput.accept = 'image/*';
    attachmentInput.removeAttribute('capture');
    attachmentInput.click();
  });

  attachmentInput?.addEventListener('change', async () => {
    const file = attachmentInput.files?.[0];
    if (!file) return;
    pendingAttachment = { type: file.type.startsWith('video') ? 'video' : 'image', name: file.name, file };
    messageInput.placeholder = `Přiloženo: ${file.name}`;
    updateAttachmentChip();
    attachmentInput.value = '';
  });

  const emojis = ['😀','😂','😍','🔥','👍','👎','❤️','🎉','😮','😢','🙏','💪','✨','😎','🤝','✅','🙌','💬','📸','🎬'];
  emojiPanel.innerHTML = emojis.map((emoji) => `<button type="button">${emoji}</button>`).join('');
  emojiPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    messageInput.value += button.textContent;
    messageInput.focus();
    emojiPanel.hidden = true;
  });

  acceptRequest?.addEventListener('click', async () => {
    if (!activeThread) return;
    await api(`/api/chats/${encodeURIComponent(activeThread.id)}/respond`, { method: 'POST', body: { action: 'accept' } });
    await loadChats();
  });

  rejectRequest?.addEventListener('click', async () => {
    if (!activeThread) return;
    await api(`/api/chats/${encodeURIComponent(activeThread.id)}/respond`, { method: 'POST', body: { action: 'reject' } });
    await loadChats();
  });

  callAudio?.addEventListener('click', () => {
    startCallPreview('audio').catch((err) => window.alert(err?.message || 'Hovor se nepodařilo spustit.'));
  });
  callVideo?.addEventListener('click', () => {
    startCallPreview('video').catch((err) => window.alert(err?.message || 'Hovor se nepodařilo spustit.'));
  });
  mediaHistoryButton?.addEventListener('click', () => showMediaHistory());
  backButton?.addEventListener('click', () => setMobileThreadView(false));

  loadChats().catch(() => {});
  realtimeTimer = window.setInterval(() => {
    if (!modal.classList.contains('is-open')) loadChats().catch(() => {});
  }, 4000);
})();
