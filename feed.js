(() => {
  let currentUserId = localStorage.getItem('anukCurrentUser');
  const feedList = document.getElementById('feedList');
  const feedSearch = document.getElementById('feedSearch');
  const feedTabPublic = document.getElementById('feedTabPublic');
  const feedTabFollowing = document.getElementById('feedTabFollowing');
  const profileLink = document.getElementById('profileLink');
  const feedLogout = document.getElementById('feedLogout');
  const feedSettings = document.getElementById('feedSettings');
  const feedPostText = document.getElementById('feedPostText');
  const feedPostCamera = document.getElementById('feedPostCamera');
  const feedPostVideo = document.getElementById('feedPostVideo');
  const feedPostFile = document.getElementById('feedPostFile');
  const feedUsersButton = document.getElementById('feedUsersButton');
  const feedLiveButton = document.getElementById('feedLiveButton');
  const feedNotificationsButton = document.getElementById('feedNotificationsButton');
  const toastEl = document.getElementById('toast');
  const feedTypeAll = document.getElementById('feedTypeAll');
  const feedTypeImages = document.getElementById('feedTypeImages');
  const feedTypeVideos = document.getElementById('feedTypeVideos');
  const feedTypeText = document.getElementById('feedTypeText');
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

  const syncCurrentUserFromSession = async () => {
    try {
      const response = await fetch(getApiBase() + '/api/session', { credentials: 'same-origin' });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.authenticated && data?.user?.id) {
        currentUserId = String(data.user.id);
        localStorage.setItem('anukCurrentUser', currentUserId);
        return currentUserId;
      }
    } catch {}
    return currentUserId;
  };

  // Modaly pro vytv·žen· příspěvků (text / upload / kamera)
  const postTextModal = document.getElementById('postTextModal');
  const postUploadModal = document.getElementById('postUploadModal');
  const postCameraModal = document.getElementById('postCameraModal');
  const postVideoModal = document.getElementById('postVideoModal');
  const usersModal = document.getElementById('usersModal');
  const usersSearch = document.getElementById('usersSearch');
  const usersList = document.getElementById('usersList');
  const notificationsModal = document.getElementById('notificationsModal');
  const notificationsList = document.getElementById('notificationsList');
  const followRequestsList = document.getElementById('followRequestsList');
  const notificationsReadAll = document.getElementById('notificationsReadAll');
  const liveModal = document.getElementById('liveModal');
  const liveStudioModal = document.getElementById('liveStudioModal');
  const livePublicStudioModal = document.getElementById('livePublicStudioModal');
  const liveViewerModal = document.getElementById('liveViewerModal');
  const liveStudioClose = document.getElementById('liveStudioClose');
  const livePublicStudioClose = document.getElementById('livePublicStudioClose');
  const liveViewerClose = document.getElementById('liveViewerClose');
  const liveStudioStart = document.getElementById('liveStudioStart');
  const liveStudioStop = document.getElementById('liveStudioStop');
  const livePublicStudioStart = document.getElementById('livePublicStudioStart');
  const livePublicStudioStop = document.getElementById('livePublicStudioStop');
  const liveStudioRoomLabel = document.getElementById('liveStudioRoomLabel');
  const liveStudioRoomCode = document.getElementById('liveStudioRoomCode');
  const liveStudioGenerateCode = document.getElementById('liveStudioGenerateCode');
  const liveStudioCopyCode = document.getElementById('liveStudioCopyCode');
  const liveStudioShareFollowers = document.getElementById('liveStudioShareFollowers');
  const liveViewerRoomLabel = document.getElementById('liveViewerRoomLabel');
  const liveLocalVideo = document.getElementById('liveLocalVideo');
  const livePublicPreview = document.getElementById('livePublicPreview');
  const livePublicPreviewStatus = document.getElementById('livePublicPreviewStatus');
  const liveRemoteVideo = document.getElementById('liveRemoteVideo');
  const liveViewerStatus = document.getElementById('liveViewerStatus');
  const liveReceiveMeter = document.getElementById('liveReceiveMeter');
  const liveTitle = document.getElementById('liveTitle');
  const liveStartPrivateButton = document.getElementById('liveStartPrivateButton');
  const liveStartPublicButton = document.getElementById('liveStartPublicButton');
  const liveStopButton = document.getElementById('liveStopButton');
  const liveJoinCode = document.getElementById('liveJoinCode');
  const liveJoinButton = document.getElementById('liveJoinButton');
  const liveLeaveButton = document.getElementById('liveLeaveButton');
  const liveStatus = document.getElementById('liveStatus');
  const liveRefreshPublic = document.getElementById('liveRefreshPublic');
  const livePublicList = document.getElementById('livePublicList');
  const liveFullscreenButton = document.getElementById('liveFullscreenButton');
  const liveStudioChatList = document.getElementById('liveStudioChatList');
  const liveStudioChatPanel = document.getElementById('liveStudioChatPanel');
  const liveStudioChatForm = document.getElementById('liveStudioChatForm');
  const liveStudioChatInput = document.getElementById('liveStudioChatInput');
  const liveStudioReactionSummary = document.getElementById('liveStudioReactionSummary');
  const liveStudioViewerCount = document.getElementById('liveStudioViewerCount');
  const liveStudioParticipantCount = document.getElementById('liveStudioParticipantCount');
  const liveStudioParticipants = document.getElementById('liveStudioParticipants');
  const livePublicChatPanel = document.getElementById('livePublicChatPanel');
  const livePublicChatList = document.getElementById('livePublicChatList');
  const livePublicChatForm = document.getElementById('livePublicChatForm');
  const livePublicChatInput = document.getElementById('livePublicChatInput');
  const livePublicReactionSummary = document.getElementById('livePublicReactionSummary');
  const livePublicViewerCount = document.getElementById('livePublicViewerCount');
  const livePublicParticipantCount = document.getElementById('livePublicParticipantCount');
  const livePublicParticipants = document.getElementById('livePublicParticipants');
  const livePublicAudienceBadge = document.getElementById('livePublicAudienceBadge');
  const liveViewerChatPanel = document.getElementById('liveViewerChatPanel');
  const liveViewerChatList = document.getElementById('liveViewerChatList');
  const liveViewerChatForm = document.getElementById('liveViewerChatForm');
  const liveViewerChatInput = document.getElementById('liveViewerChatInput');
  const liveViewerReactionSummary = document.getElementById('liveViewerReactionSummary');
  const liveViewerViewerCount = document.getElementById('liveViewerViewerCount');
  const liveViewerParticipantCount = document.getElementById('liveViewerParticipantCount');
  const liveViewerParticipants = document.getElementById('liveViewerParticipants');
  const liveStage = document.getElementById('liveStage');
  const liveCameraOverlay = document.getElementById('liveCameraOverlay');
  const liveStudioBadge = document.getElementById('liveStudioBadge');
  const liveToggleCamera = document.getElementById('liveToggleCamera');
  const liveToggleMic = document.getElementById('liveToggleMic');
  const livePublicToggleCamera = document.getElementById('livePublicToggleCamera');
  const livePublicToggleMic = document.getElementById('livePublicToggleMic');
  const livePublicTools = document.getElementById('livePublicTools');
  const livePublicToolsToggle = document.getElementById('livePublicToolsToggle');
  const liveSwitchCamera = document.getElementById('liveSwitchCamera');
  const livePublicSwitchCamera = document.getElementById('livePublicSwitchCamera');
  const liveDeviceTest = document.getElementById('liveDeviceTest');
  const livePublicDeviceTest = document.getElementById('livePublicDeviceTest');
  const livePublicMirror = document.getElementById('livePublicMirror');
  const livePublicQuality = document.getElementById('livePublicQuality');
  const liveShareScreen = document.getElementById('liveShareScreen');
  const liveCallAdmin = document.getElementById('liveCallAdmin');
  const liveViewerMute = document.getElementById('liveViewerMute');
  const liveViewerFit = document.getElementById('liveViewerFit');
  const liveViewerFullscreen = document.getElementById('liveViewerFullscreen');
  const liveViewerReconnect = document.getElementById('liveViewerReconnect');
  const postTextForm = document.getElementById('postTextForm');
  const postTextPreview = document.getElementById('postTextPreview');
  const postUploadForm = document.getElementById('postUploadForm');
  const postCameraForm = document.getElementById('postCameraForm');
  const postVideoForm = document.getElementById('postVideoForm');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraStatus = document.getElementById('cameraStatus');
  const cameraSnapButton = document.getElementById('cameraSnapButton');
  const videoDurationSelect = document.getElementById('videoDurationSelect');
  const videoDuration30s = document.getElementById('videoDuration30s');
  const videoDuration90s = document.getElementById('videoDuration90s');
  const videoRecordingPreview = document.getElementById('videoRecordingPreview');
  const videoRecordingCamera = document.getElementById('videoRecordingCamera');
  const videoTimer = document.getElementById('videoTimer');
  const videoStartButton = document.getElementById('videoStartButton');
  const videoStopButton = document.getElementById('videoStopButton');
  const videoPublishButton = document.getElementById('videoPublishButton');
  const videoDurationLabel = document.getElementById('videoDurationLabel');

  let allUsers = []; // Global variable to store users
  let allItems = []; // Global variable to store items
  const openedCommentIds = new Set();
  const commentDrafts = new Map();
  let feedEventsBound = false;
  let currentProfile = null;
  let feedMode = 'public'; // public | following
  let feedType = 'all'; // all | image | video | text
  let notificationsPollTimer = null;
  let liveFeedRefreshTimer = null;

  let cameraStream = null;
  let cameraSnapshot = '';

  // Video recording state
  let videoStream = null;
  let mediaRecorder = null;
  let videoBlob = null;
  let videoChunks = [];
  let videoRecordingDuration = 0;
  let videoRecordingTimer = null;
  let isVideoRecording = false;

  // Live (WebRTC) state
  let liveLocalStream = null;
  let liveIsBroadcasting = false;
  let liveRoomId = '';
  let liveRoomVisibility = '';
  let liveViewerOfferId = '';
  let liveBroadcasterPollTimer = null;
  let liveViewerPollTimer = null;
  let liveBroadcasterPeerMap = new Map(); // offerId -> RTCPeerConnection
  let liveViewerPc = null;
  let liveLastOfferTs = 0;
  let liveLastIceToBroadcasterTs = 0;
  let liveLastIceToViewerTs = 0;
  // U viewerů může onicecandidate vystřelit dřív, než dostaneme offerId ze serveru.
  // Kandidáty proto krátce bufferujeme a odešleme až po vytvoření offeru.
  let livePendingIceToBroadcaster = [];
  let liveChatPollTimer = null;
  let livePresenceHeartbeatTimer = null;
  let liveAudiencePollTimer = null;
  let liveLastCommentTs = 0;
  let liveComments = [];
  let liveCameraStream = null;
  let liveScreenStream = null;
  let liveComposedCanvas = null;
  let liveComposedCtx = null;
  let liveComposedStream = null;
  let liveComposeTimer = null;
  let liveCameraSourceVideo = null;
  let liveScreenSourceVideo = null;
  let liveCameraEnabled = true;
  let liveMicEnabled = true;
  let liveFacingMode = 'user';
  let liveMirrorPreview = false;
  let liveQualityMode = 'hd'; // hd | saver
  let liveViewerFitMode = 'contain'; // contain | cover
  let liveCameraPos = { x: 0.68, y: 0.64 };
  let liveDragCamera = null;
  let livePendingStudioVisibility = '';
  const liveModalHomes = new Map();
  let liveIceServersCache = null;

  const liveReceiveState = { video: false, audio: false };

  const showToast = (message, variant = 'info') => {
    if (!toastEl) {
      // fallback
      window.alert(String(message || ''));
      return;
    }
    toastEl.textContent = String(message || '');
    toastEl.dataset.variant = variant;
    toastEl.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 3200);
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

  const TEXT_PRESETS = {
    soft: { textColor: '#f8fafc', backgroundColor: '#1f2937', borderStyle: 'glass', shadow: true },
    sunset: { textColor: '#fff7ed', backgroundColor: '#9a3412', borderStyle: 'bold', shadow: true },
    ocean: { textColor: '#ecfeff', backgroundColor: '#155e75', borderStyle: 'glass', shadow: true },
    ink: { textColor: '#f8fafc', backgroundColor: '#020617', borderStyle: 'clean', shadow: true },
    paper: { textColor: '#1f2937', backgroundColor: '#f8fafc', borderStyle: 'clean', shadow: false }
  };

  const allowedFonts = new Set(['Inter', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact']);
  const allowedAligns = new Set(['left', 'center', 'right']);
  const allowedBorders = new Set(['glass', 'clean', 'bold']);
  const allowedPresets = new Set(Object.keys(TEXT_PRESETS));
  const normalizeHexColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;

  const sanitizeTextStyle = (style = {}) => {
    const preset = allowedPresets.has(String(style.preset || '')) ? String(style.preset) : TEXT_STYLE_DEFAULTS.preset;
    const fontSize = Math.max(16, Math.min(34, Number.parseInt(style.fontSize, 10) || TEXT_STYLE_DEFAULTS.fontSize));
    return {
      preset,
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

  const collectTextStyle = (formData) => sanitizeTextStyle({
    preset: postTextForm?.dataset.textPreset || TEXT_STYLE_DEFAULTS.preset,
    fontFamily: formData.get('fontFamily'),
    fontSize: formData.get('fontSize'),
    textColor: formData.get('textColor'),
    backgroundColor: formData.get('backgroundColor'),
    textAlign: formData.get('textAlign'),
    borderStyle: formData.get('borderStyle'),
    bold: formData.get('bold') === 'on',
    italic: formData.get('italic') === 'on',
    shadow: formData.get('shadow') === 'on'
  });

  const updateTextPreview = () => {
    if (!postTextForm || !postTextPreview) return;
    const fd = new FormData(postTextForm);
    const style = collectTextStyle(fd);
    const title = String(fd.get('title') || 'Náhled příspěvku').trim() || 'Náhled příspěvku';
    const text = String(fd.get('text') || 'Text se zobrazí tady.').trim() || 'Text se zobrazí tady.';
    postTextPreview.dataset.preset = style.preset;
    postTextPreview.setAttribute('style', styleToCss(style));
    postTextPreview.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${textToHtml(text)}</span>`;
  };

  const setModalOpen = (modal, open) => {
    if (!modal) return;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  const closeAllModals = () => {
    setModalOpen(postTextModal, false);
    setModalOpen(postUploadModal, false);
    setModalOpen(postCameraModal, false);
    setModalOpen(postVideoModal, false);
    setModalOpen(usersModal, false);
    setModalOpen(notificationsModal, false);
    setModalOpen(liveModal, false);
    stopCamera();
    stopVideoRecording();
    stopLive().catch(() => {});
  };

  const wireModalCloseButtons = () => {
    document.querySelectorAll('.modal [data-close="true"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
  };

  const readAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nepodařilo se přečíst soubor.'));
    reader.readAsDataURL(file);
  });

  const setInlineStatus = (el, text, visible = true) => {
    if (!el) return;
    el.textContent = String(text || '');
    el.hidden = !visible;
  };

  const getMediaStreamWithFallback = async (profiles) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Kamera na telefonu vyžaduje HTTPS. Přes lokální http adresu může prohlížeč kameru zablokovat.');
      }
      throw new Error('Prohlížeč nepodporuje kameru nebo mikrofon.');
    }
    let lastError = null;
    for (const constraints of profiles) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break;
      }
    }
    throw lastError || new Error('Nepodařilo se získat kameru nebo mikrofon.');
  };

  const attachStreamToVideo = async (video, stream, options = {}) => {
    if (!video) return false;
    video.srcObject = stream || null;
    video.playsInline = true;
    video.autoplay = true;
    if ('muted' in options) video.muted = Boolean(options.muted);
    if ('controls' in options) video.controls = Boolean(options.controls);
    if (!stream) return false;
    try {
      await video.play();
      return true;
    } catch (err) {
      if (!video.muted && options.allowMutedFallback !== false) {
        video.muted = true;
        try {
          await video.play();
          return true;
        } catch {}
      }
      return false;
    }
  };

  const mediaPermissionMessage = (err) => {
    const name = String(err?.name || '');
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Povol kameru a mikrofon v prohlížeči a zkus to znovu.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return 'Zařízení nemá dostupnou kameru nebo mikrofon.';
    }
    if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') {
      return 'Kamera nebo mikrofon je zrovna používán jinou aplikací.';
    }
    return err?.message || 'Nepodařilo se spustit kameru nebo mikrofon.';
  };

  const startCamera = async () => {
    if (!cameraVideo) return;
    setInlineStatus(cameraStatus, 'Spouštím kameru...');
    try {
      cameraSnapshot = '';
      if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = await getMediaStreamWithFallback([
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: false },
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: true, audio: false }
      ]);
      await attachStreamToVideo(cameraVideo, cameraStream, { muted: true });
      setInlineStatus(cameraStatus, '', false);
    } catch (err) {
      setInlineStatus(cameraStatus, mediaPermissionMessage(err));
      window.alert(mediaPermissionMessage(err));
    }
  };

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
    setInlineStatus(cameraStatus, 'Kamera se spustí po povolení oprávnění.', true);
  }

  const startVideoCamera = async () => {
    if (!videoRecordingCamera) return;
    try {
      videoStream = await getMediaStreamWithFallback([
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: { echoCancellation: true, noiseSuppression: true } },
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } },
        { video: true, audio: { echoCancellation: true, noiseSuppression: true } },
        { video: true, audio: false }
      ]);
      await attachStreamToVideo(videoRecordingCamera, videoStream, { muted: true });
    } catch (err) {
      window.alert(mediaPermissionMessage(err));
      videoStream = null;
    }
  };

  function stopVideoRecording() {
    if (mediaRecorder && isVideoRecording) {
      mediaRecorder.stop();
      isVideoRecording = false;
    }
    if (videoRecordingTimer) {
      window.clearInterval(videoRecordingTimer);
      videoRecordingTimer = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      videoStream = null;
    }
    if (videoRecordingCamera) {
      videoRecordingCamera.srcObject = null;
    }
  }

  const formatVideoTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
    if (currentUserId) {
      headers['x-user-id'] = currentUserId;
    }
    const method = String(options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = decodeURIComponent(getCookie('XSRF-TOKEN'));
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }

    // Stejné pravidlo jako ve script.js: options nesmí přepsat headers.
    const fetchOptions = { credentials: 'include', ...options, headers };
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    } else {
      delete fetchOptions.body;
    }

    let response = await fetch(getApiBase() + path, fetchOptions);
    let data = await response.json().catch(() => null);
    if ((response.status === 401 || response.status === 403) && await syncCurrentUserFromSession()) {
      if (currentUserId) fetchOptions.headers['x-user-id'] = currentUserId;
      response = await fetch(getApiBase() + path, fetchOptions);
      data = await response.json().catch(() => null);
    }
    if (!response.ok) throw createApiError(data, response, 'Server error');
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
      credentials: 'include',
      ...options,
      method,
      headers,
      body: formData
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 403 && String(data?.message || '').toLowerCase().includes('neautoriz')) {
        throw new Error('Přihlášení vypršelo. Přihlas se znovu a pak akci zopakuj.');
      }
      throw createApiError(data, response, 'Chyba při nahrávání souboru.');
    }
    return data;
  };

  const uploadAsset = async (file, fileName = '') => {
    const formData = new FormData();
    formData.append('file', file, fileName || file?.name || `upload-${Date.now()}`);
    return apiForm('/api/uploads', formData);
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  const registerPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !currentUserId) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      const data = await api('/api/push/public-key');
      if (!data?.configured || !data.publicKey) return;
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });
      await api('/api/push/subscriptions', { method: 'POST', body: { subscription } });
    } catch (err) {
      console.warn('Push registration skipped:', err);
    }
  };

  const fetchMediaPublic = () => api('/api/media');
  const fetchMediaFollowing = () => api('/api/media/following');
  const fetchUsers = () => api('/api/users');
  const fetchProfile = () => currentUserId ? api(`/api/users/${encodeURIComponent(currentUserId)}`) : Promise.reject(new Error('Neautorizováno'));
  const addReaction = (mediaId, type) => api(`/api/media/${encodeURIComponent(mediaId)}/react`, { method: 'POST', body: { type } });
  const addComment = (mediaId, text) => api(`/api/media/${encodeURIComponent(mediaId)}/comment`, { method: 'POST', body: { text } });
  const addCommentReaction = (mediaId, commentId, type) => api(`/api/media/${encodeURIComponent(mediaId)}/comment/${encodeURIComponent(commentId)}/react`, { method: 'POST', body: { type } });
  const deleteComment = (mediaId, commentId) => api(`/api/media/${encodeURIComponent(mediaId)}/comment/${encodeURIComponent(commentId)}/delete`, { method: 'POST' });
  const createMedia = (payload) => api('/api/media', { method: 'POST', body: payload });
  const fetchNotifications = () => api('/api/notifications');
  const readAllNotifications = () => api('/api/notifications/read-all', { method: 'POST' });
  const readNotification = (id) => api(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
  const deleteNotification = (id) => api(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const fetchFollowRequests = () => api('/api/follow/requests');
  const respondFollowRequest = (id, action) => api(`/api/follow/requests/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { action } });
  const requestFollow = (toUserId) => api('/api/follow/request', { method: 'POST', body: { toUserId } });
  const unfollow = (toUserId) => api('/api/follow/unfollow', { method: 'POST', body: { toUserId } });
  const fetchFollowing = () => api('/api/following');
  const fetchFollowStatus = (userId) => api(`/api/follow/status/${encodeURIComponent(userId)}`);

  // Live API (signalizace)
  const createLiveRoom = (payload) => api('/api/live/rooms', { method: 'POST', body: payload || {} });
  const fetchLiveRoom = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}`);
  const fetchPublicLiveRooms = () => api('/api/live/public');
  const closeLiveRoom = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/close`, { method: 'POST' });
  const startLiveRoom = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/start`, { method: 'POST' });
  const fetchLiveOffers = (roomId, since) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/offers?since=${encodeURIComponent(String(since || 0))}`);
  const postLiveAnswer = (roomId, offerId, sdp) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/answers`, { method: 'POST', body: { offerId, sdp } });
  const postLiveOffer = (roomId, sdp) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/offers`, { method: 'POST', body: { sdp } });
  const fetchLiveAnswer = (roomId, offerId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/answers?offerId=${encodeURIComponent(String(offerId || ''))}`);
  const postLiveIce = (roomId, to, offerId, candidate) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/ice`, { method: 'POST', body: { to, offerId, candidate } });
  const fetchLiveIce = (roomId, to, offerId, since) => {
    // Server pro "viewer" vyžaduje offerId – pokud ještě není (race condition), jen vrať prázdno.
    if (to === 'viewer' && !offerId) {
      return Promise.resolve({ now: Date.now(), candidates: [] });
    }
    const qs = new URLSearchParams();
    qs.set('to', to);
    if (offerId) qs.set('offerId', offerId);
    qs.set('since', String(since || 0));
    return api(`/api/live/rooms/${encodeURIComponent(roomId)}/ice?${qs.toString()}`);
  };
  const fetchLiveComments = (roomId, since) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/comments?since=${encodeURIComponent(String(since || 0))}`);
  const postLiveComment = (roomId, text) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/comments`, { method: 'POST', body: { text } });
  const postLiveReaction = (roomId, type) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/react`, { method: 'POST', body: { type } });
  const heartbeatLiveRoom = (roomId, role) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/heartbeat`, { method: 'POST', body: { role } });
  const leaveLiveRoom = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/leave`, { method: 'POST' });
  const fetchLiveParticipants = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/participants`);
  const callLiveAdmin = (roomId, message) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/call-admin`, { method: 'POST', body: { message } });
  const shareLiveToFollowers = (roomId) => api(`/api/live/rooms/${encodeURIComponent(roomId)}/share-followers`, { method: 'POST' });
  const fetchLiveIceServerConfig = () => api('/api/live/ice-servers');

  const buildUserMap = (users) => Object.fromEntries((users || []).map((user) => [user.id, user]));

  const pluralizeCzech = (count, one, few, many) => {
    const n = Math.abs(Number(count) || 0);
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return few;
    return many;
  };

  const normalizeLiveParticipants = (participants = []) => (Array.isArray(participants) ? participants : [])
    .filter((entry) => entry && entry.userId)
    .map((entry) => ({
      userId: String(entry.userId || ''),
      userName: entry.userName || 'Uživatel',
      userRole: entry.userRole || 'user',
      profilePhoto: entry.profilePhoto || '',
      presenceRole: entry.presenceRole === 'broadcaster' ? 'broadcaster' : 'viewer'
    }));

  // Cache: koho už sleduju (accepted)
  let followingIds = new Set();
  const refreshFollowingIds = async () => {
    try {
      const following = await fetchFollowing();
      const list = Array.isArray(following) ? following : [];
      followingIds = new Set(list.map((u) => String(u?.id || '')).filter(Boolean));
    } catch {
      followingIds = new Set();
    }
  };

  const setActiveFeedType = (nextType) => {
    feedType = String(nextType || 'all');
    const map = {
      all: feedTypeAll,
      image: feedTypeImages,
      video: feedTypeVideos,
      text: feedTypeText
    };
    Object.entries(map).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle('btn-primary', key === feedType);
      btn.classList.toggle('btn-secondary', key !== feedType);
    });
    renderFeed(allItems, buildUserMap(allUsers), feedSearch?.value || '');
  };

  const liveRoomsToFeedItems = (rooms = []) => (Array.isArray(rooms) ? rooms : []).map((room) => ({
    id: `live-feed-${room.roomId}`,
    type: 'live',
    ownerId: room.ownerId,
    liveRoomId: room.roomId,
    title: room.title || 'Živé vysílání',
    description: 'Právě teď běží veřejné živé vysílání.',
    createdAt: room.startedAt || room.createdAt || new Date().toISOString(),
    ownerName: room.ownerName || '',
    ownerRole: room.ownerRole || '',
    ownerPhoto: room.ownerPhoto || '',
    viewerCount: Number(room.viewerCount || 0),
    participantCount: Number(room.participantCount || 0),
    participants: normalizeLiveParticipants(room.participants)
  }));

  const createLiveCard = (item, owner) => {
    const authorLabel = owner
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
      : (item.ownerName || 'Vysílatel');
    const roleLabel = owner?.role === 'admin'
      ? 'Administrátor'
      : owner?.role === 'creator'
        ? 'Tvůrce'
        : (item.ownerRole || 'Uživatel');
    const ownerId = owner?.id ? String(owner.id) : String(item.ownerId || '');
    const authorHref = ownerId ? `user.html?id=${encodeURIComponent(ownerId)}` : '#';
    const participants = normalizeLiveParticipants(item.participants);
    const viewerText = `${item.viewerCount || 0} ${pluralizeCzech(item.viewerCount, 'divák', 'diváci', 'diváků')}`;
    const participantText = `${item.participantCount || participants.length || 1} ${pluralizeCzech(item.participantCount || participants.length || 1, 'účastník', 'účastníci', 'účastníků')}`;
    const chips = participants.slice(0, 5).map((participant) => `
      <span class="live-participant live-participant--chip" title="${escapeHtml(participant.userName)}">
        <span class="live-participant__avatar" style="background-image:url('${escapeHtml(participant.profilePhoto || '')}')">${participant.profilePhoto ? '' : escapeHtml((participant.userName || 'U').slice(0, 1).toUpperCase())}</span>
        <span>${escapeHtml(participant.presenceRole === 'broadcaster' ? 'Vysílatel' : participant.userName)}</span>
      </span>
    `).join('');

    return `
      <article class="feed-item feed-item--live" data-live-room-id="${escapeHtml(item.liveRoomId)}">
        <div class="feed-author">
          <a class="feed-author-avatar feed-author-link" href="${authorHref}" data-action="open-profile" data-user-id="${escapeHtml(ownerId)}" aria-label="Otevřít profil ${escapeHtml(authorLabel)}" style="background-image: url('${escapeHtml(owner?.profilePhoto || item.ownerPhoto || '')}')"></a>
          <div class="feed-author-info">
            <a class="feed-author-name" href="${authorHref}" data-action="open-profile" data-user-id="${escapeHtml(ownerId)}">${escapeHtml(authorLabel)}</a>
            <span>${escapeHtml(roleLabel)} · právě živě</span>
          </div>
        </div>
        <div class="live-feed-card">
          <div class="live-feed-card__glow"></div>
          <div class="live-feed-card__main">
            <span class="live-feed-card__badge">LIVE</span>
            <h3>${escapeHtml(item.title || 'Živé vysílání')}</h3>
            <p>${escapeHtml(item.description || 'Právě teď běží veřejné živé vysílání.')}</p>
            <div class="live-feed-card__stats">
              <span>👁️ ${escapeHtml(viewerText)}</span>
              <span>👥 ${escapeHtml(participantText)}</span>
              <span>💬 Komentáře živě</span>
            </div>
            ${chips ? `<div class="live-feed-card__participants">${chips}</div>` : ''}
          </div>
          <button class="btn btn-primary" type="button" data-action="join-public-live" data-room-id="${escapeHtml(item.liveRoomId)}">Sledovat live</button>
        </div>
      </article>
    `;
  };

  const createCard = (item, owner) => {
    if (item?.type === 'live') return createLiveCard(item, owner);
    const authorLabel = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'Neznámý uživatel';
    const roleLabel = owner?.role === 'admin' ? 'Administrátor' : owner?.role === 'creator' ? 'Tvůrce' : 'Uživatel';
    const safeTitle = escapeHtml(item.title || 'Nový příspěvek');
    const safeDesc = escapeHtml(item.description || '');
    const isAdmin = currentProfile?.role === 'admin';
    const ownerId = owner?.id ? String(owner.id) : '';
    const authorHref = ownerId ? `user.html?id=${encodeURIComponent(ownerId)}` : '#';

    const isVideo = item.type === 'video' || item.type === 'short';
    const autoplayMedia = (() => {
      try {
        const userPrefs = currentUserId ? JSON.parse(localStorage.getItem(`anukPreferences:${currentUserId}`) || '{}') : {};
        const globalPrefs = JSON.parse(localStorage.getItem('anukPreferences') || '{}');
        return Boolean({ ...globalPrefs, ...userPrefs }.mediaAutoplay);
      } catch {
        return false;
      }
    })();
    const autoplayAttrs = autoplayMedia ? ' autoplay muted loop' : '';
    const preview = isVideo
      ? `<video class="video-player${item.type === 'short' ? ' video-player--short' : ''}" controls playsinline preload="metadata"${autoplayAttrs} disablepictureinpicture controlsList="nodownload noremoteplayback" src="${item.url}"></video>`
      : `<img src="${item.url}" alt="${safeTitle}" />`;

    const likes = (item.reactions?.likes || []).length;
    const dislikes = (item.reactions?.dislikes || []).length;
    const userLiked = currentUserId && (item.reactions?.likes || []).includes(currentUserId);
    const userDisliked = currentUserId && (item.reactions?.dislikes || []).includes(currentUserId);
    const comments = item.comments || [];
    const mediaId = String(item.id);
    const commentsOpen = openedCommentIds.has(mediaId);
    const commentDraft = commentDrafts.get(mediaId) || '';

    return `
      <article class="feed-item" data-media-id="${item.id}">
        <div class="feed-author">
          <a class="feed-author-avatar feed-author-link" href="${authorHref}" data-action="open-profile" data-user-id="${escapeHtml(ownerId)}" aria-label="Otevřít profil ${escapeHtml(authorLabel)}" style="background-image: url('${owner?.profilePhoto || ''}')"></a>
          <div class="feed-author-info">
            <a class="feed-author-name" href="${authorHref}" data-action="open-profile" data-user-id="${escapeHtml(ownerId)}">${escapeHtml(authorLabel)}</a>
            <span>${roleLabel} · ${new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <h3>${safeTitle}</h3>
        ${item.type === 'text'
          ? renderTextPost(item)
          : `
            <p>${safeDesc || 'Sdílený obsah od skutečného uživatele.'}</p>
            <div class="feed-preview">${preview}</div>
          `}
        ${isAdmin ? `
          <details class="feed-meta">
            <summary>Technické detaily</summary>
            <div class="feed-meta__content">
              <span>IP: ${item.ipAddress || '---'}</span>
              <span>Zařízení: ${item.deviceInfo || '---'}</span>
            </div>
          </details>
        ` : ''}

        <div class="feed-reactions">
          <button class="reaction-btn ${userLiked ? 'active' : ''}" type="button" data-reaction="like" data-media-id="${item.id}">
            👍 ${likes}
          </button>
          <button class="reaction-btn ${userDisliked ? 'active' : ''}" type="button" data-reaction="dislike" data-media-id="${item.id}">
            👎 ${dislikes}
          </button>
          <button class="reaction-btn" type="button" data-action="toggle-comments" data-media-id="${item.id}">
            💬 ${comments.length}
          </button>
        </div>

        <div class="comments-section" data-comments-id="${item.id}" ${commentsOpen ? '' : 'hidden'}>
          ${comments.map((comment) => `
            <div class="comment-item">
              <div class="comment-author">${escapeHtml(comment.userName)}</div>
              <div class="comment-text">${escapeHtml(comment.text)}</div>
              <div class="comment-time">${new Date(comment.createdAt).toLocaleString()}</div>
              <div class="comment-actions">
                <button class="reaction-btn" type="button" data-action="comment-reaction" data-reaction="like" data-media-id="${item.id}" data-comment-id="${comment.id}">👍 ${(comment.reactions?.likes || []).length}</button>
                <button class="reaction-btn" type="button" data-action="comment-reaction" data-reaction="dislike" data-media-id="${item.id}" data-comment-id="${comment.id}">👎 ${(comment.reactions?.dislikes || []).length}</button>
              </div>
              ${currentUserId === comment.userId ? `<button class="reaction-btn" type="button" data-action="delete-comment" data-media-id="${item.id}" data-comment-id="${comment.id}" style="font-size:.8rem; padding:4px 8px;">🗑️</button>` : ''}
            </div>
          `).join('')}
          <div class="comment-input">
            <input type="text" placeholder="Přidat komentář..." data-comment-input="${item.id}" value="${escapeHtml(commentDraft)}" />
            <button class="reaction-btn" type="button" data-action="add-comment" data-media-id="${item.id}" style="padding:8px 12px;">Poslat</button>
          </div>
        </div>
      </article>
    `;
  };

  const snapshotVideoState = (root = feedList) => {
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

  const restoreVideoState = (state, root = feedList) => {
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
        if (!saved.paused) {
          video.play().catch(() => {});
        }
      };
      if (video.readyState >= 1) restore();
      else video.addEventListener('loadedmetadata', restore, { once: true });
    });
  };

  const renderFeed = (items, userMap, filter = '') => {
    const normalizedFilter = filter.trim().toLowerCase();
    const visibleItems = items
      .filter((item) => {
        // Filtr typu obsahu (modern· rychlé filtry)
        if (feedType === 'image' && item.type !== 'image') return false;
        if (feedType === 'text' && item.type !== 'text') return false;
        if (feedType === 'video' && !(item.type === 'video' || item.type === 'short')) return false;

        if (!normalizedFilter) return true;
        const owner = userMap[item.ownerId];
        const authorName = `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim().toLowerCase();
        return [
          item.title,
          item.description,
          authorName,
          owner?.role
        ].some((value) => String(value || '').toLowerCase().includes(normalizedFilter));
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (feedList) {
      const videoState = snapshotVideoState(feedList);
      if (!visibleItems.length) {
        feedList.innerHTML = `<div class="feed-empty">Nic nenalezeno (zkuste změnit filtr nebo hledaný výraz).</div>`;
        return;
      }
      feedList.innerHTML = visibleItems.map((item) => createCard(item, userMap[item.ownerId])).join('');
      restoreVideoState(videoState, feedList);
    }
  };

  const refreshAndRender = async () => {
    try {
      const fetchFeedItems = () => feedMode === 'following' ? fetchMediaFollowing() : fetchMediaPublic();
      const [users, items, liveData] = await Promise.all([
        fetchUsers(),
        fetchFeedItems(),
        feedMode === 'public' ? fetchPublicLiveRooms().catch(() => ({ rooms: [] })) : Promise.resolve({ rooms: [] })
      ]);
      allUsers = users;
      allItems = [
        ...liveRoomsToFeedItems(liveData?.rooms || []),
        ...(Array.isArray(items) ? items : [])
      ];
      renderFeed(allItems, buildUserMap(allUsers), feedSearch?.value || '');
    } catch (err) {
      console.error('Chyba při refreshi feedu:', err);
    }
  };

  const renderUsersDirectory = (filter = '') => {
    if (!usersList) return;
    const q = String(filter || '').trim().toLowerCase();
    // Nezobrazovat všechny uživatele najednou, až po vyhledání.
    if (!q) {
      usersList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Začněte psát a vyhledejte konkrétního uživatele.</div>`;
      return;
    }
    if (q.length < 2) {
      usersList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Zadejte alespoň 2 znaky.</div>`;
      return;
    }
    const filtered = (allUsers || [])
      .slice()
      .sort((a, b) => String(a.lastName || '').localeCompare(String(b.lastName || ''), 'cs'))
      .filter((u) => {
        if (!q) return true;
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
        const contact = String(u.contact || '').toLowerCase();
        const role = String(u.role || '').toLowerCase();
        return [name, contact, role].some((v) => v.includes(q));
      });

    if (!filtered.length) {
      usersList.innerHTML = `<div class="feed-empty">Nenalezen žádný uživatel.</div>`;
      return;
    }

    usersList.innerHTML = filtered.map((u) => {
      const roleLabel = u.role === 'admin' ? 'Administrátor' : u.role === 'creator' ? 'Tvůrce' : 'Uživatel';
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.contact;
      const isMe = String(u.id) === String(currentUserId);
      const isFollowing = followingIds.has(String(u.id));
      const followLabel = isMe ? 'Já' : isFollowing ? 'Sleduji' : 'Sledovat';
      const followDisabled = isMe || isFollowing;
      return `
        <div class="user-row" data-user-id="${u.id}">
          <div class="user-row__left">
            <div class="user-row__avatar" style="background-image:url('${u.profilePhoto || ''}')"></div>
            <div class="user-row__name">
              <strong>${escapeHtml(name)}</strong>
              <span>${escapeHtml(roleLabel)} · ${escapeHtml(u.contact || '')}</span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="reaction-btn" data-action="open-profile" data-user-id="${u.id}">Profil</button>
            <button class="reaction-btn" data-action="follow-user" data-user-id="${u.id}" ${followDisabled ? 'disabled' : ''}>${followLabel}</button>
          </div>
        </div>
      `;
    }).join('');
  };

  const renderNotificationsModal = async () => {
    if (!notificationsModal) return;
    if (followRequestsList) followRequestsList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Načítám žádosti</div>`;
    if (notificationsList) notificationsList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Načítám oznámení</div>`;

    try {
      const [requests, notifs] = await Promise.all([fetchFollowRequests(), fetchNotifications()]);

      if (followRequestsList) {
        if (!requests?.length) {
          followRequestsList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Žádné nové žádosti o sledování.</div>`;
        } else {
          followRequestsList.innerHTML = `
            <strong>Žádosti o sledování</strong>
            <div style="display:grid; gap:10px; margin-top:10px;">
              ${(requests || []).map((r) => {
                const fromName = `${r.from?.firstName || ''} ${r.from?.lastName || ''}`.trim() || 'Uživatel';
                return `
                  <div class="user-row" style="margin:0;" data-request-id="${escapeHtml(r.id)}">
                    <div class="user-row__left">
                      <div class="user-row__avatar" style="background-image:url('${r.from?.profilePhoto || ''}')"></div>
                      <div class="user-row__name">
                        <strong>${escapeHtml(fromName)}</strong>
                        <span>chce tě sledovat</span>
                      </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <button class="reaction-btn" data-action="follow-accept" data-request-id="${escapeHtml(r.id)}">Přijmout</button>
                      <button class="reaction-btn" data-action="follow-reject" data-request-id="${escapeHtml(r.id)}">Odmítnout</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      }

      if (notificationsList) {
        const list = Array.isArray(notifs) ? notifs : [];
        if (!list.length) {
          notificationsList.innerHTML = `<div class="feed-empty">Žádné oznámení.</div>`;
        } else {
          notificationsList.innerHTML = `
            <div style="display:grid; gap:10px;">
              ${list.slice(0, 40).map((n) => {
                const isRead = Boolean(n.readAt);
                return `
                  <div class="card" style="padding:12px 14px; border-radius:16px; opacity:${isRead ? '0.72' : '1'};">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
                      <div>
                        <div style="font-weight:800;">${escapeHtml(n.message || '')}</div>
                        <div style="color:var(--muted); font-size:12px; margin-top:6px;">${new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                        ${isRead ? '' : `<button class="reaction-btn" data-action="notif-read" data-notif-id="${escapeHtml(n.id)}">Přečteno</button>`}
                        <button class="reaction-btn" data-action="notif-delete" data-notif-id="${escapeHtml(n.id)}">Smazat</button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      }
    } catch (e) {
      if (followRequestsList) followRequestsList.innerHTML = `<div class="feed-empty">Nepodařilo se načíst Žádosti.</div>`;
      if (notificationsList) notificationsList.innerHTML = `<div class="feed-empty">Nepodařilo se načíst oznámení.</div>`;
    }
  };

  const updateNotificationsBadge = async () => {
    if (!feedNotificationsButton) return;
    const base = feedNotificationsButton.getAttribute('data-base-text')
      || feedNotificationsButton.textContent
      || '🔔 Oznámení';
    feedNotificationsButton.setAttribute('data-base-text', base);

    try {
      const [requests, notifs] = await Promise.all([
        fetchFollowRequests().catch(() => []),
        fetchNotifications().catch(() => [])
      ]);
      const reqCount = Array.isArray(requests) ? requests.length : 0;
      const unread = (Array.isArray(notifs) ? notifs : []).filter((n) => !n?.readAt).length;
      const total = reqCount + unread;
      feedNotificationsButton.textContent = total > 0 ? `${base} (${total})` : base;
    } catch {
      feedNotificationsButton.textContent = base;
    }
  };

  const setLiveStatus = (text) => {
    if (!liveStatus) return;
    liveStatus.textContent = String(text || '');
  };

  const setLiveReceiveState = (next = {}) => {
    liveReceiveState.video = Boolean(next.video);
    liveReceiveState.audio = Boolean(next.audio);
    if (!liveReceiveMeter) return;
    const videoEl = liveReceiveMeter.querySelector('[data-live-receive-video]');
    const audioEl = liveReceiveMeter.querySelector('[data-live-receive-audio]');
    if (videoEl) {
      videoEl.textContent = liveReceiveState.video ? 'Video: přijato' : 'Video: čekám';
      videoEl.dataset.ok = liveReceiveState.video ? 'true' : 'false';
    }
    if (audioEl) {
      audioEl.textContent = liveReceiveState.audio ? 'Audio: přijato' : 'Audio: čekám';
      audioEl.dataset.ok = liveReceiveState.audio ? 'true' : 'false';
    }
  };

  const inspectRemoteStream = (stream) => {
    const tracks = stream?.getTracks?.() || [];
    const hasVideo = tracks.some((track) => track.kind === 'video' && track.readyState === 'live' && !track.muted);
    const hasAudio = tracks.some((track) => track.kind === 'audio' && track.readyState === 'live' && !track.muted);
    setLiveReceiveState({ video: hasVideo, audio: hasAudio });
    return { hasVideo, hasAudio };
  };

  const renderLiveReactions = (reactions = {}) => {
    const text = `👍 ${reactions.like || 0} · ❤️ ${reactions.heart || 0} · 🔥 ${reactions.fire || 0} · 👏 ${reactions.clap || 0}`;
    if (liveStudioReactionSummary) liveStudioReactionSummary.textContent = text;
    if (livePublicReactionSummary) livePublicReactionSummary.textContent = text;
    if (liveViewerReactionSummary) liveViewerReactionSummary.textContent = text;
  };

  const renderLiveAudience = (data = {}) => {
    const participants = normalizeLiveParticipants(data.participants);
    const viewerCount = Number(data.viewerCount || 0);
    const participantCount = Number(data.participantCount || participants.length || (liveRoomId ? 1 : 0));
    const viewerText = `👁️ ${viewerCount} ${pluralizeCzech(viewerCount, 'divák', 'diváci', 'diváků')}`;
    const participantText = `👥 ${participantCount} ${pluralizeCzech(participantCount, 'účastník', 'účastníci', 'účastníků')}`;
    const lists = [liveStudioParticipants, livePublicParticipants, liveViewerParticipants].filter(Boolean);
    const countPairs = [
      [liveStudioViewerCount, liveStudioParticipantCount],
      [livePublicViewerCount, livePublicParticipantCount],
      [liveViewerViewerCount, liveViewerParticipantCount]
    ];
    countPairs.forEach(([viewerEl, participantEl]) => {
      if (viewerEl) viewerEl.textContent = viewerText;
      if (participantEl) participantEl.textContent = participantText;
    });
    if (livePublicAudienceBadge) livePublicAudienceBadge.textContent = `👁️ ${viewerCount}`;

    const html = participants.length
      ? participants.map((participant) => `
          <span class="live-participant" title="${escapeHtml(participant.userName)}">
            <span class="live-participant__avatar" style="background-image:url('${escapeHtml(participant.profilePhoto || '')}')">${participant.profilePhoto ? '' : escapeHtml((participant.userName || 'U').slice(0, 1).toUpperCase())}</span>
            <span>${escapeHtml(participant.presenceRole === 'broadcaster' ? 'Vysílatel' : participant.userName)}</span>
          </span>
        `).join('')
      : '<span class="live-audience__empty">Publikum se zobrazí po spuštění.</span>';
    lists.forEach((list) => { list.innerHTML = html; });
  };

  const pollLiveAudience = async () => {
    if (!liveRoomId) return;
    try {
      const data = await fetchLiveParticipants(liveRoomId);
      renderLiveAudience(data || {});
    } catch {}
  };

  const stopLivePresence = () => {
    if (livePresenceHeartbeatTimer) window.clearInterval(livePresenceHeartbeatTimer);
    if (liveAudiencePollTimer) window.clearInterval(liveAudiencePollTimer);
    livePresenceHeartbeatTimer = null;
    liveAudiencePollTimer = null;
  };

  const startLivePresence = async (role) => {
    if (!liveRoomId) return;
    stopLivePresence();
    const sendHeartbeat = async () => {
      if (!liveRoomId) return;
      try {
        const data = await heartbeatLiveRoom(liveRoomId, role);
        renderLiveAudience(data || {});
      } catch {}
    };
    await sendHeartbeat();
    await pollLiveAudience();
    livePresenceHeartbeatTimer = window.setInterval(sendHeartbeat, 8000);
    liveAudiencePollTimer = window.setInterval(pollLiveAudience, 3000);
  };

  const renderLiveComments = () => {
    const lists = [liveStudioChatList, livePublicChatList, liveViewerChatList].filter(Boolean);
    if (!lists.length) return;
    if (!liveRoomId) {
      lists.forEach((list) => { list.innerHTML = '<div class="feed-empty">Vytvoř nebo zadej kód místnosti.</div>'; });
      return;
    }
    if (!liveComments.length) {
      lists.forEach((list) => { list.innerHTML = '<div class="feed-empty">Zatím žádné live komentáře.</div>'; });
      return;
    }
    const html = liveComments.map((comment) => `
      <div class="live-comment">
        <strong>${escapeHtml(comment.userName || 'Uživatel')}</strong>
        <span>${escapeHtml(comment.text || '')}</span>
        <time>${new Date(comment.createdAt || comment.createdAtTs || Date.now()).toLocaleTimeString()}</time>
      </div>
    `).join('');
    lists.forEach((list) => {
      list.innerHTML = html;
      list.scrollTop = list.scrollHeight;
    });
  };

  const pollLiveComments = async () => {
    if (!liveRoomId) return;
    try {
      const data = await fetchLiveComments(liveRoomId, liveLastCommentTs);
      liveLastCommentTs = data.now || Date.now();
      const incoming = Array.isArray(data.comments) ? data.comments : [];
      if (incoming.length) {
        const seen = new Set(liveComments.map((c) => String(c.id)));
        liveComments = liveComments.concat(incoming.filter((c) => !seen.has(String(c.id)))).slice(-250);
        renderLiveComments();
      } else if (!liveComments.length) {
        renderLiveComments();
      }
      renderLiveReactions(data.reactions || {});
    } catch {}
  };

  const startLiveChatPolling = async (reset = false) => {
    if (!liveRoomId) return;
    if (reset) {
      liveComments = [];
      liveLastCommentTs = 0;
      renderLiveComments();
      renderLiveReactions();
    }
    if (liveChatPollTimer) window.clearInterval(liveChatPollTimer);
    await pollLiveComments();
    liveChatPollTimer = window.setInterval(pollLiveComments, 1800);
  };

  const setLiveCommentsVisible = (visible) => {
    if (liveStudioChatPanel) liveStudioChatPanel.hidden = !visible;
    if (livePublicChatPanel) livePublicChatPanel.hidden = !visible;
    if (liveViewerChatPanel) liveViewerChatPanel.hidden = !visible;
  };

  const moveLiveModalIntoFullscreenLayer = (modal) => {
    const fullscreenLayer = document.fullscreenElement;
    if (!modal || !fullscreenLayer || fullscreenLayer.contains(modal)) return;
    if (!liveModalHomes.has(modal)) {
      liveModalHomes.set(modal, {
        parent: modal.parentNode,
        next: modal.nextSibling
      });
    }
    fullscreenLayer.appendChild(modal);
    modal.classList.add('live-modal-inside-fullscreen');
  };

  const restoreLiveModalHome = (modal) => {
    const home = liveModalHomes.get(modal);
    if (!modal || !home?.parent) return;
    if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(modal, home.next);
    else home.parent.appendChild(modal);
    modal.classList.remove('live-modal-inside-fullscreen');
    liveModalHomes.delete(modal);
  };

  const restoreAllLiveModalHomes = () => {
    [liveStudioModal, livePublicStudioModal, liveViewerModal].forEach(restoreLiveModalHome);
  };

  const openLiveStudioWindow = () => {
    if (!liveStudioModal) return;
    moveLiveModalIntoFullscreenLayer(liveStudioModal);
    if (liveStudioRoomLabel) liveStudioRoomLabel.textContent = liveRoomId ? `Místnost: ${liveRoomId}` : 'Soukromé vysílání';
    if (liveStudioRoomCode) liveStudioRoomCode.textContent = liveRoomId || '-';
    setModalOpen(liveStudioModal, true);
    setStudioButtons();
    setCameraOverlayPosition();
  };

  const openPublicStudioWindow = () => {
    if (!livePublicStudioModal) return;
    moveLiveModalIntoFullscreenLayer(livePublicStudioModal);
    setModalOpen(livePublicStudioModal, true);
    if (!liveIsBroadcasting) setInlineStatus(livePublicPreviewStatus, 'Kamera se spustí tlačítkem Začít.');
    if (livePublicTools) livePublicTools.hidden = true;
    if (livePublicToolsToggle) {
      livePublicToolsToggle.setAttribute('aria-expanded', 'false');
      livePublicToolsToggle.textContent = '⌃';
    }
    setStudioButtons();
  };

  const openViewerWindow = () => {
    if (!liveViewerModal) return;
    moveLiveModalIntoFullscreenLayer(liveViewerModal);
    if (liveViewerRoomLabel) liveViewerRoomLabel.textContent = liveRoomId ? `Místnost: ${liveRoomId}` : 'Připojování...';
    setInlineStatus(liveViewerStatus, 'Připojuji se ke streamu...');
    setModalOpen(liveViewerModal, true);
    liveViewerModal.classList.toggle('live-viewer-modal--inside-fullscreen', Boolean(document.fullscreenElement));
  };

  const setStudioBadge = (text) => {
    if (liveStudioBadge) liveStudioBadge.textContent = text;
  };

  const applyLivePreviewMirror = () => {
    const transform = liveMirrorPreview ? 'scaleX(-1)' : '';
    if (liveLocalVideo) liveLocalVideo.style.transform = transform;
    if (livePublicPreview) livePublicPreview.style.transform = transform;
    if (liveCameraOverlay) liveCameraOverlay.style.transform = transform;
  };

  const applyViewerControlsState = () => {
    if (liveRemoteVideo) {
      liveRemoteVideo.classList.toggle('live-video--cover', liveViewerFitMode === 'cover');
      liveRemoteVideo.classList.toggle('live-video--muted', Boolean(liveRemoteVideo.muted));
    }
    if (liveViewerFit) liveViewerFit.textContent = liveViewerFitMode === 'cover' ? 'Vyplnit' : 'Přizpůsobit';
    if (liveViewerMute) liveViewerMute.textContent = liveRemoteVideo?.muted ? 'Zapnout zvuk' : 'Ztlumit';
  };

  const setStudioButtons = () => {
    if (liveStudioStart) {
      liveStudioStart.disabled = liveIsBroadcasting;
      liveStudioStart.textContent = liveIsBroadcasting ? 'Stream běží' : 'Začít stream';
    }
    if (livePublicStudioStart) {
      livePublicStudioStart.disabled = liveIsBroadcasting;
      livePublicStudioStart.textContent = liveIsBroadcasting ? 'Běží' : 'Začít';
    }
    if (liveToggleCamera) {
      liveToggleCamera.classList.toggle('active', liveCameraEnabled);
      liveToggleCamera.textContent = liveCameraEnabled ? '📷 Kamera zap.' : '📷 Kamera vyp.';
    }
    if (liveToggleMic) {
      liveToggleMic.classList.toggle('active', liveMicEnabled);
      liveToggleMic.textContent = liveMicEnabled ? '🎙️ Mikrofon zap.' : '🎙️ Mikrofon vyp.';
    }
    if (livePublicToggleCamera) {
      livePublicToggleCamera.classList.toggle('active', liveCameraEnabled);
      livePublicToggleCamera.textContent = liveCameraEnabled ? '📷' : '📷✕';
    }
    if (livePublicToggleMic) {
      livePublicToggleMic.classList.toggle('active', liveMicEnabled);
      livePublicToggleMic.textContent = liveMicEnabled ? '🎙️' : '🎙️✕';
    }
    const cameraSide = liveFacingMode === 'environment' ? 'zadní' : 'přední';
    if (liveSwitchCamera) {
      liveSwitchCamera.textContent = `🔁 ${cameraSide} kamera`;
      liveSwitchCamera.title = `Aktivní volba: ${cameraSide} kamera`;
    }
    if (livePublicSwitchCamera) {
      livePublicSwitchCamera.textContent = liveFacingMode === 'environment' ? '🔁Z' : '🔁P';
      livePublicSwitchCamera.title = `Aktivní volba: ${cameraSide} kamera`;
    }
    if (livePublicMirror) {
      livePublicMirror.classList.toggle('active', liveMirrorPreview);
      livePublicMirror.textContent = liveMirrorPreview ? '⇄✓' : '⇄';
    }
    if (livePublicQuality) {
      livePublicQuality.classList.toggle('active', liveQualityMode === 'hd');
      livePublicQuality.textContent = liveQualityMode === 'hd' ? 'HD' : 'Úsp.';
      livePublicQuality.title = liveQualityMode === 'hd' ? 'Kvalita: HD' : 'Kvalita: úsporný režim';
    }
    if (liveShareScreen) {
      const sharing = Boolean(liveScreenStream);
      liveShareScreen.classList.toggle('active', sharing);
      liveShareScreen.textContent = sharing ? '🖥️ Ukončit plochu' : '🖥️ Plocha';
    }
    applyLivePreviewMirror();
    applyViewerControlsState();
  };

  const closeLiveStudioWindow = async (modal) => {
    if (liveIsBroadcasting) {
      await stopLive();
      return;
    }
    if (modal === liveViewerModal && liveRoomId) {
      await stopLive();
      return;
    }
    setModalOpen(modal, false);
    restoreLiveModalHome(modal);
  };

  const setCameraOverlayPosition = () => {
    if (!liveCameraOverlay) return;
    if (liveStage && liveCameraOverlay.offsetWidth && liveCameraOverlay.offsetHeight) {
      const rect = liveStage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, liveCameraPos.x)) * Math.max(0, rect.width - liveCameraOverlay.offsetWidth);
      const y = Math.max(0, Math.min(1, liveCameraPos.y)) * Math.max(0, rect.height - liveCameraOverlay.offsetHeight);
      liveCameraOverlay.style.left = `${x}px`;
      liveCameraOverlay.style.top = `${y}px`;
      return;
    }
    liveCameraOverlay.style.left = `${Math.max(0, Math.min(1, liveCameraPos.x)) * 70}%`;
    liveCameraOverlay.style.top = `${Math.max(0, Math.min(1, liveCameraPos.y)) * 70}%`;
  };

  const makeSourceVideo = (stream) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;
    video.play().catch(() => {});
    return video;
  };

  const stopCompose = () => {
    if (liveComposeTimer) window.clearInterval(liveComposeTimer);
    if (liveComposedStream) {
      liveComposedStream.getTracks().forEach((track) => {
        if (track.kind === 'video') {
          try { track.stop(); } catch {}
        }
      });
    }
    liveComposeTimer = null;
    liveComposedCanvas = null;
    liveComposedCtx = null;
    liveComposedStream = null;
    liveCameraSourceVideo = null;
    liveScreenSourceVideo = null;
  };

  const replaceBroadcastVideoTrack = async (track) => {
    for (const pc of liveBroadcasterPeerMap.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        try { await sender.replaceTrack(track || null); } catch {}
      }
    }
  };

  const replaceBroadcastAudioTrack = async (track) => {
    for (const pc of liveBroadcasterPeerMap.values()) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (sender) {
        try { await sender.replaceTrack(track || null); } catch {}
      }
    }
  };

  const applyBroadcastStream = async (stream, previewStream = stream) => {
    liveLocalStream = stream;
    const preview = previewStream || stream || null;
    await attachStreamToVideo(liveLocalVideo, preview, { muted: true, controls: false });
    await attachStreamToVideo(livePublicPreview, preview, { muted: true, controls: false });
    if (livePublicPreviewStatus) {
      const hasVideo = Boolean(preview?.getVideoTracks?.().some((track) => track.readyState === 'live'));
      setInlineStatus(livePublicPreviewStatus, hasVideo ? '' : 'Běží pouze audio, kamera není dostupná.', !hasVideo);
    }
    const videoTrack = stream?.getVideoTracks?.()[0] || null;
    const audioTrack = stream?.getAudioTracks?.()[0] || null;
    await replaceBroadcastVideoTrack(videoTrack);
    await replaceBroadcastAudioTrack(audioTrack);
  };

  const buildComposedScreenStream = async () => {
    if (!liveScreenStream || !liveCameraStream) return null;
    stopCompose();
    liveComposedCanvas = document.createElement('canvas');
    liveComposedCanvas.width = 1280;
    liveComposedCanvas.height = 720;
    liveComposedCtx = liveComposedCanvas.getContext('2d');
    liveScreenSourceVideo = makeSourceVideo(liveScreenStream);
    liveCameraSourceVideo = makeSourceVideo(liveCameraStream);
    liveComposedStream = liveComposedCanvas.captureStream(30);

    const micTrack = liveCameraStream.getAudioTracks()[0];
    if (micTrack) liveComposedStream.addTrack(micTrack);

    const draw = () => {
      if (!liveComposedCtx || !liveComposedCanvas) return;
      const ctx = liveComposedCtx;
      const w = liveComposedCanvas.width;
      const h = liveComposedCanvas.height;
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);
      if (liveScreenSourceVideo?.readyState >= 2) {
        ctx.drawImage(liveScreenSourceVideo, 0, 0, w, h);
      }
      const cameraTrack = liveCameraStream.getVideoTracks()[0];
      if (liveCameraEnabled && cameraTrack?.enabled && liveCameraSourceVideo?.readyState >= 2) {
        const cw = Math.round(w * 0.24);
        const ch = Math.round(cw * 9 / 16);
        const x = Math.round(Math.max(0, Math.min(1, liveCameraPos.x)) * (w - cw));
        const y = Math.round(Math.max(0, Math.min(1, liveCameraPos.y)) * (h - ch));
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.55)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#05070d';
        ctx.fillRect(x - 6, y - 6, cw + 12, ch + 12);
        ctx.drawImage(liveCameraSourceVideo, x, y, cw, ch);
        ctx.restore();
      }
    };
    draw();
    liveComposeTimer = window.setInterval(draw, 33);
    return liveComposedStream;
  };

  const setCameraOverlayVisible = (visible) => {
    if (!liveCameraOverlay) return;
    liveCameraOverlay.hidden = !visible;
    if (visible && liveCameraStream) attachStreamToVideo(liveCameraOverlay, liveCameraStream, { muted: true, controls: false }).catch(() => {});
    setCameraOverlayPosition();
  };

  const refreshStudioStream = async () => {
    setStudioButtons();
    if (liveScreenStream) {
      const composed = await buildComposedScreenStream();
      setCameraOverlayVisible(true);
      setStudioBadge('Sdílíš plochu + kamera obraz v obraze');
      await applyBroadcastStream(composed, liveScreenStream);
      return;
    }
    stopCompose();
    setCameraOverlayVisible(false);
    setStudioBadge(liveCameraStream?.getVideoTracks?.().length ? 'Vysíláš kameru' : 'Vysíláš pouze zvuk');
    await applyBroadcastStream(liveCameraStream, liveCameraStream);
  };

  const stopLiveInternal = () => {
    liveIsBroadcasting = false;
    if (liveBroadcasterPollTimer) window.clearInterval(liveBroadcasterPollTimer);
    if (liveViewerPollTimer) window.clearInterval(liveViewerPollTimer);
    if (liveChatPollTimer) window.clearInterval(liveChatPollTimer);
    stopLivePresence();
    liveBroadcasterPollTimer = null;
    liveViewerPollTimer = null;
    liveChatPollTimer = null;

    // close broadcaster peers
    for (const pc of liveBroadcasterPeerMap.values()) {
      try { pc.close(); } catch {}
    }
    liveBroadcasterPeerMap.clear();

    // close viewer pc
    if (liveViewerPc) {
      try { liveViewerPc.close(); } catch {}
      liveViewerPc = null;
    }

    const ownedTracks = new Set([
      ...(liveCameraStream?.getTracks?.() || []),
      ...(liveScreenStream?.getTracks?.() || [])
    ]);
    stopCompose();
    if (liveCameraStream) liveCameraStream.getTracks().forEach((t) => t.stop());
    if (liveScreenStream) liveScreenStream.getTracks().forEach((t) => t.stop());
    if (liveLocalStream) {
      liveLocalStream.getTracks().forEach((t) => {
        if (!ownedTracks.has(t)) {
          try { t.stop(); } catch {}
        }
      });
    }
    liveCameraStream = null;
    liveScreenStream = null;
    liveLocalStream = null;

    if (liveLocalVideo) liveLocalVideo.srcObject = null;
    if (livePublicPreview) livePublicPreview.srcObject = null;
    if (liveCameraOverlay) {
      liveCameraOverlay.srcObject = null;
      liveCameraOverlay.hidden = true;
    }
    if (liveRemoteVideo) liveRemoteVideo.srcObject = null;
    setInlineStatus(livePublicPreviewStatus, 'Kamera je připravená ke spuštění.', true);
    setInlineStatus(liveViewerStatus, 'Čekám na stream...', true);
    setLiveReceiveState({ video: false, audio: false });

    liveRoomId = '';
    liveRoomVisibility = '';
    liveViewerOfferId = '';
    liveLastOfferTs = 0;
    liveLastIceToBroadcasterTs = 0;
    liveLastIceToViewerTs = 0;
    livePendingIceToBroadcaster = [];
    liveLastCommentTs = 0;
    liveComments = [];
    liveCameraEnabled = true;
    liveMicEnabled = true;
    liveFacingMode = 'user';
    liveMirrorPreview = false;
    liveQualityMode = 'hd';
    liveViewerFitMode = 'contain';
    if (liveStudioModal) setModalOpen(liveStudioModal, false);
    if (livePublicStudioModal) setModalOpen(livePublicStudioModal, false);
    if (liveViewerModal) setModalOpen(liveViewerModal, false);
    restoreAllLiveModalHomes();
    livePendingStudioVisibility = '';
    setLiveCommentsVisible(false);
    setStudioBadge('Studio připraveno');
    setStudioButtons();
    renderLiveComments();
    renderLiveReactions();
    renderLiveAudience();
    setLiveStatus('');
  };

  const stopLive = async () => {
    const roomToClose = liveRoomId;
    const shouldCloseRoom = liveIsBroadcasting;
    stopLiveInternal();
    if (roomToClose) {
      try { await leaveLiveRoom(roomToClose); } catch {}
      if (shouldCloseRoom) {
        try { await closeLiveRoom(roomToClose); } catch {}
      }
    }
    renderPublicLiveRooms().catch(() => {});
    refreshAndRender().catch(() => {});
  };

  const recoverFailedBroadcastStart = async (visibility, roomId) => {
    if (visibility === 'public' && roomId) {
      try { await closeLiveRoom(roomId); } catch {}
    }
    await stopLive();
    livePendingStudioVisibility = visibility;
    if (visibility === 'private') {
      if (roomId) {
        liveRoomId = roomId;
        liveRoomVisibility = 'private';
        if (liveStudioRoomCode) liveStudioRoomCode.textContent = liveRoomId;
        if (liveStudioRoomLabel) liveStudioRoomLabel.textContent = `Místnost: ${liveRoomId}`;
        startLiveChatPolling(false).catch(() => {});
      }
      openLiveStudioWindow();
      setStudioBadge('Stream se nespustil. Zkus kameru povolit a klikni znovu.');
      return;
    }
    openPublicStudioWindow();
  };

  const getIceServers = () => {
    if (Array.isArray(liveIceServersCache) && liveIceServersCache.length) return liveIceServersCache;
    // Volitelné přepsání: window.ANUK_ICE_SERVERS = JSON string nebo rovnou array.
    // Příklad:
    // window.ANUK_ICE_SERVERS = [{"urls":["stun:stun.l.google.com:19302"]},{"urls":["turn:turn.example.com:3478"],"username":"u","credential":"p"}]
    const meta = document.querySelector('meta[name="anuk-ice-servers"]')?.content;
    const raw = window.ANUK_ICE_SERVERS ?? meta;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {}
    }
    // Default: více STUN serverů -> vyšší šance, že se ICE domluví napříč sítěmi.
    return [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302'
        ]
      },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ];
  };

  const makePc = () => new RTCPeerConnection({
    iceServers: getIceServers(),
    iceCandidatePoolSize: 4
  });

  const refreshLiveIceServers = async () => {
    try {
      const data = await fetchLiveIceServerConfig();
      if (Array.isArray(data?.iceServers) && data.iceServers.length) {
        liveIceServersCache = data.iceServers;
      }
    } catch {}
  };

  const getBroadcastStream = async (preferredFacing = liveFacingMode) => {
    const firstFacing = preferredFacing === 'environment' ? 'environment' : 'user';
    const secondFacing = firstFacing === 'user' ? 'environment' : 'user';
    const videoSize = liveQualityMode === 'saver'
      ? { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 24 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
    const videoProfile = (facingMode) => ({
      video: { facingMode: { ideal: facingMode }, ...videoSize },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    return getMediaStreamWithFallback([
      videoProfile(firstFacing),
      videoProfile(secondFacing),
      { video: true, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
      { video: true, audio: false },
      { video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
    ]);
  };

  const getActiveLiveMode = () => {
    if (livePublicStudioModal?.classList.contains('is-open')) return 'public';
    if (liveStudioModal?.classList.contains('is-open')) return 'private';
    return livePendingStudioVisibility || liveRoomVisibility || 'private';
  };

  const showLiveDeviceStatus = (message, variant = 'info') => {
    const mode = getActiveLiveMode();
    if (mode === 'public') setInlineStatus(livePublicPreviewStatus, message, true);
    else setStudioBadge(message);
    setLiveStatus(message);
    showToast(message, variant);
  };

  const testLiveDevices = async () => {
    const secure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) {
      showLiveDeviceStatus('Kamera a mikrofon vyžadují HTTPS. Na Renderu to poběží přes zabezpečenou adresu.', 'error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showLiveDeviceStatus('Prohlížeč nepodporuje kameru nebo mikrofon.', 'error');
      return;
    }
    let testStream = null;
    try {
      showLiveDeviceStatus('Testuji kameru a mikrofon...');
      testStream = await getBroadcastStream(liveFacingMode);
      const hasVideo = testStream.getVideoTracks().some((track) => track.readyState === 'live');
      const hasAudio = testStream.getAudioTracks().some((track) => track.readyState === 'live');
      const screen = navigator.mediaDevices?.getDisplayMedia ? 'sdílení obrazovky podporováno' : 'sdílení obrazovky nepodporováno';
      const message = `${hasVideo ? 'Kamera OK' : 'Kamera chybí'} · ${hasAudio ? 'Mikrofon OK' : 'Mikrofon chybí'} · ${screen}`;
      showLiveDeviceStatus(message, hasVideo || hasAudio ? 'success' : 'error');
    } catch (err) {
      showLiveDeviceStatus(err?.message || 'Test zařízení selhal.', 'error');
    } finally {
      testStream?.getTracks?.().forEach((track) => track.stop());
      setStudioButtons();
    }
  };

  const switchLiveCamera = async () => {
    liveFacingMode = liveFacingMode === 'user' ? 'environment' : 'user';
    setStudioButtons();
    if (!liveIsBroadcasting || !liveCameraStream) {
      showLiveDeviceStatus(`Po startu se použije ${liveFacingMode === 'environment' ? 'zadní' : 'přední'} kamera.`, 'info');
      return;
    }
    const previousStream = liveCameraStream;
    try {
      showLiveDeviceStatus('Přepínám kameru...');
      const nextStream = await getBroadcastStream(liveFacingMode);
      liveCameraStream = nextStream;
      liveCameraEnabled = Boolean(nextStream.getVideoTracks()[0]);
      liveMicEnabled = Boolean(nextStream.getAudioTracks()[0]);
      nextStream.getVideoTracks().forEach((track) => { track.enabled = liveCameraEnabled; });
      nextStream.getAudioTracks().forEach((track) => { track.enabled = liveMicEnabled; });
      await refreshStudioStream();
      previousStream?.getTracks?.().forEach((track) => track.stop());
      showLiveDeviceStatus(`Přepnuto na ${liveFacingMode === 'environment' ? 'zadní' : 'přední'} kameru.`, 'success');
    } catch (err) {
      liveFacingMode = liveFacingMode === 'user' ? 'environment' : 'user';
      liveCameraStream = previousStream;
      await refreshStudioStream().catch(() => {});
      showLiveDeviceStatus(err?.message || 'Kameru se nepodařilo přepnout.', 'error');
    }
  };

  const restartLiveCameraStream = async (successMessage) => {
    if (!liveIsBroadcasting || !liveCameraStream) {
      setStudioButtons();
      showLiveDeviceStatus(successMessage, 'info');
      return;
    }
    const previousStream = liveCameraStream;
    try {
      showLiveDeviceStatus('Připravuji novou kamerovou stopu...');
      const nextStream = await getBroadcastStream(liveFacingMode);
      liveCameraStream = nextStream;
      liveCameraEnabled = Boolean(nextStream.getVideoTracks()[0]);
      liveMicEnabled = Boolean(nextStream.getAudioTracks()[0]);
      nextStream.getVideoTracks().forEach((track) => { track.enabled = liveCameraEnabled; });
      nextStream.getAudioTracks().forEach((track) => { track.enabled = liveMicEnabled; });
      await refreshStudioStream();
      previousStream?.getTracks?.().forEach((track) => track.stop());
      showLiveDeviceStatus(successMessage, 'success');
    } catch (err) {
      liveCameraStream = previousStream;
      await refreshStudioStream().catch(() => {});
      showLiveDeviceStatus(err?.message || 'Změnu se nepodařilo použít.', 'error');
    }
  };

  const togglePublicMirror = () => {
    liveMirrorPreview = !liveMirrorPreview;
    setStudioButtons();
    showLiveDeviceStatus(liveMirrorPreview ? 'Náhled je zrcadlený. Diváci vidí normální obraz.' : 'Zrcadlení náhledu vypnuto.', 'info');
  };

  const togglePublicQuality = async () => {
    liveQualityMode = liveQualityMode === 'hd' ? 'saver' : 'hd';
    setStudioButtons();
    await restartLiveCameraStream(liveQualityMode === 'hd'
      ? 'Přepnuto na HD kvalitu.'
      : 'Přepnuto na úspornou kvalitu pro slabší připojení.');
  };

  const toggleViewerMute = async () => {
    if (!liveRemoteVideo) return;
    liveRemoteVideo.muted = !liveRemoteVideo.muted;
    if (!liveRemoteVideo.muted) {
      try { await liveRemoteVideo.play(); } catch {}
    }
    applyViewerControlsState();
  };

  const toggleViewerFit = () => {
    liveViewerFitMode = liveViewerFitMode === 'contain' ? 'cover' : 'contain';
    applyViewerControlsState();
  };

  const fullscreenViewer = async () => {
    const target = liveRemoteVideo || liveViewerModal?.querySelector('.modal__panel');
    if (!target?.requestFullscreen) {
      showToast('Celá obrazovka není v tomto prohlížeči dostupná.', 'error');
      return;
    }
    try {
      if (!document.fullscreenElement) await target.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast('Celou obrazovku se nepodařilo zapnout.', 'error');
    }
  };

  const reconnectViewer = async () => {
    const code = String(liveRoomId || liveJoinCode?.value || '').trim();
    if (!code) {
      showToast('Chybí kód místnosti pro znovupřipojení.', 'error');
      return;
    }
    await stopLive();
    if (liveJoinCode) liveJoinCode.value = code;
    await joinBroadcast();
  };

  const ensurePrivateRoomCode = async () => {
    if (liveRoomId && liveRoomVisibility === 'private') return liveRoomId;
    const room = await createLiveRoom({ visibility: 'private', title: '' });
    liveRoomId = room.roomId;
    liveRoomVisibility = room.visibility || 'private';
    if (liveStudioRoomCode) liveStudioRoomCode.textContent = liveRoomId;
    await startLiveChatPolling(true);
    return liveRoomId;
  };

  const preparePrivateStudio = async () => {
    try {
      setLiveStatus('Připravuji soukromé studio...');
      await ensurePrivateRoomCode();
      livePendingStudioVisibility = 'private';
      openLiveStudioWindow();
      setStudioBadge('Připraveno. Klikni na Začít stream.');
      setLiveStatus('Soukromé studio je připravené. Stream začne až tlačítkem ve studiu.');
    } catch (err) {
      showToast(err?.message || 'Nepodařilo se otevřít soukromé studio.', 'error');
    }
  };

  const preparePublicStudio = () => {
    livePendingStudioVisibility = 'public';
    openPublicStudioWindow();
    setInlineStatus(livePublicPreviewStatus, 'Kamera se spustí tlačítkem Začít.');
    setLiveStatus('Veřejné studio je připravené. Stream začne tlačítkem Začít.');
  };

  const startBroadcast = async (visibility) => {
    if (liveIsBroadcasting) return;
    const isPublic = visibility === 'public';
    if (isPublic && !currentProfile) {
      showToast('Nejsi přihlášený.', 'error');
      return;
    }
    let startRoomId = liveRoomId;
    try {
      setLiveStatus('Spouštím vysílání');
      await refreshLiveIceServers();
      if (isPublic) setInlineStatus(livePublicPreviewStatus, 'Žádám o kameru a mikrofon...');
      const title = String(liveTitle?.value || '').trim();
      // Pro soukromé vysílání použijeme kód vytvořený předem, jinak vytvoříme nový.
      if (visibility === 'private') {
        await ensurePrivateRoomCode();
      } else {
        const room = await createLiveRoom({ visibility, title });
        liveRoomId = room.roomId;
        liveRoomVisibility = room.visibility || visibility;
        startRoomId = liveRoomId;
        await startLiveChatPolling(true);
      }
      startRoomId = liveRoomId;

      liveCameraStream = await getBroadcastStream();
      liveCameraEnabled = Boolean(liveCameraStream.getVideoTracks()[0]);
      liveMicEnabled = Boolean(liveCameraStream.getAudioTracks()[0]);
      if (!liveCameraStream?.getTracks?.().length) {
        throw new Error('Nepodařilo se získat žádnou stopu z kamery/mikrofonu.');
      }
      liveCameraStream.getVideoTracks().forEach((track) => { track.enabled = liveCameraEnabled; });
      liveCameraStream.getAudioTracks().forEach((track) => { track.enabled = liveMicEnabled; });
      await refreshStudioStream();
      if (isPublic) setInlineStatus(livePublicPreviewStatus, '', false);
      liveIsBroadcasting = true;
      setStudioButtons();
      // Označí místnost jako aktivní, aby se u veřejného vysílání ukázala v seznamu.
      await startLiveRoom(liveRoomId);
      await startLivePresence('broadcaster');
      setLiveCommentsVisible(true);
      if (visibility === 'private') openLiveStudioWindow();
      if (visibility === 'public') openPublicStudioWindow();
      setLiveStatus(isPublic
        ? 'Veřejné vysílání běží. Ostatní se mohou připojit z přehledu veřejných vysílání.'
        : 'Soukromé vysílání běží. Sdílej kód místnosti pro diváky.');
      if (isPublic) {
        renderPublicLiveRooms().catch(() => {});
        refreshAndRender().catch(() => {});
      }

      liveBroadcasterPollTimer = window.setInterval(async () => {
        if (!liveIsBroadcasting || !liveRoomId) return;
        try {
          const offers = await fetchLiveOffers(liveRoomId, liveLastOfferTs);
          liveLastOfferTs = offers.now || Date.now();
          for (const offer of (offers.offers || [])) {
            if (liveBroadcasterPeerMap.has(offer.offerId)) continue;
            const pc = makePc();
            liveBroadcasterPeerMap.set(offer.offerId, pc);
            pc.onconnectionstatechange = () => {
              if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
                liveBroadcasterPeerMap.delete(offer.offerId);
              }
            };
            liveLocalStream.getTracks().forEach((t) => pc.addTrack(t, liveLocalStream));

            pc.onicecandidate = async (e) => {
              if (!e.candidate) return;
              try {
                await postLiveIce(liveRoomId, 'viewer', offer.offerId, e.candidate);
              } catch {}
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await postLiveAnswer(liveRoomId, offer.offerId, answer);
          }

          // ICE pro vys·latele (od div·k·)
          const ice = await fetchLiveIce(liveRoomId, 'broadcaster', null, liveLastIceToBroadcasterTs);
          liveLastIceToBroadcasterTs = ice.now || Date.now();
          for (const item of (ice.candidates || [])) {
            const pc = liveBroadcasterPeerMap.get(item.offerId);
            if (!pc) continue;
            try { await pc.addIceCandidate(new RTCIceCandidate(item.candidate)); } catch {}
          }
        } catch (e) {
          // tich· polling
        }
      }, 1200);
    } catch (err) {
      await recoverFailedBroadcastStart(visibility, startRoomId);
      const name = String(err?.name || '');
      // R·zn· prohlžeže použ·vaj· pro "nenalezeno / nejde spustit za··zen·" r·zn· n·zvy chyb.
      const deviceMissingNames = [
        'NotFoundError',
        'OverconstrainedError',
        'NotReadableError',
        'AbortError',
        'TrackStartError'
      ];
      const deviceMissing = deviceMissingNames.includes(name);
      if (deviceMissing) {
        const msg = 'Nenalezena kamera nebo mikrofon, připojte zařízení nebo povolte oprávnění v prohlížeči.';
        if (isPublic) setInlineStatus(livePublicPreviewStatus, msg);
        else setStudioBadge(msg);
        setLiveStatus(msg);
        showToast(msg, 'error');
        return;
      }
      if (name === 'NotAllowedError') {
        const msg = 'Je potřeba povolit přístup ke kameře/mikrofonu.';
        if (isPublic) setInlineStatus(livePublicPreviewStatus, msg);
        else setStudioBadge(msg);
        setLiveStatus(msg);
        showToast(msg, 'error');
        return;
      }
      const fallbackMsg = err?.message || 'Nepodařilo se spustit živé vysílání.';
      if (isPublic) setInlineStatus(livePublicPreviewStatus, fallbackMsg);
      else setStudioBadge(fallbackMsg);
      setLiveStatus(fallbackMsg);
      showToast(fallbackMsg, 'error');
    }
  };

  const joinBroadcast = async () => {
    const code = String(liveJoinCode?.value || '').trim();
    if (!code) {
      showToast('Zadej kód místnosti.', 'error');
      return;
    }
    try {
      setLiveStatus('Připojuji se...');
      await refreshLiveIceServers();
      setInlineStatus(liveViewerStatus, 'Ověřuji místnost...');
      setLiveReceiveState({ video: false, audio: false });
      const roomInfo = await fetchLiveRoom(code);
      if (!roomInfo?.active) {
        setInlineStatus(liveViewerStatus, 'Místnost existuje, ale vysílatel ještě nespustil stream.');
      }
      liveRoomId = code;
      renderLiveAudience(roomInfo || {});
      openViewerWindow();
      await startLiveChatPolling(true);
      await startLivePresence('viewer');
      liveViewerPc = makePc();
      let viewerGotTrack = false;
      let viewerWatchdog = window.setTimeout(() => {
        if (viewerGotTrack) return;
        const state = liveViewerPc?.iceConnectionState || liveViewerPc?.connectionState || '';
        // Nejčastější příčina: ICE se nedomluví napříč NATem (bez TURN serveru).
        setInlineStatus(
          liveViewerStatus,
          state === 'failed'
            ? 'Spojení se nepodařilo navázat (ICE failed). Zkus jinou síť / Wi‑Fi. Pro spolehlivé live mezi různými sítěmi je potřeba TURN server.'
            : 'Stream se stále nepřipojil. Pokud jsi na mobilních datech / jiné síti, může být potřeba TURN server (bez něj se WebRTC někdy nespojí).',
          true
        );
      }, 12000);

      liveViewerPc.onicegatheringstatechange = () => {
        const s = liveViewerPc?.iceGatheringState || '';
        if (s === 'gathering') setInlineStatus(liveViewerStatus, 'Hledám síťovou cestu (ICE)...');
      };

      liveViewerPc.oniceconnectionstatechange = () => {
        const s = liveViewerPc?.iceConnectionState || '';
        if (s === 'checking') setInlineStatus(liveViewerStatus, 'Navazuji spojení (ICE checking)...');
        if (s === 'connected') setInlineStatus(liveViewerStatus, 'Spojení navázáno, čekám na stream...');
        if (s === 'failed') {
          setInlineStatus(liveViewerStatus, 'Nepodařilo se navázat spojení (ICE failed).', true);
        }
        if (s === 'disconnected') {
          setInlineStatus(liveViewerStatus, 'Spojení se přerušilo (ICE disconnected).', true);
        }
      };

      liveViewerPc.ontrack = async (e) => {
        viewerGotTrack = true;
        if (viewerWatchdog) window.clearTimeout(viewerWatchdog);
        viewerWatchdog = null;
        const stream = e.streams?.[0] || null;
        if (!stream || !liveRemoteVideo) return;
        stream.getTracks().forEach((track) => {
          track.onmute = () => {
            inspectRemoteStream(stream);
            setInlineStatus(liveViewerStatus, track.kind === 'video' ? 'Video stopa se dočasně odmlčela.' : 'Audio stopa se dočasně odmlčela.', true);
          };
          track.onunmute = () => {
            const state = inspectRemoteStream(stream);
            setInlineStatus(liveViewerStatus, state.hasVideo ? '' : 'Spojení běží, ale kamera od vysílatele zatím nedorazila.', !state.hasVideo);
          };
          track.onended = () => {
            const state = inspectRemoteStream(stream);
            setInlineStatus(liveViewerStatus, state.hasVideo ? '' : 'Vysílatel ukončil video stopu.', !state.hasVideo);
          };
        });
        setInlineStatus(liveViewerStatus, 'Stream dorazil, spouštím přehrávání...');
        const played = await attachStreamToVideo(liveRemoteVideo, stream, { muted: false, controls: true });
        const state = inspectRemoteStream(stream);
        setInlineStatus(liveViewerStatus, played ? (state.hasVideo ? '' : 'Spojení běží, ale kamera od vysílatele zatím nedorazila.') : 'Klepni na video pro spuštění přehrávání.', !played || !state.hasVideo);
        applyViewerControlsState();
        liveRemoteVideo.onclick = async () => {
          liveRemoteVideo.muted = false;
          const ok = await attachStreamToVideo(liveRemoteVideo, stream, { muted: false, controls: true, allowMutedFallback: false });
          const nextState = inspectRemoteStream(stream);
          setInlineStatus(liveViewerStatus, ok ? (nextState.hasVideo ? '' : 'Spojení běží, ale kamera od vysílatele zatím nedorazila.') : 'Prohlížeč blokuje přehrávání, použij ovládání videa.', !ok || !nextState.hasVideo);
          applyViewerControlsState();
        };
      };

      liveViewerPc.onconnectionstatechange = () => {
        const state = liveViewerPc?.connectionState || '';
        if (state === 'connected') {
          if (viewerWatchdog) window.clearTimeout(viewerWatchdog);
          viewerWatchdog = null;
          setLiveStatus('Připojeno. Sleduješ živé vysílání.');
          if (!liveReceiveState.video) {
            setInlineStatus(liveViewerStatus, 'Spojení je navázané, čekám na kameru vysílatele...', true);
          } else {
            setInlineStatus(liveViewerStatus, '', false);
          }
        }
        if (state === 'connecting') setInlineStatus(liveViewerStatus, 'Propojuji stream...');
        if (['failed', 'disconnected'].includes(state)) {
          setInlineStatus(liveViewerStatus, 'Spojení se přerušilo. Zkus se připojit znovu.');
        }
      };

      liveViewerPc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        // offerId ještě nemusí být známý (race condition) -> kandidáty dočasně bufferujeme
        if (!liveViewerOfferId) {
          livePendingIceToBroadcaster.push(e.candidate);
          return;
        }
        try {
          await postLiveIce(liveRoomId, 'broadcaster', liveViewerOfferId, e.candidate);
        } catch {}
      };

      // viewer je recvonly
      liveViewerPc.addTransceiver('video', { direction: 'recvonly' });
      liveViewerPc.addTransceiver('audio', { direction: 'recvonly' });

      const offer = await liveViewerPc.createOffer();
      await liveViewerPc.setLocalDescription(offer);
      const created = await postLiveOffer(liveRoomId, offer);
      liveViewerOfferId = created.offerId;
      // Flush kandidátů, které přišly dřív než offerId
      if (livePendingIceToBroadcaster.length) {
        const pending = livePendingIceToBroadcaster;
        livePendingIceToBroadcaster = [];
        for (const candidate of pending) {
          try {
            await postLiveIce(liveRoomId, 'broadcaster', liveViewerOfferId, candidate);
          } catch {}
        }
      }
      setLiveStatus('Čekám na vysílatele...');
      setInlineStatus(liveViewerStatus, 'Čekám na odpověď vysílatele...');

      liveViewerPollTimer = window.setInterval(async () => {
        if (!liveRoomId || !liveViewerOfferId || !liveViewerPc) return;
        try {
          const ans = await fetchLiveAnswer(liveRoomId, liveViewerOfferId);
          if (ans?.sdp && !liveViewerPc.currentRemoteDescription) {
            await liveViewerPc.setRemoteDescription(new RTCSessionDescription(ans.sdp));
            setLiveStatus('Připojeno. Sleduješ živé vysílání.');
            setLiveCommentsVisible(true);
            setInlineStatus(liveViewerStatus, 'Čekám na video stopu...');
          }
          const ice = await fetchLiveIce(liveRoomId, 'viewer', liveViewerOfferId, liveLastIceToViewerTs);
          liveLastIceToViewerTs = ice.now || Date.now();
          for (const item of (ice.candidates || [])) {
            try { await liveViewerPc.addIceCandidate(new RTCIceCandidate(item.candidate)); } catch {}
          }
        } catch {}
      }, 1200);
    } catch (err) {
      stopLive().catch(() => {});
      setInlineStatus(liveViewerStatus, err?.message || 'Nepodařilo se připojit k živému vysílání.');
      showToast(err?.message || 'Nepodařilo se připojit k živému vysílání.', 'error');
    }
  };

  const renderPublicLiveRooms = async () => {
    if (!livePublicList) return;
    try {
      const data = await fetchPublicLiveRooms();
      const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
      if (!rooms.length) {
        livePublicList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">žádné veřejné vysílání teď neběží.</div>`;
        return;
      }
      livePublicList.innerHTML = rooms.map((r) => `
        <div class="live-room-row">
          <div class="live-room-row__meta">
            <strong>${escapeHtml(r.title || 'Živé vysílání')}</strong>
            <span>${escapeHtml(r.ownerName || '')}${r.ownerRole ? ` · ${escapeHtml(r.ownerRole)}` : ''}</span>
            <span>👁️ ${Number(r.viewerCount || 0)} ${pluralizeCzech(r.viewerCount, 'divák', 'diváci', 'diváků')} · 👥 ${Number(r.participantCount || 1)} ${pluralizeCzech(r.participantCount || 1, 'účastník', 'účastníci', 'účastníků')}</span>
          </div>
          <button class="btn btn-primary" type="button" data-action="join-public-live" data-room-id="${escapeHtml(r.roomId)}">Sledovat</button>
        </div>
      `).join('');
    } catch (e) {
      livePublicList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Nepodařilo se načíst veřejné vysílání.</div>`;
    }
  };

  const bindFeedEvents = () => {
    if (!feedList || feedEventsBound) return;
    feedEventsBound = true;

    feedList.addEventListener('click', async (e) => {
      const profileLink = e.target.closest('[data-action="open-profile"]');
      if (profileLink) {
        const userId = profileLink.getAttribute('data-user-id');
        if (userId) {
          e.preventDefault();
          window.location.href = `user.html?id=${encodeURIComponent(userId)}`;
        }
        return;
      }

      const joinPublicLiveBtn = e.target.closest('[data-action="join-public-live"]');
      if (joinPublicLiveBtn) {
        const roomId = joinPublicLiveBtn.getAttribute('data-room-id');
        if (roomId && liveJoinCode) liveJoinCode.value = roomId;
        await joinBroadcast();
        return;
      }

      const commentReactionBtn = e.target.closest('[data-action="comment-reaction"]');
      if (commentReactionBtn) {
        const mediaId = commentReactionBtn.dataset.mediaId;
        const commentId = commentReactionBtn.dataset.commentId;
        const reactionType = commentReactionBtn.dataset.reaction;
        if (mediaId) openedCommentIds.add(String(mediaId));
        try {
          await addCommentReaction(mediaId, commentId, reactionType);
          await refreshAndRender();
        } catch (err) {
          showToast(err?.message || 'Nepodařilo se uložit reakci na komentář.', 'error');
        }
        return;
      }

      const reactionBtn = e.target.closest('[data-reaction]');
      if (reactionBtn) {
        const mediaId = reactionBtn.dataset.mediaId;
        const reactionType = reactionBtn.dataset.reaction;
        try {
          await addReaction(mediaId, reactionType);
          await refreshAndRender();
        } catch (err) {
            console.error('Chyba při reakci:', err);
            showToast(err?.message || 'Nepodařilo se uložit reakci.', 'error');
        }
        return;
      }

      const toggleBtn = e.target.closest('[data-action="toggle-comments"]');
      if (toggleBtn) {
        const mediaId = toggleBtn.dataset.mediaId;
        const commentsSection = feedList.querySelector(`[data-comments-id="${mediaId}"]`);
        if (commentsSection) {
          commentsSection.hidden = !commentsSection.hidden;
          if (commentsSection.hidden) openedCommentIds.delete(String(mediaId));
          else openedCommentIds.add(String(mediaId));
        }
        return;
      }

      const addBtn = e.target.closest('[data-action="add-comment"]');
      if (addBtn) {
        const mediaId = addBtn.dataset.mediaId;
        const input = feedList.querySelector(`[data-comment-input="${mediaId}"]`);
        if (!input || !input.value.trim()) return;
        openedCommentIds.add(String(mediaId));
        try {
          await addComment(mediaId, input.value.trim());
          commentDrafts.delete(String(mediaId));
          await refreshAndRender();
        } catch (err) {
          console.error('Chyba při přidání komentáře:', err);
          showToast(err?.message || 'Nepodařilo se přidat komentář.', 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete-comment"]');
      if (deleteBtn) {
        const mediaId = deleteBtn.dataset.mediaId;
        const commentId = deleteBtn.dataset.commentId;
        if (mediaId) openedCommentIds.add(String(mediaId));
        try {
          await deleteComment(mediaId, commentId);
          await refreshAndRender();
        } catch (err) {
          console.error('Chyba při mazání komentáře:', err);
          showToast(err?.message || 'Nepodařilo se smazat komentář.', 'error');
        }
      }
    });

    // Enter v inputu = odeslat komentář
    feedList.addEventListener('keydown', async (e) => {
      const input = e.target.closest('input[data-comment-input]');
      if (!input) return;
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const mediaId = input.getAttribute('data-comment-input');
      if (!mediaId || !input.value.trim()) return;
      openedCommentIds.add(String(mediaId));
      try {
        await addComment(mediaId, input.value.trim());
        commentDrafts.delete(String(mediaId));
        await refreshAndRender();
      } catch (err) {
        console.error('Chyba při přidání komentáře (Enter):', err);
        showToast(err?.message || 'Nepodařilo se přidat komentář.', 'error');
      }
    });

    feedList.addEventListener('input', (e) => {
      const input = e.target.closest('input[data-comment-input]');
      if (!input) return;
      const mediaId = input.getAttribute('data-comment-input');
      if (!mediaId) return;
      openedCommentIds.add(String(mediaId));
      commentDrafts.set(String(mediaId), input.value);
    });

    feedList.addEventListener('focusin', (e) => {
      const input = e.target.closest('input[data-comment-input]');
      if (!input) return;
      const mediaId = input.getAttribute('data-comment-input');
      if (mediaId) openedCommentIds.add(String(mediaId));
    });
  };

  const initFeedPage = async () => {
    if (!currentUserId) {
      window.location.href = 'index.html';
      return;
    }

    wireModalCloseButtons();

    // re·im feedu (hash: #following)
    feedMode = window.location.hash === '#following' ? 'following' : 'public';
    const syncTabs = () => {
      if (feedTabPublic) {
        feedTabPublic.classList.toggle('btn-primary', feedMode === 'public');
        feedTabPublic.classList.toggle('btn-secondary', feedMode !== 'public');
      }
      if (feedTabFollowing) {
        feedTabFollowing.classList.toggle('btn-primary', feedMode === 'following');
        feedTabFollowing.classList.toggle('btn-secondary', feedMode !== 'following');
      }
    };
    const setFeedMode = async (mode) => {
      feedMode = mode === 'following' ? 'following' : 'public';
      window.location.hash = feedMode === 'following' ? '#following' : '';
      syncTabs();
      await refreshAndRender();
    };
    syncTabs();
    feedTabPublic?.addEventListener('click', () => setFeedMode('public'));
    feedTabFollowing?.addEventListener('click', () => setFeedMode('following'));

    if (profileLink) {
      profileLink.addEventListener('click', () => {
        window.location.href = 'account.html';
      });
    }

    if (feedSettings) {
      feedSettings.addEventListener('click', () => {
        window.location.href = 'account.html#settings';
      });
    }

    if (feedLogout) {
      feedLogout.addEventListener('click', async () => {
        try {
          await api('/api/logout', { method: 'POST' });
        } catch (err) {
          console.warn('Logout session cleanup failed:', err);
        }
        localStorage.removeItem('anukCurrentUser');
        window.location.href = 'index.html';
      });
    }

    // ===== Vytv·žen· příspěvků (text / upload / kamera) =====
    if (feedPostText) {
      feedPostText.addEventListener('click', () => {
        setModalOpen(postTextModal, true);
        if (postTextForm && !postTextForm.dataset.textPreset) postTextForm.dataset.textPreset = TEXT_STYLE_DEFAULTS.preset;
        updateTextPreview();
        postTextForm?.querySelector('input, textarea')?.focus();
      });
    }

    if (feedPostFile) {
      feedPostFile.addEventListener('click', () => {
        setModalOpen(postUploadModal, true);
        postUploadForm?.querySelector('input[type="text"]')?.focus();
      });
    }

    if (feedPostVideo) {
      feedPostVideo.addEventListener('click', async () => {
        setModalOpen(postVideoModal, true);
        videoChunks = [];
        videoBlob = null;
        isVideoRecording = false;
        videoDurationSelect.style.display = 'block';
        videoRecordingPreview.style.display = 'none';
        videoStartButton.style.display = 'block';
        videoStopButton.style.display = 'none';
        videoPublishButton.style.display = 'none';
        videoTimer.textContent = '--:--';
        videoDurationLabel.textContent = 'Vyberte dobu trvání';
        await startVideoCamera();
      });
    }

    if (feedPostCamera) {
      feedPostCamera.addEventListener('click', async () => {
        setModalOpen(postCameraModal, true);
        await startCamera();
      });
    }

    if (cameraSnapButton) {
      cameraSnapButton.addEventListener('click', async () => {
        if (!cameraVideo || !cameraCanvas) return;
        if (!cameraStream) {
          await startCamera();
          if (!cameraStream) return;
        }

        const w = cameraVideo.videoWidth || 1280;
        const h = cameraVideo.videoHeight || 720;
        cameraCanvas.width = w;
        cameraCanvas.height = h;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0, w, h);
        cameraSnapshot = cameraCanvas.toDataURL('image/jpeg', 0.9);
        setInlineStatus(cameraStatus, 'Fotka je připravená k publikování.');
        window.alert('Fotka je připravená. Teď už jen klikni na Publikovat.');
      });
    }

    // Video recording duration handlers
    if (videoDuration30s) {
      videoDuration30s.addEventListener('click', async () => {
        videoRecordingDuration = 30;
        videoDurationSelect.style.display = 'none';
        videoRecordingPreview.style.display = 'block';
        videoDurationLabel.textContent = ' 30 sekund';
        videoStartButton.style.display = 'block';
        videoStopButton.style.display = 'none';
        videoPublishButton.style.display = 'none';
      });
    }

    if (videoDuration90s) {
      videoDuration90s.addEventListener('click', async () => {
        videoRecordingDuration = 90;
        videoDurationSelect.style.display = 'none';
        videoRecordingPreview.style.display = 'block';
        videoDurationLabel.textContent = ' 1:30 minuty';
        videoStartButton.style.display = 'block';
        videoStopButton.style.display = 'none';
        videoPublishButton.style.display = 'none';
      });
    }

    // Video start recording button
    if (videoStartButton) {
      videoStartButton.addEventListener('click', async () => {
        if (!videoStream) {
          window.alert('Kamera není dostupná.');
          return;
        }

        videoChunks = [];
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
        mediaRecorder = new MediaRecorder(videoStream, mime ? {
          mimeType: mime,
          videoBitsPerSecond: 2_500_000,
          audioBitsPerSecond: 128_000
        } : undefined);
        isVideoRecording = true;
        let recordingSeconds = 0;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            videoChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          videoBlob = new Blob(videoChunks, { type: 'video/webm' });
          isVideoRecording = false;
        };

        mediaRecorder.start(500);
        videoStartButton.style.display = 'none';
        videoStopButton.style.display = 'block';
        videoPublishButton.style.display = 'block';

        // Timer
        if (videoRecordingTimer) window.clearInterval(videoRecordingTimer);
        videoRecordingTimer = window.setInterval(() => {
          recordingSeconds++;
          videoTimer.textContent = formatVideoTime(recordingSeconds);

          // Auto-stop when duration reached
          if (recordingSeconds >= videoRecordingDuration) {
            videoStopButton.click();
          }
        }, 1000);
      });
    }

    // Video stop recording button
    if (videoStopButton) {
      videoStopButton.addEventListener('click', () => {
        if (mediaRecorder && isVideoRecording) {
          mediaRecorder.stop();
          isVideoRecording = false;
        }
        if (videoRecordingTimer) {
          window.clearInterval(videoRecordingTimer);
          videoRecordingTimer = null;
        }
        videoStartButton.style.display = 'block';
        videoStopButton.style.display = 'none';
        videoPublishButton.style.display = 'block';
      });
    }

    postTextForm?.addEventListener('input', (e) => {
      if (e.target.closest('[data-text-style]')) updateTextPreview();
    });

    postTextForm?.addEventListener('change', (e) => {
      if (e.target.closest('[data-text-style]')) updateTextPreview();
    });

    postTextForm?.querySelectorAll('[data-text-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.textPreset || TEXT_STYLE_DEFAULTS.preset;
        const values = TEXT_PRESETS[preset] || TEXT_PRESETS.soft;
        postTextForm.dataset.textPreset = preset;
        Object.entries(values).forEach(([name, value]) => {
          const input = postTextForm.elements[name];
          if (!input) return;
          if (input.type === 'checkbox') input.checked = Boolean(value);
          else input.value = value;
        });
        postTextForm.querySelectorAll('[data-text-preset]').forEach((btn) => {
          btn.classList.toggle('is-active', btn === button);
        });
        updateTextPreview();
      });
    });

    updateTextPreview();

    postTextForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(postTextForm);
      const title = String(fd.get('title') || '').trim();
      const text = String(fd.get('text') || '').trim();
      const visibility = String(fd.get('visibility') || 'public').trim().toLowerCase();
      if (!title || !text) return;
      try {
        await createMedia({
          ownerId: currentUserId,
          title,
          type: 'text',
          url: '',
          description: text,
          visibility,
          textStyle: collectTextStyle(fd)
        });
        postTextForm.reset();
        postTextForm.dataset.textPreset = TEXT_STYLE_DEFAULTS.preset;
        postTextForm.querySelectorAll('[data-text-preset]').forEach((btn) => {
          btn.classList.toggle('is-active', btn.dataset.textPreset === TEXT_STYLE_DEFAULTS.preset);
        });
        updateTextPreview();
        closeAllModals();
        await refreshAndRender();
      } catch (err) {
        window.alert(err.message || 'Nepodařilo se publikovat textový příspěvek.');
      }
    });

    postUploadForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(postUploadForm);
      const title = String(fd.get('title') || '').trim();
      const description = String(fd.get('description') || '').trim();
      const visibility = String(fd.get('visibility') || 'public').trim().toLowerCase();
      const videoKind = String(fd.get('videoKind') || 'video').trim().toLowerCase();
      const file = fd.get('mediaFile');
      if (!title || !(file instanceof File)) return;

      if (file.size > 10 * 1024 * 1024) {
        window.alert('Soubor je příliš velký (max 10MB).');
        return;
      }

      try {
        const type = file.type.startsWith('video') ? (videoKind === 'short' ? 'short' : 'video') : 'image';
        const uploaded = await uploadAsset(file);
        await createMedia({
          ownerId: currentUserId,
          title,
          description,
          type,
          url: uploaded.url,
          visibility
        });
        postUploadForm.reset();
        closeAllModals();
        await refreshAndRender();
      } catch (err) {
        window.alert(err.message || 'Nepodařilo se nahrát příspěvek.');
      }
    });

    postCameraForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(postCameraForm);
      const title = String(fd.get('title') || '').trim() || 'Fotka z kamery';
      const visibility = String(fd.get('visibility') || 'public').trim().toLowerCase();
      if (!cameraSnapshot) {
        window.alert('Nejdřív klikni na Vyfotit.');
        return;
      }
      try {
        const blob = await fetch(cameraSnapshot).then((response) => response.blob());
        const uploaded = await uploadAsset(blob, `camera-${Date.now()}.jpg`);
        await createMedia({
          ownerId: currentUserId,
          title,
          type: 'image',
          url: uploaded.url,
          description: '',
          visibility
        });
        cameraSnapshot = '';
        closeAllModals();
        await refreshAndRender();
      } catch (err) {
        window.alert(err.message || 'Nepodařilo se publikovat fotku.');
      }
    });

    postVideoForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(postVideoForm);
      const title = String(fd.get('title') || '').trim() || 'Video';
      const description = String(fd.get('description') || '').trim();
      const visibility = String(fd.get('visibility') || 'public').trim().toLowerCase();
      if (!videoBlob) {
        window.alert('Nejdřív nahraj video.');
        return;
      }
      try {
        const uploaded = await uploadAsset(videoBlob, `video-${Date.now()}.webm`);
        await createMedia({
          ownerId: currentUserId,
          title,
          description,
          type: 'short',
          url: uploaded.url,
          visibility
        });
        videoBlob = null;
        videoChunks = [];
        postVideoForm.reset();
        closeAllModals();
        await refreshAndRender();
      } catch (err) {
        window.alert(err.message || 'Nepodařilo se publikovat video.');
      }
    });

    try {
      const fetchFeedItems = () => feedMode === 'following' ? fetchMediaFollowing() : fetchMediaPublic();
      const [profile, users, items, liveData] = await Promise.all([
        fetchProfile(),
        fetchUsers(),
        fetchFeedItems(),
        feedMode === 'public' ? fetchPublicLiveRooms().catch(() => ({ rooms: [] })) : Promise.resolve({ rooms: [] })
      ]);
      console.log('Fetched users:', users);
      console.log('Fetched media:', items);
      currentProfile = profile;
      registerPushNotifications().catch(() => {});
      if (profileLink) {
        profileLink.textContent = `Můj profil (${profile.firstName || 'profil'})`;
      }

      allUsers = users;
      allItems = [
        ...liveRoomsToFeedItems(liveData?.rooms || []),
        ...(Array.isArray(items) ? items : [])
      ];
      await refreshFollowingIds();
      renderFeed(allItems, buildUserMap(allUsers));
      setActiveFeedType(feedType || 'all');
      bindFeedEvents();
      updateNotificationsBadge().catch(() => {});

      // lehk· polling na badge (aby se zvedl požet, kdy· p·ijde Žádost / notifikace)
      if (notificationsPollTimer) window.clearInterval(notificationsPollTimer);
      notificationsPollTimer = window.setInterval(() => {
        updateNotificationsBadge().catch(() => {});
      }, 20000);
      if (liveFeedRefreshTimer) window.clearInterval(liveFeedRefreshTimer);
      liveFeedRefreshTimer = window.setInterval(() => {
        if (feedMode === 'public' && document.visibilityState === 'visible') {
          refreshAndRender().catch(() => {});
        }
      }, 18000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          updateNotificationsBadge().catch(() => {});
          if (feedMode === 'public') refreshAndRender().catch(() => {});
        }
      });

      // Filtry typu obsahu
      feedTypeAll?.addEventListener('click', () => setActiveFeedType('all'));
      feedTypeImages?.addEventListener('click', () => setActiveFeedType('image'));
      feedTypeVideos?.addEventListener('click', () => setActiveFeedType('video'));
      feedTypeText?.addEventListener('click', () => setActiveFeedType('text'));

      if (feedSearch) {
        feedSearch.addEventListener('input', () => {
          renderFeed(allItems, buildUserMap(allUsers), feedSearch.value);
        });
      }

      // Moderní kl·vesov· zkratky (kdy· zrovna nepiže· do inputu/textarea)
      window.addEventListener('keydown', (e) => {
        const tag = String(document.activeElement?.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
        if (typing) return;

        // "/" focus search
        if (e.key === '/') {
          e.preventDefault();
          feedSearch?.focus();
          return;
        }
        // "n" otevže notifikace
        if (e.key.toLowerCase() === 'n' && feedNotificationsButton) {
          e.preventDefault();
          feedNotificationsButton.click();
        }
      });

      // Users directory
      if (feedUsersButton && usersModal) {
        feedUsersButton.addEventListener('click', () => {
          // Nezobrazovat všechny uživatele, jen výsledky vyhledávání.
          if (usersList) {
            usersList.innerHTML = `<div class="feed-empty" style="padding:10px 0;">Začněte psát a vyhledejte konkrétního uživatele.</div>`;
          }
          // Vyčistit vyhledávání, aby se po otevření nenačetly předchozí výsledky.
          if (usersSearch) usersSearch.value = '';
          setModalOpen(usersModal, true);
          usersSearch?.focus();
          refreshFollowingIds().catch(() => {});
        });
      }
      usersSearch?.addEventListener('input', () => renderUsersDirectory(usersSearch.value));
      usersList?.addEventListener('click', (e) => {
        const openBtn = e.target.closest('[data-action="open-profile"]');
        if (openBtn) {
          const userId = openBtn.getAttribute('data-user-id');
          if (!userId) return;
          window.location.href = `user.html?id=${encodeURIComponent(userId)}`;
          return;
        }
        const followBtn = e.target.closest('[data-action="follow-user"]');
        if (followBtn) {
          const userId = followBtn.getAttribute('data-user-id');
          if (!userId) return;
          if (String(userId) === String(currentUserId)) return;
          if (followingIds.has(String(userId))) {
            showToast('Tohoto uživatele už sleduješ.', 'info');
            return;
          }

          followBtn.textContent = 'Odesílám...';
          followBtn.disabled = true;
          requestFollow(userId)
            .then(() => {
              followBtn.textContent = 'Žádost odeslána';
              showToast('Žádost o sledování odeslána.', 'info');
              refreshFollowingIds()
                .then(() => renderUsersDirectory(usersSearch?.value || ''))
                .catch(() => {});
            })
            .catch((err) => {
              followBtn.disabled = false;
              followBtn.textContent = 'Sledovat';
              showToast(err?.message || 'Nepodařilo se odeslat Žádost.', 'error');
            });
        }
      });

      // Notifikace
      if (feedNotificationsButton && notificationsModal) {
        feedNotificationsButton.addEventListener('click', async () => {
          setModalOpen(notificationsModal, true);
          await renderNotificationsModal();
          await updateNotificationsBadge().catch(() => {});
        });
      }
      notificationsReadAll?.addEventListener('click', async () => {
        try {
          await readAllNotifications();
          await renderNotificationsModal();
          await updateNotificationsBadge().catch(() => {});
          showToast('Oznámení označena jako přečtená.', 'info');
        } catch (e) {
          showToast(e?.message || 'Nepodařilo se označit oznámení.', 'error');
        }
      });
      notificationsModal?.addEventListener('click', async (e) => {
        const acceptBtn = e.target.closest('[data-action="follow-accept"]');
        if (acceptBtn) {
          const id = acceptBtn.getAttribute('data-request-id');
          if (!id) return;
          try {
            await respondFollowRequest(id, 'accept');
            showToast('Žádost přijata.', 'success');
            await renderNotificationsModal();
            await updateNotificationsBadge().catch(() => {});
          } catch (err) {
            showToast(err?.message || 'Nepodařilo se přijmout žádost.', 'error');
          }
          return;
        }
        const rejectBtn = e.target.closest('[data-action="follow-reject"]');
        if (rejectBtn) {
          const id = rejectBtn.getAttribute('data-request-id');
          if (!id) return;
          try {
            await respondFollowRequest(id, 'reject');
            showToast('Žádost odmítnuta.', 'info');
            await renderNotificationsModal();
            await updateNotificationsBadge().catch(() => {});
          } catch (err) {
            showToast(err?.message || 'Nepodařilo se odmítnout žádost.', 'error');
          }
          return;
        }
        const readBtn = e.target.closest('[data-action="notif-read"]');
        if (readBtn) {
          const id = readBtn.getAttribute('data-notif-id');
          if (!id) return;
          try {
            await readNotification(id);
            await renderNotificationsModal();
            await updateNotificationsBadge().catch(() => {});
          } catch {}
        }
        const deleteBtn = e.target.closest('[data-action="notif-delete"]');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-notif-id');
          if (!id) return;
          try {
            await deleteNotification(id);
            await renderNotificationsModal();
            await updateNotificationsBadge().catch(() => {});
          } catch (err) {
            showToast(err?.message || 'Oznámení se nepodařilo smazat.', 'error');
          }
        }
      });

      // Live
      if (feedLiveButton && liveModal) {
        feedLiveButton.addEventListener('click', () => {
          setModalOpen(liveModal, true);
          setLiveStatus('');
          // soukromé i veřejné může spustit každý přihlášený
          if (liveStartPrivateButton) {
            liveStartPrivateButton.disabled = false;
            liveStartPrivateButton.title = '';
          }
          const canStartPublic = Boolean(currentProfile);
          if (liveStartPublicButton) {
            liveStartPublicButton.disabled = !canStartPublic;
            liveStartPublicButton.title = canStartPublic ? '' : 'Nejsi přihlášený.';
          }
          setStudioButtons();
          setCameraOverlayPosition();
          renderPublicLiveRooms();
        });
      }
      liveStartPrivateButton?.addEventListener('click', preparePrivateStudio);
      liveStartPublicButton?.addEventListener('click', preparePublicStudio);
      liveStopButton?.addEventListener('click', () => stopLive());
      liveJoinButton?.addEventListener('click', joinBroadcast);
      liveLeaveButton?.addEventListener('click', () => stopLive());
      liveRefreshPublic?.addEventListener('click', renderPublicLiveRooms);
      const toggleCamera = async () => {
        if (!liveCameraStream) {
          showToast('Kameru nejdřív spustíš tlačítkem vysílání.', 'error');
          return;
        }
        liveCameraEnabled = !liveCameraEnabled;
        liveCameraStream.getVideoTracks().forEach((track) => { track.enabled = liveCameraEnabled; });
        await refreshStudioStream();
      };
      const toggleMic = async () => {
        if (!liveCameraStream) {
          showToast('Mikrofon nejdřív spustíš tlačítkem vysílání.', 'error');
          return;
        }
        liveMicEnabled = !liveMicEnabled;
        liveCameraStream.getAudioTracks().forEach((track) => { track.enabled = liveMicEnabled; });
        setStudioButtons();
        await replaceBroadcastAudioTrack(liveMicEnabled ? liveCameraStream.getAudioTracks()[0] || null : null);
      };
      liveToggleCamera?.addEventListener('click', toggleCamera);
      livePublicToggleCamera?.addEventListener('click', toggleCamera);
      liveToggleMic?.addEventListener('click', toggleMic);
      livePublicToggleMic?.addEventListener('click', toggleMic);
      liveSwitchCamera?.addEventListener('click', switchLiveCamera);
      livePublicSwitchCamera?.addEventListener('click', switchLiveCamera);
      liveDeviceTest?.addEventListener('click', testLiveDevices);
      livePublicDeviceTest?.addEventListener('click', testLiveDevices);
      livePublicMirror?.addEventListener('click', togglePublicMirror);
      livePublicQuality?.addEventListener('click', togglePublicQuality);
      livePublicToolsToggle?.addEventListener('click', () => {
        if (!livePublicTools) return;
        livePublicTools.hidden = !livePublicTools.hidden;
        const open = !livePublicTools.hidden;
        livePublicToolsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        livePublicToolsToggle.textContent = open ? '⌄' : '⌃';
      });
      liveViewerMute?.addEventListener('click', toggleViewerMute);
      liveViewerFit?.addEventListener('click', toggleViewerFit);
      liveViewerFullscreen?.addEventListener('click', fullscreenViewer);
      liveViewerReconnect?.addEventListener('click', reconnectViewer);
      liveStudioStart?.addEventListener('click', () => startBroadcast('private'));
      livePublicStudioStart?.addEventListener('click', () => startBroadcast('public'));
      liveShareScreen?.addEventListener('click', async () => {
        if (!liveIsBroadcasting || !liveCameraStream) {
          showToast('Sdílení plochy zapni až po spuštění vysílání.', 'error');
          return;
        }
        try {
          if (liveScreenStream) {
            liveScreenStream.getTracks().forEach((track) => track.stop());
            liveScreenStream = null;
            await refreshStudioStream();
            showToast('Sdílení plochy ukončeno.', 'info');
            return;
          }
          if (!navigator.mediaDevices?.getDisplayMedia) {
            showToast('Prohlížeč nepodporuje sdílení plochy.', 'error');
            return;
          }
          liveScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          liveScreenStream.getVideoTracks()[0]?.addEventListener('ended', async () => {
            liveScreenStream = null;
            await refreshStudioStream();
          }, { once: true });
          await refreshStudioStream();
          showToast('Sdílení plochy běží. Kameru můžeš posouvat po náhledu.', 'info');
        } catch (err) {
          if (err?.name !== 'NotAllowedError') showToast(err?.message || 'Sdílení plochy se nepodařilo spustit.', 'error');
        }
      });
      liveCallAdmin?.addEventListener('click', async () => {
        if (!liveRoomId) {
          showToast('Nejdřív vytvoř nebo spusť live místnost.', 'error');
          return;
        }
        try {
          await callLiveAdmin(liveRoomId, `Potřebuji admina v live místnosti ${liveRoomId}.`);
          showToast('Adminům bylo posláno upozornění.', 'info');
        } catch (err) {
          showToast(err?.message || 'Admina se nepodařilo přivolat.', 'error');
        }
      });
      liveCameraOverlay?.addEventListener('pointerdown', (e) => {
        if (!liveScreenStream || !liveStage) return;
        liveDragCamera = { pointerId: e.pointerId };
        liveCameraOverlay.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      liveCameraOverlay?.addEventListener('pointermove', (e) => {
        if (!liveDragCamera || !liveStage) return;
        const rect = liveStage.getBoundingClientRect();
        const overlayRect = liveCameraOverlay.getBoundingClientRect();
        const x = (e.clientX - rect.left - overlayRect.width / 2) / Math.max(1, rect.width - overlayRect.width);
        const y = (e.clientY - rect.top - overlayRect.height / 2) / Math.max(1, rect.height - overlayRect.height);
        liveCameraPos = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
        setCameraOverlayPosition();
      });
      liveCameraOverlay?.addEventListener('pointerup', () => {
        liveDragCamera = null;
      });
      liveCameraOverlay?.addEventListener('pointercancel', () => {
        liveDragCamera = null;
      });
      liveFullscreenButton?.addEventListener('click', async () => {
        const panel = liveModal?.querySelector('.modal__panel') || liveModal;
        try {
          if (!document.fullscreenElement) {
            await panel.requestFullscreen();
            liveModal?.classList.add('live-modal-fullscreen');
            liveFullscreenButton.textContent = '⛶ Ukončit celou obrazovku';
          } else {
            await document.exitFullscreen();
          }
        } catch {
          showToast('Celou obrazovku se nepodařilo přepnout.', 'error');
        }
      });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          liveModal?.classList.remove('live-modal-fullscreen');
          if (liveFullscreenButton) liveFullscreenButton.textContent = '⛶ Celá obrazovka';
          restoreAllLiveModalHomes();
        }
      });
      const handleLiveChatSubmit = async (e, input) => {
        e.preventDefault();
        const text = String(input?.value || '').trim();
        if (!liveRoomId) {
          showToast('Nejdřív vytvoř nebo zadej kód místnosti.', 'error');
          return;
        }
        if (!text) return;
        try {
          await postLiveComment(liveRoomId, text);
          if (input) input.value = '';
          await pollLiveComments();
        } catch (err) {
          showToast(err?.message || 'Komentář se nepodařilo odeslat.', 'error');
        }
      };
      liveStudioChatForm?.addEventListener('submit', (e) => handleLiveChatSubmit(e, liveStudioChatInput));
      livePublicChatForm?.addEventListener('submit', (e) => handleLiveChatSubmit(e, livePublicChatInput));
      liveViewerChatForm?.addEventListener('submit', (e) => handleLiveChatSubmit(e, liveViewerChatInput));
      const handleLiveReactionClick = async (e) => {
        const btn = e.target.closest('[data-live-reaction]');
        if (!btn) return;
        if (!liveRoomId) {
          showToast('Nejdřív vytvoř nebo zadej kód místnosti.', 'error');
          return;
        }
        try {
          const data = await postLiveReaction(liveRoomId, btn.getAttribute('data-live-reaction'));
          renderLiveReactions(data.reactions || {});
        } catch (err) {
          showToast(err?.message || 'Reakci se nepodařilo uložit.', 'error');
        }
      };
      liveModal?.addEventListener('click', handleLiveReactionClick);
      liveStudioModal?.addEventListener('click', handleLiveReactionClick);
      liveStudioClose?.addEventListener('click', () => closeLiveStudioWindow(liveStudioModal));
      liveStudioModal?.querySelector('[data-close-studio="true"]')?.addEventListener('click', () => closeLiveStudioWindow(liveStudioModal));
      liveStudioStop?.addEventListener('click', () => stopLive());
      livePublicStudioClose?.addEventListener('click', () => closeLiveStudioWindow(livePublicStudioModal));
      livePublicStudioModal?.querySelector('[data-close-public-studio="true"]')?.addEventListener('click', () => closeLiveStudioWindow(livePublicStudioModal));
      livePublicStudioStop?.addEventListener('click', () => stopLive());
      liveViewerClose?.addEventListener('click', () => closeLiveStudioWindow(liveViewerModal));
      liveViewerModal?.querySelector('[data-close-viewer="true"]')?.addEventListener('click', () => closeLiveStudioWindow(liveViewerModal));
      liveStudioGenerateCode?.addEventListener('click', async () => {
        try {
          await ensurePrivateRoomCode();
          openLiveStudioWindow();
          showToast('Kód místnosti je připravený.', 'info');
        } catch (err) {
          showToast(err?.message || 'Kód se nepodařilo vytvořit.', 'error');
        }
      });
      liveStudioCopyCode?.addEventListener('click', async () => {
        const code = String(liveRoomId || '').trim();
        if (!code) {
          showToast('Nejdřív vygeneruj kód místnosti.', 'error');
          return;
        }
        try {
          await navigator.clipboard.writeText(code);
          showToast('Kód zkopírován.', 'info');
        } catch {
          showToast(`Kód místnosti: ${code}`, 'info');
        }
      });
      liveStudioShareFollowers?.addEventListener('click', async () => {
        try {
          await ensurePrivateRoomCode();
          const result = await shareLiveToFollowers(liveRoomId);
          showToast(`Kód odeslán sledujícím (${result.notified || 0}).`, 'info');
        } catch (err) {
          showToast(err?.message || 'Kód se nepodařilo sdílet sledujícím.', 'error');
        }
      });
      livePublicList?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="join-public-live"]');
        if (!btn) return;
        const roomId = btn.getAttribute('data-room-id');
        if (liveJoinCode) liveJoinCode.value = roomId;
        joinBroadcast();
      });
    } catch (err) {
      if (feedList) {
        feedList.innerHTML = `<div class="feed-empty">${err.message || 'Nepodařilo se načíst veřejné feed.'}</div>`;
      }
    }
  };

  initFeedPage();
})();
