/* Carta de Reyes · app.js
   Sin frameworks. Dos "backends" con la misma interfaz:
   - Supabase (si config.js tiene URL y clave): datos compartidos por toda la familia.
   - Demo (si no): datos de ejemplo en este navegador, para probar el diseño. */
(() => {
  'use strict';

  const CFG = window.RDC_CONFIG || {};
  const DEMO = !CFG.supabaseUrl || !CFG.supabaseAnonKey;
  const K = { family: 'rdc.family', session: 'rdc.session', theme: 'rdc.theme', demo: 'rdc.demo.v2', seen: 'rdc.seen', sound: 'rdc.sound' };

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
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.4.3 4 2.1 4.5 4.9"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H5a1 1 0 01-1-1V7z"/><path d="M4 7l11-3v3M16 13.5h.01"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20l18-8L3 4l2 7 9 1-9 1z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 001-1V6a1 1 0 00-1-1z"/><path d="M17 9l-5 6M12 9l5 6"/></svg>',
  };

  const stars = (p) => `<span class="stars" aria-label="${h(PRIO[p] || '')}">${[1, 2, 3].map((i) => `<span class="${i <= p ? '' : 'off'}">${I.s}</span>`).join('')}</span>`;
  const avatar = (m, size = 64, badge = '', ring = false) => {
    const photo = m && typeof m.photo === 'string' && m.photo.startsWith('data:image/') ? m.photo : null;
    return `<span class="avatar${photo ? ' has-photo' : ''}${ring ? ' ring' : ''}" style="--s:${size}px;--c:var(--m${(m && m.color) || 0})" aria-hidden="true">${photo ? `<img src="${h(photo)}" alt="">` : h(initial(m && m.name))}${badge ? `<span class="badge">${h(badge)}</span>` : ''}</span>`;
  };
  const isIdea = (it) => it && it.kind === 'idea';
  // una idea no tiene foto: se dibuja una tarjeta con la estrella y «Sorpréndeme»
  const priceText = (it) => isIdea(it) ? (it.price ? `Hasta ${eur(it.price)}` : 'Sin límite') : eur(it.price);
  const imgHtml = (it, color = 1) => isIdea(it)
    ? `<div class="idea-art" aria-hidden="true">${I.spark}<span>Sorpréndeme</span></div>`
    : it.image
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
    pendiente: 'Tu cuenta está pendiente de aprobación.',
    muchos: 'Hay demasiadas solicitudes pendientes. Pide al administrador que las revise.',
    pin_actual: 'Tu PIN actual no es correcto.',
    codigo: 'El código tiene que tener al menos 6 caracteres.',
    admin: 'Solo el administrador puede hacer esto.',
    importe: 'Esa cantidad no es válida.',
    mensaje: 'Escribe algo antes de enviar.',
    despacio: 'Vas muy rápido. Espera un momento.',
    red: 'No hay conexión. Revisa internet y vuelve a intentarlo.',
  };
  const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const errText = (e) => {
    if (e && e.code === 'bloqueado' && e.data && e.data.until) return `Demasiados intentos. Vuelve a probar a las ${hhmm(e.data.until)}.`;
    if (e && e.code === 'pin' && e.data && e.data.left != null && e.data.left <= 2) return `PIN incorrecto. ${e.data.left === 0 ? 'Un fallo más y se bloquea un rato.' : `Te quedan ${e.data.left + 1} intentos.`}`;
    return ERR[e && e.code] || ERR.red;
  };
  class ApiError extends Error { constructor(code, data) { super(code); this.code = code; this.data = data || {}; } }

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
    if (data && data.error) throw new ApiError(data.error, data);
    return data;
  }
  const remote = {
    members: (family) => rpc('rdc_members_list', { p_family: family }),
    register: (family, name, pin) => rpc('rdc_register', { p_family: family, p_name: name, p_pin: pin }),
    login: (family, id, pin) => rpc('rdc_login', { p_family: family, p_member: id, p_pin: pin }),
    home: (t, seen) => rpc('rdc_home', { p_token: t, p_seen: seen || {} }),
    items: (t, owner) => rpc('rdc_items_list', { p_token: t, p_owner: owner }),
    gifts: (t) => rpc('rdc_my_gifts', { p_token: t }),
    save: (t, item) => rpc('rdc_save_item', { p_token: t, p_item: item }),
    remove: (t, id) => rpc('rdc_delete_item', { p_token: t, p_id: id }),
    reserve: (t, id, on) => rpc('rdc_reserve', { p_token: t, p_item: id, p_on: on }),
    share: (t, id) => rpc('rdc_share', { p_token: t, p_item: id }),
    setBought: (t, id, bought) => rpc('rdc_set_bought', { p_token: t, p_item: id, p_bought: bought }),
    setAmount: (t, id, amount) => rpc('rdc_set_amount', { p_token: t, p_item: id, p_amount: amount }),
    setBudget: (t, amount) => rpc('rdc_set_budget', { p_token: t, p_amount: amount }),
    setPhoto: (t, photo) => rpc('rdc_set_photo', { p_token: t, p_photo: photo }),
    changePin: (t, oldPin, newPin) => rpc('rdc_change_pin', { p_token: t, p_old: oldPin, p_new: newPin }),
    logoutAll: (t) => rpc('rdc_logout_all', { p_token: t }),
    ackFails: (t) => rpc('rdc_ack_fails', { p_token: t }),
    approve: (t, id, ok) => rpc('rdc_approve', { p_token: t, p_member: id, p_ok: ok }),
    setFamily: (t, code) => rpc('rdc_set_family', { p_token: t, p_code: code }),
    setStatus: (t, id, status) => rpc('rdc_set_status', { p_token: t, p_item: id, p_status: status }),
    setDiscarded: (t, id, v) => rpc('rdc_set_discarded', { p_token: t, p_item: id, p_discarded: v }),
    reorder: (t, ids) => rpc('rdc_reorder', { p_token: t, p_ids: ids }),
    setPrefs: (t, prefs) => rpc('rdc_set_prefs', { p_token: t, p_prefs: prefs }),
    messages: (t, id) => rpc('rdc_messages', { p_token: t, p_item: id }),
    sendMessage: (t, id, body) => rpc('rdc_send_message', { p_token: t, p_item: id, p_body: body }),
    album: (t) => rpc('rdc_album_list', { p_token: t }),
    albumPhoto: (t, id) => rpc('rdc_album_photo', { p_token: t, p_id: id }),
    albumAdd: (t, thumb, photo, caption) => rpc('rdc_album_add', { p_token: t, p_thumb: thumb, p_photo: photo, p_caption: caption }),
    albumDelete: (t, id) => rpc('rdc_album_delete', { p_token: t, p_id: id }),
  };

  // ---------------------------------------------------------------- backend demo (mismo contrato)
  const demo = (() => {
    const seed = () => {
      const now = Date.now();
      const m = (id, name, color, i) => ({ id, name, color, pin: '1234', token: 't-' + id, created: now - 1e6 + i });
      const it = (owner, title, category, priority, price, notes = '', url = '', ago = 1e8) =>
        ({ id: 'i' + Math.random().toString(36).slice(2, 10), owner_id: owner, title, category, priority, price, notes, url, image: null, created_at: new Date(now - Math.random() * ago - 2e8).toISOString() });
      const items = [
        it('ana', 'Auriculares inalámbricos con cancelación de ruido', 'Tecnología', 3, 249, 'En blanco, por favor', 'https://www.apple.com/es/airpods-pro/'),
        it('ana', 'Kindle Paperwhite', 'Tecnología', 2, 159.99),
        it('ana', 'El infinito en un junco · Irene Vallejo', 'Libros', 3, 22.9),
        it('ana', 'Jersey de lana gruesa', 'Ropa', 1, 49.95, 'Talla M, color crudo o verde'),
        it('ana', 'Clase de cerámica para dos', 'Experiencias', 2, 70),
        { ...it('ana', 'Un libro de fantasía que te haya encantado', 'Libros', 2, 25, 'Mejor si es el primero de una saga'), kind: 'idea' },
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
        gifts: {
          [items[1].id]: { open: false, bought: false, members: [{ id: 'mama', amount: null }] },
          [items[0].id]: { open: true, bought: false, members: [{ id: 'papa', amount: 120 }] },
          [items[8].id]: { open: false, bought: true, members: [{ id: 'ana', amount: null }] },
        },
      };
    };
    let db = ls.get(K.demo) || seed();
    const save = () => ls.set(K.demo, db);
    const wait = (v) => new Promise((r) => setTimeout(() => r(v), 180));
    const fail = (c) => Promise.reject(new ApiError(c));
    const me = (t) => db.members.find((m) => m.token === t);
    const fam = (f) => String(f || '').trim().length > 0; // en el modo demo vale cualquier código
    const pub = (m) => ({ id: m.id, name: m.name, color: m.color, photo: m.photo || null, prefs: m.prefs || {} });
    const strip = ({ id, owner_id, title, url, image, price, category, priority, notes, created_at, kind, discarded, position }) =>
      ({ id, owner_id, title, url, image, price, category, priority, notes, created_at, kind: kind || 'product', discarded: !!discarded, position: position || null });
    const sort = (a, b) => (!!a.discarded - !!b.discarded) || ((a.position || 1e6) - (b.position || 1e6)) || (b.priority - a.priority) || (b.created_at > a.created_at ? 1 : -1);
    const isIn = (g, uid) => !!g && g.members.some((x) => x.id === uid);
    const giftJson = (itemId, uid) => {
      const g = db.gifts[itemId];
      if (!g) return { reserved: false, reserved_by_me: false, reserved_by: null, gift: null };
      const members = g.members.map((x) => ({ ...pub(db.members.find((m) => m.id === x.id) || { id: x.id, name: '?' }), amount: x.amount }));
      return { reserved: true, reserved_by_me: isIn(g, uid), reserved_by: members.map((x) => x.name).join(', '), gift: { open: g.open, bought: g.bought, status: g.status || (g.bought ? 'home' : 'pending'), members, last_msg_at: isIn(g, uid) ? g.last_msg_at || null : null, last_msg_by: isIn(g, uid) ? g.last_msg_by || null : null } };
    };
    const itemOf = (id, u) => {
      const it = db.items.find((i) => i.id === id);
      if (!it) return [null, 'no_existe'];
      if (it.owner_id === u.id) return [null, 'propio'];
      return [it, null];
    };
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
      home(t, seen = {}) {
        const u = me(t); if (!u) return fail('sesion');
        const count = (id) => db.items.filter((i) => i.owner_id === id).length;
        return wait({
          me: { ...pub(u), budget: u.budget ?? null, count: count(u.id) },
          members: db.members.filter((m) => m.id !== u.id).map((m) => ({ ...pub(m), count: count(m.id),
            mine: db.items.filter((i) => i.owner_id === m.id && isIn(db.gifts[i.id], u.id)).length,
            new: seen[m.id] ? db.items.filter((i) => i.owner_id === m.id && i.created_at > seen[m.id]).length : 0 })),
          gifts: Object.values(db.gifts).filter((g) => isIn(g, u.id)).length,
          now: new Date().toISOString(),
        });
      },
      items(t, owner) {
        const u = me(t); if (!u) return fail('sesion');
        const list = db.items.filter((i) => i.owner_id === owner).sort(sort);
        if (owner === u.id) return wait({ items: list.map(strip) });
        return wait({ items: list.filter((i) => !i.discarded || isIn(db.gifts[i.id], u.id)).map((i) => ({ ...strip(i), ...giftJson(i.id, u.id) })) });
      },
      gifts(t) {
        const u = me(t); if (!u) return fail('sesion');
        const list = db.items.filter((i) => isIn(db.gifts[i.id], u.id)).map((i) => {
          const o = db.members.find((m) => m.id === i.owner_id) || {};
          return { ...strip(i), ...giftJson(i.id, u.id), owner_name: o.name, owner_color: o.color, owner_photo: o.photo || null };
        });
        return wait({ budget: u.budget ?? null, items: list });
      },
      save(t, item) {
        const u = me(t); if (!u) return fail('sesion');
        const title = String(item.title || '').trim();
        if (!title) return fail('titulo');
        const idea = item.kind === 'idea';
        const clean = { kind: idea ? 'idea' : 'product', title, url: idea ? null : item.url || null, image: idea ? null : item.image || null, price: item.price === '' || item.price == null ? null : Number(item.price),
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
        delete db.gifts[id]; save();
        return wait({ ok: true });
      },
      reserve(t, id, on) {
        const u = me(t); if (!u) return fail('sesion');
        const [, err] = itemOf(id, u); if (err) return fail(err);
        const g = db.gifts[id];
        if (on) {
          if (g && g.members.some((x) => x.id !== u.id)) return fail('ocupado');
          db.gifts[id] = { open: false, bought: g ? g.bought : false, members: [{ id: u.id, amount: null }] };
        } else if (g) {
          g.members = g.members.filter((x) => x.id !== u.id);
          if (!g.members.length) delete db.gifts[id];
        }
        save(); return wait({ ok: true });
      },
      share(t, id) {
        const u = me(t); if (!u) return fail('sesion');
        const [, err] = itemOf(id, u); if (err) return fail(err);
        const g = db.gifts[id];
        if (!g) db.gifts[id] = { open: true, bought: false, members: [{ id: u.id, amount: null }] };
        else if (isIn(g, u.id)) g.open = true;
        else if (g.open) g.members.push({ id: u.id, amount: null });
        else return fail('ocupado');
        save(); return wait({ ok: true });
      },
      setBought(t, id, bought) {
        const u = me(t); if (!u) return fail('sesion');
        const g = db.gifts[id]; if (!isIn(g, u.id)) return fail('no_existe');
        g.bought = !!bought; save(); return wait({ ok: true });
      },
      setAmount(t, id, amount) {
        const u = me(t); if (!u) return fail('sesion');
        const g = db.gifts[id]; if (!isIn(g, u.id)) return fail('no_existe');
        g.members.find((x) => x.id === u.id).amount = amount; save(); return wait({ ok: true });
      },
      setBudget(t, amount) {
        const u = me(t); if (!u) return fail('sesion');
        u.budget = amount; save(); return wait({ ok: true });
      },
      setPhoto(t, photo) {
        const u = me(t); if (!u) return fail('sesion');
        u.photo = photo || null;
        try { save(); } catch { return fail('imagen'); }
        return wait({ ok: true });
      },
      changePin(t, oldPin, newPin) {
        const u = me(t); if (!u) return fail('sesion');
        if (u.pin !== oldPin) return fail('pin_actual');
        if (!/^\d{4}$/.test(newPin)) return fail('pin_formato');
        u.pin = newPin; u.token = 't' + Math.random(); save(); return wait({ token: u.token });
      },
      logoutAll(t) { const u = me(t); if (!u) return fail('sesion'); u.token = 't' + Math.random(); save(); return wait({ token: u.token }); },
      ackFails: () => wait({ ok: true }),
      approve: () => wait({ ok: true }),
      setFamily: () => wait({ ok: true }),
      setStatus(t, id, status) {
        const u = me(t); if (!u) return fail('sesion');
        const g = db.gifts[id]; if (!isIn(g, u.id)) return fail('no_existe');
        g.status = status; g.bought = status !== 'pending'; save(); return wait({ ok: true });
      },
      setDiscarded(t, id, v) {
        const u = me(t); if (!u) return fail('sesion');
        const it = db.items.find((i) => i.id === id && i.owner_id === u.id); if (!it) return fail('no_existe');
        it.discarded = !!v; save(); return wait({ ok: true });
      },
      reorder(t, ids) {
        const u = me(t); if (!u) return fail('sesion');
        ids.forEach((id, n) => { const it = db.items.find((i) => i.id === id && i.owner_id === u.id); if (it) it.position = n + 1; });
        save(); return wait({ ok: true });
      },
      setPrefs(t, prefs) { const u = me(t); if (!u) return fail('sesion'); u.prefs = prefs; save(); return wait({ ok: true }); },
      messages(t, id) {
        const u = me(t); if (!u) return fail('sesion');
        if (!isIn(db.gifts[id], u.id)) return fail('no_existe');
        db.messages = db.messages || {};
        return wait({ messages: (db.messages[id] || []).map((x) => ({ ...x, ...pub(db.members.find((m) => m.id === x.member_id) || {}), id: x.id })) });
      },
      sendMessage(t, id, body) {
        const u = me(t); if (!u) return fail('sesion');
        const g = db.gifts[id]; if (!isIn(g, u.id)) return fail('no_existe');
        db.messages = db.messages || {}; (db.messages[id] = db.messages[id] || []).push({ id: Date.now(), member_id: u.id, body: String(body).slice(0, 500), created_at: new Date().toISOString() });
        g.last_msg_at = new Date().toISOString(); g.last_msg_by = u.id; save(); return wait({ ok: true });
      },
      album(t) {
        const u = me(t); if (!u) return fail('sesion');
        return wait({ photos: (db.album || []).map((a) => { const m = db.members.find((x) => x.id === a.member_id) || {}; return { id: a.id, member_id: a.member_id, name: m.name, color: m.color, avatar: m.photo || null, thumb: a.thumb, caption: a.caption, created_at: a.created_at }; }) });
      },
      albumPhoto(t, id) { const a = (db.album || []).find((x) => x.id === id); return a ? wait({ photo: a.photo }) : fail('no_existe'); },
      albumAdd(t, thumb, photo, caption) {
        const u = me(t); if (!u) return fail('sesion');
        db.album = db.album || []; db.album.unshift({ id: 'a' + Date.now(), member_id: u.id, thumb, photo, caption, created_at: new Date().toISOString() });
        try { save(); } catch { db.album.shift(); return fail('imagen'); }
        return wait({ ok: true });
      },
      albumDelete(t, id) { const u = me(t); if (!u) return fail('sesion'); db.album = (db.album || []).filter((a) => !(a.id === id && a.member_id === u.id)); save(); return wait({ ok: true }); },
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

  function resizeImage(blob, max, quality, square) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (square) { const side = Math.min(sw, sh); sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side; }
        const k = Math.min(1, max / Math.max(sw, sh));
        const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality));
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
    budget: null,    // presupuesto por persona
    viewing: null, since: null, editBudget: false, reorder: false, album: null,
    auth: { step: 'code', members: [], pick: null, error: '' },
  };

  function route() {
    const hsh = location.hash.replace(/^#/, '');
    if (!S.session) return { view: 'auth' };
    if (hsh === 'mia') return { view: 'list', owner: S.session.id };
    if (hsh.startsWith('lista-')) return { view: 'list', owner: hsh.slice(6) };
    if (hsh === 'regalos') return { view: 'gifts' };
    if (hsh === 'album') return { view: 'album' };
    return { view: 'home' };
  }
  const go = (hash) => { if (location.hash.replace(/^#/, '') === hash) render(); else location.hash = hash; };

  function logout(msg) {
    ls.del(K.session); S.session = null; S.home = null; S.items = {}; S.gifts = null; S.budget = null; S.viewing = null;
    S.auth = { step: S.family ? 'who' : 'code', members: [], pick: null, error: msg || '' };
    closeSheet();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
  }
  function handleErr(e) {
    if (e && e.code === 'pendiente') return renderPending(e.data.admins);
    if (e && e.code === 'sesion' && S.session) {
      // ¿sesión caducada o cuenta todavía sin aceptar?
      return api.home(S.session.token).then(() => render(), (e2) => (e2.code === 'pendiente' ? renderPending(e2.data.admins) : logout(ERR.sesion)));
    }
    if (e && e.code === 'sesion') return logout(ERR.sesion);
    toast(errText(e));
  }

  function renderPending(admins) {
    S.pendingAdmins = admins || S.pendingAdmins || 'El administrador';
    app.innerHTML = `${scene(null)}
      <div class="auth">
        <div class="auth-face" style="margin-top:-70px">${avatar(S.session, 120, '', true)}<span class="name">${h(S.session.name)}</span></div>
        <div class="auth-title"><h1 class="display">Casi dentro</h1>
          <p>${h(S.pendingAdmins)} ${String(S.pendingAdmins).includes(',') ? 'tienen' : 'tiene'} que aceptarte para que veas las cartas de la familia. Así nadie de fuera puede entrar.</p></div>
        <button class="btn btn-gold btn-block" data-act="check-pending">Comprobar otra vez</button>
        <button class="link-btn" data-act="logout">No soy yo, salir</button>
      </div>`;
  }

  // ---------------------------------------------------------------- render principal
  const app = $('#app');
  function render() {
    const r = route();
    if (r.view === 'auth') return renderAuth();
    if (r.view === 'home') return renderHome();
    if (r.view === 'list') return renderList(r.owner);
    if (r.view === 'gifts') return renderGifts();
    if (r.view === 'album') return renderAlbum();
  }

  const demoBanner = () => DEMO ? `<div class="demo-banner">${I.info}<span><b>Modo demo.</b> Datos de ejemplo guardados solo en este dispositivo.</span></div>` : '';

  // ---------- piezas visuales compartidas
  const STAR_IMG = '<img src="img/estrella.png" alt="" width="46" height="43">';
  const KINGS = '<img class="kings" src="img/reyes.jpg" alt="" aria-hidden="true">';
  const DUNES = '<svg class="dunes" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 44 C70 18 150 22 220 40 S340 60 400 28 V70 H0Z" fill="#111b47"/><path d="M0 60 C90 42 170 48 250 58 S360 64 400 52 V70 H0Z" fill="#0a1230"/></svg>';
  const brand = () => `<div class="brand">${STAR_IMG}<span class="display">Carta de Reyes</span></div>`;
  const scene = (back, bigStar) => `
    <div class="scene">${KINGS}
      ${bigStar ? '<img class="big-star" src="img/estrella.png" alt="" aria-hidden="true">' : ''}
      <div class="scene-head">${back ? `<button class="icon-btn plain" data-act="${back}" aria-label="Atrás">${I.back}</button>` : ''}${brand()}</div>
      ${DUNES}
    </div>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // ---------- acceso
  const resetPins = () => { S.pin = { pin: '', pin2: '', active: 'pin' }; };
  resetPins();

  function renderAuth() {
    const a = S.auth;
    if (S.family && a.step === 'code') a.step = 'who';
    let body = '';
    if (a.step === 'code') {
      body = `${scene(null)}
        <div class="auth">
          <div class="auth-title"><h1 class="display">Tu carta para los Reyes</h1>
            <p>Cada uno escribe su carta. Los demás eligen qué regalar sin que nadie se entere.</p></div>
          ${demoBanner()}
          <form class="stack" data-form="code" novalidate>
            <div class="field"><label for="f-code">Código de la familia</label>
              <input class="input" id="f-code" name="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="El que te ha pasado la familia" value="${h(S.family || '')}"></div>
            <p class="error-msg">${h(a.error)}</p>
            <button class="btn btn-gold btn-block" type="submit">Continuar</button>
          </form>
        </div>`;
    } else if (a.step === 'who') {
      if (!a.members.length && !a.loading) loadAuthMembers();
      body = `${scene(null)}
        <div class="auth">
          <div class="auth-title"><h1 class="display">¿Quién eres?</h1><p>Toca tu nombre para entrar</p></div>
          ${demoBanner()}
          ${a.loading ? '<div class="skeleton" style="height:120px"></div>' : `
          <div class="who-grid">
            ${a.members.map((m) => `<button class="who" data-act="pick" data-id="${h(m.id)}">${avatar(m, 84, '', true)}<span>${h(m.name)}</span>${m.approved === false ? '<small class="muted">pendiente</small>' : ''}</button>`).join('')}
            <button class="who" data-act="new"><span class="avatar" style="--s:84px;--c:var(--m0);border-style:dashed;font-family:var(--font-ui);font-size:34px;color:var(--gold)" aria-hidden="true">+</span><span>Soy nuevo</span></button>
          </div>`}
          <p class="error-msg">${h(a.error)}</p>
          <button class="link-btn" data-act="reset-family">Cambiar código de familia</button>
        </div>`;
    } else if (a.step === 'pin') {
      const m = a.members.find((x) => x.id === a.pick) || {};
      body = `${scene('back-who', true)}
        <form class="auth" data-form="login" novalidate>
          <div class="auth-face">${avatar(m, 148, '', true)}<span class="name">${h(m.name)}</span></div>
          <div class="auth-title"><h1 class="display">Hola de nuevo</h1><p>Introduce tu PIN para entrar</p></div>
          ${pinGroup('pin', 'Tu PIN', false)}
          <button class="btn btn-gold btn-block" type="submit">Entrar</button>
          ${a.error ? `<p class="error-pill" role="alert">${I.alert}${h(a.error)}</p>` : ''}
          ${keypad()}
        </form>`;
    } else if (a.step === 'new') {
      body = `${scene(a.members.length ? 'back-who' : null)}
        <form class="auth" data-form="register" novalidate>
          <div class="auth-title"><h1 class="display">Crea tu carta</h1><p>Solo tu nombre y un PIN de 4 números</p></div>
          ${demoBanner()}
          <div class="field"><label for="f-name">Tu nombre</label>
            <input class="input" id="f-name" name="name" maxlength="30" autocomplete="given-name" placeholder="Como te llama la familia" value="${h(a.name || '')}"></div>
          ${pinGroup('pin', 'Elige un PIN de 4 números', true)}
          ${pinGroup('pin2', 'Repítelo', true)}
          ${a.error ? `<p class="error-pill" role="alert">${I.alert}${h(a.error)}</p>` : ''}
          ${keypad()}
          <button class="btn btn-gold btn-block" type="submit">Crear mi carta</button>
          ${a.members.length ? '<button class="link-btn" type="button" data-act="back-who">Ya tengo cuenta</button>' : ''}
        </form>`;
    }
    app.innerHTML = body;
    paintPins();
    const first = $('#f-code') || ($('#f-name') && !$('#f-name').value ? $('#f-name') : null);
    if (first) setTimeout(() => first.focus(), 60);
  }

  const pinGroup = (id, label, showLabel) => `
    <div class="pin-group" data-pin="${id}">
      ${showLabel ? `<span class="label">${h(label)}</span>` : ''}
      <button type="button" class="pin-boxes" data-act="pin-focus" data-pin="${id}" aria-label="${h(label)}">
        <span></span><span></span><span></span><span></span></button>
    </div>`;

  const keypad = () => `
    <div class="keypad" role="group" aria-label="Teclado numérico">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-act="key" data-k="${n}">${n}</button>`).join('')}
      <button type="button" class="k0" data-act="key" data-k="0">0</button>
      <button type="button" data-act="key" data-k="del" aria-label="Borrar">${I.del}</button>
    </div>`;

  function paintPins() {
    $$('.pin-group').forEach((g) => {
      const id = g.dataset.pin, v = S.pin[id] || '';
      g.classList.toggle('active', S.pin.active === id);
      $$('.pin-boxes span', g).forEach((b, i) => { b.classList.toggle('filled', i < v.length); b.classList.toggle('on', i === Math.min(v.length, 3)); });
      $('.pin-boxes', g).setAttribute('aria-label', `${v.length} de 4 números escritos`);
    });
  }

  function pinPress(k) {
    const step = S.auth.step;
    if (step !== 'pin' && step !== 'new') return;
    const id = step === 'pin' ? 'pin' : S.pin.active;
    let v = S.pin[id] || '';
    if (k === 'del') {
      if (!v && id === 'pin2') { S.pin.active = 'pin'; paintPins(); return; }
      v = v.slice(0, -1);
    } else if (v.length < 4) v += k;
    S.pin[id] = v;
    if (v.length === 4) {
      if (step === 'pin') { paintPins(); $('form[data-form="login"]').requestSubmit(); return; }
      if (id === 'pin') S.pin.active = 'pin2';
    }
    paintPins();
  }

  function shakePins(id) {
    const g = $(`.pin-group[data-pin="${id}"]`); if (!g) return;
    g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
    if (navigator.vibrate) try { navigator.vibrate(80); } catch { /* nada */ }
  }

  async function loadAuthMembers() {
    S.auth.loading = true; renderAuth();
    try {
      const r = await api.members(S.family);
      S.auth.members = r.members || [];
      S.auth.error = '';
      if (!S.auth.members.length) { S.auth.step = 'new'; resetPins(); }
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
    resetPins();
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

  const topbar = (back) => `
    <header class="topbar">
      ${back ? `<button class="icon-btn plain" data-act="${back}" aria-label="Volver al inicio">${I.back}</button>` : ''}
      <div class="grow">${brand()}</div>
      <button class="me-btn" data-act="menu" aria-label="Tu perfil y ajustes">${avatar(S.session, 50, '', true)}${I.down}</button>
    </header>`;

  // ---------- novedades: cuándo vi por última vez la carta de cada uno (solo en este móvil)
  const seenKey = () => `${K.seen}.${S.session.id}`;
  const getSeen = () => ls.get(seenKey()) || {};
  const serverNow = () => (S.home && S.home.now) || new Date().toISOString();
  function markSeen(ownerId) { const s = getSeen(); s[ownerId] = serverNow(); ls.set(seenKey(), s); }

  async function loadHome() {
    const seen = getSeen();
    S.home = await api.home(S.session.token, seen);
    syncMe(S.home.me);
    S.budget = S.home.me.budget != null ? Number(S.home.me.budget) : null;
    // a quien no había visto nunca, lo doy por visto ahora: solo cuenta lo que añada a partir de hoy
    const missing = S.home.members.filter((m) => !seen[m.id]);
    if (missing.length) { missing.forEach((m) => { seen[m.id] = S.home.now || new Date().toISOString(); }); ls.set(seenKey(), seen); }
    return S.home;
  }

  async function renderHome() {
    const me = S.session;
    const paint = () => {
      const d = S.home;
      const news = d ? d.members.filter((m) => m.new > 0) : [];
      app.innerHTML = `
        ${topbar(null)}
        <p class="countdown">${countdown()}</p>
        ${demoBanner()}
        <button class="hero-card" data-act="open-list" data-id="${h(me.id)}">
          ${KINGS}${avatar(me, 84, '', true)}
          <span class="grow"><span class="eyebrow">Tú</span><span class="display">Mi carta</span>
            <span class="sub">${d ? (d.me.count ? plural(d.me.count, 'deseo', 'deseos') : 'Aún vacía: añade tu primer deseo') : '…'}</span></span>
          <span class="chev">${I.chev}</span>
        </button>
        ${d && d.me.fails > 0 ? `<section class="alert-card" role="alert">${I.alert}<div class="grow">
            <b>Alguien ha fallado tu PIN ${plural(d.me.fails, 'vez', 'veces')}.</b>
            <span>Si no has sido tú, cámbialo para que nadie entre en tu cuenta.</span>
            <div class="row"><button class="btn btn-gold btn-sm" data-act="change-pin">Cambiar PIN</button><button class="btn btn-ghost btn-sm" data-act="ack-fails">He sido yo</button></div></div>
          </section>` : ''}
        ${d && d.pending && d.pending.length ? `<section class="requests" aria-label="Solicitudes para entrar">
          <p class="eyebrow">${I.users}Quieren entrar en la familia</p>
          ${d.pending.map((p) => `<div class="request-row">${avatar(p, 42, '', true)}<span class="grow"><b>${h(p.name)}</b><span class="muted">se ha registrado</span></span>
            <button class="btn btn-gold btn-sm" data-act="approve" data-id="${h(p.id)}">Aceptar</button>
            <button class="btn btn-ghost btn-sm" data-act="reject" data-id="${h(p.id)}" aria-label="Rechazar a ${h(p.name)}">${I.close}</button></div>`).join('')}
        </section>` : ''}
        ${news.length ? `<section class="news" aria-label="Novedades">
          <p class="eyebrow">${I.spark}Novedades desde tu última visita</p>
          ${news.map((m) => `<button class="news-row" data-act="open-list" data-id="${h(m.id)}">${avatar(m, 38, '', true)}
            <span class="grow"><b>${h(m.name)}</b> ha añadido ${plural(m.new, 'deseo nuevo', 'deseos nuevos')}</span><span class="chev">${I.chev}</span></button>`).join('')}
        </section>` : ''}
        <div class="section-head"><h2 class="display">La familia</h2></div>
        ${!d ? '<div class="family-grid">' + '<div class="skeleton" style="height:170px"></div>'.repeat(3) + '</div>'
          : d.members.length ? `<div class="family-grid">${d.members.map((m) => `
            <button class="member" data-act="open-list" data-id="${h(m.id)}">
              ${m.new ? `<span class="new-dot">${m.new}</span>` : ''}
              ${avatar(m, 68, m.mine ? '✓' + m.mine : '', true)}
              <span class="name">${h(m.name)}</span>
              <span class="meta">${m.count ? plural(m.count, 'deseo', 'deseos') : 'Sin deseos aún'}${m.mine ? `<br><b>regalas ${m.mine}</b>` : ''}</span>
            </button>`).join('')}</div>`
          : `<div class="empty"><span class="display">Aún estás solo</span><p>Pasa el enlace y el código de la familia al resto para que creen su carta.</p></div>`}
        ${d ? `<button class="wide-card" data-act="gifts">${I.gift}<span class="grow"><strong>Lo que regalo yo</strong>
          <span class="muted">${d.gifts ? plural(d.gifts, 'regalo apuntado', 'regalos apuntados') : 'Todavía no has elegido ningún regalo'}</span>
          <span class="budget-chip">${I.wallet}${S.budget ? `Presupuesto: ${h(eur(S.budget))} por persona` : 'Ponte un presupuesto por persona'}</span></span><span class="chev">${I.chev}</span></button>` : ''}
        ${d ? `<button class="wide-card" data-act="album">${I.image}<span class="grow"><strong>Álbum de Reyes</strong>
          <span class="muted">Las fotos de la familia con sus regalos</span></span><span class="chev">${I.chev}</span></button>` : ''}
        <button class="fab" data-act="add">${I.plus}<span>Añadir deseo</span></button>`;
    };
    paint();
    try { await loadHome(); if (route().view === 'home') paint(); } catch (e) { handleErr(e); }
  }

  // ---------- lista de una persona
  function ownerInfo(ownerId) {
    if (ownerId === S.session.id) return { ...S.session, prefs: (S.home && S.home.me && S.home.me.prefs) || {}, mine: true };
    const m = S.home && S.home.members.find((x) => x.id === ownerId);
    return m ? { ...m, mine: false } : { id: ownerId, name: '…', color: 0, mine: false };
  }

  const categoriesOf = (items) => {
    const map = new Map();
    items.forEach((i) => { const c = i.category || 'Sin categoría'; map.set(c, (map.get(c) || 0) + 1); });
    return [...map.entries()].sort((a, b) => (a[0] === 'Sin categoría') - (b[0] === 'Sin categoría') || b[1] - a[1]);
  };

  function cardHtml(it, owner, opts = {}) {
    let tag = '', taken = false;
    const open = !!(it.gift && it.gift.open), bought = !!(it.gift && it.gift.bought);
    if (!owner.mine && it.reserved) {
      if (it.reserved_by_me) {
        const st = statusOf(it);
        tag = it.discarded ? `<span class="tag warn">${I.alert}Ya no lo quiere</span>` : opts.giftsView
          ? (st === 'pending' ? `<span class="tag todo">${I.bag}Por comprar</span>` : `<span class="tag ${st === 'home' || st === 'wrapped' ? 'mine' : 'todo'}">${st === 'home' || st === 'wrapped' ? I.checkCircle : I.bag}${statusLabel(st)}</span>`)
          : `<span class="tag mine">${open ? I.users : I.checkCircle}${open ? 'A medias contigo' : 'Lo regalas tú'}</span>`;
      } else if (open) tag = `<span class="tag share">${I.users}A medias · ¿te apuntas?</span>`;
      else { tag = `<span class="tag">${I.lock}Ya lo regala ${h(it.reserved_by || 'alguien')}</span>`; taken = true; }
    }
    if (owner.mine && it.discarded) tag = `<span class="tag">${I.eyeOff}Descartado</span>`;
    const isNew = opts.since && it.created_at > opts.since;
    return `
      <button class="card ${taken ? 'taken' : ''}${it.discarded ? ' discarded' : ''}" data-act="item" data-id="${h(it.id)}" data-owner="${h(it.owner_id)}">
        ${tag}${!owner.mine && it.reserved_by_me && unreadChat(it) ? `<span class="msg-dot" aria-label="Mensajes nuevos">${I.chat}</span>` : ''}
        <div class="img">${imgHtml(it, owner.color)}${isNew ? '<span class="tag-new">Nuevo</span>' : ''}</div>
        <div class="body">
          <span class="title">${h(it.title)}</span>
          <span class="foot"><span class="price">${opts.giftsView && open ? `${h(eur(myCost(it)))}<small>tu parte de ${h(eur(it.price) || '—')}</small>` : (isIdea(it) ? `<small>${it.price ? 'hasta' : 'precio'}</small>${h(it.price ? eur(it.price) : 'libre')}` : h(eur(it.price)))}</span>${stars(it.priority)}</span>
        </div>
      </button>`;
  }

  async function renderList(ownerId) {
    if (!S.home && ownerId !== S.session.id) { try { await loadHome(); } catch (e) { return handleErr(e); } }
    const owner = ownerInfo(ownerId);
    // lo que había antes de entrar marca los «Nuevo»; al entrar, la carta queda vista
    if (!owner.mine && S.viewing !== ownerId) { S.viewing = ownerId; S.since = getSeen()[ownerId] || null; markSeen(ownerId); }
    const since = owner.mine ? null : S.since;
    const paint = () => {
      const items = S.items[ownerId];
      const cats = items ? categoriesOf(items) : [];
      let cat = S.cat[ownerId] || 'all';
      if (cat !== 'all' && !cats.some(([c]) => c === cat)) cat = S.cat[ownerId] = 'all';
      const reservedCount = items && !owner.mine ? items.filter((i) => i.reserved_by_me).length : 0;
      const live = items ? items.filter((i) => !i.discarded) : [];
      const hasPrefs = owner.prefs && Object.keys(owner.prefs).length;
      let content;
      if (!items) content = '<div class="grid">' + '<div class="skeleton" style="aspect-ratio:.8"></div>'.repeat(4) + '</div>';
      else if (!items.length) content = owner.mine
        ? `<div class="empty"><span class="display">Tu carta está en blanco</span><p>Pega el enlace de algo que te guste y la app sacará la foto y el precio sola. O pide una idea, como «un libro de fantasía».</p><button class="btn btn-gold" data-act="add">${I.plus}Añadir mi primer deseo</button></div>`
        : `<div class="empty"><span class="display">${h(owner.name)} aún no ha pedido nada</span><p>Vuelve en un rato. Los Reyes también necesitan pistas.</p></div>`;
      else if (S.reorder && owner.mine) content = `<p class="reorder-hint">${I.users}Mantén pulsada una tarjeta y arrástrala. La familia verá tu carta en este orden.</p>
          <div class="grid reordering" id="reorder-grid">${live.map((i) => cardHtml(i, owner)).join('')}</div>`;
      else content = `<div class="grid">${items.filter((i) => cat === 'all' || (i.category || 'Sin categoría') === cat).map((i) => cardHtml(i, owner, { since })).join('')}</div>`;

      app.innerHTML = `
        ${topbar('home')}
        <div class="hero-card">
          ${KINGS}${avatar(owner, 92, '', true)}
          <div class="grow"><h1 class="display">${owner.mine ? 'Mi carta' : `La carta de ${h(owner.name)}`}</h1>
            <span class="sub">${items ? `${plural(live.length, 'deseo', 'deseos')}${reservedCount ? ` · regalas ${reservedCount}` : ''}` : '…'}</span></div>
        </div>
        ${items && (owner.mine || hasPrefs) ? `<div class="list-tools">
          ${owner.mine || hasPrefs ? `<button class="tool-btn" data-act="prefs" data-id="${h(owner.id)}">${I.tag}${owner.mine ? 'Mis tallas y gustos' : `Tallas y gustos de ${h(owner.name)}`}</button>` : ''}
          ${owner.mine && live.length > 1 ? (S.reorder ? `<button class="tool-btn on" data-act="reorder-done">${I.check}Listo</button>` : `<button class="tool-btn" data-act="reorder">${I.grip}Ordenar</button>`) : ''}
        </div>` : ''}
        ${items && items.length && !S.reorder ? `<nav class="chips" aria-label="Listas">
          <button class="chip" aria-pressed="${cat === 'all'}" data-act="cat" data-cat="all">Todo</button>
          ${cats.map(([c, n]) => `<button class="chip" aria-pressed="${cat === c}" data-act="cat" data-cat="${h(c)}">${h(c)} <span class="n">${n}</span></button>`).join('')}
        </nav>` : '<div style="height:16px"></div>'}
        ${content}
        ${owner.mine && items && items.length ? `<p class="note-card">${I.info}<span>Nunca verás qué te han reservado.<span>Así hay sorpresa.</span></span></p>` : ''}
        ${owner.mine && !S.reorder ? `<button class="fab" data-act="add">${I.plus}<span>Añadir deseo</span></button>` : ''}`;
      if (S.reorder && owner.mine) startSortable();
    };
    paint();
    try {
      const jobs = [api.items(S.session.token, ownerId)];
      if (!owner.mine && !S.gifts) jobs.push(api.gifts(S.session.token)); // para avisar del presupuesto al reservar
      const [r, g] = await Promise.all(jobs);
      S.items[ownerId] = r.items || [];
      if (g) { S.gifts = g.items || []; if (g.budget != null) S.budget = Number(g.budget); }
      const cur = route();
      if (cur.view === 'list' && cur.owner === ownerId) paint();
    } catch (e) { handleErr(e); }
  }

  // ---------- lo que regalo yo
  async function renderGifts() {
    const paint = () => {
      const items = S.gifts, budget = S.budget;
      const total = items ? items.reduce((s, i) => s + myCost(i), 0) : 0;
      const bought = items ? items.filter((i) => statusOf(i) !== 'pending').length : 0;
      const dropped = items ? items.filter((i) => i.discarded) : [];
      const groups = new Map();
      (items || []).forEach((i) => { if (!groups.has(i.owner_id)) groups.set(i.owner_id, { name: i.owner_name, color: i.owner_color, photo: i.owner_photo, items: [] }); groups.get(i.owner_id).items.push(i); });
      const budgetBox = S.editBudget
        ? `<form class="budget-box" data-form="budget" novalidate>
            <label for="f-budget">¿Cuánto quieres gastarte en cada persona?</label>
            <div class="row" style="flex-wrap:nowrap"><div class="price-wrap" style="flex:1"><input class="input tnum" id="f-budget" inputmode="decimal" placeholder="Por ejemplo, 100" value="${budget ? h(String(budget).replace('.', ',')) : ''}"><span>€</span></div>
            <button class="btn btn-gold btn-sm" type="submit">Guardar</button></div>
            ${budget ? '<button type="button" class="link-btn" data-act="clear-budget">Quitar presupuesto</button>' : ''}
          </form>`
        : `<button class="budget-box as-btn" data-act="edit-budget">${I.wallet}<span class="grow">${budget ? `Presupuesto: <b>${h(eur(budget))}</b> por persona` : 'Ponte un presupuesto por persona'}</span><span class="link-btn">${budget ? 'Cambiar' : 'Añadir'}</span></button>`;
      app.innerHTML = `
        ${topbar('home')}
        <div class="hero-card">${KINGS}
          <div class="grow"><p class="eyebrow">Tus reservas</p><h1 class="display">Lo que regalo yo</h1>
          <span class="sub">${items ? (items.length ? `${plural(items.length, 'regalo', 'regalos')} · ${bought} ${bought === 1 ? 'comprado' : 'comprados'}` : 'Aún ninguno') : '…'}</span></div>
        </div>
        ${dropped.length ? `<p class="alert-card" role="alert">${I.alert}<span class="grow"><b>${h([...new Set(dropped.map((i) => i.owner_name))].join(' y '))} ya no ${dropped.length === 1 ? 'quiere uno' : 'quieren algunos'} de tus regalos.</b><span>Ábrelos para decidir qué hacer.</span></span></p>` : ''}
        ${budgetBox}
        ${!items ? '<div class="skeleton" style="height:200px;margin-top:18px"></div>'
          : !items.length ? `<div class="empty" style="margin-top:18px"><span class="display">Aún no has elegido nada</span><p>Entra en la carta de alguien, abre un deseo y pulsa «¡Lo regalo yo!» o «Lo regalamos a medias».</p><button class="btn btn-ghost" data-act="home">Ver la familia</button></div>`
          : `<div class="total-bar"><span class="muted">Lo que pones tú en total</span><b>${h(eur(total) || '—')}</b></div>
            ${[...groups.entries()].map(([, g]) => {
              const spent = g.items.reduce((s, i) => s + myCost(i), 0);
              const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              const over = budget && spent > budget;
              return `<section class="gift-group">
              <div class="gift-group-head">${avatar(g, 44, '', true)}<span class="display grow">Para ${h(g.name)}</span>
                <span class="spent${over ? ' over' : ''}">${h(eur(spent) || '0 €')}${budget ? ` <small>de ${h(eur(budget))}</small>` : ''}</span></div>
              ${budget ? `<div class="meter${over ? ' over' : ''}" role="img" aria-label="${h(eur(spent))} de ${h(eur(budget))}"><span style="width:${pct}%"></span></div>
                ${over ? `<p class="budget-line over">${I.wallet}<span>Te has pasado ${h(eur(spent - budget))} del presupuesto para ${h(g.name)}.</span></p>` : ''}` : ''}
              <div class="grid">${g.items.map((i) => cardHtml(i, { mine: false, color: g.color }, { giftsView: true })).join('')}</div></section>`;
            }).join('')}`}`;
      if (S.editBudget) setTimeout(() => { const f = $('#f-budget'); if (f) f.focus(); }, 50);
    };
    paint();
    try {
      const r = await api.gifts(S.session.token);
      S.gifts = r.items || []; S.budget = r.budget != null ? Number(r.budget) : null;
      if (route().view === 'gifts') paint();
    } catch (e) { handleErr(e); }
  }

  // ---------- álbum de Reyes
  async function renderAlbum() {
    const paint = () => {
      const photos = S.album;
      app.innerHTML = `
        ${topbar('home')}
        <div class="hero-card">${KINGS}
          <div class="grow"><p class="eyebrow">Para el recuerdo</p><h1 class="display">Álbum de Reyes</h1>
            <span class="sub">${photos ? (photos.length ? plural(photos.length, 'foto', 'fotos') : 'Aún sin fotos') : '…'}</span></div>
        </div>
        <div class="list-tools">
          <button class="tool-btn" data-act="album-camera">${I.camera}Hacer foto</button>
          <button class="tool-btn" data-act="album-file">${I.image}Subir de mis fotos</button>
        </div>
        <input type="file" id="f-album" accept="image/*" hidden>
        <input type="file" id="f-album-cam" accept="image/*" capture="environment" hidden>
        ${!photos ? '<div class="album-grid" style="margin-top:16px">' + '<div class="skeleton" style="aspect-ratio:1"></div>'.repeat(6) + '</div>'
          : !photos.length ? `<div class="empty" style="margin-top:18px"><span class="display">El álbum está vacío</span><p>El 6 de enero, subid una foto con vuestro regalo. Quedará aquí para siempre.</p></div>`
          : `<div class="album-grid">${photos.map((p) => `<button class="album-thumb" data-act="album-open" data-id="${h(p.id)}" aria-label="Foto de ${h(p.name)}${p.caption ? ': ' + h(p.caption) : ''}"><img src="${h(p.thumb)}" alt="" loading="lazy"></button>`).join('')}</div>`}`;
    };
    paint();
    try { S.album = (await api.album(S.session.token)).photos || []; if (route().view === 'album') paint(); } catch (e) { handleErr(e); }
  }

  let albumDraft = null;
  async function startAlbumUpload(file) {
    try {
      albumDraft = { thumb: await resizeImage(file, 360, 0.72, true), photo: await resizeImage(file, 1280, 0.78, false) };
    } catch { toast('No he podido leer esa foto.'); return; }
    openSheet(`${sheetHead('Álbum', 'Nueva foto')}
      <form class="stack" data-form="album" novalidate>
        <img class="album-preview" src="${h(albumDraft.photo)}" alt="Vista previa">
        <div class="field"><label for="f-caption">Pie de foto (opcional)</label>
          <input class="input" id="f-caption" maxlength="200" placeholder="Ej.: ¡Por fin mis botas!"></div>
        <button class="btn btn-gold btn-block" type="submit">Publicar en el álbum</button>
      </form>`, 'Nueva foto');
  }

  async function openAlbumPhoto(id) {
    const p = (S.album || []).find((x) => x.id === id); if (!p) return;
    const canDelete = p.member_id === S.session.id || (S.home && S.home.me && S.home.me.admin);
    openSheet(`${sheetHead(new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }), '')}
      <figure class="album-full">
        <img id="album-big" src="${h(p.thumb)}" alt="${h(p.caption || 'Foto de ' + p.name)}">
        <figcaption>${avatar({ name: p.name, color: p.color, photo: p.avatar }, 32, '', true)}<span><b>${h(p.name)}</b>${p.caption ? `<br>${h(p.caption)}` : ''}</span></figcaption>
      </figure>
      ${canDelete ? `<button class="btn btn-ghost btn-block" data-act="album-ask-delete">${I.trash}Borrar foto</button>
        <div class="confirm-box" id="confirm-album" hidden><p>¿Borrar esta foto del álbum? No se puede deshacer.</p>
          <div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" style="flex:1" data-act="album-cancel-delete">Cancelar</button><button class="btn btn-danger btn-sm" style="flex:1" data-act="album-delete" data-id="${h(p.id)}">Sí, borrar</button></div></div>` : ''}`, 'Foto del álbum');
    try { const r = await api.albumPhoto(S.session.token, id); const big = $('#album-big'); if (big) big.src = r.photo; } catch { /* se queda la miniatura */ }
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
    clearTimeout(chatTimer);
    sheetRoot.innerHTML = ''; document.body.style.overflow = '';
    document.removeEventListener('paste', onPasteImage);
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch { /* nada */ }
  }
  const sheetHead = (eyebrow, title) => `<div class="sheet-head"><div class="grow">${eyebrow ? `<p class="eyebrow">${h(eyebrow)}</p>` : ''}<div class="display">${h(title)}</div></div><button class="icon-btn" data-act="close" aria-label="Cerrar">${I.close}</button></div>`;

  function findItem(id) {
    for (const list of Object.values(S.items)) { const f = list.find((i) => i.id === id); if (f) return f; }
    return (S.gifts || []).find((i) => i.id === id) || null;
  }

  // ---------- regalos: cuánto pongo yo y presupuesto
  const giftMembers = (it) => (it.gift && it.gift.members) || [];
  function myCost(it) {
    const ms = giftMembers(it), mine = ms.find((m) => m.id === S.session.id);
    if (mine && mine.amount != null) return Number(mine.amount);
    const price = Number(it.price) || 0;
    return it.gift && it.gift.open ? price / Math.max(1, ms.length) : price;
  }
  const spentFor = (ownerId, exceptId) => (S.gifts || []).filter((g) => g.owner_id === ownerId && g.id !== exceptId).reduce((s, g) => s + myCost(g), 0);
  function budgetLine(it, ownerName, extra) {
    const b = S.budget; if (!b || !S.gifts) return '';
    const after = spentFor(it.owner_id, it.id) + (extra || 0);
    const over = after > b;
    return `<p class="budget-line${over ? ' over' : ''}">${I.wallet}<span>${over ? 'Te pasarías del presupuesto: ' : 'Con este regalo llevarías '}<b>${h(eur(after))}</b> de ${h(eur(b))} para ${h(ownerName)}.</span></p>`;
  }
  const whoList = (it) => giftMembers(it).map((m) => `
    <li>${avatar(m, 30, '', true)}<span class="grow">${m.id === S.session.id ? 'Tú' : h(m.name)}</span><span class="tnum muted">${m.amount != null ? `pone ${h(eur(m.amount))}` : 'sin cantidad'}</span></li>`).join('');
  const STATUS = [
    ['pending', 'Por comprar'], ['ordered', 'Pedido'], ['shipping', 'En camino'], ['home', 'En casa'], ['wrapped', 'Envuelto'],
  ];
  const statusOf = (it) => (it.gift && (it.gift.status || (it.gift.bought ? 'home' : 'pending'))) || 'pending';
  const statusLabel = (st) => (STATUS.find(([k]) => k === st) || STATUS[0])[1];
  const statusPicker = (it) => `<div class="status-pick" role="radiogroup" aria-label="Dónde está el regalo">
      ${STATUS.map(([k, label], n) => `<button type="button" role="radio" data-act="status" data-id="${h(it.id)}" data-s="${k}" aria-checked="${statusOf(it) === k}"><span class="dot">${n + 1}</span>${label}</button>`).join('')}
    </div>`;
  const boughtBtn = (it) => it.gift && it.gift.bought
    ? `<button class="btn btn-ghost btn-block bought-on" data-act="bought" data-id="${h(it.id)}" data-v="0">${I.checkCircle}Comprado · desmarcar</button>`
    : `<button class="btn btn-ghost btn-block" data-act="bought" data-id="${h(it.id)}" data-v="1">${I.bag}Marcar como comprado</button>`;

  function openDetail(id) {
    const it = findItem(id); if (!it) return;
    const mine = it.owner_id === S.session.id;
    const owner = mine ? S.session : (S.home && S.home.members.find((m) => m.id === it.owner_id)) || { name: it.owner_name || '', color: it.owner_color || 0 };
    const g = it.gift, open = !!(g && g.open), sid = h(it.id);
    let reserve = '';
    if (!mine && it.discarded) {
      reserve = `<div class="reserve-state warn">${I.alert}<span><b>${h(owner.name)} ya no lo quiere.</b> ${it.reserved_by_me ? 'Si ya lo habías comprado, decide si se lo das igualmente o lo devuelves.' : ''}</span></div>
        ${it.reserved_by_me ? `${statusPicker(it)}<button class="btn btn-ghost btn-block" data-act="unreserve" data-id="${sid}">Salirme del regalo</button>` : ''}`;
    } else if (!mine) {
      if (!it.reserved) reserve = `
        <button class="btn btn-gold btn-block" data-act="reserve" data-id="${sid}">${I.gift}¡Lo regalo yo!</button>
        <button class="btn btn-ghost btn-block" data-act="share" data-id="${sid}">${I.users}Lo regalamos a medias</button>
        ${budgetLine(it, owner.name, Number(it.price) || 0)}
        <p class="secret-note">${I.eyeOff}<span>${h(owner.name)} no verá que lo has reservado. El resto de la familia sí, para no repetir. «A medias» deja que otros se apunten contigo.</span></p>`;
      else if (it.reserved_by_me && !open) reserve = `
        <div class="reserve-state mine">${I.checkCircle}<span><b>Lo regalas tú.</b> Nadie más puede reservarlo.</span></div>
        ${statusPicker(it)}
        <div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" style="flex:1" data-act="share" data-id="${sid}">${I.users}Abrir a medias</button>
          <button class="btn btn-ghost btn-sm" style="flex:1" data-act="unreserve" data-id="${sid}">Ya no lo regalo</button></div>`;
      else if (it.reserved_by_me) {
        const meM = giftMembers(it).find((m) => m.id === S.session.id) || {};
        reserve = `
        <div class="reserve-state mine">${I.users}<span><b>Lo regaláis a medias.</b> ${giftMembers(it).length === 1 ? 'De momento solo tú: el resto de la familia puede apuntarse.' : ''}</span></div>
        <ul class="who-pays">${whoList(it)}</ul>
        <form class="amount-row" data-form="amount" data-id="${sid}" novalidate>
          <label for="f-amount">Yo pongo</label>
          <div class="price-wrap"><input class="input tnum" id="f-amount" inputmode="decimal" placeholder="${h(String(Math.round(myCost(it) * 100) / 100).replace('.', ','))}" value="${meM.amount != null ? h(String(meM.amount).replace('.', ',')) : ''}"><span>€</span></div>
          <button class="btn btn-ghost btn-sm" type="submit">Guardar</button>
        </form>
        ${statusPicker(it)}
        <section class="chat" id="chat" data-id="${sid}" aria-label="Chat secreto del regalo">
          <p class="eyebrow">${I.chat}Chat del regalo · ${h(owner.name)} no lo ve</p>
          <div class="chat-log" id="chat-log"><p class="muted chat-empty">Cargando…</p></div>
          <form class="chat-form" data-form="chat" data-id="${sid}" novalidate>
            <input class="input" id="f-chat" maxlength="500" autocomplete="off" placeholder="Escribe a los que regaláis esto…">
            <button class="btn btn-gold chat-send" type="submit" aria-label="Enviar">${I.send}</button>
          </form>
        </section>
        <button class="btn btn-ghost btn-block" data-act="unreserve" data-id="${sid}">Salirme del regalo</button>`;
      } else if (open) reserve = `
        <div class="reserve-state share">${I.users}<span><b>Lo regalan a medias.</b> ¿Te apuntas?${g.bought ? ' Ya está comprado.' : ''}</span></div>
        <ul class="who-pays">${whoList(it)}</ul>
        <button class="btn btn-gold btn-block" data-act="share" data-id="${sid}">${I.users}Me apunto a medias</button>
        ${budgetLine(it, owner.name, (Number(it.price) || 0) / (giftMembers(it).length + 1))}`;
      else reserve = `<div class="reserve-state">${I.lock}<span>Ya lo regala <b>${h(it.reserved_by || 'otra persona')}</b>.${g && g.bought ? ' Ya está comprado.' : ''} Elige otro deseo.</span></div>`;
    }
    openSheet(`
      ${sheetHead(mine ? 'Tu deseo' : `Deseo de ${owner.name}`, '')}
      <div class="detail">
        <div class="detail-img">${imgHtml(it, owner.color)}</div>
        <div class="stack" style="gap:8px">
          <p class="eyebrow">${[isIdea(it) ? 'Idea · Sorpréndeme' : '', it.category ? h(it.category) : ''].filter(Boolean).join(' · ')}</p>
          <h2>${h(it.title)}</h2>
          <div class="meta-row">${it.price || isIdea(it) ? `<span class="big-price">${h(priceText(it))}</span>` : ''}<span>${stars(it.priority)} ${h(PRIO[it.priority])}</span></div>
          ${isIdea(it) ? `<p class="secret-note">${I.spark}<span>${mine ? 'Es una idea: quien te lo regale elegirá el modelo concreto.' : `${h(owner.name)} deja que elijas tú. Cualquier cosa que encaje con la idea vale.`}</span></p>` : ''}
        </div>
        ${it.notes ? `<div class="notes">${h(it.notes)}</div>` : ''}
        <div class="actions">
          ${reserve}
          ${isUrl(it.url) ? `<a class="btn btn-ghost btn-block" href="${h(safeHref(it.url))}" target="_blank" rel="noopener noreferrer">${I.link}Ver en la tienda</a>` : ''}
          ${mine && it.discarded ? `<div class="reserve-state warn">${I.eyeOff}<span><b>Lo has descartado.</b> La familia ya no lo ve; si alguien lo tenía reservado, le avisamos.</span></div>
            <button class="btn btn-gold btn-block" data-act="discard" data-id="${h(it.id)}" data-v="0">Lo vuelvo a querer</button>` : ''}
          ${mine && !it.discarded ? `<button class="btn btn-ghost btn-block" data-act="discard" data-id="${h(it.id)}" data-v="1">${I.eyeOff}Ya no lo quiero</button>` : ''}
          ${mine ? `<div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost" style="flex:1" data-act="edit" data-id="${h(it.id)}">${I.edit}Editar</button>
            <button class="btn btn-danger" style="flex:1" data-act="ask-delete">${I.trash}Borrar</button></div>
            <div class="confirm-box" id="confirm-del" hidden><p>¿Borrar «${h(it.title)}» de tu carta? No se puede deshacer.</p>
              <div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" style="flex:1" data-act="cancel-delete">Cancelar</button><button class="btn btn-danger btn-sm" style="flex:1" data-act="delete" data-id="${h(it.id)}">Sí, borrar</button></div></div>` : ''}
        </div>
      </div>`, it.title);
    if ($('#chat')) loadChat(it.id, true);
  }

  // ---------- chat secreto
  const chatSeenKey = () => `rdc.chatseen.${S.session.id}`;
  const unreadChat = (it) => {
    const g = it.gift; if (!g || !g.last_msg_at || g.last_msg_by === S.session.id) return false;
    const seen = (ls.get(chatSeenKey()) || {})[it.id];
    return !seen || g.last_msg_at > seen;
  };
  let chatTimer = null;
  async function loadChat(id, first) {
    clearTimeout(chatTimer);
    const log = $('#chat-log'); if (!log || $('#chat').dataset.id !== id) return;
    try {
      const r = await api.messages(S.session.token, id);
      const msgs = r.messages || [];
      const stick = first || log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
      log.innerHTML = msgs.length ? msgs.map((m) => {
        const mine = m.member_id === S.session.id;
        return `<div class="msg${mine ? ' mine' : ''}">${mine ? '' : avatar(m, 26, '', true)}<div class="bubble">${mine ? '' : `<b>${h(m.name)}</b>`}<span>${h(m.body)}</span><time>${h(hhmm(m.created_at))}</time></div></div>`;
      }).join('') : '<p class="muted chat-empty">Aún no hay mensajes. Poneos de acuerdo aquí: quién lo compra, cómo os pagáis…</p>';
      if (stick) log.scrollTop = log.scrollHeight;
      const s = ls.get(chatSeenKey()) || {}; s[id] = msgs.length ? msgs[msgs.length - 1].created_at : new Date().toISOString(); ls.set(chatSeenKey(), s);
    } catch (e) { if (first) log.innerHTML = `<p class="muted chat-empty">${h(errText(e))}</p>`; }
    chatTimer = setTimeout(() => loadChat(id, false), 7000);
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
      priority: it ? it.priority : 2, notes: it ? it.notes || '' : '', dirty: {}, fetching: false, lastFetched: it ? it.url : null,
      kind: isIdea(it) ? 'idea' : 'product' };
    const own = myCategories();
    const cats = [...own, ...SUGGESTED.filter((c) => !own.includes(c))];
    if (F.category && !cats.includes(F.category)) cats.unshift(F.category);
    openSheet(`
      ${sheetHead(id ? 'Editar' : 'Nuevo deseo', id ? 'Editar deseo' : 'Añadir a mi carta')}
      <form class="stack" data-form="item" novalidate>
        <div class="kind-toggle" role="radiogroup" aria-label="Tipo de deseo">
          <button type="button" role="radio" data-act="kind" data-k="product" aria-checked="${F.kind === 'product'}">${I.link}<span><b>Producto concreto</b><small>Con enlace de la tienda</small></span></button>
          <button type="button" role="radio" data-act="kind" data-k="idea" aria-checked="${F.kind === 'idea'}">${I.spark}<span><b>Idea</b><small>«Sorpréndeme con…»</small></span></button>
        </div>
        <div class="stack" id="product-fields">
        <div class="field"><label for="f-url">Enlace del producto</label>
          <div class="url-row"><input class="input" id="f-url" name="url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…" value="${h(F.url)}" ${id ? '' : 'data-autofocus'}>
          ${navigator.clipboard && navigator.clipboard.readText ? `<button class="btn btn-ghost" type="button" data-act="paste-url">Pegar</button>` : ''}</div>
          <p class="fetch-state" id="fetch-state">${id ? '' : 'Pega el enlace y saco la foto, el nombre y el precio.'}</p></div>

        <div class="field"><span class="label">Foto</span>
          <div class="img-drop" id="img-drop"></div>
          <input type="file" id="f-file" accept="image/*" hidden>
          <input type="file" id="f-camera" accept="image/*" capture="environment" hidden></div>
        </div>

        <div class="field"><label for="f-title" id="f-title-l">Nombre</label>
          <input class="input" id="f-title" name="title" maxlength="160" placeholder="Ej.: Botas de fútbol Mercurial" value="${h(F.title)}"></div>

        <div class="two">
          <div class="field"><label for="f-price" id="f-price-l">Precio aproximado</label>
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
    applyKind();
    document.addEventListener('paste', onPasteImage);
  }

  function applyKind() {
    const idea = F.kind === 'idea';
    $$('.kind-toggle [data-act="kind"]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.k === F.kind)));
    $('#product-fields').hidden = idea;
    $('#f-title-l').textContent = idea ? '¿Qué te apetece?' : 'Nombre';
    $('#f-title').placeholder = idea ? 'Ej.: Un libro de fantasía, algo para la cocina…' : 'Ej.: Botas de fútbol Mercurial';
    $('#f-price-l').textContent = idea ? 'Hasta (precio máximo)' : 'Precio aproximado';
    $('#f-price').placeholder = idea ? 'Opcional' : '0,00';
  }

  function paintImage() {
    const box = $('#img-drop'); if (!box) return;
    box.classList.toggle('has', !!F.image);
    const canRead = !!(navigator.clipboard && navigator.clipboard.read);
    box.innerHTML = F.image
      ? `<img src="${h(F.image)}" alt="Foto del deseo" referrerpolicy="no-referrer"><div class="img-tools"><button type="button" class="btn btn-sm" data-act="pick-file">Cambiar</button><button type="button" class="btn btn-sm" data-act="clear-img">Quitar</button></div>`
      : `<div class="hint">${I.image}<span>${F.fetching ? 'Buscando la foto…' : 'Si no sale sola: mantén pulsada la foto en la tienda, «Copiar», y pégala aquí.'}</span>
          <div class="row" style="justify-content:center">${canRead ? '<button type="button" class="btn btn-ghost btn-sm" data-act="paste-img">Pegar foto</button>' : ''}<button type="button" class="btn btn-ghost btn-sm" data-act="pick-camera">${I.camera}Hacer foto</button><button type="button" class="btn btn-ghost btn-sm" data-act="pick-file">Elegir de mis fotos</button></div></div>`;
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
    const hasPhoto = !!S.session.photo;
    openSheet(`
      ${sheetHead('Tu perfil', S.session.name)}
      <div class="profile-photo">
        <button type="button" class="avatar-edit" data-act="pick-avatar" aria-label="${hasPhoto ? 'Cambiar' : 'Poner'} foto de perfil">${avatar(S.session, 104, '', true)}<span class="avatar-cam">${I.image}</span></button>
        <div class="stack" style="gap:8px">
          <button class="btn btn-ghost btn-sm" data-act="pick-avatar">${hasPhoto ? 'Cambiar foto' : 'Poner foto de perfil'}</button>
          ${hasPhoto ? '<button class="btn btn-ghost btn-sm" data-act="clear-avatar">Quitar foto</button>' : ''}
        </div>
        <input type="file" id="f-avatar" accept="image/*" hidden>
      </div>
      <div class="menu-list">
        <button class="btn btn-ghost btn-block" data-act="menu-budget">${I.wallet}${S.budget ? `Presupuesto: ${h(eur(S.budget))} por persona` : 'Ponerme un presupuesto'}</button>
        ${DEMO ? '<button class="btn btn-ghost btn-block" data-act="demo-reset">Restablecer datos de ejemplo</button>' : ''}
        <button class="btn btn-ghost btn-block" data-act="prefs" data-id="${h(S.session.id)}">${I.tag}Mis tallas y gustos</button>
        <button class="btn btn-ghost btn-block" data-act="toggle-sound">${soundOn() ? 'Sonidos y vibración: activados' : 'Sonidos y vibración: desactivados'}</button>
        <button class="btn btn-ghost btn-block" data-act="change-pin">${I.lock}Cambiar mi PIN</button>
        ${S.home && S.home.me && S.home.me.admin ? `<button class="btn btn-ghost btn-block" data-act="change-family">${I.users}Cambiar código de familia</button>` : ''}
        <button class="btn btn-ghost btn-block" data-act="ask-logout-all">Cerrar sesión en todos mis móviles</button>
        <div class="confirm-box" id="confirm-logout-all" hidden><p>Se cerrará tu sesión en cualquier otro móvil donde hayas entrado. En este seguirás dentro.</p>
          <div class="row" style="flex-wrap:nowrap"><button class="btn btn-ghost btn-sm" style="flex:1" data-act="cancel-logout-all">Cancelar</button><button class="btn btn-danger btn-sm" style="flex:1" data-act="logout-all">Cerrar en los demás</button></div></div>
        <button class="btn btn-danger btn-block" data-act="logout">Cerrar sesión</button>
      </div>
      <p class="muted" style="font-size:.85rem;margin:16px 0 0">Para entrar en otro móvil necesitas el código de familia, tu nombre y tu PIN.</p>`, 'Menú');
  }
  // ---------- tallas y gustos
  const PREFS = [
    ['top', 'Camiseta / jersey', 'Ej.: M'], ['bottom', 'Pantalón', 'Ej.: 40 o 30/32'], ['shoes', 'Calzado', 'Ej.: 43'],
    ['ring', 'Otras tallas', 'Anillo, sujetador, guantes…'], ['colors', 'Colores que me gustan', 'Ej.: azul marino, verde'],
    ['likes', 'Me encanta', 'Marcas, aficiones, autores…'], ['dislikes', 'Mejor no', 'Lo que no te gusta o ya tienes'],
    ['notes', 'Otras pistas', 'Lo que ayude a acertar'],
  ];
  function openPrefs(memberId) {
    const mine = memberId === S.session.id;
    const m = mine ? ownerInfo(S.session.id) : ownerInfo(memberId);
    const p = m.prefs || {};
    if (!mine) {
      const rows = PREFS.filter(([k]) => p[k]);
      openSheet(`${sheetHead('Para acertar', `Tallas y gustos de ${m.name}`)}
        ${rows.length ? `<dl class="prefs-list">${rows.map(([k, label]) => `<div><dt>${h(label)}</dt><dd>${h(p[k])}</dd></div>`).join('')}</dl>`
          : `<p class="muted">${h(m.name)} todavía no ha puesto sus tallas.</p>`}`, `Tallas y gustos de ${m.name}`);
      return;
    }
    openSheet(`${sheetHead('Tu perfil', 'Mis tallas y gustos')}
      <form class="stack" data-form="prefs" novalidate>
        <p class="secret-note">${I.users}<span>Lo verá toda la familia, para acertar con la talla y el estilo sin preguntarte.</span></p>
        <div class="two">${PREFS.slice(0, 4).map(([k, label, ph]) => `<div class="field"><label for="p-${k}">${label}</label><input class="input" id="p-${k}" maxlength="200" placeholder="${h(ph)}" value="${h(p[k] || '')}"></div>`).join('')}</div>
        ${PREFS.slice(4).map(([k, label, ph]) => `<div class="field"><label for="p-${k}">${label}</label><input class="input" id="p-${k}" maxlength="200" placeholder="${h(ph)}" value="${h(p[k] || '')}"></div>`).join('')}
        <button class="btn btn-gold btn-block" type="submit">Guardar</button>
      </form>`, 'Mis tallas y gustos');
  }

  // ---------- ordenar mi carta arrastrando (SortableJS se carga solo cuando hace falta)
  let sortable = null;
  function loadSortable() {
    if (window.Sortable) return Promise.resolve();
    return new Promise((ok, ko) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js';
      sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc);
    });
  }
  async function startSortable() {
    try { await loadSortable(); } catch { toast('No he podido cargar el modo ordenar. Revisa la conexión.'); S.reorder = false; return; }
    const grid = $('#reorder-grid'); if (!grid) return;
    if (sortable) { try { sortable.destroy(); } catch { /* nada */ } }
    sortable = window.Sortable.create(grid, {
      animation: 160, delay: 120, delayOnTouchOnly: true, ghostClass: 'drag-ghost', chosenClass: 'drag-chosen',
      onEnd: () => { if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* nada */ } },
    });
  }
  async function saveOrder() {
    const grid = $('#reorder-grid');
    const ids = grid ? $$('.card', grid).map((c) => c.dataset.id) : [];
    S.reorder = false;
    if (sortable) { try { sortable.destroy(); } catch { /* nada */ } sortable = null; }
    if (ids.length) {
      try {
        await api.reorder(S.session.token, ids);
        const list = S.items[S.session.id] || [];
        ids.forEach((id, n) => { const it = list.find((i) => i.id === id); if (it) it.position = n + 1; });
        list.sort((a, b) => (!!a.discarded - !!b.discarded) || ((a.position || 1e6) - (b.position || 1e6)));
        toast('Orden guardado');
      } catch (err) { handleErr(err); }
    }
    S.cat[S.session.id] = 'all';
    renderList(S.session.id);
  }

  // ---------- sonido y vibración (sin archivos: notas generadas)
  const soundOn = () => ls.get(K.sound) !== false;
  let actx = null;
  function unlockAudio() {
    if (!soundOn()) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch { actx = null; }
  }
  function chime(kind) {
    if (!soundOn()) return;
    unlockAudio();
    if (navigator.vibrate) try { navigator.vibrate(kind === 'done' ? [20, 60, 30] : 12); } catch { /* nada */ }
    if (!actx) return;
    const notes = kind === 'done' ? [1046.5, 1318.5, 1568] : [880];
    const t0 = actx.currentTime;
    notes.forEach((f, n) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + n * 0.09);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + n * 0.09 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n * 0.09 + 0.55);
      o.connect(g); g.connect(actx.destination);
      o.start(t0 + n * 0.09); o.stop(t0 + n * 0.09 + 0.6);
    });
  }

  function openPinForm() {
    const pinInput = (id, label) => `<div class="field"><label for="${id}">${label}</label>
      <input class="input pin-input tnum" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></div>`;
    openSheet(`${sheetHead('Seguridad', 'Cambiar mi PIN')}
      <form class="stack" data-form="change-pin" novalidate>
        ${pinInput('f-pin-old', 'Tu PIN actual')}${pinInput('f-pin-new', 'PIN nuevo (4 números)')}${pinInput('f-pin-new2', 'Repite el PIN nuevo')}
        <p class="secret-note">${I.lock}<span>Al cambiarlo se cerrará tu sesión en los demás móviles.</span></p>
        <p class="error-msg" id="pin-form-error"></p>
        <button class="btn btn-gold btn-block" type="submit">Guardar PIN nuevo</button>
      </form>`, 'Cambiar mi PIN');
    setTimeout(() => $('#f-pin-old').focus(), 80);
  }
  function openFamilyForm() {
    openSheet(`${sheetHead('Administrador', 'Código de familia')}
      <form class="stack" data-form="family" novalidate>
        <div class="field"><label for="f-family">Código nuevo</label>
          <input class="input" id="f-family" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Al menos 6 letras o números"></div>
        <p class="secret-note">${I.info}<span>Quien ya ha entrado no tendrá que escribirlo otra vez. Las personas nuevas necesitarán el código nuevo, y tú tendrás que aceptarlas.</span></p>
        <p class="error-msg" id="family-form-error"></p>
        <button class="btn btn-gold btn-block" type="submit">Guardar código</button>
      </form>`, 'Código de familia');
    setTimeout(() => $('#f-family').focus(), 80);
  }

  // ---------------------------------------------------------------- eventos
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (el && (el.dataset.act === 'status' || el.dataset.act === 'reserve' || el.dataset.act === 'share')) unlockAudio();
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'backdrop' && e.target !== el) return;
    const id = el.dataset.id;
    switch (act) {
      case 'pick': S.auth.pick = id; S.auth.step = 'pin'; S.auth.error = ''; resetPins(); renderAuth(); window.scrollTo({ top: 0 }); break;
      case 'new': S.auth.step = 'new'; S.auth.error = ''; S.auth.name = ''; resetPins(); renderAuth(); break;
      case 'back-who': S.auth.step = 'who'; S.auth.error = ''; resetPins(); renderAuth(); break;
      case 'key': pinPress(el.dataset.k); break;
      case 'pin-focus': if (S.auth.step === 'new') { S.pin.active = el.dataset.pin; paintPins(); } break;
      case 'reset-family': ls.del(K.family); S.family = null; S.auth = { step: 'code', members: [], error: '' }; renderAuth(); break;
      case 'menu': openMenu(); break;
      case 'logout': logout(); break;
      case 'check-pending': el.disabled = true; S.home = null; render(); break;
      case 'ack-fails': try { await api.ackFails(S.session.token); S.home.me.fails = 0; render(); } catch (err) { handleErr(err); } break;
      case 'approve': case 'reject': {
        if (act === 'reject' && el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = 'Rechazar'; el.classList.add('btn-danger'); break; }
        el.disabled = true;
        try { await api.approve(S.session.token, id, act === 'approve'); toast(act === 'approve' ? 'Aceptado en la familia' : 'Solicitud rechazada'); S.home = null; render(); }
        catch (err) { el.disabled = false; handleErr(err); }
        break;
      }
      case 'change-pin': openPinForm(); break;
      case 'change-family': openFamilyForm(); break;
      case 'ask-logout-all': $('#confirm-logout-all').hidden = false; break;
      case 'cancel-logout-all': $('#confirm-logout-all').hidden = true; break;
      case 'logout-all':
        el.disabled = true;
        try { const r = await api.logoutAll(S.session.token); S.session.token = r.token; ls.set(K.session, S.session); closeSheet(); toast('Sesión cerrada en tus otros móviles'); }
        catch (err) { el.disabled = false; handleErr(err); }
        break;
      case 'demo-reset': demo.reset(); S.home = null; S.items = {}; S.gifts = null; closeSheet(); toast('Datos de ejemplo restablecidos'); logout(); break;
      case 'open-list': go(id === S.session.id ? 'mia' : 'lista-' + id); break;
      case 'home': go(''); break;
      case 'gifts': go('regalos'); break;
      case 'cat': { const r = route(); S.cat[r.owner] = el.dataset.cat; renderList(r.owner); window.scrollTo({ top: 0 }); break; }
      case 'item': if (!S.reorder) openDetail(id); break;
      case 'prefs': openPrefs(id); break;
      case 'album': go('album'); break;
      case 'album-file': $('#f-album').click(); break;
      case 'album-camera': $('#f-album-cam').click(); break;
      case 'album-open': openAlbumPhoto(id); break;
      case 'album-ask-delete': $('#confirm-album').hidden = false; el.hidden = true; break;
      case 'album-cancel-delete': $('#confirm-album').hidden = true; $('[data-act="album-ask-delete"]').hidden = false; break;
      case 'album-delete':
        el.disabled = true;
        try { await api.albumDelete(S.session.token, id); closeSheet(); toast('Foto borrada'); S.album = null; renderAlbum(); }
        catch (err) { el.disabled = false; handleErr(err); }
        break;
      case 'reorder': S.reorder = true; renderList(S.session.id); break;
      case 'reorder-done': await saveOrder(); break;
      case 'status': {
        chime('soft'); el.disabled = true;
        try {
          await api.setStatus(S.session.token, id, el.dataset.s);
          if (el.dataset.s === 'wrapped' || el.dataset.s === 'home') chime('done');
          await afterGiftChange(id, `Marcado: ${statusLabel(el.dataset.s).toLowerCase()}`, true);
        } catch (err) { el.disabled = false; handleErr(err); }
        break;
      }
      case 'discard':
        el.disabled = true;
        try {
          await api.setDiscarded(S.session.token, id, el.dataset.v === '1');
          closeSheet(); toast(el.dataset.v === '1' ? 'Descartado: la familia ya no lo verá' : 'De vuelta en tu carta');
          S.home = null; refreshCurrent();
        } catch (err) { el.disabled = false; handleErr(err); }
        break;
      case 'toggle-sound': ls.set(K.sound, !soundOn()); if (soundOn()) chime('done'); openMenu(); break;
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
      case 'reserve': case 'unreserve': case 'share': case 'bought':
        el.disabled = true; unlockAudio();
        try {
          if (act === 'share') await api.share(S.session.token, id);
          else if (act === 'bought') await api.setBought(S.session.token, id, el.dataset.v === '1');
          else await api.reserve(S.session.token, id, act === 'reserve');
          if (act === 'reserve' || act === 'share') chime('done');
          const msg = { reserve: '¡Apuntado! Es tu regalo', unreserve: 'Ya no participas en este regalo', share: 'Apuntado a medias', bought: el.dataset.v === '1' ? 'Marcado como comprado' : 'Desmarcado' }[act];
          await afterGiftChange(id, msg, act === 'share' || act === 'bought');
        } catch (err) {
          el.disabled = false; handleErr(err);
          if (err.code === 'ocupado') { closeSheet(); await afterGiftChange(id, null, false); }
        }
        break;
      case 'edit-budget': S.editBudget = true; renderGifts(); break;
      case 'menu-budget': closeSheet(); S.editBudget = true; if (route().view === 'gifts') renderGifts(); else { location.hash = 'regalos'; } break;
      case 'clear-budget': saveBudget(null); break;
      case 'kind': F.kind = el.dataset.k; applyKind(); if (F.kind === 'idea') $('#f-title').focus(); break;
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
      case 'pick-camera': $('#f-camera').click(); break;
      case 'pick-avatar': $('#f-avatar').click(); break;
      case 'clear-avatar': savePhoto(null); break;
      case 'clear-img': F.image = null; paintImage(); break;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'f-name') { S.auth.name = t.value; return; }
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
    if ((e.target.id === 'f-album' || e.target.id === 'f-album-cam') && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; startAlbumUpload(f); }
    if ((e.target.id === 'f-file' || e.target.id === 'f-camera') && e.target.files[0]) { setImageBlob(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'f-avatar' && e.target.files[0]) {
      const file = e.target.files[0]; e.target.value = '';
      compressAvatar(file).then(savePhoto, () => toast('No he podido leer esa imagen.'));
    }
  });

  // tras reservar, apuntarse a medias, marcar comprado o cambiar mi parte: datos frescos y misma pantalla
  async function afterGiftChange(id, msg, reopen) {
    const r = route();
    try {
      const jobs = [api.gifts(S.session.token)];
      if (r.view === 'list') jobs.push(api.items(S.session.token, r.owner));
      const [g, l] = await Promise.all(jobs);
      S.gifts = g.items || []; if (g.budget != null) S.budget = Number(g.budget);
      if (l) S.items[r.owner] = l.items || [];
    } catch (err) { handleErr(err); }
    closeSheet();
    if (msg) toast(msg);
    render();
    if (reopen && findItem(id)) openDetail(id);
  }

  async function saveBudget(amount) {
    try {
      await api.setBudget(S.session.token, amount);
      S.budget = amount; S.editBudget = false;
      toast(amount ? 'Presupuesto guardado' : 'Presupuesto quitado');
      renderGifts();
    } catch (err) { handleErr(err); }
  }

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
    const showErr = (msg) => { const p = $('.error-msg', form); if (p) p.textContent = msg; };
    // errores del PIN: se repinta la pantalla con el aviso y se agita la casilla afectada
    const pinErr = (msg, shake = 'pin') => { S.auth.error = msg; renderAuth(); shakePins(shake); };
    if (kind === 'album') {
      if (!albumDraft) return;
      btn.disabled = true; btn.textContent = 'Subiendo…';
      try {
        await api.albumAdd(S.session.token, albumDraft.thumb, albumDraft.photo, $('#f-caption').value.trim());
        albumDraft = null; closeSheet(); chime('done'); toast('¡Foto en el álbum!'); S.album = null; renderAlbum();
      } catch (e2) { btn.disabled = false; btn.textContent = 'Reintentar'; handleErr(e2); }
      return;
    }
    if (kind === 'chat') {
      const inp = $('#f-chat'), body = inp.value.trim();
      if (!body) return;
      btn.disabled = true;
      try { await api.sendMessage(S.session.token, form.dataset.id, body); inp.value = ''; chime('soft'); await loadChat(form.dataset.id, true); }
      catch (e2) { handleErr(e2); }
      btn.disabled = false; inp.focus();
      return;
    }
    if (kind === 'prefs') {
      const prefs = {}; PREFS.forEach(([k]) => { const v = $('#p-' + k).value.trim(); if (v) prefs[k] = v; });
      btn.disabled = true;
      try {
        await api.setPrefs(S.session.token, prefs);
        if (S.home && S.home.me) S.home.me.prefs = prefs;
        closeSheet(); toast('Tallas y gustos guardados'); render();
      } catch (e2) { btn.disabled = false; handleErr(e2); }
      return;
    }
    if (kind === 'change-pin') {
      const o = $('#f-pin-old').value, n = $('#f-pin-new').value, n2 = $('#f-pin-new2').value, err = $('#pin-form-error');
      if (!/^\d{4}$/.test(o) || !/^\d{4}$/.test(n)) { err.textContent = ERR.pin_formato; return; }
      if (n !== n2) { err.textContent = 'Los dos PIN nuevos no coinciden.'; return; }
      btn.disabled = true;
      try {
        const r = await api.changePin(S.session.token, o, n);
        S.session.token = r.token; ls.set(K.session, S.session);
        if (S.home) S.home.me.fails = 0;
        closeSheet(); toast('PIN cambiado'); render();
      } catch (e2) { btn.disabled = false; err.textContent = errText(e2); }
      return;
    }
    if (kind === 'family') {
      const code = $('#f-family').value.trim(), err = $('#family-form-error');
      if (code.replace(/\s/g, '').length < 6) { err.textContent = ERR.codigo; return; }
      btn.disabled = true;
      try { await api.setFamily(S.session.token, code); S.family = code; ls.set(K.family, code); closeSheet(); toast('Código de familia cambiado'); }
      catch (e2) { btn.disabled = false; err.textContent = errText(e2); }
      return;
    }
    if (kind === 'budget') {
      const raw = $('#f-budget').value.trim();
      if (!raw) return saveBudget(null);
      const v = parsePrice(raw);
      if (!v) { toast('Escribe una cantidad, por ejemplo 100'); return; }
      return saveBudget(v);
    }
    if (kind === 'amount') {
      const raw = $('#f-amount').value.trim();
      const v = raw ? parsePrice(raw) : null;
      if (raw && v == null) { toast('Escribe una cantidad, por ejemplo 50'); return; }
      try { await api.setAmount(S.session.token, form.dataset.id, v); await afterGiftChange(form.dataset.id, 'Tu parte guardada', true); }
      catch (err) { handleErr(err); }
      return;
    }
    if (kind === 'code') {
      const code = $('#f-code').value.trim();
      if (!code) return showErr('Escribe el código de la familia.');
      btn.disabled = true;
      try { const r = await api.members(code); S.family = code; ls.set(K.family, code); S.auth = { step: r.members.length ? 'who' : 'new', members: r.members, error: '' }; renderAuth(); }
      catch (err) { btn.disabled = false; showErr(errText(err)); }
    }
    if (kind === 'login') {
      const pin = S.pin.pin;
      if (pin.length !== 4) return pinErr(ERR.pin_formato);
      btn.disabled = true;
      try { startSession(await api.login(S.family, S.auth.pick, pin)); }
      catch (err) { resetPins(); pinErr(errText(err)); }
    }
    if (kind === 'register') {
      const name = $('#f-name').value.trim(), { pin, pin2 } = S.pin;
      S.auth.name = name;
      if (!name) { pinErr(ERR.nombre, ''); $('#f-name').focus(); return; }
      if (pin.length !== 4) { S.pin.active = 'pin'; return pinErr(ERR.pin_formato, 'pin'); }
      if (pin !== pin2) { S.pin.pin2 = ''; S.pin.active = 'pin2'; return pinErr('Los dos PIN no coinciden.', 'pin2'); }
      btn.disabled = true;
      try { const r = await api.register(S.family, name, pin); startSession(r); if (!r.pending) toast(`¡Bienvenido, ${name}!`); }
      catch (err) { pinErr(errText(err), ''); }
    }
    if (kind === 'item') {
      const title = $('#f-title').value.trim();
      if (!title) { $('#form-error').textContent = ERR.titulo; $('#f-title').focus(); return; }
      const price = parsePrice($('#f-price').value);
      const category = ($('#f-cat').hidden ? F.category : $('#f-cat').value).trim();
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const idea = F.kind === 'idea';
        await api.save(S.session.token, { id: F.id, kind: F.kind, url: idea ? null : ($('#f-url').value.trim() || null), title, price, image: idea ? null : F.image, category, priority: F.priority, notes: $('#f-notes').value });
        const editing = !!F.id;
        F = null; closeSheet();
        toast(editing ? 'Cambios guardados' : 'Añadido a tu carta');
        if (!editing) chime('soft');
        S.home = null;
        if (category) S.cat[S.session.id] = S.cat[S.session.id] === 'all' || !S.cat[S.session.id] ? 'all' : category;
        if (route().view === 'list' && route().owner === S.session.id) refreshCurrent(); else go('mia');
      } catch (err) { btn.disabled = false; btn.textContent = 'Reintentar'; $('#form-error').textContent = errText(err); if (err.code === 'sesion') handleErr(err); }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetRoot.innerHTML) { closeSheet(); F = null; return; }
    // en ordenador, el PIN también se puede escribir con el teclado físico
    if (!S.session && (S.auth.step === 'pin' || S.auth.step === 'new') && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
      if (/^\d$/.test(e.key)) { e.preventDefault(); pinPress(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); pinPress('del'); }
    }
  });
  window.addEventListener('hashchange', () => {
    closeSheet(); F = null; S.reorder = false; if (route().view !== 'gifts') S.editBudget = false; window.scrollTo({ top: 0 });
    const r = route(); if (r.view !== 'list' || r.owner !== S.viewing) S.viewing = null;
    render();
  });
  // al volver a la app (cambio de pestaña), refrescar datos para ver lo que han hecho los demás
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.session && !sheetRoot.innerHTML) { S.home = null; refreshCurrent(); } });

  function refreshCurrent() { render(); }

  // ---------------------------------------------------------------- gestos móviles
  // deslizar una hoja hacia abajo (desde arriba del todo) la cierra
  (() => {
    let y0 = null, dy = 0, sheet = null;
    document.addEventListener('touchstart', (e) => {
      sheet = e.target.closest('.sheet');
      if (!sheet || sheet.scrollTop > 0 || e.target.closest('input, textarea, .keypad')) { sheet = null; return; }
      y0 = e.touches[0].clientY; dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!sheet || y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0 && sheet.scrollTop <= 0) { sheet.classList.add('dragging'); sheet.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!sheet || y0 == null) return;
      const s = sheet; sheet = null; y0 = null;
      s.classList.remove('dragging');
      if (dy > 110) { closeSheet(); F = null; return; }
      s.classList.add('snap'); s.style.transform = '';
      setTimeout(() => s.classList.remove('snap'), 250);
    });
  })();

  // tirar hacia abajo para actualizar (solo con la app abierta desde la pantalla de inicio,
  // porque en el navegador ya lo hace Safari/Chrome)
  (() => {
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    if (!standalone) return;
    const ptr = document.createElement('div');
    ptr.id = 'ptr'; ptr.setAttribute('aria-hidden', 'true'); ptr.innerHTML = '<img src="img/estrella.png" alt="">';
    document.body.appendChild(ptr);
    let y0 = null, dy = 0, busy = false;
    const show = (d) => { const p = Math.min(1, d / 90); ptr.style.opacity = p; ptr.style.transform = `translateY(${Math.min(d, 90) - 70}px)`; ptr.firstChild.style.transform = `rotate(${d * 3}deg)`; };
    const hide = () => { ptr.style.transition = 'transform .25s, opacity .25s'; ptr.style.transform = 'translateY(-70px)'; ptr.style.opacity = 0; setTimeout(() => { ptr.style.transition = ''; }, 260); };
    document.addEventListener('touchstart', (e) => {
      y0 = (!busy && S.session && !sheetRoot.innerHTML && window.scrollY <= 0 && !e.target.closest('.chips')) ? e.touches[0].clientY : null; dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) show(dy); }, { passive: true });
    document.addEventListener('touchend', async () => {
      if (y0 == null) return; y0 = null;
      if (dy < 90) { hide(); return; }
      busy = true; ptr.classList.add('loading');
      S.home = null; S.gifts = null;
      const r = route();
      try {
        if (r.view === 'list') S.items[r.owner] = (await api.items(S.session.token, r.owner)).items || [];
        await checkUpdate();
      } catch { /* render() avisará */ }
      render();
      ptr.classList.remove('loading'); hide(); busy = false;
    });
  })();

  const APP_VERSION = 13;
  async function checkUpdate() {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const { v } = await r.json();
      if (!(v > APP_VERSION)) return;
      if (sessionStorage.getItem('rdc.reloaded') === String(v)) return; // evita bucles si la caché aún sirve lo viejo
      sessionStorage.setItem('rdc.reloaded', String(v));
      location.replace(location.pathname + '?v=' + v + location.hash);
    } catch { /* sin conexión o sin version.json (modo demo) */ }
  }
  checkUpdate();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

  try { localStorage.removeItem(K.theme); } catch { /* tema único */ }
  render();
})();
