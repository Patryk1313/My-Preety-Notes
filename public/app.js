const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');
const previewStatus = document.getElementById('previewStatus');
const previewFrame = document.getElementById('previewFrame');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const saveProjectBtn = document.getElementById('saveProjectBtn');
const themeSelect = document.getElementById('themeSelect');
const randomThemeBtn = document.getElementById('randomThemeBtn');
const highlightBtn = document.getElementById('highlightBtn');
const projectsList = document.getElementById('projectsList');

let currentHtml = null;
let selectedHighlightColor = '#f0d4ff';

// Color picker functionality
document.querySelectorAll('.color-option').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    this.classList.add('active');
    selectedHighlightColor = this.getAttribute('data-color');
  });
});

// Helper: Wrap HTML fragment with styles and metadata
function wrapHtmlFragment(fragment) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand:wght@400;700&family=Pacifico&family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 20px; background: #f5f5f5; font-family: 'Patrick Hand', system-ui, sans-serif; }
    .note-page { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .sub-header { color: #ff9fb0; font-family: 'Pacifico', cursive; font-size: 18px; margin-top: 15px; }
    .highlight { background: #ffd6e0; padding: 2px 4px; border-radius: 3px; }
    .fancy-list { list-style: none; padding-left: 20px; }
    .fancy-item { margin: 8px 0; color: #333; }
    .fancy-item::before { content: "✦ "; color: #ff9fb0; font-weight: bold; margin-right: 8px; }
    .note-par { line-height: 1.6; color: #555; margin: 10px 0; }
    .sticker { position: absolute; top: 10px; right: 20px; font-size: 32px; opacity: 0.3; }
    h2, h3 { color: #ff9fb0; }
  </style>
</head>
<body>${fragment}</body>
</html>`;
}

async function fetchProjects() {
  try {
    const res = await fetch('/projects');
    const json = await res.json();
    projectsList.innerHTML = '';
    const projects = json.projects || [];
    if (projects.length === 0) {
      document.querySelector('.projects-empty').style.display = 'block';
    } else {
      document.querySelector('.projects-empty').style.display = 'none';
      projects.forEach(p => {
        const li = document.createElement('li');
        const timestamp = new Date(p.createdAt).toLocaleDateString();
        li.innerHTML = `📝 ${p.name}<br><span style="font-size:11px;color:#ccc;">${timestamp}</span>`;
        li.addEventListener('click', async () => {
          const r = await fetch(`/project/${p.id}`);
          const jd = await r.json();
          if (jd.project) {
            currentHtml = jd.project.html;
            previewFrame.srcdoc = jd.project.html;
            statusEl.innerHTML = `<span class="status-icon">✅</span><span class="status-text">Loaded: <strong>${jd.project.name}</strong></span>`;
            statusEl.className = 'status-block status-success';
            previewStatus.textContent = '✓ Preview ready';
            downloadPdfBtn.disabled = false;
            saveProjectBtn.disabled = false;
            // Set theme select to saved theme if available
            if (jd.project.theme) {
              themeSelect.value = jd.project.theme;
            }
          }
        });
        projectsList.appendChild(li);
      });
    }
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="status-icon">⚠️</span><span class="status-text">Failed to load projects</span>`;
    statusEl.className = 'status-block status-error';
  }
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) return alert('Choose a .docx file first');
  statusEl.innerHTML = `<span class="status-icon">⏳</span><span class="status-text">Uploading ${file.name}...</span>`;
  statusEl.className = 'status-block status-info';
  const form = new FormData();
  form.append('docx', file);
  console.log('Uploading file:', file.name, file.size, file.type);
  try {
    const res = await fetch('/upload', { method: 'POST', body: form });
    console.log('Upload response status:', res.status);
    const json = await res.json();
    console.log('Upload response:', json);
    if (json.error) throw new Error(json.error);
    const html = json.html;
    if (!html) throw new Error('No HTML returned from server');
    
    currentHtml = html;
    previewFrame.srcdoc = html;
    
    // Display AI theme info if available
    let themeText = 'Custom AI Design';
    if (json.theme?.name) {
      themeText = `Custom: ${json.theme.name}`;
    }
    
    statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Uploaded: <strong>${file.name}</strong> - <strong>${themeText}</strong> Generated by AI</span>`;
    statusEl.className = 'status-block status-success';
    previewStatus.textContent = '✓ Preview ready (AI styled)';
    downloadPdfBtn.disabled = false;
    saveProjectBtn.disabled = false;
  } catch (err) {
    console.error('Upload error:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
    previewStatus.textContent = '❌ Error';
  }
});

downloadPdfBtn.addEventListener('click', async () => {
  const html = currentHtml || previewFrame.srcdoc;
  if (!html) return alert('No preview available');
  statusEl.innerHTML = `<span class="status-icon">⏳</span><span class="status-text">Generating PDF...</span>`;
  statusEl.className = 'status-block status-info';
  console.log('Generating PDF, HTML length:', html.length);
  try {
    const res = await fetch('/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }) });
    console.log('PDF generation response status:', res.status);
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Failed to generate PDF');
    }
    const blob = await res.blob();
    console.log('PDF blob size:', blob.size);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aesthetic-notes.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    statusEl.innerHTML = `<span class="status-icon">✅</span><span class="status-text">PDF downloaded successfully!</span>`;
    statusEl.className = 'status-block status-success';
  } catch (err) {
    console.error('PDF generation error:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
});

highlightBtn.addEventListener('click', () => {
  if (!currentHtml) {
    alert('Upload a document first!');
    return;
  }
  
  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    const selection = iframeDoc.getSelection();
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert('Please select some text to highlight or remove highlight!');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText.trim().length === 0) {
      alert('Please select some text to highlight or remove highlight!');
      return;
    }
    
    // Check if selected text is already in a mark element
    const container = range.commonAncestorContainer;
    const parentMark = container.nodeType === 3 
      ? container.parentElement 
      : container;
    
    if (parentMark && parentMark.tagName === 'MARK') {
      // Remove highlight - unwrap the mark
      const parent = parentMark.parentNode;
      while (parentMark.firstChild) {
        parent.insertBefore(parentMark.firstChild, parentMark);
      }
      parent.removeChild(parentMark);
      
      statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Highlight removed!</span>`;
      statusEl.className = 'status-block status-success';
    } else {
      // Add highlight
      const mark = iframeDoc.createElement('mark');
      mark.className = 'user-highlight';
      mark.style.background = selectedHighlightColor;
      mark.style.padding = '2px 6px';
      mark.style.borderRadius = '3px';
      mark.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
      
      // Wrap selected content
      try {
        range.surroundContents(mark);
      } catch (e) {
        // If surroundContents fails (complex selection), try different approach
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
      
      statusEl.innerHTML = `<span class="status-icon">🖍️</span><span class="status-text">Text highlighted!</span>`;
      statusEl.className = 'status-block status-success';
    }
    
    // Clear selection
    selection.removeAllRanges();
    
    // Update currentHtml to preserve highlights for PDF
    currentHtml = iframeDoc.documentElement.outerHTML;
    
  } catch (err) {
    console.error('Highlight error:', err);
    alert('Could not modify highlight. Try selecting simpler text.');
  }
});

saveProjectBtn.addEventListener('click', async () => {
  const html = currentHtml || previewFrame.srcdoc;
  if (!html) return alert('No preview available');
  const name = prompt('Project name:');
  if (!name) return;
  const theme = themeSelect.value;
  statusEl.innerHTML = `<span class="status-icon">⏳</span><span class="status-text">Saving project...</span>`;
  statusEl.className = 'status-block status-info';
  try {
    const res = await fetch('/save-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, html, theme }) });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    statusEl.innerHTML = `<span class="status-icon">✅</span><span class="status-text">Project saved: <strong>${name}</strong></span>`;
    statusEl.className = 'status-block status-success';
    fetchProjects();
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
});

// Initial load on page load
window.addEventListener('DOMContentLoaded', () => {
  fetchProjects();
});

// Fallback for if script runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchProjects);
} else {
  fetchProjects();
}

// AI Analysis Modal Functions
function closeAiModal() {
  aiModal.style.display = 'none';
  aiImprovedData = null;
}

// Random Theme Button
randomThemeBtn.addEventListener('click', async () => {
  statusEl.innerHTML = `<span class="status-icon">🎲</span><span class="status-text">Generating random theme...</span>`;
  statusEl.className = 'status-block status-info';

  try {
    const res = await fetch('/random-theme');
    if (!res.ok) throw new Error('Failed to generate random theme');
    
    const data = await res.json();
    const theme = data;
    
    // Apply theme to the page via CSS variables
    document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.colors.secondary);
    document.documentElement.style.setProperty('--theme-accent', theme.colors.accent);
    document.documentElement.style.setProperty('--theme-highlight', theme.colors.highlight);
    document.documentElement.style.setProperty('--theme-background', theme.colors.background);
    document.documentElement.style.setProperty('--theme-text', theme.colors.text);
    
    // Update font variables
    document.documentElement.style.setProperty('--font-header', theme.fonts.header);
    document.documentElement.style.setProperty('--font-body', theme.fonts.body);
    
    statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Theme: <strong>${theme.name}</strong> applied!</span>`;
    statusEl.className = 'status-block status-success';
  } catch (err) {
    console.error('Random theme error:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
});
