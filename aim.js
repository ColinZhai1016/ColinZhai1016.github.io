(() => {
  'use strict';

  const range = document.querySelector('[data-aim-range]');
  if (!range) return;

  const select = (name) => range.querySelector(`[data-aim-${name}]`);
  const panel = select('console');
  const field = select('field');
  const canvas = select('canvas');
  const start = select('start');
  const startLabel = select('start-label');
  const reset = select('reset');
  const end = select('end');
  const sensitivity = select('sensitivity');
  const sensitivityValue = select('sensitivity-value');
  const countOption = select('count-option');
  const customCount = select('custom-count');
  const count = select('count');
  const time = select('time');
  const accuracy = select('accuracy');
  const shotCount = select('shots');
  const result = select('result');
  const fullscreen = select('fullscreen');
  const fullscreenLabel = select('fullscreen-label');
  const stageAction = select('stage-action');
  const stageLabel = select('stage-label');
  const overlay = select('overlay');
  const message = select('message');
  const detail = select('detail');
  const hint = select('hint');
  const status = select('status');
  if (![panel, field, canvas, start, startLabel, reset, end, sensitivity, sensitivityValue, countOption, customCount,
    count, time, accuracy, shotCount, result, fullscreen, fullscreenLabel,
    stageAction, stageLabel, overlay, message, detail, hint, status].every(Boolean)) return;
  if (typeof window.createAimScene !== 'function') return;
  const scene = window.createAimScene(canvas);
  if (!scene || typeof scene.sample !== 'function' || !Array.isArray(scene.preview)) return;

  const t = (english, chinese) => window.portfolioLanguage?.text(english, chinese) ?? english;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finePointer = window.matchMedia('(pointer: fine)');
  const sceneState = { yaw: 0, pitch: 0, targets: [] };
  const usedPositions = new Set();
  const randomBuffer = new Uint32Array(1);
  const random = typeof window.crypto?.getRandomValues === 'function' ? () => {
    window.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0] / 2 ** 32;
  } : Math.random;
  const validCount = (value) => {
    const digits = value.trim();
    if (!/^\d+$/.test(digits)) return 10n;
    const requested = BigInt(digits);
    return requested > 0n ? requested : 1n;
  };
  const selectedGoal = () => {
    const option = countOption.value;
    if (option === 'unlimited') return null;
    return validCount(option === 'custom' ? count.value : option);
  };
  const multiplier = () => clamp(sensitivity.valueAsNumber || 1, .25, 2.5);
  let state = 'idle';
  let mode = 'direct';
  let goal = selectedGoal();
  let hits = 0n;
  let shots = 0n;
  let elapsed = 0;
  let startedAt = 0;
  let frame = 0;
  let gesture = null;
  let resumePointer = false;
  let lockRequest = 0;
  let awaitingLock = false;
  let usingTouch = !finePointer.matches;
  let lastTarget = null;
  let viewportFallback = false;
  let expanded = false;
  let fullscreenBusy = false;

  function redraw() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      scene.draw(sceneState);
    });
  }

  function liveElapsed() {
    return elapsed + (state === 'running' ? performance.now() - startedAt : 0);
  }

  function accuracyLabel() {
    return shots ? `${(200n * hits + shots) / (2n * shots)}%` : '—';
  }

  function renderResult() {
    if (state !== 'finished') return;
    shotCount.textContent = shots.toLocaleString();
    accuracy.textContent = accuracyLabel();
    time.textContent = (elapsed / 1000).toFixed(2);
  }

  function renderCopy() {
    const finished = state === 'finished';
    const paused = state === 'paused';
    const running = state === 'running';
    startLabel.textContent = running ? t('In progress', '训练中')
      : paused ? t('Resume', '继续训练') : finished ? t('Try again', '再来一次') : t('Start practice', '开始练习');
    stageLabel.textContent = startLabel.textContent;
    fullscreenLabel.textContent = expanded ? t('Exit fullscreen', '退出全屏') : t('Fullscreen', '全屏');
    message.textContent = finished ? t('Round complete', '训练完成')
      : paused ? t('Practice paused', '训练已暂停') : t('Ready when you are.', '准备好就开始。');
    detail.textContent = paused ? t('Click the arena or choose Resume to keep going.', '点击靶场或“继续训练”，即可接着打靶。') : '';
    if (running && mode === 'locked') {
      hint.textContent = goal === null
        ? t('Move to aim · Click to shoot · Press Esc to reach End practice', '移动鼠标瞄准 · 点击射击 · 按 Esc 后可结束练习')
        : t('Move to aim · Click to shoot · Esc releases the mouse', '移动鼠标瞄准 · 点击射击 · Esc 释放鼠标');
    } else if (running && mode === 'keyboard') {
      hint.textContent = t('Arrow keys aim · Space shoots · Esc pauses', '方向键瞄准 · 空格射击 · Esc 暂停');
    } else if (paused) {
      hint.textContent = goal === null
        ? t('Resume practice or end it to see your results.', '可继续训练，或结束练习查看成绩。')
        : expanded
        ? t('Resume the round, or exit fullscreen to adjust sensitivity.', '可继续训练，或退出全屏调整灵敏度。')
        : t('Adjust sensitivity, or resume the round.', '可调整灵敏度，也可以继续训练。');
    } else {
      hint.textContent = usingTouch
        ? t('Swipe to aim · Center the crosshair on a ball to hit it', '滑动瞄准 · 准心对上绿球即命中')
        : running ? t('Click a ball to shoot · Drag to turn', '点击绿球射击 · 拖动转向')
          : t('Mouse or touch · Arrow keys and Space also work', '支持鼠标、触屏，也可用方向键和空格');
    }
  }

  function announce(english, chinese) {
    status.textContent = t(english, chinese);
  }

  function announceResult() {
    const seconds = (elapsed / 1000).toFixed(2);
    if (shots === 0n) {
      announce(`Round complete in ${seconds} seconds. No shots fired.`, `训练完成，用时 ${seconds} 秒，本轮射击次数为 0。`);
    } else {
      announce(`Round complete. ${accuracyLabel()} accuracy in ${seconds} seconds.`,
        `训练完成，命中率 ${accuracyLabel()}，用时 ${seconds} 秒。`);
    }
  }

  function updateControls() {
    const active = state === 'running' || state === 'paused';
    field.dataset.aimState = state;
    field.dataset.aimMode = mode;
    start.disabled = state === 'running';
    reset.hidden = !active;
    end.hidden = !active || goal !== null;
    countOption.disabled = active;
    customCount.hidden = countOption.value !== 'custom';
    count.disabled = active;
    overlay.hidden = state === 'running';
    result.hidden = state !== 'finished';
    stageAction.hidden = !expanded || state === 'running';
    renderResult();
    renderCopy();
    redraw();
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    field.dataset.aimMode = next;
    renderCopy();
  }

  function canAddTarget() {
    return goal === null || hits + BigInt(sceneState.targets.length) < goal;
  }

  function addTarget(previous = lastTarget) {
    const { width, height } = canvas.getBoundingClientRect();
    const { yaw, pitch, targets } = sceneState;
    const active = targets.map((target) => scene.project(target, yaw, pitch)).filter(Boolean);
    const prior = previous && scene.project(previous, yaw, pitch);
    let best;
    // Keep only the targets being played; the requested total never allocates a queue.
    for (let i = 0; i < 36 || !best; i++) {
      const candidate = scene.sample(random);
      const key = `${candidate.x},${candidate.y},${candidate.z}`;
      if (usedPositions.has(key)) continue;
      const p = scene.project(candidate, yaw, pitch);
      const distance = (q) => Math.hypot((p.u - q.u) * width, (p.v - q.v) * height);
      const edge = p ? Math.min(p.u * width, (1 - p.u) * width, p.v * height, (1 - p.v) * height) - p.radius : -1000;
      const space = p ? active.reduce((min, q) => Math.min(min, distance(q) - p.radius - q.radius - 6), 1000) : -1000;
      const jump = p && prior ? distance(prior) - Math.max(p.radius + prior.radius, Math.min(width, height) * .15) : 1000;
      const score = Math.min(edge - 6, space, jump);
      if (!best || score > best.score) best = { candidate, key, score };
      if (score > 0) break;
    }
    usedPositions.add(best.key);
    lastTarget = best.candidate;
    targets.push(lastTarget);
  }

  function releaseGesture() {
    const id = gesture?.id;
    gesture = null;
    if (id !== undefined && field.hasPointerCapture?.(id)) field.releasePointerCapture(id);
  }

  function releaseLock() {
    lockRequest += 1;
    awaitingLock = false;
    if (document.pointerLockElement === field) document.exitPointerLock?.();
  }

  function syncFullscreen() {
    const next = viewportFallback || document.fullscreenElement === panel;
    if (next !== expanded && state === 'running') pause();
    expanded = next;
    panel.dataset.aimExpanded = String(expanded);
    fullscreen.setAttribute('aria-pressed', String(expanded));
    stageAction.hidden = !expanded || state === 'running';
    renderCopy();
    redraw();
  }

  function setViewportFallback(open) {
    viewportFallback = open;
    panel.classList.toggle('is-aim-viewport', open);
    document.body.classList.toggle('aim-viewport-open', open);
    syncFullscreen();
  }

  async function toggleFullscreen() {
    if (fullscreenBusy) return;
    fullscreenBusy = true;
    const leaving = expanded;
    if (state === 'running') pause();
    try {
      if (viewportFallback) setViewportFallback(false);
      else if (document.fullscreenElement === panel) await document.exitFullscreen();
      else if (typeof panel.requestFullscreen === 'function' && document.fullscreenEnabled !== false) {
        try { await panel.requestFullscreen(); }
        catch { setViewportFallback(true); }
      } else setViewportFallback(true);
    } catch {
      // A native exit may have already completed via Escape.
    } finally {
      fullscreenBusy = false;
      syncFullscreen();
      if (leaving || expanded) fullscreen.focus({ preventScroll: true });
    }
  }

  function requestLock(event) {
    const mouseActivation = event?.detail > 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen';
    if (!mouseActivation || !finePointer.matches || typeof field.requestPointerLock !== 'function') return;
    const request = ++lockRequest;
    awaitingLock = true;
    const failed = () => {
      if (request === lockRequest) awaitingLock = false;
    };
    try {
      const pending = field.requestPointerLock();
      pending?.catch?.(failed);
    } catch {
      failed();
    }
  }

  function revealField() {
    const bounds = field.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0;
    const bottom = top + (viewport?.height || window.innerHeight);
    if (bounds.top < top || bounds.bottom > bottom) {
      field.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  function begin(event) {
    if (state === 'running') return;
    resumePointer = false;
    const resuming = state === 'paused';
    if (!resuming) {
      goal = selectedGoal();
      if (countOption.value === 'custom') count.value = String(goal);
      hits = 0n;
      shots = 0n;
      elapsed = 0;
      sceneState.yaw = 0;
      sceneState.pitch = 0;
      sceneState.targets = [];
      while (sceneState.targets.length < 3 && canAddTarget()) addTarget();
    }
    usingTouch = event?.pointerType === 'touch' || !finePointer.matches;
    state = 'running';
    mode = event?.detail === 0 ? 'keyboard' : usingTouch ? 'touch' : 'direct';
    revealField();
    startedAt = performance.now();
    updateControls();
    if (resuming) announce('Practice resumed.', '继续训练。');
    else if (goal === null) announce('Unlimited practice started.', '无限练习已开始。');
    else announce(`Practice started. Hit ${goal} targets.`, `训练开始，击中 ${goal} 个目标。`);
    field.focus({ preventScroll: true });
    requestLock(event);
  }

  function pause() {
    if (state !== 'running') return;
    elapsed = liveElapsed();
    state = 'paused';
    mode = 'direct';
    releaseGesture();
    releaseLock();
    updateControls();
    announce('Practice paused. Choose Resume to continue.', '训练已暂停，点击“继续训练”可接着打靶。');
  }

  function finish() {
    const restoreFocus = document.activeElement === field || document.activeElement === end;
    elapsed = liveElapsed();
    state = 'finished';
    mode = 'direct';
    sceneState.targets = [];
    releaseGesture();
    releaseLock();
    updateControls();
    announceResult();
    if (restoreFocus) (expanded ? stageAction : start).focus({ preventScroll: true });
  }

  function resetRound() {
    const restoreFocus = document.activeElement === reset || document.activeElement === field;
    state = 'idle';
    mode = 'direct';
    hits = 0n;
    shots = 0n;
    elapsed = 0;
    goal = selectedGoal();
    sceneState.yaw = 0;
    sceneState.pitch = 0;
    sceneState.targets = scene.preview.slice();
    releaseGesture();
    releaseLock();
    updateControls();
    announce('Practice reset.', '训练已重置。');
    if (restoreFocus) start.focus({ preventScroll: true });
  }

  function fire(u, v, { countMiss = true } = {}) {
    if (state !== 'running' || u < 0 || u > 1 || v < 0 || v > 1) return;
    const target = scene.pick(sceneState, u, v);
    const hit = sceneState.targets.indexOf(target);
    if (hit === -1 && !countMiss) return;
    shots += 1n;
    if (hit !== -1) {
      hits += 1n;
      sceneState.targets.splice(hit, 1);
      if (hits === goal) {
        finish();
        return;
      }
      if (canAddTarget()) addTarget(target);
      redraw();
    }
  }

  function turn(dx, dy, rate = .0032) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const scale = multiplier() * rate;
    sceneState.yaw = clamp(sceneState.yaw + dx * scale, -.70, .70);
    sceneState.pitch = clamp(sceneState.pitch - dy * scale, -.38, .38);
    redraw();
  }

  function normalizedPoint(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
  }

  start.addEventListener('click', begin);
  stageAction.addEventListener('click', (event) => {
    event.stopPropagation();
    begin(event);
  });
  reset.addEventListener('click', resetRound);
  end.addEventListener('click', () => {
    if (goal === null && (state === 'running' || state === 'paused')) finish();
  });
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', (event) => {
    if (!viewportFallback || event.defaultPrevented) return;
    if (event.key === 'Tab') {
      const first = end.hidden ? fullscreen : end;
      const last = stageAction.hidden ? field : stageAction;
      const boundary = event.shiftKey ? first : last;
      const focused = document.activeElement;
      if (focused === boundary || !panel.contains(focused)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setViewportFallback(false);
      fullscreen.focus({ preventScroll: true });
    }
  });
  countOption.addEventListener('change', updateControls);
  count.addEventListener('change', () => { count.value = String(validCount(count.value)); });
  sensitivity.addEventListener('input', () => { sensitivityValue.textContent = `${multiplier().toFixed(2)}×`; });

  field.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || stageAction.contains(event.target)) return;
    if (state === 'paused') {
      resumePointer = true;
      return;
    }
    if (state !== 'running') return;
    if (document.pointerLockElement === field) {
      fire(.5, .5);
      return;
    }
    const point = normalizedPoint(event);
    if (!point) return;
    usingTouch = event.pointerType === 'touch';
    if (usingTouch) setMode('touch');
    else setMode('direct');
    field.focus({ preventScroll: true });
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false, inside: true };
    try { field.setPointerCapture(event.pointerId); }
    catch { /* Pointer capture may be unavailable for synthetic input. */ }
  });

  field.addEventListener('pointermove', (event) => {
    if (state !== 'running' || !gesture || gesture.id !== event.pointerId) return;
    if (!normalizedPoint(event)) {
      gesture.inside = false;
      gesture.dragged = true;
      return;
    }
    if (!gesture.inside) {
      gesture.x = event.clientX;
      gesture.y = event.clientY;
      gesture.inside = true;
      return;
    }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragged && Math.hypot(dx, dy) < 5) return;
    gesture.dragged = true;
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    turn(dx, dy);
    if (event.pointerType === 'touch') fire(.5, .5, { countMiss: false });
  });

  field.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const shouldShoot = event.pointerType !== 'touch' && !gesture.dragged && event.button === 0;
    const point = normalizedPoint(event);
    releaseGesture();
    if (shouldShoot && point) fire(point.u, point.v);
  });
  field.addEventListener('pointercancel', (event) => {
    resumePointer = false;
    if (gesture?.id === event.pointerId) releaseGesture();
  });
  field.addEventListener('lostpointercapture', (event) => {
    if (gesture?.id === event.pointerId) gesture = null;
  });
  field.addEventListener('click', (event) => {
    if (state === 'paused' && resumePointer && event.button === 0) begin(event);
    resumePointer = false;
  });

  field.addEventListener('mousemove', (event) => {
    if (state === 'running' && document.pointerLockElement === field) turn(event.movementX, event.movementY);
  });
  field.addEventListener('contextmenu', (event) => {
    if (document.pointerLockElement === field) event.preventDefault();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === field) {
      if (state === 'running' && awaitingLock && document.activeElement === field) {
        awaitingLock = false;
        releaseGesture();
        setMode('locked');
      } else if (mode !== 'locked') releaseLock();
    } else if (mode === 'locked') pause();
  });
  document.addEventListener('pointerlockerror', () => { awaitingLock = false; });
  field.addEventListener('focusout', (event) => {
    if ((mode === 'locked' || awaitingLock) && !field.contains(event.relatedTarget)) pause();
  });

  field.addEventListener('keydown', (event) => {
    if (event.target !== field || event.altKey || event.ctrlKey || event.metaKey) return;
    const isShot = event.key === ' ' || event.key === 'Enter';
    if (event.key === 'Escape' && state === 'running') {
      event.preventDefault();
      pause();
    } else if (isShot && state === 'paused') {
      event.preventDefault();
      if (!event.repeat) begin(event);
    } else if (state === 'running') {
      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!isShot && !arrows[event.key]) return;
      event.preventDefault();
      if (document.pointerLockElement !== field) setMode('keyboard');
      if (isShot) {
        if (!event.repeat) fire(.5, .5);
      } else turn(...arrows[event.key], .035);
    }
  });
  [start, stageAction].forEach((button) => button.addEventListener('keydown', (event) => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  }));

  document.addEventListener('portfolio:language', () => {
    renderCopy();
    renderResult();
    if (state === 'finished') {
      announceResult();
    } else if (state === 'paused') {
      announce('Practice paused. Choose Resume to continue.', '训练已暂停，点击“继续训练”可接着打靶。');
    } else status.textContent = '';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', () => {
    pause();
    releaseLock();
    if (viewportFallback) setViewportFallback(false);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });
  window.addEventListener('pageshow', redraw);
  if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(field);
  else window.addEventListener('resize', redraw, { passive: true });

  sensitivityValue.textContent = `${multiplier().toFixed(2)}×`;
  sceneState.targets = scene.preview.slice();
  range.hidden = false;
  updateControls();
  syncFullscreen();
})();
