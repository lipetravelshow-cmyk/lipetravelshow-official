(() => {
  const lang = document.documentElement.lang || 'pt-BR';
  const i18n = {
    'pt-BR': { copied:'Link copiado', select:'Selecione a URL', open:'Abrir menu', close:'Fechar menu' },
    'en': { copied:'Link copied', select:'Select the URL', open:'Open menu', close:'Close menu' },
    'es': { copied:'Enlace copiado', select:'Selecciona la URL', open:'Abrir menú', close:'Cerrar menú' },
    'it': { copied:'Link copiato', select:'Seleziona l’URL', open:'Apri menu', close:'Chiudi menu' }
  };
  const t = i18n[lang] || i18n['pt-BR'];
  const progress = document.getElementById('readingProgress');
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progress) progress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };
  document.addEventListener('scroll', update, {passive:true});
  update();
  const button = document.querySelector('[data-copy-link]');
  const toast = document.getElementById('toast');
  if (toast) toast.textContent = t.copied;
  if (button) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
      } catch { button.textContent = t.select; }
    });
  }
  const menuButton = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobileSiteMenu');
  if (menuButton && mobileMenu) {
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', t.open);
      mobileMenu.hidden = true;
    };
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      if (open) closeMenu();
      else {
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', t.close);
        mobileMenu.hidden = false;
      }
    });
    mobileMenu.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1020) closeMenu(); }, { passive: true });
  }
})();
