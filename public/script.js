// Snip — frontend logic

const $ = (sel) => document.querySelector(sel);
const form = $('#shorten-form');
const urlInput = $('#url-input');
const aliasInput = $('#alias-input');
const shortenBtn = $('#shorten-btn');
const btnLabel = shortenBtn.querySelector('.btn-label');
const btnSpin = shortenBtn.querySelector('.btn-spin');
const formError = $('#form-error');
const resultCard = $('#result-card');
const resultLink = $('#result-link');
const targetUrl = $('#target-url');
const copyBtn = $('#copy-btn');
const qrBtn = $('#qr-btn');
const qrPanel = $('#qr-panel');
const qrImg = $('#qr-img');
const qrDownload = $('#qr-download');
const tbody = $('#links-tbody');
const refreshBtn = $('#refresh-btn');
const aliasPrefix = $('#alias-prefix');
const footerHost = $('#footer-host');
const toast = $('#toast');

const HOST = window.location.host;
aliasPrefix.textContent = `${HOST}/`;
footerHost.textContent = HOST;

let currentCode = null;

// ---------- Helpers ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => (toast.hidden = true), 250);
  }, 2000);
}

function setLoading(loading) {
  shortenBtn.disabled = loading;
  btnLabel.textContent = loading ? 'Shortening…' : 'Shorten';
  btnSpin.hidden = !loading;
}

function showError(msg) {
  if (!msg) {
    formError.hidden = true;
    formError.textContent = '';
    return;
  }
  formError.textContent = msg;
  formError.hidden = false;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return iso;
  const now = new Date();
  const diffMs = now - d;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------- Render result ----------
function showResult(data) {
  currentCode = data.code;
  resultLink.textContent = data.short_url;
  resultLink.href = data.short_url;
  targetUrl.textContent = data.target_url;
  qrPanel.hidden = true;
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- Render dashboard ----------
async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    renderLinks(data.links || []);
  } catch (err) {
    console.error('Failed to load links', err);
  }
}

function renderLinks(links) {
  if (!links.length) {
    tbody.innerHTML = `<tr class="empty"><td colspan="5">No links yet — create your first one above.</td></tr>`;
    return;
  }
  tbody.innerHTML = links
    .map(
      (l) => `
      <tr data-code="${escapeHtml(l.code)}">
        <td class="short-cell">
          <a href="${escapeHtml(l.short_url)}" target="_blank" rel="noopener">
            ${escapeHtml(HOST)}/<strong>${escapeHtml(l.code)}</strong>
          </a>
        </td>
        <td class="dest-cell" title="${escapeHtml(l.target_url)}">
          ${escapeHtml(l.target_url)}
        </td>
        <td class="num"><span class="click-pill">${l.clicks}</span></td>
        <td>${escapeHtml(formatDate(l.created_at))}</td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="icon-btn" data-action="copy" data-url="${escapeHtml(l.short_url)}">Copy</button>
            <button class="icon-btn" data-action="qr" data-code="${escapeHtml(l.code)}">QR</button>
            <button class="icon-btn danger" data-action="delete" data-code="${escapeHtml(l.code)}">Delete</button>
          </div>
        </td>
      </tr>`
    )
    .join('');
}

// ---------- Actions ----------
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed');
    }
    ta.remove();
  }
}

async function fetchQR(code) {
  const res = await fetch(`/api/links/${encodeURIComponent(code)}/qr`);
  if (!res.ok) throw new Error('QR fetch failed');
  return res.json();
}

async function deleteLink(code) {
  if (!confirm(`Delete /${code}? This cannot be undone.`)) return;
  const res = await fetch(`/api/links/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
  if (res.ok) {
    showToast('Link deleted');
    loadLinks();
  } else {
    showToast('Delete failed');
  }
}

// ---------- Form submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError(null);
  const url = urlInput.value.trim();
  const alias = aliasInput.value.trim();
  if (!url) return;
  setLoading(true);
  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, alias: alias || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Something went wrong.');
      return;
    }
    showResult(data);
    urlInput.value = '';
    aliasInput.value = '';
    loadLinks();
  } catch (err) {
    showError('Network error — please try again.');
  } finally {
    setLoading(false);
  }
});

// ---------- Result card buttons ----------
copyBtn.addEventListener('click', () => {
  if (resultLink.href) copyToClipboard(resultLink.href);
});

qrBtn.addEventListener('click', async () => {
  if (!currentCode) return;
  if (!qrPanel.hidden) {
    qrPanel.hidden = true;
    return;
  }
  try {
    const data = await fetchQR(currentCode);
    qrImg.src = data.qr;
    qrDownload.href = data.qr;
    qrDownload.download = `snip-${currentCode}.png`;
    qrPanel.hidden = false;
  } catch {
    showToast('Failed to load QR');
  }
});

// ---------- Dashboard row actions (delegated) ----------
tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'copy') {
    copyToClipboard(btn.dataset.url);
  } else if (action === 'qr') {
    try {
      const data = await fetchQR(btn.dataset.code);
      // Show in the result card area
      currentCode = btn.dataset.code;
      resultLink.textContent = data.short_url;
      resultLink.href = data.short_url;
      const row = btn.closest('tr');
      const dest = row.querySelector('.dest-cell').getAttribute('title');
      targetUrl.textContent = dest;
      qrImg.src = data.qr;
      qrDownload.href = data.qr;
      qrDownload.download = `snip-${btn.dataset.code}.png`;
      qrPanel.hidden = false;
      resultCard.hidden = false;
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      showToast('Failed to load QR');
    }
  } else if (action === 'delete') {
    deleteLink(btn.dataset.code);
  }
});

refreshBtn.addEventListener('click', loadLinks);

// ---------- Boot ----------
loadLinks();
