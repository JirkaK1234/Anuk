# Lokální test aplikace Anuk

Datum testu: 2026-05-15
Prostředí: lokální server `http://localhost:3000`, LAN adresa `http://192.168.0.114:3000`

## Shrnutí

Lokální test dopadl dobře. Server odpovídá, hlavní stránky se načítají, registrace a session fungují, feed API funguje, živé vysílání má funkční serverové endpointy pro soukromé i veřejné místnosti, browser na `localhost` umí získat testovací kameru a mikrofon a veřejné live studio drží mobilní formát videa `9:16`.

Na LAN adrese přes obyčejné HTTP kamera a mikrofon záměrně nefungují. Pro telefon a reálný test kamery je potřeba HTTPS, tedy například Render.

## Otestované stránky

- `index.html`: OK, status 200
- `feed.html`: OK, status 200
- `account.html`: OK, status 200
- `user.html`: OK, status 200

## Otestované technické části

- Syntaxe `server.js`: OK
- Syntaxe `feed.js`: OK
- Syntaxe `chat.js`: OK
- Syntaxe `script.js`: OK
- Syntaxe `user.js`: OK
- API health endpoint: OK
- Session + CSRF po registraci: OK
- Načtení profilu přihlášeného uživatele: OK
- Veřejný feed API: OK
- Adresář uživatelů API: OK
- Notifikace API: OK
- Chat API: OK, u nového testovacího účtu nebyla žádná vlákna, což je očekávané
- Vytvoření textového příspěvku: OK
- Reakce a komentář u příspěvku: OK
- Soukromé live API: vytvoření, start, heartbeat, komentář, reakce, close: OK
- Veřejné live API: vytvoření, start, výpis ve veřejném live seznamu, close: OK
- Browser media test na `localhost`: kamera OK, mikrofon OK, API pro sdílení obrazovky dostupné
- Mobilní layout veřejného live: OK, kamera drží `9 / 16`, testovaný rozměr cca `330 x 588`
- Browser smoke test: bez JS chyb
- LAN HTTP test: kamera/mikrofon nejsou dostupné, protože `http://192.168...` není bezpečný kontext
- Úklid testovacího účtu: OK

## Omezení lokálního testu

- Reálná kamera a mikrofon na telefonu nejdou přes `http://192.168.0.114:3000`, protože mobilní prohlížeče vyžadují HTTPS.
- Sdílení obrazovky nejde plně automaticky otestovat, protože prohlížeč vyžaduje ruční výběr obrazovky/okna uživatelem.
- WebRTC propojení mezi dvěma reálnými zařízeními je potřeba ověřit až přes HTTPS. Na různých sítích může být potřeba TURN server.
- Automatický test používá falešnou kameru/mikrofon v Playwrightu, takže ověřuje dostupnost API a logiku, ne kvalitu skutečné kamery.

## Funkce aplikace

### Přihlášení a účet

- Registrace uživatele.
- Přihlášení a odhlášení.
- Bezpečná session přes cookie.
- CSRF ochrana pro změnové API požadavky.
- Obnova hesla přes e-mailový tok.
- Potvrzení e-mailu.
- Smazání účtu s potvrzením heslem.
- Export osobních dat.
- Nastavení profilu, identity a hesla.
- Nastavení soukromí účtu.

### Feed a příspěvky

- Veřejný feed.
- Feed sledovaných uživatelů.
- Filtrování obsahu.
- Vyhledávání ve feedu.
- Textové příspěvky s vlastním stylem.
- Nahrávání fotek a videí.
- Kamera pro fotku.
- Nahrání krátkého videa z kamery.
- Viditelnost příspěvku veřejně / pro sledované.
- Reakce na příspěvky.
- Komentáře u příspěvků.
- Reakce na komentáře.
- Mazání vlastních komentářů.

### Uživatelé a sociální funkce

- Veřejný profil uživatele.
- Vyhledávání uživatelů.
- Žádosti o sledování.
- Přijetí, odmítnutí a zrušení žádosti.
- Přehled sledujících a sledovaných.
- Odebrání sledujícího.
- Přestat sledovat.
- Blokování a odblokování uživatelů.
- Počty sledujících a sledovaných.

### Notifikace

- Přehled notifikací.
- Označení notifikace jako přečtené.
- Označení všech notifikací jako přečtených.
- Mazání notifikací.
- Badge s počtem nových notifikací.

### Chat

- Seznam chatů.
- Žádosti o zprávu.
- Kontakty.
- Textové zprávy.
- Přílohy obrázků a videí.
- Emoji panel.
- Galerie médií v chatu.
- Audio a video hovory přes WebRTC signalizaci.
- Stav hovoru, odpověď na hovor, offer/answer/ICE endpointy.

### Živé vysílání

- Soukromé live s kódem místnosti.
- Veřejné live viditelné ve feedu.
- Start a zastavení vysílání.
- Připojení diváka kódem.
- Veřejný seznam aktivních live místností.
- Komentáře u live.
- Reakce u live.
- Počítadlo diváků a účastníků.
- Heartbeat přítomnosti.
- Sdílení soukromého live sledujícím.
- Zavolání admina v live.
- WebRTC offer/answer/ICE signalizace.
- Přepnutí kamery přední/zadní.
- Test zařízení: HTTPS, kamera, mikrofon, podpora sdílení obrazovky.
- Přepnutí kvality veřejného live: HD / úsporný režim.
- Zrcadlení vlastního náhledu.
- Sdílení obrazovky ve studiu.
- Viewer ovládání: zvuk, přizpůsobit/vyplnit, celá obrazovka, znovu připojit.
- Veřejné live studio ve stylu vysokého mobilního live formátu `9:16`.
- Fullscreen vrstva pro live modaly.

### Admin funkce

- Přehled uživatelů.
- Blokování a odblokování uživatelů.
- Ban a unban uživatelů.
- Změna role uživatele.
- Mazání uživatelů.
- Přehled a mazání médií.
- Poznámky k uživateli.
- Test e-mailu.
- Health/status panel.

### Bezpečnost a provoz

- Helmet bezpečnostní hlavičky.
- Rate limiting pro API, login, registraci a obnovu hesla.
- CORS s povolenými originy.
- Session cookie.
- CSRF cookie + header.
- Upload limit.
- Ochrana soukromých účtů a obsahu.
- Automatický úklid dočasných live místností.

## Doporučený další test na Renderu

Jakmile bude Render nasazený přes HTTPS:

1. Otevřít aplikaci na telefonu přes Render URL.
2. Přihlásit se.
3. Spustit `Test zařízení` ve veřejném live.
4. Ověřit povolení kamery a mikrofonu.
5. Spustit veřejné live.
6. Na druhém zařízení otevřít stejný Render web a připojit se jako divák.
7. Ověřit obraz, zvuk, komentáře, reakce a znovupřipojení.
8. Ověřit soukromé live přes kód místnosti.
9. Ověřit sdílení obrazovky na desktopu.
10. Pokud WebRTC selže mezi různými sítěmi, doplnit TURN server do `ANUK_ICE_SERVERS`.

## Produkční roadmapa

Toto jsou věci, které dávají smysl doplnit před větším veřejným provozem.

### Aktuální implementační stav

Část produkční roadmapy už je připravená v kódu. Detailní konfigurace je v `PRODUCTION_SETUP.md`.

Hotovo nebo připraveno konfiguračně:

- TURN/coturn konfigurace přes `/api/live/ice-servers`, `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` nebo `ANUK_ICE_SERVERS`.
- S3/R2 object storage fallback v `/api/uploads`; bez env běží lokální `.uploads`.
- Video upload vytváří `video_transcode` queue job.
- Lokální SQLite fallback queue přes dokument `jobs`.
- Přidané dependencies pro Redis/BullMQ/WebSocket budoucí scaling.
- Moderation reports: `POST /api/reports`, `GET /api/admin/reports`, `POST /api/admin/reports/:id`.
- Push notifications základ: VAPID env, subscription endpointy, `push-sw.js`.
- Anti-spam guard pro uploady, reporty, chat zprávy, live komentáře, příspěvky a komentáře.
- Rozšířený `/api/health` o storage, queue, push, moderation a live ICE stav.
- Frontend live načítá ICE servery ze serveru před startem/připojením.

Pořád vyžaduje externí službu nebo další worker:

- Reálný coturn server a jeho credentials.
- Reálný R2/S3 bucket a public URL.
- FFmpeg transcoding worker.
- Redis-backed BullMQ worker proces.
- Přepsání live/chat pollingu na WebSocket/SSE.
- Plná CI/CD pipeline.
- Reálné E2E testy dvou zařízení.
- iOS Safari test na fyzickém zařízení.
- Automatický adaptive bitrate přes SFU/simulcast nebo HLS/DASH.

### TURN server (coturn)

WebRTC přes STUN často nestačí, hlavně mezi různými sítěmi, mobilními daty, firemní Wi-Fi nebo přísným NATem. TURN server slouží jako relay pro video/audio, když se peer-to-peer spojení nepodaří.

Doporučení:
- nasadit `coturn`,
- přidat TURN URL, username a credential do `ANUK_ICE_SERVERS`,
- otestovat live mezi telefonem na mobilních datech a počítačem na Wi-Fi.

### Object storage (S3/R2)

Aktuálně se uploady ukládají lokálně. Pro Render a produkci je lepší používat externí storage, protože lokální disk může být dočasný nebo limitovaný.

Doporučení:
- použít Cloudflare R2, AWS S3 nebo kompatibilní službu,
- ukládat fotky, videa a přílohy mimo server,
- do databáze ukládat jen URL a metadata.

### Transcoding videa

Nahraná videa mohou mít různé formáty, velikosti a bitrate. Transcoding sjednotí formát a zlepší přehrávání.

Doporučení:
- převádět videa na web-friendly formát,
- generovat náhledy,
- dělat více kvalit pro větší videa,
- nespouštět transcoding přímo v requestu, ale přes queue.

### Queue systém

Dlouhé úlohy jako transcoding, e-maily, push notifikace nebo moderace by neměly blokovat HTTP requesty.

Doporučení:
- přidat queue systém,
- joby: video transcoding, e-mail, push, media cleanup, moderation scan,
- použít Redis-backed queue.

### WebSocket scaling

Live chat, notifikace, hovory a přítomnost budou při větším provozu potřebovat real-time vrstvu. Polling funguje jednoduše, ale škáluje hůř.

Doporučení:
- přidat WebSocket nebo Socket.IO,
- řešit sticky sessions nebo Redis adapter,
- přesunout live komentáře, reactions, presence a chat badge na real-time události.

### Redis

Redis pomůže se sdíleným stavem mezi instancemi serveru.

Doporučení:
- session store,
- rate-limit store,
- WebSocket pub/sub,
- queue backend,
- krátkodobé live presence cache.

### Lepší moderation tools

Admin panel už má základní správu uživatelů a médií. Pro veřejný provoz je potřeba silnější moderace.

Doporučení:
- reportování příspěvků, komentářů, chatů a live vysílání,
- fronta nahlášeného obsahu,
- rychlé mute/ban akce v live,
- audit log admin zásahů,
- důvody zásahů a historie moderace.

### Push notifications

Notifikace v aplikaci jsou užitečné, ale push notifikace pomůžou mimo otevřenou stránku.

Doporučení:
- Web Push API,
- nastavení typů oznámení,
- push pro žádosti o sledování, zprávy, live pozvánky a admin zásahy.

### E2E testy více zařízení

Live a chat potřebují testovat dva uživatele najednou.

Doporučení:
- Playwright test se dvěma browser kontexty,
- test veřejného live: broadcaster + viewer,
- test soukromého live přes kód,
- test chat hovoru,
- test mobilního viewportu a desktop viewportu.

### Monitoring/logging

Pro produkci je potřeba vidět chyby, výkon a stav aplikace.

Doporučení:
- strukturované logy,
- request ID,
- error tracking,
- metriky: počet live místností, viewer count, WebRTC failures, upload errors,
- alerty na 5xx chyby a vysokou latenci.

### Anti-spam

Veřejné feedy, komentáře, chaty a live reakce budou potřebovat ochranu proti spamu.

Doporučení:
- rate limit na komentáře, zprávy a reakce,
- cooldown pro nové účty,
- detekce opakovaného textu,
- omezení floodu v live chatu,
- možnost dočasného mute.

### CI/CD pipeline

Nasazení by mělo být opakovatelné a kontrolované.

Doporučení:
- spouštět `node --check` pro hlavní JS soubory,
- spouštět E2E smoke testy,
- build/deploy přes GitHub Actions nebo Render deploy hooks,
- oddělit staging a produkci.

### iOS Safari edge-case testy

iOS Safari má specifické limity pro autoplay, fullscreen, WebRTC, getUserMedia a audio.

Doporučení:
- testovat kameru/mikrofon na iPhonu,
- ověřit `playsinline`,
- ověřit přehrání zvuku po uživatelském gestu,
- ověřit fullscreen fallback,
- ověřit přepnutí přední/zadní kamery.

### Adaptive bitrate streaming

Současné WebRTC live posílá jednu kvalitu. Pro větší provoz a různá připojení je vhodné adaptivní streamování.

Doporučení:
- pro WebRTC zvážit simulcast/SFU,
- pro nahraná videa HLS/DASH,
- automaticky snižovat kvalitu při horším připojení,
- v UI ponechat ruční volbu HD / úsporný režim.
