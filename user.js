(() => {
  const currentUserId = localStorage.getItem('anukCurrentUser');
  if (!currentUserId) {
    window.location.href = 'index.html';
    return;
  }

  const toastEl = document.getElementById('toast');
  const showToast = (message, variant = 'info') => {
    if (!toastEl) return window.alert(String(message || ''));
    toastEl.textContent = String(message || '');
    toastEl.dataset.variant = variant;
    toastEl.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const textToHtml = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>');
  const TEXT_STYLE_DEFAULTS = {
    preset: 'soft',
    fontFamily: 'Inter',
    fontSize: 20,
    textColor: '#f8fafc',
    backgroundColor: '#1f2937',
    textAlign: 'left',
    borderStyle: 'glass',
    bold: false,
    italic: false,
    shadow: true
  };
  const allowedFonts = new Set(['Inter', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact']);
  const allowedAligns = new Set(['left', 'center', 'right']);
  const allowedBorders = new Set(['glass', 'clean', 'bold']);
  const allowedPresets = new Set(['soft', 'sunset', 'ocean', 'ink', 'paper']);
  const normalizeHexColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  const sanitizeTextStyle = (style = {}) => {
    const fontSize = Math.max(16, Math.min(34, Number.parseInt(style.fontSize, 10) || TEXT_STYLE_DEFAULTS.fontSize));
    return {
      preset: allowedPresets.has(String(style.preset || '')) ? String(style.preset) : TEXT_STYLE_DEFAULTS.preset,
      fontFamily: allowedFonts.has(String(style.fontFamily || '')) ? String(style.fontFamily) : TEXT_STYLE_DEFAULTS.fontFamily,
      fontSize,
      textColor: normalizeHexColor(style.textColor, TEXT_STYLE_DEFAULTS.textColor),
      backgroundColor: normalizeHexColor(style.backgroundColor, TEXT_STYLE_DEFAULTS.backgroundColor),
      textAlign: allowedAligns.has(String(style.textAlign || '')) ? String(style.textAlign) : TEXT_STYLE_DEFAULTS.textAlign,
      borderStyle: allowedBorders.has(String(style.borderStyle || '')) ? String(style.borderStyle) : TEXT_STYLE_DEFAULTS.borderStyle,
      bold: Boolean(style.bold),
      italic: Boolean(style.italic),
      shadow: style.shadow !== false
    };
  };
  const styleToCss = (style = {}) => {
    const safe = sanitizeTextStyle(style);
    const fontStack = safe.fontFamily === 'Inter' ? 'Inter, system-ui, sans-serif' : `"${safe.fontFamily}", Inter, system-ui, sans-serif`;
    const border = safe.borderStyle === 'bold'
      ? `2px solid ${safe.textColor}`
      : safe.borderStyle === 'clean'
        ? '1px solid rgba(15, 23, 42, .12)'
        : '1px solid rgba(255, 255, 255, .22)';
    return [
      `font-family:${fontStack}`,
      `font-size:${safe.fontSize}px`,
      `color:${safe.textColor}`,
      `background:${safe.backgroundColor}`,
      `text-align:${safe.textAlign}`,
      `font-weight:${safe.bold ? 800 : 500}`,
      `font-style:${safe.italic ? 'italic' : 'normal'}`,
      `text-shadow:${safe.shadow ? '0 2px 12px rgba(0,0,0,.28)' : 'none'}`,
      `border:${border}`
    ].join(';');
  };
  const renderTextPost = (item) => {
    const style = sanitizeTextStyle(item?.textStyle || {});
    const body = textToHtml(item?.description || '') || 'Bez textu';
    return `<div class="feed-text feed-text--styled feed-text--${style.preset}" style="${styleToCss(style)}">${body}</div>`;
  };
  const getApiBase = () => {
    const forced = window.ANUK_API_BASE || document.querySelector('meta[name="anuk-api-base"]')?.content;
    if (forced) return String(forced).replace(/\/$/, '');
    const { protocol, origin } = window.location;
    if (protocol === 'http:' || protocol === 'https:') return origin;
    return '';
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
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    headers['x-user-id'] = currentUserId;
    const method = String(options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = decodeURIComponent((document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('XSRF-TOKEN=')) || '').slice('XSRF-TOKEN='.length));
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }
    const fetchOptions = { credentials: 'same-origin', ...options, headers };
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    } else {
      delete fetchOptions.body;
    }
    const response = await fetch(getApiBase() + path, fetchOptions);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw createApiError(data, response, 'Chyba při načítání dat.');
    }
    return data;
  };

  const getId = () => {
    const sp = new URLSearchParams(window.location.search);
    return String(sp.get('id') || '').trim();
  };

  const userId = getId();
  if (!userId) {
    window.location.href = 'feed.html';
    return;
  }

  // Nav
  document.getElementById('backToFeed')?.addEventListener('click', () => window.location.href = 'feed.html');
  document.getElementById('userSettings')?.addEventListener('click', () => window.location.href = 'account.html#settings');
  document.getElementById('logout')?.addEventListener('click', async () => {
    try {
      await api('/api/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout session cleanup failed:', err);
    }
    localStorage.removeItem('anukCurrentUser');
    window.location.href = 'index.html';
  });

  const userTitle = document.getElementById('userTitle');
  const userSubtitle = document.getElementById('userSubtitle');
  const viewCoverVideo = document.getElementById('viewCoverVideo');
  const viewCoverPlaceholder = document.getElementById('viewCoverPlaceholder');
  const viewAvatar = document.getElementById('viewAvatar');
  const viewName = document.getElementById('viewName');
  const viewRole = document.getElementById('viewRole');
  const viewBio = document.getElementById('viewBio');
  const viewFollowing = document.getElementById('viewFollowing');
  const viewFollowers = document.getElementById('viewFollowers');
  const followButton = document.getElementById('followButton');
  const unfollowButton = document.getElementById('unfollowButton');
  const userChatButton = document.getElementById('userChatButton');
  const copyProfileLinkButton = document.getElementById('copyProfileLinkButton');
  const followHint = document.getElementById('followHint');
  const userPosts = document.getElementById('userPosts');

  const roleLabel = (r) => r === 'admin' ? 'Administrátor' : r === 'creator' ? 'Tvůrce' : 'Uživatel';

  const createCard = (item, owner) => {
    const likes = (item.reactions?.likes || []).length;
    const dislikes = (item.reactions?.dislikes || []).length;
    const userLiked = (item.reactions?.likes || []).includes(currentUserId);
    const userDisliked = (item.reactions?.dislikes || []).includes(currentUserId);
    const comments = item.comments || [];
    const authorName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || owner?.contact || '';

    const media =
      item.type === 'image'
        ? `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title || 'foto')}" />`
        : (item.type === 'video' || item.type === 'short')
          ? `<video class="video-player${item.type === 'short' ? ' video-player--short' : ''}" src="${escapeHtml(item.url)}" controls playsinline preload="metadata" disablepictureinpicture controlsList="nodownload noremoteplayback"></video>`
          : '';

    return `
      <article class="feed-item" data-media-id="${escapeHtml(item.id)}">
        <header class="feed-item__header">
          <div class="feed-item__avatar" style="background-image:url('${owner?.profilePhoto || ''}')"></div>
          <div class="feed-item__meta">
            <strong>${escapeHtml(authorName)}</strong>
            <span>${escapeHtml(roleLabel(owner?.role))} · ${new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </header>
        <div class="feed-item__body">
          <h3>${escapeHtml(item.title || '')}</h3>
          ${item.type === 'text' ? renderTextPost(item) : ''}
          ${item.description && item.type !== 'text' ? `<p>${escapeHtml(item.description)}</p>` : ''}
          ${media ? `<div class="feed-item__media">${media}</div>` : ''}
        </div>
        <div class="feed-reactions">
          <button class="reaction-btn ${userLiked ? 'active' : ''}" data-reaction="like" data-media-id="${escapeHtml(item.id)}">👍 ${likes}</button>
          <button class="reaction-btn ${userDisliked ? 'active' : ''}" data-reaction="dislike" data-media-id="${escapeHtml(item.id)}">👎 ${dislikes}</button>
          <button class="reaction-btn" data-action="toggle-comments" data-media-id="${escapeHtml(item.id)}">💬 ${comments.length}</button>
        </div>
        <div class="comments-section" data-comments-id="${escapeHtml(item.id)}" hidden>
          ${(comments || []).map((c) => `
            <div class="comment-item">
              <div class="comment-author">${escapeHtml(c.userName)}</div>
              <div class="comment-text">${escapeHtml(c.text)}</div>
              <div class="comment-time">${new Date(c.createdAt).toLocaleString()}</div>
              <div class="comment-actions">
                <button class="reaction-btn" data-action="comment-reaction" data-reaction="like" data-media-id="${escapeHtml(item.id)}" data-comment-id="${escapeHtml(c.id)}">👍 ${(c.reactions?.likes || []).length}</button>
                <button class="reaction-btn" data-action="comment-reaction" data-reaction="dislike" data-media-id="${escapeHtml(item.id)}" data-comment-id="${escapeHtml(c.id)}">👎 ${(c.reactions?.dislikes || []).length}</button>
                ${currentUserId === c.userId ? `<button class="reaction-btn" data-action="delete-comment" data-media-id="${escapeHtml(item.id)}" data-comment-id="${escapeHtml(c.id)}">🗑️</button>` : ''}
              </div>
            </div>
          `).join('')}
          <div class="comment-input">
            <input type="text" placeholder="Přidat komentář..." data-comment-input="${escapeHtml(item.id)}" />
            <button class="reaction-btn" data-action="add-comment" data-media-id="${escapeHtml(item.id)}" style="padding:8px 12px;">💬 Poslat</button>
          </div>
        </div>
      </article>
    `;
  };

  const loadProfile = async () => {
    const user = await api(`/api/users/${encodeURIComponent(userId)}`);
    const counts = await api(`/api/follow/counts/${encodeURIComponent(userId)}`);
    
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.contact;
    if (userTitle) userTitle.textContent = name;
    if (userSubtitle) userSubtitle.textContent = 'Veřejný profil (read-only)';

    if (viewName) viewName.textContent = name;
    if (viewRole) viewRole.textContent = roleLabel(user.role);
    if (viewBio) viewBio.textContent = user.bio || 'Bez popisku';
    if (viewAvatar) viewAvatar.style.backgroundImage = `url('${user.profilePhoto || ''}')`;

    // Zobrazit počty followers/following
    // API vrací: { followersCount, followingCount }
    // "sleduje" = followingCount
    // "sledující" = followersCount
    if (viewFollowing) viewFollowing.textContent = counts?.followingCount ?? 0;
    if (viewFollowers) viewFollowers.textContent = counts?.followersCount ?? 0;

    const cover = String(user.coverVideo || '');
    if (cover && viewCoverVideo) {
      const coverBox = viewCoverVideo.closest?.('.profile-cover');
      const updateCoverMode = () => {
        if (!coverBox) return;
        const w = Number(viewCoverVideo.videoWidth || 0);
        const h = Number(viewCoverVideo.videoHeight || 0);
        const ratio = h > 0 ? (w / h) : 0;
        coverBox.classList.toggle('is-portrait', ratio > 0 && ratio < 0.92);
      };

      viewCoverVideo.src = cover;
      viewCoverVideo.hidden = false;

      // Na některých mobilech může metadata dorazit dřív než se stihne přidat listener,
      // proto kontrolujeme víckrát (metadata + krátké retry).
      viewCoverVideo.addEventListener('loadedmetadata', updateCoverMode, { once: true });
      viewCoverVideo.addEventListener('loadeddata', updateCoverMode, { once: true });
      updateCoverMode();
      window.setTimeout(updateCoverMode, 250);
      window.setTimeout(updateCoverMode, 900);

      viewCoverVideo.play().catch(() => {});
      if (viewCoverPlaceholder) viewCoverPlaceholder.hidden = true;
    } else if (viewCoverPlaceholder) {
      viewCoverPlaceholder.hidden = false;
    }
    return user;
  };

  const renderFollowState = async () => {
    const status = await api(`/api/follow/status/${encodeURIComponent(userId)}`);
    if (!followButton || !unfollowButton || !followHint) return;
    if (userChatButton) {
      userChatButton.dataset.chatUserId = userId;
      userChatButton.hidden = String(userId) === String(currentUserId);
      userChatButton.textContent = status.status === 'accepted' ? '💬 Napsat zprávu' : '✉️ Žádost o zprávu';
    }

    followButton.disabled = false;
    followButton.hidden = false;
    unfollowButton.hidden = true;
    followHint.textContent = '';

    if (status.status === 'accepted') {
      followButton.hidden = true;
      unfollowButton.hidden = false;
      followHint.textContent = 'Sleduješ tohoto uživatele. Uvidíš i obsah pro sledované.';
      return;
    }
    if (status.status === 'pending_outgoing') {
      followButton.textContent = 'Žádost odeslána';
      followButton.disabled = true;
      followHint.textContent = 'Čeká se na schválení Žádosti.';
      return;
    }
    if (status.status === 'pending_incoming') {
      followButton.textContent = 'Má žádost u tebe';
      followButton.disabled = true;
      followHint.textContent = 'Tento uživatel chce sledovat tebe, vyřešíš to v Oznámeních.';
      return;
    }
    followButton.textContent = 'Sledovat';
  };

  const snapshotVideoState = (root = userPosts) => {
    const state = new Map();
    root?.querySelectorAll?.('.feed-item[data-media-id] video.video-player')?.forEach((video) => {
      const id = video.closest('.feed-item')?.dataset.mediaId;
      if (!id) return;
      state.set(String(id), {
        time: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume
      });
    });
    return state;
  };

  const restoreVideoState = (state, root = userPosts) => {
    if (!state?.size) return;
    root?.querySelectorAll?.('.feed-item[data-media-id] video.video-player')?.forEach((video) => {
      const id = video.closest('.feed-item')?.dataset.mediaId;
      const saved = state.get(String(id));
      if (!saved) return;
      video.muted = saved.muted;
      video.volume = saved.volume;
      const restore = () => {
        if (saved.time > 0 && Math.abs((video.currentTime || 0) - saved.time) > 0.35) {
          try { video.currentTime = Math.min(saved.time, Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.2) : saved.time); } catch {}
        }
        if (!saved.paused) video.play().catch(() => {});
      };
      if (video.readyState >= 1) restore();
      else video.addEventListener('loadedmetadata', restore, { once: true });
    });
  };

  const loadPosts = async (owner) => {
    const items = await api(`/api/media?ownerId=${encodeURIComponent(userId)}`);
    const arr = Array.isArray(items) ? items : [];
    if (!userPosts) return;
    const videoState = snapshotVideoState(userPosts);
    if (!arr.length) {
      userPosts.innerHTML = `<div class="feed-empty">Zatím žádné příspěvky.</div>`;
      return;
    }
    userPosts.innerHTML = arr
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((it) => createCard(it, owner))
      .join('');
    restoreVideoState(videoState, userPosts);
  };

  const bindPostEvents = () => {
    if (!userPosts) return;
    userPosts.addEventListener('click', async (e) => {
      const reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn && !reactionBtn.closest('[data-action="comment-reaction"]')) {
        const mediaId = reactionBtn.dataset.mediaId;
        const reactionType = reactionBtn.dataset.reaction;
        try {
          await api(`/api/media/${encodeURIComponent(mediaId)}/react`, { method: 'POST', body: { type: reactionType } });
          const owner = await api(`/api/users/${encodeURIComponent(userId)}`);
          await loadPosts(owner);
        } catch (err) {
          showToast(err?.message || 'Nepodařilo se uložit reakci.', 'error');
        }
        return;
      }

      const commentReactionBtn = e.target.closest('[data-action="comment-reaction"]');
      if (commentReactionBtn) {
        const mediaId = commentReactionBtn.dataset.mediaId;
        const commentId = commentReactionBtn.dataset.commentId;
        const reactionType = commentReactionBtn.dataset.reaction;
        try {
          await api(`/api/media/${encodeURIComponent(mediaId)}/comment/${encodeURIComponent(commentId)}/react`, { method: 'POST', body: { type: reactionType } });
          const owner = await api(`/api/users/${encodeURIComponent(userId)}`);
          await loadPosts(owner);
        } catch (err) {
          showToast(err?.message || 'Nepodařilo se uložit reakci komentáře.', 'error');
        }
        return;
      }

      const deleteCommentBtn = e.target.closest('[data-action="delete-comment"]');
      if (deleteCommentBtn) {
        const mediaId = deleteCommentBtn.dataset.mediaId;
        const commentId = deleteCommentBtn.dataset.commentId;
        try {
          await api(`/api/media/${encodeURIComponent(mediaId)}/comment/${encodeURIComponent(commentId)}/delete`, { method: 'POST' });
          const owner = await api(`/api/users/${encodeURIComponent(userId)}`);
          await loadPosts(owner);
        } catch (err) {
          showToast(err?.message || 'Nepodařilo se smazat komentář.', 'error');
        }
        return;
      }

      const toggleBtn = e.target.closest('[data-action="toggle-comments"]');
      if (toggleBtn) {
        const mediaId = toggleBtn.dataset.mediaId;
        const section = userPosts.querySelector(`[data-comments-id="${mediaId}"]`);
        if (section) section.hidden = !section.hidden;
        return;
      }

      const addBtn = e.target.closest('[data-action="add-comment"]');
      if (addBtn) {
        const mediaId = addBtn.dataset.mediaId;
        const input = userPosts.querySelector(`[data-comment-input="${mediaId}"]`);
        if (!input || !input.value.trim()) return;
        try {
          await api(`/api/media/${encodeURIComponent(mediaId)}/comment`, { method: 'POST', body: { text: input.value.trim() } });
          const owner = await api(`/api/users/${encodeURIComponent(userId)}`);
          await loadPosts(owner);
        } catch (err) {
          showToast(err?.message || 'Nepodařilo se přidat komentář.', 'error');
        }
      }
    });
  };

  followButton?.addEventListener('click', async () => {
    followButton.disabled = true;
    followButton.textContent = 'Odesílám...';
    try {
      await api('/api/follow/request', { method: 'POST', body: { toUserId: userId } });
      showToast('Žádost o sledování odeslána.', 'info');
      await renderFollowState();
    } catch (err) {
      showToast(err?.message || 'Nepodařilo se odeslat žádost.', 'error');
      followButton.disabled = false;
      followButton.textContent = 'Sledovat';
    }
  });

  unfollowButton?.addEventListener('click', async () => {
    unfollowButton.disabled = true;
    try {
      await api('/api/follow/unfollow', { method: 'POST', body: { toUserId: userId } });
      showToast('Uživatele už nesleduješ.', 'info');
      unfollowButton.disabled = false;
      await renderFollowState();
    } catch (err) {
      showToast(err?.message || 'Nepodařilo se přestat sledovat.', 'error');
      unfollowButton.disabled = false;
    }
  });

  copyProfileLinkButton?.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(userId)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Odkaz na profil zkopírován.', 'success');
    } catch {
      window.prompt('Odkaz na profil:', url);
    }
  });

  (async () => {
    try {
      const owner = await loadProfile();
      await renderFollowState();
      await loadPosts(owner);
      bindPostEvents();
    } catch (e) {
      showToast(e?.message || 'Nepodařilo se načíst profil.', 'error');
      if (userSubtitle) userSubtitle.textContent = 'Nepodařilo se načíst profil.';
      if (userPosts) userPosts.innerHTML = `<div class="feed-empty">Nepodařilo se načíst příspěvky.</div>`;
    }
  })();
})();
