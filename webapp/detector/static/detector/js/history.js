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
