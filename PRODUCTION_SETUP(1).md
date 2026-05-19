# Produkční moduly a nastavení

Tento soubor popisuje produkční funkce, které jsou v aplikaci připravené nebo částečně implementované přes konfiguraci.

## Render online fallback

Aplikace má připravený fallback pro Render i bez Redis/S3. Data jdou přes SQLite dokumenty a uploady můžou jít do persistentní složky.

Doporučené Render env proměnné:

```env
NODE_ENV=production
PUBLIC_APP_URL=https://anuk.onrender.com
DATABASE_PATH=/var/data/anuk.sqlite
UPLOAD_DIR=/var/data/uploads
QUEUE_MODE=sqlite
```

Na Renderu je potřeba připojit persistent disk na `/var/data`, pokud nepoužíváš S3/R2. Jinak jsou lokální uploady a SQLite soubor po redeployi rizikové.

Kontrola stavu:

- `GET /api/health`
- `renderFallback.databasePath`
- `renderFallback.sqliteQueueEnabled`
- `renderFallback.uploadDir`
- `realtime.queuedJobs`

## TURN / coturn

Aplikace má endpoint:

- `GET /api/live/ice-servers`

Frontend si při startu nebo připojení k live načte ICE konfiguraci ze serveru.

Proměnné:

```env
TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp
TURN_USERNAME=uzivatel
TURN_CREDENTIAL=heslo
```

Alternativně lze dodat celé pole:

```env
ANUK_ICE_SERVERS=[{"urls":["stun:stun.l.google.com:19302"]},{"urls":["turn:turn.example.com:3478"],"username":"u","credential":"p"}]
```

Bez TURN údajů aplikace používá STUN fallback.

## Object storage S3/R2

Upload endpoint `/api/uploads` podporuje:

- lokální storage jako fallback,
- S3/R2 storage přes env konfiguraci.

Proměnné pro R2/S3:

```env
STORAGE_PROVIDER=r2
R2_BUCKET=anuk-media
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=https://media.example.com
R2_KEY_PREFIX=uploads
```

Pro AWS S3:

```env
STORAGE_PROVIDER=s3
S3_BUCKET=anuk-media
S3_REGION=eu-central-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com
S3_KEY_PREFIX=uploads
```

Pokud storage není nastavená, soubory se dál ukládají do `.uploads`.

## Transcoding videa

Při nahrání videa se vytvoří job typu:

- `video_transcode`

Aktuálně je to evidenční queue job. Reálné zpracování FFmpeg workerem je další krok.

Job obsahuje:

- `sourceUrl`
- `fileName`
- `mimeType`
- `size`
- `userId`

## Queue systém

Aplikace má lokální fallback queue uloženou v dokumentu `jobs`.

Health endpoint ukazuje:

- `realtime.queueMode`
- `realtime.queuedJobs`

Admin endpointy pro fallback queue:

- `GET /api/admin/jobs`
- `GET /api/admin/jobs?status=queued`
- `POST /api/admin/jobs/:id`

Stavy jobů: `queued`, `processing`, `done`, `failed`, `cancelled`.

Proměnné:

```env
REDIS_URL=redis://...
QUEUE_MODE=redis
```

Redis/BullMQ balíčky jsou připravené v dependencies, ale worker proces pro produkční transcoding je potřeba doplnit jako další samostatný proces.

## WebSocket scaling

Balíček `ws` je přidaný v dependencies a health endpoint ukazuje připravenost package.

Aktuální live/chat stále používá REST polling, protože je jednodušší a stabilní pro lokální provoz.

Další krok:

- WebSocket/SSE vrstva pro komentáře, reakce, presence a chat badge,
- Redis pub/sub pro více instancí.

## Redis

Redis je připravený konfiguračně přes:

```env
REDIS_URL=redis://...
```

Aktuální fallback:

- session běží přes SQLite,
- queue evidence běží přes SQLite dokument,
- rate limit běží in-memory.

Produkční rozšíření:

- Redis session store,
- Redis rate-limit store,
- Redis pub/sub pro WebSockety,
- BullMQ worker.

## Moderation tools

Implementované endpointy:

- `POST /api/reports`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:id`

Report podporuje cíle:

- `media`
- `comment`
- `user`
- `chat`
- `live`

Stavy:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

Admin při novém reportu dostane notifikaci v aplikaci.

## Push notifications

Implementované endpointy:

- `GET /api/push/public-key`
- `POST /api/push/subscriptions`
- `DELETE /api/push/subscriptions`

Service worker:

- `/push-sw.js`

Proměnné:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
```

Frontend automaticky zaregistruje push subscription pouze pokud už má prohlížeč povolené notifikace.

## Anti-spam

Implementovaný jednoduchý anti-spam guard pro:

- uploady,
- reporty,
- chat zprávy,
- live komentáře,
- vytváření příspěvků,
- komentáře u příspěvků.

Chrání proti:

- příliš rychlému odesílání,
- opakování stejného textu.

## Monitoring/logging

Už existuje:

- request log s metodou, cestou, statusem, časem a IP,
- `/api/health` s rozšířeným stavem storage, push, moderation, queue a live ICE konfigurace.

Připraveno v dependencies:

- `pino`

Další krok:

- nahradit console logging strukturovaným loggerem,
- přidat error tracking a request ID.

## CI/CD pipeline

Doporučené minimální kroky:

```powershell
node --check server.js
node --check feed.js
node --check chat.js
node --check script.js
node --check user.js
```

Další krok:

- přidat GitHub Actions,
- spouštět Playwright smoke testy,
- nasazovat staging a produkci odděleně.

## E2E testy více zařízení

Lokální test zatím ověřuje browser media API a serverové live endpointy.

Další krok:

- Playwright se dvěma browser contexty,
- broadcaster + viewer,
- veřejné live,
- soukromé live přes kód,
- chat hovor.

## iOS Safari edge-case testy

Stále nutné ručně ověřit na reálném iPhonu:

- kamera/mikrofon přes HTTPS,
- autoplay a zvuk po user gesture,
- `playsinline`,
- fullscreen fallback,
- přepnutí přední/zadní kamery.

## Adaptive bitrate streaming

Implementovaný základ:

- ruční přepnutí veřejného live `HD / Úsp.`.

Další krok:

- WebRTC simulcast nebo SFU pro live,
- HLS/DASH pro nahraná videa,
- automatické snižování kvality podle připojení.
