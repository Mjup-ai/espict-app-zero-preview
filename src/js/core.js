/* =========================================================
   しくみ：データの保存・画面の切りかえ・よく使う道具
   （サーバーなしで動く。データはこの端末のブラウザに保存）
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 小さな道具 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Safe(String(s == null ? '' : s));
  function toHtml(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(toHtml).join('');
    return esc(v);
  }
  /** 埋めこむ値は自動でエスケープするテンプレート */
  function html(strings, ...vals) {
    let out = strings[0];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      // 属性の中（aria-pressed="${真偽}" など）では true / false をそのまま書く
      if (typeof v === 'boolean' && /=\s*"$/.test(strings[i])) out += String(v);
      else out += toHtml(v);
      out += strings[i + 1];
    }
    return new Safe(out);
  }
  const ic = (name, opts) => raw(Icons.icon(name, opts));
  const uid = (p) => (p || 'id') + '-' + Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
  const by = (k, dir) => (a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * (dir === 'desc' ? -1 : 1);
  function groupBy(arr, f) { const m = new Map(); arr.forEach((x) => { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; }
  function rng(seed) { // 決まった並びの乱数（架空データ用）
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- 時計（試作では 2026年10月26日（月）に固定） ---------- */
  const DEMO_DAY = '2026-10-26';
  const PRESETS = {
    morning: { time: '09:52', label: '朝 9:52（授業の前）' },
    live:    { time: '10:24', label: '10:24（授業LIVE中）' },
    evening: { time: '15:40', label: '夕方 15:40（一日のおわり）' }
  };
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const t0 = Date.now();
  const Clock = {
    frozen: /[?&]shot=1/.test(location.search) || /shot=1/.test(location.hash),
    presetKey() { const s = Store.state; return (s && s.clock) || 'morning'; },
    base() { return new Date(`${DEMO_DAY}T${PRESETS[this.presetKey()].time}:00+09:00`).getTime(); },
    now() { return new Date(this.base() + (this.frozen ? 0 : Math.min(Date.now() - t0, 6 * 3600e3))); },
    /** その時刻を日本時間の「時:分」の数（分）にする */
    minutes(d) { const j = jst(d || this.now()); return j.h * 60 + j.mi; },
    at(hhmm, day) { return new Date(`${day || DEMO_DAY}T${hhmm}:00+09:00`); }
  };
  function jst(d) {
    const x = new Date((d instanceof Date ? d.getTime() : new Date(d).getTime()) + 9 * 3600e3);
    return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes(), wd: x.getUTCDay(), date: x.toISOString().slice(0, 10) };
  }
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = {
    date(d) { const j = jst(d); return `${j.m}月${j.d}日（${WD[j.wd]}）`; },
    dateShort(d) { const j = jst(d); return `${j.m}/${j.d}（${WD[j.wd]}）`; },
    md(d) { const j = jst(d); return `${j.m}/${j.d}`; },
    time(d) { const j = jst(d); return `${j.h}:${pad(j.mi)}`; },
    dt(d) { return `${fmt.dateShort(d)} ${fmt.time(d)}`; },
    dur(min) { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h}時間${m}分` : `${h}時間`) : `${m}分`; },
    durShort(min) { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}:${pad(m)}` : `${m}分`; },
    ago(d) {
      const diff = (Clock.now() - new Date(d)) / 60000;
      if (diff < 1) return 'いま';
      if (diff < 60) return `${Math.floor(diff)}分前`;
      if (diff < 60 * 24 && jst(d).date === jst(Clock.now()).date) return `${Math.floor(diff / 60)}時間前`;
      const days = Math.floor((new Date(jst(Clock.now()).date) - new Date(jst(d).date)) / 864e5);
      if (days === 1) return 'きのう';
      if (days < 7) return `${days}日前`;
      return fmt.md(d);
    },
    daysLeft(due) {
      if (!due) return null;
      const a = new Date(jst(Clock.now()).date), b = new Date(jst(due).date);
      return Math.round((b - a) / 864e5);
    },
    weekday(d) { return WD[jst(d).wd]; }
  };

  /* ---------- 保存（この端末のブラウザの中だけ） ---------- */
  const KEY = 'es-school-proto-v3';
  const listeners = new Set();
  const Store = {
    state: null,
    load() {
      let s = null;
      try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
      if (!s || s.v !== window.SEED_VERSION) s = window.makeSeed();
      this.state = s;
      return s;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* 保存できない時もそのまま動く */ } },
    update(fn, opts) {
      fn(this.state);
      this.save();
      if (!(opts && opts.silent)) listeners.forEach((l) => l(opts || {}));
    },
    reset() { localStorage.removeItem(KEY); this.state = window.makeSeed(); this.save(); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
  // ほかのタブで変わったら、こちらも読み直す（利用者→職員→運営 がつながって見える）
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    Store.load();
    App.applySettings();
    App.refresh({ fromOtherTab: true });
  });

  /* ---------- 画面の切りかえ（#/役わり/ページ） ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [pathPart, qs] = h.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const query = {};
    (qs || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { role: parts[0] || '', parts: parts.slice(1), query };
  }
  function matchRoute(routes, parts) {
    for (const pattern of Object.keys(routes)) {
      const pp = pattern.split('/').filter(Boolean);
      if (pp.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(parts[i]);
        else if (pp[i] !== parts[i]) { ok = false; break; }
      }
      if (ok) return { pattern, params, fn: routes[pattern] };
    }
    return null;
  }

  function focusKey(el) {
    if (!el || el === document.body || !el.closest || !el.closest('#app')) return null;
    if (el.id) return '#' + CSS.escape(el.id);
    const attrs = ['data-act', 'data-change', 'data-input', 'data-go', 'data-id', 'data-key', 'data-v', 'data-i', 'data-k', 'name', 'href'];
    const parts = attrs.filter((a) => el.hasAttribute(a)).map((a) => `[${a}="${CSS.escape(el.getAttribute(a))}"]`);
    return parts.length ? el.tagName.toLowerCase() + parts.join('') : null;
  }

  /* ---------- アプリ本体 ---------- */
  const App = {
    roles: {},
    current: null,
    shellRole: null,
    lastKey: '',
    deferred: false,
    register(name, def) { this.roles[name] = def; },
    go(path) { if (location.hash === path) this.render(); else location.hash = path; },
    back(fallback) {
      if (history.length > 1 && this._navCount > 1) history.back();
      else location.hash = fallback;
    },
    _navCount: 0,

    settings() {
      const s = Store.state.settings;
      const role = this.current ? this.current.role : 'learner';
      return s[role] || s.learner;
    },
    applySettings() {
      const r = parseHash().role || 'entrance';
      const roleKey = ['learner', 'staff', 'admin'].includes(r) ? r : 'learner';
      const st = Store.state.settings[roleKey] || Store.state.settings.learner;
      const root = document.documentElement;
      root.dataset.role = r;
      root.dataset.fs = String(st.fs || 1);
      root.dataset.theme = st.theme === 'dark' ? 'dark' : 'light';
      root.dataset.contrast = st.contrast ? 'high' : 'normal';
      root.dataset.motion = st.reduceMotion ? 'reduce' : 'normal';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = st.theme === 'dark' ? '#0a1620' : '#ffffff';
    },

    render(opts) {
      const o = opts || {};
      const r = parseHash();
      const roleName = r.role || 'entrance';
      const role = this.roles[roleName] || this.roles.entrance;
      const m = matchRoute(role.routes, r.parts) || matchRoute(role.routes, [role.home || 'home']);
      const route = { role: roleName, parts: r.parts, params: m.params, query: r.query, pattern: m.pattern };
      const key = location.hash;
      const samePage = key === this.lastKey;
      this.current = route;
      this.applySettings();
      UI.stopSpeak();
      // 画面がかわったら、開いたままのシートは閉じる（もどるボタンで戻った時など）
      if (!samePage) { $$('.sheet-wrap').forEach((w) => w.remove()); document.body.style.overflow = ''; }

      let page;
      try { page = m.fn(route) || {}; }
      catch (err) { console.error(err); page = { title: 'エラー', html: html`<div class="card card-pad"><p>この画面を開けませんでした。</p><pre class="small">${String(err && err.stack || err)}</pre></div>` }; }
      this.page = page;
      document.title = (page.title ? page.title + '｜' : '') + 'エスピクトスクール（試作）';

      const appEl = $('#app');
      const focusSel = samePage ? focusKey(document.activeElement) : null;
      if (role.shell) {
        const scrollY = window.scrollY;
        appEl.innerHTML = toHtml(role.shell(route, page));
        const main = $('#main');
        if (main) {
          main.className = 'main' + (page.wide ? ' main-wide' : '') + (page.flush ? ' main-flush' : '');
          main.innerHTML = toHtml(page.html);
        }
        if (samePage && !o.toTop) window.scrollTo(0, scrollY);
        else if (!o.keepScroll) window.scrollTo(0, 0);
      } else {
        appEl.innerHTML = toHtml(page.html);
        if (!samePage) window.scrollTo(0, 0);
      }
      if (page.mount) { try { page.mount($('#main') || appEl, route); } catch (err) { console.error(err); } }
      if (roleName === 'learner' && this.settings().furigana) Furi.apply(appEl);
      if (!samePage) {
        this._navCount++;
        const h1 = $('#main h1, #app h1');
        if (h1 && this._navCount > 1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      }
      this.lastKey = key;
      UI.renderToastsHost();
      // 描きなおしても、さっきまで選んでいたボタンにフォーカスをもどす（キーボードで使う人のため）
      if (focusSel) { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }
    },
    /** データが変わった時に今の画面を描きなおす（入力中ならあとで） */
    refresh(opts) {
      const a = document.activeElement;
      if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text')) && a.closest('#app')) {
        this.deferred = true;
        return;
      }
      if (this.page && this.page.onRefresh && opts && opts.fromOtherTab) { this.page.onRefresh(); return; }
      this.render(Object.assign({ keepScroll: true }, opts));
    },
    start() {
      Store.load();
      Store.save();
      this.applySettings();
      window.addEventListener('hashchange', () => this.render());
      document.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!this.deferred) return;
          const a = document.activeElement;
          if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) return;
          this.deferred = false;
          this.render({ keepScroll: true });
        }, 50);
      });
      this.render();
      // 時計を進める（カウントダウンなど）
      if (!Clock.frozen) setInterval(() => { document.dispatchEvent(new CustomEvent('tick')); }, 1000);
    }
  };

  /* ---------- 操作の受け口（data-act="名前"） ---------- */
  const Actions = {};
  function act(name, fn) { Actions[name] = fn; }
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go && !go.disabled) { e.preventDefault(); App.go(go.getAttribute('data-go')); return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const name = el.getAttribute('data-act');
    const fn = Actions[name];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = Actions[el.getAttribute('data-change')];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const fn = Actions[el.getAttribute('data-input')];
    if (fn) fn(el, e);
  });
  document.addEventListener('submit', (e) => {
    const el = e.target.closest('[data-submit]');
    if (!el) return;
    e.preventDefault();
    const fn = Actions[el.getAttribute('data-submit')];
    if (fn) fn(el, e);
  });

  /* ---------- 画面の部品（トースト・シート・紙ふぶき・読み上げ） ---------- */
  const UI = {
    renderToastsHost() {
      if (!$('#toasts')) { const d = document.createElement('div'); d.id = 'toasts'; d.className = 'toasts'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite'); document.body.appendChild(d); }
    },
    toast(text, opts) {
      const o = opts || {};
      this.renderToastsHost();
      const host = $('#toasts');
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `<span class="t-ico">${Icons.icon(o.icon || 'checkc')}</span><span class="t-text">${esc(text)}</span>` + (o.action ? `<button class="t-act" type="button">${esc(o.action)}</button>` : '');
      host.appendChild(el);
      if (App.current && App.current.role === 'learner' && App.settings().furigana) Furi.apply(el);
      let closed = false;
      const close = () => { if (closed) return; closed = true; el.classList.add('out'); setTimeout(() => el.remove(), 220); };
      if (o.action) el.querySelector('.t-act').addEventListener('click', () => { o.onAction && o.onAction(); close(); });
      setTimeout(close, o.ms || (o.action ? 6000 : 3200));
      return close;
    },
    /** シート（スマホは下から、PCはまん中）。content は html。戻り値は閉じる関数 */
    sheet(opts) {
      const o = opts || {};
      const wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.innerHTML = `<div class="sheet${o.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="grab" aria-hidden="true"></div>
        <div class="sheet-head">${o.icon ? `<span class="ico-badge ${o.iconCls || ''}">${o.icon}</span>` : ''}<h2 id="sheet-title">${toHtml(o.title || '')}</h2>
          <button class="icon-btn" type="button" data-close aria-label="とじる">${Icons.icon('x')}</button></div>
        <div class="sheet-body">${toHtml(o.body || '')}</div>
        ${o.foot ? `<div class="sheet-foot">${toHtml(o.foot)}</div>` : ''}
      </div>`;
      const prevFocus = document.activeElement;
      document.body.appendChild(wrap);
      document.body.style.overflow = 'hidden';
      const close = (val) => {
        if (wrap.classList.contains('closing')) return;
        wrap.classList.add('closing');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => { wrap.remove(); if (!$('.sheet-wrap')) document.body.style.overflow = ''; if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); }, 200);
        o.onClose && o.onClose(val);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap || e.target.closest('[data-close]')) close();
      });
      if (App.current && App.current.role === 'learner' && App.settings().furigana) Furi.apply(wrap);
      // 開いたら、シートそのものにフォーカス（ボタンを勝手に選ばない。読み上げは見出しから）
      const sheetEl = wrap.querySelector('.sheet');
      sheetEl.setAttribute('tabindex', '-1');
      const first = wrap.querySelector('[autofocus]');
      setTimeout(() => (first || sheetEl).focus({ preventScroll: true }), 60);
      if (o.mount) o.mount(wrap.querySelector('.sheet'), close);
      return close;
    },
    confirm(opts) {
      return new Promise((resolve) => {
        let done = false;
        const close = UI.sheet({
          title: opts.title, icon: opts.icon, iconCls: opts.iconCls,
          body: html`<p class="ink2">${opts.text || ''}</p>${opts.extra || ''}`,
          foot: html`<button class="btn btn-lg" type="button" data-close>${opts.no || 'やめる'}</button><button class="btn btn-lg ${opts.danger ? 'btn-danger' : 'btn-primary'}" type="button" data-yes>${opts.yes || 'はい'}</button>`,
          mount: (el, c) => { el.querySelector('[data-yes]').addEventListener('click', () => { done = true; c(true); resolve(true); }); },
          onClose: () => { if (!done) resolve(false); }
        });
        return close;
      });
    },
    confetti() {
      if (document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box = document.createElement('div');
      box.className = 'confetti';
      const colors = ['#00b8ec', '#e2367a', '#ffc53d', '#57d39a', '#6a4fcf', '#ff8fb8'];
      for (let i = 0; i < 90; i++) {
        const c = document.createElement('i');
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = colors[i % colors.length];
        c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
        c.style.animationDelay = Math.random() * .4 + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        c.style.opacity = .9;
        box.appendChild(c);
      }
      document.body.appendChild(box);
      setTimeout(() => box.remove(), 4000);
    },
    /* 読み上げ（端末の声を使う。ネットはいらない） */
    _speakBtn: null,
    speak(text, btn) {
      const synth = window.speechSynthesis;
      if (!synth) { UI.toast('この端末では読み上げが使えません', { icon: 'info' }); return; }
      if (this._speakBtn && this._speakBtn === btn && synth.speaking) { this.stopSpeak(); return; }
      this.stopSpeak();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[「」『』【】]/g, ' '));
      u.lang = 'ja-JP';
      const st = App.settings();
      u.rate = st.speechRate || 0.95;
      const v = synth.getVoices().find((x) => /ja[-_]JP/i.test(x.lang));
      if (v) u.voice = v;
      if (btn) { btn.setAttribute('aria-pressed', 'true'); this._speakBtn = btn; }
      u.onend = u.onerror = () => { if (btn) btn.setAttribute('aria-pressed', 'false'); if (this._speakBtn === btn) this._speakBtn = null; };
      synth.speak(u);
    },
    stopSpeak() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (this._speakBtn) { this._speakBtn.setAttribute('aria-pressed', 'false'); this._speakBtn = null; }
    },
    /** 読み上げボタンの html（data-say に読む文） */
    speakBtn(text, label) {
      return html`<button class="speak" type="button" data-act="say" data-say="${text}" aria-pressed="false" aria-label="${label || '読み上げる'}">${ic('volume')}<span>${label || 'よむ'}</span></button>`;
    },
    /** CSV を作ってダウンロード（本当にファイルになる） */
    download(name, text, type) {
      const blob = new Blob(['﻿' + text], { type: type || 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
  };
  act('say', (el) => {
    let text = el.getAttribute('data-say');
    if (!text) { const t = el.closest('[data-say-root]'); text = t ? t.innerText : ''; }
    UI.speak(text, el);
  });
  act('noop', () => UI.toast('試作なので、ここはまだ動きません', { icon: 'info' }));

  /* ---------- ふりがな（よく出ることばに、よみがなをつける） ---------- */
  const KANJI = /[一-鿿々]/;
  const Furi = {
    dict: null,
    parts: null,
    re: null,
    /** 「作ります」「つくります」→ [["作","つく"],["ります",null]]（送りがなには つけない） */
    align(word, reading) {
      const segs = word.match(/[一-鿿々]+|[^一-鿿々]+/g) || [word];
      const esc2 = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('^' + segs.map((sg) => (KANJI.test(sg) ? '(.+?)' : esc2(sg))).join('') + '$');
      const m = reading.match(re);
      if (!m) return [[word, reading]];
      let gi = 1;
      return segs.map((sg) => (KANJI.test(sg) ? [sg, m[gi++]] : [sg, null]));
    },
    build() {
      const d = window.FURIGANA || {};
      const keys = Object.keys(d).sort((a, b) => b.length - a.length);
      this.dict = d;
      this.parts = {};
      keys.forEach((k) => { this.parts[k] = this.align(k, d[k]); });
      this.re = keys.length ? new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
    },
    apply(root) {
      if (!this.re) this.build();
      if (!this.re) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          const p = n.parentElement;
          if (!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (p.closest('ruby, rt, script, style, textarea, input, select, code, pre, svg, [data-noruby], .sr-only, .furi, .art, .thumb')) return NodeFilter.FILTER_REJECT;
          return KANJI.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        const text = n.nodeValue;
        this.re.lastIndex = 0;
        if (!this.re.test(text)) return;
        this.re.lastIndex = 0;
        // ひとつの span にまとめる（グリッドやフレックスの中でも ばらばらにならない）
        const wrap = document.createElement('span');
        wrap.className = 'furi';
        let last = 0;
        text.replace(this.re, (m, idx) => {
          if (idx > last) wrap.appendChild(document.createTextNode(text.slice(last, idx)));
          (this.parts[m] || [[m, this.dict[m]]]).forEach(([base, yomi]) => {
            if (!yomi) { wrap.appendChild(document.createTextNode(base)); return; }
            const r = document.createElement('ruby');
            r.appendChild(document.createTextNode(base));
            const rt = document.createElement('rt');
            rt.textContent = yomi;
            r.appendChild(rt);
            wrap.appendChild(r);
          });
          last = idx + m.length;
          return m;
        });
        if (last < text.length) wrap.appendChild(document.createTextNode(text.slice(last)));
        n.parentNode.replaceChild(wrap, n);
      });
    }
  };

  /* ---------- グラフ（棒グラフ：1つの系列。ホバーで値、表でも見られる） ---------- */
  const Charts = {
    _specs: {},
    /** data: [{label, short?, value, dim?}]。画面に出た時に、実際の はばで描きなおす */
    bars(data, opts) {
      const o = Object.assign({ height: 180, unit: '', max: null, id: uid('viz'), title: '', fmt: (v) => String(v) }, opts || {});
      this._specs[o.id] = { data, o };
      const table = `<table class="table viz-table" hidden><thead><tr><th>${esc(o.xName || '日')}</th><th class="num">${esc(o.yName || '数')}</th></tr></thead><tbody>${data.map((d) => `<tr><td>${esc(d.label)}</td><td class="num">${esc(o.fmt(d.value))}${esc(o.unit)}</td></tr>`).join('')}</tbody></table>`;
      return raw(`<figure class="viz" id="${o.id}" data-viz>
        ${this._svg(data, o, 600)}
        <div class="viz-foot"><button class="linkbtn" type="button" data-act="viz-table">${Icons.icon('table')}<span>表で見る</span></button></div>
        ${table}
      </figure>`);
    },
    _svg(data, o, W) {
      const H = o.height, padL = 34, padR = 8, padT = 18, padB = 26;
      const max = o.max || Math.max(1, ...data.map((d) => d.value));
      const niceMax = niceCeil(max);
      const plotW = W - padL - padR, plotH = H - padT - padB;
      const n = data.length;
      const band = plotW / Math.max(1, n);
      const bw = Math.max(4, Math.min(24, band * 0.62));
      const ticks = [0, niceMax / 2, niceMax];
      let g = '';
      ticks.forEach((t) => {
        const y = padT + plotH - (t / niceMax) * plotH;
        g += `<line class="${t === 0 ? 'v-axis' : 'v-grid'}" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
        g += `<text class="v-tick" x="${padL - 6}" y="${y + 4}" text-anchor="end">${esc(o.fmt(t))}</text>`;
      });
      let bars = '';
      const maxLabels = Math.max(4, Math.floor(plotW / 34));
      const labelEvery = n > maxLabels ? Math.ceil(n / maxLabels) : 1;
      data.forEach((d, i) => {
        const x = padL + band * i + (band - bw) / 2;
        const h = (d.value / niceMax) * plotH;
        const y = padT + plotH - h;
        const r = Math.min(4, h / 2, bw / 2);
        const path = h > 0 ? `M${x},${padT + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${padT + plotH} Z` : '';
        const tip = `${d.label}：${o.fmt(d.value)}${o.unit}`;
        bars += `<rect class="v-hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}" tabindex="0" aria-label="${esc(tip)}" data-tip="${esc(tip)}" data-x="${padL + band * i + band / 2}" data-y="${y}"/>`;
        bars += `<path class="v-bar${d.dim ? ' is-dim' : ''}" d="${path}"/>`;
        if (i % labelEvery === 0 || i === n - 1) bars += `<text class="v-tick" x="${padL + band * i + band / 2}" y="${H - 8}" text-anchor="middle">${esc(d.short || d.label)}</text>`;
      });
      if (o.highlightLast && n) {
        const d = data[n - 1];
        const y = padT + plotH - (d.value / niceMax) * plotH;
        bars += `<text class="v-label" x="${padL + band * (n - 1) + band / 2}" y="${y - 6}" text-anchor="middle">${esc(o.fmt(d.value))}</text>`;
      }
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="${esc(o.title)}">${g}${bars}</svg>`;
    },
    mount(root) {
      $$('[data-viz]', root).forEach((fig) => {
        const spec = this._specs[fig.id];
        if (spec) {
          const w = Math.max(260, Math.round(fig.clientWidth || 600));
          const old = fig.querySelector('svg');
          const tmp = document.createElement('div');
          tmp.innerHTML = this._svg(spec.data, spec.o, w);
          old.replaceWith(tmp.firstElementChild);
        }
        const svg = fig.querySelector('svg');
        let tip = null;
        const show = (el) => {
          if (!tip) { tip = document.createElement('div'); tip.className = 'viz-tip'; fig.appendChild(tip); }
          const bb = svg.getBoundingClientRect(), fb = fig.getBoundingClientRect();
          const sx = bb.width / svg.viewBox.baseVal.width, sy = bb.height / svg.viewBox.baseVal.height;
          tip.textContent = el.getAttribute('data-tip');
          tip.style.left = Math.min(fb.width - 40, Math.max(40, bb.left - fb.left + Number(el.getAttribute('data-x')) * sx)) + 'px';
          tip.style.top = (bb.top - fb.top + Number(el.getAttribute('data-y')) * sy) + 'px';
          tip.style.display = 'block';
        };
        const hide = () => { if (tip) tip.style.display = 'none'; };
        fig.querySelectorAll('.v-hit').forEach((h) => {
          h.addEventListener('pointerenter', () => show(h));
          h.addEventListener('focus', () => show(h));
          h.addEventListener('pointerleave', hide);
          h.addEventListener('blur', hide);
        });
      });
    }
  };
  function niceCeil(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / p;
    const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }
  act('viz-table', (el) => {
    const fig = el.closest('[data-viz]');
    const t = fig.querySelector('.viz-table');
    t.hidden = !t.hidden;
    el.querySelector('span').textContent = t.hidden ? '表で見る' : '表をとじる';
  });

  window.Core = { $, $$, esc, raw, html, toHtml, ic, uid, clamp, sum, by, groupBy, rng, hashStr, jst, fmt, pad, DEMO_DAY, PRESETS, WD };
  window.Clock = Clock;
  window.Store = Store;
  window.App = App;
  window.UI = UI;
  window.act = act;
  window.Actions = Actions;
  window.Furi = Furi;
  window.Charts = Charts;
})();
