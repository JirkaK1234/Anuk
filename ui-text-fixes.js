(() => {
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };
  const setAttr = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  document.querySelectorAll('.modal__close').forEach((button) => {
    button.innerHTML = '&times;';
    button.setAttribute('aria-label', 'Zavřít');
  });

  if (location.pathname.endsWith('/') || location.pathname.endsWith('/index.html') || !location.pathname.split('/').pop()) {
    document.title = 'Vítejte';
    setText('h1', 'Vítejte');
    setText('.header p', 'Vyberte si, co chcete udělat.');
    setText('[data-action="register"]', 'Registrace');
    setText('[data-action="login"]', 'Přihlášení');
    setText('[data-action="forgot"]', 'Zapomenuté heslo');
    setText('#loginModalTitle', 'Přihlášení');
    setText('#forgotModalTitle', 'Zapomenuté heslo');
    setText('#registerForm [name="contact"] + span', '');
    const labels = {
      contact: 'Email nebo číslo',
      password: 'Heslo',
      firstName: 'Jméno',
      lastName: 'Příjmení',
      birthDate: 'Datum narození'
    };
    Object.entries(labels).forEach(([name, label]) => {
      const fieldLabel = document.querySelector(`#registerForm [name="${name}"]`)?.closest('.field')?.querySelector('.field__label');
      if (fieldLabel) fieldLabel.textContent = label;
    });
    setText('#registerForm .field--radio > .field__label', 'Pohlaví');
    setText('#registerForm button[type="submit"]', 'Odeslat registraci');
    setText('#loginForm button[type="submit"]', 'Přihlásit se');
    setText('#forgotForm button[type="submit"]', 'Obnovit heslo');
    setText('.footer span', 'Moderní, rychlé a přehledné UI.');
  }

  if (location.pathname.endsWith('/feed.html')) {
    document.title = 'Veřejná nástěnka';
    setText('.feed-hero h1', 'Veřejná nástěnka');
    setText('.feed-hero p', 'Najděte uživatele, objevujte příspěvky a reagujte.');
    setText('#feedLogout', 'Odhlásit se');
    setText('#feedSettings', 'Nastavení');
    setText('#profileLink', 'Můj profil');
    setText('#feedTabPublic', '🌍 Veřejné');
    setText('#feedTabFollowing', '👁️ Sleduji');
    setText('#feedNotificationsButton', '🔔 Oznámení');
    setText('#feedUsersButton', '👥 Uživatelé');
    setText('#feedLiveButton', '🔴 Živé');
    setText('#feedPostText', '📝 Text');
    setText('#feedPostCamera', '📸 Fotit');
    setText('#feedPostVideo', '🎬 Video');
    setText('#feedPostFile', '⬆️ Nahrát');
    setText('#feedTypeAll', '✨ Vše');
    setText('#feedTypeImages', '🖼️ Fotky');
    setText('#feedTypeVideos', '🎬 Videa');
    setText('#feedTypeText', '📝 Text');
    setText('#postTextTitle', 'Nový textový příspěvek');
    setText('#postUploadTitle', 'Nahrát fotku / video');
    setText('#postCameraTitle', 'Vyfotit a publikovat');
    setText('#postVideoTitle', 'Nahrát video');
    setText('#usersModalTitle', 'Uživatelé');
    setText('#notificationsModalTitle', 'Oznámení');
    setText('#liveModalTitle', 'Živé vysílání');
    setText('#liveStartPrivateButton', 'Spustit soukromé');
    setText('#liveStartPublicButton', 'Spustit veřejné');
    setText('#liveStopButton', 'Zastavit');
    setText('#liveCodeButton', 'Vytvořit kód');
    setText('#liveJoinButton', 'Připojit se');
    setText('#liveLeaveButton', 'Odpojit');
    setAttr('#feedSearch', 'placeholder', 'Hledat příspěvky / uživatele / role...');
  }

  if (location.pathname.endsWith('/account.html')) {
    document.title = 'Můj účet';
    setText('#logoutButton', 'Odhlásit se');
    setText('#accountSettingsButton', 'Nastavení');
    setText('#openFeedButton', 'Veřejná nástěnka');
    setText('#openFollowingButton', 'Sleduji');
    setText('.header h1', 'Vítejte na vašem účtu');
    setText('.header p', 'Jste úspěšně přihlášeni.');
    setText('#profileCoverPlaceholder', 'Vyberte úvodní video a ukažte svůj styl.');
    setText('#profileName', 'Váš profil');
    setText('#profileRole', 'Uživatel');
    setText('#profileBio', 'Napište něco o sobě, co ukáže váš styl a zkušenosti.');
    setText('.media-card h2', 'Moje fotky a videa');
    setText('#settingsModalTitle', 'Nastavení');
    setText('#settingsTabSecurity', 'Bezpečnost');
    setText('#settingsTabPrivacy', 'Soukromí');
    setText('#settingsTabSocial', 'Sledování');
    setText('#settingsTabBlocks', 'Blokace');
    setText('#settingsTabExport', 'Export');
  }

  if (location.pathname.endsWith('/user.html')) {
    document.title = 'Profil uživatele';
    setText('#backToFeed', 'Zpět');
    setText('#userSettings', 'Nastavení');
    setText('#logout', 'Odhlásit se');
    setText('#userTitle', 'Profil');
    setText('#userSubtitle', 'Načítám...');
    setText('#viewCoverPlaceholder', 'Bez úvodního videa');
    setText('#viewRole', 'Uživatel');
    setText('#followButton', 'Sledovat');
    setText('#unfollowButton', 'Přestat sledovat');
  }
})();
