(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch (e) { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); } catch (e) {} }
  };

  /* Theme: saved choice wins, otherwise follow the system */
  const btn = $('.theme-button');
  const setTheme = (light, save) => {
    document.body.classList.toggle('light', light);
    btn.textContent = light ? '☾' : '☼';
    btn.setAttribute('aria-pressed', String(light));
    $('meta[name="theme-color"]').content = light ? '#e8eef7' : '#020a14';
    if (save) store.set('theme', light ? 'light' : 'dark');
  };
  const saved = store.get('theme');
  setTheme(saved ? saved === 'light' : matchMedia('(prefers-color-scheme: light)').matches);
  btn.addEventListener('click', () => setTheme(!document.body.classList.contains('light'), true));

  /* Active nav link */
  const links = $$('.nav-links a');
  const navObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(l => {
      const on = l.getAttribute('href') === '#' + e.target.id;
      l.classList.toggle('active', on);
      on ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current');
    });
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.map(l => $(l.getAttribute('href'))).filter(Boolean).forEach(s => navObs.observe(s));

  /* Scroll reveal, staggered within each parent */
  const revealObs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.section-label, .section h2, .lead, .card, .skill-card, .project-card, .timeline-item, .contact-links a, .about-grid > *').forEach(el => {
    el.dataset.reveal = '';
    el.style.setProperty('--d', Math.min([...el.parentNode.children].indexOf(el), 5) * .07 + 's');
    revealObs.observe(el);
  });

  /* Scroll progress */
  const bar = $('.progress');
  let tick = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    tick = false;
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  /* GitHub: latest public, non-fork repositories (cached 30 min to stay under the API rate limit) */
  const box = $('#gh-repos');
  if (box) {
    const USER = 'adarshsingh-ops', KEY = 'gh-repos', TTL = 30 * 60 * 1000;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
    const draw = repos => {
      if (!repos.length) { box.replaceChildren(el('p', 'No public repositories yet.', 'lead')); return; }
      box.replaceChildren(...repos.map(r => {
        const card = el('article', null, 'card repo');
        const a = el('a', r.name); a.href = r.html_url; a.target = '_blank'; a.rel = 'noopener';
        const h = el('h3'); h.append(a);
        const meta = el('div', null, 'meta');
        [r.language, '★ ' + r.stargazers_count, 'Updated ' + new Date(r.pushed_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })]
          .filter(Boolean).forEach(t => meta.append(el('span', t)));
        card.append(h, el('p', r.description || 'No description yet.'), meta);
        return card;
      }));
    };
    const cached = JSON.parse(store.get(KEY, sessionStorage) || 'null');
    if (cached && Date.now() - cached.t < TTL) draw(cached.d);
    else fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=30`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(all => {
        const d = all.filter(r => !r.fork).slice(0, 6).map(({ name, html_url, description, language, stargazers_count, pushed_at }) => ({ name, html_url, description, language, stargazers_count, pushed_at }));
        store.set(KEY, JSON.stringify({ t: Date.now(), d }), sessionStorage);
        draw(d);
      })
      .catch(() => box.replaceChildren(el('p', 'Could not load repositories right now. Use the link below to see them on GitHub.', 'lead')));
  }
})();
