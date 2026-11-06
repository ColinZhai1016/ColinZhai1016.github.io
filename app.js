(() => {
  'use strict';

  document.documentElement.classList.add('js');

  function initialize() {
    const body = document.body;
    const t = (english, chinese) => window.portfolioLanguage?.text(english, chinese) ?? english;
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const navigation = document.getElementById('site-navigation');
    const mobileQuery = window.matchMedia('(max-width: 760px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const siteHeader = document.querySelector('[data-site-header]');
    const darkHeaderSections = Array.from(document.querySelectorAll('.tennis-project, .aim-range'));

    function setMenuOpen(open) {
      if (!menuToggle || !navigation) return;
      const isOpen = Boolean(open && mobileQuery.matches);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? t('Close navigation', '关闭导航') : t('Open navigation', '打开导航'));
      if (body) body.classList.toggle('menu-open', isOpen);
    }

    if (menuToggle && navigation) {
      menuToggle.addEventListener('click', () => {
        setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
      });

      navigation.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('a')) {
          setMenuOpen(false);
        }
      });

      document.addEventListener('click', (event) => {
        if (!siteHeader?.contains(event.target)) {
          setMenuOpen(false);
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
          setMenuOpen(false);
          menuToggle.focus({ preventScroll: true });
        }
      });

      document.addEventListener('portfolio:language', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') === 'true'));
      setMenuOpen(false);
    }

    // 导航状态与页眉外观共用同一轮滚动更新。
    const navigationItems = navigation
      ? Array.from(navigation.querySelectorAll('a[href]'))
        .filter((link) => ['#home', '#about', '#projects', '#help', '#email-copy'].includes(link.getAttribute('href')))
        .map((link) => ({
          link,
          section: document.getElementById(link.getAttribute('href') === '#email-copy'
            ? 'contact' : link.getAttribute('href').slice(1))
        }))
        .filter((item) => item.section)
      : [];
    let navigationFrame = 0;

    function updateNavigation() {
      navigationFrame = 0;
      const scrollTop = Math.max(0, window.scrollY);

      if (siteHeader) {
        siteHeader.classList.toggle('is-scrolled', scrollTop > 32);
        const header = siteHeader.getBoundingClientRect();
        const center = header.top + header.height / 2;
        siteHeader.classList.toggle('is-over-dark', darkHeaderSections.some((section) => {
          const rectangle = section.getBoundingClientRect();
          return rectangle.top <= center && rectangle.bottom > center;
        }));
      }

      if (!navigationItems.length) return;
      const scrollPadding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const readingLine = Math.max(scrollPadding + 1, Math.min(window.innerHeight * 0.3, 200));
      let current = navigationItems[0];

      navigationItems.forEach((item) => {
        if (item.section.getBoundingClientRect().top <= readingLine) current = item;
      });

      // 短页脚无法滚到阅读线；到达页底时仍应正确选中联系入口。
      const lastItem = navigationItems[navigationItems.length - 1];
      const atPageEnd = scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atPageEnd && lastItem.section.getBoundingClientRect().top < window.innerHeight) {
        current = lastItem;
      }

      navigationItems.forEach((item) => {
        const isCurrent = item === current;
        item.link.classList.toggle('is-current', isCurrent);
        if (isCurrent) item.link.setAttribute('aria-current', 'location');
        else item.link.removeAttribute('aria-current');
      });
    }

    function scheduleNavigationUpdate() {
      if (!navigationFrame) {
        navigationFrame = window.requestAnimationFrame(updateNavigation);
      }
    }

    window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
    window.addEventListener('resize', () => {
      if (!mobileQuery.matches) setMenuOpen(false);
      scheduleNavigationUpdate();
    }, { passive: true });
    window.addEventListener('hashchange', scheduleNavigationUpdate);
    document.addEventListener('portfolio:language', scheduleNavigationUpdate);
    window.addEventListener('load', scheduleNavigationUpdate, { once: true });
    scheduleNavigationUpdate();

    const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
    let revealObserver = null;

    function showAllReveals() {
      if (revealObserver) revealObserver.disconnect();
      document.documentElement.classList.remove('has-reveal');
      revealElements.forEach((element) => element.classList.add('is-visible'));
    }

    if (revealElements.length && !reducedMotionQuery.matches && 'IntersectionObserver' in window) {
      try {
        revealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
        revealElements.forEach((element) => revealObserver.observe(element));
        document.documentElement.classList.add('has-reveal');
      } catch (error) {
        showAllReveals();
      }
    } else {
      showAllReveals();
    }

    const handleMotionPreference = (event) => {
      if (event.matches) {
        showAllReveals();
        clearGlassLight();
      }
    };
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handleMotionPreference);
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(handleMotionPreference);
    }

    function copyWithSelection(text) {
      const field = document.createElement('textarea');
      const previouslyFocused = document.activeElement;
      field.value = text;
      field.setAttribute('readonly', '');
      field.setAttribute('aria-label', t('Email address to copy', '要复制的邮箱地址'));
      field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
      document.body.appendChild(field);
      let copied = false;
      try {
        field.focus({ preventScroll: true });
        field.select();
        field.setSelectionRange(0, text.length);
        copied = typeof document.execCommand === 'function' && document.execCommand('copy');
      } catch (error) {
        copied = false;
      } finally {
        field.remove();
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus({ preventScroll: true });
        }
      }
      return copied;
    }

    document.querySelectorAll('[data-copy-email]').forEach((button) => {
      const label = button.querySelector('[data-copy-label]');
      const status = document.querySelector('[data-copy-status]');
      const email = button.getAttribute('data-email');
      let pending = false;
      let resetTimer = 0;
      let feedback = null;
      let showCopied = false;
      if (!email) return;

      function renderCopyFeedback() {
        const buttonText = showCopied ? t('Copied!', '已复制！') : t('Copy email', '复制邮箱');
        const message = feedback === 'copied' ? t('Email address copied.', '邮箱地址已复制。')
          : feedback === 'failed' ? t(`Please copy this email address: ${email}`, `请复制此邮箱地址：${email}`) : '';
        if (label && label.textContent !== buttonText) label.textContent = buttonText;
        if (status && status.textContent !== message) status.textContent = message;
      }

      document.addEventListener('portfolio:language', renderCopyFeedback);
      renderCopyFeedback();
      button.addEventListener('click', async () => {
        if (pending) return;
        pending = true;
        window.clearTimeout(resetTimer);
        button.setAttribute('aria-busy', 'true');
        feedback = null;
        showCopied = false;
        renderCopyFeedback();
        let copied = false;

        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(email);
            copied = true;
          }
        } catch (error) {
          // 本地文件或浏览器权限限制时，尝试真实的选区复制。
        }
        if (!copied) copied = copyWithSelection(email);

        feedback = copied ? 'copied' : 'failed';
        showCopied = copied;
        renderCopyFeedback();
        button.removeAttribute('aria-busy');
        pending = false;
        if (copied && label) {
          resetTimer = window.setTimeout(() => {
            showCopied = false;
            renderCopyFeedback();
          }, 2400);
        }
      });
    });

    const cover = document.querySelector('.cover');
    const glassWords = Array.from(document.querySelectorAll('.cover-word'));
    let glassFrame = 0;
    let glassPointer = null;

    function clearGlassLight() {
      glassPointer = null;
      if (glassFrame) window.cancelAnimationFrame(glassFrame);
      glassFrame = 0;
      glassWords.forEach((word) => {
        word.style.removeProperty('--glass-light');
        word.style.removeProperty('--glass-x');
        word.style.removeProperty('--glass-y');
      });
    }

    function updateGlassLight() {
      glassFrame = 0;
      if (!glassPointer) return;
      const positions = glassWords.map((word) => ({ word, rect: word.getBoundingClientRect() }));
      positions.forEach(({ word, rect }) => {
        const x = glassPointer.x - rect.left;
        const y = glassPointer.y - rect.top;
        const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
        word.style.setProperty('--glass-light', inside ? '1' : '0');
        if (inside) {
          word.style.setProperty('--glass-x', `${x}px`);
          word.style.setProperty('--glass-y', `${y}px`);
        }
      });
    }

    if (cover && glassWords.length) {
      // 监听整个封面，让照片前景挡住文字时也能正确读取鼠标位置。
      cover.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') {
          clearGlassLight();
          return;
        }
        glassPointer = { x: event.clientX, y: event.clientY };
        if (!glassFrame) glassFrame = window.requestAnimationFrame(updateGlassLight);
      }, { passive: true });
      cover.addEventListener('pointerleave', clearGlassLight);
      cover.addEventListener('pointercancel', clearGlassLight);
      window.addEventListener('scroll', clearGlassLight, { passive: true });
      window.addEventListener('resize', clearGlassLight, { passive: true });
      window.addEventListener('blur', clearGlassLight);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearGlassLight();
      });
    }

    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const interestCards = Array.from(document.querySelectorAll('[data-interest-card]'));

    function setInterestOpen(card, open) {
      const toggle = card.querySelector('[data-interest-toggle]');
      const description = card.querySelector('.interest-description');
      if (!toggle || !description) return;
      card.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      description.setAttribute('aria-hidden', String(!open));
    }

    function openInterest(card) {
      interestCards.forEach((item) => setInterestOpen(item, item === card));
    }

    interestCards.forEach((card) => {
      const toggle = card.querySelector('[data-interest-toggle]');
      if (!toggle) return;
      setInterestOpen(card, false);

      card.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse' && hoverQuery.matches) openInterest(card);
      });
      card.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'mouse' && !toggle.matches(':focus-visible')) {
          setInterestOpen(card, false);
        }
      });
      toggle.addEventListener('focus', () => {
        if (toggle.matches(':focus-visible')) openInterest(card);
      });
      toggle.addEventListener('blur', () => setInterestOpen(card, false));
      toggle.addEventListener('click', (event) => {
        // 鼠标悬停即展开；触屏和键盘也可通过按钮切换。
        if (hoverQuery.matches && event.detail > 0 && event.pointerType !== 'touch') {
          openInterest(card);
        } else if (toggle.getAttribute('aria-expanded') === 'true') {
          setInterestOpen(card, false);
        } else {
          openInterest(card);
        }
      });
      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setInterestOpen(card, false);
        }
      });
    });

    document.addEventListener('pointerdown', (event) => {
      interestCards.forEach((card) => {
        if (!card.contains(event.target)) setInterestOpen(card, false);
      });
    });

    const dialog = document.getElementById('gallery-dialog');
    const galleryImage = document.getElementById('gallery-image');
    const galleryCaption = document.getElementById('gallery-caption');
    const galleryCounter = document.getElementById('gallery-counter');

    // 图片地址与说明直接读取页面，避免重复维护资源清单。
    const photos = Array.from(document.querySelectorAll('a[data-photo]'))
      .map((link) => {
        const thumbnail = link.querySelector('img');
        if (!thumbnail || !link.getAttribute('href')) return null;
        const figure = link.closest('figure');
        const caption = figure && figure.querySelector('figcaption');
        return {
          link,
          source: link.href,
          thumbnail,
          caption,
        };
      })
      .filter(Boolean);
    let photoIndex = 0;
    let galleryTrigger = null;
    let galleryTouch = null;

    function showPhoto(index) {
      if (!galleryImage || !photos.length) return;
      photoIndex = (index + photos.length) % photos.length;
      const photo = photos[photoIndex];
      galleryImage.src = photo.source;
      galleryImage.alt = photo.thumbnail.alt;
      if (galleryCaption) galleryCaption.textContent = window.portfolioLanguage?.data(photo.link, 'caption')
        || photo.link.dataset.caption || photo.caption?.textContent.trim() || photo.thumbnail.alt;
      if (galleryCounter) galleryCounter.textContent = `${photoIndex + 1} / ${photos.length}`;
    }

    document.addEventListener('portfolio:language', () => { if (dialog?.open) showPhoto(photoIndex); });

    function finishClosingGallery() {
      galleryTouch = null;
      if (body) body.classList.remove('gallery-open');
      const trigger = galleryTrigger;
      galleryTrigger = null;
      if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        trigger.focus({ preventScroll: true });
      }
    }

    function closeGallery() {
      if (!dialog) return;
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else finishClosingGallery();
    }

    function openGallery(index, trigger) {
      // 不支持原生对话框时，让链接正常打开原图。
      if (!dialog || !galleryImage || !photos.length || typeof dialog.showModal !== 'function') {
        return false;
      }

      showPhoto(index);
      try {
        if (!dialog.open) dialog.showModal();
      } catch (error) {
        return false;
      }

      galleryTrigger = trigger;
      setMenuOpen(false);
      if (body) body.classList.add('gallery-open');
      return true;
    }

    function isPlainClick(event) {
      return !event.defaultPrevented && event.button === 0
        && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    }

    photos.forEach((photo, index) => {
      photo.link.addEventListener('click', (event) => {
        if (isPlainClick(event) && openGallery(index, photo.link)) event.preventDefault();
      });
    });

    document.querySelectorAll('a[data-open-gallery]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (isPlainClick(event) && openGallery(0, link)) event.preventDefault();
      });
    });

    const tennisOrbit = document.querySelector('[data-tennis-orbit]');
    const tennisBall = tennisOrbit && tennisOrbit.querySelector('[data-tennis-ball]');
    if (tennisOrbit && tennisBall) {
      const tennisPhotos = Array.from(tennisOrbit.querySelectorAll('[data-tennis-photo]'));
      const tennisStatus = tennisOrbit.querySelector('[data-tennis-status]');
      const previousPhoto = tennisOrbit.querySelector('[data-tennis-prev]');
      const nextPhoto = tennisOrbit.querySelector('[data-tennis-next]');
      const photoTabIndexes = tennisPhotos.map((photo) => photo.getAttribute('tabindex'));
      const stepAngle = 100;
      const photoStepDelay = 180;
      let revealedCount = -1;
      let photoDirection = 1;
      let photoTravel = 0;
      let previousPhotoTime = -Infinity;
      let rotation = 0;
      let targetRotation = 0;
      let orbitFrame = 0;
      let previousFrameTime = 0;
      let orbitVisible = true;
      let ballDrag = null;
      let suppressClickUntil = 0;

      function updateTennisStatus() {
        if (!tennisStatus) return;
        tennisStatus.textContent = `${revealedCount} / ${tennisPhotos.length}`;
        tennisStatus.setAttribute('aria-label', t(`${revealedCount} of ${tennisPhotos.length} photos revealed`,
          `已展示 ${revealedCount} 张照片，共 ${tennisPhotos.length} 张`));
      }

      document.addEventListener('portfolio:language', updateTennisStatus);

      function setRevealedCount(count) {
        const nextCount = Math.max(0, Math.min(tennisPhotos.length, count));
        if (nextCount === revealedCount) return;
        revealedCount = nextCount;
        tennisOrbit.style.setProperty('--revealed-count', String(nextCount));
        tennisOrbit.setAttribute('data-revealed-count', String(nextCount));
        tennisBall.setAttribute('aria-expanded', String(nextCount > 0));
        tennisPhotos.forEach((photo, index) => {
          const revealed = index < nextCount;
          if (!revealed && photo.contains(document.activeElement)) {
            tennisBall.focus({ preventScroll: true });
          }
          photo.classList.toggle('is-revealed', revealed);
          photo.setAttribute('aria-hidden', String(!revealed));
          if (!revealed) photo.setAttribute('tabindex', '-1');
          else if (photoTabIndexes[index] === null) photo.removeAttribute('tabindex');
          else photo.setAttribute('tabindex', photoTabIndexes[index]);
        });
        updateTennisStatus();
      }

      function renderBall() {
        tennisBall.style.setProperty('--ball-rotation', `${rotation.toFixed(3)}deg`);
      }

      function advancePhotoCycle() {
        if (revealedCount >= tennisPhotos.length) photoDirection = -1;
        else if (revealedCount <= 0) photoDirection = 1;
        setRevealedCount(revealedCount + photoDirection);
      }

      function animateBall(time) {
        orbitFrame = 0;
        const elapsed = previousFrameTime ? Math.min(40, time - previousFrameTime) : 16;
        previousFrameTime = time;
        // 每个进出步骤都留出可见时间，避免大幅滚动在同一帧跳过整个循环。
        if (photoTravel >= stepAngle && time - previousPhotoTime >= photoStepDelay) {
          photoTravel -= stepAngle;
          previousPhotoTime = time;
          advancePhotoCycle();
        }
        const difference = targetRotation - rotation;
        if (reducedMotionQuery.matches || !orbitVisible || document.hidden || Math.abs(difference) < 0.06) {
          rotation = targetRotation;
        } else {
          rotation += difference * (1 - Math.exp(-elapsed / 52));
        }
        renderBall();
        if (orbitVisible && !document.hidden
          && (photoTravel >= stepAngle || (!reducedMotionQuery.matches && Math.abs(targetRotation - rotation) >= 0.06))) {
          orbitFrame = window.requestAnimationFrame(animateBall);
        } else {
          previousFrameTime = 0;
        }
      }

      function queueBallRotation(angle) {
        targetRotation += angle;
        if (reducedMotionQuery.matches || !orbitVisible || document.hidden) {
          if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
          orbitFrame = 0;
          previousFrameTime = 0;
          rotation = targetRotation;
          renderBall();
        }
        if (orbitVisible && !document.hidden && !orbitFrame) {
          orbitFrame = window.requestAnimationFrame(animateBall);
        }
      }

      function turnBall(angle) {
        if (!Number.isFinite(angle) || !angle) return;
        // 旋转方向跟随手势；照片仅按累计路程循环，与上下方向无关。
        // 最多缓冲一轮，快速甩动后也不会积压长时间的动画。
        photoTravel = Math.min(photoTravel + Math.abs(angle), stepAngle * tennisPhotos.length * 2);
        queueBallRotation(angle);
      }

      function stepPhotos(direction) {
        photoTravel = 0;
        previousPhotoTime = performance.now();
        advancePhotoCycle();
        queueBallRotation(direction * stepAngle);
      }

      function finishBallDrag(event) {
        if (!ballDrag || (event && event.pointerId !== ballDrag.id)) return;
        const finishedDrag = ballDrag;
        ballDrag = null;
        tennisBall.classList.remove('is-dragging');
        if (finishedDrag.moved) suppressClickUntil = performance.now() + 500;
        try {
          if (tennisBall.hasPointerCapture(finishedDrag.id)) {
            tennisBall.releasePointerCapture(finishedDrag.id);
          }
        } catch (error) {
          // 浏览器可能已在取消手势时自行释放捕获。
        }
      }

      function stopBallMotion() {
        finishBallDrag();
        if (orbitFrame) window.cancelAnimationFrame(orbitFrame);
        orbitFrame = 0;
        previousFrameTime = 0;
        photoTravel = 0;
        rotation = targetRotation;
        renderBall();
      }

      function isPointerOnBall(event) {
        const rectangle = tennisBall.getBoundingClientRect();
        if (!rectangle.width || !rectangle.height) return false;
        const x = (event.clientX - rectangle.left - rectangle.width / 2) / (rectangle.width / 2);
        const y = (event.clientY - rectangle.top - rectangle.height / 2) / (rectangle.height / 2);
        return x * x + y * y <= 1;
      }

      // 在捕获阶段接管球内的滚动，照片叠到球上时也不会把手势漏给页面。
      tennisOrbit.addEventListener('wheel', (event) => {
        if (event.ctrlKey || !orbitVisible || (dialog && dialog.open) || !isPointerOnBall(event)) return;
        event.preventDefault();
        event.stopPropagation();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
        const distance = Math.max(-600, Math.min(600, (event.deltaY || event.deltaX) * unit));
        turnBall(distance * 0.72);
      }, { capture: true, passive: false });

      tennisBall.addEventListener('contextmenu', (event) => event.preventDefault());
      tennisBall.addEventListener('dragstart', (event) => event.preventDefault());
      tennisBall.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2)) return;
        suppressClickUntil = 0;
        ballDrag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastY: event.clientY, moved: false };
        tennisBall.focus({ preventScroll: true });
        try {
          tennisBall.setPointerCapture(event.pointerId);
        } catch (error) {
          // 点击仍可作为不依赖指针捕获的替代操作。
        }
        if (event.button === 2) event.preventDefault();
      });
      tennisBall.addEventListener('pointermove', (event) => {
        if (!ballDrag || ballDrag.id !== event.pointerId) return;
        if (event.pointerType === 'mouse' && event.buttons === 0) {
          finishBallDrag(event);
          return;
        }
        if (!ballDrag.moved) {
          if (Math.hypot(event.clientX - ballDrag.startX, event.clientY - ballDrag.startY) < 5) return;
          ballDrag.moved = true;
          tennisBall.classList.add('is-dragging');
        }
        const distance = event.clientY - ballDrag.lastY;
        ballDrag.lastY = event.clientY;
        turnBall(distance * 0.8);
      });
      tennisBall.addEventListener('pointerup', finishBallDrag);
      tennisBall.addEventListener('pointercancel', finishBallDrag);
      tennisBall.addEventListener('lostpointercapture', finishBallDrag);
      tennisBall.addEventListener('click', (event) => {
        if (event.detail > 0 && performance.now() < suppressClickUntil) {
          event.preventDefault();
          return;
        }
        stepPhotos(1);
      });
      tennisBall.addEventListener('keydown', (event) => {
        let direction = 0;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') direction = 1;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') direction = -1;
        if (direction) {
          event.preventDefault();
          stepPhotos(direction);
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          const nextCount = event.key === 'Home' ? 0 : tennisPhotos.length;
          const distance = nextCount - revealedCount;
          photoTravel = 0;
          photoDirection = nextCount === 0 ? 1 : -1;
          previousPhotoTime = performance.now();
          setRevealedCount(nextCount);
          queueBallRotation(distance * stepAngle);
        }
      });
      if (previousPhoto) previousPhoto.addEventListener('click', () => stepPhotos(-1));
      if (nextPhoto) nextPhoto.addEventListener('click', () => stepPhotos(1));

      if ('IntersectionObserver' in window) {
        const ballObserver = new IntersectionObserver((entries) => {
          orbitVisible = entries.some((entry) => entry.isIntersecting);
          if (!orbitVisible) stopBallMotion();
        });
        ballObserver.observe(tennisBall);
      } else {
        window.addEventListener('scroll', () => {
          const rectangle = tennisBall.getBoundingClientRect();
          orbitVisible = rectangle.bottom > 0 && rectangle.top < window.innerHeight;
          if (!orbitVisible) stopBallMotion();
        }, { passive: true });
      }
      window.addEventListener('resize', stopBallMotion, { passive: true });
      window.addEventListener('blur', stopBallMotion);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopBallMotion();
      });
      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', stopBallMotion);
      } else if (typeof reducedMotionQuery.addListener === 'function') {
        reducedMotionQuery.addListener(stopBallMotion);
      }
      setRevealedCount(0);
      renderBall();
    }

    if (dialog) {
      // 保留上下滚动和双指缩放，只将明确的单指横滑用于切换照片。
      if (galleryImage) {
        galleryImage.addEventListener('pointerdown', (event) => {
          galleryTouch = dialog.open && event.pointerType === 'touch' && event.isPrimary
            ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
        }, { passive: true });
        galleryImage.addEventListener('pointerup', (event) => {
          const start = galleryTouch;
          galleryTouch = null;
          if (!start || start.id !== event.pointerId || !dialog.open) return;
          const horizontal = event.clientX - start.x;
          const vertical = event.clientY - start.y;
          if (Math.abs(horizontal) >= 48 && Math.abs(horizontal) > Math.abs(vertical) * 1.5) {
            showPhoto(photoIndex + (horizontal < 0 ? 1 : -1));
          }
        }, { passive: true });
        galleryImage.addEventListener('pointercancel', () => { galleryTouch = null; }, { passive: true });
      }

      dialog.querySelectorAll('[data-gallery-close]').forEach((button) => {
        button.addEventListener('click', closeGallery);
      });
      dialog.querySelectorAll('[data-gallery-prev]').forEach((button) => {
        button.addEventListener('click', () => showPhoto(photoIndex - 1));
      });
      dialog.querySelectorAll('[data-gallery-next]').forEach((button) => {
        button.addEventListener('click', () => showPhoto(photoIndex + 1));
      });

      dialog.addEventListener('keydown', (event) => {
        if (!dialog.open) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
      });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeGallery();
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right
          || event.clientY < bounds.top || event.clientY > bounds.bottom) closeGallery();
      });
      dialog.addEventListener('close', finishClosingGallery);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
