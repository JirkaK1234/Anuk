(() => {
  const managed = new WeakSet();
  const pausedByObserver = new WeakSet();
  const pauseTimers = new WeakMap();
  const lastIntersectionRatio = new WeakMap();
  let videoActiveTimer = 0;

  const updateVideoActiveState = () => {
    window.clearTimeout(videoActiveTimer);
    videoActiveTimer = window.setTimeout(() => {
      const hasPlayingVideo = Array.from(document.querySelectorAll('video')).some((video) => (
        isManagedVideo(video) &&
        !video.paused &&
        !video.ended &&
        video.readyState > 1
      ));
      document.documentElement.classList.toggle('video-active', hasPlayingVideo);
    }, 80);
  };

  const isManagedVideo = (video) => {
    if (!(video instanceof HTMLVideoElement)) return false;
    // Stream videa (WebRTC) nikdy neřeš tady.
    if (video.srcObject) return false;
    // Nešahat na live/kameru/cover – ty mají vlastní logiku.
    if (video.closest('.live-block, .camera-preview, .video-recording-preview, .profile-cover')) return false;
    return video.matches('.video-player, .feed-preview video, .media-preview video, .admin-media-preview video');
  };

  const clearPauseTimer = (video) => {
    const t = pauseTimers.get(video);
    if (t) window.clearTimeout(t);
    pauseTimers.delete(video);
  };

  const schedulePauseIfStillOffscreen = (video, delayMs = 220) => {
    clearPauseTimer(video);
    const t = window.setTimeout(() => {
      pauseTimers.delete(video);
      if (!isManagedVideo(video)) return;
      if (video.paused || video.ended) return;

      // Pokud video ještě nemá rozměr (typicky před načtením metadata),
      // IntersectionObserver může vracet 0 a hned by to pauzlo uživateli.
      // Proto pauzujeme až ve chvíli, kdy má video reálnou velikost.
      const rect = video.getBoundingClientRect?.();
      const hasSize = rect && rect.width > 2 && rect.height > 2;
      if (!hasSize) return;

      const ratio = lastIntersectionRatio.get(video) ?? 0;
      const offscreen = ratio < 0.05;
      if (offscreen) {
        pausedByObserver.add(video);
        video.pause();
      }
    }, delayMs);

    pauseTimers.set(video, t);
  };

  const prepareVideo = (video) => {
    if (!isManagedVideo(video) || managed.has(video)) return;
    managed.add(video);

    video.preload = 'metadata';
    video.playsInline = true;
    video.disablePictureInPicture = true;
    video.controlsList?.add?.('nodownload');
    video.controlsList?.add?.('noremoteplayback');

    // Když uživatel spustí jedno video, pauzni ostatní (OK),
    // ale nikdy nepauzni právě startující video kvůli přechodnému IO stavu.
    const markUserStarted = () => {
      video.dataset.anukUserPlay = '1';
      window.setTimeout(() => {
        if (video.dataset.anukUserPlay === '1') delete video.dataset.anukUserPlay;
      }, 900);
    };

    video.addEventListener('play', () => {
      markUserStarted();
      clearPauseTimer(video);
      document.querySelectorAll('video').forEach((other) => {
        if (other !== video && isManagedVideo(other) && !other.paused) {
          other.pause();
        }
      });
      updateVideoActiveState();
    });

    video.addEventListener('playing', () => {
      clearPauseTimer(video);
      updateVideoActiveState();
    });
    video.addEventListener('pause', updateVideoActiveState);
    video.addEventListener('ended', updateVideoActiveState);
    video.addEventListener('waiting', updateVideoActiveState);

    observer?.observe(video);
  };

  // Dříve se pauzovalo už při intersectionRatio < 0.25, což může hned po startu
  // (před metadata / při layout shiftu) spustit falešné "mimo viewport" a video se zastaví.
  // Teď pauzujeme až když je video skutečně pryč (ratio < 0.05) a po krátké prodlevě.
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!isManagedVideo(video)) return;

          lastIntersectionRatio.set(video, entry.intersectionRatio || 0);

          const mostlyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
          if (mostlyVisible) {
            clearPauseTimer(video);
            if (pausedByObserver.has(video)) pausedByObserver.delete(video);
            return;
          }

          // Pokud video právě startuje (uživatelský play), nech ho doběhnout a neškrtit.
          if (video.dataset.anukUserPlay === '1') {
            return;
          }

          if (!video.paused) {
            pausedByObserver.add(video);
            schedulePauseIfStillOffscreen(video);
          }
        });
      }, { root: null, threshold: [0, 0.05, 0.2, 0.6] })
    : null;

  const scan = (root = document) => {
    root.querySelectorAll?.('video').forEach(prepareVideo);
  };

  scan();
  new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('video')) prepareVideo(node);
        scan(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.querySelectorAll('video').forEach((video) => {
        if (isManagedVideo(video) && !video.paused) video.pause();
      });
    }
    updateVideoActiveState();
  });
})();

