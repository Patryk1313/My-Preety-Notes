// theme-engine.js
// Load themes from themes.json and generate CSS dynamically

async function loadThemes() {
  try {
    const res = await fetch('./themes.json');
    const data = await res.json();
    return data.themes || {};
  } catch (e) {
    console.warn('Could not load themes.json:', e);
    return {};
  }
}

function generateThemeCSS(theme) {
  if (!theme || !theme.colors) return '';
  const c = theme.colors;
  return `
    body {
      background: ${c.bodyBg || '#fff'};
    }
    .note-page {
      background: ${c.background};
    }
    .note-header {
      color: ${c.headerText};
      font-family: ${theme.fonts?.header || "'Pacifico', cursive"};
    }
    .decor-header {
      color: ${c.decorHeader};
    }
    .sub-header {
      color: ${c.decorHeader};
    }
    .sticker {
      background: ${c.sticker};
    }
    .btn-primary {
      background: ${c.accent};
    }
    .btn-primary:hover {
      background: ${c.decorHeader};
    }
    .section-block {
      background: ${c.background}22;
    }
  `;
}

function applyTheme(themeName, themesData) {
  const theme = themesData[themeName];
  if (!theme) return;
  
  const css = generateThemeCSS(theme);
  let styleEl = document.getElementById('theme-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
  
  // Also apply to iframe if preview exists
  const previewFrame = document.getElementById('previewFrame');
  if (previewFrame && previewFrame.srcdoc) {
    const html = previewFrame.srcdoc;
    const themeStyleTag = `<style id="frame-theme">${css}</style>`;
    const newHtml = html.replace(/<style id="frame-theme">.*?<\/style>/s, themeStyleTag)
                        .replace('</head>', themeStyleTag + '</head>');
    previewFrame.srcdoc = newHtml;
  }
}

async function initThemeSystem() {
  window.themesData = await loadThemes();
  
  // Populate theme select
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect && window.themesData) {
    themeSelect.innerHTML = '';
    Object.entries(window.themesData).forEach(([key, theme]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${theme.name || key} - ${theme.description || ''}`;
      themeSelect.appendChild(option);
    });
    
    // Apply default theme
    applyTheme('default', window.themesData);
    
    // Listen for changes
    themeSelect.addEventListener('change', (e) => {
      applyTheme(e.target.value, window.themesData);
    });
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeSystem);
} else {
  initThemeSystem();
}
