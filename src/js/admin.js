/* =========================================================
   運営（エスピクトスクール運営）の画面
   ホーム・提出チェック・配信・案件ボード・納品・利用者・事業所・設定
   ========================================================= */
(function () {
  'use strict';
  const { html, raw, ic, esc, fmt, jst, sum, groupBy } = Core;
  const K = window.CONTENT;
  const C = window.CATALOG;
  const S = () => Store.state;
  const nowISO = () => Clock.now().toISOString();
  const B = (v) => (v ? 'true' : 'false');
  const T = (x) => new Date(x).getTime();
  const today = () => jst(Clock.now()).date;

  /* ---------- 共通の小物 ---------- */
  const A = {};
  A.person = (id) => S().mine.find((u) => u.id === id) || S().others.find((u) => u.id === id) || { id, name: '（見つかりません）', color: '#566b7d', genres: [], level: 'beginner', facility: '' };
  A.fac = (id) => S().facilities.find((f) => f.id === id) || { id, name: '—', area: '' };
  A.task = (id) => K.ALL_TASKS.find((t) => t.id === id) || S().extraTasks.find((t) => t.id === id) || null;
  A.av = (u, cls) => html`<span class="av ${cls || ''}" style="--av:${u.color || '#0094c8'}" aria-hidden="true">${(u.name || '?')[0]}</span>`;
  A.lv = (lv) => (lv && K.LEVELS[lv] ? html`<span class="chip ${K.LEVELS[lv].cls}">${K.LEVELS[lv].name}</span>` : '');
  A.gmark = (g, sm) => { const G = K.GENRES[g] || K.GENRES.pc; return html`<span class="gmark ${sm ? 'sm' : ''} ${G.cls}" aria-hidden="true">${ic(G.icon)}</span>`; };
  A.VERDICT = {
    good: { label: 'よさそう', cls: 'chip-ok', icon: 'checkc', long: 'よさそうです' },
    fix: { label: '直す所あり', cls: 'chip-warn', icon: 'edit', long: '直す所がありそうです' },
    check: { label: '人の目で確認', cls: 'chip-info', icon: 'eye', long: '人の目で確かめてください' }
  };
  A.vchip = (v) => { const x = A.VERDICT[v] || A.VERDICT.check; return html`<span class="chip ${x.cls}">${ic(x.icon)}${x.label}</span>`; };
  A.waiting = () => S().submissions.filter((x) => x.status === 'waiting');
  A.hash = (s) => Core.hashStr(String(s));
  A.subsOf = (u) => (u.subs != null ? u.subs : 3 + (A.hash(u.id) % 11));
  A.okRateOf = (u) => (u.okRate != null ? u.okRate : 74 + (A.hash(u.id + 'ok') % 22));
  A.kindIcon = { url: 'link', image: 'image', video: 'film', text: 'file' };
  A.kindName = { url: 'URL', image: '画像', video: '動画', text: '文' };

  /* ---------- やさしい日本語チェック ---------- */
  function suru(word, te, masu, ru, stem, noun) {
    return { word, sugg: ru, re: new RegExp(word + '(してください|しました|します|して|する|し|)', 'g'),
      rep: (m, suf) => ({ 'してください': te + 'ください', 'しました': masu.replace(/ます$/, 'ました'), 'します': masu, 'して': te, 'する': ru, 'し': stem, '': noun })[suf] };
  }
  function noun(word, sugg, to) { return { word, sugg, re: new RegExp(word, 'g'), rep: () => (to != null ? to : sugg) }; }
  const EASY = [
    suru('修正', '直して', '直します', '直す', '直し', '直し'),
    suru('確認', '確かめて', '確かめます', '確かめる', '確かめ', '確かめること'),
    suru('改善', 'よくして', 'よくします', 'よくする', 'よくし', 'よくすること'),
    suru('実施', 'して', 'します', 'する', 'し', 'すること'),
    suru('調整', 'ととのえて', 'ととのえます', 'ととのえる', 'ととのえ', 'ととのえること'),
    suru('削除', 'けして', 'けします', 'けす', 'けし', 'けすこと'),
    suru('追加', 'たして', 'たします', 'たす', 'たし', 'たすこと'),
    suru('変更', 'かえて', 'かえます', 'かえる', 'かえ', 'かえること'),
    suru('統一', 'そろえて', 'そろえます', 'そろえる', 'そろえ', 'そろえること'),
    suru('把握', '分かって', '分かります', '分かる', '分かり', '分かること'),
    suru('留意', '気をつけて', '気をつけます', '気をつける', '気をつけ', '気をつけること'),
    suru('推奨', 'おすすめして', 'おすすめします', 'おすすめする', 'おすすめし', 'おすすめ'),
    noun('可読性', '読みやすさ'), noun('視認性', '見やすさ'), noun('余白', 'すき間'), noun('不備', '足りない所'),
    noun('誤字', '字のまちがい'), noun('適切な', 'ちょうどいい'), noun('適切', 'ちょうどいい'), noun('提出物', '出したもの'),
    noun('必須', 'かならず'), noun('即座に', 'すぐに'), noun('困難', 'むずかしい'), noun('再提出', 'もう一度出すこと'),
    noun('配置', '置き方'), noun('構成', '組み立て'), noun('弊社', '（使わない）', '')
  ];
  const JUDGE = ['不合格', '合格', '失格', '点数', '採点', '何点'];
  function easyCheck(text) {
    const t = String(text || '');
    const out = [];
    EASY.forEach((r, i) => {
      const m = t.match(new RegExp(r.word, 'g'));
      if (m && !(r.word === '適切' && /適切な/.test(t) && (t.match(/適切/g) || []).length === (t.match(/適切な/g) || []).length)) out.push({ type: 'hard', i, word: r.word, sugg: r.sugg, count: m.length });
    });
    JUDGE.forEach((w) => {
      const n = (t.match(new RegExp(w, 'g')) || []).length - (w === '合格' ? (t.match(/不合格/g) || []).length : 0);
      if (n > 0) out.push({ type: 'judge', word: w, count: n });
    });
    t.split(/(?<=[。！？!?\n])/).forEach((sen) => {
      const s = sen.replace(/\n/g, '').trim();
      if (s.length > 58) out.push({ type: 'long', word: s.slice(0, 12), len: s.length });
    });
    return out;
  }
  function easyApply(text, i) { const r = EASY[i]; return String(text).replace(r.re, r.rep); }
  function easyPanel(text, scope) {
    const issues = easyCheck(text);
    const sc = scope || 'draft';
    if (!issues.length) return html`<div class="ad-easy is-ok"><div class="ad-easy-head">${ic('textsize')}<b>やさしい日本語チェック</b><span class="chip chip-ok">${ic('check')}だいじょうぶ</span></div><p class="xsmall muted">むずかしい言葉・合否のことば・長すぎる文は ありません。</p></div>`;
    return html`<div class="ad-easy"><div class="ad-easy-head">${ic('textsize')}<b>やさしい日本語チェック</b><span class="chip chip-warn">${issues.length}こ</span></div>
      <ul class="ad-easy-list">${issues.map((x) => {
        if (x.type === 'hard') return html`<li><span class="ad-easy-w">「${x.word}」</span><span class="ad-easy-arrow">${ic('next')}</span><b>${x.sugg}</b>${x.count > 1 ? html`<span class="xsmall muted">${x.count}か所</span>` : ''}<span class="grow"></span><button class="btn btn-sm btn-soft" type="button" data-act="ad-easy-rep" data-i="${x.i}" data-scope="${sc}">置きかえる</button></li>`;
        if (x.type === 'judge') return html`<li class="is-judge"><span class="ad-easy-w">「${x.word}」</span><span class="small">合否のことばは使いません</span><span class="grow"></span><button class="btn btn-sm btn-ghost" type="button" data-act="ad-easy-find" data-w="${x.word}" data-scope="${sc}">場所を見る</button></li>`;
        return html`<li class="is-long"><span class="ad-easy-w">長い文（${x.len}文字）</span><span class="small">2つに分けると読みやすくなります</span><span class="grow"></span><button class="btn btn-sm btn-ghost" type="button" data-act="ad-easy-find" data-w="${x.word}" data-scope="${sc}">場所を見る</button></li>`;
      })}</ul></div>`;
  }
  A.easyCheck = easyCheck;

  /* ---------- 骨組み ---------- */
  const NAV = [
    { group: '毎日の仕事' },
    { key: 'home', label: 'ホーム', short: 'ホーム', icon: 'grid', go: '#/admin/home' },
    { key: 'review', label: '提出チェック', short: '提出', icon: 'inbox', go: '#/admin/review', badge: () => A.waiting().length },
    { group: 'とどける' },
    { key: 'deliver', label: '配信', short: '配信', icon: 'layers', go: '#/admin/deliver' },
    { key: 'jobs', label: '案件ボード', short: '案件', icon: 'briefcase', go: '#/admin/jobs' },
    { key: 'delivery', label: '納品', short: '納品', icon: 'package', go: '#/admin/delivery' },
    { group: '管理' },
    { key: 'users', label: '利用者', short: '利用者', icon: 'users', go: '#/admin/users' },
    { key: 'facilities', label: '事業所', short: '事業所', icon: 'building', go: '#/admin/facilities' },
    { key: 'settings', label: '設定', short: '設定', icon: 'sliders', go: '#/admin/settings' }
  ];
  const TABS = [
    { key: 'home', label: 'ホーム', icon: 'grid', go: '#/admin/home' },
    { key: 'review', label: '提出チェック', icon: 'inbox', go: '#/admin/review', badge: () => A.waiting().length },
    { key: 'deliver', label: '配信', icon: 'layers', go: '#/admin/deliver' },
    { key: 'jobs', label: '案件', icon: 'briefcase', go: '#/admin/jobs' }
  ];
  const MORE = [
    { key: 'users', label: '利用者', icon: 'users', go: '#/admin/users' },
    { key: 'facilities', label: '事業所', icon: 'building', go: '#/admin/facilities' },
    { key: 'delivery', label: '納品', icon: 'package', go: '#/admin/delivery' },
    { key: 'settings', label: '設定', icon: 'sliders', go: '#/admin/settings' }
  ];

  function shell(route, page) {
    const cur = page.nav || route.parts[0] || 'review';
    const w = A.waiting().length;
    const moreActive = MORE.some((m) => m.key === cur);
    const back = page.back ? html`<a class="icon-btn tb-back ${page.backSpOnly ? 'hide-pc' : ''}" href="${page.back}" aria-label="もどる">${ic('back')}</a>` : '';
    return html`
      <a class="skip-link" href="#main">本文へ</a>
      <div class="app ad-app">
        <aside class="side ad-side" aria-label="運営のメニュー">
          <div class="side-brand">${raw(Icons.logoMark(38))}<div class="brand-text"><div class="wordmark">エスピクトスクール</div><div class="ad-role-tag">${ic('shieldcheck')}運営</div></div></div>
          <nav class="side-nav">
            ${NAV.map((it) => it.group ? html`<div class="nav-group">${it.group}</div>` : html`<a class="nav-item" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}>${ic(it.icon)}<span class="ad-nav-long">${it.label}</span><span class="ad-nav-short">${it.short}</span>${it.badge && it.badge() ? html`<span class="count nav-badge">${it.badge()}</span>` : ''}</a>`)}
          </nav>
          <div class="side-foot">
            <a class="ad-side-user" href="#/admin/settings">${A.av({ name: K.OPS.name, color: '#22c3f0' }, 'sm')}<span class="hide-rail grow"><b>${K.OPS.name}</b><span class="xsmall">${K.OPS.team}</span></span></a>
            <a class="ad-side-exit hide-rail" href="#/">${ic('back')}<span>入口にもどる（試作）</span></a>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar ad-topbar">
            ${back}
            <span class="hide-pc">${raw(Icons.logoMark(28))}</span>
            <span class="tb-title">${page.topTitle || page.title}</span>
            <span class="hide-sp ad-tb-date">${ic('calendar')}<span>${fmt.date(Clock.now())}</span><b data-clock>${fmt.time(Clock.now())}</b></span>
            <span class="tb-spacer"></span>
            <a class="ad-tb-wait hide-sp ${w ? '' : 'is-zero'}" href="#/admin/review">${ic('inbox')}<span>確認待ち</span><b>${w}</b></a>
            <button class="icon-btn hide-pc" type="button" data-act="ad-more" aria-label="メニュー">${ic('menu')}</button>
          </header>
          <main id="main" class="main" tabindex="-1"></main>
        </div>
        ${page.hideTabbar ? '' : html`<nav class="tabbar ad-tabbar" aria-label="運営のメインメニュー">
          ${TABS.map((it) => html`<a class="tab" href="${it.go}" ${cur === it.key ? raw('aria-current="page"') : ''}><span class="tab-ico">${ic(it.icon)}</span><span>${it.label}</span>${it.badge && it.badge() ? html`<span class="count tab-badge">${it.badge()}</span>` : ''}</a>`)}
          <button class="tab" type="button" data-act="ad-more" ${moreActive ? raw('aria-current="page"') : ''}><span class="tab-ico">${ic('more')}</span><span>もっと</span></button>
        </nav>`}
      </div>`;
  }
  act('ad-more', () => {
    UI.sheet({
      title: 'メニュー',
      body: html`<div class="ad-menu">${MORE.map((m) => html`<a class="ad-menu-item" href="${m.go}" data-close><span class="ico-badge">${ic(m.icon)}</span><span>${m.label}</span></a>`)}</div>
        <a class="btn btn-ghost btn-block" href="#/" data-close>${ic('back')}<span>入口にもどる（試作）</span></a>`
    });
  });

  /* ---------- ホーム ---------- */
  const DAILY = [['10-13', 31], ['10-14', 28], ['10-15', 34], ['10-16', 30], ['10-17', 6], ['10-18', 4], ['10-19', 29], ['10-20', 33], ['10-21', 38], ['10-22', 36], ['10-23', 32], ['10-24', 7], ['10-25', 5]];
  function preset() { return S().clock || 'morning'; }
  function todayCount() {
    const base = { morning: 6, live: 11, evening: 27 }[preset()];
    return base + S().submissions.filter((x) => x.learner === S().me && jst(x.at).date === today()).length;
  }
  function pageHome() {
    const w = A.waiting();
    const oldest = w.slice().sort((a, b) => T(a.at) - T(b.at))[0];
    const oldDays = oldest ? Math.round((T(Clock.now()) - T(oldest.at)) / 864e5) : 0;
    const p = preset();
    const used = { morning: 142, live: 186, evening: 203 }[p];
    const liveN = { morning: null, live: 92, evening: 64 }[p];
    const pk = { morning: 57, live: 120, evening: 340 }[p];
    const alertsToday = S().alerts.concat(S().alertLog || []).filter((a) => jst(a.at).date === today());
    const openAlerts = S().alerts.filter((a) => a.status === 'open').length;
    const decidedToday = (S().decided || []).filter((d) => jst(d.at).date === today()).length;
    const data = DAILY.map(([md, v]) => {
      const d = new Date(`2026-${md}T12:00:00+09:00`);
      return { label: `${fmt.md(d)}（${fmt.weekday(d)}）`, short: String(Number(md.slice(3))), value: v };
    }).concat([{ label: `${fmt.md(Clock.now())}（${fmt.weekday(Clock.now())}）きょう`, short: '26', value: todayCount() }]);
    const issues = C.issues.map((x) => Object.assign({ task: A.task(x.taskId) }, x));
    const fixes = S().adFix || {};
    const ls = livePeriods();
    const deliv = S().deliveries.filter((d) => d.stage !== 'done').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
    const variants = [['web制作', C.tasks.filter((t) => /^web制作/.test(t.src.trim())).length], ['Web制作', C.tasks.filter((t) => /^Web制作/.test(t.src.trim())).length]];
    const h = jst(Clock.now()).h;
    return {
      title: 'ホーム', nav: 'home', wide: true,
      html: html`<div class="page ad-home">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">${fmt.date(Clock.now())}</span><h1>${h < 11 ? 'おはようございます' : h < 17 ? 'こんにちは' : 'おつかれさまです'}、${K.OPS.name}さん</h1>
          <p class="lead">確認待ちは <b>${w.length}件</b>。${oldest ? html`いちばん古いものは ${fmt.ago(oldest.at)}に届きました。` : 'ぜんぶ確認できています。'}</p></div>
          <div class="ph-actions"><a class="btn btn-primary btn-lg" href="#/admin/review">${ic('inbox')}<span>提出チェックをはじめる</span></a></div></div>
        <div class="stats ad-kpi" style="--cols:6">
          <a class="stat ${oldDays >= 3 ? 'is-warn' : ''}" href="#/admin/review"><span class="st-label">${ic('inbox')}確認待ち</span><span class="st-value">${w.length}<small>件</small></span><span class="st-sub">${oldest ? `いちばん古い：${fmt.ago(oldest.at)}` : 'なし'}</span></a>
          <div class="stat"><span class="st-label">${ic('send')}きょうの提出</span><span class="st-value">${todayCount()}<small>件</small></span><span class="st-sub">きょう決めた ${decidedToday}件</span></div>
          <div class="stat"><span class="st-label">${ic('users')}きょう使った人</span><span class="st-value">${used}<small>人</small></span><span class="st-sub">${S().facilities.length}事業所</span></div>
          <div class="stat"><span class="st-label">${ic('live')}授業LIVE</span><span class="st-value">${liveN == null ? html`<span class="ad-soon">10:10から</span>` : html`${liveN}<small>人</small>`}</span><span class="st-sub">${ls.current ? `いま ${K.GENRES[ls.current.genre].name}` : ls.next ? `つぎ ${ls.next.start} ${K.GENRES[ls.next.genre].name}` : 'きょうは おわり'}</span></div>
          <div class="stat"><span class="st-label">${ic('chat')}ぴくとへの相談</span><span class="st-value">${pk}<small>件</small></span><span class="st-sub">合否は言わず、ヒントだけ</span></div>
          <div class="stat ${openAlerts ? 'is-alert' : ''}"><span class="st-label">${ic('alert')}緊急の知らせ</span><span class="st-value">${alertsToday.length}<small>件</small></span><span class="st-sub">${openAlerts ? `職員さんが対応中 ${openAlerts}件` : 'すべて対応ずみ'}</span></div>
        </div>
        <div class="ad-dash">
          <div class="stack-lg">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('chart')}提出の数（この14日）</h2><span class="small muted">土日は 家で取り組んだ人の分</span></div>
              ${Charts.bars(data, { title: 'この14日の提出の数（件）', unit: '件', xName: '日にち', yName: '提出の数', highlightLast: true, fmt: (v) => String(v) })}
            </section>
            <section class="card card-pad sec ad-issues"><div class="sec-head"><h2>${ic('alertc')}データの気になる所</h2><span class="chip">catalog.json から自動で見つけました</span></div>
              <ul class="rows">
                ${issues.map((x) => html`<li class="ad-issue ${fixes[x.taskId] ? 'is-done' : ''}">
                  <span class="ico-badge sm ${fixes[x.taskId] ? 'ok' : 'warn'}">${ic(fixes[x.taskId] ? 'check' : 'calendar')}</span>
                  <span class="grow"><b>${x.task ? x.task.title : x.taskId}</b><span class="small ${fixes[x.taskId] ? 'muted' : 'ad-warn-text'}">${fixes[x.taskId] ? `締め切りを ${fmt.md(fixes[x.taskId] + 'T12:00:00+09:00')} にしました` : `締め切り（${x.due.slice(5).replace('-', '/')}）が公開日（${x.publish.slice(5).replace('-', '/')}）より前です`}</span></span>
                  ${fixes[x.taskId] ? html`<span class="chip chip-ok">直しました</span>` : html`<button class="btn btn-sm" type="button" data-act="ad-fix-due" data-id="${x.taskId}">10/31にする</button>`}</li>`)}
                ${C.dups.slice(0, 3).map((d) => html`<li class="ad-issue"><span class="ico-badge sm info">${ic('copy')}</span><span class="grow"><b>${d.title}</b><span class="small muted">同じ題名の課題が ${d.count}つあります（下書き・体験用をふくむ）</span></span><button class="btn btn-sm btn-ghost" type="button" data-act="noop">まとめる</button></li>`)}
                <li class="ad-issue"><span class="ico-badge sm info">${ic('textsize')}</span><span class="grow"><b>ジャンル名の書き方がまざっています</b><span class="small muted">${variants.map(([n, c]) => `「${n}」${c}件`).join('・')}。利用者の画面では「Web制作」にそろえて見せています。</span></span></li>
              </ul></section>
          </div>
          <div class="stack-lg">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('live')}きょうの授業LIVE</h2><a class="sec-more" href="#/admin/deliver?tab=class">時間割${ic('right')}</a></div>
              <ol class="tl">${ls.list.map((p) => html`<li class="tl-item ${Clock.now() >= p.endAt ? 'is-done' : Clock.now() >= p.startAt ? 'is-now' : ''}"><span class="tl-time">${p.start}</span><span class="tl-mark"><i></i></span><span class="tl-body"><span class="tl-title">${K.GENRES[p.genre].name} 授業LIVE</span><span class="tl-sub">${p.name}・${K.TEACHERS[p.genre]}</span></span></li>`)}</ol></section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('package')}納品の予定</h2><a class="sec-more" href="#/admin/delivery">ぜんぶ${ic('right')}</a></div>
              <ul class="stack-sm">${deliv.map((d) => { const dl = fmt.daysLeft(d.due + 'T12:00:00+09:00'); return html`<li class="ad-mini-row"><span class="grow"><b class="clamp-1">${d.title}</b><span class="xsmall muted">${STAGES.find((x) => x.key === d.stage).label}・${d.done}/${d.items}</span></span><span class="chip ${dl <= 3 ? 'chip-warn' : ''}">${dl <= 0 ? 'きょう' : `あと${dl}日`}</span></li>`; })}</ul></section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('briefcase')}案件ボード</h2><a class="sec-more" href="#/admin/jobs">ぜんぶ${ic('right')}</a></div>
              <ul class="stack-sm">${S().jobs.filter((j) => j.status !== 'prep').slice(0, 4).map((j) => html`<li class="ad-mini-row"><span class="grow"><b class="clamp-1">${j.title}</b><span class="xsmall muted">${j.client}</span></span><span class="chip">${ic('hand')}${j.applicants.length}人</span></li>`)}</ul></section>
          </div>
        </div>
      </div>`,
      mount: (root) => Charts.mount(root)
    };
  }
  act('ad-fix-due', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { s.adFix = Object.assign({}, s.adFix || {}, { [id]: '2026-10-31' }); });
    UI.toast('締め切りを 10月31日（土）にしました', { icon: 'calendar' });
  });
  function livePeriods() {
    const wd = jst(Clock.now()).wd;
    const tt = K.TIMETABLE[wd] || {};
    const now = Clock.now();
    const list = K.PERIODS.filter((p) => tt[p.key]).map((p) => Object.assign({}, p, { genre: tt[p.key], startAt: Clock.at(p.start), endAt: Clock.at(p.end) }));
    return { list, current: list.find((p) => now >= p.startAt && now < p.endAt) || null, next: list.find((p) => p.startAt > now) || null };
  }

  /* ---------- 提出チェック ---------- */
  const ED = { id: null, editing: false, text: '', shown: {} };
  function defaultShown(sub) { return sub.ai && sub.ai.verdict === 'good' ? 'ok' : 'fix'; }
  /** 下書きの「〇〇さん、」を、その人の名字にそろえる */
  function draftOf(sub) {
    const fam = (A.person(sub.learner).name || '').split(' ')[0];
    const d = (sub.ai && sub.ai.draft) || '';
    return fam ? d.replace(/^[^\s、。\n]{1,8}さん、/, fam + 'さん、') : d;
  }
  function queue(f, v) {
    let list = S().submissions.filter((x) => (f === 'sent' ? x.status === 'sent' : f === 'held' ? x.status === 'held' : x.status === 'waiting'));
    if (v && v !== 'all') list = list.filter((x) => x.ai && x.ai.verdict === v);
    if (f === 'waiting' || !f) list.sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || T(a.at) - T(b.at));
    else list.sort((a, b) => T(b.decidedAt || b.at) - T(a.decidedAt || a.at));
    return list;
  }
  function qs(route) { const f = route.query.f || 'waiting', v = route.query.v || 'all'; return (f !== 'waiting' || v !== 'all') ? `?f=${f}&v=${v}` : ''; }
  function previewKind(sub, t) {
    if (sub.kind === 'url') return 'blog';
    if (sub.kind === 'video') return 'video';
    if (sub.kind === 'text') return 'sns';
    return 'banner';
  }
  function previews(sub, t) {
    const hue = 180 + (A.hash(sub.id) % 160);
    const th = t && t.group === 'blog-2026-10' && K.THEMES[t.level] ? K.THEMES[t.level].title : (t ? t.title : '');
    if (sub.kind === 'image' && sub.files.length > 1) {
      return html`<div class="ad-pv-grid">${sub.files.slice(0, 4).map((f, i) => html`<figure class="ad-pv-item">${raw(Art.preview(/流れ|図/.test(f) ? 'flow' : 'banner', { hue: hue + i * 36, title: /OGP|アイキャッチ|図/.test(f) ? th : f.replace(/\.\w+$/, '').replace(/_/g, ' '), sub: 'エスピクトスクールの記事' }))}<figcaption>${ic('image')}${f}</figcaption></figure>`)}</div>`;
    }
    const kind = previewKind(sub, t);
    return html`<figure class="ad-pv-item">${raw(Art.preview(kind, { hue, title: kind === 'video' ? (sub.files[0] || '').replace(/（.*$/, '').replace(/\.\w+$/, '').replace(/_/g, ' ') : th, sub: 'エスピクトスクールの記事' }))}<figcaption>${ic(A.kindIcon[sub.kind] || 'file')}${sub.files[0] || ''}</figcaption></figure>`;
  }
  function queueItem(x, active, q) {
    const u = A.person(x.learner), t = A.task(x.task), f = A.fac(x.facility);
    return html`<a class="ad-qi ${active ? 'is-active' : ''} ${x.fresh ? 'is-fresh' : ''}" href="#/admin/review/${x.id}${q}" ${active ? raw('aria-current="true"') : ''}>
      <span class="ad-qi-top">${A.av(u, 'sm')}<span class="grow ad-qi-who"><b>${u.name}</b><span class="xsmall muted">${f.name}</span></span><span class="xsmall muted nowrap">${x.status === 'waiting' ? fmt.ago(x.at) : fmt.ago(x.decidedAt || x.at)}</span></span>
      <span class="ad-qi-title clamp-2">${t ? t.title : '（課題）'}</span>
      <span class="cluster ad-qi-chips">${x.fresh ? html`<span class="chip chip-live">いま届いた</span>` : ''}${x.status === 'waiting' ? A.vchip(x.ai.verdict) : x.status === 'sent' ? html`<span class="chip chip-ok">${ic('send')}送った</span>` : html`<span class="chip">${ic('x')}出さない</span>`}${A.lv(t && t.level)}<span class="chip chip-outline">${ic(A.kindIcon[x.kind] || 'file')}${A.kindName[x.kind] || ''}</span></span>
    </a>`;
  }
  function pageReview(route) {
    const f = route.query.f || 'waiting';
    const v = route.query.v || 'all';
    const q = qs(route);
    const list = queue(f, v);
    const all = S().submissions;
    const counts = { waiting: all.filter((x) => x.status === 'waiting').length, sent: all.filter((x) => x.status === 'sent').length, held: all.filter((x) => x.status === 'held').length };
    const vcount = (k) => queue(f, k).length;
    const found = route.params.id ? all.find((x) => x.id === route.params.id) : null;
    const sub = found || list[0] || null;
    if (sub && ED.id !== sub.id) { ED.id = sub.id; ED.editing = false; ED.text = draftOf(sub); }
    const hasId = !!route.params.id;
    const qhead = html`<div class="ad-q-head">
        <h1 class="ad-q-title">提出チェック<span class="count blue">${counts.waiting}</span></h1>
        <div class="seg seg-block" role="tablist" aria-label="しぼりこみ">
          ${[['waiting', '確認待ち'], ['sent', '送った'], ['held', '出さない']].map(([k, n]) => html`<a role="tab" href="#/admin/review?f=${k}" aria-selected="${B(f === k)}">${n}<span class="ad-segn">${counts[k]}</span></a>`)}
        </div>
        ${f === 'waiting' ? html`<div class="ad-vf" role="group" aria-label="AIの判定でしぼる">${[['all', 'すべて'], ['good', 'よさそう'], ['fix', '直す所あり'], ['check', '人の目で']].map(([k, n]) => html`<a class="fchip" href="#/admin/review?f=${f}&v=${k}" aria-pressed="${B(v === k)}">${n}<span class="count gray">${vcount(k)}</span></a>`)}</div>` : ''}
      </div>`;
    const qlist = list.length ? html`<div class="ad-q-list">${list.map((x) => queueItem(x, sub && x.id === sub.id, q))}</div>`
      : html`<div class="empty">${raw(Icons.pikuto(80, 'happy'))}<span class="em-title">${f === 'waiting' ? '確認待ちは ありません' : 'まだ ありません'}</span>${f === 'waiting' ? html`<span>ぜんぶ確認できました。おつかれさまでした！</span>` : ''}</div>`;
    return {
      title: '提出チェック', nav: 'review', flush: true, hideTabbar: hasId, back: hasId ? '#/admin/review' + q : null, backSpOnly: true,
      topTitle: hasId && sub ? `${A.person(sub.learner).name}さんの提出` : '提出チェック',
      html: html`<div class="ad-review ${hasId ? 'has-id' : 'no-id'} ${sub ? '' : 'is-empty'}">
        <section class="ad-queue" aria-label="提出の一覧">${qhead}${qlist}<p class="ad-kbd-hint hide-sp"><kbd>J</kbd><kbd>K</kbd> つぎ・まえ　<kbd>1</kbd> OK　<kbd>2</kbd> 直してOK　<kbd>3</kbd> 出さない　<kbd>E</kbd> 直す</p></section>
        ${sub ? detail(sub, route, q) : html`<section class="ad-detail ad-detail-empty"><div class="empty card">${raw(Icons.pikuto(96, 'happy'))}<span class="em-title">えらばれた提出は ありません</span></div></section>`}
      </div>`,
      mount: (root) => {
        if (sub && sub.fresh) Store.update((s) => { const x = s.submissions.find((y) => y.id === sub.id); if (x) x.fresh = false; }, { silent: true });
        const ta = root.querySelector('#ad-draft');
        if (ta) { ta.value = ED.text; autoGrow(ta); }
        const act = root.querySelector('.ad-qi.is-active');
        if (act && window.matchMedia('(min-width: 760px)').matches) act.scrollIntoView({ block: 'nearest' });
      }
    };
  }
  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 4, 180), 520) + 'px'; }

  function detail(sub, route, q) {
    const u = A.person(sub.learner), t = A.task(sub.task), f = A.fac(sub.facility);
    const ins = t ? K.instrFor(t) : null;
    const checks = ins ? ins.checks || [] : [];
    const sinceY = u.since ? `${u.since.slice(0, 4)}年${Number(u.since.slice(5, 7))}月から` : '';
    const prevSent = S().submissions.filter((x) => x.learner === u.id && x.id !== sub.id && x.status === 'sent').length;
    return html`
      <section class="ad-detail" aria-label="出されたもの">
        <header class="ad-sub-head">
          <div class="row ad-sub-who">${A.av(u)}<div class="grow"><b class="ad-sub-name">${u.name}</b><span class="small muted">${f.name}・${fmt.dt(sub.at)}（${fmt.ago(sub.at)}）</span></div>
            ${sub.learner === S().me ? html`<a class="btn btn-sm btn-ghost hide-sp" href="#/learner/task/${sub.task}?tab=chat" title="利用者の画面で見る（試作）">${ic('eye')}<span>利用者の画面</span></a>` : ''}</div>
          <h2 class="ad-sub-title">${t ? t.title : '（課題）'}</h2>
          <div class="cluster">${A.gmark(t ? t.genre : 'pc', true)}${A.lv(t && t.level)}${t && t.method ? html`<span class="chip">${K.METHODS[t.method].name}</span>` : ''}${t && t.kind === 'monthly' ? html`<span class="chip">月の指示書</span>` : ''}<span class="chip chip-outline">${ic(A.kindIcon[sub.kind] || 'file')}${A.kindName[sub.kind] || ''}${sub.files.length > 1 ? ` ${sub.files.length}こ` : ''}</span></div>
        </header>
        <div class="card ad-pv">${previews(sub, t)}<p class="xsmall muted ad-pv-note">${ic('info')}プレビューは試作のイメージです</p></div>
        ${sub.kind === 'url' ? html`<a class="ad-url" href="#" data-act="noop">${ic('link')}<span class="grow">${sub.files[0]}</span>${ic('external')}</a>` : ''}
        ${sub.message ? html`<div class="ad-msg">${A.av(u, 'sm')}<div><span class="xsmall muted bold">利用者のひとこと</span><p>${sub.message}</p></div></div>` : ''}
        ${checks.length ? html`<section class="card card-pad sec"><div class="sec-head"><h3 class="ad-h3">${ic('clipboard')}指示書のチェック項目</h3><span class="xsmall muted">${checks.length}こ</span></div>
          <ol class="ad-checks">${checks.map((c) => html`<li>${c}</li>`)}</ol></section>` : ''}
        <section class="card card-pad ad-person"><div class="sec-head"><h3 class="ad-h3">${ic('user')}この人のこれまで</h3><a class="sec-more" href="#/admin/users?q=${encodeURIComponent(u.name.split(' ')[0])}">利用者${ic('right')}</a></div>
          <div class="ad-person-stats"><div><b>${A.subsOf(u) + prevSent}</b><span>回 出した</span></div><div><b>${A.okRateOf(u)}%</b><span>OKの わりあい</span></div><div><b>${(u.genres || []).map((g) => K.GENRES[g].short).join('・') || '—'}</b><span>${sinceY}</span></div></div></section>
      </section>
      <aside class="ad-aipane" aria-label="AIの判定と返事">${sub.status === 'waiting' ? aiPanel(sub) : decidedPanel(sub)}</aside>`;
  }
  function aiPanel(sub) {
    const ai = sub.ai || { verdict: 'check', conf: 50, points: [], draft: '' };
    const V = A.VERDICT[ai.verdict] || A.VERDICT.check;
    const shown = ED.shown[sub.id] || defaultShown(sub);
    const edited = ED.text !== draftOf(sub);
    return html`
      <div class="ad-ai-head">
        <div class="row-between"><span class="ad-ai-label">${ic('sparkles')}AIの判定</span><span class="xsmall muted">運営だけに見えます</span></div>
        <div class="ad-verdict v-${ai.verdict}">${ic(V.icon)}<span class="grow"><b>${V.long}</b><span class="xsmall">自信 ${ai.conf}%</span></span></div>
        <div class="bar thin"><i style="width:${ai.conf}%"></i></div>
      </div>
      <ul class="ad-points">${ai.points.map(([ok, text]) => html`<li class="${ok ? 'is-ok' : 'is-warn'}">${ic(ok ? 'check' : 'alert')}<span>${text}</span></li>`)}</ul>
      <div class="ad-draft ${ED.editing ? 'is-editing' : ''}">
        <div class="row-between"><label class="label" for="ad-draft">${ic('edit')}返事の下書き</label><span class="xsmall muted" data-len>${ED.text.length}文字</span></div>
        <textarea class="textarea" id="ad-draft" data-input="ad-draft-in" ${ED.editing ? '' : raw('readonly')} aria-describedby="ad-draft-hint">${ED.text}</textarea>
        <p class="xsmall muted" id="ad-draft-hint">${ED.editing ? html`直している時は <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> で送れます。${edited ? html` <button class="linkbtn" type="button" data-act="ad-draft-reset">${ic('undo')}もとの下書きにもどす</button>` : ''}` : 'AIが書いた下書きです。直す時は「直してOK」を押します。'}</p>
        <div data-easy>${easyPanel(ED.text)}</div>
      </div>
      <div class="ad-shown"><span class="label">${ic('eye')}利用者に見せる表示</span>
        <div class="seg seg-block" role="group" aria-label="利用者に見せる表示">
          <button type="button" data-act="ad-shown" data-v="ok" aria-selected="${B(shown === 'ok')}">${ic('checkc')}できた</button>
          <button type="button" data-act="ad-shown" data-v="fix" aria-selected="${B(shown === 'fix')}">${ic('edit')}直してね</button>
        </div></div>
      <div class="ad-decide" role="group" aria-label="決める">
        <button class="btn btn-primary btn-lg ad-d-ok" type="button" data-act="ad-ok" ${ED.editing && edited ? raw('aria-disabled="true"') : ''}><span class="ad-d-main">${ic('send')}OK</span><span class="ad-d-sub">このまま送る</span><kbd>1</kbd></button>
        <button class="btn btn-lg ad-d-fix ${ED.editing ? 'is-armed' : ''}" type="button" data-act="ad-fix"><span class="ad-d-main">${ic('edit')}直してOK</span><span class="ad-d-sub">${ED.editing ? 'この文で送る' : '直して送る'}</span><kbd>2</kbd></button>
        <button class="btn btn-lg ad-d-hold" type="button" data-act="ad-hold"><span class="ad-d-main">${ic('x')}出さない</span><span class="ad-d-sub">返事を送らない</span><kbd>3</kbd></button>
      </div>
      <p class="xsmall muted ad-decide-note">${ic('info')}「OK」と「直してOK」の時だけ、利用者に返事がとどきます。</p>`;
  }
  function decidedPanel(sub) {
    const how = { ok: 'OK（このまま送った）', fixok: '直してOK（直して送った）', hold: '出さない' }[sub.decision] || '';
    if (sub.status === 'held') {
      return html`<div class="ad-ai-head"><span class="ad-ai-label">${ic('x')}出さないにしました</span></div>
        <div class="banner warn">${ic('info')}<span class="b-text">利用者には、何も とどいていません。<p>理由：${sub.reason || '—'}・${fmt.dt(sub.decidedAt)}</p></span></div>
        <button class="btn btn-block" type="button" data-act="ad-reopen" data-id="${sub.id}">${ic('undo')}<span>確認待ちにもどす</span></button>`;
    }
    return html`<div class="ad-ai-head"><span class="ad-ai-label">${ic('send')}返事を送りました</span></div>
      <div class="banner ok">${ic('checkc')}<span class="b-text">${how}<p>${fmt.dt(sub.decidedAt)}・利用者に「${sub.shown === 'ok' ? 'できた' : '直してね'}」と表示</p></span></div>
      <div class="ad-sent-text">${sub.reply}</div>
      ${sub.learner === S().me ? html`<a class="btn btn-block" href="#/learner/task/${sub.task}?tab=chat">${ic('eye')}<span>利用者の画面で見る（試作）</span></a>` : ''}`;
  }

  /* 下書きの入力・やさしい日本語 */
  function redrawDraftUI() {
    const pane = document.querySelector('.ad-aipane');
    if (!pane) return;
    const ta = pane.querySelector('#ad-draft');
    const len = pane.querySelector('[data-len]');
    if (len) len.textContent = ED.text.length + '文字';
    const easy = pane.querySelector('[data-easy]');
    if (easy) easy.innerHTML = Core.toHtml(easyPanel(ED.text));
    const sub = S().submissions.find((x) => x.id === ED.id);
    if (!sub) return;
    const edited = ED.text !== draftOf(sub);
    const okBtn = pane.querySelector('[data-act="ad-ok"]');
    if (okBtn) { if (ED.editing && edited) okBtn.setAttribute('aria-disabled', 'true'); else okBtn.removeAttribute('aria-disabled'); }
    const fixBtn = pane.querySelector('[data-act="ad-fix"]');
    if (fixBtn) { fixBtn.classList.toggle('is-armed', ED.editing); fixBtn.querySelector('.ad-d-sub').textContent = ED.editing ? 'この文で送る' : '直して送る'; }
    pane.querySelector('.ad-draft').classList.toggle('is-editing', ED.editing);
    if (ta) { ta.readOnly = !ED.editing; }
    const hint = pane.querySelector('#ad-draft-hint');
    if (hint) hint.innerHTML = ED.editing ? `直している時は <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd> で送れます。${edited ? ` <button class="linkbtn" type="button" data-act="ad-draft-reset">${Icons.icon('undo')}もとの下書きにもどす</button>` : ''}` : 'AIが書いた下書きです。直す時は「直してOK」を押します。';
  }
  act('ad-draft-in', (el) => { ED.text = el.value; autoGrow(el); redrawDraftUI(); });
  act('ad-draft-reset', () => { const sub = S().submissions.find((x) => x.id === ED.id); if (!sub) return; ED.text = draftOf(sub); const ta = document.querySelector('#ad-draft'); if (ta) { ta.value = ED.text; autoGrow(ta); } redrawDraftUI(); });
  act('ad-easy-rep', (el) => {
    const i = Number(el.getAttribute('data-i'));
    if (el.getAttribute('data-scope') === 'wizard') { wzEasyRep(i); return; }
    ED.text = easyApply(ED.text, i);
    ED.editing = true;
    const ta = document.querySelector('#ad-draft');
    if (ta) { ta.value = ED.text; autoGrow(ta); }
    redrawDraftUI();
    UI.toast(`「${EASY[i].word}」を「${EASY[i].sugg}」に置きかえました`, { icon: 'textsize' });
  });
  act('ad-easy-find', (el) => {
    const w = el.getAttribute('data-w');
    if (el.getAttribute('data-scope') === 'wizard') { UI.toast(`「${w}」の所を直してください`, { icon: 'info' }); return; }
    const ta = document.querySelector('#ad-draft');
    if (!ta) return;
    const i = ta.value.indexOf(w);
    if (i < 0) return;
    ED.editing = true; redrawDraftUI();
    ta.focus(); ta.setSelectionRange(i, i + w.length);
  });
  act('ad-shown', (el) => {
    ED.shown[ED.id] = el.getAttribute('data-v');
    el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', B(b === el)));
  });

  /* 決める */
  function snapshot(sub) {
    const s = S();
    return JSON.stringify({ sub: s.submissions.find((x) => x.id === sub.id), chat: s.chats[sub.task] || null, task: s.tasks[sub.task] || null, notices: s.notices, decided: s.decided || [], works: s.works });
  }
  function restore(snap) {
    const o = JSON.parse(snap);
    Store.update((s) => {
      const i = s.submissions.findIndex((x) => x.id === o.sub.id);
      if (i >= 0) s.submissions[i] = o.sub;
      if (o.chat) s.chats[o.sub.task] = o.chat; else delete s.chats[o.sub.task];
      if (o.task) s.tasks[o.sub.task] = o.task; else delete s.tasks[o.sub.task];
      s.notices = o.notices; s.decided = o.decided; s.works = o.works;
    }, { silent: true });
  }
  function currentSub() { const c = App.current; if (!c || c.role !== 'admin') return null; return S().submissions.find((x) => x.id === ED.id) || null; }
  function decide(how, reason) {
    const sub = currentSub();
    if (!sub || sub.status !== 'waiting') return;
    const route = App.current;
    const f = route.query.f || 'waiting', v = route.query.v || 'all';
    const q = qs(route);
    const before = queue(f, v);
    const idx = before.findIndex((x) => x.id === sub.id);
    const snap = snapshot(sub);
    const text = how === 'ok' ? draftOf(sub) : ED.text;
    const shown = ED.shown[sub.id] || defaultShown(sub);
    const t = A.task(sub.task);
    Store.update((s) => {
      const x = s.submissions.find((y) => y.id === sub.id);
      const at = nowISO();
      x.status = how === 'hold' ? 'held' : 'sent';
      x.decision = how; x.decidedAt = at; x.fresh = false;
      x.reply = how === 'hold' ? null : text;
      x.shown = how === 'hold' ? null : shown;
      x.reason = reason || null;
      s.decided = (s.decided || []).concat([{ id: x.id, how, at, verdict: x.ai.verdict }]);
      if (how !== 'hold' && x.learner === s.me) {
        (s.chats[x.task] = s.chats[x.task] || []).push({ from: 'ops', at, who: `運営（${K.OPS.name}）`, text });
        const ts = s.tasks[x.task] = Object.assign({ checks: [] }, s.tasks[x.task] || {});
        ts.status = shown === 'ok' ? 'ok' : 'fix';
        if (shown === 'ok') ts.okAt = at;
        ts.unread = true;
        s.notices.unshift({ id: Core.uid('n'), type: 'reply', at, title: '運営から返事がとどきました', body: t ? t.title : '', go: `#/learner/task/${x.task}?tab=chat`, unread: true });
        if (shown === 'ok' && t && !s.works.some((w) => w.task === x.task)) {
          s.works.unshift({ id: Core.uid('w'), task: x.task, title: t.title, kind: x.kind === 'image' ? 'banner' : x.kind === 'video' ? 'video' : x.kind === 'text' ? 'sns' : 'blog', genre: t.genre === 'design' ? 'design' : 'web', at, status: 'ok', note: x.message || '指示書のとおりに作りました。', comment: text.split('\n').filter(Boolean).slice(1, 2).join('') || text.split('\n')[0], hue: 180 + (A.hash(x.id) % 160) });
        }
      }
    }, { silent: true });
    const u = A.person(sub.learner);
    const msg = how === 'hold' ? `${u.name}さんの提出を「出さない」にしました（返事は送っていません）` : `${u.name}さんに返事を送りました（${how === 'ok' ? 'OK' : '直してOK'}）`;
    UI.toast(msg, { icon: how === 'hold' ? 'x' : 'send', action: '取り消す', onAction: () => { restore(snap); ED.id = null; App.go(`#/admin/review/${sub.id}${q}`); App.render(); UI.toast('取り消しました', { icon: 'undo' }); } });
    const after = queue(f, v);
    const next = after[Math.min(Math.max(idx, 0), after.length - 1)];
    ED.id = null;
    const narrow = !window.matchMedia('(min-width: 760px)').matches;
    if (next) App.go(`#/admin/review/${next.id}${q}`);
    else App.go(`#/admin/review${q}`);
    if (!next && f === 'waiting' && v === 'all') setTimeout(() => UI.confetti(), 200);
    if (narrow && !next) App.go(`#/admin/review${q}`);
  }
  act('ad-ok', (el) => {
    const sub = currentSub(); if (!sub) return;
    if (ED.editing && ED.text !== draftOf(sub)) { UI.toast('文を直しています。「直してOK」で送ってください', { icon: 'info' }); return; }
    decide('ok');
  });
  act('ad-fix', () => {
    const sub = currentSub(); if (!sub) return;
    if (!ED.editing) {
      ED.editing = true; redrawDraftUI();
      const ta = document.querySelector('#ad-draft');
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      UI.toast('下書きを直せます。直したら もう一度「直してOK」', { icon: 'edit' });
      return;
    }
    if (!ED.text.trim()) { UI.toast('返事が からっぽです', { icon: 'info' }); return; }
    decide('fixok');
  });
  act('ad-hold', () => {
    const sub = currentSub(); if (!sub) return;
    UI.sheet({
      title: '出さないにしますか？', icon: ic('x'), iconCls: 'warn',
      body: html`<p class="ink2">返事は送りません。利用者には何も とどきません。理由をえらんでください。</p>
        <div class="stack-sm">${['同じものが2回目', '出す場所のまちがい', '個人情報の心配', 'ほかの方法で伝える（職員さん経由など）'].map((r, i) => html`<label class="checkline"><input type="radio" name="ad-reason" value="${r}" ${i === 0 ? 'checked' : ''}><span class="cl-box">${ic('check')}</span><span class="cl-text">${r}</span></label>`)}</div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-lg btn-danger" type="button" data-yes>${ic('x')}<span>出さない</span></button>`,
      mount: (sh, close) => {
        sh.querySelectorAll('.checkline input').forEach((r) => r.addEventListener('change', () => sh.querySelectorAll('.checkline').forEach((l) => l.classList.toggle('is-done', l.querySelector('input').checked))));
        sh.querySelector('.checkline').classList.add('is-done');
        sh.querySelector('[data-yes]').addEventListener('click', () => { const r = sh.querySelector('input[name="ad-reason"]:checked'); close(); decide('hold', r ? r.value : ''); });
      }
    });
  });
  act('ad-reopen', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { const x = s.submissions.find((y) => y.id === id); if (x) { x.status = 'waiting'; x.decision = null; x.reason = null; x.decidedAt = null; } });
    App.go(`#/admin/review/${id}`);
    UI.toast('確認待ちにもどしました', { icon: 'undo' });
  });
  document.addEventListener('keydown', (e) => {
    const cur = App.current;
    if (!cur || cur.role !== 'admin' || cur.parts[0] !== 'review') return;
    if (document.querySelector('.sheet-wrap')) return;
    const a = document.activeElement;
    const typing = a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.isContentEditable);
    const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); };
    if (typing) {
      if (a.id === 'ad-draft' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); click('[data-act="ad-fix"]'); }
      else if (a.id === 'ad-draft' && e.key === 'Escape') a.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === '1') { e.preventDefault(); click('[data-act="ad-ok"]'); }
    else if (k === '2') { e.preventDefault(); click('[data-act="ad-fix"]'); }
    else if (k === '3') { e.preventDefault(); click('[data-act="ad-hold"]'); }
    else if (k === 'e') { e.preventDefault(); if (!ED.editing) click('[data-act="ad-fix"]'); else { const ta = document.querySelector('#ad-draft'); if (ta) ta.focus(); } }
    else if (k === 'j' || k === 'k') {
      e.preventDefault();
      const f = cur.query.f || 'waiting', v = cur.query.v || 'all';
      const list = queue(f, v);
      const i = list.findIndex((x) => x.id === ED.id);
      const n = list[Math.min(Math.max(i + (k === 'j' ? 1 : -1), 0), list.length - 1)];
      if (n) App.go(`#/admin/review/${n.id}${qs(cur)}`);
    }
  });

  /* ---------- 配信（課題・授業・教材） ---------- */
  function subCount(taskId) { return 4 + (A.hash(taskId) % 24) + S().submissions.filter((x) => x.task === taskId).length; }
  function dueOf(t) { const fx = (S().adFix || {})[t.id]; return fx ? fx + 'T23:59:00+09:00' : t.due; }
  function pageDeliver(route) {
    const tab = ['task', 'class', 'mat'].includes(route.query.tab) ? route.query.tab : 'task';
    return {
      title: '配信', nav: 'deliver', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>配信</h1><p class="lead">課題・授業・教材を とどけます。カタログの気になる所も ここで直せます。</p></div>
          <div class="ph-actions"><a class="btn btn-primary btn-lg" href="#/admin/deliver/new">${ic('plus')}<span>課題を新しく作る</span></a></div></div>
        <div class="tabs" role="tablist">${[['task', '課題', 'clipboard'], ['class', '授業LIVE', 'live'], ['mat', '教材', 'book']].map(([k, n, i]) => html`<a role="tab" href="#/admin/deliver?tab=${k}" aria-selected="${B(tab === k)}">${ic(i)}${n}</a>`)}</div>
        ${tab === 'task' ? deliverTasks() : tab === 'class' ? deliverClass() : deliverMat()}
      </div>`
    };
  }
  function deliverTasks() {
    const blog = K.ALL_TASKS.filter((t) => t.group === 'blog-2026-10');
    const lvs = ['beginner', 'middle', 'advanced'], ms = ['studio', 'ai', 'image'];
    const fixes = S().adFix || {};
    const monthly = K.ALL_TASKS.filter((t) => t.kind === 'monthly' && t.month === '2026-10');
    const byG = groupBy(monthly, (t) => t.genre);
    const extra = S().extraTasks;
    const issueIds = C.issues.map((x) => x.taskId);
    return html`<div class="stack-lg">
      ${extra.length ? html`<section class="card card-pad sec"><div class="sec-head"><h2>${ic('sparkles')}新しく作った課題</h2><span class="chip chip-ok">${extra.length}つ 配信中</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>題名</th><th>級</th><th>作り方</th><th>公開</th><th>締め切り</th><th>とどける先</th></tr></thead><tbody>${extra.map((t) => html`<tr><td><b>${t.title}</b></td><td>${A.lv(t.level)}</td><td>${t.method ? K.METHODS[t.method].short : '—'}</td><td class="num">${fmt.md(t.publish)}</td><td class="num">${fmt.md(t.due)}</td><td>${t.to === 'some' ? `${(t.facs || []).length}事業所` : '全員'}</td></tr>`)}</tbody></table></div></section>` : ''}
      <section class="card card-pad sec">
        <div class="sec-head"><h2>${ic('grid')}10月のブログ記事（作り方 × 級 = ${blog.length}つ）</h2><span class="small muted">公開 10/21</span></div>
        <div class="ad-mx-list hide-pc">${lvs.map((lv) => html`<div class="ad-mxl-group"><div class="ad-mxl-head">${A.lv(lv)}<b>${K.THEMES[lv].short}</b></div>
          ${ms.map((m) => { const t = blog.find((x) => x.method === m && x.level === lv); if (!t) return ''; const bad = issueIds.includes(t.id) && !fixes[t.id]; return html`<div class="ad-mxl-row ${bad ? 'is-bad' : ''}"><span class="ad-mxl-m">${ic(K.METHODS[m].icon)}${K.METHODS[m].short.replace('版', '')}</span><span class="grow"><b>${t.title}</b><span class="xsmall muted">締め切り ${fmt.md(dueOf(t))}・提出 ${subCount(t.id)}</span>${bad ? html`<button class="ad-warn-badge" type="button" data-act="ad-fix-due" data-id="${t.id}">${ic('alert')}締め切りが公開日より前 → 10/31にする</button>` : ''}</span></div>`; })}</div>`)}</div>
        <div class="ad-mx-wrap hide-sp"><table class="ad-mx">
          <thead><tr><th></th>${lvs.map((lv) => html`<th>${A.lv(lv)}<span class="ad-mx-theme">${K.THEMES[lv].short}</span></th>`)}</tr></thead>
          <tbody>${ms.map((m) => html`<tr><th scope="row">${ic(K.METHODS[m].icon)}${K.METHODS[m].name}</th>${lvs.map((lv) => {
            const t = blog.find((x) => x.method === m && x.level === lv);
            if (!t) return html`<td></td>`;
            const bad = issueIds.includes(t.id) && !fixes[t.id];
            return html`<td><div class="ad-mx-cell ${bad ? 'is-bad' : ''}"><b class="clamp-2">${t.title}</b>
              <span class="xsmall muted">締め切り ${fmt.md(dueOf(t))}・提出 ${subCount(t.id)}</span>
              ${bad ? html`<button class="ad-warn-badge" type="button" data-act="ad-fix-due" data-id="${t.id}">${ic('alert')}締め切りが公開日より前 → 10/31にする</button>` : (issueIds.includes(t.id) ? html`<span class="chip chip-ok">${ic('check')}締め切りを直しました</span>` : '')}</div></td>`;
          })}</tr>`)}</tbody></table></div>
      </section>
      <section class="card card-pad sec"><div class="sec-head"><h2>${ic('clipboard')}10月の指示書</h2><span class="small muted">締め切り 10/31・とどける先 全員</span></div>
        <div class="ad-mlist hide-pc">${Array.from(byG.entries()).map(([g, list]) => html`<div class="ad-mlist-g"><div class="ad-mlist-head">${A.gmark(g, true)}<b>${K.GENRES[g].name}</b></div>${list.map((t) => html`<div class="ad-mlist-row"><span class="grow"><b>${t.title}</b><span class="xsmall muted">もと：${t.src}</span></span>${A.lv(t.level)}<span class="chip">提出 ${subCount(t.id)}</span></div>`)}</div>`)}</div>
        <div class="table-wrap hide-sp"><table class="table ad-mt"><thead><tr><th>ジャンル</th><th>題名（画面での見せ方）</th><th>級</th><th class="num">提出</th><th class="hide-sp">もとの題名</th></tr></thead>
          <tbody>${Array.from(byG.entries()).map(([g, list]) => list.map((t, i) => html`<tr>${i === 0 ? html`<td rowspan="${list.length}" class="ad-g-cell">${A.gmark(g, true)}<b>${K.GENRES[g].name}</b></td>` : ''}<td><b>${t.title}</b></td><td>${A.lv(t.level) || html`<span class="muted xsmall">—</span>`}</td><td class="num">${subCount(t.id)}</td><td class="hide-sp xsmall muted">${t.src}${t.src.replace(/[\s\u3000]/g, '').replace('１', '1') !== t.title.replace(/\s/g, '') ? html`<span class="chip ad-mini-chip">表記をそろえた</span>` : ''}</td></tr>`))}</tbody></table></div></section>
      <section class="card card-pad sec"><div class="sec-head"><h2>${ic('school')}はじめてコース（新しく来た人むけ）</h2></div>
        <ol class="rows ad-start">${C.start.map((s) => html`<li class="row-item"><span class="ep-no">${s.step}</span><span><span class="ri-title">${s.title.replace('（報酬・納品なし）', '')}</span><span class="ri-sub">${s.practiceCase ? '模擬案件（練習用・納品なし）' : '練習'}</span>${s.count >= 3 ? html`<span class="chip chip-warn ad-dup-chip">${ic('copy')}同じ題名が ${s.count}件（下書き・体験用）</span>` : ''}</span><span class="ri-end"></span></li>`)}</ol></section>
    </div>`;
  }
  function deliverClass() {
    const wd = jst(Clock.now()).wd;
    const days = ['', '月', '火', '水', '木', '金'];
    const byG = groupBy(C.archives, (a) => a.genre);
    const ls = livePeriods();
    return html`<div class="stack-lg">
      <section class="card card-pad sec"><div class="sec-head"><h2>${ic('calendar')}授業LIVEの時間割（平日 10:10から）</h2><button class="btn btn-sm" type="button" data-act="noop">${ic('edit')}<span>時間割を変える</span></button></div>
        <div class="ad-tt-wrap"><table class="ad-tt"><thead><tr><th></th>${[1, 2, 3, 4, 5].map((d) => html`<th class="${d === wd ? 'is-today' : ''}">${days[d]}${d === wd ? html`<span class="chip chip-live">きょう</span>` : ''}</th>`)}</tr></thead>
          <tbody>${K.PERIODS.map((p) => html`<tr class="${p.rest ? 'is-rest' : ''}"><th scope="row"><b>${p.name}</b><span class="xsmall muted">${p.start}〜${p.end}</span></th>${[1, 2, 3, 4, 5].map((d) => {
            if (p.rest) return html`<td class="${d === wd ? 'is-today' : ''}"><span class="xsmall muted">お昼休み</span></td>`;
            const g = K.TIMETABLE[d][p.key]; const G = K.GENRES[g];
            const isNow = d === wd && ls.current && ls.current.key === p.key;
            return html`<td class="${d === wd ? 'is-today' : ''}"><span class="ad-tt-cell ${G.cls} ${isNow ? 'is-now' : ''}">${ic(G.icon)}<span><b>${G.name}</b><small>${K.TEACHERS[g]}</small></span>${isNow ? html`<em>LIVE中</em>` : ''}</span></td>`;
          })}</tr>`)}</tbody></table></div></section>
      <div class="grid-2">
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('live')}きょうの配信</h2></div>
          <ul class="rows">${ls.list.map((p) => { const st = Clock.now() >= p.endAt ? 'done' : Clock.now() >= p.startAt ? 'now' : 'soon'; return html`<li class="row-item">${A.gmark(p.genre, true)}<span><span class="ri-title">${K.GENRES[p.genre].name} 授業LIVE</span><span class="ri-sub">${p.name} ${p.start}〜${p.end}・${K.TEACHERS[p.genre]}・${K.LIVE_TOPICS[p.genre]}</span></span><span class="ri-end">${st === 'now' ? html`<span class="chip chip-live">配信中</span>` : st === 'done' ? html`<span class="chip">アーカイブへ</span>` : html`<span class="chip chip-info">これから</span>`}</span></li>`; })}</ul></section>
        <section class="card card-pad sec"><div class="sec-head"><h2>${ic('film')}アーカイブ（9月から）</h2><span class="small muted">LIVEの日 ${C.liveDays.length}日</span></div>
          <ul class="rows">${['web', 'design', 'video', 'sns'].map((g) => { const list = byG.get(g) || []; return html`<li class="row-item">${A.gmark(g, true)}<span><span class="ri-title">${K.GENRES[g].name}</span><span class="ri-sub">さいごの配信 ${list[0] ? fmt.date(list[0].date + 'T12:00:00+09:00') : '—'}</span></span><span class="ri-end"><b>${list.length}</b>本</span></li>`; })}</ul></section>
      </div>
    </div>`;
  }
  function deliverMat() {
    const st = C.stats;
    return html`<div class="stack-lg">
      <div class="stats" style="--cols:4">
        <div class="stat"><span class="st-label">${ic('book')}教材の動画</span><span class="st-value">${st.materials}<small>本</small></span><span class="st-sub">シリーズ ${C.series.length}こ</span></div>
        <div class="stat"><span class="st-label">${ic('film')}アーカイブ</span><span class="st-value">${st.archives.toLocaleString()}<small>本</small></span><span class="st-sub">おわった授業の録画</span></div>
        <div class="stat"><span class="st-label">${ic('live')}授業LIVE</span><span class="st-value">${st.lives}<small>回</small></span><span class="st-sub">5ジャンル × ${C.liveDays.length}日</span></div>
        <div class="stat"><span class="st-label">${ic('clipboard')}課題</span><span class="st-value">${st.tasks}<small>件</small></span><span class="st-sub">下書き・体験用をふくむ</span></div>
      </div>
      <section class="card sec ad-series"><div class="sec-head card-head"><h2>${ic('layers')}シリーズ</h2><button class="btn btn-sm" type="button" data-act="noop">${ic('upload')}<span>動画を足す</span></button></div>
        <div class="table-wrap ad-flat"><table class="table"><thead><tr><th>シリーズ</th><th>ジャンル</th><th class="num">本数</th><th class="num">合計時間</th><th>公開</th></tr></thead>
          <tbody>${C.series.map((s) => { const known = s.episodes.filter((e) => e.dur); const mins = sum(known, (e) => e.dur); return html`<tr><td><b>${s.title}</b><span class="xsmall muted ad-block">${s.sub}${s.app ? `・${s.app}` : ''}</span></td><td><span class="row" style="gap:8px">${A.gmark(s.genre, true)}${K.GENRES[s.genre].name}</span></td><td class="num">${s.episodes.length}</td><td class="num">${known.length === s.episodes.length ? fmt.dur(mins) : known.length ? `${fmt.dur(mins)}＋` : html`<span class="muted">—</span>`}</td><td><span class="chip chip-ok">${ic('check')}公開中</span></td></tr>`; })}</tbody></table></div>
        <p class="xsmall muted ad-note">「—」は カタログに長さが入っていない（60分のまま）教材です。</p></section>
    </div>`;
  }

  /* ---------- 課題を新しく作る（ウィザード） ---------- */
  let WZ = null;
  function wzInit() {
    WZ = { step: 1, name: '11月のブログ記事', genre: 'web',
      themes: { beginner: 'データ入力ってどんな仕事？', middle: '写真で伝えるお店の紹介', advanced: 'イベントの流れを図で伝える' },
      mins: { beginner: 60, middle: 90, advanced: 120 },
      cells: {}, summary: ['STUDIOで、記事のページを1つ作ります。', '見出しと写真を入れます。', 'できたら、ページのURLを出します。'],
      checks: ['タイトルが指示書と同じになっている', '見出しが3つある', 'スマホで見ても、文字がはみ出さない'],
      submit: 'url', publish: '2026-10-26', due: '2026-11-30', to: 'all', facs: [] };
    ['studio', 'ai', 'image'].forEach((m) => ['beginner', 'middle', 'advanced'].forEach((lv) => { WZ.cells[`${m}:${lv}`] = true; }));
  }
  const WZ_STEPS = ['まとまり', '作り方 × 級', '指示書', 'とどける日・先', '確認'];
  function wzTasks() {
    const out = [];
    ['studio', 'ai', 'image'].forEach((m) => ['beginner', 'middle', 'advanced'].forEach((lv) => {
      if (!WZ.cells[`${m}:${lv}`]) return;
      out.push({ m, lv, title: `${WZ.themes[lv] || K.LEVELS[lv].name}（${K.METHODS[m].short}）` });
    }));
    return out;
  }
  function wzErr() {
    if (WZ.step === 1 && !WZ.name.trim()) return 'まとまりの名前を入れてください';
    if (WZ.step === 2 && !wzTasks().length) return '少なくとも1つ えらんでください';
    if (WZ.step === 3 && (!WZ.summary.some((x) => x.trim()) || !WZ.checks.some((x) => x.trim()))) return '「やること」と「チェック項目」を1つ以上 入れてください';
    if (WZ.step === 4) {
      if (!WZ.publish || !WZ.due) return '公開日と締め切りを入れてください';
      if (WZ.due < WZ.publish) return '締め切りが公開日より前になっています';
      if (WZ.to === 'some' && !WZ.facs.length) return 'とどける事業所を えらんでください';
    }
    return '';
  }
  function pageNew() {
    if (!WZ) wzInit();
    const st = WZ.step;
    const err = wzErr();
    let body;
    if (st === 1) {
      body = html`<div class="stack">
        <div class="field"><label class="label" for="wz-name">まとまりの名前</label><input class="input" id="wz-name" data-input="ad-wz" data-k="name" value="${WZ.name}"><span class="hint">利用者の画面で、課題をまとめる名前になります</span></div>
        <div class="field"><span class="label">ジャンル</span><div class="cluster">${['web', 'design', 'video', 'sns', 'ai'].map((g) => html`<button class="fchip" type="button" data-act="ad-wz-set" data-k="genre" data-v="${g}" aria-pressed="${B(WZ.genre === g)}">${K.GENRES[g].name}</button>`)}</div></div>
        <div class="field"><span class="label">級ごとのテーマと目安の時間</span>
          <div class="stack-sm">${['beginner', 'middle', 'advanced'].map((lv) => html`<div class="ad-wz-theme">${A.lv(lv)}<input class="input grow" data-input="ad-wz" data-k="themes.${lv}" value="${WZ.themes[lv]}" aria-label="${K.LEVELS[lv].name}のテーマ"><span class="ad-wz-min"><input class="input" type="number" min="10" step="10" data-input="ad-wz" data-k="mins.${lv}" value="${WZ.mins[lv]}" aria-label="${K.LEVELS[lv].name}の目安（分）"><span class="xsmall muted">分</span></span></div>`)}</div></div>
      </div>`;
    } else if (st === 2) {
      const n = wzTasks().length;
      body = html`<div class="stack">
        <p class="ink2">えらんだ数だけ、課題が<b>まとめて</b>できます。いまは <b>${n}つ</b>。</p>
        <div class="ad-mx-wrap"><table class="ad-mx ad-pick">
          <thead><tr><th></th>${['beginner', 'middle', 'advanced'].map((lv) => html`<th>${A.lv(lv)}<span class="ad-mx-theme">${WZ.themes[lv]}</span></th>`)}</tr></thead>
          <tbody>${['studio', 'ai', 'image'].map((m) => html`<tr><th scope="row">${ic(K.METHODS[m].icon)}${K.METHODS[m].name}</th>${['beginner', 'middle', 'advanced'].map((lv) => html`<td><label class="ad-pick-cell ${WZ.cells[`${m}:${lv}`] ? 'is-on' : ''}"><input type="checkbox" data-change="ad-wz-cell" data-c="${m}:${lv}" ${WZ.cells[`${m}:${lv}`] ? 'checked' : ''}><span class="ad-pick-box">${ic('check')}</span><span class="xsmall">${WZ.cells[`${m}:${lv}`] ? '作る' : '作らない'}</span></label></td>`)}</tr>`)}</tbody></table></div>
        <div class="cluster"><button class="btn btn-sm" type="button" data-act="ad-wz-all" data-v="1">${ic('check')}<span>ぜんぶ</span></button><button class="btn btn-sm btn-ghost" type="button" data-act="ad-wz-all" data-v="0">${ic('x')}<span>ぜんぶ外す</span></button></div>
      </div>`;
    } else if (st === 3) {
      const all = WZ.summary.concat(WZ.checks).join('\n');
      body = html`<div class="stack">
        <div class="field"><span class="label">やること（3行くらい）</span>${WZ.summary.map((x, i) => html`<input class="input" data-input="ad-wz" data-k="summary.${i}" value="${x}" aria-label="やること ${i + 1}">`)}</div>
        <div class="field"><span class="label">できたらチェック（利用者が出す前に見る）</span>
          ${WZ.checks.map((x, i) => html`<div class="row"><input class="input grow" data-input="ad-wz" data-k="checks.${i}" value="${x}" aria-label="チェック ${i + 1}"><button class="icon-btn" type="button" data-act="ad-wz-rmcheck" data-i="${i}" aria-label="けす">${ic('trash')}</button></div>`)}
          <button class="btn btn-sm btn-ghost" type="button" data-act="ad-wz-addcheck">${ic('plus')}<span>チェックを足す</span></button></div>
        <div class="field"><span class="label">出し方</span><div class="cluster">${[['url', 'URL'], ['image', '画像'], ['video', '動画'], ['text', '文']].map(([k, n]) => html`<button class="fchip" type="button" data-act="ad-wz-set" data-k="submit" data-v="${k}" aria-pressed="${B(WZ.submit === k)}">${ic(A.kindIcon[k])}${n}</button>`)}</div></div>
        <div data-wz-easy>${easyPanel(all, 'wizard')}</div>
      </div>`;
    } else if (st === 4) {
      body = html`<div class="stack">
        <div class="grid-2"><div class="field"><label class="label" for="wz-pub">公開日</label><input class="input" id="wz-pub" type="date" data-change="ad-wz-date" data-k="publish" value="${WZ.publish}"></div>
        <div class="field"><label class="label" for="wz-due">締め切り</label><input class="input" id="wz-due" type="date" data-change="ad-wz-date" data-k="due" value="${WZ.due}"></div></div>
        ${WZ.due && WZ.publish && WZ.due < WZ.publish ? html`<div class="banner bad">${ic('alert')}<span class="b-text">締め切りが公開日より前です<p>カタログにも同じまちがいが3つありました。ここでは先に止めます。</p></span></div>` : html`<div class="banner ok">${ic('checkc')}<span class="b-text">公開から締め切りまで ${Math.round((new Date(WZ.due) - new Date(WZ.publish)) / 864e5)}日あります</span></div>`}
        <div class="field"><span class="label">とどける先</span><div class="seg" role="group">${[['all', '全員（全事業所）'], ['some', '事業所をえらぶ']].map(([k, n]) => html`<button type="button" data-act="ad-wz-set" data-k="to" data-v="${k}" aria-selected="${B(WZ.to === k)}">${n}</button>`)}</div></div>
        ${WZ.to === 'some' ? html`<div class="ad-fac-pick">${S().facilities.map((f) => html`<label class="ad-fp"><input type="checkbox" data-change="ad-wz-fac" data-id="${f.id}" ${WZ.facs.includes(f.id) ? 'checked' : ''}><span>${f.name}</span><span class="xsmall muted">${f.learners}人</span></label>`)}</div>` : ''}
      </div>`;
    } else {
      const list = wzTasks();
      body = html`<div class="stack">
        <div class="banner">${ic('info')}<span class="b-text">「${WZ.name}」として <b>${list.length}つ</b>の課題を配信します<p>公開 ${fmt.date(WZ.publish + 'T12:00:00+09:00')} ・ 締め切り ${fmt.date(WZ.due + 'T12:00:00+09:00')} ・ ${WZ.to === 'all' ? '全員' : `${WZ.facs.length}事業所`}</p></span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>題名</th><th>級</th><th>作り方</th><th class="num">目安</th></tr></thead><tbody>${list.map((x) => html`<tr><td><b>${x.title}</b></td><td>${A.lv(x.lv)}</td><td>${K.METHODS[x.m].short}</td><td class="num">${WZ.mins[x.lv]}分</td></tr>`)}</tbody></table></div>
        <div class="card card-soft card-pad stack-sm"><b>${ic('file')} 指示書（${WZ.summary.filter(Boolean).length}行・チェック${WZ.checks.filter(Boolean).length}こ）</b><ol class="ad-checks">${WZ.summary.filter(Boolean).map((x) => html`<li>${x}</li>`)}</ol></div>
      </div>`;
    }
    return {
      title: '課題を新しく作る', nav: 'deliver', back: '#/admin/deliver',
      html: html`<div class="page ad-wz">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">配信</span><h1>課題を新しく作る</h1><p class="lead">「作り方 × 級」を表でえらぶと、まとめて作れます。</p></div></div>
        <div class="steps ad-wz-steps" style="--n:5">${WZ_STEPS.map((n, i) => html`<button class="step ${i + 1 < st ? 'done' : i + 1 === st ? 'now' : ''}" type="button" data-act="ad-wz-go" data-s="${i + 1}"><span class="st-dot">${i + 1 < st ? ic('check') : i + 1}</span><span>${n}</span></button>`)}</div>
        <section class="card card-pad sec"><div class="sec-head"><h2>${st}. ${WZ_STEPS[st - 1]}</h2></div>${body}</section>
        ${err && st !== 4 ? html`<p class="small ad-warn-text">${ic('info')}${err}</p>` : ''}
        <div class="ad-wz-foot">
          ${st > 1 ? html`<button class="btn btn-lg" type="button" data-act="ad-wz-prev">${ic('left')}<span>もどる</span></button>` : html`<a class="btn btn-lg btn-ghost" href="#/admin/deliver">やめる</a>`}
          <span class="grow"></span>
          ${st < 5 ? html`<button class="btn btn-primary btn-lg" type="button" data-act="ad-wz-next" ${err ? raw('aria-disabled="true"') : ''}><span>つぎへ</span>${ic('right')}</button>`
            : html`<button class="btn btn-primary btn-lg" type="button" data-act="ad-wz-publish">${ic('send')}<span>${wzTasks().length}つ 配信する</span></button>`}
        </div>
      </div>`
    };
  }
  function wzSetPath(k, v) { const parts = k.split('.'); if (parts.length === 1) WZ[k] = v; else WZ[parts[0]][parts[1]] = v; }
  act('ad-wz', (el) => {
    const k = el.getAttribute('data-k');
    const v = el.type === 'number' ? Number(el.value) : el.value;
    wzSetPath(k, v);
    if (WZ.step === 3) { const box = document.querySelector('[data-wz-easy]'); if (box) box.innerHTML = Core.toHtml(easyPanel(WZ.summary.concat(WZ.checks).join('\n'), 'wizard')); }
  });
  act('ad-wz-set', (el) => { WZ[el.getAttribute('data-k')] = el.getAttribute('data-v'); App.render({ keepScroll: true }); });
  act('ad-wz-cell', (el) => { WZ.cells[el.getAttribute('data-c')] = el.checked; App.render({ keepScroll: true }); });
  act('ad-wz-all', (el) => { const on = el.getAttribute('data-v') === '1'; Object.keys(WZ.cells).forEach((k) => { WZ.cells[k] = on; }); App.render({ keepScroll: true }); });
  act('ad-wz-date', (el) => { WZ[el.getAttribute('data-k')] = el.value; App.render({ keepScroll: true }); });
  act('ad-wz-fac', (el) => { const id = el.getAttribute('data-id'); WZ.facs = el.checked ? WZ.facs.concat([id]) : WZ.facs.filter((x) => x !== id); App.render({ keepScroll: true }); });
  act('ad-wz-addcheck', () => { WZ.checks.push(''); App.render({ keepScroll: true }); });
  act('ad-wz-rmcheck', (el) => { WZ.checks.splice(Number(el.getAttribute('data-i')), 1); App.render({ keepScroll: true }); });
  act('ad-wz-go', (el) => { const s = Number(el.getAttribute('data-s')); if (s < WZ.step) { WZ.step = s; App.render(); } else if (s > WZ.step && !wzErr()) { WZ.step = Math.min(s, WZ.step + 1); App.render(); } });
  act('ad-wz-prev', () => { WZ.step = Math.max(1, WZ.step - 1); App.render(); });
  act('ad-wz-next', () => { const e = wzErr(); if (e) { UI.toast(e, { icon: 'info' }); return; } WZ.step = Math.min(5, WZ.step + 1); App.render(); });
  function wzEasyRep(i) {
    WZ.summary = WZ.summary.map((x) => easyApply(x, i));
    WZ.checks = WZ.checks.map((x) => easyApply(x, i));
    App.render({ keepScroll: true });
    UI.toast(`「${EASY[i].word}」を「${EASY[i].sugg}」に置きかえました`, { icon: 'textsize' });
  }
  act('ad-wz-publish', () => {
    const list = wzTasks();
    const group = 'new-' + Core.uid('g');
    const sublabel = { url: 'ページのURL', image: '画像のファイル', video: '動画のファイル', text: '文' }[WZ.submit];
    const created = list.map((x) => ({
      id: Core.uid('task-new'), src: x.title, title: x.title, kind: 'new', group, groupName: WZ.name,
      genre: x.m === 'image' ? 'design' : x.m === 'ai' ? 'ai' : WZ.genre, level: x.lv, method: x.m, theme: WZ.themes[x.lv],
      month: '2026-11', publish: `${WZ.publish}T09:00:00+09:00`, due: `${WZ.due}T23:59:00+09:00`, mins: WZ.mins[x.lv], to: WZ.to, facs: WZ.facs.slice(),
      instr: { summary: WZ.summary.filter((s) => s.trim()), checks: WZ.checks.filter((s) => s.trim()), submit: { type: WZ.submit, label: sublabel }, steps: [], materials: [], sample: x.m === 'image' ? 'banner' : 'blog' }
    }));
    const reach = WZ.to === 'all' || WZ.facs.includes('f-hidamari');
    Store.update((s) => {
      s.extraTasks = created.concat(s.extraTasks || []);
      if (reach) s.notices.unshift({ id: Core.uid('n'), type: 'task', at: nowISO(), title: '新しい課題がとどきました', body: `${WZ.name}（${created.length}つ）`, go: '#/learner/tasks', unread: true });
    }, { silent: true });
    UI.toast(`${created.length}つの課題を配信しました${reach ? '（ひだまりラボの利用者にも とどきました）' : ''}`, { icon: 'send' });
    WZ = null;
    App.go('#/admin/deliver');
  });

  /* ---------- 案件ボード ---------- */
  const JOB_ST = { open: ['募集中', 'chip-ok'], soon: ['しめきり近い', 'chip-warn'], prep: ['準備中', ''], closed: ['しめきり', ''] };
  function jobStatus(j) { if (j.practice) return html`<span class="chip chip-info">練習用</span>`; const [n, c] = JOB_ST[j.status] || JOB_ST.open; return html`<span class="chip ${c}">${n}</span>`; }
  function pageJobs(route) {
    const f = route.query.f || 'all';
    const jobs = S().jobs.filter((j) => f === 'all' || (f === 'practice' ? j.practice : (j.status === f && !j.practice)));
    return {
      title: '案件ボード', nav: 'jobs', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>案件ボード</h1><p class="lead">利用者が「やってみたい」と手をあげた人を見て、お願いする人を決めます。</p></div>
          <div class="ph-actions"><button class="btn btn-primary btn-lg" type="button" data-act="ad-job-new">${ic('plus')}<span>新しい案件</span></button></div></div>
        <div class="filters">${[['all', 'ぜんぶ'], ['open', '募集中'], ['soon', 'しめきり近い'], ['prep', '準備中'], ['practice', '練習用']].map(([k, n]) => html`<a class="fchip" href="#/admin/jobs?f=${k}" aria-pressed="${B(f === k)}">${n}</a>`)}</div>
        <div class="ad-jobs">${jobs.map((j) => { const as = j.assigned ? A.person(j.assigned) : null; return html`<a class="card ad-job" href="#/admin/job/${j.id}">
          <span class="ad-job-top">${A.gmark(j.genre)}<span class="grow"><span class="cluster">${jobStatus(j)}${as ? html`<span class="chip chip-ok">${ic('usercheck')}${as.name}さんにお願い</span>` : ''}</span><b class="ad-job-title">${j.title}</b><span class="small muted">${j.client}</span></span></span>
          <span class="ad-job-meta"><span>${ic('package')}${j.amount}</span><span>${ic('calendar')}${j.period}</span><span>${ic('target')}${j.need.text}</span></span>
          <span class="ad-job-foot"><span class="ad-avs">${j.applicants.slice(0, 5).map((id) => A.av(A.person(id), 'sm'))}</span><span class="small bold">${j.applicants.length ? `手をあげた人 ${j.applicants.length}人` : 'まだ だれも手をあげていません'}</span><span class="grow"></span>${ic('right')}</span>
        </a>`; })}</div>
        <p class="small muted">${ic('info')} 利用者の画面では、お金のことは出しません。内容・期間・条件だけを見せています。</p>
      </div>`
    };
  }
  function pageJob(route) {
    const j = S().jobs.find((x) => x.id === route.params.id);
    if (!j) return { title: '案件', back: '#/admin/jobs', html: html`<div class="empty card">見つかりませんでした</div>` };
    const people = j.applicants.map(A.person);
    return {
      title: j.title, topTitle: '案件', nav: 'jobs', back: '#/admin/jobs',
      html: html`<div class="page">
        <section class="card card-pad stack">
          <div class="cluster">${A.gmark(j.genre, true)}${jobStatus(j)}<span class="chip">${K.GENRES[j.genre] ? K.GENRES[j.genre].name : ''}</span></div>
          <h1 class="ad-job-h1">${j.title}</h1>
          <dl class="ad-dl"><div><dt>たのむ人</dt><dd>${j.client}</dd></div><div><dt>量</dt><dd>${j.amount}</dd></div><div><dt>期間</dt><dd>${j.period}</dd></div><div><dt>条件</dt><dd>${j.need.text}</dd></div></dl>
          ${j.note ? html`<p class="ink2">${j.note}</p>` : ''}
          <div class="field"><span class="label">ようす</span><div class="seg" role="group">${[['open', '募集中'], ['soon', 'しめきり近い'], ['prep', '準備中'], ['closed', 'しめきり']].map(([k, n]) => html`<button type="button" data-act="ad-job-st" data-id="${j.id}" data-v="${k}" aria-selected="${B(j.status === k)}">${n}</button>`)}</div></div>
        </section>
        <section class="sec"><div class="sec-head"><h2>${ic('hand')}手をあげた人（${people.length}人）</h2></div>
          ${people.length ? html`<div class="card"><ul class="rows">${people.map((u) => { const isA = j.assigned === u.id; const lvN = { beginner: 1, middle: 2, advanced: 3 }; const meets = j.need.text === 'だれでも' || (lvN[u.level] || 1) >= (lvN[j.need.level] || 1); return html`<li class="row-item ad-appl ${isA ? 'is-assigned' : ''}">${A.av(u)}<span><span class="ri-title">${u.name}</span><span class="ri-sub">${A.fac(u.facility).name}・${(u.genres || []).map((g) => K.GENRES[g].name).join('・')}・提出 ${A.subsOf(u)}回・OK ${A.okRateOf(u)}%</span><span class="cluster mt-1">${A.lv(u.level)}${meets ? html`<span class="chip chip-ok">${ic('check')}条件OK</span>` : html`<span class="chip chip-warn">${ic('info')}条件の級より前（いっしょに相談）</span>`}${isA ? html`<span class="chip chip-ok">${ic('usercheck')}お願いしました</span>` : ''}</span></span>
            <span class="ri-end">${isA ? html`<button class="btn btn-sm btn-ghost" type="button" data-act="ad-job-unassign" data-id="${j.id}">取り消す</button>` : html`<button class="btn btn-sm btn-primary" type="button" data-act="ad-job-assign" data-id="${j.id}" data-u="${u.id}">${ic('usercheck')}<span>この人にお願いする</span></button>`}</span></li>`; })}</ul></div>`
            : html`<div class="empty card">${raw(Icons.pikuto(72, 'think'))}<span class="em-title">まだ だれも手をあげていません</span><span>利用者の「案件ボード」に出ています</span></div>`}
        </section>
        <p class="small muted">${ic('info')} お願いする人を決めたら、その人の事業所の職員さんと いっしょに進め方を決めます。</p>
      </div>`
    };
  }
  act('ad-job-assign', (el) => { const id = el.getAttribute('data-id'), u = el.getAttribute('data-u'); Store.update((s) => { const j = s.jobs.find((x) => x.id === id); j.assigned = u; }); UI.toast(`${A.person(u).name}さんに お願いしました`, { icon: 'usercheck' }); });
  act('ad-job-unassign', (el) => { const id = el.getAttribute('data-id'); Store.update((s) => { const j = s.jobs.find((x) => x.id === id); delete j.assigned; }); UI.toast('取り消しました', { icon: 'undo' }); });
  act('ad-job-st', (el) => { const id = el.getAttribute('data-id'); Store.update((s) => { s.jobs.find((x) => x.id === id).status = el.getAttribute('data-v'); }); });
  act('ad-job-new', () => {
    UI.sheet({
      title: '新しい案件', icon: ic('briefcase'), wide: true,
      body: html`<form class="stack" id="ad-jf">
        <div class="field"><label class="label" for="jf-t">案件の名前</label><input class="input" id="jf-t" name="title" placeholder="例：地域のパン屋さんのチラシ（A4 1まい）" required></div>
        <div class="grid-2">
          <div class="field"><label class="label" for="jf-g">ジャンル</label><select class="select" id="jf-g" name="genre">${['web', 'design', 'video', 'sns', 'ai', 'pc'].map((g) => html`<option value="${g}">${K.GENRES[g].name}</option>`)}</select></div>
          <div class="field"><label class="label" for="jf-l">いる級</label><select class="select" id="jf-l" name="level">${['beginner', 'middle', 'advanced'].map((l) => html`<option value="${l}">${K.LEVELS[l].name}から</option>`)}</select></div>
          <div class="field"><label class="label" for="jf-a">量</label><input class="input" id="jf-a" name="amount" placeholder="例：画像 1まい"></div>
          <div class="field"><label class="label" for="jf-p">期間</label><input class="input" id="jf-p" name="period" placeholder="例：11月10日〜11月20日"></div>
        </div>
        <div class="field"><label class="label" for="jf-c">たのむ人（会社・お店）</label><input class="input" id="jf-c" name="client" placeholder="例：架空ベーカリー"></div>
        <div class="field"><label class="label" for="jf-n">利用者へのひとこと<span class="opt">（なくてもOK）</span></label><input class="input" id="jf-n" name="note" placeholder="例：写真は運営からわたします"></div>
        <label class="checkline"><input type="checkbox" name="practice"><span class="cl-box">${ic('check')}</span><span class="cl-text">練習用（納品なし）にする</span></label>
        <p class="xsmall muted">${ic('info')} 利用者の画面には、お金のことは出ません。</p>
      </form>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-primary btn-lg" type="button" data-yes>${ic('plus')}<span>案件ボードに出す</span></button>`,
      mount: (sh, close) => {
        sh.querySelector('input[name="practice"]').addEventListener('change', (e) => e.target.closest('.checkline').classList.toggle('is-done', e.target.checked));
        sh.querySelector('[data-yes]').addEventListener('click', () => {
          const fm = sh.querySelector('#ad-jf');
          const title = fm.title.value.trim();
          if (!title) { fm.title.focus(); UI.toast('案件の名前を入れてください', { icon: 'info' }); return; }
          const g = fm.genre.value, lv = fm.level.value;
          const job = { id: Core.uid('j'), title, genre: g, need: { genre: g === 'ai' ? 'sns' : g, level: lv, text: `${K.GENRES[g].name} ${K.LEVELS[lv].name}の課題を1つ出した人` }, amount: fm.amount.value.trim() || '—', period: fm.period.value.trim() || '相談して決めます', due: null, status: 'open', client: fm.client.value.trim() || '（未定）', applicants: [], note: fm.note.value.trim(), practice: fm.practice.checked };
          Store.update((s) => { s.jobs.unshift(job); }, { silent: true });
          close();
          UI.toast('案件ボードに出しました（利用者の案件ボードにも出ます）', { icon: 'briefcase' });
          App.go(`#/admin/job/${job.id}`);
        });
      }
    });
  });

  /* ---------- 利用者 ---------- */
  function lastSeen(u) {
    if (u.facility === 'f-hidamari') {
      if (u.id === S().me) return S().myDay.in ? 'きょう' : 'きのう';
      const d = S().day[u.id];
      if (d && d.absent) return 'お休み';
      return 'きょう';
    }
    return u.active ? 'きょう' : `${1 + (A.hash(u.id) % 6)}日前`;
  }
  function pageUsers(route) {
    const g = route.query.g || 'all';
    const fac = route.query.fac || 'all';
    const q = route.query.q || '';
    const list = S().mine.concat(S().others).filter((u) => (g === 'all' || (u.genres || []).includes(g)) && (fac === 'all' || u.facility === fac));
    const rows = list.map((u) => ({ u, f: A.fac(u.facility), subs: A.subsOf(u), ok: A.okRateOf(u), seen: lastSeen(u) }));
    const limit = Number(route.query.n || 20);
    const match = (r) => !q || (r.u.name + r.f.name).includes(q);
    const shownOk = (r, i) => (q ? match(r) : i < limit);
    const todayN = rows.filter((r) => r.seen === 'きょう').length;
    const newN = rows.filter((r) => r.u.isNew || (r.u.since || '') >= '2026-09').length;
    const avgOk = rows.length ? Math.round(sum(rows, (r) => r.ok) / rows.length) : 0;
    const qsBase = `g=${g}${fac !== 'all' ? `&fac=${fac}` : ''}`;
    return {
      title: '利用者', nav: 'users', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>利用者</h1><p class="lead">${S().facilities.length}事業所の利用者です（この試作では ${list.length}人ぶんを用意しています）。</p></div></div>
        <div class="stats" style="--cols:4">
          <div class="stat"><span class="st-label">${ic('users')}利用者</span><span class="st-value">${rows.length}<small>人</small></span></div>
          <div class="stat"><span class="st-label">${ic('sun')}きょう来た人</span><span class="st-value">${todayN}<small>人</small></span></div>
          <div class="stat"><span class="st-label">${ic('sprout')}新しく来た人</span><span class="st-value">${newN}<small>人</small></span><span class="st-sub">9月から</span></div>
          <div class="stat"><span class="st-label">${ic('checkc')}OKのわりあい</span><span class="st-value">${avgOk}<small>%</small></span><span class="st-sub">平均</span></div>
        </div>
        <div class="ad-toolbar">
          <div class="input-icon grow">${ic('search')}<input class="input" type="search" data-input="ad-user-q" value="${q}" placeholder="名前・事業所でさがす" aria-label="利用者をさがす"></div>
          <select class="select ad-sel" data-change="ad-user-fac" aria-label="事業所でしぼる"><option value="all">すべての事業所</option>${S().facilities.map((f) => html`<option value="${f.id}" ${fac === f.id ? 'selected' : ''}>${f.name}</option>`)}</select>
        </div>
        <div class="filters">${[['all', 'ぜんぶ'], ['web', 'Web制作'], ['design', '画像デザイン'], ['video', '動画編集'], ['sns', 'SNS運用'], ['ai', 'AI']].map(([k, n]) => html`<a class="fchip" href="#/admin/users?g=${k}${fac !== 'all' ? `&fac=${fac}` : ''}" aria-pressed="${B(g === k)}">${n}</a>`)}</div>
        <div class="table-wrap hide-sp"><table class="table ad-users"><thead><tr><th>名前</th><th>事業所</th><th>ジャンル</th><th>級</th><th class="num">提出</th><th class="num">OKのわりあい</th><th>さいご</th></tr></thead>
          <tbody>${rows.map((r, i) => html`<tr class="is-link" data-row data-s="${r.u.name}${r.f.name}" ${i >= limit ? raw('data-more') : ''} ${shownOk(r, i) ? '' : raw('hidden')} data-act="ad-user" data-id="${r.u.id}" tabindex="0"><td><span class="row" style="gap:10px">${A.av(r.u, 'sm')}<b>${r.u.name}</b>${r.u.isNew ? html`<span class="chip chip-info">新しく来た人</span>` : ''}</span></td><td>${r.f.name}</td><td>${(r.u.genres || []).map((x) => K.GENRES[x].short).join('・')}</td><td>${A.lv(r.u.level)}</td><td class="num">${r.subs}</td><td class="num"><span class="ad-okbar"><i style="width:${r.ok}%"></i></span>${r.ok}%</td><td>${r.seen === 'きょう' ? html`<span class="status ok">${ic('checkc')}きょう</span>` : html`<span class="muted">${r.seen}</span>`}</td></tr>`)}</tbody></table></div>
        <div class="ad-ucards hide-pc">${rows.map((r, i) => html`<button class="card ad-ucard" type="button" data-row data-s="${r.u.name}${r.f.name}" ${i >= limit ? raw('data-more') : ''} ${shownOk(r, i) ? '' : raw('hidden')} data-act="ad-user" data-id="${r.u.id}">${A.av(r.u)}<span class="grow"><b>${r.u.name}</b><span class="xsmall muted">${r.f.name}・${(r.u.genres || []).map((x) => K.GENRES[x].short).join('・')}</span><span class="cluster mt-1">${A.lv(r.u.level)}<span class="chip">提出 ${r.subs}</span><span class="chip">OK ${r.ok}%</span></span></span><span class="xsmall muted">${r.seen}</span></button>`)}</div>
        <p class="small muted" data-empty ${q && !rows.some(match) ? '' : raw('hidden')}>見つかりませんでした</p>
        ${rows.length > limit ? html`<a class="btn btn-block" data-more-btn ${q ? raw('hidden') : ''} href="#/admin/users?${qsBase}&n=${limit + 40}">${ic('down')}<span>もっと見る（あと${rows.length - limit}人）</span></a>` : ''}
      </div>`
    };
  }
  act('ad-user-q', (el) => {
    const q = el.value.trim();
    const seen = new Set();
    document.querySelectorAll('[data-row]').forEach((r) => {
      const ok = q ? r.getAttribute('data-s').includes(q) : !r.hasAttribute('data-more');
      r.hidden = !ok;
      if (ok) seen.add(r.getAttribute('data-id'));
    });
    const e = document.querySelector('[data-empty]'); if (e) e.hidden = !q || seen.size > 0;
    const m = document.querySelector('[data-more-btn]'); if (m) m.hidden = !!q;
  });
  act('ad-user-fac', (el) => App.go(`#/admin/users${el.value !== 'all' ? `?fac=${el.value}` : ''}`));
  act('ad-user', (el) => {
    const u = A.person(el.getAttribute('data-id'));
    const f = A.fac(u.facility);
    const subs = S().submissions.filter((x) => x.learner === u.id);
    UI.sheet({
      title: u.name, icon: A.av(u),
      body: html`<div class="cluster">${A.lv(u.level)}${(u.genres || []).map((g) => html`<span class="chip">${K.GENRES[g].name}</span>`)}${u.isNew ? html`<span class="chip chip-info">新しく来た人</span>` : ''}</div>
        <dl class="ad-dl"><div><dt>事業所</dt><dd>${f.name}（${f.area}）</dd></div><div><dt>使いはじめ</dt><dd>${u.since ? `${u.since.slice(0, 4)}年${Number(u.since.slice(5, 7))}月` : '—'}</dd></div><div><dt>提出</dt><dd>${A.subsOf(u)}回・OK ${A.okRateOf(u)}%</dd></div>${u.goal ? html`<div><dt>めあて</dt><dd>${u.goal}</dd></div>` : ''}</dl>
        ${subs.length ? html`<div class="stack-sm"><b class="small">さいきんの提出</b>${subs.map((x) => html`<a class="ad-mini-row" href="#/admin/review/${x.id}" data-close><span class="grow"><b class="clamp-1">${(A.task(x.task) || {}).title || ''}</b><span class="xsmall muted">${fmt.dt(x.at)}</span></span>${x.status === 'waiting' ? A.vchip(x.ai.verdict) : html`<span class="chip">${x.status === 'sent' ? '送った' : '出さない'}</span>`}</a>`)}</div>` : ''}
        <p class="xsmall muted">${ic('shield')} 体調や気持ちのことは、事業所の職員さんが見ます。運営の画面には出しません。</p>`
    });
  });

  /* ---------- 事業所 ---------- */
  const STAFF_FAM = ['田村', '吉川', '西村', '星野', '岩田', '平田', '永井', '菅原', '大野', '川口'];
  const STAFF_GIV = ['あや', 'けんじ', 'みき', 'たかし', 'ゆか', 'ひろし', 'まり', 'しんじ'];
  function staffOf(f) {
    if (f.id === 'f-hidamari') return [K.STAFF.name, '川口 しんじ', '大野 まり'];
    return Array.from({ length: f.staff }).map((_, i) => `${STAFF_FAM[(A.hash(f.id) + i * 3) % STAFF_FAM.length]} ${STAFF_GIV[(A.hash(f.id) + i * 5) % STAFF_GIV.length]}`);
  }
  function planOf(f) { return f.id === 'f-hidamari' ? '利用中' : f.plan; }
  function sinceOf(f) { return `${f.since.slice(0, 4)}年${Number(f.since.slice(5, 7))}月から`; }
  function facToday(f) {
    if (f.id === 'f-hidamari') { // 職員の画面と同じ数になるように、きょうの動きから数える
      const now = Clock.minutes();
      const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
      let n = S().myDay && S().myDay.in ? 1 : 0;
      S().mine.forEach((u) => { const d = S().day[u.id]; if (!d || d.absent || !d.seg) return; const a = d.seg.find((x) => x[1] === 'arrive'); if (a && toMin(a[0]) <= now) n++; });
      return n;
    }
    const base = Math.round(f.learners * (0.55 + (A.hash(f.id) % 30) / 100)); return Math.min(f.learners, base);
  }
  function pageFacilities() {
    const fs = S().facilities;
    return {
      title: '事業所', nav: 'facilities', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>事業所</h1><p class="lead">${fs.length}事業所・利用者 ${sum(fs, (f) => f.learners)}人（すべて架空）</p></div></div>
        <div class="input-icon">${ic('search')}<input class="input" type="search" data-input="ad-fac-q" placeholder="事業所の名前・地域でさがす" aria-label="事業所をさがす"></div>
        <div class="grid-auto ad-facs">${fs.map((f) => { const w = S().submissions.filter((x) => x.facility === f.id && x.status === 'waiting').length; return html`<a class="card ad-fac" href="#/admin/facility/${f.id}" data-fac data-s="${f.name}${f.area}">
          <span class="row-between"><span class="ico-badge sm">${ic('building')}</span><span class="chip ${planOf(f) === 'お試し中' ? 'chip-info' : 'chip-ok'}">${planOf(f)}</span></span>
          <b class="ad-fac-name">${f.name}</b><span class="xsmall muted">${f.area}・${sinceOf(f)}</span>
          <span class="ad-fac-nums"><span><b>${f.learners}</b>利用者</span><span><b>${facToday(f)}</b>きょう</span><span><b>${staffOf(f).length}</b>職員</span><span class="${w ? 'is-wait' : ''}"><b>${w}</b>確認待ち</span></span></a>`; })}</div>
      </div>`
    };
  }
  act('ad-fac-q', (el) => { const q = el.value.trim(); document.querySelectorAll('[data-fac]').forEach((c) => { c.hidden = !!q && !c.getAttribute('data-s').includes(q); }); });
  function pageFacility(route) {
    const f = S().facilities.find((x) => x.id === route.params.id);
    if (!f) return { title: '事業所', back: '#/admin/facilities', html: html`<div class="empty card">見つかりませんでした</div>` };
    const people = (f.id === 'f-hidamari' ? S().mine : S().others.filter((u) => u.facility === f.id));
    const subs = S().submissions.filter((x) => x.facility === f.id).sort((a, b) => T(b.at) - T(a.at));
    const month = 18 + (A.hash(f.id) % 40);
    return {
      title: f.name, topTitle: '事業所', nav: 'facilities', back: '#/admin/facilities', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">${f.area}・${sinceOf(f)}</span><h1>${f.name}</h1></div><div class="ph-actions"><span class="chip chip-lg ${planOf(f) === 'お試し中' ? 'chip-info' : 'chip-ok'}">${planOf(f)}</span></div></div>
        <div class="stats" style="--cols:4">
          <div class="stat"><span class="st-label">${ic('users')}利用者</span><span class="st-value">${f.learners}<small>人</small></span></div>
          <div class="stat"><span class="st-label">${ic('sun')}きょう来た人</span><span class="st-value">${facToday(f)}<small>人</small></span></div>
          <div class="stat"><span class="st-label">${ic('send')}10月の提出</span><span class="st-value">${month}<small>件</small></span></div>
          <div class="stat"><span class="st-label">${ic('user')}職員</span><span class="st-value">${staffOf(f).length}<small>人</small></span></div>
        </div>
        <div class="ad-dash">
          <section class="card sec"><div class="sec-head card-head"><h2>${ic('users')}利用者（${people.length}人を表示）</h2></div>
            <ul class="rows">${people.map((u) => html`<li><button class="row-item" type="button" data-act="ad-user" data-id="${u.id}">${A.av(u, 'sm')}<span><span class="ri-title">${u.name}</span><span class="ri-sub">${(u.genres || []).map((g) => K.GENRES[g].name).join('・')}</span></span><span class="ri-end">${A.lv(u.level)}</span></button></li>`)}</ul></section>
          <div class="stack-lg">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('inbox')}さいきんの提出</h2></div>
              ${subs.length ? html`<ul class="stack-sm">${subs.map((x) => html`<li><a class="ad-mini-row" href="#/admin/review/${x.id}"><span class="grow"><b class="clamp-1">${(A.task(x.task) || {}).title || ''}</b><span class="xsmall muted">${A.person(x.learner).name}・${fmt.dt(x.at)}</span></span>${x.status === 'waiting' ? A.vchip(x.ai.verdict) : html`<span class="chip">${x.status === 'sent' ? '送った' : '出さない'}</span>`}</a></li>`)}</ul>` : html`<p class="small muted">いまは ありません</p>`}</section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('user')}職員</h2></div>
              <ul class="stack-sm">${staffOf(f).map((n) => html`<li class="row">${A.av({ name: n, color: '#12a383' }, 'sm')}<span>${n}</span></li>`)}</ul></section>
          </div>
        </div>
      </div>`
    };
  }

  /* ---------- 納品 ---------- */
  const STAGES = [
    { key: 'making', label: '制作中', icon: 'edit' },
    { key: 'check', label: '運営チェック', icon: 'eye' },
    { key: 'ready', label: '納品待ち', icon: 'package' },
    { key: 'done', label: '納品済み', icon: 'checkc' }
  ];
  function pageDelivery() {
    const ds = S().deliveries;
    return {
      title: '納品', nav: 'delivery', wide: true,
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>納品</h1><p class="lead">利用者が作ったものを、たのんだ人（会社・お店）に とどけるまでの流れです。</p></div></div>
        <div class="ad-kanban">${STAGES.map((st, si) => { const list = ds.filter((d) => d.stage === st.key); return html`<section class="ad-col ad-col-${st.key}" aria-label="${st.label}">
          <header class="ad-col-head">${ic(st.icon)}<b>${st.label}</b><span class="count gray">${list.length}</span></header>
          <div class="ad-col-body">${list.length ? list.map((d) => { const dl = fmt.daysLeft(d.due + 'T12:00:00+09:00'); return html`<article class="card ad-dcard">
            <b class="ad-d-title">${d.title.replace(d.client + '：', '')}</b>
            <span class="cluster"><span class="chip">${ic('building')}${d.client}</span>${st.key === 'done' ? html`<span class="chip chip-ok">${ic('check')}${fmt.md((d.deliveredAt || d.due) + 'T12:00:00+09:00')} 納品</span>` : html`<span class="chip ${dl <= 3 ? 'chip-warn' : ''}">${ic('calendar')}${fmt.md(d.due + 'T12:00:00+09:00')}${dl <= 0 ? ' きょう' : `・あと${dl}日`}</span>`}</span>
            <span class="ad-d-prog"><span class="bar thin ${d.done >= d.items ? 'ok' : ''}"><i style="width:${Math.round(d.done / d.items * 100)}%"></i></span><span class="xsmall bold">${d.done}/${d.items}</span></span>
            <span class="row-between"><span class="ad-avs" title="${d.people.map((id) => A.person(id).name).join('、')}">${d.people.map((id) => A.av(A.person(id), 'sm'))}</span>${si < 3 ? html`<button class="btn btn-sm ${st.key === 'ready' ? 'btn-primary' : ''}" type="button" data-act="ad-dl-next" data-id="${d.id}">${st.key === 'ready' ? '納品する' : 'つぎへ'}${ic('right')}</button>` : ''}</span>
          </article>`; }) : html`<p class="xsmall muted ad-col-empty">ありません</p>`}</div></section>`; })}</div>
      </div>`
    };
  }
  act('ad-dl-next', (el) => {
    const id = el.getAttribute('data-id');
    const d = S().deliveries.find((x) => x.id === id);
    const prev = { stage: d.stage, deliveredAt: d.deliveredAt, done: d.done };
    const i = STAGES.findIndex((s) => s.key === d.stage);
    const next = STAGES[Math.min(i + 1, 3)];
    Store.update((s) => { const x = s.deliveries.find((y) => y.id === id); x.stage = next.key; if (next.key === 'done') { x.deliveredAt = today(); x.done = x.items; } });
    UI.toast(`「${next.label}」に進めました`, { icon: next.icon, action: '取り消す', onAction: () => Store.update((s) => { Object.assign(s.deliveries.find((y) => y.id === id), prev); }) });
    if (next.key === 'done') UI.confetti();
  });

  /* ---------- 設定 ---------- */
  function pageSettings() {
    const st = S().settings.admin;
    const sw = (key, label, sub, iconName) => html`<label class="row-item set-row"><span class="ico-badge sm">${ic(iconName)}</span><span><span class="ri-title">${label}</span><span class="ri-sub">${sub}</span></span><span class="switch"><input type="checkbox" ${st[key] ? 'checked' : ''} data-change="ad-set" data-key="${key}" aria-label="${label}"><span class="sw-track"></span></span></label>`;
    return {
      title: '設定', nav: 'settings',
      html: html`<div class="page ad-narrow">
        <div class="page-head"><div class="ph-text"><h1>設定</h1><p class="lead">見やすさは、運営の画面だけに使われます。</p></div></div>
        <section class="sec"><div class="sec-head"><h2>${ic('textsize')}文字の大きさ</h2></div>
          <div class="seg seg-block" role="group" aria-label="文字の大きさ">${[[1, 'ふつう'], [2, '大きい'], [3, 'とても大きい']].map(([v, n]) => html`<button type="button" data-act="ad-set-fs" data-v="${v}" aria-selected="${B(st.fs === v)}">${n}</button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('sun')}画面の色</h2></div>
          <div class="seg seg-block" role="group" aria-label="画面の色">${[['light', '明るい'], ['dark', 'ダーク']].map(([v, n]) => html`<button type="button" data-act="ad-set-theme" data-v="${v}" aria-selected="${B(st.theme === v)}">${ic(v === 'dark' ? 'moon' : 'sun')}${n}</button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('eye')}見やすさ</h2></div>
          <div class="card rows">${sw('contrast', 'くっきり表示', '文字と線を こく、太くします', 'contrast')}${sw('reduceMotion', '動きを へらす', '画面の動きを 少なくします', 'wave')}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('keyboard')}提出チェックのキー</h2></div>
          <div class="card card-pad"><ul class="ad-keys"><li><kbd>1</kbd>OK（このまま送る）</li><li><kbd>2</kbd>直してOK（直して送る）</li><li><kbd>3</kbd>出さない</li><li><kbd>J</kbd>/<kbd>K</kbd>つぎ・まえ</li><li><kbd>E</kbd>下書きを直す</li><li><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Enter</kbd>直した文を送る</li></ul></div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('info')}試作について</h2></div>
          <div class="card rows">
            <button class="row-item" type="button" data-act="ad-reset"><span class="ico-badge sm warn">${ic('refresh')}</span><span><span class="ri-title">データを最初にもどす</span><span class="ri-sub">利用者・職員・運営の ぜんぶの画面が、はじめの状態にもどります</span></span><span class="chev">${ic('right')}</span></button>
            <a class="row-item" href="#/"><span class="ico-badge sm">${ic('back')}</span><span><span class="ri-title">入口にもどる</span><span class="ri-sub">利用者・職員の画面も見られます</span></span><span class="chev">${ic('right')}</span></a>
          </div></section>
      </div>`
    };
  }
  act('ad-set', (el) => { const k = el.getAttribute('data-key'); Store.update((s) => { s.settings.admin[k] = el.checked; }); });
  act('ad-set-fs', (el) => { Store.update((s) => { s.settings.admin.fs = Number(el.getAttribute('data-v')); }); });
  act('ad-set-theme', (el) => { Store.update((s) => { s.settings.admin.theme = el.getAttribute('data-v'); }); });
  act('ad-reset', async () => {
    const yes = await UI.confirm({ title: 'データを最初にもどしますか？', icon: ic('refresh'), iconCls: 'warn', text: '利用者・職員・運営の ぜんぶの画面で、押したり出したりしたことが、はじめの状態にもどります。', yes: 'もどす', danger: true });
    if (!yes) return;
    Store.reset(); ED.id = null; WZ = null; App.applySettings(); App.render(); UI.toast('最初の状態にもどしました');
  });

  /* ---------- 時計 ---------- */
  document.addEventListener('tick', () => {
    if (!App.current || App.current.role !== 'admin') return;
    const now = Clock.now();
    Core.$$('[data-clock]').forEach((el) => { el.textContent = fmt.time(now); });
  });

  const routes = {
    'home': pageHome,
    'review': pageReview,
    'review/:id': pageReview,
    'deliver': pageDeliver,
    'deliver/new': pageNew,
    'jobs': pageJobs,
    'job/:id': pageJob,
    'users': pageUsers,
    'facilities': pageFacilities,
    'facility/:id': pageFacility,
    'delivery': pageDelivery,
    'settings': pageSettings
  };
  window.AdminKit = A;
  App.register('admin', { routes, shell, home: 'review' });
  Store.on(() => { if (App.current && App.current.role === 'admin') App.refresh(); });
})();
