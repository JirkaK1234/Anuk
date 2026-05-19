# Bezpečnost aplikace

Tento projekt používá několik vrstev ochrany v `server.js`. Smysl není udělat aplikaci "neprůstřelnou", ale zavřít nejběžnější díry: falešné přihlášení přes hlavičku, útoky z cizích webů, příliš velké requesty, brute-force pokusy a nebezpečné browser defaulty.

## Co je zapnuté

- `helmet` vypíná rizikové HTTP defaulty a doplňuje bezpečnostní hlavičky.
- Vlastní CSP (`Content-Security-Policy`) omezuje, odkud se smí načítat skripty, styly, média a API spojení.
- `cors` povoluje API požadavky s cookies jen z povolených originů.
- `express-session` ukládá přihlášení do serverové session a klient dostává jen bezpečnou cookie.
- Session data a aplikační data se ukládají do SQLite souboru `.data/anuk.sqlite`.
- Session cookie je `HttpOnly`, `SameSite=Lax` a v produkci `Secure`.
- CSRF ochrana vyžaduje u POST/DELETE requestů hlavičku `X-CSRF-Token`.
- `express-rate-limit` omezuje celé `/api`; přihlášení, registrace a obnova hesla mají přísnější limit.
- `express.json` a `express.urlencoded` mají nastavený limit velikosti body.
- Uploady jdou přes `/api/uploads` jako skutečné soubory do `.uploads`, ne jako base64 v databázi.
- Basic logging zapisuje metodu, cestu, status, dobu odpovědi a IP do server konzole.

## Důležité proměnné v .env

```env
NODE_ENV=production
SESSION_SECRET=dlouhy_nahodny_tajny_retezec_minimalne_32_znaku
ALLOWED_ORIGINS=https://tvoje-domena.cz,https://www.tvoje-domena.cz
JSON_BODY_LIMIT=5mb
FORM_BODY_LIMIT=256kb
UPLOAD_MAX_BYTES=26214400
SESSION_MAX_AGE_MS=604800000
DATABASE_PATH=.data/anuk.sqlite
PUBLIC_APP_URL=http://localhost:3000
MAIL_FROM=Anuk <jiricekkunacz@gmail.com>
SMTP_USER=jiricekkunacz@gmail.com
SMTP_PASS=gmail_app_password
```

`SESSION_SECRET` musí být v produkci pevně nastavený. Když se při každém startu mění, všichni uživatelé se odhlásí a staré session cookies přestanou platit.

Původní JSON soubory (`users.json`, `media.json`, `chats.json`...) se při prvním načtení automaticky importují do `.data/anuk.sqlite`. Pokud už existuje starší databáze `anuk.sqlite` v kořeni projektu, server ji při prvním startu zkopíruje do `.data`. Nové změny už se zapisují do SQLite. Soubory `.json`, `.sqlite`, `.db` a `.env` server neposílá jako statické soubory.

SQLite soubory nepatří do `node_modules`. Tato složka je jen pro závislosti z npm a může se kdykoliv přepsat nebo smazat. Databáze patří do datové složky, proto je výchozí cesta `.data/anuk.sqlite`. Pokud ji chceš změnit, použij `DATABASE_PATH`.

## Potvrzovací e-mail po registraci

Po vytvoření účtu server pošle potvrzovací e-mail na kontakt uživatele, pokud kontakt vypadá jako e-mailová adresa. Odesílatel je `MAIL_FROM`, výchozí hodnota je `Anuk <jiricekkunacz@gmail.com>`.

E-mail obsahuje odkaz `/email/confirm?token=...` pro potvrzení e-mailu a odkaz `/email/delete?token=...` pro odstranění účtu, pokud registraci provedl někdo cizí. Mazací odkaz nejdřív otevře potvrzovací stránku, aby účet nesmazal automatický skener e-mailových odkazů. Pro správné absolutní odkazy nastav `PUBLIC_APP_URL` na adresu aplikace, například `https://tvoje-domena.cz`.

Pro Gmail nestačí běžné heslo k účtu. V Google účtu je potřeba vytvořit "App password" a uložit ho do `SMTP_PASS`. Když `SMTP_PASS` není nastavený, registrace dál funguje, jen server zapíše do konzole, že e-mail nebyl odeslán.

## Přihlášení a role

Hlavní zdroj identity je `req.session.userId`. Starší hlavička `x-user-id` je nebezpečná, protože si ji může kdokoliv zfalšovat. Zůstává jen jako nouzová vývojová možnost přes:

```env
ALLOW_INSECURE_USER_HEADER=true
```

V produkci ji nezapínej. Admin endpointy používají `requireAdmin`, běžné chráněné endpointy používají `requireAuth`.

## CSRF

Server nastavuje cookie `XSRF-TOKEN`. Frontend ji u nebezpečných metod (`POST`, `DELETE`) posílá zpět v hlavičce:

```http
X-CSRF-Token: hodnota_z_cookie
```

Login, registrace a zapomenuté heslo jsou z CSRF vyjmuté, protože uživatel ještě nemusí mít session.

## Co ještě zvážit později

- Přechod ze SQLite na PostgreSQL, pokud aplikace poběží na více serverech najednou.
- Audit log pro admin akce do samostatného souboru nebo služby.
- Reset hesla přes jednorázový token místo jen simulované odpovědi.
- Detailnější antivirová/obsahová kontrola uploadů před zveřejněním.
