'use strict';
window.cpxo.on('progress', (p) => {
  document.getElementById('name').textContent = p.name || 'Uploading';
  document.getElementById('pct').textContent = `${p.percent || 0}%`;
  document.getElementById('fill').style.width = `${p.percent || 0}%`;
  document.getElementById('bytes').textContent = p.total ? `${p.sentLabel} of ${p.totalLabel}` : '';
});
