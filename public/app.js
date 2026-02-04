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
const underlineBtn = document.getElementById('underlineBtn');
const textColorBtn = document.getElementById('textColorBtn');
const textColorPicker = document.getElementById('textColorPicker');
const selectionPopup = document.getElementById('selectionPopup');
const popupHighlightBtn = document.getElementById('popupHighlightBtn');
const popupUnderlineBtn = document.getElementById('popupUnderlineBtn');
const popupBoldBtn = document.getElementById('popupBoldBtn');
const popupBiggerBtn = document.getElementById('popupBiggerBtn');
const popupSmallerBtn = document.getElementById('popupSmallerBtn');
const popupRemoveBtn = document.getElementById('popupRemoveBtn');
const popupTextColorPicker = document.getElementById('popupTextColorPicker');
const popupTextColorBtn = document.getElementById('popupTextColorBtn');
const removeMarkupBtn = document.getElementById('removeMarkupBtn');
const projectsList = document.getElementById('projectsList');

const isPremiumUser = new URLSearchParams(window.location.search).get('premium') === '1';

let currentHtml = null;
let originalHtml = null;
let selectedHighlightColor = '#f0d4ff';
let selectedUnderlineColor = '#ff9fb0';
let selectedTextColor = '#5a3a4a';
let currentTheme = null;
let lastSelectionRange = null;

const HANDMADE_FONTS = [
  { name: 'Patrick Hand', css: "'Patrick Hand', cursive" },
  { name: 'Caveat', css: "'Caveat', cursive" },
  { name: 'Kalam', css: "'Kalam', cursive" },
  { name: 'Handlee', css: "'Handlee', cursive" },
  { name: 'Gloria Hallelujah', css: "'Gloria Hallelujah', cursive" }
];

// Style customization variables
let customStyles = {
  fontSize: 120,
  lineSpacing: 1,
  boldColor: '#FFF9C4',
  aiHighlightColor: '#fff0f7',
  shadowBlur: 0
};

// Color picker functionality
document.querySelectorAll('.color-option[data-group="highlight"]').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.color-option[data-group="highlight"]').forEach(opt => opt.classList.remove('active'));
    this.classList.add('active');
    selectedHighlightColor = this.getAttribute('data-color');
  });
});

document.querySelectorAll('.color-option[data-group="underline"]').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.color-option[data-group="underline"]').forEach(opt => opt.classList.remove('active'));
    this.classList.add('active');
    selectedUnderlineColor = this.getAttribute('data-color');
  });
});

textColorPicker?.addEventListener('input', (e) => {
  selectedTextColor = e.target.value;
});

popupTextColorPicker?.addEventListener('input', (e) => {
  selectedTextColor = e.target.value;
  if (textColorPicker) textColorPicker.value = e.target.value;
});

popupHighlightBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!restoreSelection()) return;
  applyHighlightToSelection(true);
  hideSelectionPopup();
});

popupUnderlineBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!restoreSelection()) return;
  applyUnderlineToSelection(true);
  hideSelectionPopup();
});

popupBoldBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (applyBoldToSelection()) {
    statusEl.innerHTML = `<span class="status-icon">🅱️</span><span class="status-text">Bold applied!</span>`;
    statusEl.className = 'status-block status-success';
  }
    // Don't hide popup, keep selection
});

popupBiggerBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (applyBiggerTextToSelection()) {
    statusEl.innerHTML = `<span class="status-icon">🔍</span><span class="status-text">Text size increased!</span>`;
    statusEl.className = 'status-block status-success';
  }
    // Don't hide popup, keep selection
});

popupSmallerBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (applySmallerTextToSelection()) {
    statusEl.innerHTML = `<span class="status-icon">🔍</span><span class="status-text">Text size decreased!</span>`;
    statusEl.className = 'status-block status-success';
  }
    // Don't hide popup, keep selection
});

popupRemoveBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!restoreSelection()) return;
  removeMarkupBtn.click();
    // Don't hide popup, keep selection
});

popupTextColorBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (popupTextColorPicker) {
    selectedTextColor = popupTextColorPicker.value;
    if (textColorPicker) textColorPicker.value = popupTextColorPicker.value;
  }
  applyTextColorToSelection(true);
  hideSelectionPopup();
});

document.addEventListener('mousedown', (e) => {
  if (selectionPopup && !selectionPopup.contains(e.target)) {
    hideSelectionPopup();
  }
});

function unwrapElement(el) {
  if (!el || !el.parentNode) return;
  const parent = el.parentNode;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

function getSelectionRange(iframeDoc) {
  const selection = iframeDoc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!range.toString().trim()) return null;
  return { selection, range };
}

function findClosest(node, predicate) {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  while (el && el.nodeType === 1) {
    if (predicate(el)) return el;
    el = el.parentElement;
  }
  return null;
}

function getPrimaryFontName(fontValue) {
  if (!fontValue || typeof fontValue !== 'string') return null;
  const first = fontValue.split(',')[0]?.trim();
  if (!first) return null;
  return first.replace(/^['"]|['"]$/g, '');
}

function buildGoogleFontsUrl(fonts) {
  if (!fonts) return null;
  const families = [getPrimaryFontName(fonts.header), getPrimaryFontName(fonts.body)]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (!families.length) return null;

  const familyParams = families
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

function getHandmadeFontForTheme(theme) {
  const key = theme?.id || theme?.name || 'default';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i)) % HANDMADE_FONTS.length;
  }
  const font = HANDMADE_FONTS[hash] || HANDMADE_FONTS[0];
  return {
    header: font.css,
    body: font.css
  };
}

function saveSelection(range) {
  lastSelectionRange = range ? range.cloneRange() : null;
}

function syncCurrentHtmlFromPreview() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;
  currentHtml = iframeDoc.documentElement.outerHTML;
}

function restoreSelection() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc || !lastSelectionRange) return null;
  const selection = iframeDoc.getSelection();
  selection.removeAllRanges();
  selection.addRange(lastSelectionRange);
  return { selection, range: lastSelectionRange };
}

function getRangeRect(range) {
  if (!range) return null;
  let rect = range.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) {
    const rects = range.getClientRects();
    rect = rects && rects.length ? rects[0] : null;
  }
  return rect;
}

function showSelectionPopup(range) {
  if (!selectionPopup) return;
  const rect = getRangeRect(range);
  if (!rect) return;

  saveSelection(range);
  if (popupTextColorPicker) {
    popupTextColorPicker.value = selectedTextColor;
  }
  selectionPopup.style.display = 'block';

  const iframeRect = previewFrame.getBoundingClientRect();
  const popupWidth = selectionPopup.offsetWidth;
  const popupHeight = selectionPopup.offsetHeight;

  let top = iframeRect.top + rect.top - popupHeight - 8;
  let left = iframeRect.left + rect.left;

  if (top < 8) top = iframeRect.top + rect.bottom + 8;
  if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
  if (left < 8) left = 8;

  selectionPopup.style.top = `${top}px`;
  selectionPopup.style.left = `${left}px`;
}

function hideSelectionPopup() {
  if (selectionPopup) selectionPopup.style.display = 'none';
}

let selectionPopupRaf = null;
function scheduleSelectionPopupUpdate() {
  if (selectionPopupRaf) cancelAnimationFrame(selectionPopupRaf);
  selectionPopupRaf = requestAnimationFrame(() => {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!iframeDoc || !selectionPopup) return;
    const selection = iframeDoc.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      hideSelectionPopup();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!range.toString().trim()) {
      hideSelectionPopup();
      return;
    }
    showSelectionPopup(range);
  });
}

function attachSelectionPopupHandlers() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc || iframeDoc.__selectionPopupBound) return;
  iframeDoc.__selectionPopupBound = true;
  iframeDoc.addEventListener('mouseup', scheduleSelectionPopupUpdate);
  iframeDoc.addEventListener('keyup', scheduleSelectionPopupUpdate);
  iframeDoc.addEventListener('selectionchange', scheduleSelectionPopupUpdate);
}

function enableEditableHeaderIfPremium() {
  if (!isPremiumUser) return;
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;
  const header = iframeDoc.querySelector('.note-header');
  if (!header || header.__editableBound) return;

  header.setAttribute('contenteditable', 'true');
  header.setAttribute('spellcheck', 'false');
  header.setAttribute('data-premium-editable', 'true');
  header.__editableBound = true;

  header.addEventListener('input', () => {
    syncCurrentHtmlFromPreview();
  });

  header.addEventListener('blur', () => {
    syncCurrentHtmlFromPreview();
  });
}

previewFrame?.addEventListener('load', () => {
  attachSelectionPopupHandlers();
  enableEditableHeaderIfPremium();
});

function applyBoldToSelection() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  const selectionData = restoreSelection();
  if (!iframeDoc || !selectionData) return false;
  const { selection, range } = selectionData;

  const container = range.commonAncestorContainer;
  const parentBold = findClosest(container, el => el.classList.contains('user-bold'));

  if (parentBold) {
    unwrapElement(parentBold);
  } else {
    const boldSpan = iframeDoc.createElement('span');
    boldSpan.className = 'user-bold';
    boldSpan.style.setProperty('font-weight', '700', 'important');
    try {
      range.surroundContents(boldSpan);
    } catch (e) {
      const fragment = range.extractContents();
      boldSpan.appendChild(fragment);
      range.insertNode(boldSpan);
    }
  }

    // Keep selection active
    saveSelection(range);
  currentHtml = iframeDoc.documentElement.outerHTML;
  return true;
}

function applyBiggerTextToSelection() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  const selectionData = restoreSelection();
  if (!iframeDoc || !selectionData) return false;
  const { selection, range } = selectionData;

  const container = range.commonAncestorContainer;
  const parentSize = findClosest(container, el => el.classList.contains('user-text-size'));

  if (parentSize) {
    const currentSize = parseFloat(parentSize.style.fontSize || '1');
    const nextSize = Math.min(currentSize + 0.1, 2.0);
    parentSize.style.setProperty('font-size', `${nextSize}em`, 'important');
  } else {
    const sizeSpan = iframeDoc.createElement('span');
    sizeSpan.className = 'user-text-size';
    sizeSpan.style.setProperty('font-size', '1.1em', 'important');
    try {
      range.surroundContents(sizeSpan);
    } catch (e) {
      const fragment = range.extractContents();
      sizeSpan.appendChild(fragment);
      range.insertNode(sizeSpan);
    }
  }

    // Keep selection active
    saveSelection(range);
  currentHtml = iframeDoc.documentElement.outerHTML;
  return true;
}

function applySmallerTextToSelection() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  const selectionData = restoreSelection();
  if (!iframeDoc || !selectionData) return false;
  const { selection, range } = selectionData;

  const container = range.commonAncestorContainer;
  const parentSize = findClosest(container, el => el.classList.contains('user-text-size'));

  if (parentSize) {
    const currentSize = parseFloat(parentSize.style.fontSize || '1');
    const nextSize = Math.max(currentSize - 0.1, 0.8);
    parentSize.style.setProperty('font-size', `${nextSize}em`, 'important');
  } else {
    const sizeSpan = iframeDoc.createElement('span');
    sizeSpan.className = 'user-text-size';
    sizeSpan.style.setProperty('font-size', '0.95em', 'important');
    try {
      range.surroundContents(sizeSpan);
    } catch (e) {
      const fragment = range.extractContents();
      sizeSpan.appendChild(fragment);
      range.insertNode(sizeSpan);
    }
  }

  saveSelection(range); // Keep selection active
  currentHtml = iframeDoc.documentElement.outerHTML;
  return true;
}

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
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '8px';
        li.style.borderRadius = '4px';
        li.style.transition = 'background 0.2s';
        
        const projectInfo = document.createElement('div');
        projectInfo.style.flex = '1';
        projectInfo.style.cursor = 'pointer';
        projectInfo.innerHTML = `📝 ${p.name}<br><span style="font-size:11px;color:#ccc;">${timestamp}</span>`;
        projectInfo.addEventListener('click', async () => {
          const r = await fetch(`/project/${p.id}`);
          const jd = await r.json();
          if (jd.project) {
            currentHtml = jd.project.html;
            originalHtml = jd.project.html;
            previewFrame.srcdoc = jd.project.html;
            
            // Initialize real-time style tag after a short delay
            setTimeout(() => initializeRealtimeStyleTag(), 100);
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

        projectInfo.addEventListener('mouseenter', () => {
          li.style.background = 'rgba(232, 122, 91, 0.1)';
        });
        projectInfo.addEventListener('mouseleave', () => {
          li.style.background = 'transparent';
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.style.opacity = '0.6';
        deleteBtn.style.transition = 'opacity 0.2s';
        deleteBtn.addEventListener('mouseenter', () => {
          deleteBtn.style.opacity = '1';
        });
        deleteBtn.addEventListener('mouseleave', () => {
          deleteBtn.style.opacity = '0.6';
        });
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Delete project "${p.name}"?`)) {
            try {
              const deleteRes = await fetch(`/project/${p.id}`, { method: 'DELETE' });
              if (deleteRes.ok) {
                statusEl.innerHTML = `<span class="status-icon">✅</span><span class="status-text">Project deleted!</span>`;
                statusEl.className = 'status-block status-success';
                fetchProjects();
              } else {
                statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">Failed to delete project</span>`;
                statusEl.className = 'status-block status-error';
              }
            } catch (err) {
              console.error('Delete error:', err);
              statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">Error deleting project</span>`;
              statusEl.className = 'status-block status-error';
            }
          }
        });

        li.appendChild(projectInfo);
        li.appendChild(deleteBtn);
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
  try {
    const res = await fetch('/upload', { 
      method: 'POST', 
      body: form
    });
    const json = await res.json();
    
    if (json.error) throw new Error(json.error);
    const html = json.html;
    if (!html) throw new Error('No HTML returned from server');
    
    currentHtml = html;
    previewFrame.srcdoc = html;
    originalHtml = html;
    
    // Initialize real-time style tag after a short delay to ensure iframe is ready
    setTimeout(() => initializeRealtimeStyleTag(), 100);
    
    // Display AI theme info if available
    let themeText = 'Custom AI Design';
    if (json.theme?.name) {
      themeText = `Custom: ${json.theme.name}`;
      currentTheme = json.theme;
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
  syncCurrentHtmlFromPreview();
  const html = currentHtml || previewFrame.srcdoc;
  if (!html) return alert('No preview available');
  statusEl.innerHTML = `<span class="status-icon">⏳</span><span class="status-text">Generating PDF...</span>`;
  statusEl.className = 'status-block status-info';
  try {
    const res = await fetch('/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }) });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Failed to generate PDF');
    }
    const blob = await res.blob();
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

function applyHighlightToSelection(useStoredSelection = false) {
  if (!currentHtml) {
    alert('Upload a document first!');
    return false;
  }

  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    const selectionData = useStoredSelection ? restoreSelection() : getSelectionRange(iframeDoc);
    if (!selectionData) {
      alert('Please select some text to highlight or remove highlight!');
      return false;
    }
    const { selection, range } = selectionData;

    // Check if selected text is already in a mark element
    const container = range.commonAncestorContainer;
    const parentMark = findClosest(container, el => el.tagName === 'MARK' || el.classList.contains('user-highlight'));

    if (parentMark) {
      unwrapElement(parentMark);

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
    return true;
  } catch (err) {
    console.error('Highlight error:', err);
    alert('Could not modify highlight. Try selecting simpler text.');
    return false;
  }
}

highlightBtn?.addEventListener('click', () => {
  applyHighlightToSelection(false);
});

function applyUnderlineToSelection(useStoredSelection = false) {
  if (!currentHtml) {
    alert('Upload a document first!');
    return false;
  }

  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    const selectionData = useStoredSelection ? restoreSelection() : getSelectionRange(iframeDoc);
    if (!selectionData) {
      alert('Please select some text to underline or remove underline!');
      return false;
    }
    const { selection, range } = selectionData;

    const container = range.commonAncestorContainer;
    const parentUnderline = findClosest(container, el => el.tagName === 'U' || el.classList.contains('user-underline'));

    if (parentUnderline) {
      unwrapElement(parentUnderline);
      statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Underline removed!</span>`;
      statusEl.className = 'status-block status-success';
    } else {
      const underline = iframeDoc.createElement('span');
      underline.className = 'user-underline';
      underline.style.setProperty('text-decoration', 'underline', 'important');
      underline.style.setProperty('text-decoration-color', selectedUnderlineColor, 'important');
      underline.style.setProperty('text-decoration-thickness', '2px', 'important');
      underline.style.setProperty('text-underline-offset', '2px', 'important');

      try {
        range.surroundContents(underline);
      } catch (e) {
        const fragment = range.extractContents();
        underline.appendChild(fragment);
        range.insertNode(underline);
      }

      statusEl.innerHTML = `<span class="status-icon">✏️</span><span class="status-text">Text underlined!</span>`;
      statusEl.className = 'status-block status-success';
    }

    selection.removeAllRanges();
    currentHtml = iframeDoc.documentElement.outerHTML;
    return true;
  } catch (err) {
    console.error('Underline error:', err);
    alert('Could not modify underline. Try selecting simpler text.');
    return false;
  }
}

underlineBtn?.addEventListener('click', () => {
  applyUnderlineToSelection(false);
});

function applyTextColorToSelection(useStoredSelection = false) {
  if (!currentHtml) {
    alert('Upload a document first!');
    return false;
  }

  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    const selectionData = useStoredSelection ? restoreSelection() : getSelectionRange(iframeDoc);
    if (!selectionData) {
      alert('Please select some text to change color!');
      return false;
    }
    const { selection, range } = selectionData;

    const container = range.commonAncestorContainer;
    const parentTextColor = findClosest(container, el => el.classList.contains('user-text-color'));

    if (parentTextColor) {
      parentTextColor.style.setProperty('color', selectedTextColor, 'important');
      statusEl.innerHTML = `<span class="status-icon">🎨</span><span class="status-text">Text color updated!</span>`;
      statusEl.className = 'status-block status-success';
    } else {
      const colorSpan = iframeDoc.createElement('span');
      colorSpan.className = 'user-text-color';
      colorSpan.style.setProperty('color', selectedTextColor, 'important');

      try {
        range.surroundContents(colorSpan);
      } catch (e) {
        const fragment = range.extractContents();
        colorSpan.appendChild(fragment);
        range.insertNode(colorSpan);
      }

      statusEl.innerHTML = `<span class="status-icon">🎨</span><span class="status-text">Text color applied!</span>`;
      statusEl.className = 'status-block status-success';
    }

    selection.removeAllRanges();
    currentHtml = iframeDoc.documentElement.outerHTML;
    return true;
  } catch (err) {
    console.error('Text color error:', err);
    alert('Could not change text color. Try selecting simpler text.');
    return false;
  }
}

textColorBtn?.addEventListener('click', () => {
  applyTextColorToSelection(false);
});

removeMarkupBtn.addEventListener('click', () => {
  if (!currentHtml) {
    alert('Upload a document first!');
    return;
  }

  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    const selectionData = getSelectionRange(iframeDoc);
    if (!selectionData) {
      alert('Please select some highlighted/underlined text to remove!');
      return;
    }
    const { selection, range } = selectionData;

    const container = range.commonAncestorContainer;
    const parentMark = findClosest(container, el => el.tagName === 'MARK' || el.classList.contains('user-highlight'));
    const parentUnderline = findClosest(container, el => el.tagName === 'U' || el.classList.contains('user-underline'));
    const parentAIHighlight = findClosest(container, el => el.classList.contains('ai-highlight'));

    if (!parentMark && !parentUnderline && !parentAIHighlight) {
      alert('No highlight or underline found in selection.');
      return;
    }

    if (parentMark) unwrapElement(parentMark);
    if (parentUnderline) unwrapElement(parentUnderline);
    if (parentAIHighlight) unwrapElement(parentAIHighlight);

    selection.removeAllRanges();
    currentHtml = iframeDoc.documentElement.outerHTML;

    statusEl.innerHTML = `<span class="status-icon">🧼</span><span class="status-text">Highlight/underline removed!</span>`;
    statusEl.className = 'status-block status-success';
  } catch (err) {
    console.error('Remove markup error:', err);
    alert('Could not remove highlight/underline. Try selecting simpler text.');
  }
});

saveProjectBtn.addEventListener('click', async () => {
  syncCurrentHtmlFromPreview();
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

window.addEventListener('DOMContentLoaded', () => {
  fetchProjects();
  loadThemesDropdown();
});

// Function to apply theme and preserve text styling
async function applyThemeToPreview(theme) {
  if (!originalHtml) {
    alert('Please upload a document first');
    return;
  }

  try {
    statusEl.innerHTML = `<span class="status-icon">🎨</span><span class="status-text">Applying theme: ${theme.name}...</span>`;
    statusEl.className = 'status-block status-info';

    currentTheme = theme;
    if (themeSelect && theme?.id) {
      themeSelect.value = theme.id;
    }
    
    // Update bold color to match theme's primary color
    customStyles.boldColor = theme.colors.primary;
    document.getElementById('boldTextColor').value = theme.colors.primary;
    
    // Apply theme to iframe without resetting srcdoc
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (iframeDoc) {
      // Find or create theme style tag
      let themeTag = iframeDoc.getElementById('theme-styles');
      if (!themeTag) {
        themeTag = iframeDoc.createElement('style');
        themeTag.id = 'theme-styles';
        iframeDoc.head.appendChild(themeTag);
      }

      // Ensure theme fonts are loaded inside iframe
      const fontsUrl = buildGoogleFontsUrl(theme.fonts);
      if (fontsUrl) {
        let fontsTag = iframeDoc.getElementById('theme-fonts');
        if (!fontsTag) {
          fontsTag = iframeDoc.createElement('link');
          fontsTag.id = 'theme-fonts';
          fontsTag.rel = 'stylesheet';
          iframeDoc.head.appendChild(fontsTag);
        }
        fontsTag.href = fontsUrl;
      }

      // Apply theme CSS
      themeTag.innerHTML = getThemeStyles(theme);
      
      // Also apply text styling to make sure it persists
      applyCustomStylesRealtime();
    }

    statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Theme applied: <strong>${theme.name}</strong></span>`;
    statusEl.className = 'status-block status-success';
  } catch (err) {
    console.error('Theme application error:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
}

// Function to get theme CSS without style tags
function getThemeStyles(theme) {
  return `
    :root {
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-accent: ${theme.colors.accent};
      --theme-highlight: ${theme.colors.highlight};
      --theme-background: ${theme.colors.background};
      --theme-text: ${theme.colors.text};
      --font-header: ${theme.fonts.header};
      --font-body: ${theme.fonts.body};
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-header) !important;
      color: var(--theme-primary) !important;
    }

    body {
      background-color: var(--theme-background) !important;
      color: var(--theme-text) !important;
      font-family: var(--font-body) !important;
    }

    .note-page {
      background: white !important;
      color: var(--theme-text) !important;
    }

    h1 {
      border-bottom-color: var(--theme-accent) !important;
    }

    h2 {
      border-left-color: var(--theme-secondary) !important;
    }

    .ai-highlight {
      background: var(--theme-highlight) !important;
      color: var(--theme-text) !important;
    }

    mark, .highlight, .user-highlight {
      background: var(--theme-highlight) !important;
      color: var(--theme-text) !important;
    }

    strong, b {
      color: var(--theme-primary) !important;
    }

    em, i {
      color: var(--theme-secondary) !important;
    }

    ul li::before {
      color: var(--theme-primary) !important;
    }
  `;
}

// Old function to apply theme CSS into HTML (kept for first load)
function applyThemeToHtml(html, theme) {
  const themeCss = `
    <style>
      :root {
        --theme-primary: ${theme.colors.primary};
        --theme-secondary: ${theme.colors.secondary};
        --theme-accent: ${theme.colors.accent};
        --theme-highlight: ${theme.colors.highlight};
        --theme-background: ${theme.colors.background};
        --theme-text: ${theme.colors.text};
        --font-header: ${theme.fonts.header};
        --font-body: ${theme.fonts.body};
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-header) !important;
        color: var(--theme-primary) !important;
      }

      body {
        background-color: var(--theme-background) !important;
        color: var(--theme-text) !important;
        font-family: var(--font-body) !important;
      }

      .note-page {
        background: white !important;
        color: var(--theme-text) !important;
      }

      h1 {
        border-bottom-color: var(--theme-accent) !important;
      }

      h2 {
        border-left-color: var(--theme-secondary) !important;
      }

      .ai-highlight {
        background: var(--theme-highlight) !important;
        color: var(--theme-text) !important;
      }

      mark, .highlight, .user-highlight {
        background: var(--theme-highlight) !important;
        color: var(--theme-text) !important;
      }

      strong, b {
        color: var(--theme-primary) !important;
      }

      em, i {
        color: var(--theme-secondary) !important;
      }

      ul li::before {
        color: var(--theme-primary) !important;
      }
    </style>
  `;

  // Insert theme CSS into the head
  if (html.includes('</head>')) {
    return html.replace('</head>', themeCss + '</head>');
  } else if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + themeCss);
  } else {
    return themeCss + html;
  }
}

// Theme select dropdown change event
themeSelect.addEventListener('change', async (e) => {
  const themeId = e.target.value;
  if (!themeId || !originalHtml) return;

  try {
    const res = await fetch(`/theme/${themeId}`);
    if (!res.ok) throw new Error('Failed to load theme');
    
    const theme = await res.json();
    applyThemeToPreview(theme);
  } catch (err) {
    console.error('Error loading theme:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
});

// Load themes into dropdown on page load
async function loadThemesDropdown() {
  try {
    const res = await fetch('/themes');
    if (!res.ok) throw new Error('Failed to load themes');
    
    const { themes } = await res.json();
    
    // Clear existing options
    themeSelect.innerHTML = '<option value="">Select a theme...</option>';
    
    // Add theme options
    themes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading themes dropdown:', err);
  }
}

// Style Customization Event Listeners - Real-time preview
document.getElementById('fontSizeSlider')?.addEventListener('input', (e) => {
  const value = e.target.value;
  document.getElementById('fontSizeValue').textContent = value + '%';
  
  // Real-time update
  customStyles.fontSize = parseInt(value);
  applyCustomStylesRealtime();
});

document.getElementById('lineSpacingSlider')?.addEventListener('input', (e) => {
  const value = e.target.value;
  document.getElementById('lineSpacingValue').textContent = value;
  
  // Real-time update
  customStyles.lineSpacing = parseFloat(value);
  applyCustomStylesRealtime();
});

document.getElementById('shadowSlider')?.addEventListener('input', (e) => {
  const value = e.target.value;
  document.getElementById('shadowValue').textContent = value + 'px';
  
  // Real-time update
  customStyles.shadowBlur = parseFloat(value);
  applyCustomStylesRealtime();
});

// Color pickers also update in real-time
document.getElementById('boldTextColor')?.addEventListener('input', (e) => {
  customStyles.boldColor = e.target.value;
  applyCustomStylesRealtime();
});

document.getElementById('aiHighlightColor')?.addEventListener('input', (e) => {
  customStyles.aiHighlightColor = e.target.value;
  applyCustomStylesRealtime();
});

document.getElementById('applyStylesBtn')?.addEventListener('click', () => {
  // Get current style values (redundant but kept for UX)
  customStyles.fontSize = parseInt(document.getElementById('fontSizeSlider').value);
  customStyles.lineSpacing = parseFloat(document.getElementById('lineSpacingSlider').value);
  customStyles.boldColor = document.getElementById('boldTextColor').value;
  customStyles.aiHighlightColor = document.getElementById('aiHighlightColor').value;
  customStyles.shadowBlur = parseFloat(document.getElementById('shadowSlider').value);
  
  applyCustomStyles();
});

// Function to apply custom colors to preview
// Helper function to initialize real-time style tag in iframe
function initializeRealtimeStyleTag() {
  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!iframeDoc) return;
    
    // Check if style tag already exists
    let styleTag = iframeDoc.getElementById('realtime-styles');
    if (!styleTag) {
      styleTag = iframeDoc.createElement('style');
      styleTag.id = 'realtime-styles';
      iframeDoc.head.appendChild(styleTag);
    }

    attachSelectionPopupHandlers();
  } catch (err) {
    console.error('Error initializing real-time style tag:', err);
  }
}

// Function to apply custom styles in real-time (without status messages)
function applyCustomStylesRealtime() {
  if (!originalHtml && !currentHtml) return;

  try {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!iframeDoc) return;

    const stylesCss = `
      body {
        font-size: ${customStyles.fontSize}% !important;
        line-height: ${customStyles.lineSpacing} !important;
      }

      p, li, span, div {
        line-height: ${customStyles.lineSpacing} !important;
      }

      strong, b {
        color: ${customStyles.boldColor} !important;
        font-weight: 700 !important;
      }

      .ai-highlight {
        background: ${customStyles.aiHighlightColor} !important;
        box-shadow: 0 ${customStyles.shadowBlur}px ${customStyles.shadowBlur * 2}px rgba(0, 0, 0, 0.1) !important;
      }

      mark, .highlight, .user-highlight {
        box-shadow: 0 ${customStyles.shadowBlur}px ${customStyles.shadowBlur * 2}px rgba(0, 0, 0, 0.1) !important;
      }
    `;

    // Find or create style tag for real-time styles
    let styleTag = iframeDoc.getElementById('realtime-styles');
    if (!styleTag) {
      styleTag = iframeDoc.createElement('style');
      styleTag.id = 'realtime-styles';
      iframeDoc.head.appendChild(styleTag);
    }

    // Update only the style tag content
    styleTag.innerHTML = stylesCss;
  } catch (err) {
    console.error('Error applying real-time styles:', err);
  }
}

// Function to apply custom styles to preview
function applyCustomStyles() {
  if (!originalHtml) {
    alert('Please upload a document first');
    return;
  }

  try {
    statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Applying styles...</span>`;
    statusEl.className = 'status-block status-info';

    const stylesCss = `
      <style>
        body {
          font-size: ${customStyles.fontSize}% !important;
          line-height: ${customStyles.lineSpacing} !important;
        }

        p, li, span, div {
          line-height: ${customStyles.lineSpacing} !important;
        }

        strong, b {
          color: ${customStyles.boldColor} !important;
          font-weight: 700 !important;
        }

        mark, .highlight, .user-highlight {
          box-shadow: 0 ${customStyles.shadowBlur}px ${customStyles.shadowBlur * 2}px rgba(0, 0, 0, 0.1) !important;
        }

        .ai-highlight {
          box-shadow: 0 ${customStyles.shadowBlur}px ${customStyles.shadowBlur * 2}px rgba(0, 0, 0, 0.1) !important;
        }
      </style>
    `;

    // Apply custom theme colors first, then custom styles
    const themedHtml = currentHtml || originalHtml;
    let finalHtml = themedHtml;

    // Add styles to head
    if (finalHtml.includes('</head>')) {
      finalHtml = finalHtml.replace('</head>', stylesCss + '</head>');
    } else if (finalHtml.includes('<head>')) {
      finalHtml = finalHtml.replace('<head>', '<head>' + stylesCss);
    } else {
      finalHtml = stylesCss + finalHtml;
    }

    currentHtml = finalHtml;
    previewFrame.srcdoc = finalHtml;
    
    // Re-attach selection handlers after iframe reload
    previewFrame.onload = () => {
      attachSelectionPopupHandlers();
      previewFrame.onload = null; // Clean up
    };

    statusEl.innerHTML = `<span class="status-icon">✨</span><span class="status-text">Styles applied!</span>`;
    statusEl.className = 'status-block status-success';
  } catch (err) {
    console.error('Error applying styles:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
}

// Random Theme Button
randomThemeBtn.addEventListener('click', async () => {
  if (!originalHtml) {
    alert('Please upload a document first');
    return;
  }

  statusEl.innerHTML = `<span class="status-icon">🎲</span><span class="status-text">Generating random theme...</span>`;
  statusEl.className = 'status-block status-info';

  try {
    const res = await fetch('/random-theme');
    if (!res.ok) throw new Error('Failed to generate random theme');
    
    const theme = await res.json();
    theme.fonts = getHandmadeFontForTheme(theme);
    applyThemeToPreview(theme);
  } catch (err) {
    console.error('Random theme error:', err);
    statusEl.innerHTML = `<span class="status-icon">❌</span><span class="status-text">${err.message}</span>`;
    statusEl.className = 'status-block status-error';
  }
});
