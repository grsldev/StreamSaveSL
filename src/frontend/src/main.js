import './style.css';
import { StartDownload, CancelDownload, LoadConfig, SaveConfig, LoadHistory, ClearHistory, ChooseOutputDir, GetAvailableQualities } from '../wailsjs/go/main/App';

// === State ===
let config = {
  audio_only: false,
  video_format: 'mp4',
  audio_format: 'mp3',
  dark_theme: true,
  output_dir: '',
  language: 'en',
  save_history: true,
  quality: 'best'
};

let downloading = false;
let currentPage = 'home';
let currentURL = '';
let currentStatus = '';

// === i18n ===
const i18n = {
  en: {
    title: 'Stream Save SL',
    urlPlaceholder: 'Paste video URL here...',
    download: 'Download',
    download_again: 'Download again',
    cancel: 'Cancel',
    audioOnly: 'Audio only',
    videoFormat: 'Video format',
    audioFormat: 'Audio format',
    quality: 'Quality',
    outputDir: 'Save to',
    change: 'Change',
    preparing: 'Preparing...',
    downloading: 'Downloading...',
    cancelling: 'Cancelling...',
    status_video: 'Downloading video...',
    status_audio: 'Downloading audio...',
    status_merging: 'Merging...',
    status_converting: 'Converting...',
    done: 'Download complete!',
    cancelled: 'Download cancelled.',
    error: 'Download error.',
    error_ytdlp: 'yt-dlp not found in bin/',
    error_ffmpeg: 'ffmpeg not found in bin/',
    missing_bin_title: 'Missing required file',
    missing_bin_close: 'Got it',
    missing_bin_tree: 'Expected folder structure:',
    nav_home: 'Download',
    nav_history: 'History',
    nav_settings: 'Settings',
    history_empty: 'No downloads yet.',
    history_clear: 'Clear history',
    settings_theme: 'Dark theme',
    settings_lang: 'Language',
    settings_save_history: 'Save history',
    settings_no_playlist: 'Never download playlists',
    urlRequired: 'Please enter a URL.',
    fetchQualities: 'Fetch qualities',
    fetching: 'Fetching...',
  },
  pt: {
    title: 'Stream Save SL',
    urlPlaceholder: 'Cole a URL do vídeo aqui...',
    download: 'Baixar',
    download_again: 'Baixar novamente',
    cancel: 'Cancelar',
    audioOnly: 'Somente áudio',
    videoFormat: 'Formato do vídeo',
    audioFormat: 'Formato do áudio',
    quality: 'Qualidade',
    outputDir: 'Salvar em',
    change: 'Mudar',
    preparing: 'Preparando...',
    downloading: 'Baixando...',
    cancelling: 'Cancelando...',
    status_video: 'Baixando vídeo...',
    status_audio: 'Baixando áudio...',
    status_merging: 'Mesclando...',
    status_converting: 'Convertendo...',
    done: 'Download concluído!',
    cancelled: 'Download cancelado.',
    error: 'Erro no download.',
    error_ytdlp: 'yt-dlp não encontrado em bin/',
    error_ffmpeg: 'ffmpeg não encontrado em bin/',
    missing_bin_title: 'Arquivo necessário não encontrado',
    missing_bin_close: 'Entendi',
    missing_bin_tree: 'Estrutura de pastas esperada:',
    nav_home: 'Download',
    nav_history: 'Histórico',
    nav_settings: 'Configurações',
    history_empty: 'Nenhum download ainda.',
    history_clear: 'Limpar histórico',
    settings_theme: 'Tema escuro',
    settings_lang: 'Idioma',
    settings_save_history: 'Salvar histórico',
    settings_no_playlist: 'Nunca baixar playlists',
    urlRequired: 'Por favor, insira uma URL.',
    fetchQualities: 'Buscar qualidades',
    fetching: 'Buscando...',
  }
};

function t(key) {
  return i18n[config.language]?.[key] || i18n['en'][key] || key;
}

// === DMC Easter Egg ===
function getDMCMessage(url, title) {
  const text = (url + ' ' + title).toLowerCase();

  const triggers = [
    { match: 'every', keys: ['bury the light'],       msg: '⚔️ "Even if I must reside in darkness..."' },
    { match: 'every', keys: ['storm', 'approaching'], msg: '🌩️ A storm is approaching... and so is your file.' },
    { match: 'every', keys: ['dante', 'vergil'],      msg: '🔴🔵 Two sons of Sparda... one download.' },
    { match: 'every', keys: ['devil trigger'],        msg: '😈 Devil Trigger activated. Download unleashed.' },
    { match: 'every', keys: ['vergil'],               msg: '⚔️ Are you motivated?' },
    { match: 'every', keys: ['dante'],                msg: '🍕 "I should have been the one to fill your dark soul with LIIIGHT!"' },
    { match: 'every', keys: ['nero'],                 msg: '🦾 Deadweight no more.' },
    { match: 'every', keys: ['urizen'],               msg: '👁️ Absolute power... absolutely downloaded.' },
    { match: 'every', keys: ['sanctus'],              msg: '😐 Not quite the Savior.' },
    { match: 'every', keys: ['devil may cry'],        msg: '😈 Devils never cry... but they do download.' },
    { match: 'some',  keys: ['dmc5', 'dmc 5'],        msg: '🎮 SSS Rank. No continues needed.' },
    { match: 'every', keys: ['motivated'],            msg: '⚔️ Power obtained. Are you motivated?' },
    { match: 'every', keys: ['jackpot'],              msg: '🔫 JACKPOT!' },
  ];

  for (const trigger of triggers) {
    const fn = trigger.match === 'some' ? 'some' : 'every';
    if (trigger.keys[fn](k => text.includes(k))) {
      return trigger.msg;
    }
  }

  return null;
}

// === Events from Go ===
window.runtime.EventsOn('download:started', () => {
  if (!downloading) return;
  currentStatus = 'preparing';
  setStatus(t('preparing'), false);
});

window.runtime.EventsOn('download:status', (status) => {
  if (status === 'video') {
    currentStatus = 'video';
    setStatus(t('status_video'), false);
    setProgress(0);
  } else if (status === 'audio') {
    currentStatus = 'audio';
    setStatus(t('status_audio'), false);
    setProgress(0);
  } else if (status === 'merging') {
    currentStatus = 'merging';
    setStatus(t('status_merging'), false);
  } else if (status === 'converting') {
    currentStatus = 'converting';
    setStatus(t('status_converting'), false);
  }
});

window.runtime.EventsOn('download:progress', (pct) => {
  if (!downloading) return;
  setProgress(pct);
  if (currentStatus === 'preparing') {
    currentStatus = 'downloading';
    setStatus(t('downloading'), false);
  }
});

window.runtime.EventsOn('download:done', (data) => {
  setProgress(100);
  currentStatus = '';
  const title = (data.title || '').toLowerCase();
  const url = currentURL.toLowerCase();
  const dmcMsg = getDMCMessage(url, title);

  setStatus(dmcMsg ? `${t('done')} ${dmcMsg}` : t('done'), false);
  downloading = false;
  updateDownloadBtn();

  LoadHistory().then(h => {
    window._history = h;
    if (currentPage === 'history') render();
  });

  setTimeout(() => { setProgress(0); setStatus('', false); }, dmcMsg ? 6000 : 3000);
});

window.runtime.EventsOn('download:cancelled', () => {
  setProgress(0);
  currentStatus = '';
  setStatus(t('cancelled'), false);
  downloading = false;
  updateDownloadBtn();
  setTimeout(() => setStatus('', false), 2500);
});

window.runtime.EventsOn('download:error', (msg) => {
  setProgress(0);
  currentStatus = '';
  if (msg.includes('yt-dlp not found') || msg.includes('ffmpeg not found')) {
    window._missingBin = msg.includes('yt-dlp not found') ? '⚠️ ' + t('error_ytdlp') : '⚠️ ' + t('error_ffmpeg');
    render();
  } else {
    setStatus('⚠️ ' + t('error'), true);
    setTimeout(() => setStatus('', false), 4000);
  }
  downloading = false;
  updateDownloadBtn();
});

// === Render ===
function render() {
  const appRoot = document.getElementById('app-root');
  if (appRoot) {
    appRoot.className = `app ${config.dark_theme ? 'dark' : 'light'}`;
  }

  document.getElementById('content').innerHTML = `
    <nav class="nav">
      <button class="nav-btn ${currentPage === 'home' ? 'active' : ''}" onclick="navigate('home')">
        ${svgDownload()} <span>${t('nav_home')}</span>
      </button>
      <button class="nav-btn ${currentPage === 'history' ? 'active' : ''}" onclick="navigate('history')">
        ${svgHistory()} <span>${t('nav_history')}</span>
      </button>
      <button class="nav-btn ${currentPage === 'settings' ? 'active' : ''}" onclick="navigate('settings')">
        ${svgSettings()} <span>${t('nav_settings')}</span>
      </button>
    </nav>
    <main class="main">
      ${currentPage === 'home' ? renderHome() : ''}
      ${currentPage === 'history' ? renderHistory() : ''}
      ${currentPage === 'settings' ? renderSettings() : ''}
    </main>
    <footer class="footer">Built by Gabriel Rodrigues</footer>
    ${window._missingBin ? `
      <div class="modal-overlay" onclick="if(event.target===this) closeMissingModal()">
        <div class="modal">
          <div class="modal-title">${window._missingBin}</div>
          <div class="modal-desc">${t('missing_bin_tree')}</div>
          <div class="modal-tree">
            <div class="tree-folder">YourFolder/</div>
            <div class="tree-children">
              <div class="tree-file">StreamSaveSL.exe</div>
              <div class="tree-folder">bin/</div>
              <div class="tree-children">
                <div class="tree-file">yt-dlp.exe</div>
                <div class="tree-file">ffmpeg.exe</div>
              </div>
            </div>
          </div>
          <button class="modal-close" onclick="closeMissingModal()">${t('missing_bin_close')}</button>
        </div>
      </div>
    ` : ''}
  `;

  attachEvents();
}

function renderHome() {
  return `
    <div class="page home-page">
      <div class="field">
        <input id="url-input" class="url-input" type="text" placeholder="${t('urlPlaceholder')}" />
      </div>
      <div class="row">
        <label class="toggle-label">
          <span>${t('audioOnly')}</span>
          <div class="toggle ${config.audio_only ? 'on' : ''}" id="audio-toggle" onclick="toggleAudio()"></div>
        </label>
        <button class="btn-sm" id="fetch-qualities-btn" onclick="fetchQualities()">${t('fetchQualities')}</button>
      </div>
      <div class="fields-grid">
        <div class="field-group ${config.audio_only ? 'disabled' : ''}">
          <label>${t('videoFormat')}</label>
          <select id="video-format" ${config.audio_only ? 'disabled' : ''} onchange="saveFormat('video_format', this.value)">
            ${['mp4','mkv','webm'].map(f => `<option ${config.video_format === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="field-group ${config.audio_only ? 'disabled' : ''}">
          <label>${t('quality')}</label>
          <select id="quality-select" ${config.audio_only ? 'disabled' : ''} onchange="saveFormat('quality', this.value)">
            ${renderQualityOptions()}
          </select>
        </div>
        <div class="field-group ${!config.audio_only ? 'disabled' : ''}">
          <label>${t('audioFormat')}</label>
          <select id="audio-format" ${!config.audio_only ? 'disabled' : ''} onchange="saveFormat('audio_format', this.value)">
            ${['mp3','opus','wav','aac','flac','m4a'].map(f => `<option ${config.audio_format === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="field-group output-group">
          <label>${t('outputDir')}</label>
          <div class="output-row">
            <span class="output-path" title="${config.output_dir}">${config.output_dir}</span>
            <button class="btn-sm" onclick="chooseDir()">${t('change')}</button>
          </div>
        </div>
      </div>
      <div class="progress-area" id="progress-area">
        <div class="progress-track">
          <div class="progress-fill" id="progress-fill" style="width:0%"></div>
        </div>
        <span class="progress-pct" id="progress-pct">0%</span>
      </div>
      <div class="status-row">
        <span class="status-text" id="status-text"></span>
      </div>
      <button class="btn-download ${downloading ? 'danger' : 'success'}" id="download-btn" onclick="handleDownload()">
        ${downloading ? t('cancel') : t('download')}
      </button>
    </div>
  `;
}

function renderQualityOptions() {
  const opts = window._qualities || ['best', '1080', '720', '480', '360'];
  return opts.map(q => `<option value="${q}" ${config.quality === q ? 'selected' : ''}>${q === 'best' ? 'Best' : q + 'p'}</option>`).join('');
}

function renderHistory() {
  const entries = window._history || [];
  return `
    <div class="page history-page">
      <div class="history-header">
        <button class="btn-sm danger" onclick="clearHistory()">${t('history_clear')}</button>
      </div>
      ${entries.length === 0
        ? `<div class="empty">${t('history_empty')}</div>`
        : entries.map((e, i) => `
          <div class="history-item">
            <div class="history-title">${e.title || e.url}</div>
            <div class="history-meta">
              ${e.format.toUpperCase()} · ${e.audio_only ? '🎵' : '🎬'} · ${e.date}${e.duration ? ' · ' + e.duration : ''}
            </div>
            <div class="history-actions">
              <span class="history-url">${e.url}</span>
              <button class="btn-sm" onclick="redownload(${i})">${t('download_again')}</button>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="page settings-page">
      <div class="setting-item">
        <span>${t('settings_theme')}</span>
        <div class="toggle ${config.dark_theme ? 'on' : ''}" onclick="toggleSetting('dark_theme')"></div>
      </div>
      <div class="setting-item">
        <span>${t('settings_save_history')}</span>
        <div class="toggle ${config.save_history ? 'on' : ''}" onclick="toggleSetting('save_history')"></div>
      </div>
      <div class="setting-item">
        <span>${t('settings_no_playlist')}</span>
        <div class="toggle ${config.no_playlist ? 'on' : ''}" onclick="toggleSetting('no_playlist')"></div>
      </div>
      <div class="setting-item">
        <span>${t('settings_lang')}</span>
        <select id="lang-select" onchange="changeLang(this.value)">
          <option value="en" ${config.language === 'en' ? 'selected' : ''}>English</option>
          <option value="pt" ${config.language === 'pt' ? 'selected' : ''}>Português</option>
        </select>
      </div>
    </div>
  `;
}

// === Actions ===
window.navigate = function(page) {
  if (page === 'history') {
    LoadHistory().then(h => { window._history = h; currentPage = page; render(); });
  } else {
    currentPage = page;
    render();
  }
};

window.toggleAudio = function() {
  config.audio_only = !config.audio_only;
  SaveConfig(config);
  render();
};

window.toggleSetting = function(key) {
  config[key] = !config[key];
  SaveConfig(config);
  render();
};

window.changeLang = function(lang) {
  config.language = lang;
  SaveConfig(config);
  render();
};

window.chooseDir = async function() {
  const dir = await ChooseOutputDir(config.output_dir);
  if (dir) {
    config.output_dir = dir;
    SaveConfig(config);
    render();
  }
};

window.saveFormat = async function(key, value) {
  config[key] = value;
  await SaveConfig(config);
};

window.fetchQualities = async function() {
  const url = document.getElementById('url-input')?.value?.trim();
  if (!url) return;
  const btn = document.getElementById('fetch-qualities-btn');
  if (btn) btn.textContent = t('fetching');
  const qs = await GetAvailableQualities(url);
  window._qualities = qs;
  render();
};

window.clearHistory = async function() {
  await ClearHistory();
  window._history = [];
  render();
};

window.closeMissingModal = function() {
  window._missingBin = null;
  render();
};

window.handleDownload = async function() {
  if (downloading) {
    CancelDownload();
    setStatus(t('cancelling'), false);
    document.getElementById('download-btn').disabled = true;
    return;
  }

  const url = document.getElementById('url-input')?.value?.trim();
  if (!url) {
    setStatus(t('urlRequired'), true);
    setTimeout(() => setStatus('', false), 4000);
    return;
  }

  const videoFormat = document.getElementById('video-format')?.value || config.video_format;
  const audioFormat = document.getElementById('audio-format')?.value || config.audio_format;
  const quality = document.getElementById('quality-select')?.value || config.quality;

  config.video_format = videoFormat;
  config.audio_format = audioFormat;
  config.quality = quality;
  SaveConfig(config);

  downloading = true;
  currentStatus = '';
  updateDownloadBtn();
  setProgress(0);

  StartDownload({
    url,
    audio_only: config.audio_only,
    no_playlist: config.no_playlist,
    format: config.audio_only ? audioFormat : videoFormat,
    quality,
    output_dir: config.output_dir
  });
};

window.redownload = function(index) {
  const entry = (window._history || [])[index];
  if (!entry) return;
  currentURL = entry.url;
  config.audio_only = entry.audio_only;
  config.video_format = entry.audio_only ? config.video_format : entry.format;
  config.audio_format = entry.audio_only ? entry.format : config.audio_format;
  SaveConfig(config);
  navigate('home');
  setTimeout(() => {
    const input = document.getElementById('url-input');
    if (input) input.value = currentURL;
  }, 50);
};

function updateDownloadBtn() {
  const btn = document.getElementById('download-btn');
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = downloading ? t('cancel') : t('download');
  btn.className = `btn-download ${downloading ? 'danger' : 'success'}`;
}

function setProgress(pct) {
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-pct');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = pct.toFixed(1) + '%';
}

function setStatus(msg, isError) {
  const el = document.getElementById('status-text');
  if (el) {
    el.textContent = msg;
    el.className = 'status-text' + (isError ? ' error' : '');
  }
}

function attachEvents() {
  const urlInput = document.getElementById('url-input');
  if (urlInput) {
    urlInput.value = currentURL;
    urlInput.addEventListener('input', e => currentURL = e.target.value);
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') window.handleDownload();
    });
  }
}

// === SVGs ===
function svgDownload() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
}
function svgHistory() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
}
function svgSettings() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}

// === CSS ===
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; user-select: none; }

  .app { display: flex; flex-direction: column; height: 100vh; transition: background 0.3s, color 0.3s; }
  #content { display: flex; flex-direction: column; flex: 1; }
  .dark { background: #080810; color: #dde0e8; }
  .light { background: #f0f0f5; color: #12121e; }

  .header { padding: 10px 20px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .light .header { border-bottom-color: rgba(0,0,0,0.08); }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-sss { font-size: 24px; font-weight: 900; letter-spacing: 1px; background: linear-gradient(135deg, #c1121f, #e63946, #ff6b6b, #e63946); background-size: 300% 300%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: sss-shimmer 4s ease infinite; }
  @keyframes sss-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  .logo-name { font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.5; }

  .nav { display: flex; padding: 0 12px; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .light .nav { border-bottom-color: rgba(0,0,0,0.07); }
  .nav-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 14px 8px 12px; background: none; border: none; cursor: pointer; color: inherit; opacity: 0.4; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; border-bottom: 2px solid transparent; transition: all 0.2s; margin-bottom: -1px; text-transform: uppercase; }
  .nav-btn:hover { opacity: 0.7; }
  .nav-btn.active { opacity: 1; border-bottom-color: #e63946; color: #e63946; }

  .main { flex: 1; overflow-y: auto; padding: 14px 20px; }
  .main::-webkit-scrollbar { width: 3px; }
  .main::-webkit-scrollbar-thumb { background: rgba(230,57,70,0.3); border-radius: 2px; }

  .page { display: flex; flex-direction: column; gap: 14px; }

  .url-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; outline: none; transition: border 0.2s, box-shadow 0.2s; }
  .dark .url-input { background: #0e0e18; color: #dde0e8; }
  .light .url-input { background: #fff; color: #12121e; border-color: rgba(0,0,0,0.1); }
  .url-input:focus { border-color: #e63946; box-shadow: 0 0 0 2px rgba(230,57,70,0.1); }

  .row { display: flex; align-items: center; justify-content: space-between; }
  .toggle-label { display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; }
  .toggle { width: 38px; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.08); position: relative; cursor: pointer; transition: background 0.2s; }
  .light .toggle { background: rgba(0,0,0,0.1); }
  .toggle.on { background: #e63946; }
  .toggle::after { content: ''; position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .toggle.on::after { left: 21px; }

  .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .output-group { grid-column: 1 / -1; }
  .field-group { display: flex; flex-direction: column; gap: 4px; }
  .field-group.disabled { opacity: 0.3; pointer-events: none; }
  .field-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; }
  .field-group select { padding: 7px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; outline: none; cursor: pointer; transition: border 0.2s; }
  .field-group select:focus { border-color: rgba(230,57,70,0.5); }
  .dark select { background: #0e0e18; color: #dde0e8; }
  .light select { background: #fff; color: #12121e; border-color: rgba(0,0,0,0.1); }

  .output-row { display: flex; align-items: center; gap: 8px; }
  .output-path { font-size: 12px; opacity: 0.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

  .btn-sm { padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: inherit; font-size: 12px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .light .btn-sm { border-color: rgba(0,0,0,0.1); background: rgba(0,0,0,0.03); }
  .btn-sm:hover { background: rgba(255,255,255,0.08); }
  .btn-sm.danger { border-color: #e63946; color: #e63946; }

  .progress-area { display: flex; align-items: center; gap: 10px; }
  .progress-track { flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .light .progress-track { background: rgba(0,0,0,0.06); }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #c1121f, #e63946, #ff6b6b); border-radius: 2px; transition: width 0.3s ease; }
  .progress-pct { font-size: 11px; opacity: 0.5; min-width: 38px; text-align: right; font-variant-numeric: tabular-nums; }

  .status-row { min-height: 18px; }
  .status-text { font-size: 12px; opacity: 0.55; font-style: italic; }
  .status-text.error { color: #e63946; opacity: 1; }

  .btn-download { width: 100%; padding: 12px; border-radius: 8px; border: none; font-size: 13px; font-weight: 800; cursor: pointer; letter-spacing: 2px; transition: all 0.2s; text-transform: uppercase; }
  .btn-download.success { background: linear-gradient(135deg, #e63946, #c1121f); color: white; box-shadow: 0 4px 15px rgba(230,57,70,0.25); }
  .btn-download.danger { background: rgba(230,57,70,0.08); color: #e63946; border: 1px solid rgba(230,57,70,0.4); }
  .btn-download:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-download:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

  .history-header { display: flex; justify-content: flex-end; }
  .history-item { padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); transition: border 0.2s; }
  .history-item:hover { border-color: rgba(255,255,255,0.12); }
  .light .history-item { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.07); }
  .history-title { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .history-meta { font-size: 11px; opacity: 0.4; margin-top: 2px; }
  .history-url { font-size: 11px; opacity: 0.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  .empty { text-align: center; opacity: 0.3; font-size: 13px; padding: 40px 0; }
  .history-actions { margin-top: 4px; display: flex; align-items: center; gap: 8px; }

  .settings-page { gap: 0; }
  .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
  .light .setting-item { border-bottom-color: rgba(0,0,0,0.06); }
  .setting-item select { padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; outline: none; }
  .dark .setting-item select { background: #0e0e18; color: #dde0e8; }
  .light .setting-item select { background: #fff; color: #12121e; border-color: rgba(0,0,0,0.1); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: #0e0e18; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; width: 360px; }
  .light .modal { background: #fff; border-color: rgba(230,57,70,0.2); }
  .modal-title { font-size: 14px; font-weight: 600; color: #e63946; margin-bottom: 12px; }
  .modal-desc { font-size: 12px; opacity: 0.5; margin-bottom: 6px; }
  .modal-tree { background: rgba(255,255,255,0.03); border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; line-height: 2; border: 1px solid rgba(255,255,255,0.05); }
  .light .modal-tree { background: rgba(0,0,0,0.03); }
  .tree-folder { opacity: 0.9; font-weight: 600; }
  .tree-folder::before { content: '📁 '; }
  .tree-file { opacity: 0.6; }
  .tree-file::before { content: '📄 '; }
  .tree-children { padding-left: 16px; border-left: 1px solid rgba(255,255,255,0.1); margin-left: 6px; }
  .light .tree-children { border-left-color: rgba(0,0,0,0.1); }
  .modal-close { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: inherit; font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .light .modal-close { border-color: rgba(0,0,0,0.1); background: rgba(0,0,0,0.03); }
  .modal-close:hover { background: rgba(255,255,255,0.08); }

  .footer { padding: 6px 0 10px; text-align: center; font-size: 10px; opacity: 0.2; letter-spacing: 0.5px; text-transform: uppercase; }
`;
document.head.appendChild(style);

// === Init ===
async function init() {
  config = await LoadConfig();
  window._qualities = ['best', '1080', '720', '480', '360'];

  document.getElementById('app').innerHTML = `
    <div class="app ${config.dark_theme ? 'dark' : 'light'}" id="app-root">
      <header class="header">
        <div class="logo">
          <span class="logo-sss">SSS</span>
          <span class="logo-name">Stream Save SL</span>
        </div>
      </header>
      <div id="content"></div>
    </div>
  `;

  render();
}

init();
