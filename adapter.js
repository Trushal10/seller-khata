/*
 * Seller Khata — Supabase connector.
 * Gives the app the same storage interface it uses inside Claude
 * (window.claude.use('db' | 'assets' | 'downloads')), backed by your own
 * Supabase project, and adds email + password sign-in.
 */
(function () {
  'use strict';
  const cfg = window.SK_CONFIG || {};
  const configured = /^https:\/\/\S+$/.test(cfg.supabaseUrl || '') && !!cfg.supabaseKey && !/__SUPABASE|YOUR_/.test(cfg.supabaseUrl + cfg.supabaseKey);
  let resolveCaps;
  const capsP = new Promise(r => { resolveCaps = r; });
  window.claude = Object.freeze({ use: async name => { const c = await capsP; return c ? (c[name] || null) : null; } });

  /* ---------------- sign-in screen ---------------- */
  let box = null;
  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(k => k && e.appendChild(k));
    return e;
  }
  function screen(build) {
    if (box) box.remove();
    box = el('div', { class: 'auth-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sign in to Seller Khata' });
    const card = el('form', { class: 'card auth-card', novalidate: true });
    card.appendChild(el('div', { class: 'brand' }, [
      el('div', { class: 'brand-mark', 'aria-hidden': 'true', text: '₹' }),
      el('div', {}, [el('div', { class: 'brand-name', text: 'Seller Khata' }), el('div', { class: 'brand-sub', text: 'Stock, orders and profit for Meesho & Flipkart' })])
    ]));
    build(card);
    box.appendChild(card);
    (document.body || document.documentElement).appendChild(box);
    const first = card.querySelector('input');
    if (first) setTimeout(() => first.focus(), 50);
  }
  function hideScreen() { if (box) { box.remove(); box = null; } }
  function msgEl() { return el('p', { class: 'note bad', hidden: true, role: 'alert' }); }
  function show(m, text, kind) { m.textContent = text; m.className = 'note ' + (kind || 'bad'); m.hidden = !text; }
  function field(label, input) { return el('label', { class: 'field' }, [el('span', { text: label }), input]); }
  function busy(btn, on, text) { btn.disabled = on; btn.textContent = text; }
  function friendly(e) {
    const m = String((e && e.message) || e || '');
    if (/invalid login credentials/i.test(m)) return 'Email or password is wrong. Try again, or reset your password.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first. Open the link Supabase sent you, then sign in.';
    if (/already registered|already been registered|user already exists/i.test(m)) return 'This email already has an account. Sign in instead.';
    if (/password should be at least|weak password/i.test(m)) return 'Use a password of at least 6 characters.';
    if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Can’t reach the server. Check your internet connection.';
    if (/signups not allowed|signup is disabled/i.test(m)) return 'New accounts are turned off for this khata.';
    return m || 'Something went wrong. Try again.';
  }

  function signInScreen(sb, mode) {
    mode = mode || 'signin';
    screen(card => {
      const titles = { signin: 'Sign in', signup: 'Create your account', forgot: 'Reset your password' };
      card.appendChild(el('h2', { text: titles[mode] }));
      if (mode === 'signup') card.appendChild(el('p', { class: 'small muted', text: 'Do this once. Then sign in with the same email and password on your phone and computer.' }));
      if (mode === 'forgot') card.appendChild(el('p', { class: 'small muted', text: 'We’ll email you a link to set a new password.' }));
      const email = el('input', { class: 'in', type: 'email', id: 'sk-email', autocomplete: 'email', inputmode: 'email', required: true, placeholder: 'you@example.com' });
      card.appendChild(field('Email', email));
      let pass = null;
      if (mode !== 'forgot') {
        pass = el('input', { class: 'in', type: 'password', id: 'sk-pass', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', minlength: '6', required: true });
        card.appendChild(field(mode === 'signup' ? 'Choose a password (6+ characters)' : 'Password', pass));
      }
      const m = msgEl(); card.appendChild(m);
      const go = el('button', { class: 'btn btn-p', type: 'submit', text: mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link' });
      card.appendChild(go);
      const links = el('div', { class: 'auth-links' });
      if (mode === 'signin') {
        links.appendChild(el('button', { type: 'button', class: 'btn-link', text: 'New here? Create your account', onclick: () => signInScreen(sb, 'signup') }));
        links.appendChild(el('button', { type: 'button', class: 'btn-link', text: 'Forgot password?', onclick: () => signInScreen(sb, 'forgot') }));
      } else links.appendChild(el('button', { type: 'button', class: 'btn-link', text: 'Back to sign in', onclick: () => signInScreen(sb, 'signin') }));
      card.appendChild(links);
      card.addEventListener('submit', async e => {
        e.preventDefault();
        const em = email.value.trim(), pw = pass ? pass.value : '';
        if (!/^\S+@\S+\.\S+$/.test(em)) { show(m, 'Enter a valid email address.'); return; }
        if (pass && pw.length < 6) { show(m, 'Use a password of at least 6 characters.'); return; }
        show(m, '');
        const label = go.textContent;
        try {
          if (mode === 'signin') {
            busy(go, true, 'Signing in…');
            const { data, error } = await sb.auth.signInWithPassword({ email: em, password: pw });
            if (error) throw error;
            start(sb, data.session);
          } else if (mode === 'signup') {
            busy(go, true, 'Creating…');
            const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
            if (error) throw error;
            if (data.session) start(sb, data.session);
            else { show(m, 'Account created. Check your email and open the confirmation link, then sign in here.', 'info'); busy(go, false, label); }
          } else {
            busy(go, true, 'Sending…');
            const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
            if (error) throw error;
            show(m, 'Check your email for the reset link.', 'info'); busy(go, false, label);
          }
        } catch (err) { show(m, friendly(err)); busy(go, false, label); }
      });
    });
  }
  function newPasswordScreen(sb) {
    screen(card => {
      card.appendChild(el('h2', { text: 'Set a new password' }));
      const pass = el('input', { class: 'in', type: 'password', id: 'sk-newpass', autocomplete: 'new-password', minlength: '6', required: true });
      card.appendChild(field('New password (6+ characters)', pass));
      const m = msgEl(); card.appendChild(m);
      const go = el('button', { class: 'btn btn-p', type: 'submit', text: 'Save password' }); card.appendChild(go);
      card.addEventListener('submit', async e => {
        e.preventDefault();
        if (pass.value.length < 6) { show(m, 'Use a password of at least 6 characters.'); return; }
        busy(go, true, 'Saving…');
        const { data, error } = await sb.auth.updateUser({ password: pass.value });
        if (error) { show(m, friendly(error)); busy(go, false, 'Save password'); return; }
        const s = await sb.auth.getSession();
        if (s.data.session) start(sb, s.data.session); else signInScreen(sb);
      });
    });
  }
  function notConfiguredScreen() {
    screen(card => {
      card.appendChild(el('h2', { text: 'Almost ready' }));
      card.appendChild(el('p', { class: 'small', text: 'This copy of Seller Khata isn’t connected to its database yet. Add your Supabase project URL and key in config.js, as shown in README.md.' }));
    });
  }

  /* ---------------- database ---------------- */
  function toErr(e) {
    if (!e) return { code: 'unavailable', message: '' };
    const m = String(e.message || e.error_description || e.error || ''), st = Number(e.status || e.statusCode || 0);
    if (e.code === '42501' || /row-level security|permission denied|jwt/i.test(m) || st === 401 || st === 403) return { code: 'invalid_argument', message: m };
    if (st === 413 || /too large|exceeded the maximum/i.test(m)) return { code: 'too_large', message: m };
    if (/mime type|invalid.*type/i.test(m)) return { code: 'unsupported_type', message: m };
    return { code: 'unavailable', message: m };
  }
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const META = Object.freeze({ fromCache: false, hasPendingWrites: false });
  function splitPath(path, even) {
    const segs = String(path).split('/');
    if (segs.some(s => !s || !/^[A-Za-z0-9_\-.~:@+]+$/.test(s))) throw new TypeError('Bad path: ' + path);
    if ((segs.length % 2 === 0) !== even) throw new TypeError((even ? 'Document' : 'Collection') + ' path has the wrong number of segments: ' + path);
    return segs;
  }
  function deepMerge(a, b) {
    const out = { ...(a || {}) };
    for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? deepMerge(out[k], v) : v;
    return out;
  }
  function makeDb(sb, uid) {
    const subs = new Set();
    const notify = coll => { for (const s of subs) if (!coll || s.coll === coll) s.schedule(); };
    try {
      sb.channel('sk-docs-' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => notify((p.new && p.new.coll) || (p.old && p.old.coll) || null))
        .subscribe();
    } catch (e) { console.warn('Live updates unavailable', e); }
    const refreshAll = () => notify(null);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAll(); });
    window.addEventListener('online', refreshAll);
    setInterval(() => { if (document.visibilityState === 'visible') refreshAll(); }, 60000);

    function listen(coll, run) {
      let timer = null;
      const s = { coll, schedule: () => { clearTimeout(timer); timer = setTimeout(run, 120); } };
      subs.add(s); run();
      return () => { subs.delete(s); clearTimeout(timer); };
    }
    function serial(fn) {
      let running = false, again = false, active = true;
      const run = async () => {
        if (!active) return;
        if (running) { again = true; return; }
        running = true;
        try { await fn(); } catch (e) { console.warn('Refresh failed', e); }
        finally { running = false; if (again && active) { again = false; run(); } }
      };
      run.stop = () => { active = false; };
      return run;
    }
    function docRef(coll, id) {
      const ref = {
        id, path: coll + '/' + id,
        async get() {
          const { data, error } = await sb.from('docs').select('data').eq('coll', coll).eq('id', id).maybeSingle();
          if (error) throw toErr(error);
          const body = data ? freeze(data.data) : undefined;
          return Object.freeze({ id, exists: !!data, data: () => body, metadata: META });
        },
        async set(body) {
          if (!body || typeof body !== 'object' || Array.isArray(body)) throw { code: 'invalid_argument', message: 'Body must be an object' };
          const { error } = await sb.from('docs').upsert({ owner: uid, coll, id, data: body, updated_at: new Date().toISOString() });
          if (error) throw toErr(error);
          notify(coll);
        },
        async update(body) {
          const cur = await ref.get();
          if (!cur.exists) throw { code: 'invalid_argument', message: 'Document does not exist' };
          await ref.set(deepMerge(cur.data(), body));
        },
        async delete() {
          const { error } = await sb.from('docs').delete().eq('coll', coll).eq('id', id);
          if (error) throw toErr(error);
          notify(coll);
        },
        onSnapshot(next) {
          const run = serial(async () => { const s = await ref.get(); next(s); });
          const off = listen(coll, run);
          return () => { run.stop(); off(); };
        },
        collection(sub) { return query(coll + '/' + id + '/' + sub); }
      };
      return Object.freeze(ref);
    }
    function query(coll, filters, lim, order) {
      filters = filters || []; lim = lim || 1000;
      async function rows() {
        let q = sb.from('docs').select('id,data').eq('coll', coll);
        for (const [f, op, v] of filters) {
          const col = 'data->>' + f, val = v == null ? v : String(v);
          if (op === '==') q = q.eq(col, val); else if (op === '!=') q = q.neq(col, val);
          else if (op === '>=') q = q.gte(col, val); else if (op === '>') q = q.gt(col, val);
          else if (op === '<=') q = q.lte(col, val); else if (op === '<') q = q.lt(col, val);
          else throw { code: 'invalid_argument', message: 'Unsupported filter ' + op };
        }
        q = q.order(order ? 'data->>' + order[0] : 'id', { ascending: !order || order[1] !== 'desc' }).limit(Math.min(1000, lim));
        const { data, error } = await q;
        if (error) throw toErr(error);
        return data || [];
      }
      const snap = list => {
        const docs = list.map(r => { const body = freeze(r.data); return Object.freeze({ id: r.id, exists: true, data: () => body, metadata: META }); });
        return Object.freeze({ docs, size: docs.length, empty: !docs.length, docChanges: () => docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })), metadata: META });
      };
      return Object.freeze({
        path: coll,
        where: (f, op, v) => query(coll, [...filters, [f, op, v]], lim, order),
        orderBy: (f, dir) => query(coll, filters, lim, [f, dir || 'asc']),
        limit: n => query(coll, filters, n, order),
        get: async () => snap(await rows()),
        onSnapshot(next) {
          const run = serial(async () => { next(snap(await rows())); });
          const off = listen(coll, run);
          return () => { run.stop(); off(); };
        },
        doc: id => { const d = id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); splitPath(coll + '/' + d, true); return docRef(coll, d); },
        add: async body => { const r = docRef(coll, Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); await r.set(body); return r; }
      });
    }
    return Object.freeze({
      doc: path => { const segs = splitPath(path, true); return docRef(segs.slice(0, -1).join('/'), segs[segs.length - 1]); },
      collection: path => { splitPath(path, false); return query(path); }
    });
  }

  /* ---------------- photos ---------------- */
  const publicUrl = path => cfg.supabaseUrl.replace(/\/$/, '') + '/storage/v1/object/public/photos/' + String(path).split('/').map(encodeURIComponent).join('/');
  function makeAssets(sb, uid) {
    return Object.freeze({
      async upload(blob, opts) {
        const type = (opts && opts.type) || blob.type || 'image/jpeg';
        const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
        const path = uid + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
        const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
        if (error) throw toErr(error);
        return { id: path, url: publicUrl(path), sizeBytes: blob.size, contentType: type };
      },
      async list() {
        let files = 0, bytes = 0, offset = 0;
        for (;;) {
          const { data, error } = await sb.storage.from('photos').list(uid, { limit: 1000, offset });
          if (error) throw toErr(error);
          for (const f of data || []) { files++; bytes += (f.metadata && f.metadata.size) || 0; }
          if (!data || data.length < 1000) break;
          offset += 1000;
        }
        return { assets: [], usage: { files, bytes, maxFiles: 100000, maxBytes: 1073741824 } };
      },
      async delete(ref) {
        const path = String(ref);
        if (path.startsWith('repo:') || !path.startsWith(uid + '/')) return { deleted: false };
        const { error } = await sb.storage.from('photos').remove([path]);
        if (error) throw toErr(error);
        return { deleted: true };
      }
    });
  }

  /* ---------------- downloads ---------------- */
  const downloads = Object.freeze({
    async save({ filename, data }) {
      const type = /\.csv$/i.test(filename) ? 'text/csv;charset=utf-8' : /\.json$/i.test(filename) ? 'application/json' : 'application/octet-stream';
      const blob = data instanceof Blob ? data : new Blob([data], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return { status: 'saved' };
    }
  });

  /* ---------------- first sign-in ---------------- */
  async function seedStarter(sb, uid) {
    if (!Array.isArray(window.SK_STARTER) || !window.SK_STARTER.length) return;
    const { count, error } = await sb.from('docs').select('id', { count: 'exact', head: true });
    if (error || count > 0) return;
    const now = Date.now();
    const rows = window.SK_STARTER.map((p, i) => ({ owner: uid, coll: 'products', id: p.id, data: { ...p, created: now + i, upd: now + i } }));
    rows.push({ owner: uid, coll: 'meta', id: 'settings', data: { biz: '', packing: 5, low: 5, fee: 25 } });
    await sb.from('docs').upsert(rows);
  }

  /* ---------------- boot ---------------- */
  let started = false;
  async function start(sb, session) {
    if (started || !session) return;
    started = true;
    hideScreen();
    const uid = session.user.id;
    window.SK_AUTH = Object.freeze({ email: session.user.email, signOut: async () => { try { await sb.auth.signOut(); } finally { location.reload(); } } });
    window.SK_IMG = id => String(id).startsWith('repo:') ? String(id).slice(5) : publicUrl(id);
    try { await seedStarter(sb, uid); } catch (e) { console.warn('Starter products not added', e); }
    resolveCaps({ db: makeDb(sb, uid), assets: makeAssets(sb, uid), downloads });
  }
  function boot() {
    if (!configured || !window.supabase || !window.supabase.createClient) { notConfiguredScreen(); resolveCaps(null); return; }
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    let recovering = /type=recovery/.test(location.hash + location.search);
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { recovering = true; newPasswordScreen(sb); }
      else if (event === 'SIGNED_IN' && session && !recovering) start(sb, session);
      else if (event === 'SIGNED_OUT' && started) location.reload();
    });
    sb.auth.getSession().then(({ data }) => {
      if (recovering) { newPasswordScreen(sb); return; }
      if (data && data.session) start(sb, data.session); else if (!started) signInScreen(sb);
    }, () => signInScreen(sb));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
