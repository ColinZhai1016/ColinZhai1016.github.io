(() => {
  'use strict';

  const gallery = document.querySelector('[data-music-gallery]');
  const track = gallery?.querySelector('[data-music-track]');
  const records = track ? [...track.querySelectorAll('[data-music-record]')] : [];
  if (!track || !records.length) return;

  const previous = gallery.querySelector('[data-music-prev]');
  const next = gallery.querySelector('[data-music-next]');
  const current = gallery.querySelector('[data-music-current]');
  const total = gallery.querySelector('[data-music-total]');
  const status = gallery.querySelector('[data-music-status]');
  const t = (english, chinese) => window.portfolioLanguage?.text(english, chinese) ?? english;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const formatNumber = (number) => String(number).padStart(2, '0');
  const clampIndex = (index) => Math.max(0, Math.min(records.length - 1, index));
  let activeIndex = 0;
  let settledIndex = 0;
  let navigationIndex = null;
  let drag = null;
  let savedScrollStyles = null;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let trackWidth = track.clientWidth;
  let settleTimer = 0;

  const maximumScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const viewportCenter = () => {
    const bounds = track.getBoundingClientRect();
    return bounds.left + track.clientLeft + track.clientWidth / 2;
  };

  function nearestIndex() {
    if (track.scrollLeft <= 1) return 0;
    if (maximumScroll() - track.scrollLeft <= 1) return records.length - 1;
    const center = viewportCenter();
    let nearest = 0;
    let smallestDistance = Infinity;
    records.forEach((record, index) => {
      const bounds = record.getBoundingClientRect();
      const distance = Math.abs(bounds.left + bounds.width / 2 - center);
      if (distance < smallestDistance) {
        nearest = index;
        smallestDistance = distance;
      }
    });
    return nearest;
  }

  function announce() {
    if (!status) return;
    const title = records[activeIndex].dataset.title;
    status.textContent = t(`Record ${activeIndex + 1} of ${records.length}${title ? `: ${title}` : ''}.`,
      `第 ${activeIndex + 1} 首，共 ${records.length} 首${title ? `：${title}` : ''}。`);
  }

  function updateActive(index) {
    activeIndex = clampIndex(index);
    records.forEach((record, recordIndex) => {
      const isActive = recordIndex === activeIndex;
      record.classList.toggle('is-active', isActive);
      record.classList.toggle('is-before', recordIndex === activeIndex - 1);
      record.classList.toggle('is-after', recordIndex === activeIndex + 1);
      if (isActive) record.setAttribute('aria-current', 'true');
      else record.removeAttribute('aria-current');
    });
    if (current) current.textContent = formatNumber(activeIndex + 1);
    const focused = document.activeElement;
    if (previous) previous.disabled = activeIndex === 0;
    if (next) next.disabled = activeIndex === records.length - 1;
    if ((focused === previous || focused === next) && focused?.disabled) {
      track.focus({ preventScroll: true });
    }
  }

  function goTo(index, behavior = reducedMotion.matches ? 'auto' : 'smooth') {
    index = clampIndex(index);
    navigationIndex = index;
    const bounds = records[index].getBoundingClientRect();
    const centered = track.scrollLeft + bounds.left + bounds.width / 2 - viewportCenter();
    const left = Math.max(0, Math.min(maximumScroll(), centered));
    track.scrollTo({ left, behavior });
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, behavior === 'smooth' ? 220 : 0);
  }

  function settle() {
    if (drag) return;
    navigationIndex = null;
    const index = nearestIndex();
    if (index !== activeIndex) updateActive(index);
    if (index !== settledIndex) {
      settledIndex = index;
      announce();
    }
  }

  // Temporarily release snapping so mouse gestures follow the hand directly.
  function beginDirectScroll() {
    if (savedScrollStyles) return;
    savedScrollStyles = {
      snap: track.style.scrollSnapType,
      behavior: track.style.scrollBehavior,
      selection: track.style.userSelect,
    };
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    track.style.userSelect = 'none';
  }

  function endDirectScroll() {
    if (!savedScrollStyles) return;
    track.style.scrollSnapType = savedScrollStyles.snap;
    track.style.scrollBehavior = savedScrollStyles.behavior;
    track.style.userSelect = savedScrollStyles.selection;
    savedScrollStyles = null;
  }

  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const finishedDrag = drag;
    drag = null;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(finishedDrag.id)) track.releasePointerCapture(finishedDrag.id);
    const index = nearestIndex();
    endDirectScroll();
    goTo(index, event?.type === 'pointercancel' ? 'auto' : undefined);
  }

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 2 || drag) return;
    window.clearTimeout(settleTimer);
    navigationIndex = null;
    beginDirectScroll();
    drag = { id: event.pointerId, x: event.clientX, scroll: track.scrollLeft, moved: false };
    track.focus({ preventScroll: true });
    track.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  track.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 4) {
      drag.moved = true;
      track.classList.add('is-dragging');
    }
    if (!drag.moved) return;
    event.preventDefault();
    track.scrollLeft = Math.max(0, Math.min(maximumScroll(), drag.scroll - distance));
  });

  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('contextmenu', (event) => event.preventDefault());
  track.addEventListener('dragstart', (event) => event.preventDefault());

  track.addEventListener('scroll', () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const index = nearestIndex();
        if (index !== activeIndex) updateActive(index);
      });
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 180);
  }, { passive: true });
  track.addEventListener('scrollend', settle);

  function navigate(index) {
    if (drag) finishDrag();
    goTo(index);
  }

  track.addEventListener('click', (event) => {
    if (drag || event.defaultPrevented || event.button !== 0
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = records.indexOf(event.target.closest('[data-music-record]'));
    if (index !== -1) navigate(index);
  });
  previous?.addEventListener('click', () => navigate((navigationIndex ?? activeIndex) - 1));
  next?.addEventListener('click', () => navigate((navigationIndex ?? activeIndex) + 1));
  track.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable) return;
    const index = navigationIndex ?? activeIndex;
    const destinations = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: records.length - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(destinations[event.key]);
  });

  function recenter() {
    // Caption height changes do not affect horizontal centering.
    const width = track.clientWidth;
    if (width === trackWidth) return;
    trackWidth = width;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!drag) {
        settledIndex = activeIndex;
        goTo(navigationIndex ?? activeIndex, 'auto');
      }
    });
  }

  if ('ResizeObserver' in window) new ResizeObserver(recenter).observe(track);
  else window.addEventListener('resize', recenter, { passive: true });
  if (total) total.textContent = formatNumber(records.length);
  gallery.classList.add('is-enhanced');
  document.addEventListener('portfolio:language', announce);
  updateActive(0);
  announce();
  window.requestAnimationFrame(() => goTo(0, 'auto'));
})();
