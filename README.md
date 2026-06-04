# 🏁 Rotax Danmark PWA

React PWA med Supabase backend – hostes gratis på Vercel.

---

## Trin 1 – Kør SQL-schema i Supabase

1. Gå til supabase.com → dit projekt → SQL Editor
2. Klik "New query"
3. Åbn filen `../rotax-app-rn/supabase/schema.sql`
4. Kopiér alt og klik "Run"

---

## Trin 2 – Upload kode til GitHub

1. Gå til github.com → opret nyt repository: `rotax-pwa`
2. Klik "Add file" → "Upload files"
3. Upload **alle filer** fra denne mappe (rotax-pwa)
4. Klik "Commit changes"

---

## Trin 3 – Deploy på Vercel

1. Gå til vercel.com og log ind med GitHub
2. Klik "Add New Project"
3. Vælg dit `rotax-pwa` repository
4. Under **Environment Variables** tilføj:

| Key | Value |
|-----|-------|
| `REACT_APP_SUPABASE_URL` | `https://hqmwsehhouofkswyjdvh.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | `din_anon_nøgle` |

5. Klik **Deploy**

Efter 2-3 minutter får du et link:
```
https://rotax-pwa.vercel.app
```

---

## Trin 4 – Installer på iPhone som app

1. Åbn Safari på iPhone
2. Gå til dit Vercel-link
3. Tryk Del-ikonet (firkant med pil op)
4. Vælg "Føj til hjemmeskærm"
5. Den vises nu som en rigtig app med ikon!

---

## Trin 5 – Opret admin-bruger

1. Gå til Supabase → Authentication → Users → "Add user"
2. Opret med: `nikolaj@nha-automation.dk` / dit password
3. Kopier UUID
4. Kør i SQL Editor:
```sql
INSERT INTO profiles (id, type, name, is_official)
VALUES ('DIT-UUID', 'admin', 'Nikolaj', false);
```

---

## Opdater appen fremover

Hver gang du uploader en ny fil til GitHub opdaterer Vercel automatisk appen inden for 1-2 minutter. Ingen terminal nødvendig!

---

## Funktioner der er klar

- ✅ Login / Opret profil med AI licens-scanning
- ✅ Gæsteadgang (Docs + Livetiming)
- ✅ Løbskalender med tilmelding og dæk-registrering
- ✅ Dokumenter med PDF-links
- ✅ Mesterskabsstillinger
- ✅ Livetiming (preview)
- ✅ Straffe med realtime-opdatering
- ✅ Notifikationer (officials + alle)
- ✅ Profil med licens-verifikation
- 🚧 Official-skærme (Vægt, Snude, Indrapportering)
- 🚧 Admin-panel
- 🚧 Licenskontrol
