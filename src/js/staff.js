/* =========================================================
   事業所の職員（支援員）の画面
   きょうの様子（緊急の知らせ・声かけ）・利用者・出席・月の報告・授業の予定・設定
   ========================================================= */
(function () {
  'use strict';
  const { html, raw, ic, esc, fmt, jst, by, sum, pad } = Core;
  const K = window.CONTENT;
  const S = () => Store.state;
  const nowISO = () => Clock.now().toISOString();
  const TODAY = Core.DEMO_DAY;
  const OCT = () => window.SEED_HELPERS.OCT;
  const STAFF_NAME = K.STAFF.name;

  /* ---------- 小さな道具 ---------- */
  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const hm = (min) => `${Math.floor(min / 60)}:${pad(Math.round(min) % 60)}`;
  const isoMin = (iso) => { const j = jst(iso); return j.h * 60 + j.mi; };
  const isToday = (iso) => jst(iso).date === TODAY;
  const person = (id) => S().mine.find((u) => u.id === id) || S().others.find((u) => u.id === id);
  const first = (u) => (u.name.split(' ')[1] || u.name);
  const taskOf = (id) => K.ALL_TASKS.find((t) => t.id === id) || (S().extraTasks || []).find((t) => t.id === id);
  const lessonName = (id) => {
    const l = K.lessonById[id];
    if (!l) return '教材';
    const s = K.seriesById[l.series];
    const lb = l.label || '';
    return `${s.title}${/^[A-Za-z0-9]/.test(lb) ? ' ' + lb : lb}「${l.title}」`;
  };
  const av = (u, cls) => html`<span class="av ${cls || ''}" style="--av:${u.color}" aria-hidden="true">${u.name[0]}</span>`;
  const gm = (g, sm) => { const G = K.GENRES[g] || K.GENRES.pc; return html`<span class="gmark ${sm ? 'sm' : ''} ${G.cls}" aria-hidden="true">${ic(G.icon)}</span>`; };
  const lvChip = (lv) => lv ? html`<span class="chip ${K.LEVELS[lv].cls}">${K.LEVELS[lv].name}</span>` : '';
  const sinceText = (u) => `${u.since.slice(0, 4) !== '2026' ? u.since.slice(0, 4) + '年' : ''}${Number(u.since.slice(5, 7))}月${Number(u.since.slice(8))}日`;
  const MOOD = { 'げんき': ['smile', 'ok'], 'ふつう': ['meh', 'info'], 'つかれぎみ': ['tired', 'warn'] };
  const moodChip = (m) => m ? html`<span class="st-mood st-mood-${MOOD[m] ? MOOD[m][1] : 'info'}">${ic(MOOD[m] ? MOOD[m][0] : 'meh')}<span>${m}</span></span>` : html`<span class="st-mood st-mood-none">${ic('meh')}<span>答えなし</span></span>`;

  /* ---------- いまの様子を計算する ---------- */
  const ACT = {
    arrive: ['login', '来たところ'], lesson: ['playc', '教材'], task: ['task', '課題'], live: ['live', '授業LIVE'],
    pikuto: ['chat', 'ぴくとに相談中'], break: ['coffee', '休けい中'], leave: ['logout', '帰りました'], submit: ['send', '提出した'],
    home: ['sun', 'アプリの「きょう」を見ている'], lib: ['book', '教材をさがしている'], archive: ['film', 'アーカイブを見ている'],
    tasks: ['clipboard', '課題をえらんでいる'], works: ['star', '作ったものを見ている'], jobs: ['briefcase', '案件ボードを見ている'], other: ['monitor', 'アプリを見ている']
  };
  function actLabel(type, ref) {
    const [icon, base] = ACT[type] || ACT.other;
    let text = base, sub = '';
    if (type === 'lesson') { text = '教材を見ている'; sub = lessonName(ref); }
    else if (type === 'task') { const t = taskOf(ref); text = '課題に取り組み中'; sub = t ? t.title : ''; }
    else if (type === 'submit') { const t = taskOf(ref); text = '課題を提出した'; sub = t ? t.title : ''; }
    else if (type === 'live') { const G = K.GENRES[ref]; text = '授業LIVEに参加中'; sub = G ? `${G.name} 授業LIVE` : ''; }
    return { icon, text, sub };
  }

  function subsToday(u, now) {
    const set = new Map();
    S().submissions.filter((x) => x.learner === u.id && isToday(x.at) && isoMin(x.at) <= now).forEach((x) => set.set(x.task, x.at));
    const d = S().day[u.id];
    if (d && d.seg) d.seg.forEach(([t, type, ref]) => { if (type === 'submit' && toMin(t) <= now && !set.has(ref)) set.set(ref, `${TODAY}T${t}:00+09:00`); });
    return Array.from(set.entries()).map(([task, at]) => ({ task, at }));
  }

  /** u のきょうの様子（いまの時刻で） */
  function dayState(u) {
    const now = Clock.minutes();
    const alert = S().alerts.find((a) => a.learner === u.id && a.status === 'open');
    const base = { u, alert, subs: subsToday(u, now), isNew: !!u.isNew, home: !!u.home, stuckMin: 0, breakMin: 0, workMin: 0 };
    if (u.id === S().me) {
      const d = S().myDay;
      base.mood = d.mood;
      if (d.status === 'none') return Object.assign(base, { status: 'notyet', expected: hm(toMin(u.inT)), late: now > toMin(u.inT) + 15 });
      const inMin = isoMin(d.in);
      const outMin = d.out ? isoMin(d.out) : null;
      let brk = 0;
      (d.breaks || []).forEach((b) => { brk += ((b.end ? isoMin(b.end) : now) - isoMin(b.start)); });
      const st = d.status === 'out' ? 'left' : 'in';
      let act;
      if (d.status === 'out') act = { type: 'leave', since: outMin };
      else if (d.status === 'break') { const b = d.breaks[d.breaks.length - 1]; act = { type: 'break', since: b ? isoMin(b.start) : now }; }
      else if (d.activity) act = { type: d.activity.type, ref: d.activity.ref, since: isoMin(d.activity.at) };
      else act = { type: 'arrive', since: inMin };
      return Object.assign(base, { status: st, inMin, outMin, breakMin: brk, workMin: Math.max(0, (outMin || now) - inMin - brk), act, live: act.type === 'live' });
    }
    const d = S().day[u.id] || {};
    base.mood = d.mood;
    if (d.absent) return Object.assign(base, { status: 'absent', reason: d.absent });
    const segs = (d.seg || []).map(([t, type, ref, extra]) => ({ t: toMin(t), type, ref, extra: extra || {} }));
    const arrive = segs.find((s) => s.type === 'arrive');
    const expected = hm(toMin(d.late || u.inT));
    if (!arrive || arrive.t > now) return Object.assign(base, { status: 'notyet', expected, late: now > toMin(expected) + 10, mood: null });
    const past = segs.filter((s) => s.t <= now);
    const cur = past[past.length - 1];
    let brk = 0;
    segs.forEach((s, i) => { if (s.type === 'break' && s.t <= now) { const end = Math.min(segs[i + 1] ? segs[i + 1].t : now, now); brk += Math.max(0, end - s.t); } });
    const left = cur.type === 'leave';
    const st = { status: left ? 'left' : 'in', inMin: arrive.t, outMin: left ? cur.t : null, breakMin: brk, workMin: Math.max(0, (left ? cur.t : now) - arrive.t - brk) };
    st.act = { type: cur.type, ref: cur.ref, since: cur.t, extra: cur.extra };
    st.live = cur.type === 'live';
    if (cur.extra.stuck && !left) { const s0 = toMin(cur.extra.stuck); if (now - s0 >= 20) { st.stuckMin = now - s0; st.stuckNote = cur.extra.note || ''; } }
    return Object.assign(base, st);
  }
  const allStates = () => S().mine.map(dayState);

  /** 声かけが必要かも（理由つき） */
  function attention(st) {
    const r = [];
    if (st.alert) return r; // いちばん上の「緊急の知らせ」に出ている
    if (st.stuckMin) r.push({ k: 'stuck', icon: 'hourglass', text: `${st.stuckMin}分 手が止まっています`, sub: st.stuckNote });
    if (st.status === 'notyet' && st.late) r.push({ k: 'late', icon: 'clock', text: `いつもは ${st.expected}ごろ。まだ来ていません`, sub: '連絡が来ていないか、確かめてください' });
    if ((st.status === 'in') && st.mood === 'つかれぎみ') r.push({ k: 'tired', icon: 'tired', text: 'きょうの調子は「つかれぎみ」', sub: '休けいを すすめてみてください' });
    if (st.isNew && st.status === 'in') r.push({ k: 'new', icon: 'sprout', text: `はじめて2週目（${Number(st.u.since.slice(5, 7))}月${Number(st.u.since.slice(8))}日から）`, sub: 'アプリの使い方で こまっていないか、ようすを見てください' });
    return r;
  }
  function score(st) {
    if (st.alert) return 100;
    if (st.stuckMin) return 80;
    if (st.status === 'notyet' && st.late) return 60;
    if (st.status === 'in' && st.mood === 'つかれぎみ') return 50;
    if (st.isNew && st.status === 'in') return 30;
    if (st.status === 'in') return 20;
    if (st.status === 'notyet') return 10;
    if (st.status === 'left') return 5;
    return 1;
  }

  function attText(st) {
    if (st.status === 'absent') return { cls: 'mute', icon: 'calendar', text: '休み', sub: st.reason };
    if (st.status === 'notyet') return { cls: st.late ? 'warn' : 'mute', icon: 'clock', text: 'まだ', sub: `いつもは ${st.expected}ごろ` };
    if (st.status === 'left') return { cls: 'mute', icon: 'logout', text: `帰った ${hm(st.outMin)}`, sub: `${hm(st.inMin)}〜 ・ ${fmt.dur(st.workMin)}` };
    return { cls: 'ok', icon: st.home ? 'house' : 'login', text: `${st.home ? '在宅' : '来た'} ${hm(st.inMin)}`, sub: `取り組み ${fmt.dur(st.workMin)}` };
  }

  /* ---------- 骨組み ---------- */
  const NAV = [
    { key: 'today', label: 'きょうの様子', short: 'きょう', icon: 'sun', go: '#/staff/today' },
    { key: 'people', label: '利用者', icon: 'users', go: '#/staff/people' },
    { key: 'attendance', label: '出席', icon: 'calcheck', go: '#/staff/attendance' },
    { key: 'report', label: '月の報告', icon: 'file', go: '#/staff/report' },
    { key: 'schedule', label: '授業の予定', short: '予定', icon: 'calendar', go: '#/staff/schedule' }
  ];
  const openAlerts = () => S().alerts.filter((a) => a.status === 'open');

  function alertBar() {
    const list = openAlerts();
    if (!list.length) return '';
    const a = list[0];
    const u = person(a.learner);
    return html`<div class="st-alertbar ${a.type === 'call' ? 'is-call' : ''}" role="alert">
      <span class="st-ab-ico">${ic(a.type === 'call' ? 'hand' : 'alert')}</span>
      <a class="grow st-ab-text" href="#/staff/today"><b>${a.type === 'call' ? '呼ばれています' : '緊急の知らせ'}${list.length > 1 ? `（ほか${list.length - 1}件）` : ''}</b><span>${u ? u.name : ''}さん ・ ${a.title}</span></a>
      <button class="btn btn-sm st-ab-btn" type="button" data-act="st-alert-done" data-id="${a.id}">${ic('check')}<span>対応した</span></button>
    </div>`;
  }

  function shell(route, page) {
    const cur = page.nav || route.parts[0] || 'today';
    const n = openAlerts().length;
    const navItem = (it) => html`<a class="nav-item" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}>${ic(it.icon)}<span>${it.label}</span>${it.key === 'today' && n ? html`<span class="count nav-badge">${n}</span>` : ''}</a>`;
    const tb = page.back
      ? html`<a class="icon-btn tb-back" href="${page.back}" aria-label="もどる">${ic('back')}</a><span class="tb-title">${page.topTitle || page.title}</span>`
      : html`<span class="hide-pc">${raw(Icons.logoMark(30))}</span><span class="tb-title">${page.topTitle || page.title}</span>`;
    return html`
      <a class="skip-link" href="#main">本文へ</a>
      <div class="app st-app">
        <aside class="side" aria-label="メニュー">
          <div class="side-brand">${raw(Icons.logoMark(38))}<div class="brand-text"><div class="wordmark">エスピクトスクール</div><div class="role-tag">職員 ・ ${K.FACILITY.name}</div></div></div>
          <nav class="side-nav">
            ${NAV.map(navItem)}
            <div class="nav-group">そのほか</div>
            ${navItem({ key: 'settings', label: '見やすさ・設定', icon: 'sliders', go: '#/staff/settings' })}
          </nav>
          <div class="side-foot">
            <div class="st-facility hide-rail"><span class="xsmall muted bold">事業所</span><b>${K.FACILITY.name}</b><span class="xsmall muted">${K.FACILITY.area}（架空）・ 利用者 ${S().mine.length}人</span></div>
            <a class="side-user hide-rail" href="#/staff/settings"><span class="av sm" style="--av:#12a383">森</span><span class="grow"><b>${STAFF_NAME}</b><span class="xsmall muted">職員</span></span></a>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            ${tb}
            <span class="hide-sp tb-clock"><span class="clock-chip">${ic('calendar')}<span>${fmt.date(Clock.now())}</span><b data-st-clock>${fmt.time(Clock.now())}</b></span></span>
            <span class="tb-spacer"></span>
            ${n ? html`<a class="st-alert-pill" href="#/staff/today" aria-label="緊急の知らせ ${n}件">${ic('alert')}<span>緊急 ${n}</span></a>` : ''}
            <button class="icon-btn hide-pc" type="button" data-act="st-menu" aria-label="メニュー">${ic('menu')}</button>
          </header>
          ${cur === 'today' ? '' : alertBar()}
          <main id="main" class="main" tabindex="-1"></main>
        </div>
        <nav class="tabbar" aria-label="メインメニュー">${NAV.map((it) => html`<a class="tab" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}><span class="tab-ico">${ic(it.icon)}</span><span>${it.short || it.label}</span>${it.key === 'today' && n ? html`<span class="count tab-badge">${n}</span>` : ''}</a>`)}</nav>
      </div>`;
  }

  act('st-menu', () => {
    UI.sheet({
      title: 'メニュー',
      body: html`<div class="side-user" style="padding:4px 0 8px"><span class="av" style="--av:#12a383">森</span><span class="grow"><b>${STAFF_NAME}</b><span class="small muted">職員 ・ ${K.FACILITY.name}</span></span></div>
        <div class="menu-grid">${NAV.concat([{ key: 'settings', label: '見やすさ・設定', icon: 'sliders', go: '#/staff/settings' }]).map((it) => html`<a class="menu-item" href="${it.go}" data-close><span class="ico-badge">${ic(it.icon)}</span><span>${it.label}</span></a>`)}</div>
        <a class="btn btn-ghost btn-block" href="index.html#/" data-close>${ic('back')}<span>入口にもどる（試作）</span></a>`
    });
  });

  /* ---------- 緊急の知らせ ---------- */
  function alertCards() {
    const list = openAlerts().slice().sort(by('at', 'desc'));
    if (!list.length) return '';
    return html`<section class="st-alerts" aria-label="緊急の知らせ">${list.map((a) => {
      const u = person(a.learner);
      const em = a.type !== 'call';
      return html`<article class="st-alert ${em ? 'is-emergency' : 'is-call'}" role="alert">
        <div class="st-al-head"><span class="st-al-badge"><span class="dot pulse"></span>${ic(em ? 'alert' : 'hand')}${em ? '緊急の知らせ' : '職員さんを呼んでいます'}</span><span class="st-al-time">${fmt.time(a.at)}（${fmt.ago(a.at)}）</span></div>
        <div class="st-al-body">
          ${u ? av(u, 'lg') : ''}
          <b class="st-al-name">${u ? u.name : ''}さん<span class="xsmall muted">${u ? u.genres.map((g) => K.GENRES[g].name).join('・') : ''}</span></b>
          <div class="st-al-text stack-sm">
            <p class="st-al-title">${a.title}</p>
            ${a.quote ? html`<blockquote class="st-al-quote">「${a.quote}」</blockquote>` : ''}
            ${a.hint ? html`<p class="st-al-hint">${ic('bulb')}<span>${a.hint}</span></p>` : ''}
          </div>
        </div>
        <div class="st-al-actions">
          <button class="btn btn-xl st-al-done" type="button" data-act="st-alert-done" data-id="${a.id}">${ic('check')}<span>対応した</span></button>
          ${u ? html`<a class="btn btn-lg st-al-more" href="#/staff/person/${u.id}">${ic('user')}<span>この人の様子</span></a>` : ''}
        </div>
        <p class="st-al-note">${ic('info')}<span>「対応した」を押すまで、この知らせは消えません。</span></p>
      </article>`;
    })}</section>`;
  }
  act('st-alert-done', (el) => {
    const id = el.getAttribute('data-id');
    const a = S().alerts.find((x) => x.id === id);
    if (!a) return;
    const u = person(a.learner);
    UI.sheet({
      title: '対応しましたか？', icon: ic('check'), iconCls: 'ok',
      body: html`<p class="ink2">${u ? u.name : ''}さんへの対応を記録します。押すと、知らせが消えます。</p>
        <div class="field"><span class="label">したこと<span class="opt">（えらばなくてもOK）</span></span>
          <div class="cluster">${['声をかけた', '別室で話を聞いた', 'ご家族に連絡した', '様子を見る'].map((x) => html`<button class="fchip" type="button" aria-pressed="false" data-act="toggle-press">${x}</button>`)}</div></div>
        <div class="field"><label class="label" for="st-al-memo">メモ<span class="opt">（なくてもOK）</span></label><textarea class="textarea" id="st-al-memo" style="min-height:84px" placeholder="例：休けい室で10分 話を聞いた。午後は様子を見る"></textarea></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>まだ</button><button class="btn btn-ok btn-lg" type="button" data-yes>${ic('check')}<span>対応した</span></button>`,
      mount: (sh, close) => sh.querySelector('[data-yes]').addEventListener('click', () => {
        const picked = Array.from(sh.querySelectorAll('.fchip[aria-pressed="true"]')).map((x) => x.textContent);
        const memo = sh.querySelector('#st-al-memo').value.trim();
        const note = picked.concat(memo ? [memo] : []).join('。') || '対応した';
        Store.update((s) => {
          const i = s.alerts.findIndex((x) => x.id === id);
          if (i < 0) return;
          const done = Object.assign({}, s.alerts[i], { status: 'done', doneAt: nowISO(), doneBy: STAFF_NAME, note });
          s.alerts.splice(i, 1);
          s.alertLog = [done].concat(s.alertLog || []);
        });
        close();
        UI.toast(`対応を記録しました（${u ? u.name : ''}さん）`);
      })
    });
  });

  /* ---------- きょうの様子 ---------- */
  function pageToday(route) {
    const f = route.query.f || 'all';
    const sts = allStates();
    const now = Clock.now();
    const here = sts.filter((x) => x.status === 'in');
    const notyet = sts.filter((x) => x.status === 'notyet');
    const absent = sts.filter((x) => x.status === 'absent');
    const left = sts.filter((x) => x.status === 'left');
    const stuck = sts.filter((x) => x.stuckMin);
    const subsN = sum(sts, (x) => x.subs.length);
    const liveN = sts.filter((x) => x.live).length;
    const attn = sts.map((x) => ({ st: x, rs: attention(x) })).filter((x) => x.rs.length).sort((a, b) => score(b.st) - score(a.st));
    const logs = S().staffLogs || [];
    const loggedToday = (id) => logs.filter((l) => l.learner === id && isToday(l.at)).slice(-1)[0];
    const filt = {
      all: () => true, in: (x) => x.status === 'in', stuck: (x) => !!x.stuckMin, subs: (x) => x.subs.length > 0, off: (x) => x.status === 'absent' || x.status === 'notyet' || x.status === 'left'
    }[f] || (() => true);
    const board = sts.filter(filt).sort((a, b) => score(b) - score(a) || a.u.kana.localeCompare(b.u.kana));
    const counts = { all: sts.length, in: here.length, stuck: stuck.length, subs: sts.filter((x) => x.subs.length).length, off: absent.length + notyet.length + left.length };
    return {
      title: 'きょうの様子', nav: 'today', wide: true,
      html: html`<div class="page st-today">
        ${alertCards()}
        <div class="page-head"><div class="ph-text"><span class="eyebrow">${fmt.date(now)} ・ ${K.FACILITY.name}</span><h1>きょうの様子</h1><p class="lead">声をかけたほうがいい人から 順に ならんでいます。</p></div>
          <div class="ph-actions"><span class="st-live-note">${ic('refresh')}<span>利用者の画面と つながっています ・ <span data-st-clock>${fmt.time(now)}</span> 現在</span></span></div></div>
        <div class="stats st-stats" style="--cols:6">
          ${stat('login', '来ている', here.length, `/ ${sts.length}人`, here.filter((x) => x.home).length ? `うち在宅 ${here.filter((x) => x.home).length}人` : '', '')}
          ${stat('clock', 'まだ', notyet.length, '人', notyet.filter((x) => x.late).length ? `おくれ ${notyet.filter((x) => x.late).length}人` : '', notyet.filter((x) => x.late).length ? 'is-warn' : '')}
          ${stat('calendar', '休み', absent.length, '人', absent.length ? '連絡あり' : '', '')}
          ${stat('hourglass', '止まっている', stuck.length, '人', stuck.length ? '20分以上' : '', stuck.length ? 'is-warn' : '')}
          ${stat('send', 'きょうの提出', subsN, '件', '', '')}
          ${stat('live', '授業LIVE中', liveN, '人', liveState(), '')}
        </div>
        ${attn.length ? html`<section class="sec" aria-labelledby="st-attn-h">
          <div class="sec-head"><h2 id="st-attn-h">${ic('hand')}声かけが必要かも</h2><span class="small muted">${attn.length}人</span></div>
          <div class="st-attn">${attn.map(({ st, rs }) => {
            const lg = loggedToday(st.u.id);
            return html`<article class="card st-attn-card st-k-${rs[0].k}">
              <a class="st-attn-who" href="#/staff/person/${st.u.id}">${av(st.u)}<span class="grow"><b>${st.u.name}</b><span class="xsmall muted">${attText(st).text}${st.act ? ` ・ ${actLabel(st.act.type, st.act.ref).text}` : ''}</span></span></a>
              <ul class="st-reasons">${rs.map((r) => html`<li>${ic(r.icon)}<span><b>${r.text}</b>${r.sub ? html`<span>${r.sub}</span>` : ''}</span></li>`)}</ul>
              <div class="st-attn-foot">${lg ? html`<span class="status ok">${ic('checkc')}声をかけた（${fmt.time(lg.at)}）</span><button class="btn btn-sm btn-ghost" type="button" data-act="st-voice" data-id="${st.u.id}" data-text="${rs[0].text}">もう一度</button>` : html`<button class="btn btn-soft" type="button" data-act="st-voice" data-id="${st.u.id}" data-text="${rs[0].text}">${ic('chat')}<span>声をかけた</span></button>`}</div>
            </article>`;
          })}</div></section>` : html`<div class="banner ok">${ic('checkc')}<span class="b-text">いま、とくに声かけが必要な人は いません</span></div>`}
        <section class="sec" aria-labelledby="st-board-h">
          <div class="sec-head"><h2 id="st-board-h">${ic('users')}みんなの様子</h2><span class="small muted">${board.length}人</span></div>
          <div class="filters" role="group" aria-label="しぼりこみ">${[['all', 'すべて'], ['in', '来ている'], ['stuck', '止まっている'], ['subs', '提出した'], ['off', '休み・まだ']].map(([k, n]) => html`<a class="fchip" href="#/staff/today?f=${k}" aria-pressed="${f === k}">${n}<span class="count gray">${counts[k]}</span></a>`)}</div>
          <div class="card st-board" role="table" aria-label="利用者の様子">
            <div class="st-brow st-bhead" role="row"><span role="columnheader">名前</span><span role="columnheader">出席</span><span role="columnheader">調子</span><span role="columnheader">いま していること</span><span role="columnheader">提出</span><span></span></div>
            ${board.length ? board.map(boardRow) : html`<div class="empty">${ic('users')}<span class="em-title">あてはまる人は いません</span></div>`}
          </div>
        </section>
      </div>`,
      mount: () => trackNewAlerts()
    };
  }
  function liveState() {
    const ls = window.LearnerKit ? window.LearnerKit.liveState() : null;
    if (!ls) return '';
    if (ls.current) return `${K.GENRES[ls.current.genre].short} ${ls.current.start}〜`;
    if (ls.next) return `つぎは ${ls.next.start}〜`;
    return 'きょうは おわり';
  }
  function stat(icon, label, value, unit, sub, cls) {
    return html`<div class="stat ${cls}"><span class="st-label">${ic(icon)}${label}</span><span class="st-value">${value}<small>${unit}</small></span>${sub ? html`<span class="st-sub">${sub}</span>` : html`<span class="st-sub">&nbsp;</span>`}</div>`;
  }
  function boardRow(st) {
    const at = attText(st);
    const a = st.act ? actLabel(st.act.type, st.act.ref) : null;
    const since = st.act && st.status === 'in' ? Clock.minutes() - st.act.since : null;
    return html`<a class="st-brow ${st.alert ? 'is-alert' : ''} ${st.stuckMin ? 'is-stuck' : ''} ${st.status === 'absent' || st.status === 'left' ? 'is-dim' : ''}" role="row" href="#/staff/person/${st.u.id}">
      <span class="st-b-who" role="cell">${av(st.u)}<span class="grow"><b>${st.u.name}</b><span class="st-b-genres">${st.u.genres.map((g) => K.GENRES[g].short).join('・')}${st.isNew ? html` <span class="chip chip-info st-mini">はじめて</span>` : ''}</span></span></span>
      <span class="st-b-att" role="cell"><span class="status ${at.cls}">${ic(at.icon)}${at.text}</span><span class="xsmall muted">${at.sub}</span></span>
      <span class="st-b-mood ${st.status === 'in' || st.status === 'left' ? '' : 'is-empty'}" role="cell">${st.status === 'in' || st.status === 'left' ? moodChip(st.mood) : html`<span class="xsmall muted">—</span>`}</span>
      <span class="st-b-now ${st.alert || (a && st.status !== 'absent' && st.status !== 'notyet') ? '' : 'is-empty'}" role="cell">${st.alert ? html`<span class="status bad">${ic('alert')}緊急の知らせ（いちばん上）</span>` : a && st.status !== 'absent' && st.status !== 'notyet' ? html`<span class="st-now-line">${ic(a.icon)}<span><b>${a.text}</b>${a.sub ? html`<span class="st-now-sub">${a.sub}</span>` : ''}</span>${since != null && since >= 0 ? html`<span class="st-since">${since < 1 ? 'いま' : fmt.dur(since)}</span>` : ''}</span>` : html`<span class="xsmall muted">—</span>`}
        ${st.stuckMin ? html`<span class="st-stuck">${ic('hourglass')}${st.stuckMin}分 手が止まっています${st.stuckNote ? html`<span>${st.stuckNote}</span>` : ''}</span>` : ''}</span>
      <span class="st-b-subs ${st.subs.length ? '' : 'is-empty'}" role="cell">${st.subs.length ? html`<span class="chip chip-ok">${ic('send')}提出 ${st.subs.length}件</span>` : html`<span class="xsmall muted st-nosub">—</span>`}</span>
      <span class="st-b-chev chev" aria-hidden="true">${ic('right')}</span>
    </a>`;
  }
  act('st-voice', (el) => {
    const id = el.getAttribute('data-id');
    const u = person(id);
    Store.update((s) => { s.staffLogs = (s.staffLogs || []).concat([{ id: Core.uid('lg'), learner: id, at: nowISO(), text: `声をかけた：${el.getAttribute('data-text')}`, by: STAFF_NAME }]); });
    UI.toast(`記録しました（${u.name}さんに声をかけた）`);
  });

  /* あたらしい知らせが来たら、トーストでも知らせる */
  let knownAlerts = null;
  function trackNewAlerts() {
    const ids = openAlerts().map((a) => a.id);
    if (knownAlerts) {
      const fresh = ids.filter((id) => !knownAlerts.includes(id));
      if (fresh.length) {
        const a = S().alerts.find((x) => x.id === fresh[0]);
        const u = a && person(a.learner);
        UI.toast(`${a.type === 'call' ? '呼ばれています' : '緊急の知らせ'}：${u ? u.name : ''}さん`, { icon: 'alert', ms: 6000 });
      }
    }
    knownAlerts = ids;
  }

  /* ---------- 利用者の一覧 ---------- */
  function monthAtt(u) {
    const att = S().attendance[u.id] || {};
    const days = OCT().filter((d) => d < TODAY && (!u.isNew || d >= u.since));
    const recs = days.map((d) => applyEdit(u.id, d, att[d]));
    const came = recs.filter((r) => r && !r.absent);
    const st = dayState(u);
    const todayCame = st.status === 'in' || st.status === 'left';
    const totalMin = sum(came, (r) => r.work || 0) + (todayCame ? st.workMin : 0);
    return { planned: days.length + 1, came: came.length + (todayCame ? 1 : 0), totalMin, rate: days.length ? Math.round(came.length / days.length * 100) : 100 };
  }
  function pagePeople(route) {
    const q = (route.query.q || '').trim();
    const g = route.query.g || 'all';
    const list = S().mine.filter((u) => (g === 'all' || u.genres.includes(g)) && (!q || (u.name + u.kana).includes(q)));
    const sts = new Map(allStates().map((x) => [x.u.id, x]));
    return {
      title: '利用者', nav: 'people',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>利用者</h1><p class="lead">${K.FACILITY.name}の利用者 ${S().mine.length}人です。この事業所の人だけが見えます。</p></div></div>
        <form class="input-icon" data-submit="st-people-search" role="search">${ic('search')}<input class="input" name="q" value="${q}" placeholder="名前で さがす（ひらがなでもOK）" aria-label="名前でさがす"></form>
        <div class="filters" role="group" aria-label="ジャンル">${[['all', 'すべて'], ['web', 'Web制作'], ['design', '画像デザイン'], ['video', '動画編集'], ['sns', 'SNS運用'], ['ai', 'AI'], ['esports', 'eスポーツ']].map(([k, n]) => html`<a class="fchip" href="#/staff/people?g=${k}${q ? '&q=' + encodeURIComponent(q) : ''}" aria-pressed="${g === k}">${n}</a>`)}</div>
        <div class="st-people">${list.length ? list.map((u) => {
          const m = monthAtt(u);
          const st = sts.get(u.id);
          const at = attText(st);
          return html`<a class="card st-pcard" href="#/staff/person/${u.id}">
            <div class="st-pc-top">${av(u, 'lg')}<div class="grow"><b class="st-pc-name">${u.name}</b><span class="xsmall muted">${u.kana}</span>
              <div class="cluster mt-1">${u.genres.map((x) => html`<span class="chip">${gm(x, true)}${K.GENRES[x].name}</span>`)}${lvChip(u.level)}${u.isNew ? html`<span class="chip chip-info">はじめて</span>` : ''}</div></div></div>
            <p class="st-pc-goal">${ic('target')}<span>${u.goal}</span></p>
            <div class="st-pc-foot">
              <span class="status ${at.cls}">${ic(at.icon)}きょう：${at.text}</span>
              <span class="st-rate"><span class="xsmall muted">10月の出席</span><b>${m.rate}%</b><span class="bar thin"><i style="width:${m.rate}%"></i></span></span>
            </div>
            <span class="xsmall muted">${sinceText(u)}から${u.home ? ' ・ 在宅あり' : ''}</span>
          </a>`;
        }) : html`<div class="empty card">${ic('search')}<span class="em-title">見つかりませんでした</span></div>`}</div>
      </div>`
    };
  }
  act('st-people-search', (form) => App.go('#/staff/people' + (form.q.value.trim() ? '?q=' + encodeURIComponent(form.q.value.trim()) : '')));

  /* ---------- 利用者の くわしい様子 ---------- */
  const PK_TOPICS = {
    'u-yuma': [['書き出しのやり方', 3], ['テロップの入れ方', 1]], 'u-miku': [['OGP画像の大きさ', 1], ['色の組み合わせ', 1]],
    'u-kenta': [['BGMの音の大きさ', 2]], 'u-aoi': [['ニュースの出どころの書き方', 1]], 'u-takumi': [['トランジション', 1], ['モーション', 1]],
    'u-hinata': [['STUDIOの開き方', 2], ['文字の入れ方', 1]], 'u-ren': [['チラシの文字のならべ方', 1]], 'u-honoka': [['AIへのお願いの文', 2], ['目次', 1]],
    'u-sota': [['気持ち・体調のこと', 1]], 'u-sho': [], 'u-rina': []
  };
  const TOPIC_RULES = [[/(画像|写真)/, '画像・写真'], [/目次/, '目次'], [/書き出/, '書き出し'], [/(大きさ|サイズ|OGP)/, '画像の大きさ'], [/説明/, '説明の文'], [/(指示書|かんたん)/, '指示書の読み方'], [/(つぎ|次|何を)/, 'つぎにやること'], [/(合って|合格|これで)/, '出す前の確認'], [/(小さく|分けて)/, 'やることの分け方'], [/(つらい|しんどい|体調|ねむれ|いやに)/, '気持ち・体調のこと']];
  function topicsOf(u) {
    if (u.id !== S().me) return PK_TOPICS[u.id] || [];
    const msgs = S().pikuto.filter((m) => m.from === 'me').concat(...Object.values(S().chats).map((c) => c.filter((m) => m.from === 'me')));
    const cnt = new Map();
    msgs.forEach((m) => { const r = TOPIC_RULES.find(([re]) => re.test(m.text)); const k = r ? r[1] : 'そのほか'; cnt.set(k, (cnt.get(k) || 0) + 1); });
    return Array.from(cnt.entries()).sort((a, b) => b[1] - a[1]);
  }
  /** 提出したもの（さくらは本当のきろく、ほかの人は架空のきろく） */
  function worksOf(u) {
    const out = [];
    S().submissions.filter((x) => x.learner === u.id).forEach((x) => out.push({ task: x.task, at: x.at, st: x.status === 'waiting' ? 'waiting' : x.status === 'held' ? 'waiting' : (x.reply && x.reply.type === 'fix' ? 'fix' : 'ok') }));
    if (u.id === S().me) {
      Object.entries(S().tasks).forEach(([id, ts]) => {
        if (out.some((o) => o.task === id)) return;
        if (ts.status === 'ok') out.push({ task: id, at: ts.okAt || ts.submittedAt, st: 'ok' });
        else if (ts.status === 'submitted') out.push({ task: id, at: ts.submittedAt, st: 'waiting' });
        else if (ts.status === 'fix') out.push({ task: id, at: ts.submittedAt, st: 'fix' });
      });
    } else {
      const r = Core.rng(Core.hashStr(u.id + 'w'));
      const pool = K.ALL_TASKS.filter((t) => t.kind === 'monthly' && u.genres.includes(t.genre) && t.month >= '2026-07' && t.month <= '2026-09');
      pool.slice(0, 2 + Math.floor(r() * 2)).forEach((t) => out.push({ task: t.id, at: `${t.month}-2${Math.floor(r() * 8)}T14:00:00+09:00`, st: 'ok' }));
    }
    return out.filter((o) => taskOf(o.task)).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  const WST = { ok: ['chip-ok', 'checkc', '運営OK'], waiting: ['chip-warn', 'hourglass', '運営が確認中'], fix: ['chip-warn', 'edit', '直しの返事あり'] };

  function todayTimeline(u) {
    const now = Clock.minutes();
    const items = [];
    if (u.id === S().me) {
      const d = S().myDay;
      if (d.status === 'none') return [];
      items.push([isoMin(d.in), 'login', '来ました', d.mood ? `調子：${d.mood}` : '']);
      (d.breaks || []).forEach((b) => items.push([isoMin(b.start), 'coffee', '休けい', b.end ? `${fmt.time(b.end)}まで` : 'いま休けい中']));
      S().submissions.filter((x) => x.learner === u.id && isToday(x.at)).forEach((x) => { const t = taskOf(x.task); items.push([isoMin(x.at), 'send', '提出しました', t ? t.title : '']); });
      if (d.activity && d.status === 'in') { const a = actLabel(d.activity.type, d.activity.ref); items.push([isoMin(d.activity.at), a.icon, a.text, a.sub]); }
      if (d.out) items.push([isoMin(d.out), 'logout', '帰りました', '']);
    } else {
      const d = S().day[u.id] || {};
      (d.seg || []).forEach(([t, type, ref, extra]) => {
        const m = toMin(t);
        if (m > now) return;
        if (type === 'arrive') items.push([m, d.home || u.home ? 'house' : 'login', d.home || u.home ? '在宅で はじめました' : '来ました', d.mood ? `調子：${d.mood}` : '']);
        else if (type === 'pikuto' && extra && extra.alert) items.push([m, 'alert', '緊急の知らせ（ぴくとへの相談から）', '']);
        else { const a = actLabel(type, ref); items.push([m, a.icon, a.text, a.sub]); }
      });
    }
    return items.sort((a, b) => a[0] - b[0]);
  }

  function monthSeries(u) {
    const att = S().attendance[u.id] || {};
    const st = dayState(u);
    return OCT().map((ds) => {
      let a = ds === TODAY ? ((st.status === 'in' || st.status === 'left') ? { work: st.workMin, home: st.home } : null) : applyEdit(u.id, ds, att[ds]);
      if (u.isNew && ds < u.since) a = null;
      return { ds, a, label: `${Number(ds.slice(8))}日`, short: String(Number(ds.slice(8))), value: a && !a.absent ? Math.round((a.work || 0) / 6) / 10 : 0 };
    });
  }
  function calendar(u, data) {
    const firstWd = new Date('2026-10-01T12:00:00+09:00').getUTCDay();
    const cells = [];
    for (let i = 0; i < firstWd; i++) cells.push(html`<div class="cal-d is-empty"></div>`);
    for (let day = 1; day <= 31; day++) {
      const ds = `2026-10-${pad(day)}`;
      const x = data.find((r) => r.ds === ds);
      let cls = 'is-off';
      if (x && x.a && !x.a.absent) cls = x.value >= 5 ? 'lv4' : x.value >= 4 ? 'lv3' : x.value >= 2.5 ? 'lv2' : 'lv1';
      else if (x && x.a && x.a.absent) cls = 'is-absent';
      cells.push(html`<div class="cal-d ${cls} ${ds === TODAY ? 'is-today' : ''}" title="${ds}${x && x.value ? ` ${x.value}時間` : ''}"><span>${day}</span>${x && x.value ? html`<small>${x.value}h</small>` : ''}</div>`);
    }
    return html`<div class="cal" role="grid" aria-label="10月の出席">${['日', '月', '火', '水', '木', '金', '土'].map((w) => html`<div class="cal-h">${w}</div>`)}${cells}</div>
      <div class="legend-scale"><span>短い</span><i style="background:#cfeaf6"></i><i style="background:#8fd0ec"></i><i style="background:#3aa9d8"></i><i style="background:#0077a8"></i><span>長い</span><span style="margin-left:12px">「休」はお休みの日</span></div>`;
  }

  function pagePerson(route) {
    const u = S().mine.find((x) => x.id === route.params.id);
    if (!u) return { title: '利用者', html: html`<div class="empty card">見つかりませんでした</div>` };
    const st = dayState(u);
    const at = attText(st);
    const tl = todayTimeline(u);
    const data = monthSeries(u);
    const m = monthAtt(u);
    const works = worksOf(u);
    const topics = topicsOf(u);
    const logs = (S().staffLogs || []).filter((l) => l.learner === u.id).map((l) => ({ at: l.at, icon: 'chat', text: l.text, by: l.by }))
      .concat((S().alertLog || []).filter((a) => a.learner === u.id).map((a) => ({ at: a.doneAt || a.at, icon: a.type === 'call' ? 'hand' : 'alert', text: `${a.type === 'call' ? '呼ばれて対応' : '緊急の知らせに対応'}：${a.note || ''}`, by: a.doneBy })))
      .sort(by('at', 'desc'));
    const a = st.act ? actLabel(st.act.type, st.act.ref) : null;
    return {
      title: u.name, topTitle: '利用者の様子', nav: 'people', back: '#/staff/people', wide: true,
      html: html`<div class="page">
        ${st.alert ? html`<div class="banner bad">${ic('alert')}<span class="b-text">この人に「緊急の知らせ」が出ています<p>${st.alert.title}</p></span><button class="btn btn-sm" type="button" data-act="st-alert-done" data-id="${st.alert.id}">${ic('check')}<span>対応した</span></button></div>` : ''}
        <section class="card st-phead">
          ${av(u, 'xl')}
          <div class="grow stack-sm">
            <div><h1 class="st-pname">${u.name}</h1><span class="small muted">${u.kana}</span></div>
            <div class="cluster">${u.genres.map((x) => html`<span class="chip">${gm(x, true)}${K.GENRES[x].name}</span>`)}${lvChip(u.level)}${u.home ? html`<span class="chip">${ic('house')}在宅あり</span>` : ''}${u.isNew ? html`<span class="chip chip-info">はじめて</span>` : ''}</div>
            <p class="st-goal">${ic('target')}<span><span class="xsmall muted bold">目標</span>${u.goal}</span></p>
            <p class="xsmall muted">${sinceText(u)}から利用</p>
          </div>
          <div class="st-pnow">
            <span class="xsmall muted bold">いま（${fmt.time(Clock.now())}）</span>
            <span class="status ${at.cls}">${ic(at.icon)}${at.text}</span><span class="xsmall muted">${at.sub || ''}</span>
            ${a && st.status === 'in' ? html`<span class="st-now-line">${ic(a.icon)}<span><b>${a.text}</b>${a.sub ? html`<span class="st-now-sub">${a.sub}</span>` : ''}</span></span>` : ''}
            ${st.status === 'in' || st.status === 'left' ? moodChip(st.mood) : ''}
            ${st.stuckMin ? html`<span class="st-stuck">${ic('hourglass')}${st.stuckMin}分 手が止まっています${st.stuckNote ? html`<span>${st.stuckNote}</span>` : ''}</span>` : ''}
            <button class="btn btn-soft" type="button" data-act="st-voice" data-id="${u.id}" data-text="ようすを見て声をかけた">${ic('chat')}<span>声をかけた</span></button>
          </div>
        </section>
        <div class="st-pgrid">
          <div class="stack-lg">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('sun')}きょうの流れ</h2><span class="small muted">${fmt.time(Clock.now())}まで</span></div>
              ${tl.length ? html`<ol class="tl">${tl.map(([mm, icon, t, sub], i) => html`<li class="tl-item ${i === tl.length - 1 && st.status === 'in' ? 'is-now' : 'is-done'}"><span class="tl-time">${hm(mm)}</span><span class="tl-mark"><i></i></span><span class="tl-body"><span class="tl-title">${t}</span>${sub ? html`<span class="tl-sub">${sub}</span>` : ''}</span></li>`)}</ol>`
                : html`<p class="muted">${st.status === 'absent' ? `きょうは休みです（${st.reason}）` : 'まだ来ていません'}</p>`}
            </section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('calendar')}10月の出席</h2><span class="small muted">${m.came}日 / ${m.planned}日 ・ ${fmt.dur(m.totalMin)}</span></div>
              ${calendar(u, data)}
            </section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chart')}10月の 取り組んだ時間（1日ごと）</h2></div>
              ${Charts.bars(data.map((x) => ({ label: x.label, short: x.short, value: x.value })), { title: `${u.name}さんの 10月の1日ごとの取り組んだ時間（時間）`, unit: '時間', xName: '日にち', yName: '時間', fmt: (v) => String(Math.round(v * 10) / 10) })}
            </section>
          </div>
          <div class="stack-lg">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('send')}提出したもの</h2><span class="small muted">${works.length}件</span></div>
              ${works.length ? html`<ul class="st-works">${works.slice(0, 8).map((w) => { const t = taskOf(w.task); const [c, i, l] = WST[w.st] || WST.ok; return html`<li>${gm(t.genre || 'pc', true)}<span class="grow"><span class="st-w-title">${t.title}</span><span class="xsmall muted">${fmt.date(w.at)}</span></span><span class="chip ${c}">${ic(i)}${l}</span></li>`; })}</ul>` : html`<p class="muted small">まだ ありません</p>`}
            </section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chat')}ぴくとに聞いたこと</h2></div>
              ${topics.length ? html`<div class="cluster">${topics.map(([k, n]) => html`<span class="chip chip-lg">${k}<span class="count gray">${n}</span></span>`)}</div>` : html`<p class="muted small">今月は まだ ありません</p>`}
              <p class="st-privacy">${ic('lock')}<span>話した内容そのものは表示しません（話題だけ）。体や気持ちが心配な時だけ、緊急の知らせが出ます。</span></p>
            </section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('edit')}職員メモ</h2><span class="xsmall muted">この事業所の職員だけが見ます</span></div>
              <textarea class="textarea" data-change="st-memo" data-id="${u.id}" placeholder="気づいたことを書いておく（例：午後は集中しやすい）">${(S().staffNotes || {})[u.id] || ''}</textarea>
              <p class="xsmall muted">書きおわると、自動で保存されます。</p>
            </section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('hand')}声かけの記録</h2></div>
              ${logs.length ? html`<ul class="st-logs">${logs.slice(0, 8).map((l) => html`<li>${ic(l.icon)}<span class="grow"><span>${l.text}</span><span class="xsmall muted">${fmt.dt(l.at)}${l.by ? ` ・ ${l.by}` : ''}</span></span></li>`)}</ul>` : html`<p class="muted small">まだ ありません</p>`}
            </section>
            <a class="btn btn-block" href="#/staff/report/${u.id}">${ic('file')}<span>10月の報告を見る</span></a>
          </div>
        </div>
      </div>`,
      mount: (root) => Charts.mount(root)
    };
  }
  act('st-memo', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { s.staffNotes = s.staffNotes || {}; s.staffNotes[id] = el.value; }, { silent: true });
    UI.toast('メモを保存しました');
  });

  /* ---------- 出席 ---------- */
  function applyEdit(id, ds, rec) {
    const e = (S().attEdits || {})[`${id}|${ds}`];
    if (!e) return rec;
    if (e.absent) return { absent: true, reason: e.reason, edited: e };
    const inM = toMin(e.in), outM = toMin(e.out);
    return { in: inM, out: outM, brk: e.brk, home: e.home, work: Math.max(0, outM - inM - e.brk), edited: e };
  }
  function dayRows(ds) {
    return S().mine.map((u) => {
      if (u.isNew && ds < u.since) return { u, none: true };
      if (ds === TODAY) {
        const e = (S().attEdits || {})[`${u.id}|${ds}`];
        if (e) { const r = applyEdit(u.id, ds, null); return { u, rec: r, state: r.absent ? 'absent' : 'left' }; }
        const st = dayState(u);
        if (st.status === 'absent') return { u, rec: { absent: true, reason: st.reason }, state: 'absent' };
        if (st.status === 'notyet') return { u, rec: null, state: 'notyet', expected: st.expected };
        return { u, rec: { in: st.inMin, out: st.outMin, brk: st.breakMin, home: st.home, work: st.workMin }, state: st.status };
      }
      const r = applyEdit(u.id, ds, (S().attendance[u.id] || {})[ds]);
      if (!r) return { u, none: true };
      return { u, rec: r, state: r.absent ? 'absent' : 'left' };
    });
  }
  const STATE_LABEL = { in: ['ok', '来ている'], left: ['mute', '帰った'], absent: ['mute', '休み'], notyet: ['warn', 'まだ'] };
  function pageAttendance(route) {
    const v = route.query.v === 'month' ? 'month' : 'day';
    const days = OCT();
    const ds = days.includes(route.query.d) ? route.query.d : TODAY;
    return {
      title: '出席', nav: 'attendance', wide: true,
      html: html`<div class="page st-att">
        <div class="page-head"><div class="ph-text"><h1>出席</h1><p class="lead">来た時間・帰った時間・休けい・取り組んだ時間の記録です。直す時は、理由を書きます。</p></div>
          <div class="ph-actions st-noprint"><button class="btn" type="button" data-act="st-csv" data-v="${v}" data-d="${ds}">${ic('download')}<span>CSVで保存</span></button><button class="btn" type="button" data-act="st-print">${ic('printer')}<span>印刷</span></button></div></div>
        <div class="seg st-noprint" role="tablist" aria-label="見かた"><a role="tab" href="#/staff/attendance?v=day&d=${ds}" aria-selected="${v === 'day'}">${ic('sun')}日ごと</a><a role="tab" href="#/staff/attendance?v=month" aria-selected="${v === 'month'}">${ic('table')}10月の一覧</a></div>
        ${v === 'day' ? dayView(ds, days) : monthView(days)}
      </div>`
    };
  }
  function dayView(ds, days) {
    const rows = dayRows(ds);
    const came = rows.filter((r) => r.rec && !r.rec.absent);
    const total = sum(came, (r) => r.rec.work || 0);
    return html`
      <div class="filters st-days st-noprint" role="group" aria-label="日にち">${days.slice().reverse().map((d) => html`<a class="fchip" href="#/staff/attendance?v=day&d=${d}" aria-pressed="${d === ds}">${Number(d.slice(5, 7))}/${Number(d.slice(8))}（${fmt.weekday(d + 'T12:00:00+09:00')}）${d === TODAY ? html`<span class="chip chip-live st-mini">きょう</span>` : ''}</a>`)}</div>
      <div class="stats st-stats st-stats3 st-noprint" style="--cols:3">
        <div class="stat"><span class="st-label">${ic('login')}来た人</span><span class="st-value">${came.length}<small>/ ${rows.filter((r) => !r.none).length}人</small></span><span class="st-sub">${fmt.dateShort(ds + 'T12:00:00+09:00')}</span></div>
        <div class="stat"><span class="st-label">${ic('house')}在宅</span><span class="st-value">${came.filter((r) => r.rec.home).length}<small>人</small></span><span class="st-sub">&nbsp;</span></div>
        <div class="stat"><span class="st-label">${ic('clock')}時間の合計</span><span class="st-value">${Math.round(total / 6) / 10}<small>時間</small></span><span class="st-sub">${ds === TODAY ? `${fmt.time(Clock.now())} 現在` : '&nbsp;'}</span></div>
      </div>
      <ul class="st-att-cards hide-pc st-noprint">${rows.map((r) => {
        if (r.none) return '';
        const [cls, label] = STATE_LABEL[r.state] || STATE_LABEL.left;
        const rec = r.rec;
        const ok = rec && !rec.absent;
        return html`<li class="card st-attc">
          <div class="st-attc-top">${av(r.u, 'sm')}<b class="grow">${r.u.name}</b><span class="status ${cls}">${label}</span>${rec && rec.edited ? html`<span class="chip st-mini">${ic('edit')}直した</span>` : ''}</div>
          ${ok ? html`<dl class="st-attc-dl"><div><dt>来た</dt><dd>${hm(rec.in)}</dd></div><div><dt>帰った</dt><dd>${rec.out != null ? hm(rec.out) : 'まだいる'}</dd></div><div><dt>休けい</dt><dd>${Math.round(rec.brk || 0)}分</dd></div><div><dt>取り組み</dt><dd><b>${fmt.dur(rec.work)}</b></dd></div></dl>`
            : html`<p class="small muted">${rec && rec.absent ? rec.reason : (r.state === 'notyet' ? `いつもは ${r.expected}ごろ` : '')}</p>`}
          <div class="st-attc-foot">${ok ? (rec.home ? html`<span class="chip">${ic('house')}在宅</span>` : html`<span class="chip">${ic('building')}通所</span>`) : html`<span></span>`}<button class="btn btn-sm btn-ghost" type="button" data-act="st-att-edit" data-id="${r.u.id}" data-d="${ds}" aria-label="${r.u.name}さんの出席を直す">${ic('edit')}<span>直す</span></button></div>
        </li>`;
      })}</ul>
      <h2 class="st-print-title">${K.FACILITY.name} 出席の記録 ${fmt.date(ds + 'T12:00:00+09:00')}</h2>
      <div class="table-wrap st-att-wrap"><table class="table st-att-table">
        <thead><tr><th>名前</th><th>様子</th><th class="num">来た</th><th class="num">帰った</th><th class="num">休けい</th><th class="num">取り組み</th><th>場所</th><th class="tight st-noprint"><span class="sr-only">直す</span></th></tr></thead>
        <tbody>${rows.map((r) => {
          if (r.none) return html`<tr class="st-tr-none"><td>${av(r.u, 'sm')}<span>${r.u.name}</span></td><td colspan="7" class="muted small">この日は利用前です</td></tr>`;
          const [cls, label] = STATE_LABEL[r.state] || STATE_LABEL.left;
          const rec = r.rec;
          return html`<tr>
            <td><span class="st-td-name">${av(r.u, 'sm')}<span>${r.u.name}</span></span></td>
            <td><span class="status ${cls}">${label}</span>${rec && rec.edited ? html`<span class="chip st-mini" title="${rec.edited.reason}">${ic('edit')}直した</span>` : ''}${rec && rec.absent ? html`<span class="xsmall muted st-reason">${rec.reason}</span>` : ''}${r.state === 'notyet' ? html`<span class="xsmall muted st-reason">いつもは ${r.expected}</span>` : ''}</td>
            <td class="num">${rec && !rec.absent ? hm(rec.in) : '—'}</td>
            <td class="num">${rec && !rec.absent && rec.out != null ? hm(rec.out) : (r.state === 'in' ? html`<span class="xsmall muted">まだいる</span>` : '—')}</td>
            <td class="num">${rec && !rec.absent ? `${Math.round(rec.brk || 0)}分` : '—'}</td>
            <td class="num"><b>${rec && !rec.absent ? fmt.dur(rec.work) : '—'}</b></td>
            <td>${rec && !rec.absent ? (rec.home ? html`<span class="chip">${ic('house')}在宅</span>` : html`<span class="chip">${ic('building')}通所</span>`) : '—'}</td>
            <td class="tight st-noprint"><button class="btn btn-sm btn-ghost" type="button" data-act="st-att-edit" data-id="${r.u.id}" data-d="${ds}" aria-label="${r.u.name}さんの出席を直す">${ic('edit')}<span>直す</span></button></td>
          </tr>`;
        })}</tbody>
      </table></div>
      <p class="xsmall muted">「直した」がついた記録は、直した理由が残ります（試作）。</p>`;
  }
  function monthView(days) {
    const list = S().mine;
    const cell = (u, d) => {
      if (u.isNew && d < u.since) return { mark: '', cls: 'st-mc-none', h: 0 };
      if (d === TODAY) {
        const r = dayRows(TODAY).find((x) => x.u.id === u.id);
        if (r.state === 'absent') return { mark: '休', cls: 'st-mc-abs', h: 0 };
        if (r.state === 'notyet') return { mark: '…', cls: 'st-mc-none', h: 0 };
        return { mark: r.rec.home ? '在' : '○', cls: 'st-mc-in', h: Math.round(r.rec.work / 6) / 10 };
      }
      const rec = applyEdit(u.id, d, (S().attendance[u.id] || {})[d]);
      if (!rec) return { mark: '', cls: 'st-mc-none', h: 0 };
      if (rec.absent) return { mark: '休', cls: 'st-mc-abs', h: 0 };
      return { mark: rec.home ? '在' : '○', cls: 'st-mc-in', h: Math.round(rec.work / 6) / 10 };
    };
    return html`
      <div class="cluster small st-noprint"><span class="st-mlegend"><b class="st-mc st-mc-in">○</b>通所</span><span class="st-mlegend"><b class="st-mc st-mc-in">在</b>在宅</span><span class="st-mlegend"><b class="st-mc st-mc-abs">休</b>休み</span><span class="st-mlegend"><b class="st-mc st-mc-none">…</b>まだ</span><span class="muted">数字は取り組んだ時間（時間）</span></div>
      <h2 class="st-print-title">${K.FACILITY.name} 出席の一覧 2026年10月</h2>
      <div class="table-wrap st-month"><table class="table st-month-table">
        <thead><tr><th class="st-sticky">名前</th>${days.map((d) => html`<th class="st-mday ${d === TODAY ? 'is-today' : ''}"><span>${Number(d.slice(8))}</span><small>${fmt.weekday(d + 'T12:00:00+09:00')}</small></th>`)}<th class="num">出席</th><th class="num">時間</th></tr></thead>
        <tbody>${list.map((u) => {
          const cs = days.map((d) => cell(u, d));
          const came = cs.filter((c) => c.cls === 'st-mc-in').length;
          const h = Math.round(sum(cs, (c) => c.h) * 10) / 10;
          return html`<tr><td class="st-sticky"><span class="st-td-name">${av(u, 'sm')}<span>${u.name}</span></span></td>${cs.map((c, i) => html`<td class="st-mcell ${days[i] === TODAY ? 'is-today' : ''}"><b class="st-mc ${c.cls}">${c.mark}</b>${c.h ? html`<small>${c.h}</small>` : ''}</td>`)}<td class="num"><b>${came}</b>日</td><td class="num"><b>${h}</b></td></tr>`;
        })}</tbody>
      </table></div>`;
  }
  act('st-print', () => window.print());
  act('st-csv', (el) => {
    const v = el.getAttribute('data-v');
    const days = OCT();
    let rows;
    if (v === 'month') {
      rows = [['名前'].concat(days.map((d) => d.slice(5))).concat(['出席日数', '合計時間'])];
      S().mine.forEach((u) => {
        const vals = days.map((d) => {
          if (d === TODAY) { const r = dayRows(TODAY).find((x) => x.u.id === u.id); return r.rec && !r.rec.absent ? (Math.round(r.rec.work / 6) / 10) : (r.state === 'absent' ? '休' : ''); }
          const rec = applyEdit(u.id, d, (S().attendance[u.id] || {})[d]);
          return !rec ? '' : rec.absent ? '休' : Math.round(rec.work / 6) / 10;
        });
        const nums = vals.filter((x) => typeof x === 'number');
        rows.push([u.name].concat(vals).concat([nums.length, Math.round(sum(nums) * 10) / 10]));
      });
    } else {
      const ds = el.getAttribute('data-d');
      rows = [['日にち', '名前', '様子', '来た', '帰った', '休けい（分）', '取り組み（分）', '場所', '直した理由']];
      dayRows(ds).forEach((r) => {
        if (r.none) return;
        const rec = r.rec;
        rows.push([ds, r.u.name, (STATE_LABEL[r.state] || STATE_LABEL.left)[1], rec && !rec.absent ? hm(rec.in) : '', rec && !rec.absent && rec.out != null ? hm(rec.out) : '', rec && !rec.absent ? Math.round(rec.brk || 0) : '', rec && !rec.absent ? Math.round(rec.work) : '', rec && !rec.absent ? (rec.home ? '在宅' : '通所') : '', rec && rec.edited ? rec.edited.reason : (rec && rec.absent ? rec.reason : '')]);
      });
    }
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    UI.download(v === 'month' ? `出席一覧_2026-10_${K.FACILITY.name}.csv` : `出席_${el.getAttribute('data-d')}_${K.FACILITY.name}.csv`, csv);
    UI.toast('CSVファイルを保存しました', { icon: 'download' });
  });
  act('st-att-edit', (el) => {
    const id = el.getAttribute('data-id'), ds = el.getAttribute('data-d');
    const u = person(id);
    const r = dayRows(ds).find((x) => x.u.id === id);
    const rec = r && r.rec && !r.rec.absent ? r.rec : null;
    const inV = rec ? hm(rec.in).padStart(5, '0') : u.inT;
    const outV = rec && rec.out != null ? hm(rec.out).padStart(5, '0') : u.outT;
    UI.sheet({
      title: `出席を直す：${u.name}さん`, icon: ic('edit'),
      body: html`<p class="small muted">${fmt.date(ds + 'T12:00:00+09:00')}の記録です。直した理由は記録に残ります。</p>
        <div class="seg seg-block" role="group" aria-label="出席か休みか"><button type="button" data-kind="in" aria-selected="${!(r && r.rec && r.rec.absent)}">出席</button><button type="button" data-kind="absent" aria-selected="${!!(r && r.rec && r.rec.absent)}">休み</button></div>
        <div class="st-edit-times grid-2" data-times>
          <div class="field"><label class="label" for="st-in">来た時間</label><input class="input" id="st-in" type="time" value="${inV}"></div>
          <div class="field"><label class="label" for="st-out">帰った時間</label><input class="input" id="st-out" type="time" value="${outV}"></div>
          <div class="field"><label class="label" for="st-brk">休けい（分）</label><input class="input" id="st-brk" type="number" min="0" step="5" value="${rec ? Math.round(rec.brk || 0) : 60}"></div>
          <div class="field"><span class="label">場所</span><div class="seg seg-block" role="group" aria-label="場所"><button type="button" data-home="0" aria-selected="${!(rec && rec.home)}">通所</button><button type="button" data-home="1" aria-selected="${!!(rec && rec.home)}">在宅</button></div></div>
        </div>
        <div class="field"><span class="label">直す理由<span class="opt">（かならず書く）</span></span>
          <div class="cluster">${['押しわすれ', '通院で途中から', '在宅に切りかえ', '時間のまちがい', '連絡のあった休み'].map((x) => html`<button class="fchip" type="button" aria-pressed="false" data-reason="${x}">${x}</button>`)}</div>
          <textarea class="textarea" id="st-reason" style="min-height:70px" placeholder="例：帰りの押しわすれ。本人と確認した"></textarea></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-primary btn-lg" type="button" data-yes>${ic('check')}<span>保存する</span></button>`,
      mount: (sh, close) => {
        let kind = r && r.rec && r.rec.absent ? 'absent' : 'in';
        let home = !!(rec && rec.home);
        const times = sh.querySelector('[data-times]');
        const syncKind = () => { times.hidden = kind === 'absent'; sh.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.kind === kind))); };
        sh.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.kind; syncKind(); }));
        sh.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', () => { home = b.dataset.home === '1'; sh.querySelectorAll('[data-home]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); }));
        sh.querySelectorAll('[data-reason]').forEach((b) => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); }));
        syncKind();
        sh.querySelector('[data-yes]').addEventListener('click', () => {
          const picked = Array.from(sh.querySelectorAll('[data-reason][aria-pressed="true"]')).map((x) => x.dataset.reason);
          const memo = sh.querySelector('#st-reason').value.trim();
          const reason = picked.concat(memo ? [memo] : []).join('。');
          if (!reason) { UI.toast('直す理由を えらぶか、書いてください', { icon: 'info' }); sh.querySelector('#st-reason').focus(); return; }
          const inT = sh.querySelector('#st-in').value || u.inT, outT = sh.querySelector('#st-out').value || u.outT;
          if (kind === 'in' && toMin(outT) <= toMin(inT)) { UI.toast('帰った時間は、来た時間より あとにしてください', { icon: 'info' }); return; }
          Store.update((s) => {
            s.attEdits = s.attEdits || {};
            s.attEdits[`${id}|${ds}`] = kind === 'absent' ? { absent: true, reason, by: STAFF_NAME, at: nowISO() } : { in: inT, out: outT, brk: Math.max(0, Number(sh.querySelector('#st-brk').value) || 0), home, reason, by: STAFF_NAME, at: nowISO() };
          });
          close();
          UI.toast(`${u.name}さんの出席を直しました`);
        });
      }
    });
  });

  /* ---------- 月の報告 ---------- */
  function monthStats(u) {
    const data = monthSeries(u);
    const came = data.filter((x) => x.a && !x.a.absent);
    const hours = sum(came, (x) => x.value);
    const r = Core.rng(Core.hashStr(u.id + 'm'));
    let subs, oks, watched;
    if (u.id === S().me) {
      const ts = Object.values(S().tasks);
      subs = ts.filter((t) => (t.submittedAt || '').startsWith('2026-10')).length;
      oks = ts.filter((t) => t.status === 'ok' && (t.okAt || '').startsWith('2026-10')).length;
      watched = Object.values(S().lessons).filter((v) => v >= 1).length;
    } else {
      subs = 1 + Math.floor(r() * 4) + (u.level === 'advanced' ? 1 : 0);
      oks = Math.max(0, subs - Math.floor(r() * 2));
      watched = 4 + Math.floor(r() * 12);
      if (u.isNew) { subs = 1; oks = 1; watched = 5; }
    }
    const live = Math.round(came.length * (0.9 + r() * 0.7));
    return { data, came: came.length, planned: data.filter((x) => !(u.isNew && x.ds < u.since)).length, hours, avg: came.length ? hours / came.length : 0, subs, oks, watched, live };
  }
  const SKILLS = {
    web: ['STUDIOでページの骨組みを作れる', '写真と説明をならべられる', '目次から見出しへ飛べるようにできる', '表と流れの図を作れる'],
    design: ['キャンバで文字と写真をならべられる', 'OGP画像の大きさで作れる', '色を3色くらいにまとめられる', 'チラシ1まいを仕上げられる'],
    video: ['素材をならべて、いらない所をカットできる', 'テロップを入れられる', 'BGMの音の大きさをそろえられる', '書き出して提出できる'],
    sns: ['投稿の文をAIといっしょに考えられる', '人の写真が入らないよう気をつけられる', 'ニュースの出どころを書ける'],
    ai: ['AIにお願いの文をわたせる', 'AIの文を自分の目で直せる'],
    esports: ['チームで声をかけあえる'], pc: ['マウスとキーボードの基本']
  };
  function skillsOf(u) {
    if (u.id === S().me) {
      const oks = Object.entries(S().tasks).filter(([, t]) => t.status === 'ok' && (t.okAt || '').startsWith('2026-10')).map(([id]) => taskOf(id)).filter(Boolean);
      const series = window.CATALOG.series.filter((s) => s.episodes.length && s.episodes.every((e) => (S().lessons[e.id] || 0) >= 1)).map((s) => `教材「${s.title}」を ぜんぶ見た`);
      return oks.map((t) => `${t.title}（運営の確認でOK）`).concat(series.slice(0, 3));
    }
    const lvN = { beginner: 1, middle: 2, advanced: 3 }[u.level] || 1;
    return u.genres.flatMap((g) => (SKILLS[g] || []).slice(0, lvN + (u.isNew ? 0 : 1))).slice(0, 4);
  }
  function opsWords(u) {
    const out = [];
    if (u.id === S().me) Object.values(S().chats).forEach((c) => c.filter((m) => m.from === 'ops').forEach((m) => out.push(m)));
    S().submissions.filter((x) => x.learner === u.id && x.reply && x.reply.text).forEach((x) => out.push({ at: x.decidedAt || x.at, text: x.reply.text, who: '運営' }));
    return out.sort(by('at', 'desc')).slice(0, 2);
  }
  function pageReport() {
    const list = S().mine.map((u) => ({ u, m: monthStats(u), rep: (S().reports || {})[u.id] }));
    const totalDays = sum(list, (x) => x.m.came);
    const totalH = sum(list, (x) => x.m.hours);
    const subs = sum(list, (x) => x.m.subs), oks = sum(list, (x) => x.m.oks);
    const live = sum(list, (x) => x.m.live);
    const daily = OCT().map((ds) => ({ label: `${Number(ds.slice(8))}日`, short: String(Number(ds.slice(8))), value: list.filter((x) => { const d = x.m.data.find((y) => y.ds === ds); return d && d.a && !d.a.absent; }).length }));
    const doneN = list.filter((x) => x.rep && x.rep.status === 'done').length;
    return {
      title: '月の報告', nav: 'report', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">2026年10月（26日までの記録）</span><h1>月の報告</h1><p class="lead">一人ひとりの10月の取り組みを まとめます。AIの下書きを使って、書く時間を へらせます。</p></div></div>
        <div class="banner warn">${ic('info')}<span class="b-text">この報告は、ふりかえりの材料です。<p>福祉サービスの支援記録は、事業所の様式で残してください。</p></span></div>
        <div class="stats st-stats st-stats5">
          ${stat('calcheck', 'のべ出席', totalDays, '日', `${list.length}人の合計`, '')}
          ${stat('clock', '平均の時間', totalDays ? (totalH / totalDays).toFixed(1) : 0, '時間', '1日あたり', '')}
          ${stat('live', '授業LIVE', live, '回', 'のべ回数', '')}
          ${stat('send', '提出', subs, '件', '', '')}
          ${stat('checkc', '運営OK', oks, '件', subs ? `提出の${Math.round(oks / subs * 100)}%` : '', '')}
        </div>
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chart')}10月の 1日ごとの来た人数</h2></div>
          ${Charts.bars(daily, { title: `${K.FACILITY.name}の 10月の1日ごとの来た人数（人）`, unit: '人', xName: '日にち', yName: '人数', fmt: (v) => String(Math.round(v)) })}
        </section>
        <section class="sec"><div class="sec-head"><h2>${ic('users')}一人ひとりの報告</h2><span class="small muted">できた ${doneN} / ${list.length}人</span></div>
          <div class="card"><ul class="rows">${list.map(({ u, m, rep }) => html`<li><a class="row-item st-rep-row" href="#/staff/report/${u.id}">
            ${av(u)}
            <span class="st-rep-main"><span class="ri-title">${u.name}</span><span class="ri-sub">${u.genres.map((g) => K.GENRES[g].name).join('・')}</span></span>
            <span class="st-rep-nums"><span><b>${m.came}</b>日</span><span><b>${Math.round(m.hours)}</b>時間</span><span>提出 <b>${m.subs}</b> ・ OK <b>${m.oks}</b></span></span>
            <span class="ri-end">${rep && rep.status === 'done' ? html`<span class="chip chip-ok">${ic('check')}できた</span>` : rep ? html`<span class="chip chip-warn">${ic('edit')}下書き</span>` : html`<span class="chip">まだ</span>`}${ic('right')}</span>
          </a></li>`)}</ul></div></section>
      </div>`,
      mount: (root) => Charts.mount(root)
    };
  }

  function draftTexts(u, m) {
    const nm = first(u);
    const okList = u.id === S().me ? skillsOf(u).filter((x) => x.includes('（運営の確認でOK）')).map((x) => x.replace('（運営の確認でOK）', '')).slice(0, 2) : [];
    const genres = u.genres.map((g) => K.GENRES[g].name).join('と');
    const st = dayState(u);
    const topics = topicsOf(u).map(([k]) => k).slice(0, 2);
    const a = `${nm}さんは、10月に${m.came}日来所し、合計で約${Math.round(m.hours)}時間 取り組みました（1日の平均 約${m.avg.toFixed(1)}時間）。`
      + `${genres}の課題に取り組み、${m.subs}件を提出、${m.oks}件が運営の確認でOKになりました。`
      + (okList.length ? `とくに課題${okList.map((x) => `『${x}』`).join('と')}を最後まで仕上げられたのは、大きな一歩です。` : '')
      + (topics.length ? `わからない時は、ぴくとに「${topics.join('」「')}」などを自分から聞けています。` : '')
      + (st.mood === 'つかれぎみ' ? '月の後半は つかれが見える日もあり、休けいの声かけをしています。' : '');
    const lvNext = { beginner: '中級', middle: '上級', advanced: '上級の案件' }[u.level] || '中級';
    const b = u.id === S().me
      ? 'ブログ記事の中級（STUDIO版）を仕上げて、上級の「表と流れの図」にチャレンジする。わからない所は、ぴくとや職員に早めに聞く。'
      : `${K.GENRES[u.genres[0]].name}の${lvNext}の課題を1つ出す。${u.goal}。こまった時は、早めに声をかける。`;
    return [a, b];
  }
  function pageReportOne(route) {
    const u = S().mine.find((x) => x.id === route.params.id);
    if (!u) return { title: '月の報告', html: html`<div class="empty card">見つかりませんでした</div>` };
    const m = monthStats(u);
    const rep = (S().reports || {})[u.id] || {};
    const skills = skillsOf(u);
    const words = opsWords(u);
    return {
      title: `${u.name}さんの10月の報告`, topTitle: '月の報告', nav: 'report', back: '#/staff/report', wide: true,
      html: html`<div class="page st-report">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">2026年10月の報告 ・ ${K.FACILITY.name}</span><h1>${u.name}さん</h1><p class="lead">10月1日〜10月26日の記録から作っています。</p></div>
          <div class="ph-actions st-noprint">${rep.status ? html`<span class="chip ${rep.status === 'done' ? 'chip-ok' : 'chip-warn'}">${rep.status === 'done' ? 'できた' : '下書き'}${rep.savedAt ? ` ・ ${fmt.dt(rep.savedAt)}` : ''}</span>` : ''}<button class="btn" type="button" data-act="st-print">${ic('printer')}<span>印刷</span></button></div></div>
        <div class="banner warn st-noprint">${ic('info')}<span class="b-text">この報告は、ふりかえりの材料です。<p>福祉サービスの支援記録は、事業所の様式で残してください。</p></span></div>
        <div class="stats st-stats">
          ${stat('calcheck', '来た日', m.came, `/ ${m.planned}日`, '', '')}
          ${stat('clock', '取り組んだ時間', Math.round(m.hours), '時間', `平均 ${m.avg.toFixed(1)}時間/日`, '')}
          ${stat('send', '提出', m.subs, '件', '', '')}
          ${stat('checkc', '運営OK', m.oks, '件', '', '')}
          ${stat('book', '見た教材', m.watched, '本', '', '')}
          ${stat('live', '授業LIVE', m.live, '回', '参加', '')}
        </div>
        <div class="grid-2 st-rep-grid">
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('calendar')}出席のカレンダー</h2></div>${calendar(u, m.data)}</section>
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chart')}1日ごとの取り組んだ時間</h2></div>
            ${Charts.bars(m.data.map((x) => ({ label: x.label, short: x.short, value: x.value })), { title: `${u.name}さんの 10月の1日ごとの取り組んだ時間（時間）`, unit: '時間', xName: '日にち', yName: '時間', fmt: (v) => String(Math.round(v * 10) / 10), height: 200 })}</section>
        </div>
        <div class="grid-2 st-rep-grid">
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('sprout')}できるようになったこと</h2></div>
            ${skills.length ? html`<ul class="st-skills">${skills.map((x) => html`<li>${ic('checkc')}<span>${x}</span></li>`)}</ul>` : html`<p class="muted small">まだ ありません</p>`}</section>
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chat')}運営からのことば</h2></div>
            ${words.length ? html`<div class="stack">${words.map((w) => html`<blockquote class="st-quote"><p>${w.text.split('\n').filter(Boolean).slice(0, 3).join(' ')}</p><span class="xsmall muted">${fmt.date(w.at)} ・ ${w.who || '運営'}</span></blockquote>`)}</div>` : html`<p class="muted small">今月は まだ ありません</p>`}</section>
        </div>
        <section class="card card-pad sec st-writing">
          <div class="sec-head"><h2>${ic('edit')}職員が書くところ</h2><button class="btn btn-soft st-noprint" type="button" data-act="st-draft" data-id="${u.id}">${ic('sparkles')}<span>下書きを作る（AI）</span></button></div>
          <p class="xsmall muted st-noprint">AIの下書きは、記録から自動で作った文です。かならず読んで、直してから使ってください。</p>
          <div class="field"><label class="label" for="st-r1">本人のようす</label><textarea class="textarea" id="st-r1" style="min-height:150px" placeholder="10月の取り組みのようすを書きます">${rep.text1 || ''}</textarea></div>
          <div class="field"><label class="label" for="st-r2">来月の目標</label><textarea class="textarea" id="st-r2" style="min-height:90px" placeholder="本人と話して決めた目標を書きます">${rep.text2 || ''}</textarea></div>
          <div class="row st-noprint" style="flex-wrap:wrap;justify-content:flex-end"><button class="btn" type="button" data-act="st-rep-save" data-id="${u.id}" data-st="draft">${ic('note')}<span>下書きとして保存</span></button><button class="btn btn-primary" type="button" data-act="st-rep-save" data-id="${u.id}" data-st="done">${ic('check')}<span>できた（保存）</span></button></div>
        </section>
        <p class="xsmall muted st-print-foot">${K.FACILITY.name}（架空） ・ 記入：${STAFF_NAME} ・ エスピクトスクールの記録から作成</p>
      </div>`,
      mount: (root) => Charts.mount(root)
    };
  }
  act('st-draft', (el) => {
    const u = S().mine.find((x) => x.id === el.getAttribute('data-id'));
    const [a, b] = draftTexts(u, monthStats(u));
    const t1 = document.getElementById('st-r1'), t2 = document.getElementById('st-r2');
    if ((t1.value.trim() || t2.value.trim()) && !confirm('書いてある文を、下書きで おきかえますか？')) return;
    el.disabled = true;
    const typeIn = (ta, text, done) => {
      if (Clock.frozen || document.documentElement.dataset.motion === 'reduce') { ta.value = text; done(); return; }
      let i = 0; ta.value = '';
      const tm = setInterval(() => { i += 3; ta.value = text.slice(0, i); if (i >= text.length) { clearInterval(tm); done(); } }, 16);
    };
    typeIn(t1, a, () => typeIn(t2, b, () => { el.disabled = false; UI.toast('下書きを作りました。読んで直してから保存してください', { icon: 'sparkles' }); }));
  });
  act('st-rep-save', (el) => {
    const id = el.getAttribute('data-id');
    const st = el.getAttribute('data-st');
    const t1 = document.getElementById('st-r1').value, t2 = document.getElementById('st-r2').value;
    if (st === 'done' && (!t1.trim() || !t2.trim())) { UI.toast('「本人のようす」と「来月の目標」を書いてください', { icon: 'info' }); return; }
    Store.update((s) => { s.reports = s.reports || {}; s.reports[id] = { status: st, text1: t1, text2: t2, savedAt: nowISO(), by: STAFF_NAME }; });
    UI.toast(st === 'done' ? '報告を保存しました（できた）' : '下書きを保存しました');
  });

  /* ---------- 授業の予定 ---------- */
  const NOTES = [
    { date: '2026-10-30', icon: 'star', title: '金曜日の5時間目は「画像デザイン」', sub: 'ハロウィンのバナーを作る回です（あんどう先生）' },
    { date: '2026-11-02', icon: 'bell', title: '11月の課題が とどきます', sub: '運営からのお知らせ。朝9時ごろに配信されます' },
    { date: '2026-11-03', icon: 'calendar', title: '文化の日（祝日）は 授業LIVEがお休み', sub: 'アーカイブと教材は いつもどおり見られます' },
    { date: '2026-11-06', icon: 'users', title: '事業所向けの説明会（オンライン・30分）', sub: '月の報告の使い方について（架空）' }
  ];
  function pageSchedule(route) {
    const now = Clock.now();
    const wd = jst(now).wd;
    const sel = Number(route.query.day || wd) || 1;
    const days = ['', '月', '火', '水', '木', '金'];
    const ls = window.LearnerKit ? window.LearnerKit.liveState() : { current: null };
    const sts = allStates();
    const likely = (g) => sts.filter((x) => x.u.genres.includes(g) && x.status !== 'absent');
    const cell = (d, p) => {
      const g = (K.TIMETABLE[d] || {})[p.key];
      if (p.rest) return html`<span class="st-tt-rest">お昼休み</span>`;
      if (!g) return '';
      const G = K.GENRES[g];
      const isNow = d === wd && ls.current && ls.current.key === p.key;
      const done = d === wd && now >= Clock.at(p.end);
      return html`<div class="st-tt-cell ${isNow ? 'is-now' : ''} ${done ? 'is-done' : ''}">${gm(g, true)}<span><b>${G.name}</b><span class="xsmall muted">${K.TEACHERS[g]}</span></span>${isNow ? html`<span class="chip chip-live st-mini">いま</span>` : ''}</div>`;
    };
    return {
      title: '授業の予定', nav: 'schedule', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>授業の予定</h1><p class="lead">授業LIVEは 平日10:10から。利用者は、自分のジャンルの授業に参加します。</p></div></div>
        <section class="card st-tt hide-sp" aria-label="1週間の時間割">
          <table class="st-tt-table"><thead><tr><th></th>${[1, 2, 3, 4, 5].map((d) => html`<th class="${d === wd ? 'is-today' : ''}">${days[d]}${d === wd ? html`<span class="chip chip-live st-mini">きょう</span>` : ''}</th>`)}</tr></thead>
            <tbody>${K.PERIODS.map((p) => p.rest ? html`<tr class="is-rest"><th scope="row"><b>${p.name}</b><span class="xsmall muted">${p.start}〜${p.end}</span></th><td colspan="5"><span class="st-tt-rest">${ic('coffee')}お昼休み（授業LIVEは ありません）</span></td></tr>` : html`<tr><th scope="row"><b>${p.name}</b><span class="xsmall muted">${p.start}〜${p.end}</span></th>${[1, 2, 3, 4, 5].map((d) => html`<td class="${d === wd ? 'is-today' : ''}">${cell(d, p)}</td>`)}</tr>`)}</tbody></table>
        </section>
        <section class="sec hide-pc"><div class="seg" role="tablist" aria-label="曜日">${[1, 2, 3, 4, 5].map((d) => html`<a role="tab" href="#/staff/schedule?day=${d}" aria-selected="${d === sel}">${days[d]}${d === wd ? html`<span class="chip chip-live st-mini">きょう</span>` : ''}</a>`)}</div>
          <div class="card"><div class="rows">${K.PERIODS.map((p) => html`<div class="row-item st-tt-row ${p.rest ? 'is-rest' : ''}"><span class="tt-time">${p.start}<small>〜${p.end}</small></span><span class="grow">${p.rest ? html`<span class="muted">お昼休み</span>` : cell(sel, p)}</span><span></span></div>`)}</div></div></section>
        <div class="grid-2">
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('users')}きょう参加しそうな人</h2><span class="small muted">${fmt.date(now)}</span></div>
            <ul class="st-likely">${K.PERIODS.filter((p) => !p.rest && (K.TIMETABLE[wd] || {})[p.key]).map((p) => { const g = K.TIMETABLE[wd][p.key]; const ppl = likely(g); return html`<li>
              <div class="st-lk-head">${gm(g, true)}<span class="grow"><b>${p.name} ${K.GENRES[g].name}</b><span class="xsmall muted">${p.start}〜${p.end} ・ ${K.TEACHERS[g]}</span></span><span class="chip">${ppl.length}人</span></div>
              ${ppl.length ? html`<div class="st-avs">${ppl.map((x) => html`<a class="st-av-chip" href="#/staff/person/${x.u.id}" title="${x.u.name}">${av(x.u, 'sm')}<span>${first(x.u)}</span></a>`)}</div>` : html`<p class="xsmall muted">いません</p>`}
            </li>`; })}</ul></section>
          <section class="card card-pad sec"><div class="sec-head"><h2>${ic('bell')}これからの お知らせ</h2></div>
            <ul class="st-notes">${NOTES.map((n) => html`<li><span class="st-n-date"><b>${Number(n.date.slice(5, 7))}/${Number(n.date.slice(8))}</b><span>${fmt.weekday(n.date + 'T12:00:00+09:00')}</span></span><span class="grow"><b class="row" style="gap:6px">${ic(n.icon)}${n.title}</b><span class="small muted">${n.sub}</span></span></li>`)}</ul>
            <p class="xsmall muted">お知らせの中身は試作のための架空のものです。</p></section>
        </div>
      </div>`
    };
  }

  /* ---------- 見やすさ・設定 ---------- */
  function pageSettings() {
    const st = S().settings.staff;
    const sw = (key, label, sub, iconName) => html`<label class="row-item set-row"><span class="ico-badge sm">${ic(iconName)}</span><span><span class="ri-title">${label}</span><span class="ri-sub">${sub}</span></span><span class="switch"><input type="checkbox" ${st[key] ? 'checked' : ''} data-change="st-set" data-key="${key}" aria-label="${label}"><span class="sw-track"></span></span></label>`;
    return {
      title: '見やすさ・設定', nav: 'settings',
      html: html`<div class="page settings">
        <div class="page-head"><div class="ph-text"><h1>見やすさ・設定</h1><p class="lead">職員の画面の見え方です。利用者の画面とは べつに保存されます。</p></div></div>
        <section class="sec"><div class="sec-head"><h2>${ic('textsize')}文字の大きさ</h2></div>
          <div class="choice-grid fs-choice" style="--cols:3">${[[1, 'ふつう'], [2, '大きい'], [3, 'とても大きい']].map(([v, n]) => html`<button class="choice" type="button" data-act="st-set-fs" data-v="${v}" aria-pressed="${st.fs === v}"><span class="fs-a fs-a${v}">あ</span><span>${n}</span></button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('sun')}画面の色</h2></div>
          <div class="choice-grid" style="--cols:2">${[['light', '明るい', 'sun'], ['dark', 'ダーク（暗い）', 'moon']].map(([v, n, i]) => html`<button class="choice theme-${v}" type="button" data-act="st-set-theme" data-v="${v}" aria-pressed="${st.theme === v}">${ic(i, { size: 28 })}<span>${n}</span></button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('eye')}読みやすさ</h2></div>
          <div class="card rows">${sw('contrast', 'くっきり表示', '文字と線を こく、太くします', 'contrast')}${sw('reduceMotion', '動きを へらす', '画面の動きを 少なくします', 'wave')}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('info')}試作について</h2></div>
          <div class="card rows">
            <button class="row-item" type="button" data-act="reset"><span class="ico-badge sm warn">${ic('refresh')}</span><span><span class="ri-title">データを最初にもどす</span><span class="ri-sub">利用者・職員・運営で押したり出したりしたことが、もとにもどります</span></span><span class="chev">${ic('right')}</span></button>
            <a class="row-item" href="index.html#/"><span class="ico-badge sm">${ic('back')}</span><span><span class="ri-title">入口にもどる</span><span class="ri-sub">利用者・運営の画面も見られます</span></span><span class="chev">${ic('right')}</span></a>
          </div></section>
      </div>`
    };
  }
  act('st-set', (el) => { const k = el.getAttribute('data-key'); Store.update((s) => { s.settings.staff[k] = el.checked; }); });
  act('st-set-fs', (el) => { Store.update((s) => { s.settings.staff.fs = Number(el.getAttribute('data-v')); }); });
  act('st-set-theme', (el) => { Store.update((s) => { s.settings.staff.theme = el.getAttribute('data-v'); }); });

  /* ---------- 時計 ---------- */
  let lastMin = null;
  document.addEventListener('tick', () => {
    if (!App.current || App.current.role !== 'staff') return;
    Core.$$('[data-st-clock]').forEach((el) => { el.textContent = fmt.time(Clock.now()); });
    const m = Clock.minutes();
    if (lastMin != null && m !== lastMin && (App.current.parts[0] || 'today') === 'today') App.refresh();
    lastMin = m;
  });

  App.register('staff', {
    routes: {
      'today': pageToday,
      'people': pagePeople,
      'person/:id': pagePerson,
      'attendance': pageAttendance,
      'report': pageReport,
      'report/:id': pageReportOne,
      'schedule': pageSchedule,
      'settings': pageSettings
    },
    shell,
    home: 'today'
  });
  Store.on(() => { if (App.current && App.current.role === 'staff') App.refresh(); });
  window.StaffKit = { dayState };
})();
