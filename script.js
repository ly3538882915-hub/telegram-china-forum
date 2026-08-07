const menu = document.querySelector('.menu-button');
const nav = document.querySelector('nav');

if (document.querySelector('.social-shell')) {
  const premium = document.createElement('link');
  premium.rel = 'stylesheet'; premium.href = 'social-premium.css'; document.head.appendChild(premium);
}

if (menu && nav) {
  nav.id ||= 'primary-navigation';
  menu.setAttribute('aria-controls', nav.id);
  menu.setAttribute('aria-expanded', 'false');

  const closeMenu = () => {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
  };

  menu.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(isOpen));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) closeMenu();
  });
}
