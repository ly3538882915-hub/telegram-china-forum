const menu = document.querySelector('.menu-button');
const nav = document.querySelector('nav');
menu?.addEventListener('click', () => {
  const isOpen = nav.style.display === 'flex';
  nav.style.display = isOpen ? '' : 'flex';
  menu.setAttribute('aria-expanded', String(!isOpen));
});
