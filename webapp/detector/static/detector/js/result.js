// Detectra — result page: animated gauges + image lightbox.

(function () {
  const card = document.getElementById('result-card');
  if (!card) return;

  const realPct = parseFloat(card.dataset.realProb);
  const fakePct = parseFloat(card.dataset.fakeProb);
  const confPct = parseFloat(card.dataset.confidence);

  function animateResults() {
    const barReal = document.getElementById('bar-real');
    const barFake = document.getElementById('bar-fake');
    if (barReal) barReal.style.width = realPct + '%';
    if (barFake) barFake.style.width = fakePct + '%';

    const ring = document.getElementById('verdict-ring-fill');
    if (ring) {
      const circumference = 2 * Math.PI * 34; // r=34
      ring.style.strokeDasharray = String(circumference);
      const offset = circumference - (confPct / 100) * circumference;
      ring.style.strokeDashoffset = String(offset);
    }
  }

  // Double rAF ensures the browser paints the 0% state before transitioning.
  requestAnimationFrame(() => requestAnimationFrame(animateResults));

  // ── Lightbox for face-grid / Grad-CAM images ──────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  document.querySelectorAll('.visual-img-wrap[data-full]').forEach((wrap) => {
    wrap.addEventListener('click', () => {
      lightboxImg.src = wrap.dataset.full;
      lightbox.classList.add('show');
    });
  });

  function closeLightbox() { lightbox.classList.remove('show'); lightboxImg.src = ''; }

  if (lightbox) {
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }
})();
