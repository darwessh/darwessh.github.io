
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c) => [...(c || document).querySelectorAll(s)];

  /* progress bar, sticky nav shadow, back-to-top */
  const bar = document.getElementById('progress');
  const nav = document.querySelector('nav');
  const toTop = document.getElementById('toTop');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    nav.classList.toggle('scrolled', scrollY > 10);
    toTop.classList.toggle('show', scrollY > 800);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* sequence flow nodes */
  $('.flowseq').forEach(f => [...f.children].forEach((c, i) => c.style.setProperty('--i', i)));

  /* reveal on scroll */
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $('[data-reveal], .flowseq').forEach(el => revealIO.observe(el));

  /* count up */
  function countUp(el) {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1100;
    (function tick(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); }
  }), { threshold: 0.6 });
  $('[data-count]').forEach(el => { if (!reduce) el.textContent = '0'; countIO.observe(el); });

  /* typed rotating word */
  const typedEl = document.getElementById('typed');
  const words = ['go-live', 'training', 'long after go-live'];
  if (!reduce) {
    let w = 0, c = words[0].length, del = true;
    (function loop() {
      const word = words[w];
      if (del) { c--; } else { c++; }
      typedEl.textContent = word.slice(0, c);
      let wait = del ? 45 : 85;
      if (!del && c === word.length) { wait = 2200; del = true; }
      else if (del && c === 0) { del = false; w = (w + 1) % words.length; wait = 350; }
      setTimeout(loop, wait);
    })();
  } else { typedEl.textContent = 'go-live and beyond'; }

  /* scroll spy */
  const links = {};
  $('.nav-links a[href^="#"]').forEach(a => { links[a.getAttribute('href').slice(1)] = a; });
  const spyIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && links[e.target.id]) {
      Object.values(links).forEach(l => l.classList.remove('active'));
      if (!links[e.target.id].classList.contains('cta')) links[e.target.id].classList.add('active');
    }
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['approach', 'work', 'africa', 'background', 'services', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) spyIO.observe(s); });

  /* how-I-work chain */
  const chain = document.getElementById('chain');
  if (chain) {
    const cardsEl = $('.chain-card', chain);
    let cur = 0, auto = true, vis = false, t = null, seen = false;
    const setActive = i => { cur = i; cardsEl.forEach((c, k) => c.classList.toggle('active', k === i)); };
    cardsEl.forEach((c, i) => ['mouseenter', 'focusin', 'click'].forEach(ev =>
      c.addEventListener(ev, () => { auto = false; clearTimeout(t); setActive(i); })));
    function tick() {
      clearTimeout(t);
      if (!auto || !vis || reduce) return;
      t = setTimeout(() => { setActive((cur + 1) % cardsEl.length); tick(); }, 4200);
    }
    function revealChain() {
      chain.classList.add('in', 'show');
      if (!seen) {
        seen = true;
        setTimeout(() => chain.classList.add('ready'), 2000);
      }
    }
    new IntersectionObserver(es => {
      vis = es[0].isIntersecting;
      if (vis) revealChain();
      tick();
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }).observe(chain);
    // fallback so cards never stay invisible
    setTimeout(revealChain, 1800);
  }

  /* cycling status pills */
  if (!reduce) {
    $('[data-cycle]').forEach(el => {
      const vals = el.dataset.cycle.split(',');
      const dots = $('.dot3 i', el.closest('.ui, .mini'));
      let i = 0;
      setInterval(() => {
        i = (i + 1) % vals.length;
        el.textContent = vals[i];
        el.dataset.state = i;
        dots.forEach((d, k) => d.classList.toggle('on', k <= i));
      }, 2200);
    });
  }

  /* hero parallax */
  const hero = document.getElementById('top');
  const cards = $('.ui[data-depth]');
  if (!reduce && matchMedia('(min-width:1001px)').matches) {
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach(c => { const d = +c.dataset.depth; c.style.translate = (x * d * -1.6) + 'px ' + (y * d * -1.6) + 'px'; });
    });
    hero.addEventListener('mouseleave', () => cards.forEach(c => { c.style.translate = '0 0'; }));
  }

  /* interactive hero cursor: reactive dot field, glow, ring and click ripples */
  const cv = document.getElementById('heroCanvas');
  const ring = hero.querySelector('.cursor-ring'), spot = hero.querySelector('.cursor-spot');
  if (cv) {
    const ctx = cv.getContext('2d');
    const GAP = 30, R = 150;
    let W = 0, H = 0, raf = 0;
    const m = { in: false, x: -999, y: -999 };
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const ripples = [];

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      for (let y = GAP / 2; y < H; y += GAP) {
        for (let x = GAP / 2; x < W; x += GAP) {
          let ox = 0, oy = 0, near = 0;
          if (m.in) {
            const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
            if (d < R && d > 0) { near = 1 - d / R; ox = dx / d * near * 14; oy = dy / d * near * 14; }
          }
          for (let k = 0; k < ripples.length; k++) {
            const r = ripples[k], age = (now - r.t0) / 1000;
            if (age < 0 || age > 1) continue;
            const rd = Math.hypot(x - r.x, y - r.y), diff = Math.abs(rd - age * 340);
            if (diff < 44) {
              const f = (1 - diff / 44) * (1 - age);
              ox += (x - r.x) / (rd || 1) * f * 18; oy += (y - r.y) / (rd || 1) * f * 18;
              near = Math.max(near, f);
            }
          }
          ctx.fillStyle = near > 0.02 ? 'rgba(168,85,43,' + (0.25 + near * 0.75).toFixed(2) + ')' : 'rgba(20,33,61,.15)';
          ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.3 + near * 3.2, 0, 6.2832); ctx.fill();
        }
      }
    }
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    function frame(now) {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      const t = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) translate(-50%,-50%)';
      if (ring) ring.style.transform = t;
      if (spot) spot.style.transform = t;
      draw(now);
      while (ripples.length && now - ripples[0].t0 > 1000) ripples.shift();
      raf = (m.in || ripples.length || Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(frame) : 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero); else addEventListener('resize', size);

    if (!reduce) {
      hero.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const r = hero.getBoundingClientRect();
        m.x = tx = e.clientX - r.left; m.y = ty = e.clientY - r.top;
        if (!m.in) { m.in = true; cx = tx; cy = ty; hero.classList.add('hovering'); }
        if (ring) ring.classList.toggle('big', !!e.target.closest('a, button, .ui'));
        kick();
      });
      hero.addEventListener('pointerleave', () => { m.in = false; m.x = m.y = -999; hero.classList.remove('hovering'); kick(); });
      hero.addEventListener('pointerdown', e => {
        const r = hero.getBoundingClientRect();
        ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() });
        kick();
      });
    }
  }

  /* Africa dot map */
  (function () {
    const g = document.getElementById('mapDots'), ga = document.getElementById('mapArcs');
    if (!g) return;
    const NS = 'http://www.w3.org/2000/svg';
    const africa = [[-5.9,35.8],[-2.2,35.1],[3,36.8],[9.8,37.3],[10.3,36.8],[10.8,34.7],[10,33.9],[13.2,32.9],[15,32.4],[18,30.5],[19.5,30.3],[20,32.1],[22.6,32.8],[25,31.9],[29.9,31.2],[32.3,31.3],[32.5,29.9],[33.7,27.3],[35.4,24],[36.9,22],[37.3,19.5],[38.6,18],[39.5,15.5],[41.5,13.6],[42.7,12.4],[43.2,11.6],[45,10.4],[48,11.2],[51.3,11.8],[50.9,10.3],[50,8],[48.5,5.5],[47.5,4],[45.5,2],[43.5,0],[41.5,-1.7],[40.2,-3.5],[39.2,-6],[39.5,-8.5],[40.4,-10.5],[40.5,-15],[39,-16.8],[36.5,-18.9],[34.9,-19.8],[35.3,-23.9],[32.9,-26],[32.9,-28.5],[31,-29.9],[28,-33],[25.6,-34],[20,-34.8],[18.4,-34],[17.9,-31.5],[16.5,-28.6],[15.1,-26.6],[14.5,-22.9],[11.8,-17.2],[13.5,-12.4],[13.2,-8.8],[12.2,-6],[11.8,-4.5],[9.3,-1.5],[8.8,0.5],[9.6,2.2],[9.8,3.9],[8.5,4.6],[6,4.3],[3.4,6.4],[-0.2,5.5],[-4,5.3],[-7.5,4.4],[-10.8,6.3],[-13.2,8.5],[-13.7,9.5],[-16,11.8],[-17.5,14.7],[-16.5,16],[-17,20.8],[-15.9,23.7],[-13.2,27.1],[-9.6,30.4],[-7.6,33.6]];
    const mada = [[49.3,-12],[50.4,-15.5],[49.5,-18],[48,-22],[47,-25],[44.5,-25],[43.7,-22],[44.3,-17],[46,-15.8],[48,-13.5]];
    const X = lon => (lon + 18) * 10, Y = lat => (38 - lat) * 10;
    function inside(p, poly) {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    const step = 1.15;
    for (let lat = 37.5; lat > -35; lat -= step) {
      for (let lon = -17.5; lon < 53; lon += step) {
        if (inside([lon, lat], africa) || inside([lon, lat], mada)) {
          const c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', X(lon).toFixed(1)); c.setAttribute('cy', Y(lat).toFixed(1)); c.setAttribute('r', '2.3');
          c.setAttribute('class', 'mdot');
          c.style.setProperty('--dd', (X(lon) / 780 * 1.1).toFixed(2) + 's');
          g.appendChild(c);
        }
      }
    }
    const locs = { kenya: [36.82, -1.29], tanzania: [34.9, -6.4], malawi: [34.3, -13.3], mauritius: [57.5, -20.2] };
    const hub = [X(locs.kenya[0]), Y(locs.kenya[1])];
    ['tanzania', 'malawi', 'mauritius'].forEach(k => {
      const b = [X(locs[k][0]), Y(locs[k][1])];
      const dist = Math.hypot(b[0] - hub[0], b[1] - hub[1]);
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + hub[0] + ' ' + hub[1] + ' Q' + ((hub[0] + b[0]) / 2) + ' ' + ((hub[1] + b[1]) / 2 - dist * 0.3) + ' ' + b[0] + ' ' + b[1]);
      p.setAttribute('class', 'arc');
      ga.appendChild(p);
    });
    const pins = $('.pin'), items = $('.loc');
    pins.forEach(p => {
      const l = locs[p.dataset.loc];
      p.style.left = (X(l[0]) / 780 * 100) + '%';
      p.style.top = (Y(l[1]) / 730 * 100) + '%';
    });
    const keys = ['kenya', 'tanzania', 'malawi', 'mauritius'];
    let idx = 0, userPicked = false, mapVisible = false;
    function activate(k) {
      pins.forEach(p => p.classList.toggle('active', p.dataset.loc === k));
      items.forEach(i => i.classList.toggle('active', i.dataset.loc === k));
    }
    pins.concat(items).forEach(el => ['mouseenter', 'focus', 'click'].forEach(ev =>
      el.addEventListener(ev, () => { userPicked = true; activate(el.dataset.loc); })));
    activate('kenya');
    if (!reduce) {
      setInterval(() => { if (!userPicked && mapVisible) { idx = (idx + 1) % keys.length; activate(keys[idx]); } }, 3200);
      new IntersectionObserver(es => { mapVisible = es[0].isIntersecting; }, { threshold: 0.3 }).observe(document.getElementById('mapWrap'));
    }
  })();
})();
