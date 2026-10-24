(() => {
  const doc = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.progress span');
  const pointerGlow = document.querySelector('.pointer-glow');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateScroll = () => {
    const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    const amount = Math.min(1, Math.max(0, window.scrollY / scrollable));
    progress.style.transform = `scaleX(${amount})`;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 4, 3) * 45}ms`;
      revealObserver.observe(item);
    });
  }

  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let pointerFrame;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      body.classList.add('pointer-active');
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerGlow.style.left = `${pointerX}px`;
        pointerGlow.style.top = `${pointerY}px`;
        pointerFrame = null;
      });
    }, { passive: true });
  }

  document.querySelectorAll('[data-spotlight]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    });
  });

  const tilt = document.querySelector('[data-tilt]');
  const tiltFrame = tilt?.querySelector('.portrait-frame');
  if (tilt && tiltFrame && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    tilt.addEventListener('pointermove', (event) => {
      const rect = tilt.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      tiltFrame.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
    });
    tilt.addEventListener('pointerleave', () => {
      tiltFrame.style.transform = '';
    });
  }

  const menuButton = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const closeMobileMenu = () => {
    mobileMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  };

  menuButton?.addEventListener('click', () => {
    const opening = mobileMenu.hidden;
    mobileMenu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    body.classList.toggle('menu-open', opening);
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileMenu));

  const timeElement = document.querySelector('[data-time]');
  const updateTime = () => {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
    timeElement.textContent = `${time} GMT+7`;
  };
  updateTime();
  window.setInterval(updateTime, 60_000);

  document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  const toast = document.querySelector('[data-toast]');
  let toastTimer;
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };

  const copyEmail = async () => {
    const email = 'egorlas1996@gmail.com';
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const input = document.createElement('textarea');
      input.value = email;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    showToast('Email copied to clipboard');
  };
  document.querySelectorAll('[data-copy-email]').forEach((button) => button.addEventListener('click', copyEmail));

  const dialog = document.querySelector('[data-command-dialog]');
  const commandInput = document.querySelector('[data-command-input]');
  const commandButtons = [...document.querySelectorAll('[data-command]')];
  let activeIndex = 0;

  const visibleCommands = () => commandButtons.filter((button) => !button.hidden);
  const setActive = (index) => {
    const visible = visibleCommands();
    if (!visible.length) return;
    activeIndex = (index + visible.length) % visible.length;
    commandButtons.forEach((button) => button.classList.remove('is-active'));
    visible[activeIndex].classList.add('is-active');
    visible[activeIndex].scrollIntoView({ block: 'nearest' });
  };

  const openCommand = () => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    body.classList.add('menu-open');
    commandInput.value = '';
    commandButtons.forEach((button) => { button.hidden = false; });
    setActive(0);
    window.setTimeout(() => commandInput.focus(), 0);
  };

  const closeCommand = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    body.classList.remove('menu-open');
  };

  const goTo = (id) => {
    closeCommand();
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const runCommand = (command) => {
    if (['work', 'products', 'stack', 'contact'].includes(command)) {
      goTo(command);
      return;
    }
    if (command === 'copy') {
      closeCommand();
      copyEmail();
      return;
    }
    if (command === 'cv') {
      closeCommand();
      const link = document.createElement('a');
      link.href = 'assets/ngo-vuong-cv.pdf';
      link.download = 'CV - Ngo Vuong.pdf';
      link.click();
    }
  };

  document.querySelectorAll('[data-command-open]').forEach((button) => button.addEventListener('click', openCommand));
  document.querySelectorAll('[data-command-close]').forEach((button) => button.addEventListener('click', closeCommand));
  commandButtons.forEach((button) => button.addEventListener('click', () => runCommand(button.dataset.command)));

  commandInput?.addEventListener('input', () => {
    const query = commandInput.value.trim().toLowerCase();
    commandButtons.forEach((button) => {
      button.hidden = !button.textContent.toLowerCase().includes(query);
    });
    setActive(0);
  });

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeCommand();
  });

  dialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCommand();
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
    const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (commandShortcut) {
      event.preventDefault();
      dialog.open ? closeCommand() : openCommand();
      return;
    }

    if (!dialog.open && !isTyping && event.key === '/') {
      event.preventDefault();
      openCommand();
      return;
    }

    if (!dialog.open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter') {
      const active = visibleCommands()[activeIndex];
      if (active) {
        event.preventDefault();
        runCommand(active.dataset.command);
      }
    }
  });
})();
