/* ============================================================
   app.js — Probabilidad y Estadística
   Token guardado solo en el navegador local (localStorage)
   ============================================================ */

const GITHUB_USER   = 'Alexis1123787';
const GITHUB_REPO   = 'tareas.github.io';
const GITHUB_BRANCH = 'main';
const FILES_FOLDER  = 'tareas';

/* ── Token management (never in code) ── */
function getToken() {
  return localStorage.getItem('gh_token');
}
function saveToken(token) {
  localStorage.setItem('gh_token', token.trim());
}
function clearToken() {
  localStorage.removeItem('gh_token');
}

/* ── Ask for token if not saved ── */
function checkToken() {
  if (!getToken()) {
    document.getElementById('tokenOverlay').classList.add('open');
  } else {
    loadFilesFromGitHub();
  }
}

document.getElementById('tokenSaveBtn').addEventListener('click', () => {
  const val = document.getElementById('tokenInput').value.trim();
  if (!val.startsWith('ghp_') || val.length < 20) {
    document.getElementById('tokenError').style.display = 'block';
    return;
  }
  saveToken(val);
  document.getElementById('tokenOverlay').classList.remove('open');
  document.getElementById('tokenError').style.display = 'none';
  loadFilesFromGitHub();
});

document.getElementById('tokenLogout').addEventListener('click', () => {
  clearToken();
  uploadedFiles = [];
  renderFiles();
  document.getElementById('tokenOverlay').classList.add('open');
});

/* ── GitHub API helpers ── */
async function githubRequest(path, method = 'GET', body = null) {
  const token = getToken();
  const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/${path}`, {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 401) {
    clearToken();
    showToast('Token inválido, ingresa de nuevo', true);
    document.getElementById('tokenOverlay').classList.add('open');
    return null;
  }
  return res.json();
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Upload file to GitHub ── */
async function uploadToGitHub(file) {
  const base64 = await fileToBase64(file);
  const path   = `${FILES_FOLDER}/${file.name}`;

  let sha = undefined;
  const existing = await githubRequest(`contents/${path}`);
  if (existing && existing.sha) sha = existing.sha;

  const body = {
    message: `Subida de tarea: ${file.name}`,
    content: base64,
    branch:  GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  return await githubRequest(`contents/${path}`, 'PUT', body);
}

/* ── Load files from GitHub ── */
async function loadFilesFromGitHub() {
  showLoading(true);
  try {
    const data = await githubRequest(`contents/${FILES_FOLDER}`);
    if (Array.isArray(data)) {
      uploadedFiles = data.map(f => ({
        name:         f.name,
        size:         f.size,
        download_url: f.download_url,
        html_url:     f.html_url,
        sha:          f.sha,
        path:         f.path
      }));
    } else {
      uploadedFiles = [];
    }
  } catch (e) {
    uploadedFiles = [];
  }
  showLoading(false);
  renderFiles();
}

/* ── Delete file from GitHub ── */
async function deleteFromGitHub(filePath, sha) {
  return await githubRequest(`contents/${filePath}`, 'DELETE', {
    message: `Eliminando tarea: ${filePath}`,
    sha,
    branch: GITHUB_BRANCH
  });
}

/* ── Toast notification ── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#7b2d2d' : '#2d6a4f';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showLoading(show) {
  noFiles.textContent   = show ? '⏳ Cargando tareas...' : 'Aún no has subido ninguna tarea.';
  noFiles.style.display = 'block';
}

/* ── File list ── */
const fileInput  = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const filesList  = document.getElementById('filesList');
const noFiles    = document.getElementById('noFiles');
let uploadedFiles = [];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📑';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['py', 'js', 'html', 'css', 'cpp', 'java', 'ts', 'c'].includes(ext)) return '💻';
  return '📎';
}

function renderFiles() {
  filesList.querySelectorAll('.file-card').forEach(el => el.remove());
  noFiles.style.display = uploadedFiles.length === 0 ? 'block' : 'none';

  uploadedFiles.forEach((f) => {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.innerHTML = `
      <span class="file-icon">${fileIcon(f.name)}</span>
      <div class="file-info">
        <a class="fname" href="${f.html_url}" target="_blank">${f.name}</a>
        <div class="fmeta">${formatSize(f.size)}</div>
      </div>
      <div class="file-actions">
        <a class="file-download" href="${f.download_url}" download="${f.name}" title="Descargar">⬇</a>
        <button class="file-del" title="Eliminar">✕</button>
      </div>
    `;
    card.querySelector('.file-del').addEventListener('click', async () => {
      const btn = card.querySelector('.file-del');
      btn.textContent = '...';
      btn.disabled = true;
      try {
        await deleteFromGitHub(f.path, f.sha);
        showToast('Archivo eliminado');
        await loadFilesFromGitHub();
      } catch (e) {
        showToast('Error al eliminar', true);
        btn.textContent = '✕';
        btn.disabled = false;
      }
    });
    filesList.insertBefore(card, noFiles);
  });
}

/* ── Handle file upload ── */
async function handleFiles(files) {
  if (!files || files.length === 0) return;

  for (const file of Array.from(files)) {
    const tempCard = document.createElement('div');
    tempCard.className = 'file-card';
    tempCard.innerHTML = `
      <span class="file-icon">${fileIcon(file.name)}</span>
      <div class="file-info">
        <div class="fname">${file.name}</div>
        <div class="fmeta">Subiendo a GitHub... ⏳</div>
      </div>
    `;
    noFiles.style.display = 'none';
    filesList.insertBefore(tempCard, noFiles);

    try {
      await uploadToGitHub(file);
      showToast(`✓ ${file.name} guardado en la nube`);
    } catch (e) {
      showToast(`Error al subir ${file.name}`, true);
    }
    tempCard.remove();
  }

  await loadFilesFromGitHub();
}

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});


/* ── Modal ── */
const overlay = document.getElementById('overlay');
document.getElementById('openTool').addEventListener('click', () => overlay.classList.add('open'));
document.getElementById('closeModal').addEventListener('click', () => overlay.classList.remove('open'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });


/* ── Pairs (x, y) ── */
const pairsContainer = document.getElementById('pairsContainer');

function addPair(xVal = '', yVal = '') {
  const row = document.createElement('div');
  row.className = 'pair-row';
  row.innerHTML = `
    <input type="number" step="any" placeholder="x" class="px" value="${xVal}" />
    <input type="number" step="any" placeholder="y" class="py" value="${yVal}" />
    <button class="remove-btn" title="Eliminar">✕</button>
  `;
  row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
  pairsContainer.appendChild(row);
}

[
  [1, 2.9523], [2, 4.295],   [3, 9.32],
  [4, 9.6186], [5, 13.9355], [6, 15.2155], [7, 17.5937]
].forEach(([x, y]) => addPair(x, y));

document.getElementById('addPair').addEventListener('click', () => addPair());


/* ── Least Squares Calculation ── */
document.getElementById('calcBtn').addEventListener('click', () => {
  const rows = pairsContainer.querySelectorAll('.pair-row');
  const pts  = [];
  rows.forEach(r => {
    const x = parseFloat(r.querySelector('.px').value);
    const y = parseFloat(r.querySelector('.py').value);
    if (!isNaN(x) && !isNaN(y)) pts.push({ x, y });
  });

  const n = pts.length;
  if (n < 2) { alert('Se necesitan al menos 2 puntos válidos.'); return; }

  const sumX  = pts.reduce((a, p) => a + p.x, 0);
  const sumY  = pts.reduce((a, p) => a + p.y, 0);
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = pts.reduce((a, p) => a + p.x * p.x, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const b = (sumY - m * sumX) / n;

  const yMean = sumY / n;
  const ssTot = pts.reduce((a, p) => a + (p.y - yMean) ** 2, 0);
  const ssRes = pts.reduce((a, p) => a + (p.y - (m * p.x + b)) ** 2, 0);
  const r2    = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  document.getElementById('rSlope').textContent     = m.toFixed(4);
  document.getElementById('rIntercept').textContent = b.toFixed(4);
  document.getElementById('rR2').textContent        = r2.toFixed(4);
  document.getElementById('rN').textContent         = n;

  const bSign = b >= 0 ? '+ ' : '− ';
  document.getElementById('equationBox').innerHTML =
    `y = <span>${m.toFixed(4)}</span> x ${bSign}<span>${Math.abs(b).toFixed(4)}</span>`;

  const tbody = document.getElementById('residualBody');
  tbody.innerHTML = '';
  pts.forEach((p, i) => {
    const yHat = m * p.x + b;
    const res  = p.y - yHat;
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td><td>${p.x}</td>
      <td>${p.y.toFixed(4)}</td><td>${yHat.toFixed(4)}</td>
      <td class="${res >= 0 ? 'res-pos' : 'res-neg'}">${res.toFixed(4)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('results').style.display = 'block';
  drawChart(pts, m, b);
});


/* ── Chart ── */
function drawChart(pts, m, b) {
  const canvas = document.getElementById('chartCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = 280;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 24, right: 20, bottom: 40, left: 54 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;

  const xs   = pts.map(p => p.x);
  const ys   = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const allY = [...ys, m * minX + b, m * maxX + b];
  const minY = Math.min(...allY), maxY = Math.max(...allY);

  const pX = (maxX - minX) * 0.1 || 1;
  const pY = (maxY - minY) * 0.13 || 1;
  const xMin = minX - pX, xMax = maxX + pX;
  const yMin = minY - pY, yMax = maxY + pY;

  const tx = x => pad.left + ((x - xMin) / (xMax - xMin)) * cW;
  const ty = y => pad.top  + ((yMax - y) / (yMax - yMin)) * cH;

  ctx.fillStyle = '#f7f7f7';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  const gc = 5;
  for (let i = 0; i <= gc; i++) {
    const gx = pad.left + (i / gc) * cW;
    const gy = pad.top  + (i / gc) * cH;
    ctx.beginPath(); ctx.moveTo(gx, pad.top);  ctx.lineTo(gx, pad.top + cH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + cW, gy); ctx.stroke();
  }

  ctx.fillStyle = '#888888';
  ctx.font = '10px Space Mono, monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= gc; i++) {
    const v = xMin + (i / gc) * (xMax - xMin);
    ctx.fillText(v.toFixed(1), pad.left + (i / gc) * cW, pad.top + cH + 16);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= gc; i++) {
    const v = yMin + ((gc - i) / gc) * (yMax - yMin);
    ctx.fillText(v.toFixed(1), pad.left - 6, pad.top + (i / gc) * cH + 4);
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  pts.forEach(p => {
    const yHat = m * p.x + b;
    ctx.beginPath(); ctx.moveTo(tx(p.x), ty(p.y)); ctx.lineTo(tx(p.x), ty(yHat)); ctx.stroke();
  });
  ctx.setLineDash([]);

  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tx(xMin), ty(m * xMin + b));
  ctx.lineTo(tx(xMax), ty(m * xMax + b));
  ctx.stroke();

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(tx(p.x), ty(p.y), 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  ctx.fillStyle = '#888888';
  ctx.font = '11px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('x', pad.left + cW / 2, H - 4);
  ctx.save();
  ctx.translate(12, pad.top + cH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('y', 0, 0);
  ctx.restore();
}


/* ── Init ── */
window.addEventListener('DOMContentLoaded', () => {
  checkToken();
});
