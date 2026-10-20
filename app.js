
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

  /* interactive project atlas */
  (function () {
    const atlas = document.getElementById('projectAtlas');
    const dotsGroup = document.getElementById('atlasMapDots');
    const arcsGroup = document.getElementById('atlasMapArcs');
    const pinsWrap = document.getElementById('atlasPins');
    const selector = document.getElementById('atlasSelector');
    const detail = document.getElementById('atlasDetail');
    if (!atlas || !dotsGroup || !arcsGroup || !pinsWrap || !selector || !detail) return;

    const NS = 'http://www.w3.org/2000/svg';
    const africa = [[-5.9, 35.8], [-2.2, 35.1], [3, 36.8], [9.8, 37.3], [10.3, 36.8], [10.8, 34.7], [10, 33.9], [13.2, 32.9], [15, 32.4], [18, 30.5], [19.5, 30.3], [20, 32.1], [22.6, 32.8], [25, 31.9], [29.9, 31.2], [32.3, 31.3], [32.5, 29.9], [33.7, 27.3], [35.4, 24], [36.9, 22], [37.3, 19.5], [38.6, 18], [39.5, 15.5], [41.5, 13.6], [42.7, 12.4], [43.2, 11.6], [45, 10.4], [48, 11.2], [51.3, 11.8], [50.9, 10.3], [50, 8], [48.5, 5.5], [47.5, 4], [45.5, 2], [43.5, 0], [41.5, -1.7], [40.2, -3.5], [39.2, -6], [39.5, -8.5], [40.4, -10.5], [40.5, -15], [39, -16.8], [36.5, -18.9], [34.9, -19.8], [35.3, -23.9], [32.9, -26], [32.9, -28.5], [31, -29.9], [28, -33], [25.6, -34], [20, -34.8], [18.4, -34], [17.9, -31.5], [16.5, -28.6], [15.1, -26.6], [14.5, -22.9], [11.8, -17.2], [13.5, -12.4], [13.2, -8.8], [12.2, -6], [11.8, -4.5], [9.3, -1.5], [8.8, 0.5], [9.6, 2.2], [9.8, 3.9], [8.5, 4.6], [6, 4.3], [3.4, 6.4], [-0.2, 5.5], [-4, 5.3], [-7.5, 4.4], [-10.8, 6.3], [-13.2, 8.5], [-13.7, 9.5], [-16, 11.8], [-17.5, 14.7], [-16.5, 16], [-17, 20.8], [-15.9, 23.7], [-13.2, 27.1], [-9.6, 30.4], [-7.6, 33.6]];
    const mada = [[49.3, -12], [50.4, -15.5], [49.5, -18], [48, -22], [47, -25], [44.5, -25], [43.7, -22], [44.3, -17], [46, -15.8], [48, -13.5]];
    const X = lon => (lon + 18) * 10;
    const Y = lat => (38 - lat) * 10;
    function inside(p, poly) {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }

    const locations = {
      nairobi: { label: 'Nairobi, Kenya (approx.)', lon: 36.82, lat: -1.29 },
      bungoma: { label: 'Bungoma, Kenya (approx.)', lon: 34.57, lat: 0.57 },
      kitui: { label: 'Kitui, Kenya (approx.)', lon: 38.01, lat: -1.37 },
      tanzania: { label: 'Tanzania (approx.)', lon: 34.9, lat: -6.4 },
      malawi: { label: 'Malawi (approx.)', lon: 34.3, lat: -13.3 },
      mauritius: { label: 'Mauritius (approx.)', lon: 57.5, lat: -20.2 }
    };

    const projects = [
      {
        id: 'classic-cosmetics',
        name: 'Classic Cosmetics',
        icon: 'i-bag',
        country: 'Kenya',
        city: 'Bungoma',
        locationKey: 'bungoma',
        locationLabel: 'Bungoma, Kenya (approx.)',
        industry: 'Cosmetics retail',
        status: 'Active engagement',
        summary: 'A multi-location cosmetics retailer needed a POS with trusted stock controls and role-based operations.',
        challenge: 'A multi-location cosmetics retailer needed a POS with real controls, trustworthy stock across locations, and purchasing that matches how goods arrive.',
        decisions: [
          { title: 'Workflow before build', detail: 'Purchase Invoice confirmation was intentionally modelled as a workflow instead of Purchase Receipt.' },
          { title: 'Strict role architecture', detail: 'Cashier and salesperson privileges were separated and enforced with shift lifecycle controls.' },
          { title: 'Verification over assumptions', detail: 'Stock and ledgers were reconciled across three locations with fuzzy matching and owner/warehouse checks.' }
        ],
        outcome: 'A POS with defined roles and shift controls, plus verified stock across locations and competency-based cashier training.',
        tags: ['POS', 'Workflows', 'Roles & permissions', 'Stock reconciliation', 'Training'],
        process: ['Purchase Invoice', 'Confirmation workflow', 'Stock updated', 'Verified ledger']
      },
      {
        id: 'reevon',
        name: 'REEVON',
        icon: 'i-box',
        country: 'Kenya',
        city: 'Nairobi',
        locationKey: 'nairobi',
        locationLabel: 'Nairobi, Kenya (approx.)',
        industry: 'Athletic apparel',
        status: 'Handed over',
        summary: 'A new apparel brand needed Shopify orders, local tax/payment setup, and dispatch notifications operating as one chain.',
        challenge: 'A new apparel brand selling on Shopify needed orders, invoicing, dispatch, local payments, and tax setup to operate as one chain from day one.',
        decisions: [
          { title: 'IntaSend gateway selection', detail: 'Compared four payment providers against launch readiness and KYC timing, then launched with IntaSend while alternatives stayed in reserve.' },
          { title: 'Kenya VAT and import-duty templates', detail: 'Configured templates for VAT and import-duty considerations to keep invoices and fulfilment aligned with local requirements.' },
          { title: 'Dispatch notification automation', detail: 'A Server Script triggers customer notification when the Delivery Note is submitted.' },
          { title: 'PDF-safe branded documents', detail: 'Branded formats were built with reliable PDF-safe layouts and domain/letterhead consistency checks.' }
        ],
        outcome: 'Orders now flow from Shopify through dispatch notification, with local tax and payment considerations handled. The project reached handover.',
        tags: ['Shopify', 'Integrations', 'Server Scripts', 'Payments', 'Tax'],
        process: ['Shopify order', 'Sales Order', 'Sales Invoice', 'Delivery Note', 'Customer notification'],
        infra: [
          'Shopify storefront and order events',
          'ERPNext Sales + Stock workflow control',
          'IntaSend payment confirmation context',
          'Dispatch notification service output'
        ],
        decisionPanels: [
          {
            key: 'payments',
            title: 'Payment gateway context',
            text: 'IntaSend was selected after comparing provider readiness, integration effort, and KYC timing to support launch without delaying go-live.'
          },
          {
            key: 'tax',
            title: 'Kenya tax and import-duty context',
            text: 'VAT and import-duty templates were configured alongside sales and delivery documents so downstream accounting and fulfilment stay consistent.'
          }
        ]
      },
      {
        id: 'greentech-landscaping',
        name: 'Greentech Landscaping',
        icon: 'i-leaf',
        country: 'Mauritius',
        city: 'Mauritius',
        locationKey: 'mauritius',
        locationLabel: 'Mauritius (approx.)',
        industry: 'Landscaping services',
        status: 'Active engagement',
        summary: 'QuickBooks-based operations needed installation projects and recurring maintenance workflows in one ERP setup.',
        challenge: 'Installation projects and recurring maintenance visits needed to be managed in one coherent operating system.',
        decisions: [
          { title: 'Standard first', detail: 'ERPNext Projects used for installation jobs where standard behaviour already fit.' },
          { title: 'Targeted custom build', detail: 'Recurring maintenance modelled as a custom recurring-visit build instead of forcing a poor module fit.' },
          { title: 'Clean accounting migration', detail: 'Chart of accounts migrated from QuickBooks export with 283 rows in MUR and controlled formatting.' }
        ],
        outcome: 'Requirements and gap analysis completed, accounts migrated, and print formats delivered with safe namespaced styling.',
        tags: ['FRD', 'Gap analysis', 'Data migration', 'Projects module', 'Print formats'],
        process: ['QuickBooks export', 'Chart migration', 'Install projects', 'Recurring visits']
      },
      {
        id: 'ilala-crest-lodge',
        name: 'Ilala Crest Lodge',
        icon: 'i-bed',
        country: 'Malawi',
        city: 'Malawi',
        locationKey: 'malawi',
        locationLabel: 'Malawi (approx.)',
        industry: 'Hospitality',
        status: 'Active engagement',
        summary: 'The lodge needed an accounting base that matched real books before go-live.',
        challenge: 'Opening balances had to land correctly by building from the client trial balance, not generic charts.',
        decisions: [
          { title: 'Trial-balance-first design', detail: 'Started from 118 real accounts tied to client figures.' },
          { title: 'Importer-ready structure', detail: 'Prepared for ERPNext v16 importer and merged with 45 additional accounts.' },
          { title: 'Discovery before config', detail: 'Questionnaire captured operational requirements before setup.' }
        ],
        outcome: 'Balanced, import-ready chart of accounts built from real books with branded delivery documents.',
        tags: ['Chart of accounts', 'Trial balance', 'Discovery', 'Hospitality'],
        process: ['Client trial balance', '118 accounts', '+45 accounts', 'v16 importer ready']
      },
      {
        id: 'planet-active',
        name: 'Planet Active',
        icon: 'i-ball',
        country: 'Tanzania',
        city: 'Tanzania',
        locationKey: 'tanzania',
        locationLabel: 'Tanzania (approx.)',
        industry: 'Equipment leasing & manufacturing',
        status: 'Active engagement',
        summary: 'Pool table leasing required BOM + serial tracking with compliance surfaced early.',
        challenge: 'Track components and each leased table by serial number, while handling VAT and EFD compliance risks early.',
        decisions: [
          { title: 'Compliance early', detail: 'Tanzania VAT and EFD gaps were flagged before build to avoid costly redesign.' },
          { title: 'Serial-aware design', detail: 'BOM links each build to individual serialised tables for leasing visibility.' },
          { title: 'Item foundation clean-up', detail: '127-item raw materials list reviewed and code scheme conflicts resolved first.' }
        ],
        outcome: 'Validated requirements, surfaced compliance risk early, and built a clean item baseline.',
        tags: ['Manufacturing', 'BOM', 'Serial tracking', 'Tax compliance'],
        process: ['Raw materials', 'BOM', 'Serial-numbered table', 'Lease tracking']
      },
      {
        id: 'gbi',
        name: 'GBI',
        icon: 'i-truck',
        country: 'Kenya',
        city: 'Nairobi',
        locationKey: 'nairobi',
        locationLabel: 'Nairobi, Kenya (approx.)',
        industry: 'Wholesale apparel distribution',
        status: 'Active engagement',
        summary: 'High-volume wholesale stock and trade-customer processes were moved onto ERPNext.',
        challenge: 'Wholesale operations needed tighter stock and order visibility while transitioning into ERPNext.',
        decisions: [
          { title: 'Phased migration', detail: 'Rollout structured around high-volume operations to reduce disruption.' }
        ],
        outcome: 'Implementation engagement delivered as part of the wider multi-business program.',
        tags: ['Distribution', 'ERPNext implementation'],
        process: ['Stock intake', 'Trade order', 'Dispatch', 'ERP visibility']
      },
      {
        id: 'mackinnon-feedlot',
        name: 'Mackinnon Feedlot',
        icon: 'i-leaf',
        country: 'Kenya',
        city: 'Kitui',
        locationKey: 'kitui',
        locationLabel: 'Kitui, Kenya (approx.)',
        industry: 'Livestock and feedlot operations',
        status: 'Active engagement',
        summary: 'Livestock inventory and sourcing operations were being structured through ERPNext.',
        challenge: 'A major cattle importer/feedlot needed livestock managed as inventory with traceable operations.',
        decisions: [
          { title: 'Inventory modelling focus', detail: 'Implementation emphasised inventory structure that matches cattle sourcing and movement realities.' }
        ],
        outcome: 'ERPNext implementation engagement delivered for livestock-focused operations.',
        tags: ['Agribusiness', 'Inventory', 'ERPNext implementation'],
        process: ['Sourcing', 'Livestock records', 'Inventory movement', 'Operational reporting']
      },
      {
        id: 'fahaab',
        name: 'Fahaab',
        icon: 'i-sliders',
        country: 'Location pending',
        city: 'Location pending',
        locationKey: null,
        locationLabel: 'Location pending',
        industry: 'ERPNext implementation',
        status: 'Delivered',
        summary: 'Implementation engagement delivered alongside the projects above.',
        challenge: 'Project delivered while location/public profile details remain pending.',
        decisions: [
          { title: 'Non-map state', detail: 'Location intentionally kept pending until a public location can be confirmed.' }
        ],
        outcome: 'Implementation engagement delivered alongside the other atlas projects.',
        tags: ['ERPNext implementation', 'Location pending'],
        process: ['Requirements', 'Configuration', 'Handover']
      }
    ];

    const tabDefs = [
      { key: 'overview', label: 'Overview' },
      { key: 'process', label: 'Process' },
      { key: 'decisions', label: 'Decisions' },
      { key: 'outcome', label: 'Outcome' }
    ];

    const byId = Object.fromEntries(projects.map(p => [p.id, p]));
    const selectors = [];
    const pins = [];
    let activeId = 'reevon';
    let activeTab = 'overview';
    let flowTimer = null;

    function escape(str) {
      return String(str).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    }

    function buildDots() {
      const step = 1.15;
      for (let lat = 37.5; lat > -35; lat -= step) {
        for (let lon = -17.5; lon < 53; lon += step) {
          if (inside([lon, lat], africa) || inside([lon, lat], mada)) {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', X(lon).toFixed(1));
            c.setAttribute('cy', Y(lat).toFixed(1));
            c.setAttribute('r', '2.2');
            c.setAttribute('class', 'atlas-dot');
            c.style.setProperty('--dd', (X(lon) / 780 * 1.1).toFixed(2) + 's');
            dotsGroup.appendChild(c);
          }
        }
      }
    }

    function buildArcs() {
      const hub = locations.nairobi;
      const uniqueKeys = [...new Set(projects.map(p => p.locationKey).filter(Boolean))].filter(k => k !== 'nairobi');
      uniqueKeys.forEach(key => {
        const to = locations[key];
        const sx = X(hub.lon), sy = Y(hub.lat), tx = X(to.lon), ty = Y(to.lat);
        const dist = Math.hypot(tx - sx, ty - sy);
        const arc = document.createElementNS(NS, 'path');
        arc.setAttribute('d', 'M' + sx + ' ' + sy + ' Q' + ((sx + tx) / 2) + ' ' + ((sy + ty) / 2 - dist * 0.26) + ' ' + tx + ' ' + ty);
        arc.setAttribute('class', 'atlas-arc');
        arcsGroup.appendChild(arc);
      });
    }

    function renderPins() {
      projects.forEach(project => {
        const point = project.locationKey ? locations[project.locationKey] : null;
        if (!point) return;
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'atlas-pin';
        pin.dataset.project = project.id;
        pin.style.left = (X(point.lon) / 780 * 100).toFixed(3) + '%';
        pin.style.top = (Y(point.lat) / 730 * 100).toFixed(3) + '%';
        pin.setAttribute('aria-label', project.name + ' in ' + project.locationLabel + '. Open case study.');
        pin.innerHTML = '<span class="atlas-pin-core" aria-hidden="true"></span><span class="atlas-pin-label">' + escape(project.name) + '</span>';
        pin.addEventListener('click', () => setProject(project.id, true));
        pin.addEventListener('focus', () => setProject(project.id, false));
        pinsWrap.appendChild(pin);
        pins.push(pin);
      });
    }

    function renderSelector() {
      projects.forEach((project, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'atlas-select';
        btn.dataset.project = project.id;
        btn.role = 'tab';
        btn.id = 'tab-' + project.id;
        btn.setAttribute('aria-controls', 'atlas-panel-' + project.id);
        btn.setAttribute('aria-selected', 'false');
        btn.tabIndex = index === 0 ? 0 : -1;
        btn.innerHTML = '<span><b>' + escape(project.name) + '</b><small>' + escape(project.locationLabel) + '</small></span><span class="atlas-status-pill">' + escape(project.status) + '</span>';
        btn.addEventListener('click', () => setProject(project.id, true));
        selector.appendChild(btn);
        selectors.push(btn);
      });

      selector.addEventListener('keydown', e => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const current = selectors.findIndex(b => b.dataset.project === activeId);
        let next = current;
        if (e.key === 'ArrowDown') next = (current + 1) % selectors.length;
        if (e.key === 'ArrowUp') next = (current - 1 + selectors.length) % selectors.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = selectors.length - 1;
        setProject(selectors[next].dataset.project, true);
        selectors[next].focus();
      });
    }

    function hashProject() {
      if (!location.hash.startsWith('#project/')) return null;
      const id = location.hash.replace('#project/', '').toLowerCase();
      return byId[id] ? id : null;
    }

    function setHash(id) {
      history.replaceState(null, '', '#project/' + id);
    }

    function renderDetail() {
      const project = byId[activeId];
      const process = Array.isArray(project.process) ? project.process : [];
      const tagsList = Array.isArray(project.tags) ? project.tags : [];
      const decisionsList = Array.isArray(project.decisions) ? project.decisions : [];
      const decisionPanels = Array.isArray(project.decisionPanels) ? project.decisionPanels : [];
      const infraNodes = Array.isArray(project.infra) ? project.infra : [];
      detail.setAttribute('data-project', project.id);
      const flow = process.map((step, i) => '<li class="atlas-flow-step" data-step="' + i + '"><span class="atlas-step-index">' + (i + 1) + '</span><span>' + escape(step) + '</span></li>').join('');
      const tabs = tabDefs.map(t => '<button type="button" class="atlas-tab' + (t.key === activeTab ? ' active' : '') + '" data-tab="' + t.key + '" role="tab" aria-selected="' + String(t.key === activeTab) + '">' + t.label + '</button>').join('');
      const tags = tagsList.map(tag => '<span class="tag">' + escape(tag) + '</span>').join('');
      const decisions = decisionsList.map((d, i) => '<details class="atlas-decision"' + (i === 0 ? ' open' : '') + '><summary>' + escape(d.title) + '</summary><p>' + escape(d.detail) + '</p></details>').join('');
      const decisionPanelsHtml = decisionPanels.length ? '<div class="atlas-context-panels">' + decisionPanels.map(panel => '<details class="atlas-panel" open><summary>' + escape(panel.title) + '</summary><p>' + escape(panel.text) + '</p></details>').join('') + '</div>' : '';
      const infra = infraNodes.length ? '<div class="atlas-infra"><div class="lab">Illustrative system infrastructure</div><div class="atlas-infra-grid">' + infraNodes.map(item => '<div class="atlas-infra-node">' + escape(item) + '</div>').join('') + '</div><p class="atlas-illustrative-note">Conceptual interface composition — not a production screenshot.</p></div>' : '';

      let panel = '';
      if (activeTab === 'overview') {
        panel = '<div class="atlas-panel-body"><p class="atlas-summary">' + escape(project.summary) + '</p><div class="block"><div class="lab">Challenge</div><p>' + escape(project.challenge) + '</p></div><div class="atlas-tags">' + tags + '</div></div>';
      }
      if (activeTab === 'process') {
        panel = '<div class="atlas-panel-body"><div class="lab">Illustrative workflow</div><ol class="atlas-flow" aria-label="' + escape(project.name) + ' process flow">' + flow + '</ol>' + decisionPanelsHtml + infra + '<p class="flow-cap">Workflow is conceptual and simplified for communication.</p></div>';
      }
      if (activeTab === 'decisions') {
        panel = '<div class="atlas-panel-body"><div class="lab">Decisions that mattered</div>' + decisions + decisionPanelsHtml + '</div>';
      }
      if (activeTab === 'outcome') {
        panel = '<div class="atlas-panel-body"><div class="outcome"><svg class="ic"><use href="#i-shield"/></svg><div><div class="lab">Outcome</div><p>' + escape(project.outcome) + '</p></div></div><p class="atlas-location-note">Location: ' + escape(project.locationLabel) + ' · Status: ' + escape(project.status) + '.</p></div>';
      }

      detail.innerHTML = '<div id="atlas-panel-' + project.id + '" class="atlas-panel-wrap" role="tabpanel" aria-labelledby="tab-' + project.id + '"><header class="atlas-detail-head"><div class="case-id"><div class="case-ico"><svg class="ic"><use href="#' + project.icon + '"/></svg></div><div><h3>' + escape(project.name) + '</h3><div class="case-meta">' + escape(project.industry) + ' · ' + escape(project.locationLabel) + '</div></div></div><span class="status' + (project.status.toLowerCase().includes('handed') ? ' done' : '') + '">' + escape(project.status) + '</span></header><div class="atlas-tablist" role="tablist" aria-label="' + escape(project.name) + ' content tabs">' + tabs + '</div>' + panel + '</div>';

      $('.atlas-tab', detail).forEach(tab => tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        renderDetail();
      }));

      animateFlow();
    }

    function animateFlow() {
      clearInterval(flowTimer);
      const steps = $('.atlas-flow-step', detail);
      if (!steps.length || reduce) {
        steps.forEach(s => s.classList.add('active'));
        return;
      }
      let i = 0;
      steps.forEach(s => s.classList.remove('active'));
      flowTimer = setInterval(() => {
        steps.forEach((s, idx) => s.classList.toggle('active', idx <= i));
        i = (i + 1) % steps.length;
      }, 780);
    }

    function setProject(id, updateHash) {
      if (!byId[id]) return;
      activeId = id;
      if (!['overview', 'process', 'decisions', 'outcome'].includes(activeTab)) activeTab = 'overview';
      selectors.forEach(btn => {
        const active = btn.dataset.project === id;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
        btn.tabIndex = active ? 0 : -1;
      });
      pins.forEach(pin => pin.classList.toggle('active', pin.dataset.project === id));
      renderDetail();
      if (updateHash) setHash(id);
    }

    buildDots();
    buildArcs();
    renderPins();
    renderSelector();

    const first = hashProject() || activeId;
    setProject(first, false);

    addEventListener('hashchange', () => {
      const id = hashProject();
      if (id) setProject(id, false);
    });

    if (!reduce) {
      const seq = ['reevon', 'classic-cosmetics', 'gbi', 'mackinnon-feedlot', 'planet-active', 'greentech-landscaping', 'ilala-crest-lodge', 'fahaab'];
      let i = 0, visible = false, touched = false;
      const noteInteraction = () => { touched = true; };
      atlas.addEventListener('pointerdown', noteInteraction, { passive: true });
      atlas.addEventListener('keydown', noteInteraction);
      new IntersectionObserver(es => {
        visible = es[0].isIntersecting;
      }, { threshold: 0.35 }).observe(atlas);
      setInterval(() => {
        if (touched || !visible || location.hash.startsWith('#project/')) return;
        i = (i + 1) % seq.length;
        setProject(seq[i], false);
      }, 4200);
    }
  })();
})();
