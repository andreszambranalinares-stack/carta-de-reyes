/* Carta de Reyes · app.js
   Sin frameworks. Dos "backends" con la misma interfaz:
   - Supabase (si config.js tiene URL y clave): datos compartidos por toda la familia.
   - Demo (si no): datos de ejemplo en este navegador, para probar el diseño. */
(() => {
  'use strict';

  const CFG = window.RDC_CONFIG || {};
  const DEMO = !CFG.supabaseUrl || !CFG.supabaseAnonKey;
  const K = { family: 'rdc.family', session: 'rdc.session', theme: 'rdc.theme', demo: 'rdc.demo.v1' };

  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* nada */ } },
  };

  // ---------------------------------------------------------------- utilidades
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => (n == null || n === '' || isNaN(n)) ? '' :
    Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n) % 1 ? 2 : 0 });
  const initial = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();
  const isUrl = (s) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(String(s || '').trim());
  const safeHref = (u) => isUrl(u) ? u : '#';
  const PRIO = { 1: 'Me haría ilusión', 2: 'Me encantaría', 3: '¡Lo quiero muchísimo!' };

  const I = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5l1.9 6.1 6.1-2.3-3.6 5.3L22.5 12l-6.1 1.4 3.6 5.3-6.1-2.3L12 22.5l-1.9-6.1-6.1 2.3 3.6-5.3L1.5 12l6.1-1.4-3.6-5.3 6.1 2.3z"/></svg>',
    s: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-4-5-1.5S10 8 12 8zm0 0c1.5-3 5-4 5-1.5S14 8 12 8z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10 10 0 0112 6c5 0 9 6 9 6a16 16 0 01-3 3.5M6.6 6.6C4.4 8 3 12 3 12s4 6 9 6a9 9 0 004.4-1.1M9.9 9.9a3 3 0 004.2 4.2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  };

  const stars = (p) => `<span class="stars" aria-label="${h(PRIO[p] || '')}">${[1, 2, 3].map((i) => `<span class="${i <= p ? '' : 'off'}">${I.s}</span>`).join('')}</span>`;
  const avatar = (m, size = 64, badge = '') => {
    const photo = m && typeof m.photo === 'string' && m.photo.startsWith('data:image/') ? m.photo : null;
    return `<span class="avatar${photo ? ' has-photo' : ''}" style="--s:${size}px;--c:var(--m${(m && m.color) || 0})" aria-hidden="true">${photo ? `<img src="${h(photo)}" alt="">` : h(initial(m && m.name))}${badge ? `<span class="badge">${h(badge)}</span>` : ''}</span>`;
  };
  const imgHtml = (it, color = 1) => it.image
    ? `<img src="${h(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" ${it.image.startsWith('data:') ? 'class="cover"' : ''} data-i="${h(initial(it.title))}" onerror="var d=document.createElement('div');d.className='ph';d.textContent=this.dataset.i;this.replaceWith(d)">`
    : `<div class="ph" style="--c:var(--m${color})">${h(initial(it.title))}</div>`;

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  const ERR = {
    familia: 'Ese código de familia no es correcto.',
    pin: 'PIN incorrecto. Prueba otra vez.',
    bloqueado: 'Demasiados intentos. Espera 5 minutos y vuelve a probar.',
    existe: 'Ya hay alguien con ese nombre. Si eres tú, vuelve atrás y entra con tu PIN.',
    nombre: 'Escribe tu nombre.',
    pin_formato: 'El PIN son 4 números.',
    ocupado: 'Alguien se te ha adelantado: ya lo regala otra persona.',
    titulo: 'Ponle un nombre al deseo.',
    imagen: 'La foto es demasiado grande. Prueba con otra.',
    sesion: 'Tu sesión ha caducado. Entra de nuevo.',
    no_existe: 'Ese deseo ya no existe.',
    propio: 'No puedes regalarte algo a ti mismo.',
    red: 'No hay conexión. Revisa internet y vuelve a intentarlo.',
  };
  const errText = (e) => ERR[e && e.code] || ERR.red;
  class ApiError extends Error { constructor(code) { super(code); this.code = code; } }

  // ---------------------------------------------------------------- backend Supabase
  async function rpc(fn, args) {
    let res;
    try {
      res = await fetch(`${CFG.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
    } catch { throw new ApiError('red'); }
    if (!res.ok) throw new ApiError('red');
    const data = await res.json();
    if (data && data.error) throw new ApiError(data.error);
    return data;
  }
  const remote = {
    members: (family) => rpc('rdc_members_list', { p_family: family }),
    register: (family, name, pin) => rpc('rdc_register', { p_family: family, p_name: name, p_pin: pin }),
    login: (family, id, pin) => rpc('rdc_login', { p_family: family, p_member: id, p_pin: pin }),
    home: (t) => rpc('rdc_home', { p_token: t }),
    items: (t, owner) => rpc('rdc_items_list', { p_token: t, p_owner: owner }),
    gifts: (t) => rpc('rdc_my_gifts', { p_token: t }),
    save: (t, item) => rpc('rdc_save_item', { p_token: t, p_item: item }),
    remove: (t, id) => rpc('rdc_delete_item', { p_token: t, p_id: id }),
    reserve: (t, id, on) => rpc('rdc_reserve', { p_token: t, p_item: id, p_on: on }),
    setPhoto: (t, photo) => rpc('rdc_set_photo', { p_token: t, p_photo: photo }),
  };

  // ---------------------------------------------------------------- backend demo (mismo contrato)
  const demo = (() => {
    const seed = () => {
      const now = Date.now();
      const m = (id, name, color, i) => ({ id, name, color, pin: '1234', token: 't-' + id, created: now - 1e6 + i });
      const it = (owner, title, category, priority, price, notes = '', url = '') =>
        ({ id: 'i' + Math.random().toString(36).slice(2, 10), owner_id: owner, title, category, priority, price, notes, url, image: null, created_at: new Date(now - Math.random() * 1e8).toISOString() });
      const items = [
        it('ana', 'Auriculares inalámbricos con cancelación de ruido', 'Tecnología', 3, 249, 'En blanco, por favor', 'https://www.apple.com/es/airpods-pro/'),
        it('ana', 'Kindle Paperwhite', 'Tecnología', 2, 159.99),
        it('ana', 'El infinito en un junco · Irene Vallejo', 'Libros', 3, 22.9),
        it('ana', 'Jersey de lana gruesa', 'Ropa', 1, 49.95, 'Talla M, color crudo o verde'),
        it('ana', 'Clase de cerámica para dos', 'Experiencias', 2, 70),
        it('mama', 'Perfume de flor de azahar', 'Cuidado personal', 3, 65),
        it('mama', 'Batidora de vaso', 'Casa', 2, 89.9),
        it('mama', 'Patria · Fernando Aramburu', 'Libros', 1, 21.75),
        it('papa', 'Reloj deportivo con GPS', 'Tecnología', 3, 199),
        it('papa', 'Botas de montaña impermeables', 'Deporte', 2, 119.99, 'Número 44'),
        it('papa', 'Set de herramientas', 'Casa', 1, 45),
      ];
      return {
        members: [m('ana', 'Ana', 1, 1), m('mama', 'Mamá', 2, 2), m('papa', 'Papá', 3, 3)],
        items,
        reservations: { [items[1].id]: 'mama', [items[8].id]: 'ana' },
      };
    };
    let db = ls.get(K.demo) || seed();
    const save = () => ls.set(K.demo, db);
    const wait = (v) => new Promise((r) => setTimeout(() => r(v), 180));
    const fail = (c) => Promise.reject(new ApiError(c));
    const me = (t) => db.members.find((m) => m.token === t);
    const fam = (f) => String(f || '').trim().toLowerCase() === 'linares';
    const pub = (m) => ({ id: m.id, name: m.name, color: m.color, photo: m.photo || null });
    const strip = ({ id, owner_id, title, url, image, price, category, priority, notes, created_at }) =>
      ({ id, owner_id, title, url, image, price, category, priority, notes, created_at });
    const sort = (a, b) => (b.priority - a.priority) || (b.created_at > a.created_at ? 1 : -1);
    return {
      members: (f) => fam(f) ? wait({ members: db.members.map(pub) }) : fail('familia'),
      register(f, name, pin) {
        if (!fam(f)) return fail('familia');
        name = String(name || '').trim().replace(/\s+/g, ' ');
        if (!name || name.length > 30) return fail('nombre');
        if (!/^\d{4}$/.test(pin)) return fail('pin_formato');
        if (db.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return fail('existe');
        const m = { id: 'u' + Date.now(), name, color: (db.members.length + 1) % 8, pin, token: 't' + Math.random(), created: Date.now() };
        db.members.push(m); save();
        return wait({ token: m.token, ...pub(m) });
      },
      login(f, id, pin) {
        if (!fam(f)) return fail('familia');
        const m = db.members.find((x) => x.id === id);
        if (!m) return fail('no_existe');
        return m.pin === pin ? wait({ token: m.token, ...pub(m) }) : fail('pin');
      },
      home(t) {
        const u = me(t); if (!u) return fail('sesion');
        const count = (id) => db.items.filter((i) => i.owner_id === id).length;
        return wait({
          me: { ...pub(u), count: count(u.id) },
          members: db.members.filter((m) => m.id !== u.id).map((m) => ({ ...pub(m), count: count(m.id),
            mine: db.items.filter((i) => i.owner_id === m.id && db.reservations[i.id] === u.id).length })),
          gifts: Object.values(db.reservations).filter((v) => v === u.id).length,
        });
      },
      items(t, owner) {
        const u = me(t); if (!u) return fail('sesion');
        const list = db.items.filter((i) => i.owner_id === owner).sort(sort);
        if (owner === u.id) return wait({ items: list.map(strip) });
        return wait({ items: list.map((i) => {
          const by = db.reservations[i.id];
          return { ...strip(i), reserved: !!by, reserved_by_me: by === u.id, reserved_by: by ? (db.members.find((m) => m.id === by) || {}).name : null };
        }) });
      },
      gifts(t) {
        const u = me(t); if (!u) return fail('sesion');
        const list = db.items.filter((i) => db.reservations[i.id] === u.id).map((i) => {
          const o = db.members.find((m) => m.id === i.owner_id) || {};
          return { ...strip(i), owner_name: o.name, owner_color: o.color, owner_photo: o.photo || null, reserved: true, reserved_by_me: true };
        });
        return wait({ items: list });
      },
      save(t, item) {
        const u = me(t); if (!u) return fail('sesion');
        const title = String(item.title || '').trim();
        if (!title) return fail('titulo');
        const clean = { title, url: item.url || null, image: item.image || null, price: item.price === '' || item.price == null ? null : Number(item.price),
          category: String(item.category || '').trim() || null, priority: Math.min(3, Math.max(1, Number(item.priority) || 2)), notes: String(item.notes || '').trim() || null };
        if (item.id) {
          const ex = db.items.find((i) => i.id === item.id && i.owner_id === u.id);
          if (!ex) return fail('no_existe');
          Object.assign(ex, clean);
        } else {
          db.items.push({ id: 'i' + Date.now(), owner_id: u.id, created_at: new Date().toISOString(), ...clean });
        }
        try { save(); } catch { return fail('imagen'); }
        return wait({ ok: true });
      },
      remove(t, id) {
        const u = me(t); if (!u) return fail('sesion');
        db.items = db.items.filter((i) => !(i.id === id && i.owner_id === u.id));
        delete db.reservations[id]; save();
        return wait({ ok: true });
      },
      reserve(t, id, on) {
        const u = me(t); if (!u) return fail('sesion');
        const it = db.items.find((i) => i.id === id);
        if (!it) return fail('no_existe');
        if (it.owner_id === u.id) return fail('propio');
        if (on) {
          if (db.reservations[id] && db.reservations[id] !== u.id) return fail('ocupado');
          db.reservations[id] = u.id;
        } else if (db.reservations[id] === u.id) delete db.reservations[id];
        save();
        return wait({ ok: true });
      },
      setPhoto(t, photo) {
        const u = me(t); if (!u) return fail('sesion');
        u.photo = photo || null;
        try { save(); } catch { return fail('imagen'); }
        return wait({ ok: true });
      },
      reset() { db = seed(); save(); },
    };
  })();

  const api = DEMO ? demo : remote;

  // ---------------------------------------------------------------- lectura de enlaces (imagen, nombre, precio)
  function parsePrice(raw) {
    if (raw == null) return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    let s = String(raw).replace(/[^\d.,]/g, '');
    if (!s) return null;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (lc > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isFinite(n) && n > 0 && n < 1e6 ? Math.round(n * 100) / 100 : null;
  }

  const BLOCKED = /just a moment|attention required|access denied|acceso denegado|robot|captcha|lo sentimos|sorry|error|página no encontrada|documento no encontrado|not found|^amazon(\.[a-z.]+)?$/i;

  function parseMeta(html, pageUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = (...names) => {
      for (const n of names) {
        const el = doc.querySelector(`meta[property="${n}"],meta[name="${n}"],meta[itemprop="${n}"]`);
        if (el && el.getAttribute('content')) return el.getAttribute('content').trim();
      }
      return null;
    };
    const out = { title: null, image: null, price: null };
    // JSON-LD (lo más fiable en tiendas)
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      const type = [].concat(node['@type'] || []).join(' ');
      if (/Product|ProductGroup|Book|IndividualProduct/i.test(type)) {
        out.title = out.title || node.name || null;
        const img = [].concat(node.image || [])[0];
        out.image = out.image || (typeof img === 'string' ? img : img && (img.url || img.contentUrl)) || null;
        const offers = [].concat(node.offers || []);
        for (const o of offers) {
          const p = parsePrice(o.price ?? o.lowPrice ?? (o.priceSpecification && [].concat(o.priceSpecification)[0].price));
          if (p && !out.price) out.price = p;
        }
        if (!out.price && node.hasVariant) [].concat(node.hasVariant).forEach(visit);
      }
      if (node['@graph']) visit(node['@graph']);
    };
    $$('script[type="application/ld+json"]', doc).forEach((s) => { try { visit(JSON.parse(s.textContent)); } catch { /* json roto */ } });

    out.title = out.title || meta('og:title', 'twitter:title') || (doc.title || '').trim() || null;
    out.image = out.image || meta('og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src');
    out.price = out.price || parsePrice(meta('product:price:amount', 'og:price:amount', 'price', 'twitter:data1'));
    if (!out.price) {
      const el = doc.querySelector('[itemprop="price"]');
      if (el) out.price = parsePrice(el.getAttribute('content') || el.textContent);
    }
    if (!out.image) {
      const im = doc.querySelector('#landingImage,#imgBlkFront,[data-old-hires]');
      if (im) out.image = im.getAttribute('data-old-hires') || im.getAttribute('src');
    }
    if (out.image) { try { out.image = new URL(out.image, pageUrl).href; } catch { out.image = null; } }
    if (out.title) out.title = out.title.replace(/\s+/g, ' ').replace(/\s*[|·–-]\s*(Amazon|El Corte Ingl[eé]s|Zalando|Nike|Decathlon|Fnac|Apple).*$/i, '').trim();
    if (out.title && BLOCKED.test(out.title)) return { title: null, image: null, price: null, blocked: true };
    return out;
  }

  function titleFromUrl(u) {
    try {
      const url = new URL(u);
      const parts = url.pathname.split('/').filter(Boolean);
      const amz = url.pathname.match(/\/([^/]+)\/dp\//);
      let slug = amz ? amz[1] : parts.filter((p) => /[a-z]{3,}-[a-z]{2,}/i.test(p) && !/^(dp|p|es|product|productos?)$/i.test(p)).pop();
      if (!slug) return null;
      slug = decodeURIComponent(slug).replace(/\.(html?|php)$/i, '').replace(/[-_]+/g, ' ').replace(/\b[a-z0-9]{0,3}\d[a-z0-9]*\b/gi, '').replace(/\s+/g, ' ').trim();
      return slug ? slug[0].toUpperCase() + slug.slice(1) : null;
    } catch { return null; }
  }

  async function fetchLink(url) {
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
    let result = { title: null, image: null, price: null };
    try {
      const res = await withTimeout(fetch('https://r.jina.ai/' + url, { headers: { 'X-Return-Format': 'html' } }), 22000);
      if (res.ok) result = parseMeta(await res.text(), url);
    } catch { /* probamos el siguiente */ }
    if (!result.image || !result.title) {
      try {
        const res = await withTimeout(fetch('https://api.microlink.io/?url=' + encodeURIComponent(url)), 15000);
        const j = await res.json();
        if (j.status === 'success' && j.data) {
          const t = j.data.title || '';
          if (!BLOCKED.test(t.trim())) {
            result.title = result.title || t || null;
            result.image = result.image || (j.data.image && j.data.image.url) || null;
            result.blocked = false;
          }
        }
      } catch { /* sin suerte */ }
    }
    if (!result.title) result.title = titleFromUrl(url);
    return result;
  }

  // fotos subidas o pegadas: se reducen a ~900px en JPEG para que viajen ligeras
  function compressImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  }

  // foto de perfil: recorte cuadrado centrado de 256px
  function compressAvatar(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height), out = 256;
        const c = document.createElement('canvas'); c.width = c.height = out;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, out, out);
        x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
      img.src = url;
    });
  }

  // ---------------------------------------------------------------- estado
  const S = {
    session: ls.get(K.session),
    family: ls.get(K.family),
    home: null,
    items: {},       // ownerId -> items
    gifts: null,
    cat: {},         // ownerId -> categoría elegida
    auth: { step: 'code', members: [], pick: null, error: '' },
  };

  function route() {
    const hsh = location.hash.replace(/^#/, '');
    if (!S.session) return { view: 'auth' };
    if (hsh === 'mia') return { view: 'list', owner: S.session.id };
    if (hsh.startsWith('lista-')) return { view: 'list', owner: hsh.slice(6) };
    if (hsh === 'regalos') return { view: 'gifts' };
    return { view: 'home' };
  }
  const go = (hash) => { if (location.hash.replace(/^#/, '') === hash) render(); else location.hash = hash; };

  function logout(msg) {
    ls.del(K.session); S.session = null; S.home = null; S.items = {}; S.gifts = null;
    S.auth = { step: S.family ? 'who' : 'code', members: [], pick: null, error: msg || '' };
    closeSheet();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
  }
  function handleErr(e) {
    if (e && e.code === 'sesion') return logout(ERR.sesion);
    toast(errText(e));
  }

  // ---------------------------------------------------------------- render principal
  const app = $('#app');
  function render() {
    const r = route();
    if (r.view === 'auth') return renderAuth();
    if (r.view === 'home') return renderHome();
    if (r.view === 'list') return renderList(r.owner);
    if (r.view === 'gifts') return renderGifts();
  }

  const demoBanner = () => DEMO ? `<div class="demo-banner">${I.info}<span><b>Modo demo.</b> Datos de ejemplo guardados solo en este dispositivo. Cuando conectemos la base de datos, la familia verá lo mismo en cada móvil.</span></div>` : '';

  // ---------- acceso
  function renderAuth() {
    const a = S.auth;
    if (S.family && a.step === 'code') a.step = 'who';
    let body = '';
    if (a.step === 'code') {
      body = `
        <form class="stack" data-form="code" novalidate>
          <div class="field"><label for="f-code">Código de la familia</label>
            <input class="input" id="f-code" name="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="El que os ha pasado Andrés" value="${h(S.family || '')}"></div>
          <p class="error-msg">${h(a.error)}</p>
          <button class="btn btn-gold btn-block" type="submit">Continuar</button>
        </form>`;
    } else if (a.step === 'who') {
      if (!a.members.length && !a.loading) loadAuthMembers();
      body = `
        <div class="stack">
          <p class="eyebrow">¿Quién eres?</p>
          ${a.loading ? '<div class="skeleton" style="height:110px"></div>' : `
          <div class="who-grid">
            ${a.members.map((m) => `<button class="who" data-act="pick" data-id="${h(m.id)}">${avatar(m, 68)}<span>${h(m.name)}</span></button>`).join('')}
            <button class="who" data-act="new"><span class="avatar" style="--s:68px;--c:var(--m0);border-style:dashed;font-family:var(--font-ui);font-size:30px" aria-hidden="true">+</span><span>Soy nuevo</span></button>
          </div>`}
          <p class="error-msg">${h(a.error)}</p>
          <button class="link-btn" data-act="change-family">Cambiar código de familia</button>
        </div>`;
    } else if (a.step === 'pin') {
      const m = a.members.find((x) => x.id === a.pick) || {};
      body = `
        <form class="stack" data-form="login" novalidate>
          <div class="row">${avatar(m, 52)}<div><p class="eyebrow">Hola de nuevo</p><div class="display" style="font-size:1.8rem">${h(m.name)}</div></div></div>
          ${pinField('pin', 'Tu PIN')}
          <p class="error-msg">${h(a.error)}</p>
          <button class="btn btn-gold btn-block" type="submit">Entrar</button>
          <button class="link-btn" type="button" data-act="back-who">No soy ${h(m.name)}</button>
        </form>`;
    } else if (a.step === 'new') {
      body = `
        <form class="stack" data-form="register" novalidate>
          <div class="field"><label for="f-name">Tu nombre</label>
            <input class="input" id="f-name" name="name" maxlength="30" autocomplete="given-name" placeholder="Como te llama la familia"></div>
          ${pinField('pin', 'Elige un PIN de 4 números')}
          ${pinField('pin2', 'Repítelo')}
          <p class="error-msg">${h(a.error)}</p>
          <button class="btn btn-gold btn-block" type="submit">Crear mi carta</button>
          <button class="link-btn" type="button" data-act="back-who">Ya tengo cuenta</button>
        </form>`;
    }
    app.innerHTML = `
      <section class="auth">
        <div class="auth-hero">${I.star}<h1 class="display">Carta de Reyes</h1>
          <p>Cada uno escribe su carta. Los demás eligen qué regalar sin que nadie se entere.</p></div>
        ${demoBanner()}
        ${body}
      </section>`;
    const first = $('#f-code') || $('#f-name') || $('#pin');
    if (first && a.step !== 'who') setTimeout(() => first.focus(), 60);
  }

  const pinField = (id, label) => `
    <div class="field"><span class="label" id="${id}-l">${h(label)}</span>
      <div class="pin-wrap" data-pin="${id}">
        <input class="pin-hidden" id="${id}" name="${id}" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-labelledby="${id}-l">
        <div class="pin-boxes" aria-hidden="true"><span class="on"></span><span></span><span></span><span></span></div>
      </div></div>`;

  async function loadAuthMembers() {
    S.auth.loading = true; renderAuth();
    try {
      const r = await api.members(S.family);
      S.auth.members = r.members || [];
      S.auth.error = '';
      if (!S.auth.members.length) S.auth.step = 'new';
    } catch (e) {
      if (e.code === 'familia') { ls.del(K.family); S.family = null; S.auth.step = 'code'; }
      S.auth.error = errText(e);
    }
    S.auth.loading = false; renderAuth();
  }

  function startSession(r) {
    S.session = { token: r.token, id: r.id, name: r.name, color: r.color, photo: r.photo || null };
    ls.set(K.session, S.session);
    S.auth = { step: 'who', members: [], pick: null, error: '' };
    window.scrollTo({ top: 0 });
    render();
  }

  // ---------- inicio
  function countdown() {
    const now = new Date(); const y = now.getMonth() === 0 && now.getDate() > 6 ? now.getFullYear() + 1 : (now.getMonth() === 0 ? now.getFullYear() : now.getFullYear() + 1);
    const target = new Date(y, 0, 6);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = Math.round((target - today) / 864e5);
    if (d === 0) return '<b>¡Hoy vienen los Reyes!</b>';
    if (d === 1) return 'Los Reyes llegan <b>mañana</b> por la noche';
    return `Faltan <b class="tnum">${d} días</b> para el 6 de enero`;
  }

  // mantiene la sesión guardada al día (nombre, color y foto pueden cambiar desde otro móvil)
  function syncMe(m) {
    if (!m || !S.session) return;
    const photo = m.photo || null;
    if (S.session.photo !== photo || S.session.name !== m.name) {
      Object.assign(S.session, { name: m.name, color: m.color, photo });
      ls.set(K.session, S.session);
    }
  }

  async function renderHome() {
    const me = S.session;
    const paint = () => {
      const d = S.home;
      app.innerHTML = `
        <header class="topbar">
          <div class="brand grow">${I.star}<span class="display">Carta de Reyes</span></div>
          <button class="icon-btn" data-act="menu" aria-label="Menú de ${h(me.name)}" style="padding:0;border:0;background:none">${avatar(me, 44)}</button>
        </header>
        <p class="countdown">${countdown()}</p>
        ${demoBanner()}
        <button class="me-card" data-act="open-list" data-id="${h(me.id)}">
          ${avatar(me, 72)}
          <span class="grow"><span class="eyebrow">Tú</span><span class="display">Mi carta</span>
            <span class="muted">${d ? (d.me.count ? `${d.me.count} ${d.me.count === 1 ? 'deseo' : 'deseos'}` : 'Aún vacía: añade tu primer deseo') : '…'}</span></span>
          <span class="chev">${I.chev}</span>
        </button>
        <div class="section-head"><h2 class="display">La familia</h2></div>
        ${!d ? '<div class="family-grid">' + '<div class="skeleton" style="height:170px"></div>'.repeat(3) + '</div>'
          : d.members.length ? `<div class="family-grid">${d.members.map((m) => `
            <button class="member" data-act="open-list" data-id="${h(m.id)}">
              ${avatar(m, 64, m.mine ? '✓' + m.mine : '')}
              <span class="name">${h(m.name)}</span>
              <span class="meta">${m.count ? `${m.count} ${m.count === 1 ? 'deseo' : 'deseos'}` : 'Sin deseos aún'}${m.mine ? ` · <b>regalas ${m.mine}</b>` : ''}</span>
            </button>`).join('')}</div>`
          : `<div class="empty"><span class="display">Aún estás solo</span><p>Pasa el enlace y el código <b>Linares</b> al resto de la familia para que creen su carta.</p></div>`}
        ${d ? `<button class="gifts-card" data-act="gifts">${I.gift}<span class="grow"><strong>Lo que regalo yo</strong>
          <span class="muted">${d.gifts ? `${d.gifts} ${d.gifts === 1 ? 'regalo apuntado' : 'regalos apuntados'}` : 'Todavía no has elegido ningún regalo'}</span></span><span class="chev" style="width:22px;color:var(--muted)">${I.chev}</span></button>` : ''}
        <button class="fab" data-act="add">${I.plus}<span>Añadir deseo</span></button>`;
    };
    paint();
    try {
      S.home = await api.home(me.token);
      syncMe(S.home.me);
      if (route().view === 'home') paint();
    } catch (e) { handleErr(e); }
  }

  // ---------- lista de una persona
  function ownerInfo(ownerId) {
    if (ownerId === S.session.id) return { ...S.session, mine: true };
    const m = S.home && S.home.members.find((x) => x.id === ownerId);
    return m ? { ...m, mine: false } : { id: ownerId, name: '…', color: 0, mine: false };
  }

  const categoriesOf = (items) => {
    const map = new Map();
    items.forEach((i) => { const c = i.category || 'Sin categoría'; map.set(c, (map.get(c) || 0) + 1); });
    return [...map.entries()].sort((a, b) => (a[0] === 'Sin categoría') - (b[0] === 'Sin categoría') || b[1] - a[1]);
  };

  function cardHtml(it, owner, opts = {}) {
    let tag = '';
    if (!owner.mine && it.reserved) {
      tag = it.reserved_by_me ? `<span class="tag mine">${I.check}Lo regalas tú</span>` : `<span class="tag">${I.lock}Lo regala ${h(it.reserved_by || 'alguien')}</span>`;
    }
    return `
      <button class="card ${!owner.mine && it.reserved && !it.reserved_by_me ? 'taken' : ''}" data-act="item" data-id="${h(it.id)}" data-owner="${h(it.owner_id)}">
        ${tag}
        <div class="img">${imgHtml(it, owner.color)}</div>
        <div class="body">
          <span class="title">${h(it.title)}</span>
          ${opts.ownerName ? `<span class="owner">Para ${h(opts.ownerName)}</span>` : ''}
          <span class="foot"><span class="price">${h(eur(it.price))}</span>${stars(it.priority)}</span>
        </div>
      </button>`;
  }

  async function renderList(ownerId) {
    if (!S.home && ownerId !== S.session.id) { try { S.home = await api.home(S.session.token); } catch (e) { return handleErr(e); } }
    const owner = ownerInfo(ownerId);
    const paint = () => {
      const items = S.items[ownerId];
      const cats = items ? categoriesOf(items) : [];
      let cat = S.cat[ownerId] || 'all';
      if (cat !== 'all' && !cats.some(([c]) => c === cat)) cat = S.cat[ownerId] = 'all';
      const reservedCount = items && !owner.mine ? items.filter((i) => i.reserved_by_me).length : 0;
      let content;
      if (!items) content = '<div class="grid">' + '<div class="skeleton" style="aspect-ratio:.78"></div>'.repeat(4) + '</div>';
      else if (!items.length) content = owner.mine
        ? `<div class="empty"><span class="display">Tu carta está en blanco</span><p>Pega el enlace de algo que te guste y la app sacará la foto y el precio sola.</p><button class="btn btn-gold" data-act="add">${I.plus}Añadir mi primer deseo</button></div>`
        : `<div class="empty"><span class="display">${h(owner.name)} aún no ha pedido nada</span><p>Vuelve en un rato. Los Reyes también necesitan pistas.</p></div>`;
      else if (cat === 'all' && cats.length > 1) content = cats.map(([c, n]) => `
          <section class="cat-block"><div class="cat-title"><h3>${h(c)}</h3><span>${n}</span></div>
          <div class="grid">${items.filter((i) => (i.category || 'Sin categoría') === c).map((i) => cardHtml(i, owner)).join('')}</div></section>`).join('');
      else content = `<div class="grid">${items.filter((i) => cat === 'all' || (i.category || 'Sin categoría') === cat).map((i) => cardHtml(i, owner)).join('')}</div>`;

      app.innerHTML = `
        <header class="topbar"><button class="icon-btn" data-act="home" aria-label="Volver al inicio">${I.back}</button><span class="grow"></span></header>
        <div class="list-head">
          ${avatar(owner, 64)}
          <div class="grow"><p class="eyebrow">${owner.mine ? 'Tu carta' : 'La carta de'}</p><h1 class="display">${h(owner.mine ? 'Mi carta' : owner.name)}</h1>
            <span class="muted">${items ? `${items.length} ${items.length === 1 ? 'deseo' : 'deseos'}${reservedCount ? ` · regalas ${reservedCount}` : ''}` : ''}</span></div>
        </div>
        ${owner.mine && items && items.length ? `<p class="secret-note">${I.eyeOff}<span>Nunca verás qué ha reservado cada uno de tu carta. Así hay sorpresa.</span></p>` : ''}
        ${items && items.length ? `<nav class="chips" aria-label="Categorías">
          <button class="chip" aria-pressed="${cat === 'all'}" data-act="cat" data-cat="all">Todo <span class="n">${items.length}</span></button>
          ${cats.map(([c, n]) => `<button class="chip" aria-pressed="${cat === c}" data-act="cat" data-cat="${h(c)}">${h(c)} <span class="n">${n}</span></button>`).join('')}
        </nav>` : ''}
        ${content}
        ${owner.mine ? `<button class="fab" data-act="add">${I.plus}<span>Añadir deseo</span></button>` : ''}`;
    };
    paint();
    try {
      const r = await api.items(S.session.token, ownerId);
      S.items[ownerId] = r.items || [];
      const cur = route();
      if (cur.view === 'list' && cur.owner === ownerId) paint();
    } catch (e) { handleErr(e); }
  }

  // ---------- lo que regalo yo
  async function renderGifts() {
    const paint = () => {
      const items = S.gifts;
      const total = items ? items.reduce((s, i) => s + (Number(i.price) || 0), 0) : 0;
      const groups = new Map();
      (items || []).forEach((i) => { if (!groups.has(i.owner_id)) groups.set(i.owner_id, { name: i.owner_name, color: i.owner_color, photo: i.owner_photo, items: [] }); groups.get(i.owner_id).items.push(i); });
      app.innerHTML = `
        <header class="topbar"><button class="icon-btn" data-act="home" aria-label="Volver al inicio">${I.back}</button><span class="grow"></span></header>
        <div class="list-head"><div class="grow"><p class="eyebrow">Tus reservas</p><h1 class="display">Lo que regalo yo</h1></div></div>
        ${!items ? '<div class="skeleton" style="height:200px"></div>'
          : !items.length ? `<div class="empty"><span class="display">Aún no has elegido nada</span><p>Entra en la carta de alguien, abre un deseo y pulsa «¡Lo regalo yo!».</p><button class="btn btn-ghost" data-act="home">Ver la familia</button></div>`
          : `<div class="total-bar"><span class="muted">${items.length} ${items.length === 1 ? 'regalo' : 'regalos'}</span><b>${h(eur(total) || '—')}</b></div>
            ${[...groups.entries()].map(([id, g]) => `<section class="gift-group">
              <div class="gift-group-head">${avatar(g, 40)}<span class="display">Para ${h(g.name)}</span></div>
              <div class="grid">${g.items.map((i) => cardHtml(i, { mine: false, color: g.color })).join('')}</div></section>`).join('')}`}`;
    };
    paint();
    try { S.gifts = (await api.gifts(S.session.token)).items || []; if (route().view === 'gifts') paint(); } catch (e) { handleErr(e); }
  }

  // ---------------------------------------------------------------- hojas
  const sheetRoot = $('#sheet-root');
  let lastFocus = null;
  function openSheet(html, label) {
    lastFocus = document.activeElement;
    sheetRoot.innerHTML = `<div class="sheet-backdrop" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${h(label)}"><div class="grabber"></div>${html}</div></div>`;
    document.body.style.overflow = 'hidden';
    const f = $('.sheet [data-autofocus]') || $('.sheet button');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  }
  function closeSheet() {
    sheetRoot.innerHTML = ''; document.body.style.overflow = '';
    document.removeEventListener('paste', onPasteImage);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch { /* nada */ }
  }
  const sheetHead = (eyebrow, title) => `<div class="sheet-head"><div class="grow">${eyebrow ? `<p class="eyebrow">${h(eyebrow)}</p>` : ''}<div class="display">${h(title)}</div></div><button class="icon-btn" data-act="close" aria-label="Cerrar">${I.close}</button></div>`;

  function findItem(id) {
    for (const list of Object.values(S.items)) { const f = list.find((i) => i.id === id); if (f) return f; }
    return (S.gifts || []).find((i) => i.id === id) || null;
  }

  function openDetail(id) {
    const it = findItem(id); if (!it) return;
    const mine = it.owner_id === S.session.id;
    const owner = mine ? S.session : (S.home && S.home.members.find((m) => m.id === it.owner_id)) || { name: it.owner_name || '', color: it.owner_color || 0 };
    let reserve = '';
    if (!mine) {
      if (!it.reserved) reserve = `<button class="btn btn-gold btn-block" data-act="reserve" data-id="${h(it.id)}">${I.gift}¡Lo regalo yo!</button>
        <p class="secret-note">${I.eyeOff}<span>${h(owner.name)} no verá que lo has reservado. El resto de la familia sí, para no repetir.</span></p>`;
      else if (it.reserved_by_me) reserve = `<div class="reserve-state mine">${I.check}<span><b>Lo regalas tú.</b> Nadie más podrá reservarlo.</span></div>
        <button class="btn btn-ghost btn-block" data-act="unreserve" data-id="${h(it.id)}">Ya no lo regalo</button>`;
      else reserve = `<div class="reserve-state">${I.lock}<span>Ya lo regala <b>${h(it.reserved_by || 'otra persona')}</b>. Elige otro deseo.</span></div>`;
    }
    openSheet(`
      ${sheetHead(mine ? 'Tu deseo' : `Deseo de ${owner.name}`, '')}
      <div class="detail">
        <div class="detail-img">${imgHtml(it, owner.color)}</div>
        <div class="stack" style="gap:8px">
          ${it.category ? `<p class="eyebrow">${h(it.category)}</p>` : ''}
          <h2>${h(it.title)}</h2>
          <div class="meta-row">${it.price ? `<span class="big-price">${h(eur(it.price))}</span>` : ''}<span>${stars(it.priority)} ${h(PRIO[it.priority])}</span></div>
        </div>
        ${it.notes ? `<div class="notes">${h(it.notes)}</div>` : ''}
        <div class="actions">
          ${reserve}
          ${isUrl(it.url) ? `<a class="btn btn-ghost btn-block" href="${h(safeHref(it.url))}" target="_blank" rel="noopener noreferrer">${I.link}Ver en la tienda</a>` : ''}
          ${mine ? `<div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost" style="flex:1" data-act="edit" data-id="${h(it.id)}">${I.edit}Editar</button>
            <button class="btn btn-danger" style="flex:1" data-act="ask-delete">${I.trash}Borrar</button></div>
            <div class="confirm-box" id="confirm-del" hidden><p>¿Borrar «${h(it.title)}» de tu carta? No se puede deshacer.</p>
              <div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" style="flex:1" data-act="cancel-delete">Cancelar</button><button class="btn btn-danger btn-sm" style="flex:1" data-act="delete" data-id="${h(it.id)}">Sí, borrar</button></div></div>` : ''}
        </div>
      </div>`, it.title);
  }

  // ---------- formulario de deseo
  let F = null;
  function myCategories() {
    const list = S.items[S.session.id] || [];
    return categoriesOf(list).map(([c]) => c).filter((c) => c !== 'Sin categoría');
  }
  const SUGGESTED = ['Tecnología', 'Libros', 'Ropa', 'Deporte', 'Casa', 'Experiencias'];

  async function openForm(id) {
    if (!S.items[S.session.id]) { try { S.items[S.session.id] = (await api.items(S.session.token, S.session.id)).items || []; } catch { /* seguimos */ } }
    const it = id ? findItem(id) : null;
    F = { id: it ? it.id : null, url: it ? it.url || '' : '', title: it ? it.title : '', price: it && it.price != null ? String(it.price).replace('.', ',') : '',
      image: it ? it.image : null, category: it ? it.category || '' : (S.cat[S.session.id] && S.cat[S.session.id] !== 'all' && S.cat[S.session.id] !== 'Sin categoría' ? S.cat[S.session.id] : ''),
      priority: it ? it.priority : 2, notes: it ? it.notes || '' : '', dirty: {}, fetching: false, lastFetched: it ? it.url : null };
    const own = myCategories();
    const cats = [...own, ...SUGGESTED.filter((c) => !own.includes(c))];
    if (F.category && !cats.includes(F.category)) cats.unshift(F.category);
    openSheet(`
      ${sheetHead(id ? 'Editar' : 'Nuevo deseo', id ? 'Editar deseo' : 'Añadir a mi carta')}
      <form class="stack" data-form="item" novalidate>
        <div class="field"><label for="f-url">Enlace del producto</label>
          <div class="url-row"><input class="input" id="f-url" name="url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…" value="${h(F.url)}" ${id ? '' : 'data-autofocus'}>
          ${navigator.clipboard && navigator.clipboard.readText ? `<button class="btn btn-ghost" type="button" data-act="paste-url">Pegar</button>` : ''}</div>
          <p class="fetch-state" id="fetch-state">${id ? '' : 'Pega el enlace y saco la foto, el nombre y el precio.'}</p></div>

        <div class="field"><span class="label">Foto</span>
          <div class="img-drop" id="img-drop"></div>
          <input type="file" id="f-file" accept="image/*" hidden></div>

        <div class="field"><label for="f-title">Nombre</label>
          <input class="input" id="f-title" name="title" maxlength="160" placeholder="Ej.: Botas de fútbol Mercurial" value="${h(F.title)}"></div>

        <div class="two">
          <div class="field"><label for="f-price">Precio aproximado</label>
            <div class="price-wrap"><input class="input tnum" id="f-price" name="price" inputmode="decimal" placeholder="0,00" value="${h(F.price)}"><span>€</span></div></div>
          <div class="field"><span class="label">¿Cuánta ilusión te hace?</span>
            <div class="prio" role="group" aria-label="Prioridad">${[1, 2, 3].map((p) => `<button type="button" data-act="prio" data-p="${p}" aria-pressed="${F.priority === p}">${stars(p)}<span>${['Ilusión', 'Me encanta', 'Muchísimo'][p - 1]}</span></button>`).join('')}</div></div>
        </div>

        <div class="field"><span class="label">Lista</span>
          <div class="cat-chips" id="cat-chips">
            ${cats.map((c) => `<button type="button" class="chip" data-act="pick-cat" data-cat="${h(c)}" aria-pressed="${F.category === c}">${h(c)}</button>`).join('')}
            <button type="button" class="chip add" data-act="new-cat">${I.plus.replace('<svg', '<svg width="14" height="14"')}Nueva</button>
          </div>
          <input class="input" id="f-cat" name="category" maxlength="40" placeholder="Nombre de la nueva lista" hidden></div>

        <div class="field"><label for="f-notes">Notas para los Reyes</label>
          <textarea class="input" id="f-notes" name="notes" maxlength="500" placeholder="Talla, color, modelo… lo que ayude a acertar">${h(F.notes)}</textarea></div>

        <p class="error-msg" id="form-error"></p>
        <button class="btn btn-gold btn-block" type="submit" id="f-save">${id ? 'Guardar cambios' : 'Añadir a mi carta'}</button>
      </form>`, id ? 'Editar deseo' : 'Añadir deseo');
    paintImage();
    document.addEventListener('paste', onPasteImage);
  }

  function paintImage() {
    const box = $('#img-drop'); if (!box) return;
    box.classList.toggle('has', !!F.image);
    const canRead = !!(navigator.clipboard && navigator.clipboard.read);
    box.innerHTML = F.image
      ? `<img src="${h(F.image)}" alt="Foto del deseo" referrerpolicy="no-referrer"><div class="img-tools"><button type="button" class="btn btn-sm" data-act="pick-file">Cambiar</button><button type="button" class="btn btn-sm" data-act="clear-img">Quitar</button></div>`
      : `<div class="hint">${I.image}<span>${F.fetching ? 'Buscando la foto…' : 'Si no sale sola: mantén pulsada la foto en la tienda, «Copiar», y pégala aquí.'}</span>
          <div class="row" style="justify-content:center">${canRead ? '<button type="button" class="btn btn-ghost btn-sm" data-act="paste-img">Pegar foto</button>' : ''}<button type="button" class="btn btn-ghost btn-sm" data-act="pick-file">Elegir de mis fotos</button></div></div>`;
  }

  function setFetchState(text, cls = '') {
    const el = $('#fetch-state'); if (!el) return;
    el.className = 'fetch-state ' + cls;
    el.innerHTML = (cls === 'loading' ? '<span class="spinner"></span>' : '') + h(text);
  }

  async function runFetch(url) {
    url = url.trim();
    if (!isUrl(url) || !F || F.lastFetched === url) return;
    F.lastFetched = url; F.fetching = true;
    // lo que se rellenó solo con un enlace anterior se descarta; lo escrito a mano se respeta
    if (F.autoImage) { F.image = null; F.autoImage = false; }
    if (!F.dirty.title) { F.title = ''; $('#f-title').value = ''; }
    if (!F.dirty.price) { F.price = ''; $('#f-price').value = ''; }
    setFetchState('Leyendo la página de la tienda…', 'loading'); paintImage();
    const r = await fetchLink(url);
    if (!F || F.lastFetched !== url) return;
    F.fetching = false;
    const got = [];
    if (r.image && !F.image) { F.image = r.image; F.autoImage = true; got.push('foto'); }
    if (r.title && !F.dirty.title) { F.title = r.title; $('#f-title').value = r.title; got.push('nombre'); }
    if (r.price && !F.dirty.price) { F.price = String(r.price).replace('.', ','); $('#f-price').value = F.price; got.push('precio'); }
    paintImage();
    if (got.length === 3) setFetchState('Listo: foto, nombre y precio. Revisa que esté bien.', 'ok');
    else if (r.image || r.price) setFetchState(`He sacado ${got.join(', ') || 'algo'}. ${!r.price ? 'Pon el precio a mano.' : ''}${!r.image ? 'Pega la foto abajo.' : ''}`, 'warn');
    else setFetchState('Esta tienda no deja leer su página. Pega la foto abajo y revisa el nombre.', 'warn');
  }

  async function onPasteImage(e) {
    if (!F) return;
    const items = [...((e.clipboardData && e.clipboardData.items) || [])];
    const img = items.find((i) => i.type.startsWith('image/'));
    if (img) { e.preventDefault(); await setImageBlob(img.getAsFile()); }
  }
  async function setImageBlob(blob) {
    if (!blob) return;
    try { F.image = await compressImage(blob); F.autoImage = false; paintImage(); }
    catch { toast('No he podido leer esa imagen.'); }
  }

  // ---------------------------------------------------------------- menú
  function openMenu() {
    const theme = ls.get(K.theme) || 'system';
    const hasPhoto = !!S.session.photo;
    openSheet(`
      ${sheetHead('Sesión', S.session.name)}
      <div class="profile-photo">
        <button type="button" class="avatar-edit" data-act="pick-avatar" aria-label="${hasPhoto ? 'Cambiar' : 'Poner'} foto de perfil">${avatar(S.session, 96)}<span class="avatar-cam">${I.image}</span></button>
        <div class="stack" style="gap:8px">
          <button class="btn btn-ghost btn-sm" data-act="pick-avatar">${hasPhoto ? 'Cambiar foto' : 'Poner foto de perfil'}</button>
          ${hasPhoto ? '<button class="btn btn-ghost btn-sm" data-act="clear-avatar">Quitar foto</button>' : ''}
        </div>
        <input type="file" id="f-avatar" accept="image/*" hidden>
      </div>
      <div class="menu-list">
        <button class="btn btn-ghost btn-block" data-act="theme">Tema: ${{ system: 'automático', light: 'claro', dark: 'oscuro' }[theme]}</button>
        ${DEMO ? '<button class="btn btn-ghost btn-block" data-act="demo-reset">Restablecer datos de ejemplo</button>' : ''}
        <button class="btn btn-danger btn-block" data-act="logout">Cerrar sesión</button>
      </div>
      <p class="muted" style="font-size:.85rem;margin:16px 0 0">Para entrar en otro móvil necesitas el código de familia, tu nombre y tu PIN.</p>`, 'Menú');
  }
  function applyTheme() {
    const t = ls.get(K.theme) || 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // ---------------------------------------------------------------- eventos
  document.addEventListener('click', async (e) => {
    const pinWrap = e.target.closest('.pin-wrap');
    if (pinWrap) { $('input', pinWrap).focus(); }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'backdrop' && e.target !== el) return;
    const id = el.dataset.id;
    switch (act) {
      case 'pick': S.auth.pick = id; S.auth.step = 'pin'; S.auth.error = ''; renderAuth(); break;
      case 'new': S.auth.step = 'new'; S.auth.error = ''; renderAuth(); break;
      case 'back-who': S.auth.step = 'who'; S.auth.error = ''; renderAuth(); break;
      case 'change-family': ls.del(K.family); S.family = null; S.auth = { step: 'code', members: [], error: '' }; renderAuth(); break;
      case 'menu': openMenu(); break;
      case 'logout': logout(); break;
      case 'theme': {
        const order = ['system', 'light', 'dark'];
        const next = order[(order.indexOf(ls.get(K.theme) || 'system') + 1) % 3];
        ls.set(K.theme, next); applyTheme(); openMenu(); break;
      }
      case 'demo-reset': demo.reset(); S.home = null; S.items = {}; S.gifts = null; closeSheet(); toast('Datos de ejemplo restablecidos'); logout(); break;
      case 'open-list': go(id === S.session.id ? 'mia' : 'lista-' + id); break;
      case 'home': go(''); break;
      case 'gifts': go('regalos'); break;
      case 'cat': { const r = route(); S.cat[r.owner] = el.dataset.cat; renderList(r.owner); window.scrollTo({ top: 0 }); break; }
      case 'item': openDetail(id); break;
      case 'close': case 'backdrop': closeSheet(); F = null; break;
      case 'add': openForm(null); break;
      case 'edit': closeSheet(); openForm(id); break;
      case 'ask-delete': $('#confirm-del').hidden = false; el.closest('.row').hidden = true; break;
      case 'cancel-delete': $('#confirm-del').hidden = true; $('[data-act="ask-delete"]').closest('.row').hidden = false; break;
      case 'delete':
        el.disabled = true;
        try { await api.remove(S.session.token, id); closeSheet(); toast('Deseo borrado'); S.home = null; refreshCurrent(); }
        catch (err) { el.disabled = false; handleErr(err); }
        break;
      case 'reserve': case 'unreserve':
        el.disabled = true;
        try {
          await api.reserve(S.session.token, id, act === 'reserve');
          const it = findItem(id);
          closeSheet();
          toast(act === 'reserve' ? '¡Apuntado! Es tu regalo' : 'Reserva quitada');
          if (it) { it.reserved = act === 'reserve'; it.reserved_by_me = act === 'reserve'; it.reserved_by = act === 'reserve' ? S.session.name : null; }
          S.home = null; S.gifts = null; refreshCurrent();
        } catch (err) {
          el.disabled = false; handleErr(err);
          if (err.code === 'ocupado') { closeSheet(); refreshCurrent(); }
        }
        break;
      case 'prio':
        F.priority = Number(el.dataset.p);
        $$('.prio button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === F.priority)));
        break;
      case 'pick-cat':
        F.category = F.category === el.dataset.cat ? '' : el.dataset.cat;
        $('#f-cat').hidden = true; $('#f-cat').value = '';
        $$('#cat-chips [data-act="pick-cat"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === F.category)));
        break;
      case 'new-cat':
        F.category = ''; $$('#cat-chips [data-act="pick-cat"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        $('#f-cat').hidden = false; $('#f-cat').focus(); break;
      case 'paste-url':
        try { const t = (await navigator.clipboard.readText()).trim(); const m = t.match(/https?:\/\/\S+/); if (m) { $('#f-url').value = m[0]; F.url = m[0]; runFetch(m[0]); } else toast('No hay ningún enlace copiado'); }
        catch { $('#f-url').focus(); toast('Mantén pulsado el campo y elige «Pegar»'); }
        break;
      case 'paste-img':
        try {
          const items = await navigator.clipboard.read();
          for (const ci of items) { const type = ci.types.find((t) => t.startsWith('image/')); if (type) { await setImageBlob(await ci.getType(type)); return; } }
          toast('No hay ninguna foto copiada');
        } catch { toast('No he podido pegar. Prueba con «Elegir de mis fotos».'); }
        break;
      case 'pick-file': $('#f-file').click(); break;
      case 'pick-avatar': $('#f-avatar').click(); break;
      case 'clear-avatar': savePhoto(null); break;
      case 'clear-img': F.image = null; paintImage(); break;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList.contains('pin-hidden')) {
      t.value = t.value.replace(/\D/g, '').slice(0, 4);
      const boxes = $$('span', t.parentElement.querySelector('.pin-boxes'));
      boxes.forEach((b, i) => { b.classList.toggle('filled', i < t.value.length); b.classList.toggle('on', i === Math.min(t.value.length, 3)); });
      if (t.value.length === 4) {
        const form = t.closest('form');
        if (form.dataset.form === 'login') form.requestSubmit();
        else if (t.id === 'pin') { const p2 = $('#pin2'); if (p2) p2.focus(); }
      }
      return;
    }
    if (!F) return;
    if (t.id === 'f-url') {
      F.url = t.value.trim();
      clearTimeout(runFetch._t);
      if (isUrl(F.url)) runFetch._t = setTimeout(() => runFetch(F.url), 500);
    }
    if (t.id === 'f-title') { F.title = t.value; F.dirty.title = true; }
    if (t.id === 'f-price') { F.price = t.value; F.dirty.price = true; }
    if (t.id === 'f-notes') F.notes = t.value;
    if (t.id === 'f-cat') F.category = t.value;
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-file' && e.target.files[0]) { setImageBlob(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'f-avatar' && e.target.files[0]) {
      const file = e.target.files[0]; e.target.value = '';
      compressAvatar(file).then(savePhoto, () => toast('No he podido leer esa imagen.'));
    }
  });

  async function savePhoto(photo) {
    try {
      await api.setPhoto(S.session.token, photo);
      S.session.photo = photo; ls.set(K.session, S.session);
      S.home = null; S.gifts = null;
      toast(photo ? 'Foto de perfil guardada' : 'Foto quitada');
      openMenu(); render();
    } catch (err) { handleErr(err); }
  }

  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target; const kind = form.dataset.form;
    const btn = $('[type="submit"]', form);
    const showErr = (msg) => {
      const p = $('.error-msg', form); if (p) p.textContent = msg;
      const wrap = $('.pin-wrap', form);
      if (wrap && kind !== 'item') { wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); }
    };
    if (kind === 'code') {
      const code = $('#f-code').value.trim();
      if (!code) return showErr('Escribe el código de la familia.');
      btn.disabled = true;
      try { const r = await api.members(code); S.family = code; ls.set(K.family, code); S.auth = { step: r.members.length ? 'who' : 'new', members: r.members, error: '' }; renderAuth(); }
      catch (err) { btn.disabled = false; showErr(errText(err)); }
    }
    if (kind === 'login') {
      const pin = $('#pin').value;
      if (pin.length !== 4) return showErr(ERR.pin_formato);
      btn.disabled = true;
      try { startSession(await api.login(S.family, S.auth.pick, pin)); }
      catch (err) { btn.disabled = false; $('#pin').value = ''; $('#pin').dispatchEvent(new Event('input', { bubbles: true })); showErr(errText(err)); }
    }
    if (kind === 'register') {
      const name = $('#f-name').value.trim(), pin = $('#pin').value, pin2 = $('#pin2').value;
      if (!name) return showErr(ERR.nombre);
      if (pin.length !== 4) return showErr(ERR.pin_formato);
      if (pin !== pin2) { $('#pin2').value = ''; $('#pin2').dispatchEvent(new Event('input', { bubbles: true })); return showErr('Los dos PIN no coinciden.'); }
      btn.disabled = true;
      try { startSession(await api.register(S.family, name, pin)); toast(`¡Bienvenido, ${name}!`); }
      catch (err) { btn.disabled = false; showErr(errText(err)); }
    }
    if (kind === 'item') {
      const title = $('#f-title').value.trim();
      if (!title) { $('#form-error').textContent = ERR.titulo; $('#f-title').focus(); return; }
      const price = parsePrice($('#f-price').value);
      const category = ($('#f-cat').hidden ? F.category : $('#f-cat').value).trim();
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await api.save(S.session.token, { id: F.id, url: $('#f-url').value.trim() || null, title, price, image: F.image, category, priority: F.priority, notes: $('#f-notes').value });
        const editing = !!F.id;
        F = null; closeSheet();
        toast(editing ? 'Cambios guardados' : 'Añadido a tu carta');
        S.home = null;
        if (category) S.cat[S.session.id] = S.cat[S.session.id] === 'all' || !S.cat[S.session.id] ? 'all' : category;
        if (route().view === 'list' && route().owner === S.session.id) refreshCurrent(); else go('mia');
      } catch (err) { btn.disabled = false; btn.textContent = 'Reintentar'; $('#form-error').textContent = errText(err); if (err.code === 'sesion') handleErr(err); }
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetRoot.innerHTML) { closeSheet(); F = null; } });
  window.addEventListener('hashchange', () => { closeSheet(); F = null; window.scrollTo({ top: 0 }); render(); });
  // al volver a la app (cambio de pestaña), refrescar datos para ver lo que han hecho los demás
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.session && !sheetRoot.innerHTML) { S.home = null; refreshCurrent(); } });

  function refreshCurrent() { render(); }

  applyTheme();
  render();
})();
