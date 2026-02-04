const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const cors = require('cors');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let genAI = null;
if (process.env.GOOGLE_GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
}

const uploadDir = path.join(__dirname, 'uploads');
const projectsDir = path.join(__dirname, 'projects');
[uploadDir, projectsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Theme definitions - centralized
const THEMES = [
  {
    id: "cherry-blossom",
    name: "Soft Cherry Blossom",
    colors: { primary: "#ffb3d9", secondary: "#ffc9e3", accent: "#ffe0f0", highlight: "#fff0f7", background: "#fffafc", text: "#5a3a4a" },
    fonts: { header: "'Pacifico', cursive", body: "'Quicksand', sans-serif" }
  },
  {
    id: "lavender",
    name: "Lavender Dreams",
    colors: { primary: "#d4b5f0", secondary: "#e6d4ff", accent: "#f0e6ff", highlight: "#f5f0ff", background: "#fdfbff", text: "#4a3a5a" },
    fonts: { header: "'Poppins', sans-serif", body: "'Nunito', sans-serif" }
  },
  {
    id: "mint",
    name: "Mint Breeze",
    colors: { primary: "#b3f0d4", secondary: "#c9ffe6", accent: "#e0fff0", highlight: "#f0fff7", background: "#fafffc", text: "#3a5a4a" },
    fonts: { header: "'Raleway', sans-serif", body: "'Quicksand', sans-serif" }
  },
  {
    id: "peach",
    name: "Peach Sunset",
    colors: { primary: "#ffc9b3", secondary: "#ffe0d4", accent: "#fff0e6", highlight: "#fff7f0", background: "#fffcfa", text: "#5a4a3a" },
    fonts: { header: "'Patrick Hand', cursive", body: "'Nunito', sans-serif" }
  },
  {
    id: "blue",
    name: "Baby Blue Sky",
    colors: { primary: "#b3d9ff", secondary: "#d4e6ff", accent: "#e6f0ff", highlight: "#f0f7ff", background: "#fafcff", text: "#3a4a5a" },
    fonts: { header: "'Playfair Display', serif", body: "'Raleway', sans-serif" }
  },
  {
    id: "lemon",
    name: "Lemon Cream",
    colors: { primary: "#fff0b3", secondary: "#fff7d4", accent: "#fffce6", highlight: "#fffef0", background: "#fffffa", text: "#5a5a3a" },
    fonts: { header: "'Poppins', sans-serif", body: "'Quicksand', sans-serif" }
  },
  {
    id: "rose",
    name: "Rose Quartz",
    colors: { primary: "#ffcce0", secondary: "#ffe0eb", accent: "#fff0f5", highlight: "#fff7fa", background: "#fffcfd", text: "#5a3a45" },
    fonts: { header: "'Pacifico', cursive", body: "'Patrick Hand', cursive" }
  },
  {
    id: "lilac",
    name: "Lilac Whisper",
    colors: { primary: "#e6ccff", secondary: "#f0e0ff", accent: "#f7f0ff", highlight: "#fbf7ff", background: "#fefcff", text: "#4a3a5a" },
    fonts: { header: "'Raleway', sans-serif", body: "'Nunito', sans-serif" }
  }
];

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  }
});

app.post('/upload', upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const result = await mammoth.convertToHtml({ 
      path: req.file.path,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh"
      ],
      includeDefaultStyleMap: true
    });
    
    const simple = result.value || '';
    const tempDiv = '<div>' + simple + '</div>';
    const textContent = tempDiv.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    let dynamicHtml = simple;
    let dynamicCss = '';
    let themeData = { name: 'default', colors: {}, fonts: {} };
    
    if (genAI && textContent.length > 50) {
      try {
        const designPrompt = `You are an EXPERT aesthetic note designer. Create a PERFECT, BEAUTIFUL design for this document.

CRITICAL ANALYSIS - Identify:
1. All headings (H1, H2, H3) and their hierarchy
2. All lists (numbered, bulleted)
3. Important keywords and concepts
4. Document tone and subject

CREATE PERFECT PASTEL DESIGN:
- Soft pastel colors ONLY (no gradients!)
- Use a HANDWRITING/handmade font for body text (e.g., Patrick Hand, Caveat, Handlee)
- Use a decorative header font (e.g., Pacifico)
- Perfect spacing and hierarchy
- Clear visual distinction between elements
- Add a subtle "notebook lines" background effect

Return ONLY this JSON:
{
  "theme": {
    "name": "theme name based on content",
    "colors": {
      "primary": "#pastel color for headers",
      "secondary": "#pastel for subheaders",
      "accent": "#pastel for accents",
      "highlight": "#pastel for highlights",
      "background": "#very light pastel",
      "text": "#soft dark color"
    },
    "fonts": {
      "header": "'Beautiful Decorative Font', cursive",
      "body": "'Handwriting Font', cursive"
    }
  },
  "structure": {
    "headings": ["heading text 1", "heading text 2"],
    "keyTerms": ["important word 1", "important word 2", "important word 3"]
  }
}

Document:
${textContent.substring(0, 3000)}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const designResult = await model.generateContent(designPrompt);
        const designText = designResult.response.text();
        
        try {
          const jsonMatch = designText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const design = JSON.parse(jsonMatch[0]);
            themeData = design.theme || themeData;
            
            const {
              primary = '#ffb3d9',
              secondary = '#ffc9e3',
              accent = '#ffe0f0',
              highlight = '#fff0f7',
              background = '#fffafc',
              text = '#5a3a4a'
            } = themeData.colors || {};
            
            const headerFont = themeData.fonts?.header || "'Pacifico', cursive";
            const defaultHandwritingFont = "'Patrick Hand', 'Caveat', 'Handlee', cursive";
            const bodyFontCandidate = themeData.fonts?.body || defaultHandwritingFont;
            const bodyFont = /(patrick hand|caveat|handlee|handwriting|cursive)/i.test(bodyFontCandidate)
              ? bodyFontCandidate
              : defaultHandwritingFont;
            
            const pastelColors = [
              '#fff0f7', '#f0d4ff', '#fff0b3', '#ffcce0', '#d4f0ff', 
              '#d4ffcc', '#ffe0cc', '#e6f7ff', '#fff5e6', '#fce4ec',
              '#f3e5f5', '#e0f7fa', '#f1f8e9', '#fff3e0', '#fbe9e7'
            ];
            const randomAiHighlight = pastelColors[Math.floor(Math.random() * pastelColors.length)];
            
            const fontImports = `@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Patrick+Hand&family=Caveat:wght@400;600;700&family=Handlee&family=Quicksand:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;700&family=Nunito:wght@400;600&family=Playfair+Display:wght@400;700&display=swap');`;
            
            dynamicCss = `
              ${fontImports}
              
              * {
                box-sizing: border-box;
                text-decoration: none !important;
              }
              
              body {
                font-family: ${bodyFont};
                color: ${text};
                line-height: 1.8;
                background: ${background};
                margin: 0;
                padding: 0;
              }
              
              .note-page {
                max-width: 100%;
                width: 100%;
                margin: 0;
                background: white;
                padding: 30px 40px;
                border-radius: 0;
                box-shadow: none;
                position: relative;
                overflow: hidden;
              }

              .note-page::before {
                content: "";
                position: absolute;
                inset: 40px;
                pointer-events: none;
                background-image: repeating-linear-gradient(
                  to bottom,
                  rgba(0, 0, 0, 0.08) 0px,
                  rgba(0, 0, 0, 0.08) 1px,
                  transparent 1px,
                  transparent 32px
                );
                opacity: 0.25;
              }

              .note-content {
                position: relative;
                z-index: 1;
              }
              
              h1, h2, h3, h4, h5, h6 {
                font-family: ${headerFont};
                font-weight: 700;
                line-height: 1.3;
                margin-top: 28px;
                margin-bottom: 16px;
              }
              
              h1 {
                font-size: 2.5em;
                color: ${primary};
                border-bottom: 4px solid ${accent};
                padding-bottom: 12px;
                margin-top: 0;
              }
              
              h2 {
                font-size: 1.8em;
                color: ${primary};
                border-left: 5px solid ${secondary};
                padding-left: 16px;
              }
              
              h3 {
                font-size: 1.4em;
                color: ${secondary};
              }
              
              p {
                margin-bottom: 16px;
                font-size: 1.05em;
              }
              
              .ai-highlight {
                background: ${randomAiHighlight};
                padding: 3px 7px;
                border-radius: 4px;
                font-weight: 700;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                color: ${text};
              }
              
              ul, ol {
                padding-left: 24px;
                margin: 16px 0;
              }
              
              li {
                margin-bottom: 10px;
                padding-left: 12px;
                line-height: 1.7;
              }
              
              ul li {
                list-style: none;
                position: relative;
              }
              
              ul li::before {
                content: "✦";
                position: absolute;
                left: -20px;
                color: ${primary};
                font-size: 1.2em;
                font-weight: bold;
              }
              
              ol li {
                font-weight: 600;
              }
              
              strong, b {
                font-weight: 700;
                color: ${primary};
              }
              
              em, i {
                font-style: italic;
                color: ${secondary};
              }
              
              mark, .highlight, .user-highlight {
                background: ${highlight};
                padding: 2px 6px;
                border-radius: 3px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                color: ${text};
              }
              
              .note-header {
                font-family: ${headerFont};
                color: ${primary};
                font-size: 1.8em;
                margin-bottom: 30px;
                text-align: center;
              }
              
              .sticker {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 40px;
                opacity: 0.3;
                color: ${secondary};
              }
            `;
            
            if (design.structure?.keyTerms && design.structure.keyTerms.length > 0) {
              let highlightedHtml = simple;
              design.structure.keyTerms.forEach(term => {
                if (term && term.length > 2) {
                  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`\\b(${escapedTerm})\\b(?![^<]*>)`, 'gi');
                  highlightedHtml = highlightedHtml.replace(regex, '<span class="ai-highlight">$1</span>');
                }
              });
              dynamicHtml = highlightedHtml;
            }
          }
        } catch (parseErr) {}
      } catch (aiErr) {}
    }
    
    const transformed = transformHtmlWithPerfectCss(dynamicHtml, dynamicCss);
    const full = wrapHtmlFragment(transformed, dynamicCss);
    
    // Delete uploaded file after conversion
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({ 
      html: full,
      theme: themeData
    });
  } catch (e) {
    console.error(e);
    // Clean up file on error too
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: e.message });
  }
});

function transformHtmlWithPerfectCss(inputHtml, customCss) {
  let out = inputHtml;
  
  out = out.replace(/<u>/gi, '');
  out = out.replace(/<\/u>/gi, '');
  
  out = out.replace(/style="([^"]*)"/gi, (match, styleContent) => {
    const cleaned = styleContent.replace(/text-decoration:\s*[^;]*;?/gi, '').trim();
    return cleaned ? `style="${cleaned}"` : '';
  });
  
  out = out.replace(/<h1>/gi, '<h1 class="heading-1">');
  out = out.replace(/<h2>/gi, '<h2 class="heading-2">');
  out = out.replace(/<h3>/gi, '<h3 class="heading-3">');
  out = out.replace(/<p>/gi, '<p class="paragraph">');
  out = out.replace(/<ul>/gi, '<ul class="list">');
  out = out.replace(/<ol>/gi, '<ol class="numbered-list">');
  out = out.replace(/<li>/gi, '<li class="list-item">');
  
  const sticker = '<div class="sticker">✨</div>';
  const header = '<div class="note-header">Aesthetic Notes</div>';
  
  return `<div class="note-page">${sticker}${header}<div class="note-content">${out}</div></div>`;
}

function wrapHtmlFragment(fragment, dynamicCss = '') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Patrick+Hand&family=Caveat:wght@400;600;700&family=Handlee&family=Quicksand:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;700&family=Nunito:wght@400;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { scrollbar-width: none; -ms-overflow-style: none; }
    *::-webkit-scrollbar { display: none; }
    ${dynamicCss}
  </style>
</head>
<body>
  ${fragment}
</body>
</html>`;
}

app.post('/save-project', async (req, res) => {
  try {
    const { name, html, theme } = req.body;
    if (!name || !html) return res.status(400).json({ error: 'Missing name or html' });
    const id = Date.now().toString();
    const filePath = path.join(projectsDir, `${id}.json`);
    const data = { id, name, theme: theme || 'default', html, createdAt: new Date().toISOString() };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true, project: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/themes', (req, res) => {
  res.json({ themes: THEMES });
});

app.get('/theme/:id', (req, res) => {
  const theme = THEMES.find(t => t.id === req.params.id);
  if (!theme) return res.status(404).json({ error: 'Theme not found' });
  res.json(theme);
});

app.get('/random-theme', (req, res) => {
  const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
  res.json(randomTheme);
});

app.get('/projects', (req, res) => {
  try {
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
    const list = files.map(f => {
      const p = JSON.parse(fs.readFileSync(path.join(projectsDir, f), 'utf8'));
      return { id: p.id, name: p.name, theme: p.theme, createdAt: p.createdAt };
    }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ projects: list });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/project/:id', (req, res) => {
  try {
    const id = req.params.id;
    const filePath = path.join(projectsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ project: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/project/:id', (req, res) => {
  try {
    const id = req.params.id;
    const filePath = path.join(projectsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true, message: 'Project deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/generate-pdf', async (req, res) => {
  let browser;
  try {
    const html = req.body.html || '';
    if (!html) return res.status(400).json({ error: 'No HTML provided' });
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');
    await page.waitForTimeout(2000);
    
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      scale: 1.0
    });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="aesthetic-notes.pdf"' });
    res.send(pdf);
  } catch (e) {
    console.error('PDF generation error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Only .docx files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Aesthetic Notes server listening on http://localhost:${PORT}`));
