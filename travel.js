(() => {
  'use strict';

  const gallery = document.querySelector('[data-travel-gallery]');
  const track = gallery?.querySelector('[data-travel-track]');
  const items = track ? [...track.querySelectorAll('[data-travel-item]')] : [];
  if (!track || !items.length) return;

  const previous = gallery.querySelector('[data-travel-prev]');
  const next = gallery.querySelector('[data-travel-next]');
  const current = gallery.querySelector('[data-travel-current]');
  const total = gallery.querySelector('[data-travel-total]');
  const status = gallery.querySelector('[data-travel-status]');
  const filters = [...document.querySelectorAll('[data-travel-filter]')];
  const t = (english, chinese) => window.portfolioLanguage?.text(english, chinese) ?? english;
  const itemTitle = (item) => window.portfolioLanguage?.data(item, 'title')
    || item.dataset.title || t('Travel moment', '旅行照片');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(any-pointer: fine)');
  const formatNumber = (number) => String(number).padStart(2, '0');
  let visibleItems = items.slice();
  let activeIndex = 0;
  let settledIndex = 0;
  let navigationIndex = null;
  let drag = null;
  let savedScrollStyles = null;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let trackWidth = track.clientWidth;
  let filterFrame = 0;
  let settleTimer = 0;

  const clampIndex = (index) => Math.max(0, Math.min(visibleItems.length - 1, index));
  const maximumScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const viewportCenter = () => {
    const bounds = track.getBoundingClientRect();
    return bounds.left + track.clientLeft + track.clientWidth / 2;
  };

  function nearestIndex() {
    if (!visibleItems.length || track.scrollLeft <= 1) return 0;
    if (maximumScroll() - track.scrollLeft <= 1) return visibleItems.length - 1;
    const center = viewportCenter();
    let nearest = 0;
    let smallestDistance = Infinity;
    visibleItems.forEach((item, index) => {
      const bounds = item.getBoundingClientRect();
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
    if (!visibleItems.length) {
      status.textContent = t('No travel moments in this selection.', '这个分类暂无照片。');
      return;
    }
    const title = itemTitle(visibleItems[activeIndex]);
    status.textContent = t(`Moment ${activeIndex + 1} of ${visibleItems.length}: ${title}.`,
      `第 ${activeIndex + 1} 张，共 ${visibleItems.length} 张：${title}。`);
  }

  function updateActive(index) {
    activeIndex = clampIndex(index);
    const activeItem = visibleItems[activeIndex];
    items.forEach((item) => {
      const isActive = item === activeItem;
      item.classList.toggle('is-active', isActive);
      item.classList.toggle('is-before', item === visibleItems[activeIndex - 1]);
      item.classList.toggle('is-after', item === visibleItems[activeIndex + 1]);
      if (isActive) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    if (current) current.textContent = formatNumber(visibleItems.length ? activeIndex + 1 : 0);
    if (total) total.textContent = formatNumber(visibleItems.length);
    const focused = document.activeElement;
    if (previous) previous.disabled = !visibleItems.length || activeIndex === 0;
    if (next) next.disabled = !visibleItems.length || activeIndex === visibleItems.length - 1;
    if ((focused === previous || focused === next) && focused?.disabled) {
      track.focus({ preventScroll: true });
    }
  }

  function goTo(index, behavior = reducedMotion.matches ? 'auto' : 'smooth') {
    if (!visibleItems.length) return;
    index = clampIndex(index);
    navigationIndex = index;
    const bounds = visibleItems[index].getBoundingClientRect();
    const centered = track.scrollLeft + bounds.left + bounds.width / 2 - viewportCenter();
    const left = Math.max(0, Math.min(maximumScroll(), centered));
    track.scrollTo({ left, behavior });
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, behavior === 'smooth' ? 220 : 0);
  }

  function settle() {
    if (drag || filterFrame) return;
    navigationIndex = null;
    const index = nearestIndex();
    if (index !== activeIndex) updateActive(index);
    if (index !== settledIndex) {
      settledIndex = index;
      announce();
    }
  }

  // Mouse dragging follows horizontal movement only; touch keeps native scrolling.
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
    if (event.pointerType !== 'mouse' || event.button !== 2 || drag || !visibleItems.length) return;
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
  window.addEventListener('blur', () => finishDrag());
  track.addEventListener('contextmenu', (event) => event.preventDefault());
  track.addEventListener('dragstart', (event) => event.preventDefault());

  track.addEventListener('scroll', () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const index = nearestIndex();
        if (!filterFrame && index !== activeIndex) updateActive(index);
      });
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 180);
  }, { passive: true });
  track.addEventListener('scrollend', settle);

  function navigate(index) {
    if (drag) finishDrag();
    if (filterFrame) {
      window.cancelAnimationFrame(filterFrame);
      filterFrame = 0;
      endDirectScroll();
    }
    goTo(index);
  }

  previous?.addEventListener('click', () => navigate((navigationIndex ?? activeIndex) - 1));
  next?.addEventListener('click', () => navigate((navigationIndex ?? activeIndex) + 1));
  track.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable
      || event.target.closest('input, textarea, select')) return;
    const index = navigationIndex ?? activeIndex;
    const destinations = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: visibleItems.length - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(destinations[event.key]);
  });

  function updateItemLabels() {
    visibleItems.forEach((item, index) => {
      const title = itemTitle(item);
      item.setAttribute('aria-label', t(`${index + 1} of ${visibleItems.length}: ${title}`,
        `第 ${index + 1} 张，共 ${visibleItems.length} 张：${title}`));
    });
  }

  function applyFilter(value) {
    if (drag) finishDrag();
    window.clearTimeout(settleTimer);
    window.cancelAnimationFrame(filterFrame);
    navigationIndex = null;
    beginDirectScroll();
    items.forEach((item) => {
      const cities = (item.dataset.cities || '').split(/\s+/);
      item.hidden = value !== 'all' && !cities.includes(value);
    });
    visibleItems = items.filter((item) => !item.hidden);
    updateItemLabels();
    filters.forEach((button) => {
      const selected = button.dataset.travelFilter === value;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-current', selected);
    });
    gallery.dataset.currentFilter = value;
    settledIndex = 0;
    updateActive(0);
    track.scrollTo({ left: 0, behavior: 'auto' });
    filterFrame = window.requestAnimationFrame(() => {
      filterFrame = 0;
      endDirectScroll();
      goTo(0, 'auto');
      announce();
    });
  }

  filters.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.travelFilter || 'all'));
  });

  function recenter() {
    // Caption height changes do not affect horizontal centering.
    const width = track.clientWidth;
    if (width === trackWidth) return;
    trackWidth = width;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (!drag && !filterFrame) {
        settledIndex = activeIndex;
        goTo(navigationIndex ?? activeIndex, 'auto');
      }
    });
  }

  if ('ResizeObserver' in window) new ResizeObserver(recenter).observe(track);
  else window.addEventListener('resize', recenter, { passive: true });

  const dialog = document.getElementById('travel-dialog');
  const media = dialog?.querySelector('[data-travel-media]');
  const caption = dialog?.querySelector('[data-travel-caption]');
  const dialogCount = dialog?.querySelector('[data-travel-dialog-count]');
  const dialogClose = dialog?.querySelector('[data-travel-close]');
  const dialogPrevious = dialog?.querySelector('[data-travel-dialog-prev]');
  const dialogNext = dialog?.querySelector('[data-travel-dialog-next]');
  let viewerItems = [];
  let viewerIndex = 0;
  let viewerTrigger = null;
  let viewerTouch = null;

  function clearMedia() {
    if (!media) return;
    media.replaceChildren();
  }

  function showMedia(index) {
    if (!media || !viewerItems.length) return;
    viewerIndex = Math.max(0, Math.min(viewerItems.length - 1, index));
    const item = viewerItems[viewerIndex];
    const thumbnail = item.querySelector('img');
    const title = itemTitle(item);
    const alt = window.portfolioLanguage?.data(item, 'alt') || item.dataset.alt || thumbnail?.alt || title;
    clearMedia();
    viewerTouch = null;
    const element = document.createElement('img');
    element.alt = alt;
    element.decoding = 'async';
    element.draggable = false;
    element.src = item.dataset.src;
    media.appendChild(element);
    if (caption) caption.textContent = title;
    if (dialogCount) dialogCount.textContent = `${formatNumber(viewerIndex + 1)} / ${formatNumber(viewerItems.length)}`;
    const focused = document.activeElement;
    if (dialogPrevious) dialogPrevious.disabled = viewerIndex === 0;
    if (dialogNext) dialogNext.disabled = viewerIndex === viewerItems.length - 1;
    if ((focused === dialogPrevious || focused === dialogNext) && focused?.disabled) {
      const opposite = focused === dialogPrevious ? dialogNext : dialogPrevious;
      (opposite && !opposite.disabled ? opposite : dialogClose)?.focus({ preventScroll: true });
    }
  }

  function navigateViewer(index) {
    if (index === viewerIndex || !viewerItems[index]) return;
    showMedia(index);
  }

  function finishClosingViewer() {
    clearMedia();
    viewerTouch = null;
    viewerItems = [];
    document.body.classList.remove('gallery-open', 'travel-viewer-open');
    const trigger = viewerTrigger;
    viewerTrigger = null;
    if (trigger?.isConnected && !trigger.closest('[hidden]')) trigger.focus({ preventScroll: true });
  }

  function closeViewer() {
    clearMedia();
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    else finishClosingViewer();
  }

  function openViewer(item, trigger) {
    if (!item.dataset.src) return;
    if (!dialog || !media || typeof dialog.showModal !== 'function') {
      window.open(item.dataset.src, '_blank', 'noopener');
      return;
    }
    viewerItems = visibleItems.slice();
    const index = viewerItems.indexOf(item);
    if (index < 0) return;
    try {
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      window.open(item.dataset.src, '_blank', 'noopener');
      return;
    }
    viewerTrigger = trigger;
    document.body.classList.add('gallery-open', 'travel-viewer-open');
    showMedia(index);
  }

  track.addEventListener('click', (event) => {
    if (drag) {
      event.preventDefault();
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const item = event.target.closest('[data-travel-item]');
    const index = visibleItems.indexOf(item);
    if (index < 0) return;
    const mouseClick = event.detail > 0
      && (event.pointerType === 'mouse' || (!event.pointerType && finePointer.matches));
    if (mouseClick && index !== activeIndex) {
      event.preventDefault();
      navigate(index);
      return;
    }
    const trigger = event.target.closest('[data-travel-open]');
    if (!trigger) return;
    event.preventDefault();
    openViewer(item, trigger);
  });

  if (dialog) {
    dialogClose?.addEventListener('click', closeViewer);
    dialogPrevious?.addEventListener('click', () => navigateViewer(viewerIndex - 1));
    dialogNext?.addEventListener('click', () => navigateViewer(viewerIndex + 1));
    dialog.addEventListener('keydown', (event) => {
      if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey
        || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      event.stopPropagation();
      navigateViewer(viewerIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) closeViewer();
    });
    dialog.addEventListener('close', finishClosingViewer);
    media?.addEventListener('pointerdown', (event) => {
      viewerTouch = dialog.open && event.pointerType === 'touch' && event.isPrimary
        && event.target instanceof HTMLImageElement
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }, { passive: true });
    media?.addEventListener('pointerup', (event) => {
      const start = viewerTouch;
      viewerTouch = null;
      if (!start || start.id !== event.pointerId || !dialog.open) return;
      const horizontal = event.clientX - start.x;
      const vertical = event.clientY - start.y;
      if (Math.abs(horizontal) >= 48 && Math.abs(horizontal) > Math.abs(vertical) * 1.5) {
        navigateViewer(viewerIndex + (horizontal < 0 ? 1 : -1));
      }
    }, { passive: true });
    media?.addEventListener('pointercancel', () => { viewerTouch = null; }, { passive: true });
  }

  gallery.classList.add('is-enhanced');
  document.addEventListener('portfolio:language', () => {
    updateItemLabels();
    announce();
    if (dialog?.open) showMedia(viewerIndex);
  });
  applyFilter(filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.travelFilter || 'all');
})();
