// Detectra — upload page: unified drop zone with video/image auto-detection,
// client-side validation, and an animated "scanning" wait state.

(function () {
  const LIMITS = {
    video: { exts: ['.mp4', '.avi', '.mov', '.mkv'], maxMB: 100, mime: 'video' },
    image: { exts: ['.jpg', '.jpeg', '.png'], maxMB: 10, mime: 'image' },
  };

  const STEPS = {
    video: [
      'Uploading video',
      'Extracting frames',
      'Detecting faces (MTCNN)',
      'Running neural inference (ResNeXt50 + LSTM)',
      'Generating Grad-CAM explainability',
    ],
    image: [
      'Uploading image',
      'Locating face (MTCNN)',
      'Preparing model input',
      'Running neural inference (ResNeXt50 + LSTM)',
      'Generating Grad-CAM explainability',
    ],
  };

  const ICONS = {
    video: '<path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    image: '<path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  const dropZone     = document.getElementById('drop-zone');
  const dropIcon     = document.getElementById('drop-icon');
  const dropHint     = document.getElementById('drop-hint');
  const dropTitle    = document.getElementById('drop-title');
  const sharedInput  = document.getElementById('shared-file-input');
  const videoInput   = document.getElementById('video-file-input');
  const imageInput   = document.getElementById('image-file-input');
  const videoForm    = document.getElementById('video-form');
  const imageForm    = document.getElementById('image-form');
  const preview      = document.getElementById('file-preview');
  const previewIcon  = document.getElementById('file-preview-icon');
  const nameEl       = document.getElementById('file-name');
  const sizeEl       = document.getElementById('file-size');
  const removeBtn    = document.getElementById('remove-btn');
  const submitBtn    = document.getElementById('submit-btn');
  const modeBtns     = document.querySelectorAll('.mode-btn');
  const scanConsole  = document.getElementById('scan-console');
  const scanSub      = document.getElementById('scan-console-sub');
  const scanStepsEl  = document.getElementById('scan-steps');

  let mode = document.querySelector('.mode-btn.active')?.dataset.mode || 'video';
  let currentFile = null;

  function setMode(next, { silent = false } = {}) {
    mode = next;
    modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    dropIcon.innerHTML = ICONS[mode];
    const lim = LIMITS[mode];
    dropTitle.textContent = mode === 'video' ? 'Drag and drop your video here' : 'Drag and drop your image here';
    dropHint.textContent = `${lim.exts.map((e) => e.slice(1).toUpperCase()).join(' · ')} · Max ${lim.maxMB} MB`;
    sharedInput.accept = mode === 'video' ? 'video/*' : 'image/jpeg,image/png';
  }

  function formatBytes(b) {
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function detectType(file) {
    const name = file.name.toLowerCase();
    if (file.type.startsWith('video/') || LIMITS.video.exts.some((e) => name.endsWith(e))) return 'video';
    if (file.type.startsWith('image/') || LIMITS.image.exts.some((e) => name.endsWith(e))) return 'image';
    return null;
  }

  function validate(file, type) {
    const lim = LIMITS[type];
    const name = file.name.toLowerCase();
    const ext = '.' + name.split('.').pop();
    if (!lim.exts.includes(ext)) {
      return `Unsupported file type "${ext}". Allowed: ${lim.exts.join(', ')}`;
    }
    const maxBytes = lim.maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max is ${lim.maxMB} MB for ${type}.`;
    }
    if (file.size === 0) return 'File is empty.';
    return null;
  }

  function assignFileToInput(file, type) {
    const dt = new DataTransfer();
    dt.items.add(file);
    if (type === 'video') {
      videoInput.files = dt.files;
      imageInput.value = '';
    } else {
      imageInput.files = dt.files;
      videoInput.value = '';
    }
  }

  function showFile(file) {
    const detected = detectType(file);
    if (!detected) {
      showToast('Unrecognized file type. Please choose a video (MP4/AVI/MOV/MKV) or image (JPG/PNG).', 'error');
      return;
    }
    if (detected !== mode) {
      setMode(detected);
      showToast(`Auto-detected a ${detected} file — switched to ${detected[0].toUpperCase() + detected.slice(1)} mode.`, 'info', 3500);
    }
    const err = validate(file, detected);
    if (err) {
      showToast(err, 'error');
      clearFile();
      return;
    }

    currentFile = file;
    assignFileToInput(file, detected);

    nameEl.textContent = file.name;
    sizeEl.textContent = formatBytes(file.size);
    previewIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none">${ICONS[detected]}</svg>`;
    preview.classList.add('show');
    submitBtn.disabled = false;
  }

  function clearFile() {
    currentFile = null;
    sharedInput.value = '';
    videoInput.value = '';
    imageInput.value = '';
    preview.classList.remove('show');
    submitBtn.disabled = true;
  }

  // ── Mode toggle (manual override) ─────────────────────────────────────────
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // ── Drop zone wiring ───────────────────────────────────────────────────────
  dropZone.addEventListener('click', () => sharedInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sharedInput.click(); }
  });
  sharedInput.addEventListener('change', () => {
    if (sharedInput.files[0]) showFile(sharedInput.files[0]);
  });
  removeBtn.addEventListener('click', (e) => { e.stopPropagation(); clearFile(); });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) showFile(file);
  });

  // ── Scan console (animated wait state) ─────────────────────────────────────
  function buildSteps(type) {
    scanStepsEl.innerHTML = STEPS[type]
      .map((label) => `
        <div class="scan-step">
          <span class="step-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span>${label}</span>
        </div>
      `).join('');
  }

  function runScanSequence(type) {
    const stepEls = scanStepsEl.querySelectorAll('.scan-step');
    const delays = [200, 1800, 4200, 8000, 14000]; // staged, aesthetic — real completion is server-driven
    stepEls.forEach((el, i) => {
      setTimeout(() => {
        stepEls.forEach((s) => s.classList.remove('active'));
        if (i > 0) stepEls[i - 1].classList.remove('active');
        for (let j = 0; j < i; j++) stepEls[j].classList.add('done');
        el.classList.add('active');
      }, delays[i] || 14000 + i * 4000);
    });
  }

  function startAnalysis(type) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" style="animation:spin 0.9s linear infinite"><path d="M21 12a9 9 0 11-9-9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      Analyzing…`;
    scanSub.textContent = type === 'video'
      ? 'Typically 20–60 seconds depending on video length'
      : 'Typically 5–15 seconds';
    buildSteps(type);
    scanConsole.classList.add('show');
    runScanSequence(type);
  }

  document.getElementById('analyze-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentFile) {
      showToast('Please choose a file first.', 'warning');
      return;
    }
    startAnalysis(mode);
    const targetForm = mode === 'video' ? videoForm : imageForm;
    // Small delay so the scan console paints before the browser begins
    // the (blocking) navigation triggered by the real form submit.
    setTimeout(() => targetForm.submit(), 120);
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  setMode(mode);
})();
