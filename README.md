# Aesthetic Notes — Beautiful Study Notes Generator

Transform boring `.docx` documents into beautiful, aesthetic PDF notes with AI-powered theme generation.

## ✨ Features

- 📄 Upload `.docx` files and convert to beautiful HTML
- 🎨 8 preset aesthetic themes + AI-generated custom themes
- 🖍️ Interactive text highlighting and underlining
- 📱 Live preview with customizable styling
- 💾 Save and manage projects
- 📥 Export to PDF with perfect formatting
- 🤖 AI-powered keyword highlighting (Google Gemini)

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build:sass
npm start
```

Visit: `http://localhost:3000`

### Environment Setup

Create a `.env` file (copy from `.env.example`):

```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
PORT=3000
```

**Note:** The app works without Gemini API, but AI theme generation will be disabled.

## 📦 Deployment Checklist

Before deploying to production:

1. ✅ Set `GOOGLE_GEMINI_API_KEY` in hosting environment variables
2. ✅ Set `PORT` variable (or use hosting default)
3. ✅ Run `npm run build:sass` to compile CSS
4. ✅ Ensure `uploads/` and `projects/` folders are writable
5. ✅ Configure max upload size on your hosting

## 🛠️ Tech Stack

- **Backend:** Node.js, Express
- **Document Processing:** Mammoth.js (docx → HTML)
- **PDF Generation:** Puppeteer
- **AI:** Google Gemini API
- **Frontend:** Vanilla JS, Sass

## 📁 Project Structure

```
aesthetic-notes/
├── public/          # Frontend files
│   ├── app.html     # Main editor
│   ├── app.js       # Editor logic
│   ├── css/         # Compiled styles
│   └── js/          # Landing page
├── src/scss/        # Sass source files
├── server.js        # Express backend
├── projects/        # Saved projects (JSON)
├── uploads/         # Temporary file storage
└── .env.example     # Environment template
```

## 🌐 API Endpoints

- `POST /upload` — Upload .docx, returns HTML preview
- `POST /generate-pdf` — Convert HTML to PDF
- `POST /save-project` — Save project with theme
- `GET /projects` — List all saved projects
- `GET /project/:id` — Get specific project
- `DELETE /project/:id` — Delete project
- `GET /themes` — Get all available themes
- `GET /random-theme` — Get random theme

## 📝 License

MIT

## Skróty poleceń
```bash
# uruchom backend dev
npm run dev

# kompiluj Sass
npm run build:sass

# uruchom statyczny podgląd (tylko frontend)
npx --yes http-server public -p 8080
```
