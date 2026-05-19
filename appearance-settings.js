(() => {
  const allowed = {
    theme: new Set(['glass', 'contrast', 'calm']),
    density: new Set(['comfortable', 'compact']),
    textScale: new Set(['normal', 'large']),
    radius: new Set(['sharp', 'soft', 'rounded']),
    layoutWidth: new Set(['standard', 'wide']),
    glassStrength: new Set(['clear', 'frosted', 'solid']),
    accent: new Set(['teal', 'violet', 'blue', 'amber']),
    backgroundEffects: new Set(['quiet', 'standard', 'off']),
    navigation: new Set(['full', 'compact'])
  };

  const getCookie = (name) => {
    const prefix = `${encodeURIComponent(name)}=`;
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) || '';
  };

  const normalize = (preferences = {}) => ({
    theme: allowed.theme.has(String(preferences.theme || '')) ? String(preferences.theme) : 'glass',
    density: allowed.density.has(String(preferences.density || '')) ? String(preferences.density) : 'comfortable',
    textScale: allowed.textScale.has(String(preferences.textScale || '')) ? String(preferences.textScale) : 'normal',
    radius: allowed.radius.has(String(preferences.radius || '')) ? String(preferences.radius) : 'soft',
    layoutWidth: allowed.layoutWidth.has(String(preferences.layoutWidth || '')) ? String(preferences.layoutWidth) : 'standard',
    glassStrength: allowed.glassStrength.has(String(preferences.glassStrength || '')) ? String(preferences.glassStrength) : 'frosted',
    accent: allowed.accent.has(String(preferences.accent || '')) ? String(preferences.accent) : 'teal',
    backgroundEffects: allowed.backgroundEffects.has(String(preferences.backgroundEffects || '')) ? String(preferences.backgroundEffects) : 'quiet',
    navigation: allowed.navigation.has(String(preferences.navigation || '')) ? String(preferences.navigation) : 'full',
    reduceMotion: Boolean(preferences.reduceMotion),
    enterToSend: preferences.enterToSend !== false,
    chatSound: Boolean(preferences.chatSound),
    mediaAutoplay: Boolean(preferences.mediaAutoplay),
    updatedAt: preferences.updatedAt || new Date().toISOString()
  });

  const applyPreferences = (preferences, userId = localStorage.getItem('anukCurrentUser'), persist = true) => {
    const safe = normalize(preferences);
    document.documentElement.dataset.theme = safe.theme;
    document.documentElement.dataset.density = safe.density;
    document.documentElement.dataset.textScale = safe.textScale;
    document.documentElement.dataset.radius = safe.radius;
    document.documentElement.dataset.layoutWidth = safe.layoutWidth;
    document.documentElement.dataset.glass = safe.glassStrength;
    document.documentElement.dataset.accent = safe.accent;
    document.documentElement.dataset.effects = safe.backgroundEffects;
    document.documentElement.dataset.navigation = safe.navigation;
    document.documentElement.classList.toggle('reduce-motion', safe.reduceMotion);
    document.documentElement.classList.toggle('media-autoplay', safe.mediaAutoplay);
    if (persist) {
      localStorage.setItem('anukPreferences', JSON.stringify(safe));
      if (userId) localStorage.setItem(`anukPreferences:${userId}`, JSON.stringify(safe));
    }
    window.dispatchEvent(new CustomEvent('anuk:preferences', { detail: safe }));
    return safe;
  };

  const getStatus = (form) => {
    let status = document.getElementById('settingsAppearanceStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'settingsAppearanceStatus';
      status.className = 'settings-save-status';
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
    }
    return status;
  };

  const collectPreferences = () => ({
    theme: document.getElementById('settingsTheme')?.value || 'glass',
    density: document.getElementById('settingsDensity')?.value || 'comfortable',
    textScale: document.getElementById('settingsTextScale')?.value || 'normal',
    radius: document.getElementById('settingsRadius')?.value || 'soft',
    layoutWidth: document.getElementById('settingsLayoutWidth')?.value || 'standard',
    glassStrength: document.getElementById('settingsGlassStrength')?.value || 'frosted',
    accent: document.getElementById('settingsAccent')?.value || 'teal',
    backgroundEffects: document.getElementById('settingsBackgroundEffects')?.value || 'quiet',
    navigation: document.getElementById('settingsNavigation')?.value || 'full',
    reduceMotion: Boolean(document.getElementById('settingsReduceMotion')?.checked),
    enterToSend: document.getElementById('settingsEnterToSend')?.checked !== false,
    chatSound: Boolean(document.getElementById('settingsChatSound')?.checked),
    mediaAutoplay: Boolean(document.getElementById('settingsMediaAutoplay')?.checked)
  });

  const readStoredPreferences = () => {
    const userId = localStorage.getItem('anukCurrentUser');
    const read = (key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    };
    return userId ? { ...read('anukPreferences'), ...read(`anukPreferences:${userId}`) } : read('anukPreferences');
  };

  const storedPreferences = readStoredPreferences();
  applyPreferences(storedPreferences, localStorage.getItem('anukCurrentUser'), Boolean(Object.keys(storedPreferences).length));

  const previewAppearance = (event) => {
    const form = event.target?.closest?.('#settingsAppearanceForm');
    if (!form || form.dataset.saving === 'true') return;
    applyPreferences(collectPreferences());
    const status = document.getElementById('settingsAppearanceStatus');
    if (status) {
      status.dataset.state = 'saving';
      status.textContent = 'Náhled je zapnutý. Pro trvalé uložení klikni na Uložit vzhled.';
    }
  };

  const saveAppearance = async (event) => {
    const form = event.target?.closest?.('#settingsAppearanceForm');
    if (!form || form.dataset.saving === 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const userId = localStorage.getItem('anukCurrentUser');
    const status = getStatus(form);
    const button = form.querySelector('button[type="submit"]');
    const originalText = button?.textContent || 'Uložit vzhled';
    const preferences = collectPreferences();

    if (!userId) {
      status.dataset.state = 'error';
      status.textContent = 'Nejste přihlášený. Přihlaste se znovu.';
      return;
    }

    form.dataset.saving = 'true';
    if (button) {
      button.disabled = true;
      button.textContent = 'Ukládám...';
    }
    status.dataset.state = 'saving';
    status.textContent = 'Ukládám vzhled...';

    try {
      const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN'));
      const headers = { 'Content-Type': 'application/json', 'x-user-id': userId };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/settings`, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ preferences })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Server vrátil chybu ${response.status}.`);
      }
      const saved = applyPreferences(data?.settings?.preferences || preferences, userId);
      status.dataset.state = 'success';
      status.textContent = `Uloženo. Režim pozadí: ${saved.backgroundEffects}, akcent: ${saved.accent}.`;
    } catch (err) {
      applyPreferences(preferences, userId);
      status.dataset.state = 'error';
      status.textContent = `${err?.message || 'Nepodařilo se uložit na server.'} Změna je zatím uložená v tomto prohlížeči.`;
    } finally {
      form.dataset.saving = 'false';
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  };

  document.addEventListener('input', previewAppearance, true);
  document.addEventListener('change', previewAppearance, true);
  document.addEventListener('submit', saveAppearance, true);
})();
