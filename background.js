(() => {
  let backgroundEffects = 'quiet';
  const readStoredPreferences = () => {
    try {
      const userId = localStorage.getItem('anukCurrentUser');
      const globalPrefs = JSON.parse(localStorage.getItem('anukPreferences') || '{}');
      const userPrefs = userId ? JSON.parse(localStorage.getItem(`anukPreferences:${userId}`) || '{}') : {};
      return {
        ...(globalPrefs && typeof globalPrefs === 'object' ? globalPrefs : {}),
        ...(userPrefs && typeof userPrefs === 'object' ? userPrefs : {})
      };
    } catch {
      return {};
    }
  };

  const normalizePreferences = (prefs = {}) => ({
    theme: ['glass', 'contrast', 'calm'].includes(String(prefs.theme || '')) ? String(prefs.theme) : 'glass',
    density: ['comfortable', 'compact'].includes(String(prefs.density || '')) ? String(prefs.density) : 'comfortable',
    accent: ['teal', 'violet', 'blue', 'amber'].includes(String(prefs.accent || '')) ? String(prefs.accent) : 'teal',
    backgroundEffects: ['quiet', 'standard', 'off'].includes(String(prefs.backgroundEffects || '')) ? String(prefs.backgroundEffects) : 'quiet',
    navigation: ['full', 'compact'].includes(String(prefs.navigation || '')) ? String(prefs.navigation) : 'full',
    reduceMotion: Boolean(prefs.reduceMotion),
    enterToSend: prefs.enterToSend !== false,
    chatSound: Boolean(prefs.chatSound),
    mediaAutoplay: Boolean(prefs.mediaAutoplay),
    updatedAt: prefs.updatedAt || ''
  });

  const applyPreferences = (prefs = {}, options = {}) => {
    const existing = readStoredPreferences();
    const incomingTime = Date.parse(prefs.updatedAt || '') || 0;
    const existingTime = Date.parse(existing.updatedAt || '') || 0;
    const source = incomingTime > existingTime ? { ...existing, ...prefs } : { ...prefs, ...existing };
    const safe = normalizePreferences(source);
    if (!safe.updatedAt) safe.updatedAt = new Date().toISOString();
    backgroundEffects = safe.backgroundEffects;
    document.documentElement.dataset.theme = safe.theme;
    document.documentElement.dataset.density = safe.density;
    document.documentElement.dataset.accent = safe.accent;
    document.documentElement.dataset.effects = safe.backgroundEffects;
    document.documentElement.dataset.navigation = safe.navigation;
    document.documentElement.classList.toggle('reduce-motion', safe.reduceMotion);
    document.documentElement.classList.toggle('media-autoplay', safe.mediaAutoplay);
    if (options.persist) {
      localStorage.setItem('anukPreferences', JSON.stringify(safe));
      const userId = localStorage.getItem('anukCurrentUser');
      if (userId) localStorage.setItem(`anukPreferences:${userId}`, JSON.stringify(safe));
    }
    return safe;
  };

  applyPreferences(readStoredPreferences());

  if (!document.documentElement.dataset.effects) {
    document.documentElement.dataset.effects = backgroundEffects;
  }

  const markup = `
    <svg class="bg-svg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6D5EF7" stop-opacity="0.95" />
          <stop offset="0.5" stop-color="#60A5FA" stop-opacity="0.75" />
          <stop offset="1" stop-color="#22D3EE" stop-opacity="0.6" />
        </linearGradient>
        <linearGradient id="glass-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity=".32" />
          <stop offset=".35" stop-color="#67E8F9" stop-opacity=".20" />
          <stop offset="1" stop-color="#2563EB" stop-opacity=".08" />
        </linearGradient>
        <linearGradient id="glass-violet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity=".28" />
          <stop offset=".48" stop-color="#A78BFA" stop-opacity=".19" />
          <stop offset="1" stop-color="#22D3EE" stop-opacity=".07" />
        </linearGradient>
        <linearGradient id="glass-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFF7ED" stop-opacity=".26" />
          <stop offset=".52" stop-color="#F59E0B" stop-opacity=".13" />
          <stop offset="1" stop-color="#06B6D4" stop-opacity=".07" />
        </linearGradient>
        <radialGradient id="glass-shine" cx=".28" cy=".18" r=".72">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity=".72" />
          <stop offset=".24" stop-color="#FFFFFF" stop-opacity=".18" />
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="800" fill="#0B1230" opacity="0" />
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g class="float-4 glass-dust" opacity=".42" stroke="#FFFFFF" stroke-width="1.6">
          <circle cx="95" cy="118" r="3" fill="#FFFFFF" opacity=".58" />
          <circle cx="218" cy="82" r="2.4" fill="#67E8F9" opacity=".55" />
          <circle cx="1018" cy="132" r="3" fill="#FFFFFF" opacity=".42" />
          <circle cx="1108" cy="608" r="2.6" fill="#A78BFA" opacity=".48" />
          <circle cx="144" cy="690" r="2.6" fill="#FFFFFF" opacity=".45" />
          <circle cx="986" cy="706" r="2.8" fill="#22D3EE" opacity=".42" />
          <path d="M68 358h20M78 348v20" />
          <path d="M1078 292h24M1090 280v24" />
          <path d="M552 90h20M562 80v20" />
        </g>
        <g class="float-1 glass-shells" stroke="#FFFFFF" stroke-opacity=".62" stroke-width="2.2" opacity=".78">
          <circle cx="184" cy="226" r="72" fill="url(#glass-cyan)" />
          <circle cx="166" cy="205" r="28" fill="url(#glass-shine)" stroke="none" opacity=".82" />
          <circle cx="1028" cy="198" r="54" fill="url(#glass-violet)" />
          <circle cx="1013" cy="182" r="20" fill="url(#glass-shine)" stroke="none" opacity=".72" />
          <rect x="920" y="520" width="138" height="92" rx="22" transform="rotate(-8 989 566)" fill="url(#glass-cyan)" />
          <path d="M944 540c24-10 68-14 106-5" stroke="#FFFFFF" stroke-width="2" opacity=".42" />
          <rect x="112" y="542" width="118" height="86" rx="20" transform="rotate(10 171 585)" fill="url(#glass-warm)" />
          <path d="M136 560c24-5 56-2 82 8" stroke="#FFFFFF" stroke-width="2" opacity=".34" />
        </g>
        <g class="float-2 glass-prisms" stroke="#FFFFFF" stroke-opacity=".68" stroke-width="2" opacity=".80">
          <circle cx="362" cy="154" r="46" fill="url(#glass-violet)" />
          <circle cx="348" cy="140" r="15" fill="url(#glass-shine)" stroke="none" />
          <circle cx="840" cy="104" r="32" fill="url(#glass-cyan)" />
          <path d="M664 174l52 92h-104z" fill="url(#glass-warm)" />
          <path d="M651 196h38" stroke="#FFFFFF" stroke-width="2" opacity=".42" />
          <path d="M270 650l70-42 64 48-68 44z" fill="url(#glass-violet)" />
          <path d="M300 648l42-25 40 29" stroke="#FFFFFF" stroke-width="2" opacity=".35" />
          <path d="M998 390l54 30-8 62-58 12-36-48z" fill="url(#glass-cyan)" />
          <path d="M982 418c18-10 40-10 62 2" stroke="#FFFFFF" stroke-width="2" opacity=".38" />
        </g>
        <g class="float-3 glass-lines" stroke="#FFFFFF" stroke-width="2.4" opacity=".42">
          <path d="M760 640h92M806 594v92" />
          <path d="M438 438h78M477 400v78" />
          <path d="M1058 698h60M1088 668v60" />
          <circle cx="604" cy="612" r="22" fill="url(#glass-violet)" opacity=".66" />
          <circle cx="74" cy="448" r="18" fill="url(#glass-cyan)" opacity=".62" />
          <path d="M588 598c10-7 24-6 33 1" stroke="#FFFFFF" stroke-width="1.8" opacity=".42" />
        </g>
      </g>
    </svg>
  `;

  const mount = () => {
    let bg = document.querySelector('.bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.className = 'bg';
      bg.setAttribute('aria-hidden', 'true');
      document.body.prepend(bg);
    }
    if (backgroundEffects !== 'standard') {
      bg.innerHTML = '';
      return;
    }
    bg.innerHTML = markup;
  };

  const refreshPreferences = (prefs = readStoredPreferences(), options = {}) => {
    applyPreferences(prefs, options);
    if (document.body) mount();
    syncMediaAutoplay();
  };

  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  const syncMediaAutoplay = () => {
    let prefs = {};
    try {
      prefs = JSON.parse(localStorage.getItem('anukPreferences') || '{}') || {};
    } catch {}
    const enabled = Boolean(prefs.mediaAutoplay);
    document.querySelectorAll('video.video-player').forEach((video) => {
      video.autoplay = enabled;
      video.preload = enabled ? 'auto' : 'metadata';
      // DŮLEŽITÉ: Preference "autoplay" nesmí uživateli vypínat ručně spuštěné video.
      // Původně se při enabled=false volalo video.pause() a protože tohle běží po každé DOM změně
      // (MutationObserver), video se pak zastavovalo opakovaně každých pár sekund.
      //
      // Zde pouze nastavujeme chování pro AUTOPLAY (autoplay/preload) a případně pomůžeme
      // rozběhnout videa, která mají být autoplay (typicky muted).
      video.playsInline = true;
      if (enabled) {
        video.muted = true;
        if (video.paused) {
          video.play?.().catch(() => {});
        }
      }
    });
  };

  const startMediaWatcher = () => {
    syncMediaAutoplay();
    let scheduled = 0;
    const observer = new MutationObserver(() => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(syncMediaAutoplay, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === 'anukPreferences') refreshPreferences(readStoredPreferences());
    });
  };

  window.addEventListener('anuk:preferences', (event) => {
    refreshPreferences(event.detail || readStoredPreferences(), { persist: true });
  });

  const syncPreferencesFromServer = async () => {
    const userId = localStorage.getItem('anukCurrentUser');
    if (!userId) return;
    try {
      // Nevolej settings, pokud uživatel nemá platnou session cookie – jinak to zbytečně dělá 403 v konzoli/logu.
      const sessionResponse = await fetch('/api/session', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      const session = await sessionResponse.json().catch(() => null);
      if (!session?.authenticated) return;

      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/settings`, {
        credentials: 'same-origin',
        // x-user-id může pomoci v dev režimu, pokud je na serveru povolený ALLOW_INSECURE_USER_HEADER.
        headers: { 'Accept': 'application/json', 'x-user-id': userId }
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      if (data?.settings?.preferences) {
        refreshPreferences(data.settings.preferences, { persist: true });
      }
    } catch {}
  };

  if (document.body) {
    startMediaWatcher();
    syncPreferencesFromServer();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      startMediaWatcher();
      syncPreferencesFromServer();
    }, { once: true });
  }
})();
