# Error guide

Tento dokument popisuje chyby, které API vrací uživateli. Každá API chyba má:

- `message` - konkrétní hláška,
- `code` - stabilní kód chyby,
- `error.name` - lidský název problému,
- `error.fix` - krátká oprava,
- `error.steps` - cesta, jak chybu spravit.

Endpoint pro kontrolu:

```txt
GET /api/error-guide
```

## Kódy chyb

| Kód | Název | Cesta opravy |
| --- | --- | --- |
| `AUTH_REQUIRED` | Přihlášení vypršelo | Přihlásit se znovu a zopakovat akci. |
| `FORBIDDEN_ACCESS` | Akce není povolená | Ověřit účet, roli, blokaci nebo přístup k soukromému obsahu. |
| `VALIDATION_ERROR` | Chybí nebo nesedí údaje | Doplň pole podle konkrétní hlášky a odešli formulář znovu. |
| `NOT_FOUND` | Obsah nenalezen | Obnov stránku, zkontroluj odkaz nebo kód místnosti. |
| `CONFLICT` | Akce už proběhla | Obnov data a pokračuj podle aktuálního stavu. |
| `RATE_LIMITED` | Příliš mnoho pokusů | Počkej a neposílej stejnou akci opakovaně. |
| `CLOSED_RESOURCE` | Obsah je uzavřený | Otevři jiné live nebo vytvoř novou místnost. |
| `BAD_JSON` | Neplatná data požadavku | Obnov stránku, případně zkontroluj request body ve frontendu. |
| `SERVER_ERROR` | Chyba serveru | Zkus akci znovu, admin zkontroluje `/api/health` a server log. |

## Příklad odpovědi

```json
{
  "message": "Neautorizováno",
  "code": "AUTH_REQUIRED",
  "error": {
    "code": "AUTH_REQUIRED",
    "name": "Přihlášení vypršelo",
    "fix": "Přihlas se znovu a zopakuj akci.",
    "steps": [
      "Otevři přihlášení.",
      "Přihlas se ke svému účtu.",
      "Vrať se na akci a spusť ji znovu."
    ],
    "status": 403,
    "path": "/api/live/rooms",
    "at": "2026-05-15T12:00:00.000Z"
  }
}
```

