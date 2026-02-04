# My Preety Notes — Aesthetic Notes (MVP)

Konwersja plików `.docx` do estetycznych, czytelnych PDF z podglądem HTML. Frontend (prosty edytor) + backend (upload, generowanie PDF). Minimalny landing został uproszczony — `index.html` zawiera tylko przycisk do edytora.

## Szybki start (pełny, z backendem)
- W folderze projektu `aesthetic-notes`:

```bash
npm install
npm run build:sass
npm run dev
```

- Otwórz: `http://localhost:3000/app.html` (edytor: upload, podgląd, generowanie PDF)

## Tryb statyczny (tylko frontend)
Jeśli chcesz zobaczyć sam interfejs bez backendu:

```bash
npx --yes http-server public -p 8080
# potem: http://localhost:8080/app.html
```

Uwaga: w trybie statycznym nie działają endpointy: `upload`, `generate-pdf`, `projects`.

## Konfiguracja środowiska
- Utwórz plik `.env` (opcjonalnie) z kluczem AI, aby włączyć projektowanie motywu przez Gemini:

```
GOOGLE_GEMINI_API_KEY=twoj_klucz
```

## Endpoints (backend)
- `POST /upload` — wyślij `.docx`, zwraca przetworzony HTML (podgląd)
- `POST /generate-pdf` — wyślij `{ html }`, zwraca PDF
- `POST /save-project` — zapis projektu `{ name, html, theme }`
- `GET /projects` — lista zapisanych projektów
- `GET /project/:id` — pobierz konkretny projekt

## Struktura projektu
- `public/` — frontend (app.html, css, js, themes.json)
- `src/scss/` — źródła Sass → kompilowane do `public/css/styles.css`
- `server.js` — backend Express + `multer`, `mammoth`, `puppeteer`
- `projects/` — zapisane projekty (JSON)
- `uploads/` — przesłane pliki `.docx`

## Znane uwagi
- `puppeteer` pobiera Chromium podczas `npm install` (duży rozmiar).
- Windows CRLF/LF: ostrzeżenia Git są normalne.
- To MVP: dla produkcji dodaj walidację, limity i sprzątanie plików tymczasowych.

## Skróty poleceń
```bash
# uruchom backend dev
npm run dev

# kompiluj Sass
npm run build:sass

# uruchom statyczny podgląd (tylko frontend)
npx --yes http-server public -p 8080
```
