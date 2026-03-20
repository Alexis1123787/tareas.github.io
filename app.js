/* ============================================================
   app.js — Probabilidad y Estadística
   ============================================================ */

/* ── File upload ── */
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

  uploadedFiles.forEach((f, idx) => {
    const card = document.createElement('div');
    card.className = 'file-card';
    const date = new Date(f.date).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    card.innerHTML = `
      <span class="file-icon">${fileIcon(f.name)}</span>
      <div class="file-info">
        <div class="fname">${f.name}</div>
        <div class="fmeta">${formatSize(f.size)} · ${date}</div>
      </div>
      <button class="file-del" title="Eliminar">✕</button>
    `;
    card.querySelector('.file-del').addEventListener('click', () => {
      uploadedFiles.splice(idx, 1);
      renderFiles();
    });
    filesList.insertBefore(card, noFiles);
  });
}

fileInput.addEventListener('change', () => {
  Array.from(fileInput.files).forEach(f => {
    uploadedFiles.push({ name: f.name, size: f.size, date: Date.now() });
  });
  fileInput.value = '';
  renderFiles();
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
  Array.from(e.dataTransfer.files).forEach(f => {
    uploadedFiles.push({ name: f.name, size: f.size, date: Date.now() });
  });
  renderFiles();
});


/* ── Modal ── */
const overlay = document.getElementById('overlay');

document.getElementById('openTool').addEventListener('click', () => {
  overlay.classList.add('open');
});
document.getElementById('closeModal').addEventListener('click', () => {
  overlay.classList.remove('open');
});
overlay.addEventListener('click', e => {
  if (e.target === overlay) overlay.classList.remove('open');
});


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

// Default sample data
[
  [1, 2.9523], [2, 4.295],  [3, 9.32],
  [4, 9.6186], [5, 13.9355],[6, 15.2155],[7, 17.5937]
].forEach(([x, y]) => addPair(x, y));

document.getElementById('addPair').addEventListener('click', () => addPair());


/* ── Least Squares Calculation ── */
document.getElementById('calcBtn').addEventListener('click', () => {

  // Collect valid points
  const rows = pairsContainer.querySelectorAll('.pair-row');
  const pts = [];
  rows.forEach(r => {
    const x = parseFloat(r.querySelector('.px').value);
    const y = parseFloat(r.querySelector('.py').value);
    if (!isNaN(x) && !isNaN(y)) pts.push({ x, y });
  });

  const n = pts.length;
  if (n < 2) {
    alert('Se necesitan al menos 2 puntos válidos.');
    return;
  }

  // Sums
  const sumX  = pts.reduce((a, p) => a + p.x, 0);
  const sumY  = pts.reduce((a, p) => a + p.y, 0);
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = pts.reduce((a, p) => a + p.x * p.x, 0);

  // Slope (m) and intercept (b)
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const b = (sumY - m * sumX) / n;

  // R²
  const yMean = sumY / n;
  const ssTot = pts.reduce((a, p) => a + (p.y - yMean) ** 2, 0);
  const ssRes = pts.reduce((a, p) => a + (p.y - (m * p.x + b)) ** 2, 0);
  const r2    = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Display stats
  document.getElementById('rSlope').textContent     = m.toFixed(4);
  document.getElementById('rIntercept').textContent = b.toFixed(4);
  document.getElementById('rR2').textContent        = r2.toFixed(4);
  document.getElementById('rN').textContent         = n;

  // Equation
  const bSign = b >= 0 ? '+ ' : '− ';
  document.getElementById('equationBox').innerHTML =
    `y = <span>${m.toFixed(4)}</span> x ${bSign}<span>${Math.abs(b).toFixed(4)}</span>`;

  // Residuals table
  const tbody = document.getElementById('residualBody');
  tbody.innerHTML = '';
  pts.forEach((p, i) => {
    const yHat = m * p.x + b;
    const res  = p.y - yHat;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.x}</td>
      <td>${p.y.toFixed(4)}</td>
      <td>${yHat.toFixed(4)}</td>
      <td class="${res >= 0 ? 'res-pos' : 'res-neg'}">${res.toFixed(4)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('results').style.display = 'block';
  drawChart(pts, m, b);
});


/* ── Chart (Canvas) ── */
function drawChart(pts, m, b) {
  const canvas = document.getElementById('chartCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = 280;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 24, right: 20, bottom: 40, left: 54 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  // Data range
  const xs   = pts.map(p => p.x);
  const ys   = pts.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const allY = [...ys, m * minX + b, m * maxX + b];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const pX = (maxX - minX) * 0.1 || 1;
  const pY = (maxY - minY) * 0.13 || 1;
  const xMin = minX - pX, xMax = maxX + pX;
  const yMin = minY - pY, yMax = maxY + pY;

  // Coordinate transforms
  const tx = x => pad.left + ((x - xMin) / (xMax - xMin)) * cW;
  const ty = y => pad.top  + ((yMax - y) / (yMax - yMin)) * cH;

  // Background
  ctx.fillStyle = '#f7f7f7';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  const gc = 5;
  for (let i = 0; i <= gc; i++) {
    const gx = pad.left + (i / gc) * cW;
    const gy = pad.top  + (i / gc) * cH;
    ctx.beginPath(); ctx.moveTo(gx, pad.top);    ctx.lineTo(gx, pad.top + cH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, gy);   ctx.lineTo(pad.left + cW, gy); ctx.stroke();
  }

  // Axis value labels
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

  // Residual dashed lines
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  pts.forEach(p => {
    const yHat = m * p.x + b;
    ctx.beginPath();
    ctx.moveTo(tx(p.x), ty(p.y));
    ctx.lineTo(tx(p.x), ty(yHat));
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Regression line
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tx(xMin), ty(m * xMin + b));
  ctx.lineTo(tx(xMax), ty(m * xMax + b));
  ctx.stroke();

  // Data points
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(tx(p.x), ty(p.y), 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Axis name labels
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
