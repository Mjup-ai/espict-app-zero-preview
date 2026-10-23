/* =========================================================
   利用者（受講者）の画面 その1
   きょう（つぎの一歩）・出席・こまった・授業LIVE・教材・きろく
   ========================================================= */
(function () {
  'use strict';
  const { html, raw, ic, esc, fmt, jst, by, sum, clamp } = Core;
  const K = window.CONTENT;
  const C = window.CATALOG;
  const S = () => Store.state;
  const nowISO = () => Clock.now().toISOString();

  /* ---------- 共通の小物 ---------- */
  const L = {};
  window.LearnerKit = L;
  L.me = () => S().mine.find((u) => u.id === S().me);
  L.task = (id) => K.ALL_TASKS.find((t) => t.id === id) || S().extraTasks.find((t) => t.id === id);
  L.ts = (id) => S().tasks[id] || { status: 'todo', checks: [] };
  L.lp = (id) => S().lessons[id] || 0;
  L.unreadCount = () => S().notices.filter((n) => n.unread).length;
  L.firstName = (u) => (u.name.split(' ')[1] || u.name);

  L.STATUS = {
    todo:      { label: 'まだ',        icon: 'target',    cls: 'mute', chip: '' },
    doing:     { label: 'とりくみ中',   icon: 'playc',     cls: 'info', chip: 'chip-info' },
    submitted: { label: '運営が確認中', icon: 'hourglass', cls: 'warn', chip: 'chip-warn' },
    fix:       { label: '直してね',     icon: 'edit',      cls: 'warn', chip: 'chip-warn' },
    ok:        { label: 'できた',       icon: 'checkc',    cls: 'ok',   chip: 'chip-ok' }
  };
  L.statusChip = (st, unread) => {
    if (unread) return html`<span class="chip chip-live">${ic('chat')}返事あり</span>`;
    const s = L.STATUS[st] || L.STATUS.todo;
    return html`<span class="chip ${s.chip}">${ic(s.icon)}${s.label}</span>`;
  };
  L.lvChip = (lv) => lv ? html`<span class="chip ${K.LEVELS[lv].cls}">${K.LEVELS[lv].name}</span>` : '';
  L.gmark = (g, sm) => { const G = K.GENRES[g] || K.GENRES.pc; return html`<span class="gmark ${sm ? 'sm' : ''} ${G.cls}">${ic(G.icon)}</span>`; };
  L.lessonTitle = (id) => { const l = K.lessonById[id]; if (!l) return ''; const s = K.seriesById[l.series]; return `${s.title}${l.label ? l.label : ''}「${l.title}」`; };
  L.thumb = (lessonId, opts) => {
    const o = opts || {};
    const l = K.lessonById[lessonId]; if (!l) return '';
    const s = K.seriesById[l.series];
    const G = K.GENRES[s.genre] || K.GENRES.pc;
    const p = L.lp(lessonId);
    return html`<div class="thumb ${o.sm ? 'sm' : ''} ${G.cls}">
      <span class="th-no">${l.label || ''}</span>${s.app ? html`<span class="th-app">${s.app}</span>` : ''}
      <span class="th-ico">${ic(G.icon)}</span>
      <span class="th-title">${o.noTitle ? '' : l.title}</span>
      <span class="th-play"><span>${ic('play', { cls: 'ico-fill' })}</span></span>
      ${p >= 1 ? html`<span class="th-done">${ic('check')}見た</span>` : (p > 0 ? html`<span class="th-prog"><i style="width:${Math.round(p * 100)}%"></i></span>` : '')}
    </div>`;
  };
  L.seriesCover = (s) => {
    const G = K.GENRES[s.genre] || K.GENRES.pc;
    return html`<div class="thumb cover ${G.cls}"><span class="th-no">${G.short}</span>${s.app ? html`<span class="th-app">${s.app}</span>` : ''}<span class="th-ico">${ic(G.icon)}</span><span class="th-count">${s.episodes.length}本</span></div>`;
  };
  L.taskTitle = (t) => t ? t.title : '';
  L.dueText = (due) => {
    if (!due) return 'しめきり なし';
    const d = fmt.daysLeft(due);
    if (d < 0) return `${fmt.date(due)}まで（すぎています）`;
    if (d === 0) return 'きょうまで';
    return `${fmt.date(due)}まで・あと${d}日`;
  };
  /** STUDIO版のブログ課題は、カタログの締め切りが公開日より前になっているので、利用者には月末を見せる */
  L.due = (t) => {
    if (!t) return null;
    if (t.group === 'blog-2026-10') return '2026-10-31T23:59:00+09:00';
    return t.due;
  };

  /* ---------- 授業LIVE の計算 ---------- */
  L.todayPeriods = () => {
    const wd = jst(Clock.now()).wd;
    const tt = K.TIMETABLE[wd] || {};
    return K.PERIODS.map((p) => Object.assign({}, p, { genre: tt[p.key] || null, startAt: Clock.at(p.start), endAt: Clock.at(p.end) }));
  };
  L.liveState = () => {
    const now = Clock.now();
    const list = L.todayPeriods().filter((p) => p.genre);
    const current = list.find((p) => now >= p.startAt && now < p.endAt) || null;
    const next = list.find((p) => p.startAt > now) || null;
    return { current, next, list };
  };

  /* ---------- 出席（わたし） ---------- */
  L.workedMin = () => {
    const d = S().myDay;
    if (!d.in) return 0;
    const end = d.out ? new Date(d.out) : Clock.now();
    let m = (end - new Date(d.in)) / 60000;
    (d.breaks || []).forEach((b) => { m -= ((b.end ? new Date(b.end) : Clock.now()) - new Date(b.start)) / 60000; });
    return Math.max(0, m);
  };
  function setActivity(a) {
    Store.update((s) => { s.myDay.activity = Object.assign({ at: nowISO() }, a); }, { silent: true });
  }
  L.setActivity = setActivity;

  /* ---------- 骨組み ---------- */
  const NAV = [
    { key: 'home', label: 'きょう', icon: 'sun', go: '#/learner/home' },
    { key: 'live', label: '授業LIVE', short: '授業', icon: 'live', go: '#/learner/live' },
    { key: 'lib', label: '教材', icon: 'book', go: '#/learner/lib' },
    { key: 'tasks', label: '課題', icon: 'task', go: '#/learner/tasks' },
    { key: 'pikuto', label: 'ぴくと', icon: 'chat', go: '#/learner/pikuto' }
  ];
  const NAV2 = [
    { key: 'works', label: '作ったもの', icon: 'star', go: '#/learner/works' },
    { key: 'jobs', label: '案件ボード', icon: 'briefcase', go: '#/learner/jobs' },
    { key: 'record', label: '出席のきろく', icon: 'calcheck', go: '#/learner/record' },
    { key: 'notices', label: 'お知らせ', icon: 'bell', go: '#/learner/notices' },
    { key: 'settings', label: '見やすさ・設定', icon: 'sliders', go: '#/learner/settings' }
  ];
  L.NAV2 = NAV2;

  function attendChip() {
    const d = S().myDay;
    if (d.status === 'in') return html`<button class="att-chip is-in" type="button" data-go="#/learner/record"><span class="dot ok"></span><span>出席中</span><b data-worked>${fmt.durShort(L.workedMin())}</b></button>`;
    if (d.status === 'break') return html`<button class="att-chip is-break" type="button" data-act="break-open"><span class="dot warn"></span><span>休けい中</span></button>`;
    if (d.status === 'out') return html`<button class="att-chip" type="button" data-go="#/learner/record"><span class="dot"></span><span>きょうは おわり</span></button>`;
    return html`<button class="att-chip is-none" type="button" data-act="checkin"><span class="dot bad"></span><span>まだ出席していません</span></button>`;
  }

  function callBanner() {
    const a = S().alerts.concat(S().alertLog || []).filter((x) => x.learner === S().me && x.type === 'call').sort(by('at', 'desc'))[0];
    if (!a) return '';
    if (a.status === 'open') {
      return html`<div class="call-banner" role="status"><span class="cb-ico">${ic('hand')}</span><div class="grow"><b>職員さんを呼んでいます</b><div class="small">${fmt.time(a.at)}に知らせました。そのまま待っていてね。</div></div><button class="btn btn-sm" type="button" data-act="call-cancel" data-id="${a.id}">取り消す</button></div>`;
    }
    if (a.status === 'done' && a.doneAt && (Clock.now() - new Date(a.doneAt)) < 20 * 60000) {
      return html`<div class="call-banner is-done" role="status"><span class="cb-ico">${ic('checkc')}</span><div class="grow"><b>職員さんが気づきました</b><div class="small">${a.doneBy || '職員さん'}が対応しました。</div></div></div>`;
    }
    return '';
  }

  function shell(route, page) {
    const u = L.me();
    const cur = page.nav || route.parts[0] || 'home';
    const n = L.unreadCount();
    const navItem = (it, rail) => html`<a class="nav-item" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}>${ic(it.icon)}<span>${rail && it.short ? it.short : it.label}</span>${it.key === 'notices' && n ? html`<span class="count nav-badge">${n}</span>` : ''}${it.key === 'tasks' && taskBadge() ? html`<span class="count nav-badge">${taskBadge()}</span>` : ''}</a>`;
    const tb = page.back
      ? html`<a class="icon-btn tb-back" href="${page.back}" aria-label="もどる">${ic('back')}</a><span class="tb-title">${page.topTitle || page.title}</span>`
      : html`<span class="hide-pc">${raw(Icons.logoMark(30))}</span><span class="tb-title">${page.topTitle || page.title}</span>`;
    return html`
      <a class="skip-link" href="#main">本文へ</a>
      <div class="app">
        <aside class="side" aria-label="メニュー">
          <div class="side-brand">${raw(Icons.logoMark(38))}<div class="brand-text"><div class="wordmark">エスピクトスクール</div><div class="role-tag">${K.FACILITY.name}</div></div></div>
          <nav class="side-nav">
            ${NAV.map((it) => navItem(it))}
            <div class="nav-group">そのほか</div>
            ${NAV2.map((it) => navItem(it))}
          </nav>
          <div class="side-foot">
            <button class="btn btn-sun btn-block" type="button" data-act="help">${ic('hand')}<span class="hide-rail">こまった？</span></button>
            <a class="side-user hide-rail" href="#/learner/settings"><span class="av sm" style="--av:${u.color}">${u.name[0]}</span><span class="grow"><b>${u.name}</b><span class="xsmall muted">見やすさ・設定</span></span></a>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            ${tb}
            <span class="hide-sp tb-clock"><span class="clock-chip">${ic('calendar')}<span>${fmt.date(Clock.now())}</span><b data-clock>${fmt.time(Clock.now())}</b></span>${attendChip()}</span>
            <span class="tb-spacer"></span>
            <button class="help-pill hide-pc" type="button" data-act="help">${ic('hand')}<span>こまった？</span></button>
            <a class="icon-btn" href="#/learner/notices" aria-label="お知らせ ${n}件">${ic('bell')}${n ? html`<span class="count">${n}</span>` : ''}</a>
            <button class="icon-btn hide-pc" type="button" data-act="menu" aria-label="メニュー">${ic('menu')}</button>
          </header>
          ${callBanner()}
          <main id="main" class="main" tabindex="-1"></main>
        </div>
        ${page.hideTabbar ? '' : html`<nav class="tabbar" aria-label="メインメニュー">${NAV.map((it) => html`<a class="tab" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}><span class="tab-ico">${ic(it.icon)}</span><span>${it.short || it.label}</span>${it.key === 'tasks' && taskBadge() ? html`<span class="count tab-badge">${taskBadge()}</span>` : ''}</a>`)}</nav>`}
      </div>`;
  }
  function taskBadge() { return Object.values(S().tasks).filter((t) => t.unread).length; }

  /* ---------- きょう（ホーム） ---------- */
  function nextStep(opts) {
    const s = S();
    const o = opts || {};
    const entries = Object.entries(s.tasks);
    if (!o.noLive) {
      const ls = L.liveState();
      if (ls.current && L.me().genres.includes(ls.current.genre) && s.myDay.status !== 'out') {
        const p = ls.current, G = K.GENRES[p.genre];
        const after = nextStep({ noLive: true });
        return { kind: 'live', title: `いま「${G.name} 授業LIVE」をやっています`, sub: `${p.start}〜${p.end} ・ ${K.TEACHERS[p.genre]}「${K.LIVE_TOPICS[p.genre]}」`, meta: `${p.end}まで`, action: '授業に入る', go: '#/learner/live/room', icon: 'play', after };
      }
    }
    const fix = entries.find(([, ts]) => ts.status === 'fix' && ts.unread);
    if (fix) {
      const t = L.task(fix[0]);
      return { kind: 'fix', task: t, title: '直してほしい所が とどいています', sub: `課題「${t.title}」`, action: '返事を読む', go: `#/learner/task/${t.id}?tab=chat`, icon: 'chat' };
    }
    const doing = entries.filter(([, ts]) => ts.status === 'doing' || ts.status === 'fix').sort((a, b) => (b[1].startedAt || '').localeCompare(a[1].startedAt || ''))[0];
    if (doing) {
      const t = L.task(doing[0]);
      const ts = doing[1];
      const ins = K.instrFor(t);
      const idx = Math.min(ts.step || 0, ins.steps.length - 1);
      const st = ins.steps[idx];
      const lessons = (st && st[2]) || [];
      const lid = lessons.find((id) => id && L.lp(id) < 1);
      const stepInfo = { idx, total: ins.steps.length, name: st ? st[0] : '' };
      if (lid) {
        const l = K.lessonById[lid];
        const left = l.dur ? Math.max(1, Math.round(l.dur * (1 - L.lp(lid)))) : null;
        const started = L.lp(lid) > 0;
        return { kind: 'watch', task: t, lesson: lid, step: stepInfo, title: `${K.seriesById[l.series].title}${l.label}「${l.title}」を${started ? 'つづきから' : ''}見る`, sub: `「${stepInfo.name}」のための動画です`, taskLine: t.title, meta: left ? `動画 のこり約${left}分` : '動画', action: started ? 'つづきから見る' : '見る', go: `#/learner/watch/${lid}`, icon: 'play' };
      }
      return { kind: 'make', task: t, step: stepInfo, title: `「${stepInfo.name}」をやってみよう`, sub: st ? st[1] : '', taskLine: t.title, meta: '', action: '課題を開く', go: `#/learner/task/${t.id}`, icon: 'edit' };
    }
    const order = [window.TASK_IDS.blogS2, window.TASK_IDS.blogA1, window.TASK_IDS.blogI2, window.TASK_IDS.blogS3];
    const rec = order.map(L.task).find((t) => t && L.ts(t.id).status === 'todo');
    if (rec) return { kind: 'start', task: rec, title: `つぎは「${rec.title}」に チャレンジ`, sub: 'おすすめの課題です', meta: rec.mins ? `目安 ${rec.mins}分くらい` : '', action: '指示書を読む', go: `#/learner/task/${rec.id}`, icon: 'task' };
    return { kind: 'free', title: '教材を見て、すきなことを学ぼう', sub: '', action: '教材を見る', go: '#/learner/lib', icon: 'book' };
  }
  L.nextStep = nextStep;

  function checkinCard() {
    const d = S().myDay;
    if (d.status === 'none') {
      return html`<section class="checkin card" aria-label="出席">
        <div class="ci-ico">${ic('door')}</div>
        <div class="grow"><h2 class="ci-title">来たら、まず「出席する」</h2><p class="ci-sub">押すと、取り組んだ時間が きろくされます</p></div>
        <button class="btn btn-primary btn-lg ci-btn" type="button" data-act="checkin">${ic('login')}<span>出席する</span></button>
      </section>`;
    }
    if (d.status === 'out') {
      return html`<section class="checkin card is-out"><div class="ci-ico ok">${ic('checkc')}</div><div class="grow"><h2 class="ci-title">きょうは おつかれさまでした</h2><p class="ci-sub">取り組んだ時間 ${fmt.dur(L.workedMin())}（${fmt.time(d.in)}〜${fmt.time(d.out)}）</p></div></section>`;
    }
    const onBreak = d.status === 'break';
    // 休けいの おしらせ：つづけて50分たったら、やさしく すすめる
    const lastBreakEnd = (d.breaks || []).filter((b) => b.end).map((b) => b.end).sort().pop();
    const since = (Clock.now() - new Date(lastBreakEnd || d.in)) / 60000;
    const ls = L.liveState();
    const inClass = ls.current && L.me().genres.includes(ls.current.genre); // 授業中は すすめない
    const remind = !onBreak && !inClass && S().settings.learner.breakRemind && since >= 50;
    return html`<section class="checkin card is-in" aria-label="出席中">
      <div class="ci-ico ${onBreak ? 'warn' : 'ok'}">${ic(onBreak ? 'coffee' : 'checkc')}</div>
      <div class="grow">
        <h2 class="ci-title">${onBreak ? '休けい中' : '出席中'}<span class="ci-time">${fmt.time(d.in)}から</span></h2>
        <p class="ci-sub">きょう取り組んだ時間 <b data-worked>${fmt.dur(L.workedMin())}</b>${d.mood ? html` ・ 調子：${d.mood}` : ''}</p>
      </div>
      <div class="ci-actions">
        ${onBreak ? html`<button class="btn btn-primary" type="button" data-act="break-end">${ic('play')}<span>もどる</span></button>` : html`<button class="btn" type="button" data-act="break-start">${ic('coffee')}<span>休けい</span></button>`}
        <button class="btn btn-ghost" type="button" data-act="checkout">${ic('logout')}<span>おわる</span></button>
      </div>
      ${remind ? html`<div class="ci-remind">${ic('coffee')}<span class="grow">つづけて ${fmt.dur(since)} がんばったね。少し休みませんか？</span><button class="btn btn-sm btn-sun" type="button" data-act="break-start">休けいする</button></div>` : ''}
    </section>`;
  }

  function liveCard(big) {
    const ls = L.liveState();
    const now = Clock.now();
    const p = ls.current || ls.next;
    if (!p) {
      return html`<section class="live-card is-done ${big ? 'big' : ''}"><div class="lc-top"><span class="lc-badge">${ic('live')}授業LIVE</span></div><h3 class="lc-title">きょうの授業は おわりました</h3><p class="lc-topic">見のがした授業は、アーカイブで見られます</p><a class="btn btn-white" href="#/learner/live#archive">${ic('film')}<span>アーカイブを見る</span></a></section>`;
    }
    const G = K.GENRES[p.genre];
    const isNow = !!ls.current;
    const minsTo = Math.ceil((p.startAt - now) / 60000);
    const canEnter = isNow || minsTo <= 10;
    const mine = L.me().genres.includes(p.genre);
    return html`<section class="live-card ${isNow ? 'is-now' : 'is-soon'} ${big ? 'big' : ''}" aria-label="授業LIVE">
      <div class="lc-top"><span class="lc-badge">${isNow ? html`<span class="dot pulse" style="background:#fff"></span>いま配信中` : html`${ic('live')}授業LIVE`}</span>${mine ? html`<span class="lc-mine">あなたのジャンル</span>` : ''}</div>
      <div class="lc-body">
        <div class="grow">
          <div class="lc-when">${p.name} ${p.start}〜${p.end}</div>
          <h3 class="lc-title">${G.name} 授業LIVE</h3>
          <p class="lc-topic">${K.LIVE_TOPICS[p.genre]}・${K.TEACHERS[p.genre]}</p>
        </div>
        ${isNow ? '' : html`<div class="lc-count" aria-label="はじまるまで あと${minsTo}分"><b data-until="${p.startAt.toISOString()}">${minsTo}</b><span>分後</span></div>`}
      </div>
      <div class="lc-actions">
        <a class="btn btn-white btn-lg" href="#/learner/live/room" ${canEnter ? '' : raw('aria-disabled="true"')}>${ic(isNow ? 'play' : 'login')}<span>${isNow ? 'いますぐ入る' : (canEnter ? '入る' : `${fmt.time(new Date(p.startAt - 10 * 60000))}から入れます`)}</span></a>
        ${big ? '' : html`<a class="lc-link" href="#/learner/live">時間割</a>`}
      </div>
    </section>`;
  }
  L.liveCard = liveCard;

  function heroCard() {
    const ns = nextStep();
    const say = `つぎの一歩。${ns.title}。${ns.sub || ''}`;
    let progress = '';
    if (ns.step) {
      progress = html`<div class="hero-steps" aria-label="${ns.step.total}このうち ${ns.step.idx + 1}ばんめ">${Array.from({ length: ns.step.total }).map((_, i) => html`<i class="${i < ns.step.idx ? 'done' : i === ns.step.idx ? 'now' : ''}"></i>`)}<span>${ns.step.idx + 1} / ${ns.step.total}</span></div>`;
    }
    const isLive = ns.kind === 'live';
    return html`<section class="hero ${isLive ? 'hero-live' : ''}" aria-labelledby="hero-title">
      <div class="hero-deco" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="hero-head"><span class="hero-kicker">${isLive ? html`<span class="dot pulse" style="background:#fff"></span>` : ic('steps')}つぎの一歩</span>${UI.speakBtn(say, 'よむ')}</div>
      ${ns.taskLine ? html`<p class="hero-task">${ic('task')}<span>課題：${ns.taskLine}</span></p>` : ''}
      <h2 id="hero-title" class="hero-title">${ns.title}</h2>
      ${ns.sub ? html`<p class="hero-sub">${ns.sub}</p>` : ''}
      <div class="hero-meta">${ns.meta ? html`<span>${ic(ns.kind === 'watch' || isLive ? 'clock' : 'info')}${ns.meta}</span>` : ''}${ns.task && ns.task.level ? html`<span class="hero-lv">${K.LEVELS[ns.task.level].name}</span>` : ''}</div>
      ${progress}
      <div class="hero-actions">
        <a class="btn btn-white btn-xl" href="${ns.go}">${ic(ns.icon, { cls: ns.icon === 'play' ? 'ico-fill' : '' })}<span>${ns.action}</span></a>
        ${ns.task && ns.kind !== 'start' && ns.kind !== 'make' ? html`<a class="btn hero-ghost" href="#/learner/task/${ns.task.id}">${ic('task')}<span>課題を開く</span></a>` : ''}
      </div>
      ${isLive && ns.after ? html`<p class="hero-after">${ic('next')}<span>授業のあとは：<b>${ns.after.title}</b></span></p>` : ''}
      <details class="hero-more">
        <summary>${ic('down')}ほかのことをする</summary>
        <div class="hm-list">
          <a href="#/learner/tasks">${ic('task')}<span>ほかの課題をえらぶ</span></a>
          <a href="#/learner/live#archive">${ic('film')}<span>アーカイブ（おわった授業）を見る</span></a>
          <a href="#/learner/pikuto">${ic('chat')}<span>ぴくとと話す</span></a>
        </div>
      </details>
      <div class="hero-pikuto" aria-hidden="true">${raw(Icons.pikuto(92, 'happy'))}</div>
    </section>`;
  }

  function replyCards() {
    const s = S();
    const items = Object.entries(s.tasks).filter(([, ts]) => ts.unread).map(([id, ts]) => ({ id, ts, t: L.task(id) })).filter((x) => x.t);
    if (!items.length) return '';
    return html`<section class="sec" aria-label="とどいた返事">${items.map((x) => {
      const last = (s.chats[x.id] || []).filter((m) => m.from === 'ops').slice(-1)[0];
      return html`<a class="card reply-card ${x.ts.status === 'fix' ? 'is-fix' : ''}" href="#/learner/task/${x.id}?tab=chat">
        <span class="rc-head"><span class="ico-badge sm ${x.ts.status === 'fix' ? 'warn' : 'ok'}">${ic(x.ts.status === 'fix' ? 'edit' : 'chat')}</span><span class="rc-kicker">運営から返事がとどきました</span>${last ? html`<span class="rc-time">${fmt.ago(last.at)}</span>` : ''}</span>
        <span class="rc-title">${x.t.title}</span>
        ${last ? html`<span class="rc-text clamp-2">${last.text.split('\n').slice(0, 2).join(' ')}</span>` : ''}
        <span class="rc-cta">返事を読む${ic('right')}</span>
      </a>`;
    })}</section>`;
  }

  function todayPlan() {
    const now = Clock.now();
    const u = L.me();
    const ps = L.todayPeriods();
    const items = ps.map((p) => {
      const state = now >= p.endAt ? 'is-done' : (now >= p.startAt ? 'is-now' : '');
      const G = p.genre ? K.GENRES[p.genre] : null;
      const mine = G && u.genres.includes(p.genre);
      return html`<li class="tl-item ${state}"><span class="tl-time">${p.start}</span><span class="tl-mark"><i></i></span><span class="tl-body">
        <span class="tl-title">${p.rest ? 'お昼休み' : html`${G.name} 授業LIVE`}${mine ? html` <span class="chip chip-info" style="vertical-align:2px">あなたのジャンル</span>` : ''}</span>
        <span class="tl-sub">${p.rest ? 'ゆっくり休もう' : html`${p.name} ・ ${K.TEACHERS[p.genre]}`}</span></span></li>`;
    });
    return html`<section class="card card-pad sec" aria-labelledby="plan-h">
      <div class="sec-head"><h2 id="plan-h">${ic('calendar')}きょうの予定</h2><a class="sec-more" href="#/learner/live">時間割${ic('right')}</a></div>
      <ol class="tl">${items}<li class="tl-item ${Clock.minutes() >= 950 ? 'is-done' : ''}"><span class="tl-time">15:50</span><span class="tl-mark"><i></i></span><span class="tl-body"><span class="tl-title">ふりかえり・おわり</span><span class="tl-sub">「おわる」を押して帰ろう</span></span></li></ol>
    </section>`;
  }

  function monthCard() {
    const att = S().attendance[S().me] || {};
    const days = Object.values(att).filter((x) => !x.absent);
    const mins = sum(days, (x) => x.work) + L.workedMin();
    const todayIn = S().myDay.in ? 1 : 0;
    const okCount = Object.values(S().tasks).filter((t) => t.status === 'ok' && (t.okAt || '').startsWith('2026-10')).length;
    const watched = Object.values(S().lessons).filter((v) => v >= 1).length;
    return html`<section class="card card-pad sec" aria-labelledby="month-h">
      <div class="sec-head"><h2 id="month-h">${ic('sprout')}10月にやったこと</h2><a class="sec-more" href="#/learner/record">きろく${ic('right')}</a></div>
      <div class="mini-stats">
        <div><b>${days.length + todayIn}</b><span>日 来た</span></div>
        <div><b>${Math.floor(mins / 60)}</b><span>時間 取り組んだ</span></div>
        <div><b>${okCount}</b><span>こ できた</span></div>
        <div><b>${watched}</b><span>本 見た</span></div>
      </div>
      <p class="small muted">くらべなくて大丈夫。きのうの自分より、ひとつ進めばOK。</p>
    </section>`;
  }

  function quickLinks() {
    return html`<nav class="quick" aria-label="そのほか">${NAV2.filter((x) => x.key !== 'notices').map((it) => html`<a class="quick-item" href="${it.go}"><span class="ico-badge">${ic(it.icon)}</span><span>${it.label}</span></a>`)}</nav>`;
  }

  function greeting() {
    const h = jst(Clock.now()).h;
    const u = L.me();
    const g = h < 11 ? 'おはようございます' : h < 17 ? 'こんにちは' : 'おつかれさまです';
    return html`<div class="greet"><div class="greet-date">${fmt.date(Clock.now())} <span data-clock>${fmt.time(Clock.now())}</span></div><h1 class="greet-title">${g}、${L.firstName(u)}さん</h1></div>`;
  }

  function pageHome() {
    const ls = L.liveState();
    const now = Clock.now();
    const heroIsLive = nextStep().kind === 'live';
    const liveSoon = !heroIsLive && (ls.current || (ls.next && (ls.next.startAt - now) < 75 * 60000));
    return {
      title: 'きょう', nav: 'home',
      html: html`<div class="page home">
        ${greeting()}
        <div class="home-grid">
          <div class="home-main stack-lg">
            ${checkinCard()}
            ${liveSoon ? html`<div class="hide-wide-live">${liveCard()}</div>` : ''}
            ${heroCard()}
            ${replyCards()}
            ${todayPlan()}
          </div>
          <aside class="home-side stack-lg">
            ${heroIsLive ? '' : html`<div class="only-wide-live">${liveCard()}</div>`}
            ${pikutoMini()}
            ${monthCard()}
            ${quickLinks()}
          </aside>
        </div>
      </div>`,
      mount: () => setActivity({ type: 'home' })
    };
  }

  function pikutoMini() {
    return html`<section class="card pk-mini">
      <div class="pk-mini-head">${raw(Icons.pikuto(52, 'normal'))}<div><b>ぴくと</b><div class="small muted">24時間、いつでも聞けるAI</div></div></div>
      <div class="suggests pk-mini-sug">
        <button class="suggest" type="button" data-act="pk-quick" data-q="つぎに何をすればいい？">つぎに何をすればいい？</button>
        <button class="suggest" type="button" data-act="pk-quick" data-q="指示書をかんたんに言って">指示書をかんたんに</button>
        <button class="suggest" type="button" data-act="pk-quick" data-q="やることを小さく分けて">やることを小さく</button>
      </div>
      <a class="btn btn-soft btn-block" href="#/learner/pikuto">${ic('chat')}<span>ぴくとに聞く</span></a>
    </section>`;
  }

  /* ---------- 出席・休けい・おわり ---------- */
  act('checkin', () => {
    UI.sheet({
      title: 'きょうの調子は？', icon: ic('smile'),
      body: html`<p class="ink2">職員さんだけが見ます。答えなくても大丈夫です。</p>
        <div class="choice-grid" style="--cols:3">
          ${[['げんき', 'smile', 'ok'], ['ふつう', 'meh', 'info'], ['つかれぎみ', 'tired', 'warn']].map(([n, i, c]) => html`<button class="choice mood-${c}" type="button" data-mood="${n}"><span class="mood-ico">${ic(i)}</span><span>${n}</span></button>`)}
        </div>`,
      foot: html`<button class="btn btn-lg btn-ghost" type="button" data-mood="">答えないで出席する</button>`,
      mount: (el, close) => {
        el.querySelectorAll('[data-mood]').forEach((b) => b.addEventListener('click', () => {
          const mood = b.getAttribute('data-mood') || null;
          Store.update((s) => { s.myDay = { status: 'in', in: nowISO(), mood, breaks: [], out: null, activity: { type: 'home', at: nowISO() } }; });
          close();
          UI.toast(`出席しました（${fmt.time(Clock.now())}）。きょうも来てくれて ありがとう！`);
        }));
      }
    });
  });
  act('break-start', () => {
    if (S().myDay.status === 'none') { UI.toast('先に「出席する」を押してね', { icon: 'info' }); return; }
    Store.update((s) => { s.myDay.status = 'break'; s.myDay.breaks.push({ start: nowISO() }); });
    openBreak();
  });
  act('break-open', () => openBreak());
  act('break-end', () => {
    Store.update((s) => { const b = s.myDay.breaks[s.myDay.breaks.length - 1]; if (b && !b.end) b.end = nowISO(); s.myDay.status = 'in'; });
    UI.toast('おかえりなさい。つづきを やってみよう');
  });
  function openBreak() {
    const b = S().myDay.breaks[S().myDay.breaks.length - 1];
    UI.sheet({
      title: '休けい中', icon: ic('coffee'), iconCls: 'sun',
      body: html`<div class="break-box"><div class="break-time"><b data-since="${b ? b.start : nowISO()}">0分</b><span>休けいしています</span></div>
        <ul class="break-tips"><li>${ic('coffee')}水やお茶を のもう</li><li>${ic('eye')}遠くを見て、目を休めよう</li><li>${ic('wave')}かたや手を、ゆっくり のばそう</li></ul>
        <p class="small muted center">休けいの時間は、取り組んだ時間に入りません</p></div>`,
      foot: html`<button class="btn btn-primary btn-xl" type="button" data-act="break-end" data-close>${ic('play')}<span>休けいをおわって もどる</span></button>`
    });
  }
  act('checkout', () => {
    const d = S().myDay;
    const done = [];
    if (d.activity && d.activity.type) done.push('教材や課題に取り組んだ');
    UI.sheet({
      title: 'きょうは おわりにしますか？', icon: ic('logout'),
      body: html`<div class="out-sum"><div><span class="muted small">出席</span><b>${fmt.time(d.in)}〜${fmt.time(Clock.now())}</b></div><div><span class="muted small">取り組んだ時間</span><b>${fmt.dur(L.workedMin())}</b></div></div>
        <div class="field"><span class="label">きょうは どうだった？<span class="opt">（えらばなくてもOK）</span></span>
        <div class="cluster">${['たのしかった', 'できた！', 'むずかしかった', 'つかれた', 'ふつう'].map((x) => html`<button class="fchip" type="button" aria-pressed="false" data-act="toggle-press">${x}</button>`)}</div></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>まだつづける</button><button class="btn btn-primary btn-lg" type="button" data-yes>${ic('logout')}<span>おわる</span></button>`,
      mount: (el, close) => el.querySelector('[data-yes]').addEventListener('click', () => {
        const picked = Array.from(el.querySelectorAll('.fchip[aria-pressed="true"]')).map((x) => x.textContent);
        Store.update((s) => { s.myDay.status = 'out'; s.myDay.out = nowISO(); s.myDay.feel = picked; });
        close();
        UI.toast('おつかれさまでした！気をつけて帰ってね');
      })
    });
  });
  act('toggle-press', (el) => el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));

  /* ---------- こまった？ ---------- */
  act('help', () => {
    UI.sheet({
      title: 'こまった？', icon: ic('hand'), iconCls: 'sun',
      body: html`<div class="help-list">
        <a class="help-item" href="#/learner/pikuto" data-close>${raw(Icons.pikuto(52, 'happy'))}<span class="grow"><b>ぴくとに聞く</b><span>やり方や、わからないことを聞く</span></span>${ic('right')}</a>
        <button class="help-item" type="button" data-act="call-staff">${html`<span class="ico-badge lg sun">${ic('hand')}</span>`}<span class="grow"><b>職員さんを呼ぶ</b><span>そばに来てほしい時。押すと知らせが行きます</span></span>${ic('right')}</button>
        <button class="help-item" type="button" data-act="break-start" data-close>${html`<span class="ico-badge lg">${ic('coffee')}</span>`}<span class="grow"><b>ひと休みする</b><span>つかれた時は、休んでも大丈夫</span></span>${ic('right')}</button>
      </div>
      <p class="banner"><span>${ic('heart')}</span><span class="b-text">体や気持ちが つらい時は、がまんしないで、すぐに職員さんを呼んでね。</span></p>`
    });
  });
  act('call-staff', (el) => {
    const open = S().alerts.find((a) => a.learner === S().me && a.type === 'call' && a.status === 'open');
    const wrap = el.closest('.sheet-wrap'); if (wrap) wrap.querySelector('[data-close]').click();
    if (open) { UI.toast('もう知らせてあります。少し待っていてね', { icon: 'info' }); return; }
    setTimeout(() => UI.sheet({
      title: '職員さんを呼びますか？', icon: ic('hand'), iconCls: 'sun',
      body: html`<p class="ink2">職員さんの画面の いちばん上に、知らせが出ます。</p>
        <div class="field"><span class="label">どんなこと？<span class="opt">（えらばなくてもOK）</span></span>
        <div class="cluster">${['やり方がわからない', 'パソコンが動かない', '体のこと', '気持ちのこと', 'そのほか'].map((x) => html`<button class="fchip" type="button" aria-pressed="false" data-act="toggle-press">${x}</button>`)}</div></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-sun btn-lg" type="button" data-yes>${ic('hand')}<span>呼ぶ</span></button>`,
      mount: (sh, close) => sh.querySelector('[data-yes]').addEventListener('click', () => {
        const why = Array.from(sh.querySelectorAll('.fchip[aria-pressed="true"]')).map((x) => x.textContent);
        Store.update((s) => {
          s.alerts.unshift({ id: Core.uid('al'), type: 'call', learner: s.me, at: nowISO(), status: 'open', title: '「職員さんを呼ぶ」が押されました', quote: why.length ? why.join('・') : '', hint: s.myDay.status === 'none' ? 'まだ出席を押していません' : '席で待っています' });
        });
        close();
        UI.toast('職員さんに知らせました。そのまま待っていてね', { icon: 'hand' });
      })
    }), 230);
  });
  act('call-cancel', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { s.alerts = s.alerts.filter((a) => a.id !== id); });
    UI.toast('取り消しました');
  });

  act('menu', () => {
    const u = L.me();
    UI.sheet({
      title: 'メニュー',
      body: html`<a class="side-user" href="#/learner/settings" data-close style="padding:4px 0 8px"><span class="av" style="--av:${u.color}">${u.name[0]}</span><span class="grow"><b>${u.name}</b><span class="small muted">${K.FACILITY.name}</span></span></a>
        <div class="menu-grid">${NAV2.map((it) => html`<a class="menu-item" href="${it.go}" data-close><span class="ico-badge">${ic(it.icon)}</span><span>${it.label}</span>${it.key === 'notices' && L.unreadCount() ? html`<span class="count">${L.unreadCount()}</span>` : ''}</a>`)}</div>
        <a class="btn btn-ghost btn-block" href="index.html#/" data-close>${ic('back')}<span>入口にもどる（試作）</span></a>`
    });
  });

  /* ---------- 授業LIVE ---------- */
  function pageLive(route) {
    const ls = L.liveState();
    const wd = jst(Clock.now()).wd;
    const sel = Number(route.query.day || wd);
    const arcGenre = route.query.g || 'all';
    const arcs = C.archives.filter((a) => arcGenre === 'all' || a.genre === arcGenre);
    const shown = arcs.slice(0, route.query.more ? 60 : 16);
    const byDate = Core.groupBy(shown, (a) => a.date);
    const watchedArc = S().arcWatched || {};
    const dayNames = ['', '月', '火', '水', '木', '金'];
    return {
      title: '授業LIVE', nav: 'live',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>授業LIVE</h1><p class="lead">平日 10:10から。見のがした授業は、アーカイブで見られます。</p></div></div>
        ${liveCard(true)}
        <section class="sec" aria-labelledby="tt-h">
          <div class="sec-head"><h2 id="tt-h">${ic('calendar')}時間割</h2></div>
          <div class="seg" role="tablist" aria-label="曜日">${[1, 2, 3, 4, 5].map((d) => html`<a role="tab" href="#/learner/live?day=${d}" aria-selected="${d === sel}">${dayNames[d]}${d === wd ? html`<span class="chip chip-live" style="min-height:20px;padding:0 6px;font-size:.7rem">きょう</span>` : ''}</a>`)}</div>
          <div class="card">
            <div class="rows">${K.PERIODS.map((p) => {
              const g = (K.TIMETABLE[sel] || {})[p.key];
              if (p.rest) return html`<div class="row-item tt-row is-rest"><span class="tt-time">${p.start}<small>〜${p.end}</small></span><span class="grow muted">お昼休み</span><span></span></div>`;
              const G = K.GENRES[g];
              const isNow = sel === wd && ls.current && ls.current.key === p.key;
              const done = sel === wd && Clock.now() >= Clock.at(p.end);
              return html`<div class="row-item tt-row ${isNow ? 'is-now' : ''} ${done ? 'is-done' : ''}"><span class="tt-time">${p.start}<small>〜${p.end}</small></span>
                <span class="tt-main">${L.gmark(g, true)}<span class="tt-text"><span class="ri-title">${G.name} 授業LIVE</span><span class="ri-sub">${p.name} ・ ${K.TEACHERS[g]}</span>${sel === wd ? html`<span class="tt-topic">${K.LIVE_TOPICS[g]}</span>` : ''}${L.me().genres.includes(g) && !done ? html`<span class="chip chip-info tt-mine">あなたのジャンル</span>` : ''}</span></span>
                <span class="ri-end">${isNow ? html`<a class="btn btn-live btn-sm" href="#/learner/live/room">${ic('play')}入る</a>` : done ? html`<span class="chip">おわり</span>` : ''}</span></div>`;
            })}</div>
          </div>
        </section>
        <section class="sec" id="archive" aria-labelledby="arc-h">
          <div class="sec-head"><h2 id="arc-h">${ic('film')}アーカイブ（おわった授業）</h2><span class="small muted">${arcs.length}本</span></div>
          <div class="filters" role="group" aria-label="ジャンル">${[['all', 'ぜんぶ'], ['web', 'Web制作'], ['design', '画像デザイン'], ['video', '動画編集'], ['sns', 'SNS運用']].map(([k, n]) => html`<a class="fchip" href="#/learner/live?g=${k}#archive" aria-pressed="${arcGenre === k}">${n}</a>`)}</div>
          ${Array.from(byDate.entries()).map(([date, list]) => html`<div class="arc-day"><h3 class="arc-date">${fmt.date(date + 'T12:00:00+09:00')}</h3>
            <div class="arc-list">${list.map((a) => html`<a class="arc-item" href="#/learner/archive/${a.id}">
              <span class="thumb sm ${K.GENRES[a.genre].cls}"><span class="th-no" style="font-size:1.05rem">${a.period}</span><span class="th-ico">${ic(K.GENRES[a.genre].icon)}</span>${watchedArc[a.id] ? html`<span class="th-done">${ic('check')}見た</span>` : ''}</span>
              <span class="arc-t"><b>${a.title}</b><span class="small muted">${a.period} ・ ${a.dur}分</span></span></a>`)}</div></div>`)}
          ${route.query.more || arcs.length <= 16 ? '' : html`<a class="btn btn-block" href="#/learner/live?g=${arcGenre}&more=1#archive">${ic('down')}<span>もっと見る</span></a>`}
        </section>
      </div>`,
      mount: () => { if (location.hash.endsWith('#archive')) setTimeout(() => { const a = document.getElementById('archive'); if (a) a.scrollIntoView(); }, 30); }
    };
  }

  function pageLiveRoom() {
    const ls = L.liveState();
    const p = ls.current || ls.next;
    const isNow = !!ls.current;
    const G = p ? K.GENRES[p.genre] : K.GENRES.web;
    const qs = S().liveQs || [];
    return {
      title: '授業LIVE', topTitle: p ? `${G.name} 授業LIVE` : '授業LIVE', nav: 'live', back: '#/learner/live', hideTabbar: true,
      html: html`<div class="page live-room">
        <div class="lr-stage ${isNow ? 'is-now' : 'is-wait'}">
          ${isNow ? html`
            <div class="lr-video">
              <div class="lr-screen">${raw(Art.preview('blog', { hue: 200, title: '目次を入れてみよう' }))}<div class="lr-cursor" aria-hidden="true"></div></div>
              <div class="lr-teacher" aria-hidden="true"><span class="av" style="--av:#0094c8">な</span></div>
              <span class="lr-badge"><span class="dot pulse" style="background:#fff"></span>LIVE</span>
              <span class="lr-viewers">${ic('users')}38人が見ています</span>
              <div class="lr-caption" data-caption>それでは、見出しに「ID」の名前をつけていきます</div>
            </div>` : html`
            <div class="lr-video lr-waiting">
              ${raw(Icons.pikuto(110, 'happy'))}
              <div class="lr-wait-text"><b>まもなく はじまります</b><span>${p ? html`${p.start}から ・ あと <b data-until="${p.startAt.toISOString()}">${Math.ceil((p.startAt - Clock.now()) / 60000)}</b> 分` : 'きょうの授業はおわりました'}</span></div>
              <button class="btn btn-white" type="button" data-act="sound-test">${ic('volume')}<span>音が聞こえるか ためす</span></button>
            </div>`}
        </div>
        <div class="lr-info"><h1 class="lr-title">${G.name} 授業LIVE</h1><p class="muted">${p ? html`${p.name} ${p.start}〜${p.end} ・ ${K.TEACHERS[p.genre]} ・ ${K.LIVE_TOPICS[p.genre]}` : ''}</p></div>
        <div class="lr-react" role="group" aria-label="先生に気持ちを伝える">
          <button class="react" type="button" data-act="react" data-r="わかった">${ic('thumb')}<span>わかった</span></button>
          <button class="react" type="button" data-act="react" data-r="もう一回">${ic('refresh')}<span>もう一回</span></button>
          <button class="react" type="button" data-act="react" data-r="手をあげる">${ic('hand')}<span>手をあげる</span></button>
        </div>
        <form class="card card-pad stack" data-submit="live-q">
          <label class="label" for="liveq">${ic('ask')}先生に質問する</label>
          <div class="row"><input class="input grow" id="liveq" name="q" placeholder="例：IDの名前は、なんでもいいですか？" autocomplete="off"><button class="btn btn-primary" type="submit">${ic('send')}<span class="hide-sp">送る</span></button></div>
          <p class="hint">質問は先生の画面に出ます。名前は出ません。</p>
          ${qs.length ? html`<ul class="lq-list">${qs.map((q) => html`<li>${ic('ask')}<span class="grow">${q.text}</span><span class="chip">${q.state}</span></li>`)}</ul>` : ''}
        </form>
        <a class="btn btn-block btn-ghost" href="#/learner/live">${ic('logout')}<span>授業から出る</span></a>
      </div>`,
      mount: () => {
        setActivity({ type: 'live', ref: p ? p.genre : '' });
        const lines = ['それでは、見出しに「ID」の名前をつけていきます', '右のパネルの、いちばん下を見てください', 'ここに「midashi1」と入れます', '目次の文字をえらんで、リンクを押します', 'できた人は「わかった」を押してください'];
        let i = 0;
        const el = document.querySelector('[data-caption]');
        if (el && !Clock.frozen) { const tm = setInterval(() => { if (!document.body.contains(el)) { clearInterval(tm); return; } i = (i + 1) % lines.length; el.textContent = lines[i]; }, 3500); }
      }
    };
  }
  act('react', (el) => {
    el.classList.add('is-sent');
    setTimeout(() => el.classList.remove('is-sent'), 900);
    UI.toast(`「${el.getAttribute('data-r')}」を先生に伝えました`, { icon: 'thumb' });
  });
  act('live-q', (form) => {
    const v = form.q.value.trim(); if (!v) return;
    Store.update((s) => { s.liveQs = (s.liveQs || []).concat([{ text: v, state: '先生に とどきました' }]); });
    UI.toast('質問を送りました。先生が順番に読みます');
  });
  act('sound-test', (el) => UI.speak('音は聞こえますか。聞こえたら、準備はばっちりです。', el));

  /* ---------- 教材ライブラリ ---------- */
  const LIB_GENRES = [['all', 'ぜんぶ'], ['pc', 'パソコン'], ['web', 'Web制作'], ['ai', 'AI'], ['design', '画像デザイン'], ['video', '動画編集'], ['sns', 'SNS運用']];
  function seriesProgress(s) {
    const n = s.episodes.length;
    const done = s.episodes.filter((e) => L.lp(e.id) >= 1).length;
    return { n, done, pct: n ? done / n : 0 };
  }
  function continueList() {
    const out = [];
    C.series.forEach((s) => {
      const started = s.episodes.some((e) => L.lp(e.id) > 0);
      if (!started) return;
      const e = s.episodes.find((x) => L.lp(x.id) < 1);
      if (e) out.push(e.id);
    });
    return out.sort((a, b) => L.lp(b) - L.lp(a));
  }
  function pageLib(route) {
    const g = route.query.g || 'all';
    const q = (route.query.q || '').trim();
    const series = C.series.filter((s) => g === 'all' || s.genre === g);
    const cont = continueList();
    let hits = [];
    if (q) C.series.forEach((s) => s.episodes.forEach((e) => { if ((s.title + e.title).includes(q)) hits.push(e.id); }));
    const ns = nextStep();
    const rec = ns.task ? (K.instrFor(ns.task).steps || []).flatMap((st) => st[2] || []).filter(Boolean) : [];
    const recU = Array.from(new Set(rec)).slice(0, 8);
    return {
      title: '教材', nav: 'lib',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>教材ライブラリ</h1><p class="lead">動画を見ながら、いっしょに手を動かそう。どこまで見たかは、自動でのこります。</p></div></div>
        <form class="input-icon" data-submit="lib-search" role="search">${ic('search')}<input class="input" name="q" value="${q}" placeholder="教材をさがす（例：目次、テロップ）" aria-label="教材をさがす"></form>
        ${q ? html`<section class="sec"><div class="sec-head"><h2>「${q}」の教材 ${hits.length}本</h2><a class="sec-more" href="#/learner/lib">けす${ic('x')}</a></div>
          ${hits.length ? html`<div class="grid-auto">${hits.slice(0, 24).map((id) => lessonCard(id))}</div>` : html`<div class="empty card">${raw(Icons.pikuto(72, 'think'))}<span class="em-title">見つかりませんでした</span><span>ちがう言葉で さがしてみてね</span></div>`}</section>` : ''}
        ${!q && cont.length ? html`<section class="sec"><div class="sec-head"><h2>${ic('playc')}つづきから見る</h2></div><div class="hscroll">${cont.map((id) => lessonCard(id, true))}</div></section>` : ''}
        ${!q && recU.length ? html`<section class="sec"><div class="sec-head"><h2>${ic('target')}いまの課題で使う教材</h2></div><p class="small muted" style="margin-top:-6px">課題「${ns.task.title}」</p><div class="hscroll">${recU.map((id) => lessonCard(id, true))}</div></section>` : ''}
        ${q ? '' : html`<section class="sec"><div class="sec-head"><h2>${ic('layers')}シリーズ</h2></div>
          <div class="filters" role="group" aria-label="ジャンル">${LIB_GENRES.map(([k, n]) => html`<a class="fchip" href="#/learner/lib?g=${k}" aria-pressed="${g === k}">${n}</a>`)}</div>
          <div class="grid-auto">${series.map((s) => { const p = seriesProgress(s); return html`<a class="card series-card" href="#/learner/series/${s.id}">${L.seriesCover(s)}<div class="sc-body"><div class="sc-title">${s.title}</div><div class="small muted">${s.sub}</div><div class="sc-prog"><div class="bar thin ${p.pct >= 1 ? 'ok' : ''}"><i style="width:${Math.round(p.pct * 100)}%"></i></div><span class="xsmall bold">${p.done}/${p.n}本</span></div></div></a>`; })}</div></section>`}
      </div>`,
      mount: () => setActivity({ type: 'lib' })
    };
  }
  function lessonCard(id, compact) {
    const l = K.lessonById[id]; if (!l) return '';
    const s = K.seriesById[l.series];
    return html`<a class="lesson-card" href="#/learner/watch/${id}">${L.thumb(id, { noTitle: true })}<span class="lc2-t"><span class="xsmall muted bold">${s.title}${l.label ? ' ' + l.label : ''}</span><b class="clamp-2">${l.title}</b>${l.dur ? html`<span class="xsmall muted">${ic('clock')} ${l.dur}分</span>` : ''}</span></a>`;
  }
  act('lib-search', (form) => App.go('#/learner/lib' + (form.q.value.trim() ? '?q=' + encodeURIComponent(form.q.value.trim()) : '')));

  function pageSeries(route) {
    const s = K.seriesById[route.params.id];
    if (!s) return { title: '教材', html: html`<p>見つかりません</p>` };
    const p = seriesProgress(s);
    const next = s.episodes.find((e) => L.lp(e.id) < 1) || s.episodes[0];
    const G = K.GENRES[s.genre];
    return {
      title: s.title, nav: 'lib', back: '#/learner/lib',
      html: html`<div class="page">
        <section class="series-head card ${G.cls}">
          <div class="sh-cover">${L.seriesCover(s)}</div>
          <div class="sh-text"><span class="eyebrow">${G.name}${s.app ? ' ・ ' + s.app : ''}</span><h1>${s.title}</h1><p class="ink2">${s.sub}</p>
            <div class="sc-prog"><div class="bar ${p.pct >= 1 ? 'ok' : ''}"><i style="width:${Math.round(p.pct * 100)}%"></i></div><span class="small bold">${p.done}/${p.n}本 見た</span></div>
            <a class="btn btn-primary btn-lg" href="#/learner/watch/${next.id}">${ic('play', { cls: 'ico-fill' })}<span>${p.done ? 'つづきから見る' : 'はじめから見る'}</span></a></div>
        </section>
        <section class="card"><ol class="rows ep-list">${s.episodes.map((e) => { const v = L.lp(e.id); return html`<li><a class="row-item ep ${e.id === next.id ? 'is-next' : ''}" href="#/learner/watch/${e.id}">
          <span class="ep-no ${v >= 1 ? 'done' : ''}">${v >= 1 ? ic('check') : (e.label || '・')}</span>
          <span><span class="ri-title">${e.title}</span><span class="ri-sub">${e.dur ? `${e.dur}分` : ''}${v > 0 && v < 1 ? ` ・ ${Math.round(v * 100)}%まで見た` : ''}${e.id === next.id ? ' ・ つぎはこれ' : ''}</span></span>
          <span class="ri-end">${ic('playc')}</span></a></li>`; })}</ol></section>
      </div>`
    };
  }

  /* ---------- 動画を見る（試作：再生は早送りで進む） ---------- */
  const DOS = {
    default: ['動画を止めながら、同じように手を動かそう', 'わからない所は、10秒もどして もう一度', 'こまったら、ぴくとに聞いてね'],
    blog5: ['写真を入れる「ボックス」を作る', '写真の下に、説明の文を1〜2行入れる', 'スマホの大きさでも、写真がはみ出さないか見る']
  };
  function pageWatch(route) {
    const id = route.params.id;
    const l = K.lessonById[id];
    if (!l) return { title: '教材', html: html`<p>見つかりません</p>` };
    const s = K.seriesById[l.series];
    const idx = s.episodes.findIndex((e) => e.id === id);
    const next = s.episodes[idx + 1];
    const prev = s.episodes[idx - 1];
    const p = L.lp(id);
    const dos = id === K.L('blog', '⑤') ? DOS.blog5 : DOS.default;
    const dur = l.dur || 12;
    const G = K.GENRES[s.genre];
    const usedIn = K.ALL_TASKS.filter((t) => { const ins = (t.group === 'blog-2026-10') ? K.instrFor(t) : null; return ins && ins.steps.some((st) => (st[2] || []).includes(id)); }).slice(0, 3);
    return {
      title: l.title, topTitle: s.title, nav: 'lib', back: `#/learner/series/${s.id}`,
      html: html`<div class="page watch">
        <div class="watch-grid">
          <div class="stack-lg">
            <div class="player ${G.cls}" data-player data-id="${id}" data-dur="${dur}">
              <div class="pl-screen">
                <div class="pl-poster">${L.thumb(id)}</div>
                <div class="pl-playing" aria-hidden="true">${raw(Art.preview('blog', { hue: 200, title: l.title }))}</div>
                <button class="pl-big" type="button" data-pl="toggle" aria-label="再生">${ic('play', { cls: 'ico-fill' })}</button>
                <div class="pl-cc" data-cc>字幕：${dos[0]}</div>
              </div>
              <div class="pl-bar"><div class="pl-track"><i data-fill style="width:${Math.round(p * 100)}%"></i></div></div>
              <div class="pl-ctrl">
                <button class="pl-btn" type="button" data-pl="toggle" aria-label="再生・止める">${ic('play', { cls: 'ico-fill' })}</button>
                <button class="pl-btn" type="button" data-pl="back10" aria-label="10秒もどる">${ic('rewind')}<span class="xsmall">10</span></button>
                <span class="pl-time num" data-time>${fmt.durShort(Math.round(p * dur))} / ${dur}分</span>
                <span class="grow"></span>
                <button class="pl-btn pl-speed" type="button" data-pl="speed" aria-label="速さ">1.0倍</button>
                <button class="pl-btn" type="button" data-pl="cc" aria-pressed="true" aria-label="字幕">${ic('cc')}</button>
                <button class="pl-btn" type="button" data-act="noop" aria-label="大きくする">${ic('expand')}</button>
              </div>
            </div>
            <div class="watch-title"><span class="eyebrow">${s.title}${l.label ? ' ' + l.label : ''}</span><h1>${l.title}</h1>
              <div class="cluster mt-2">${l.dur ? html`<span class="chip">${ic('clock')}${l.dur}分</span>` : ''}${s.app ? html`<span class="chip">${s.app}</span>` : ''}<span class="chip ${p >= 1 ? 'chip-ok' : ''}" data-state>${p >= 1 ? html`${ic('check')}見おわった` : (p > 0 ? `${Math.round(p * 100)}%まで見た` : 'まだ見ていない')}</span></div></div>
            <section class="card card-pad sec" data-say-root>
              <div class="sec-head"><h2>${ic('bulb')}この動画で やること</h2>${UI.speakBtn(dos.join('。'), 'よむ')}</div>
              <ol class="do-list">${dos.map((d) => html`<li>${d}</li>`)}</ol>
            </section>
            <div class="watch-actions">
              <button class="btn btn-ok btn-lg" type="button" data-act="lesson-done" data-id="${id}">${ic('check')}<span>見おわった</span></button>
              <a class="btn btn-lg" href="#/learner/pikuto?about=${id}">${ic('chat')}<span>ぴくとに聞く</span></a>
            </div>
          </div>
          <aside class="stack-lg">
            ${next ? html`<section class="sec"><div class="sec-head"><h2>つぎの動画</h2></div><a class="lesson-card row-card" href="#/learner/watch/${next.id}">${L.thumb(next.id, { sm: true, noTitle: true })}<span class="lc2-t"><span class="xsmall muted bold">${s.title} ${next.label}</span><b class="clamp-2">${next.title}</b>${next.dur ? html`<span class="xsmall muted">${next.dur}分</span>` : ''}</span></a></section>` : html`<div class="banner ok"><span>${ic('trophy')}</span><span class="b-text">このシリーズの さいごの動画です</span></div>`}
            ${usedIn.length ? html`<section class="sec"><div class="sec-head"><h2>この動画を使う課題</h2></div>${usedIn.map((t) => html`<a class="card row-item" href="#/learner/task/${t.id}">${L.gmark(t.genre, true)}<span><span class="ri-title clamp-2">${t.title}</span><span class="ri-sub">${t.level ? K.LEVELS[t.level].name : ''}</span></span><span class="ri-end">${ic('right')}</span></a>`)}</section>` : ''}
            <section class="sec"><div class="sec-head"><h2>${s.title}（${s.episodes.length}本）</h2></div>
              <div class="card"><ol class="rows ep-list mini">${s.episodes.slice(Math.max(0, idx - 2), idx + 5).map((e) => html`<li><a class="row-item ep ${e.id === id ? 'is-cur' : ''}" href="#/learner/watch/${e.id}"><span class="ep-no ${L.lp(e.id) >= 1 ? 'done' : ''}">${L.lp(e.id) >= 1 ? ic('check') : (e.label || '・')}</span><span class="ri-title clamp-1">${e.title}</span><span class="ri-end">${e.id === id ? html`<span class="chip chip-info">いま</span>` : ''}</span></a></li>`)}</ol></div>
              <a class="sec-more" href="#/learner/series/${s.id}">ぜんぶ見る${ic('right')}</a></section>
            ${prev ? html`<a class="small" href="#/learner/watch/${prev.id}">${ic('left')}まえの動画：${prev.title}</a>` : ''}
          </aside>
        </div>
      </div>`,
      mount: (root) => { setActivity({ type: 'lesson', ref: id }); mountPlayer(root, dos); }
    };
  }
  function mountPlayer(root, dos) {
    const pl = root.querySelector('[data-player]'); if (!pl) return;
    const id = pl.dataset.id, dur = Number(pl.dataset.dur) * 60;
    let pos = L.lp(id) * dur, playing = false, timer = null, speed = 1;
    const fill = pl.querySelector('[data-fill]'), time = pl.querySelector('[data-time]'), cc = pl.querySelector('[data-cc]');
    const draw = () => { const p = clamp(pos / dur, 0, 1); fill.style.width = (p * 100) + '%'; time.textContent = `${Math.floor(pos / 60)}:${Core.pad(Math.floor(pos % 60))} / ${pl.dataset.dur}分`; };
    const save = () => { const p = clamp(pos / dur, 0, 1); Store.update((s) => { s.lessons[id] = Math.max(s.lessons[id] || 0, p >= 0.98 ? 1 : Math.round(p * 100) / 100); }, { silent: true }); };
    const setPlaying = (v) => {
      playing = v; pl.classList.toggle('is-playing', v);
      pl.querySelectorAll('[data-pl="toggle"]').forEach((b) => { b.innerHTML = Icons.icon(v ? 'pause' : 'play', { cls: v ? '' : 'ico-fill' }); b.setAttribute('aria-label', v ? '止める' : '再生'); });
      clearInterval(timer);
      if (v) timer = setInterval(() => {
        if (!document.body.contains(pl)) { clearInterval(timer); save(); return; }
        pos += 20 * speed; // 試作なので 20倍の速さで進む
        if (cc) cc.textContent = '字幕：' + dos[Math.floor(pos / 40) % dos.length];
        if (pos >= dur) { pos = dur; draw(); setPlaying(false); save(); App.refresh(); UI.toast('見おわりました！'); return; }
        draw();
      }, 1000);
      else save();
    };
    pl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pl]'); if (!b) return;
      const k = b.dataset.pl;
      if (k === 'toggle') setPlaying(!playing);
      if (k === 'back10') { pos = Math.max(0, pos - 10); draw(); }
      if (k === 'speed') { speed = speed === 1 ? 1.25 : speed === 1.25 ? 0.75 : 1; b.textContent = speed.toFixed(speed === 1.25 || speed === 0.75 ? 2 : 1) + '倍'; }
      if (k === 'cc') { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); cc.hidden = !on; }
    });
    draw();
  }
  act('lesson-done', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { s.lessons[id] = 1; });
    UI.toast('「見おわった」にしました。よくがんばったね！');
  });

  function pageArchive(route) {
    const a = C.archives.find((x) => x.id === route.params.id);
    if (!a) return { title: 'アーカイブ', html: html`<p>見つかりません</p>` };
    const G = K.GENRES[a.genre];
    const others = C.archives.filter((x) => x.genre === a.genre && x.id !== a.id).slice(0, 6);
    return {
      title: `${a.title} ${a.period}`, topTitle: 'アーカイブ', nav: 'live', back: '#/learner/live#archive',
      html: html`<div class="page watch"><div class="watch-grid"><div class="stack-lg">
        <div class="player ${G.cls}" data-player data-id="arc-${a.id}" data-dur="${a.dur}">
          <div class="pl-screen"><div class="pl-poster"><div class="thumb ${G.cls}"><span class="th-no">${a.period}</span><span class="th-ico">${ic(G.icon)}</span><span class="th-title">${a.title} 授業LIVE（${fmt.date(a.date + 'T12:00:00+09:00')}）</span></div></div>
            <div class="pl-playing" aria-hidden="true">${raw(Art.preview(a.genre === 'video' ? 'video' : a.genre === 'design' ? 'banner' : 'blog', { hue: 200, title: a.title + ' ' + a.period }))}</div>
            <button class="pl-big" type="button" data-pl="toggle" aria-label="再生">${ic('play', { cls: 'ico-fill' })}</button><div class="pl-cc" data-cc>字幕：授業のはじまりです</div></div>
          <div class="pl-bar"><div class="pl-track"><i data-fill style="width:0%"></i></div></div>
          <div class="pl-ctrl"><button class="pl-btn" type="button" data-pl="toggle">${ic('play', { cls: 'ico-fill' })}</button><button class="pl-btn" type="button" data-pl="back10">${ic('rewind')}<span class="xsmall">10</span></button><span class="pl-time num" data-time>0:00 / ${a.dur}分</span><span class="grow"></span><button class="pl-btn pl-speed" type="button" data-pl="speed">1.0倍</button><button class="pl-btn" type="button" data-pl="cc" aria-pressed="true">${ic('cc')}</button></div>
        </div>
        <div class="watch-title"><span class="eyebrow">アーカイブ ・ ${fmt.date(a.date + 'T12:00:00+09:00')}</span><h1>${a.title} ${a.period}</h1><p class="small muted">もとの題名：${a.src}</p></div>
        <div class="watch-actions"><button class="btn btn-ok btn-lg" type="button" data-act="arc-done" data-id="${a.id}">${ic('check')}<span>見おわった</span></button><a class="btn btn-lg" href="#/learner/pikuto">${ic('chat')}<span>ぴくとに聞く</span></a></div>
      </div><aside class="stack-lg"><section class="sec"><div class="sec-head"><h2>${G.name}のアーカイブ</h2></div>
        <div class="arc-list">${others.map((o) => html`<a class="arc-item" href="#/learner/archive/${o.id}"><span class="thumb sm ${G.cls}"><span class="th-no" style="font-size:1.05rem">${o.period}</span><span class="th-ico">${ic(G.icon)}</span></span><span class="arc-t"><b>${fmt.date(o.date + 'T12:00:00+09:00')}</b><span class="small muted">${o.period}・${o.dur}分</span></span></a>`)}</div></section></aside></div></div>`,
      mount: (root) => { setActivity({ type: 'archive', ref: a.id }); mountPlayer(root, ['授業のはじまりです', '先生の画面を見ながら、いっしょにやってみよう', 'わからない所は、10秒もどして もう一度']); }
    };
  }
  act('arc-done', (el) => { const id = el.getAttribute('data-id'); Store.update((s) => { s.arcWatched = Object.assign(s.arcWatched || {}, { [id]: 1 }); }); UI.toast('「見おわった」にしました'); });

  /* ---------- 出席のきろく ---------- */
  function pageRecord() {
    const att = S().attendance[S().me] || {};
    const days = window.SEED_HELPERS.OCT;
    const d = S().myDay;
    const data = days.map((ds) => {
      const a = ds === Core.DEMO_DAY ? (d.in ? { work: L.workedMin() } : null) : att[ds];
      return { label: `${Number(ds.slice(8))}日`, short: String(Number(ds.slice(8))), value: a && !a.absent ? Math.round((a.work || 0) / 6) / 10 : 0, ds, a };
    });
    const present = data.filter((x) => x.a && !x.a.absent);
    const totalH = sum(present, (x) => x.value);
    const first = new Date('2026-10-01T12:00:00+09:00').getUTCDay();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(html`<div class="cal-d is-empty"></div>`);
    for (let day = 1; day <= 31; day++) {
      const ds = `2026-10-${Core.pad(day)}`;
      const wd = (first + day - 1) % 7;
      const x = data.find((r) => r.ds === ds);
      const isToday = ds === Core.DEMO_DAY;
      let cls = 'is-off';
      if (x && x.a && !x.a.absent) cls = x.value >= 5 ? 'lv4' : x.value >= 4 ? 'lv3' : x.value >= 2.5 ? 'lv2' : 'lv1';
      else if (x && x.a && x.a.absent) cls = 'is-absent';
      else if (wd === 0 || wd === 6 || ds > Core.DEMO_DAY) cls = 'is-off';
      cells.push(html`<div class="cal-d ${cls} ${isToday ? 'is-today' : ''}" title="${ds}${x && x.value ? ` ${x.value}時間` : ''}"><span>${day}</span>${x && x.value ? html`<small>${x.value}h</small>` : ''}</div>`);
    }
    const tl = [];
    if (d.in) tl.push(['in', fmt.time(d.in), '出席する', '']);
    (d.breaks || []).forEach((b) => tl.push(['brk', fmt.time(b.start), '休けい', b.end ? `${fmt.time(b.end)}まで` : 'いま休けい中']));
    if (d.out) tl.push(['out', fmt.time(d.out), 'おわる', '']);
    return {
      title: '出席のきろく', nav: 'record',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>出席のきろく</h1><p class="lead">来た日と、取り組んだ時間です。休けいの時間は入りません。</p></div></div>
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('sun')}きょう（${fmt.date(Clock.now())}）</h2></div>
          ${d.in ? html`<div class="today-rec"><div class="tr-big"><b data-worked>${fmt.dur(L.workedMin())}</b><span>取り組んだ時間</span></div>
            <ol class="tl">${tl.map(([k, t, n, sub]) => html`<li class="tl-item is-done"><span class="tl-time">${t}</span><span class="tl-mark"><i></i></span><span class="tl-body"><span class="tl-title">${n}</span><span class="tl-sub">${sub}</span></span></li>`)}</ol></div>`
            : html`<div class="row" style="flex-wrap:wrap"><p class="grow">まだ「出席する」を押していません。</p><button class="btn btn-primary" type="button" data-act="checkin">${ic('login')}<span>出席する</span></button></div>`}
        </section>
        <div class="stats three" style="--cols:3">
          <div class="stat"><span class="st-label">${ic('calcheck')}10月に来た日</span><span class="st-value">${present.length}<small>日</small></span></div>
          <div class="stat"><span class="st-label">${ic('clock')}取り組んだ時間</span><span class="st-value">${Math.round(totalH)}<small>時間</small></span></div>
          <div class="stat"><span class="st-label">${ic('sun')}1日の平均</span><span class="st-value">${present.length ? (totalH / present.length).toFixed(1) : 0}<small>時間</small></span></div>
        </div>
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('calendar')}10月のカレンダー</h2></div>
          <div class="cal" role="grid" aria-label="10月の出席">${['日', '月', '火', '水', '木', '金', '土'].map((w) => html`<div class="cal-h">${w}</div>`)}${cells}</div>
          <div class="legend-scale"><span>短い</span><i style="background:#cfeaf6"></i><i style="background:#8fd0ec"></i><i style="background:#3aa9d8"></i><i style="background:#0077a8"></i><span>長い</span><span style="margin-left:12px">「休」はお休みの日</span></div>
        </section>
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chart')}10月の 取り組んだ時間（1日ごと）</h2></div>
          ${Charts.bars(data.map((x) => ({ label: x.label, short: x.short, value: x.value })), { title: '10月の 1日ごとの取り組んだ時間（時間）', unit: '時間', xName: '日にち', yName: '時間', fmt: (v) => String(Math.round(v * 10) / 10) })}
        </section>
      </div>`,
      mount: (root) => Charts.mount(root)
    };
  }

  /* ---------- 時計を進める ---------- */
  document.addEventListener('tick', () => {
    if (!App.current || App.current.role !== 'learner') return;
    const now = Clock.now();
    Core.$$('[data-clock]').forEach((el) => { el.textContent = fmt.time(now); });
    Core.$$('[data-worked]').forEach((el) => { el.textContent = el.closest('.att-chip') ? fmt.durShort(L.workedMin()) : fmt.dur(L.workedMin()); });
    Core.$$('[data-until]').forEach((el) => { el.textContent = String(Math.max(0, Math.ceil((new Date(el.dataset.until) - now) / 60000))); });
    Core.$$('[data-since]').forEach((el) => { el.textContent = fmt.dur((now - new Date(el.dataset.since)) / 60000); });
    const ls = L.liveState();
    const key = (ls.current ? 'c' + ls.current.key : '') + (ls.next ? 'n' + ls.next.key : '');
    if (L._liveKey && L._liveKey !== key && ['home', 'live'].includes(App.current.parts[0] || 'home')) App.refresh();
    L._liveKey = key;
  });

  L.routes = {
    'home': pageHome,
    'live': pageLive,
    'live/room': pageLiveRoom,
    'lib': pageLib,
    'series/:id': pageSeries,
    'watch/:id': pageWatch,
    'archive/:id': pageArchive,
    'record': pageRecord
  };
  L.shell = shell;
})();
