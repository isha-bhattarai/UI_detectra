// Detectra — history page: animate confidence mini-bars in from 0.
(function () {
  const fills = document.querySelectorAll('.conf-fill[data-width]');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fills.forEach((el) => {
        const val = parseFloat(el.getAttribute('data-width'));
        if (!isNaN(val)) el.style.width = Math.min(100, Math.max(0, val)) + '%';
      });
    });
  });
})();

// Detectra — history page: delete a prediction record with confirmation.
(function () {
  const backdrop = document.getElementById('delete-modal-backdrop');
  if (!backdrop) return; // no records on this page — modal isn't rendered

  const cancelBtn  = document.getElementById('delete-modal-cancel');
  const confirmBtn = document.getElementById('delete-modal-confirm');
  const csrfInput  = document.getElementById('csrf-token');
  const csrfToken  = csrfInput ? csrfInput.value : '';
  const historyCard = document.getElementById('history-card');

  let pendingRow = null;
  let pendingUrl = null;
  let pendingLabel = null;
  let lastFocused = null;

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal(row, url, label) {
    pendingRow = row;
    pendingUrl = url;
    pendingLabel = label;
    lastFocused = document.activeElement;
    backdrop.hidden = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete';
    confirmBtn.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    backdrop.hidden = true;
    pendingRow = null;
    pendingUrl = null;
    pendingLabel = null;
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function decrementStat(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const current = parseInt(el.textContent, 10);
    if (!isNaN(current)) el.textContent = String(Math.max(0, current - 1));
  }

  function updateCounts(label) {
    decrementStat('.stat-card:nth-child(1) .num');
    if (label === 'REAL')      decrementStat('.num-real');
    if (label === 'FAKE')      decrementStat('.num-fake');
    if (label === 'UNCERTAIN') decrementStat('.num-uncertain');
  }

  function showEmptyStateIfNeeded() {
    const tbody = document.querySelector('.table-wrap tbody');
    if (tbody && tbody.children.length === 0 && historyCard) {
      const uploadUrl = historyCard.getAttribute('data-upload-url') || '/';
      historyCard.innerHTML =
        '<div class="empty-state">No predictions yet. ' +
        '<a href="' + uploadUrl + '">Upload a video</a> to get started.</div>';
    }
  }

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      openModal(row, btn.getAttribute('data-delete-url'), btn.getAttribute('data-label'));
    });
  });

  cancelBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  confirmBtn.addEventListener('click', () => {
    if (!pendingUrl || !pendingRow) return;
    const row   = pendingRow;
    const url   = pendingUrl;
    const label = pendingLabel;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting…';

    fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then((res) => res.json().catch(() => ({})).then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        closeModal();

        if (ok && data && data.success) {
          row.classList.add('row-removing');
          updateCounts(label);
          setTimeout(() => {
            row.remove();
            showEmptyStateIfNeeded();
          }, 220);
          showToast('Analysis deleted successfully.', 'success');
        } else {
          const msg = (data && data.error) || 'Could not delete this analysis. Please try again.';
          showToast(msg, 'error');
        }
      })
      .catch(() => {
        closeModal();
        showToast('Could not delete this analysis. Please check your connection and try again.', 'error');
      });
  });
})();
