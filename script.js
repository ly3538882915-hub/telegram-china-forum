const menu = document.querySelector('.menu-button');
const nav = document.querySelector('nav');

if (document.querySelector('.social-shell')) {
  const premium = document.createElement('link');
  premium.rel = 'stylesheet'; premium.href = 'social-premium.css'; document.head.appendChild(premium);
}

if (document.querySelector('.people-page')) {
  const peopleStyle = document.createElement('link');
  peopleStyle.rel = 'stylesheet'; peopleStyle.href = 'people-photos.css'; document.head.appendChild(peopleStyle);
  const peopleScript = document.createElement('script');
  peopleScript.src = 'people-photos.js'; document.head.appendChild(peopleScript);
}

if (document.querySelector('.quick-links') && !document.querySelector('[data-poll-entry]')) {
  const homePollStyle = document.createElement('link');
  homePollStyle.rel = 'stylesheet'; homePollStyle.href = 'home-poll.css'; document.head.appendChild(homePollStyle);
  const link = document.createElement('a');
  link.href = 'poll.html'; link.dataset.pollEntry = 'true';
  link.innerHTML = '<span class="quick-icon blue">◉</span><span><strong>社区投票</strong><small>参与当前公开讨论</small></span><b>→</b>';
  document.querySelector('.quick-links').classList.add('has-poll');
  document.querySelector('.quick-links').appendChild(link);
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
