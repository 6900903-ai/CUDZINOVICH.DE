document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = document.getElementById('burger-btn');
  const sideMenu = document.getElementById('side-menu');
  const sideOverlay = document.getElementById('side-menu-overlay');
  const sideClose = document.getElementById('side-menu-close');

  const openSideMenu = () => { sideMenu.classList.add('active'); sideOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const closeSideMenu = () => { sideMenu.classList.remove('active'); sideOverlay.classList.remove('active'); document.body.style.overflow = ''; };

  if (burgerBtn) burgerBtn.addEventListener('click', openSideMenu);
  if (sideClose) sideClose.addEventListener('click', closeSideMenu);
  if (sideOverlay) sideOverlay.addEventListener('click', closeSideMenu);

  const scrollNav = document.getElementById('scroll-nav');
  const navLeft = document.getElementById('nav-arrow-left');
  const navRight = document.getElementById('nav-arrow-right');

  if (navLeft && scrollNav) navLeft.addEventListener('click', () => scrollNav.scrollBy({ left: -200, behavior: 'smooth' }));
  if (navRight && scrollNav) navRight.addEventListener('click', () => scrollNav.scrollBy({ left: 200, behavior: 'smooth' }));

  const vdrContainer = document.getElementById('vdr-btn-container');
  const vdrBtn = document.getElementById('vdr-btn');
  const vdrBtnHide = document.getElementById('vdr-btn-close');
  const vdrBtnCollapsed = document.getElementById('vdr-btn-collapsed');
  const vdrPanel = document.getElementById('vdr-panel');
  const vdrOverlay = document.getElementById('vdr-overlay');
  const vdrClose = document.getElementById('vdr-close');

  if (localStorage.getItem('vdrDismissed') === 'true' && vdrContainer) {
    vdrContainer.classList.add('collapsed');
  }

  if (vdrBtnHide) {
    vdrBtnHide.addEventListener('click', (e) => {
      e.stopPropagation();
      vdrContainer.classList.add('collapsed');
      localStorage.setItem('vdrDismissed', 'true');
    });
  }

  const openVdrPanel = () => { vdrPanel.classList.add('active'); vdrOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const closeVdrPanel = () => { vdrPanel.classList.remove('active'); vdrOverlay.classList.remove('active'); document.body.style.overflow = ''; };

  if (vdrBtn) vdrBtn.addEventListener('click', openVdrPanel);
  if (vdrBtnCollapsed) vdrBtnCollapsed.addEventListener('click', openVdrPanel);
  if (vdrClose) vdrClose.addEventListener('click', closeVdrPanel);
  if (vdrOverlay) vdrOverlay.addEventListener('click', closeVdrPanel);

  const vdrForm = document.getElementById('vdr-form');
  const vdrMessage = document.getElementById('vdr-form-message');

  if (vdrForm) {
    vdrForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      vdrMessage.innerHTML = '';
      const submitBtn = vdrForm.querySelector('.vdr-submit');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = '...';
      submitBtn.disabled = true;

      const formData = new FormData(vdrForm);
      const data = Object.fromEntries(formData);
      
      const errEmpty = vdrForm.getAttribute('data-err-empty') || 'All fields are required';
      const errEmail = vdrForm.getAttribute('data-err-email') || 'Invalid email';

      if (!data.firstName || !data.lastName || !data.email || !data.company || !data['privacy-consent']) {
        vdrMessage.innerHTML = `<span style="color:var(--error)">${errEmpty}</span>`;
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }
      if (!data.email.includes('@') || !data.email.includes('.')) {
        vdrMessage.innerHTML = `<span style="color:var(--error)">${errEmail}</span>`;
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      try {
        const response = await fetch('/.netlify/functions/provision-vdr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          vdrMessage.innerHTML = `<span style="color:var(--success)">${result.message}</span>`;
          vdrForm.reset();
          setTimeout(closeVdrPanel, 3000);
        } else {
          vdrMessage.innerHTML = `<span style="color:var(--error)">${result.error || 'Server error'}</span>`;
        }
      } catch (err) {
        vdrMessage.innerHTML = '<span style="color:var(--error)">Network error. Please try again later.</span>';
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
});