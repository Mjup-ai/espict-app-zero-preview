/* =========================================================
   利用者（受講者）の画面 その2
   課題・指示書・質問する／これで提出する・ぴくと・作ったもの・案件・お知らせ・設定
   ========================================================= */
(function () {
  'use strict';
  const { html, raw, ic, esc, fmt, by, sum } = Core;
  const K = window.CONTENT;
  const C = window.CATALOG;
  const L = window.LearnerKit;
  const S = () => Store.state;
  const nowISO = () => Clock.now().toISOString();
  const ID = window.TASK_IDS;

  /* ---------- 課題の一覧 ---------- */
  const CELL = {
    ok: { icon: 'checkc', label: 'できた' }, submitted: { icon: 'hourglass', label: '確認中' }, doing: { icon: 'playc', label: 'とりくみ中' },
    fix: { icon: 'edit', label: '直す' }, todo: { icon: 'target', label: 'まだ' }
  };
  function matrix() {
    const blog = K.ALL_TASKS.filter((t) => t.group === 'blog-2026-10');
    const lvs = ['beginner', 'middle', 'advanced'];
    const methods = ['studio', 'ai', 'image'];
    const me = L.me();
    const rec = L.nextStep();
    const doneN = blog.filter((t) => L.ts(t.id).status === 'ok').length;
    return html`<section class="card mx-card" aria-labelledby="mx-h">
      <div class="mx-top">
        <div><span class="eyebrow">10月のまとまり ・ ${blog.length}つ</span><h2 id="mx-h" class="mx-title">ブログ記事の課題</h2>
        <p class="small muted">テーマは級ごとに同じです。作り方を えらんで、すきな順に進めてOK。</p></div>
        <div class="ring" style="--p:${Math.round(doneN / blog.length * 100)};--c:var(--ok)"><span>${doneN}/${blog.length}</span></div>
      </div>
      <div class="matrix" role="table" aria-label="作り方と級の表">
        <div class="mx-row mx-head" role="row"><div role="columnheader"><span class="sr-only">作り方</span></div>
          ${lvs.map((lv) => html`<div role="columnheader" class="mx-colh">${L.lvChip(lv)}<b>${K.THEMES[lv].short}</b></div>`)}</div>
        ${methods.map((m) => html`<div class="mx-row" role="row"><div class="mx-rowh" role="rowheader">${ic(K.METHODS[m].icon)}<span class="mx-long">${K.METHODS[m].name}</span><span class="mx-short">${K.METHODS[m].short.replace('版', '')}</span></div>
          ${lvs.map((lv) => {
            const t = blog.find((x) => x.method === m && x.level === lv);
            if (!t) return html`<div role="cell"></div>`;
            const ts = L.ts(t.id);
            const c = CELL[ts.status] || CELL.todo;
            const isRec = rec.task && rec.task.id === t.id && ts.status === 'todo';
            return html`<a role="cell" class="mx-cell st-${ts.status} ${ts.unread ? 'is-unread' : ''} ${isRec ? 'is-rec' : ''}" href="#/learner/task/${t.id}" aria-label="${K.METHODS[m].name} ${K.LEVELS[lv].name} ${t.title}：${ts.unread ? '返事あり' : c.label}">
              ${ts.unread ? html`<span class="mx-dot" aria-hidden="true"></span>` : ''}${ic(c.icon)}<span>${ts.unread ? '返事あり' : c.label}</span>${t.mins ? html`<small>${t.mins}分</small>` : ''}</a>`;
          })}</div>`)}
      </div>
      <div class="mx-legend small muted">${['ok', 'submitted', 'doing', 'todo'].map((k) => html`<span>${ic(CELL[k].icon)}${CELL[k].label}</span>`)}</div>
    </section>`;
  }
  function taskRow(t, opts) {
    const ts = L.ts(t.id);
    const o = opts || {};
    const due = L.due(t);
    const dl = due ? fmt.daysLeft(due) : null;
    return html`<a class="card task-row" href="#/learner/task/${t.id}">
      ${L.gmark(t.genre || 'pc')}
      <span class="grow"><span class="tr-title">${t.title}</span>
        <span class="cluster tr-meta">${L.lvChip(t.level)}${t.method ? html`<span class="chip">${K.METHODS[t.method].short}</span>` : ''}${ts.status !== 'ok' && due ? html`<span class="chip ${dl <= 3 ? 'chip-warn' : ''}">${ic('clock')}${dl <= 0 ? 'きょうまで' : `あと${dl}日`}</span>` : ''}${o.hideStatus ? '' : L.statusChip(ts.status, ts.unread)}</span></span>
      <span class="chev">${ic('right')}</span></a>`;
  }
  function pageTasks(route) {
    const f = route.query.f || 'all';
    const s = S();
    const all = K.ALL_TASKS.concat(s.extraTasks);
    const me = L.me();
    const active = all.filter((t) => ['doing', 'submitted', 'fix'].includes(L.ts(t.id).status) || L.ts(t.id).unread).sort((a, b) => (L.ts(b.id).unread ? 1 : 0) - (L.ts(a.id).unread ? 1 : 0));
    const monthly = all.filter((t) => t.kind === 'monthly' && t.month === '2026-10');
    monthly.sort((a, b) => (me.genres.includes(b.genre) ? 1 : 0) - (me.genres.includes(a.genre) ? 1 : 0) || (K.LEVELS[a.level] ? K.LEVELS[a.level].n : 0) - (K.LEVELS[b.level] ? K.LEVELS[b.level].n : 0));
    const extra = s.extraTasks;
    const past = all.filter((t) => t.kind === 'monthly' && t.month < '2026-10');
    const pastBy = Core.groupBy(past.sort((a, b) => b.month.localeCompare(a.month)), (t) => t.month);
    const start = K.START_TASKS;
    const startDone = start.filter((t) => L.ts(t.id).status === 'ok').length;
    const filt = (t) => {
      const st = L.ts(t.id).status;
      if (f === 'todo') return st === 'todo';
      if (f === 'doing') return st === 'doing' || st === 'fix';
      if (f === 'sent') return st === 'submitted';
      if (f === 'ok') return st === 'ok';
      return true;
    };
    const counts = { all: 0, doing: 0, todo: 0, sent: 0, ok: 0 };
    all.filter((t) => t.month === '2026-10' || t.kind === 'new').forEach((t) => { const st = L.ts(t.id).status; counts.all++; if (st === 'todo') counts.todo++; if (st === 'doing' || st === 'fix') counts.doing++; if (st === 'submitted') counts.sent++; if (st === 'ok') counts.ok++; });
    const listMode = f !== 'all';
    const filtered = all.filter((t) => (t.month === '2026-10' || t.kind === 'new') && filt(t));
    return {
      title: '課題', nav: 'tasks',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>課題</h1><p class="lead">指示書を読む → 作る → 出す。出し方は「質問する」と「これで提出する」の2つだけです。</p></div></div>
        <div class="filters" role="group" aria-label="しぼりこみ">${[['all', 'ぜんぶ'], ['doing', 'とりくみ中'], ['todo', 'まだ'], ['sent', '出した'], ['ok', 'できた']].map(([k, n]) => html`<a class="fchip" href="#/learner/tasks?f=${k}" aria-pressed="${f === k}">${n}<span class="count gray">${counts[k]}</span></a>`)}</div>
        ${listMode ? html`<section class="sec">${filtered.length ? html`<div class="stack">${filtered.map((t) => taskRow(t))}</div>` : html`<div class="empty card">${raw(Icons.pikuto(72, 'happy'))}<span class="em-title">ここには まだ ありません</span></div>`}</section>` : html`
          ${active.length ? html`<section class="sec"><div class="sec-head"><h2>${ic('playc')}いま取り組んでいる課題</h2></div><div class="stack">${active.map((t) => taskRow(t))}</div></section>` : ''}
          ${extra.length ? html`<section class="sec"><div class="sec-head"><h2>${ic('sparkles')}新しくとどいた課題</h2></div><div class="stack">${extra.map((t) => taskRow(t))}</div></section>` : ''}
          ${matrix()}
          <section class="sec"><div class="sec-head"><h2>${ic('clipboard')}10月の指示書</h2><span class="small muted">しめきり 10月31日</span></div>
            <div class="task-grid2">${monthly.map((t) => taskRow(t))}</div></section>
          <details class="card fold"><summary><span class="ico-badge sm ok">${ic('school')}</span><span class="grow"><b>はじめてコース</b><span class="small muted"> ・ ${startDone}/${start.length} できた</span></span>${ic('down')}</summary>
            <div class="task-grid2 fold-body">${start.map((t) => taskRow(t))}</div></details>
          ${Array.from(pastBy.entries()).slice(0, 4).map(([m, list]) => html`<details class="card fold"><summary><span class="ico-badge sm">${ic('folder')}</span><span class="grow"><b>${Number(m.slice(5))}月の指示書</b><span class="small muted"> ・ ${list.length}つ</span></span>${ic('down')}</summary><div class="task-grid2 fold-body">${list.map((t) => taskRow(t))}</div></details>`)}
        `}
      </div>`,
      mount: () => L.setActivity({ type: 'tasks' })
    };
  }

  /* ---------- 課題のページ（指示書・チャット） ---------- */
  function pageTask(route) {
    const t = L.task(route.params.id);
    if (!t) return { title: '課題', html: html`<div class="empty card">見つかりませんでした</div>` };
    const ts = L.ts(t.id);
    const ins = K.instrFor(t);
    const tab = route.query.tab === 'chat' ? 'chat' : 'doc';
    const chat = S().chats[t.id] || [];
    const stepNow = ts.status === 'todo' ? 0 : (ts.status === 'doing' || ts.status === 'fix') ? 1 : ts.status === 'ok' ? 3 : 2;
    const due = L.due(t);
    const checks = ins.checks || [];
    const done = ts.checks || [];
    const doneN = checks.filter((_, i) => done[i]).length;
    const sayAll = `${t.title}。やること。${(ins.summary || []).join('')}`;
    const banner = statusBanner(t, ts, tab);
    const actions = html`<div class="task-actions">
      <button class="btn btn-lg ta-ask" type="button" data-act="ask" data-id="${t.id}">${ic('ask')}<span>質問する</span></button>
      <button class="btn btn-primary btn-lg ta-submit" type="button" data-act="submit" data-id="${t.id}">${ic('send')}<span>${ts.status === 'submitted' ? 'もう一度 出す' : 'これで提出する'}</span></button>
    </div>`;
    return {
      title: t.title, topTitle: '課題', nav: 'tasks', back: '#/learner/tasks', hideTabbar: true,
      html: html`<div class="page task-page">
        <div class="task-grid">
          <div class="stack-lg">
            <header class="task-head">
              <div class="cluster">${L.gmark(t.genre || 'pc', true)}${L.lvChip(t.level)}${t.method ? html`<span class="chip">${ic(K.METHODS[t.method].icon)}${K.METHODS[t.method].name}</span>` : ''}${t.kind === 'monthly' ? html`<span class="chip">月の指示書</span>` : ''}${t.practiceCase ? html`<span class="chip chip-info">練習用（納品なし）</span>` : ''}${L.statusChip(ts.status, ts.unread)}</div>
              <h1 class="task-title">${t.title}</h1>
              <div class="cluster small ink2"><span class="row" style="gap:6px">${ic('calendar')}${L.dueText(due)}</span>${t.mins ? html`<span class="row" style="gap:6px">${ic('clock')}目安 ${t.mins}分くらい</span>` : ''}</div>
            </header>
            ${banner}
            <div class="steps" style="--n:3" aria-label="進みぐあい">
              ${['指示書を読む', '作る', '出す'].map((n, i) => html`<div class="step ${i < stepNow ? 'done' : i === stepNow ? 'now' : ''}"><span class="st-dot">${i < stepNow ? ic('check') : i + 1}</span><span>${n}</span></div>`)}
            </div>
            <div class="tabs" role="tablist">
              <a role="tab" href="#/learner/task/${t.id}" aria-selected="${tab === 'doc'}">${ic('file')}指示書</a>
              <a role="tab" href="#/learner/task/${t.id}?tab=chat" aria-selected="${tab === 'chat'}">${ic('chat')}チャット${chat.length ? html`<span class="count ${ts.unread ? '' : 'gray'}">${chat.length}</span>` : ''}</a>
            </div>
            ${tab === 'doc' ? docView(t, ts, ins, sayAll) : chatView(t, chat)}
          </div>
          <aside class="task-side">
            <div class="card card-pad stack ts-panel">
              <div class="row-between"><b>できたらチェック</b><span class="chip ${doneN === checks.length && checks.length ? 'chip-ok' : ''}">${doneN}/${checks.length}</span></div>
              <div class="bar ${doneN === checks.length ? 'ok' : ''}"><i style="width:${checks.length ? doneN / checks.length * 100 : 0}%"></i></div>
              ${actions}
              <p class="xsmall muted">「質問する」は ぴくとが答えます。「これで提出する」は運営の人が見て、返事をくれます。</p>
            </div>
            ${lastOps(t)}
          </aside>
        </div>
        <div class="task-bar hide-pc">${actions}</div>
      </div>`,
      mount: (root) => {
        L.setActivity({ type: 'task', ref: t.id });
        if (ts.unread && tab === 'chat') Store.update((s) => { s.tasks[t.id].unread = false; s.notices.forEach((n) => { if (n.go && n.go.includes(t.id)) n.unread = false; }); }, { silent: true });
        if (ts.status === 'todo' && tab === 'doc') { /* 読みはじめたら「とりくみ中」にはしない（押すまで待つ） */ }
        const box = root.querySelector('.chat-scroll');
        if (box && tab === 'chat') setTimeout(() => { const last = box.lastElementChild; if (last) last.scrollIntoView({ block: 'end' }); }, 30);
      }
    };
  }
  function statusBanner(t, ts, tab) {
    if (ts.unread && tab !== 'chat') return html`<a class="banner ok banner-link" href="#/learner/task/${t.id}?tab=chat">${ic('chat')}<span class="b-text">運営から返事がとどきました！<p>押して読んでね</p></span>${ic('right')}</a>`;
    if (ts.status === 'submitted') return html`<div class="banner">${ic('hourglass')}<span class="b-text">${fmt.date(ts.submittedAt)}に出しました。運営の人が見ています。<p>返事は、この課題の「チャット」にとどきます。ふつうは2日くらいです。</p></span></div>`;
    if (ts.status === 'fix') return html`<div class="banner warn">${ic('edit')}<span class="b-text">直してほしい所があります<p>チャットの返事を読んで、直したら もう一度「これで提出する」を押してね。</p></span></div>`;
    if (ts.status === 'ok') return html`<div class="banner ok">${ic('trophy')}<span class="b-text">できた！ 運営が確認しました<p>「作ったもの」に のこっています。</p></span></div>`;
    if (ts.status === 'todo') return html`<div class="start-strip card card-tint"><span class="grow"><b>まずは指示書を読もう</b><span class="small ink2">読んだら「はじめる」を押してね。いつでも やめられます。</span></span><button class="btn btn-primary" type="button" data-act="task-start" data-id="${t.id}">${ic('play', { cls: 'ico-fill' })}<span>はじめる</span></button></div>`;
    return '';
  }
  function lastOps(t) {
    const m = (S().chats[t.id] || []).filter((x) => x.from === 'ops').slice(-1)[0];
    if (!m) return html`<div class="card card-pad stack-sm hide-sp"><b>${ic('chat')} 運営からの返事</b><p class="small muted">出すと、ここに返事がとどきます。</p></div>`;
    return html`<a class="card card-pad stack-sm hide-sp ops-prev" href="#/learner/task/${t.id}?tab=chat"><b class="row" style="gap:6px">${ic('chat')}運営からの返事</b><span class="small clamp-3">${m.text}</span><span class="xsmall muted">${fmt.dt(m.at)}</span></a>`;
  }

  function docView(t, ts, ins, sayAll) {
    const checks = ins.checks || [];
    const done = ts.checks || [];
    const cur = Math.min(ts.step || 0, Math.max(0, (ins.steps || []).length - 1));
    const sample = ins.sample === 'flow' ? 'flow' : ins.sample === 'banner' ? 'banner' : ins.sample === 'video' ? 'video' : ins.sample === 'sns' ? 'sns' : 'blog';
    return html`<div class="stack-lg doc">
      <section class="card card-pad sec doc-sum" data-say-root>
        <div class="sec-head"><h2>${ic('bulb')}やること</h2><span class="cluster">${UI.speakBtn(sayAll, 'よむ')}<button class="speak" type="button" data-act="pk-easy" data-id="${t.id}">${ic('sparkles')}<span>もっと かんたんに</span></button></span></div>
        <ol class="sum-list">${(ins.summary || []).map((x) => html`<li>${x}</li>`)}</ol>
        ${ins.provisional ? html`<p class="xsmall muted">※ 題名は本物です。中身は、試作のための仮の指示書です。</p>` : ''}
      </section>
      <section class="sec"><div class="sec-head"><h2>${ic('eye')}できあがりの見本</h2></div>
        <figure class="card sample">${raw(Art.preview(sample, { hue: t.genre === 'design' ? 205 : 195, title: K.THEMES[t.level] && t.group === 'blog-2026-10' ? K.THEMES[t.level].title : t.title, sub: 'エスピクトスクールの記事' }))}<figcaption class="xsmall muted">見本はイメージです。同じでなくて大丈夫。</figcaption></figure></section>
      ${(ins.steps || []).length ? html`<section class="sec"><div class="sec-head"><h2>${ic('route')}進め方<span class="small muted" style="font-weight:700">${ins.steps.length}つ</span></h2><button class="btn btn-soft btn-sm" type="button" data-act="focus-mode" data-id="${t.id}">${ic('target')}<span>ひとつずつ見る</span></button></div>
        <ol class="steplist">${ins.steps.map((st, i) => {
          const state = ts.status === 'ok' || ts.status === 'submitted' || i < cur ? 'done' : (i === cur && ts.status !== 'todo' ? 'now' : '');
          return html`<li class="sl-item ${state}">
            <span class="sl-no">${state === 'done' ? ic('check') : i + 1}</span>
            <div class="sl-body"><div class="sl-title">${st[0]}${state === 'now' ? html` <span class="chip chip-info">いまここ</span>` : ''}</div><p class="sl-text">${st[1]}</p>
              ${(st[2] || []).filter(Boolean).length ? html`<div class="sl-lessons">${(st[2] || []).filter(Boolean).map((lid) => { const l = K.lessonById[lid]; const v = L.lp(lid); return html`<a class="sl-lesson" href="#/learner/watch/${lid}">${ic(v >= 1 ? 'checkc' : 'playc')}<span>${K.seriesById[l.series].title}${l.label}「${l.title}」</span>${l.dur ? html`<small>${l.dur}分</small>` : ''}</a>`; })}</div>` : ''}
              ${state === 'now' ? html`<button class="btn btn-soft btn-sm mt-2" type="button" data-act="step-next" data-id="${t.id}">${ic('check')}<span>これは できた</span></button>` : ''}
            </div></li>`;
        })}</ol></section>` : ''}
      <section class="sec"><div class="sec-head"><h2>${ic('checkc')}できたらチェック</h2><span class="small muted">出す前に 見てみよう</span></div>
        <div class="stack-sm">${checks.map((c, i) => html`<label class="checkline ${done[i] ? 'is-done' : ''}"><input type="checkbox" ${done[i] ? 'checked' : ''} data-change="check" data-id="${t.id}" data-i="${i}"><span class="cl-box">${ic('check')}</span><span class="cl-text">${c}</span></label>`)}</div></section>
      ${(ins.materials || []).length ? html`<section class="sec"><div class="sec-head"><h2>${ic('folder')}素材</h2></div><div class="cluster">${ins.materials.map((m) => html`<button class="btn" type="button" data-act="noop">${ic(m.icon || 'download')}<span>${m.name}</span></button>`)}</div></section>` : ''}
      <section class="card card-soft card-pad row" style="align-items:flex-start"><span class="ico-badge">${ic('send')}</span><div><b>出し方</b><p class="small ink2">${ins.submit.label}を、「これで提出する」から出します。${ins.submit.type === 'url' ? 'URLは、ページを公開してからコピーしてね。' : ''}</p></div></section>
      <div class="row-between" style="flex-wrap:wrap"><p class="xsmall muted">もとの題名：${t.src}</p><button class="btn btn-sm btn-ghost" type="button" data-act="print">${ic('printer')}<span>指示書を紙に印刷する</span></button></div>
    </div>`;
  }

  function msgHtml(m) {
    if (m.from === 'sys') return html`<div class="msg-sys">${ic('checkc')}<span>${m.text} ・ ${fmt.dt(m.at)}</span></div>`;
    if (m.from === 'me') return html`<div class="msg msg-me"><div><div class="bubble">${m.text}</div><div class="meta">${fmt.dt(m.at)}</div></div></div>`;
    if (m.from === 'ops') return html`<div class="msg msg-ops"><span class="av sm" style="--av:#177a51">運</span><div><div class="who">${m.who || '運営'}${UI.speakBtn(m.text, 'よむ')}</div><div class="bubble">${m.text}</div><div class="meta">${fmt.dt(m.at)}</div></div></div>`;
    return html`<div class="msg msg-bot"><span class="pk-av">${raw(Icons.pikuto(36, m.mood || 'normal'))}</span><div><div class="who">ぴくと（AI）${UI.speakBtn(m.text, 'よむ')}</div><div class="bubble">${m.html ? raw(m.html) : m.text}</div><div class="meta">${fmt.dt(m.at)}</div></div></div>`;
  }
  L.msgHtml = msgHtml;
  function chatView(t, chat) {
    return html`<div class="stack chat-wrap">
      <p class="banner small">${ic('info')}<span class="b-text" style="font-weight:600">ここに運営からの返事がとどきます。質問には ぴくとが答えます（合格かどうかは言いません）。</span></p>
      <div class="chat chat-scroll" aria-live="polite">${chat.length ? chat.map(msgHtml) : html`<div class="empty">${raw(Icons.pikuto(72, 'happy'))}<span class="em-title">まだ やりとりはありません</span><span>わからない時は、下から ぴくとに聞いてね</span></div>`}</div>
      ${composer(t.id)}
    </div>`;
  }
  function composer(taskId, ph) {
    return html`<form class="stack-sm" data-submit="pk-send" data-task="${taskId || ''}">
      <div class="suggests">${['つぎに何をすればいい？', 'これで合ってる？', 'やることを小さく分けて', '指示書をかんたんに言って'].map((q) => html`<button class="suggest" type="button" data-act="pk-suggest" data-q="${q}">${q}</button>`)}</div>
      <div class="composer"><textarea name="q" rows="1" placeholder="${ph || 'ぴくとに質問する'}" aria-label="質問を書く"></textarea>
        ${('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? html`<button class="btn btn-icon btn-ghost" type="button" data-act="voice" aria-label="声で入力">${ic('mic')}</button>` : ''}
        <button class="btn btn-icon btn-primary" type="submit" aria-label="送る">${ic('send')}</button></div>
    </form>`;
  }

  /* チェック・段階・はじめる */
  act('check', (el) => {
    const id = el.getAttribute('data-id'), i = Number(el.getAttribute('data-i'));
    Store.update((s) => {
      const ts = s.tasks[id] || (s.tasks[id] = { status: 'todo', checks: [] });
      ts.checks = ts.checks || [];
      ts.checks[i] = el.checked ? 1 : 0;
      if (ts.status === 'todo' && el.checked) { ts.status = 'doing'; ts.startedAt = nowISO(); }
    }, { silent: true });
    const line = el.closest('.checkline'); line.classList.toggle('is-done', el.checked);
    if (el.checked) { const ins = K.instrFor(L.task(id)); const ts = L.ts(id); const n = (ins.checks || []).filter((_, j) => ts.checks[j]).length; if (n === ins.checks.length) UI.toast('チェックが ぜんぶ つきました！出す準備ができたね'); }
    setTimeout(() => App.refresh(), 250);
  });
  act('task-start', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { s.tasks[id] = Object.assign({ checks: [] }, s.tasks[id] || {}, { status: 'doing', startedAt: nowISO(), step: 0 }); });
    UI.toast('はじめました。1つずつ やっていこう！');
  });
  act('step-next', (el) => {
    const id = el.getAttribute('data-id');
    const ins = K.instrFor(L.task(id));
    Store.update((s) => { const ts = s.tasks[id]; ts.step = Math.min((ts.step || 0) + 1, ins.steps.length - 1); });
    UI.toast('1つ進みました！');
  });

  act('print', () => window.print());

  /* ---------- ひとつずつ見る（集中しやすいように、いまの段階だけを大きく） ---------- */
  act('focus-mode', (el) => {
    const id = el.getAttribute('data-id');
    const t = L.task(id);
    const ins = K.instrFor(t);
    const steps = ins.steps || [];
    if (!steps.length) return;
    let i = Math.min(L.ts(id).step || 0, steps.length - 1);
    let finished = false;
    const startAt = Date.now();
    const body = () => {
      if (finished) {
        return `<div class="fm fm-done">${Icons.pikuto(110, 'happy')}<p class="fm-title">ぜんぶ おわったね！</p><p class="fm-text">さいごに、指示書の「できたらチェック」を見てから、「これで提出する」を押そう。</p></div>`;
      }
      const st = steps[i];
      const lessons = (st[2] || []).filter(Boolean);
      return `<div class="fm">
        <div class="fm-top"><span class="fm-count">${i + 1} / ${steps.length}</span><div class="bar"><i style="width:${Math.round((i) / steps.length * 100)}%"></i></div></div>
        <p class="fm-title">${esc(st[0])}</p>
        <p class="fm-text">${esc(st[1])}</p>
        ${lessons.length ? `<div class="fm-lessons">${lessons.map((lid) => { const l = K.lessonById[lid]; return `<a class="sl-lesson" href="#/learner/watch/${lid}" data-close>${Icons.icon(L.lp(lid) >= 1 ? 'checkc' : 'playc')}<span>${esc(K.seriesById[l.series].title + l.label + '「' + l.title + '」')}</span>${l.dur ? `<small>${l.dur}分</small>` : ''}</a>`; }).join('')}</div>` : ''}
        <div class="fm-pk">${Icons.pikuto(44, 'normal')}<span>わからない時は、ぴくとに聞いてね。<br>ほかのことは、いまは見なくて大丈夫。</span></div>
      </div>`;
    };
    const foot = () => finished
      ? `<button class="btn btn-lg" type="button" data-close>とじる</button><button class="btn btn-primary btn-lg" type="button" data-fm="submit">${Icons.icon('send')}<span>これで提出する</span></button>`
      : `<button class="btn btn-lg" type="button" data-fm="prev" ${i === 0 ? 'disabled' : ''}>${Icons.icon('left')}<span>まえ</span></button><button class="btn btn-primary btn-lg" type="button" data-fm="next">${Icons.icon('check')}<span>${i === steps.length - 1 ? 'できた！' : 'できた！つぎへ'}</span></button>`;
    UI.sheet({
      title: 'ひとつずつ見る', icon: ic('target'), wide: true,
      body: raw(`<div data-fm-body>${body()}</div>`),
      foot: raw(`<div class="fm-foot" data-fm-foot>${foot()}</div>`),
      mount: (sh, close) => {
        const redraw = () => {
          sh.querySelector('[data-fm-body]').innerHTML = body();
          sh.querySelector('[data-fm-foot]').innerHTML = foot();
          if (App.settings().furigana) Furi.apply(sh);
        };
        sh.addEventListener('click', (e) => {
          const b = e.target.closest('[data-fm]'); if (!b) return;
          const k = b.getAttribute('data-fm');
          if (k === 'prev' && i > 0) { i--; redraw(); }
          if (k === 'next') {
            Store.update((s) => { const ts = s.tasks[id] = Object.assign({ checks: [] }, s.tasks[id] || {}); if (ts.status === 'todo') { ts.status = 'doing'; ts.startedAt = nowISO(); } ts.step = Math.min(i + 1, steps.length - 1); }, { silent: true });
            if (i < steps.length - 1) { i++; UI.toast('1つ できたね！'); } else { finished = true; UI.confetti(); }
            redraw();
          }
          if (k === 'submit') { close(); setTimeout(() => { App.refresh(); const btn = document.querySelector('.ta-submit'); if (btn) btn.click(); }, 260); }
        });
      },
      onClose: () => App.refresh()
    });
  });

  /* ---------- 質問する（ぴくと） ---------- */
  act('ask', (el) => {
    const id = el.getAttribute('data-id');
    const t = L.task(id);
    UI.sheet({
      title: 'ぴくとに質問する', icon: raw(Icons.pikuto(40, 'happy')), iconCls: '',
      body: html`<p class="ink2">「${t.title}」のことを、ぴくとが答えます。<br><span class="small muted">合格かどうかは言いません。ヒントを出します。</span></p>
        <div class="field"><span class="label">よくある質問</span><div class="stack-sm">${['つぎに何をすればいい？', '指示書をかんたんに言って', 'これで合ってる？', 'やることを小さく分けて', '画像がうまく入らない'].map((q) => html`<button class="btn btn-block ask-q" type="button" data-q="${q}">${ic('ask')}<span class="grow" style="text-align:left">${q}</span>${ic('right')}</button>`)}</div></div>
        <div class="field"><label class="label" for="askq">自分で書く</label><textarea class="textarea" id="askq" placeholder="例：写真の下の説明は、何文字くらい？" style="min-height:96px"></textarea>
        <button class="btn btn-ghost btn-sm" type="button" data-act="noop">${ic('image')}<span>画面の写真をつける</span></button></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-primary btn-lg" type="button" data-yes>${ic('send')}<span>ぴくとに聞く</span></button>`,
      mount: (sh, close) => {
        const send = (q) => { if (!q.trim()) return; close(); App.go(`#/learner/task/${id}?tab=chat`); setTimeout(() => askPikuto(q, id), 260); };
        sh.querySelectorAll('.ask-q').forEach((b) => b.addEventListener('click', () => send(b.getAttribute('data-q'))));
        sh.querySelector('[data-yes]').addEventListener('click', () => send(sh.querySelector('#askq').value));
      }
    });
  });
  act('pk-easy', (el) => { const id = el.getAttribute('data-id'); App.go(`#/learner/task/${id}?tab=chat`); setTimeout(() => askPikuto('指示書をかんたんに言って', id), 260); });
  act('pk-suggest', (el) => { const form = el.closest('form'); askPikuto(el.getAttribute('data-q'), form.getAttribute('data-task') || null); });
  act('pk-send', (form) => { const q = form.q.value; if (!q.trim()) return; form.q.value = ''; askPikuto(q, form.getAttribute('data-task') || null); });
  act('pk-quick', (el) => { App.go('#/learner/pikuto'); setTimeout(() => askPikuto(el.getAttribute('data-q'), null), 260); });
  act('voice', (el) => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return;
    const rec = new R(); rec.lang = 'ja-JP'; rec.interimResults = false;
    const ta = el.closest('form').querySelector('textarea');
    el.setAttribute('aria-pressed', 'true');
    UI.toast('話してください。おわると文字になります', { icon: 'mic' });
    rec.onresult = (e) => { ta.value = (ta.value + e.results[0][0].transcript).trim(); ta.focus(); };
    rec.onend = () => el.setAttribute('aria-pressed', 'false');
    try { rec.start(); } catch (e) { el.setAttribute('aria-pressed', 'false'); }
  });

  /** ぴくとに聞く：taskId があれば課題のチャット、なければ ぴくとのページ */
  function askPikuto(q, taskId) {
    const explicit = taskId ? L.task(taskId) : null;
    const next = L.nextStep({ noLive: true });
    const t = explicit || next.task || null; // 課題をえらんでいない時は、いま取り組んでいる課題のこととして答える
    const ins = t ? K.instrFor(t) : null;
    const pushTo = (s, m) => { if (taskId) (s.chats[taskId] = s.chats[taskId] || []).push(m); else s.pikuto.push(m); };
    Store.update((s) => { pushTo(s, { from: 'me', at: nowISO(), text: q }); s.myDay.activity = { type: 'pikuto', at: nowISO(), ref: taskId }; }, { silent: true });
    redrawChat(taskId);
    const box = document.querySelector('.chat-scroll');
    let typing = null;
    if (box) { typing = document.createElement('div'); typing.className = 'msg msg-bot'; typing.innerHTML = `<span class="pk-av">${Icons.pikuto(36, 'think')}</span><div><div class="who">ぴくと（AI）</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>`; box.appendChild(typing); typing.scrollIntoView({ block: 'end', behavior: 'smooth' }); }
    const r = Pikuto.reply(q, { task: t, instr: ins, ts: t ? L.ts(t.id) : null, next, explicit: !!explicit });
    setTimeout(() => {
      Store.update((s) => {
        pushTo(s, { from: 'bot', at: nowISO(), text: r.text, html: Pikuto.bubbleHtml(r), mood: r.mood });
        if (r.alert) s.alerts.unshift({ id: Core.uid('al'), type: 'emergency', learner: s.me, at: nowISO(), status: 'open', title: 'ぴくとへの相談に、つらい気持ちのことばがありました', quote: q.slice(0, 60), hint: 'まずは静かな場所で、ゆっくり話を聞いてください。' });
      }, { silent: true });
      redrawChat(taskId);
      if (r.alert) UI.toast('職員さんに知らせました', { icon: 'hand' });
      if (S().settings.learner.autoSpeak) UI.speak(r.text + (r.steps ? '。' + r.steps.join('。') : ''));
    }, Clock.frozen ? 0 : 900);
  }
  window.askPikuto = askPikuto;
  function redrawChat(taskId) {
    const box = document.querySelector('.chat-scroll');
    if (!box) return;
    const list = taskId ? (S().chats[taskId] || []) : S().pikuto;
    box.innerHTML = Core.toHtml(list.map(msgHtml));
    if (App.settings().furigana) Furi.apply(box);
    const last = box.lastElementChild;
    if (last) last.scrollIntoView({ block: 'end', behavior: Clock.frozen ? 'auto' : 'smooth' });
  }

  /* ---------- これで提出する ---------- */
  act('submit', (el) => {
    const id = el.getAttribute('data-id');
    const t = L.task(id);
    const ins = K.instrFor(t);
    const ts = L.ts(id);
    const checks = ins.checks || [];
    const doneN = checks.filter((_, i) => (ts.checks || [])[i]).length;
    const sub = ins.submit || { type: 'text', label: '作品' };
    let files = [];
    const fileBox = () => files.length ? files.map((f, i) => `<div class="file-chip"><span class="fc-art">${Art.preview(sub.type === 'video' ? 'video' : 'banner', { hue: 190 + i * 40, title: f.replace(/\.\w+$/, ''), sub: '' })}</span><span class="grow small bold">${esc(f)}</span><button class="icon-btn" type="button" data-rm="${i}" aria-label="けす">${Icons.icon('x')}</button></div>`).join('') : '';
    UI.sheet({
      title: 'これで提出する', icon: ic('send'),
      body: html`<div class="sub-steps">
        <section class="field"><span class="label"><span class="num-badge">1</span>出すもの：${sub.label}</span>
          ${sub.type === 'url' ? html`<input class="input" id="sub-url" type="url" inputmode="url" placeholder="${sub.placeholder || 'https://'}" autocomplete="off"><button class="linkbtn" type="button" data-fill-url>${ic('wand')}試作用：例のURLを入れる</button>`
            : sub.type === 'text' ? html`<textarea class="textarea" id="sub-text" placeholder="ここに はりつけてね"></textarea>`
            : html`<div class="drop"><input type="file" id="sub-file" accept="${sub.type === 'video' ? 'video/*' : 'image/*'}" multiple hidden><button class="btn btn-block" type="button" data-pick>${ic('upload')}<span>ファイルをえらぶ</span></button><button class="linkbtn" type="button" data-fake>${ic('wand')}試作用：見本のファイルを入れる</button><div class="file-list" data-files></div></div>`}
        </section>
        <section class="field"><label class="label" for="sub-msg"><span class="num-badge">2</span>ひとこと<span class="opt">（なくてもOK）</span></label>
          <div class="cluster">${['がんばった所は', 'むずかしかった所は', '見てほしい所は'].map((p) => html`<button class="fchip" type="button" data-phrase="${p}">${p}…</button>`)}</div>
          <textarea class="textarea" id="sub-msg" style="min-height:90px" placeholder="例：写真の大きさを そろえました"></textarea></section>
        <section class="field"><span class="label"><span class="num-badge">3</span>さいごの確認</span>
          ${doneN === checks.length ? html`<div class="banner ok">${ic('checkc')}<span class="b-text">チェックは ぜんぶ ついています（${doneN}/${checks.length}）</span></div>`
            : html`<div class="banner warn">${ic('info')}<span class="b-text">チェックが まだ ${checks.length - doneN}つ あります<p>このまま出しても大丈夫。運営の人が見て、返事をくれます。</p></span></div>`}
        </section></div>`,
      foot: html`<button class="btn btn-lg" type="button" data-close>やめる</button><button class="btn btn-primary btn-lg" type="button" data-yes>${ic('send')}<span>これで提出する</span></button>`,
      mount: (sh, close) => {
        const fl = sh.querySelector('[data-files]');
        const redraw = () => { if (fl) { fl.innerHTML = fileBox(); fl.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { files.splice(Number(b.dataset.rm), 1); redraw(); })); } };
        const pick = sh.querySelector('[data-pick]');
        if (pick) { const inp = sh.querySelector('#sub-file'); pick.addEventListener('click', () => inp.click()); inp.addEventListener('change', () => { files = files.concat(Array.from(inp.files).map((f) => f.name)); redraw(); }); }
        const fake = sh.querySelector('[data-fake]');
        if (fake) fake.addEventListener('click', () => { const n = sub.files || 1; files = sub.type === 'video' ? ['秋まつり_紹介.mp4'] : Array.from({ length: n }).map((_, i) => ['OGP画像.png', '相談バナー.png', '記事の図.png', 'アイキャッチ.png'][i] || `画像${i + 1}.png`); redraw(); });
        const fu = sh.querySelector('[data-fill-url]');
        if (fu) fu.addEventListener('click', () => { sh.querySelector('#sub-url').value = 'https://aoki-sakura-blog.studio.site/kaigo-data'; });
        sh.querySelectorAll('[data-phrase]').forEach((b) => b.addEventListener('click', () => { const ta = sh.querySelector('#sub-msg'); ta.value = (ta.value ? ta.value + '\n' : '') + b.dataset.phrase + '、'; ta.focus(); }));
        sh.querySelector('[data-yes]').addEventListener('click', () => {
          let payload = [];
          if (sub.type === 'url') { const v = sh.querySelector('#sub-url').value.trim(); if (!v) { UI.toast('URLを入れてね（試作用のボタンでも入れられます）', { icon: 'info' }); sh.querySelector('#sub-url').focus(); return; } payload = [v]; }
          else if (sub.type === 'text') { const v = sh.querySelector('#sub-text').value.trim(); if (!v) { UI.toast('出すものを はりつけてね', { icon: 'info' }); return; } payload = [v.slice(0, 40) + (v.length > 40 ? '…' : '')]; }
          else { if (!files.length) { UI.toast('ファイルをえらんでね（試作用のボタンでも入れられます）', { icon: 'info' }); return; } payload = files.slice(); }
          const msg = sh.querySelector('#sub-msg').value.trim();
          doSubmit(t, payload, msg, sub.type);
          close();
          setTimeout(() => celebrate(t), 240);
        });
      }
    });
  });
  function doSubmit(t, files, msg, kind) {
    const me = L.me();
    const firstName = L.firstName(me);
    Store.update((s) => {
      const ts = s.tasks[t.id] = Object.assign({ checks: [] }, s.tasks[t.id] || {});
      ts.status = 'submitted'; ts.submittedAt = nowISO(); ts.unread = false;
      (s.chats[t.id] = s.chats[t.id] || []).push({ from: 'sys', at: nowISO(), text: `「これで提出する」で出しました（${kind === 'url' ? 'URL' : kind === 'image' ? `画像${files.length}まい` : kind === 'video' ? '動画' : '文'}）` });
      if (msg) s.chats[t.id].push({ from: 'me', at: nowISO(), text: msg });
      s.submissions = s.submissions.filter((x) => !(x.learner === s.me && x.task === t.id && x.status === 'waiting'));
      const ins = K.instrFor(t);
      const checks = ins.checks || [];
      const okN = checks.filter((_, i) => ts.checks[i]).length;
      s.submissions.unshift({
        id: Core.uid('sb'), learner: s.me, facility: 'f-hidamari', task: t.id, at: nowISO(), kind, files, message: msg, status: 'waiting', fresh: true,
        ai: {
          verdict: okN === checks.length ? 'good' : 'fix', conf: okN === checks.length ? 84 : 71,
          points: checks.map((c, i) => [ts.checks[i] ? 1 : 0, ts.checks[i] ? `「${c}」ができています` : `「${c}」が、まだできていないようです`]),
          draft: okN === checks.length
            ? `${firstName}さん、「${t.title}」を見ました。\n指示書のチェックが ぜんぶできていて、とても見やすく仕上がっています。${msg ? '\n「' + msg.split('\n')[0].slice(0, 30) + '」と書いてくれた所も、よく分かりました。' : ''}\n\nこのまま進めて大丈夫です。おつかれさまでした！`
            : `${firstName}さん、「${t.title}」を見ました。\nここまで よく作れています。\n\n${checks.filter((_, i) => !ts.checks[i]).slice(0, 2).map((c, i) => `${i + 1}. 「${c}」を、もう一度 確かめてください。`).join('\n')}\n\n直したら、もう一度「これで提出する」から出してください。`
        }
      });
      s.myDay.activity = { type: 'submit', at: nowISO(), ref: t.id };
    });
  }
  function celebrate(t) {
    UI.confetti();
    UI.sheet({
      title: '出せました！',
      body: html`<div class="done-box">${raw(Icons.pikuto(120, 'happy'))}
        <p class="done-title">おつかれさま！</p>
        <p class="ink2">「${t.title}」を出しました。<br>運営の人が見て、返事をくれます。<br><b>返事は この課題の「チャット」にとどきます。</b>ふつうは2日くらいです。</p>
        <p class="small muted">試作のヒント：運営の入口の「提出チェック」に、いま出したものが とどいています。</p></div>`,
      foot: html`<a class="btn btn-lg" href="#/learner/task/${t.id}?tab=chat" data-close>チャットを見る</a><a class="btn btn-primary btn-lg" href="#/learner/home" data-close>${ic('steps')}<span>つぎの一歩へ</span></a>`
    });
  }

  /* ---------- ぴくと ---------- */
  function pagePikuto(route) {
    const msgs = S().pikuto;
    const about = route.query.about ? K.lessonById[route.query.about] : null;
    return {
      title: 'ぴくと', nav: 'pikuto',
      html: html`<div class="page pk-page">
        <div class="pk-layout">
          <div class="stack-lg pk-main">
            <header class="pk-head card">
              <span class="pk-big">${raw(Icons.pikuto(76, 'happy'))}</span>
              <div class="grow"><h1>ぴくと</h1><p class="ink2 small">24時間 いつでも答えるAIです。合格かどうかは言いません。ヒントを出します。</p></div>
            </header>
            <details class="card fold pk-promise hide-pc"><summary><span class="ico-badge sm">${ic('shieldcheck')}</span><span class="grow"><b>ぴくとの やくそく</b></span>${ic('down')}</summary>${promise()}</details>
            ${about ? html`<div class="banner">${ic('playc')}<span class="b-text">動画「${about.title}」について聞けます</span></div>` : ''}
            <div class="chat chat-scroll" aria-live="polite">${msgs.map(L.msgHtml)}</div>
            <div class="pk-composer">${composer(null, 'ぴくとに聞いてみよう')}</div>
          </div>
          <aside class="stack-lg hide-sp">
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('shieldcheck')}ぴくとの やくそく</h2></div>${promise()}</section>
            <section class="card card-pad sec"><div class="sec-head"><h2>${ic('bulb')}よく聞かれること</h2></div>
              <div class="stack-sm">${['OGP画像の大きさは？', '目次の作り方を教えて', '書き出しのやり方は？', 'つかれた'].map((q) => html`<button class="btn btn-block" type="button" data-act="pk-quick" data-q="${q}" style="justify-content:flex-start">${ic('ask')}<span>${q}</span></button>`)}</div></section>
          </aside>
        </div>
      </div>`,
      mount: (root) => { L.setActivity({ type: 'pikuto' }); const box = root.querySelector('.chat-scroll'); if (box && box.lastElementChild) box.lastElementChild.scrollIntoView({ block: 'end' }); if (about) { const ta = root.querySelector('textarea'); ta.value = `「${about.title}」の動画で、`; } }
    };
  }
  function promise() {
    return html`<ul class="promise">
      <li>${ic('check')}<span>合格かどうかは言いません。<b>ヒントを出します。</b></span></li>
      <li>${ic('check')}<span>やることを<b>小さく分けて</b>、いっしょに考えます。</span></li>
      <li>${ic('check')}<span>体や気持ちが つらそうな時は、<b>職員さんに知らせます。</b></span></li>
      <li>${ic('info')}<span>ぴくとも まちがえることがあります。大事なことは職員さんに確かめてね。</span></li>
    </ul>`;
  }

  /* ---------- 作ったもの（成果物） ---------- */
  function pageWorks(route) {
    const g = route.query.g || 'all';
    const works = S().works.filter((w) => g === 'all' || w.genre === g);
    return {
      title: '作ったもの', nav: 'works',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><span class="eyebrow">成果物</span><h1>作ったもの</h1><p class="lead">運営が確認した作品が ならびます。ふりかえりや、見せたい時に使えます。</p></div>
          <div class="works-count"><b>${S().works.length}</b><span>こ</span></div></div>
        <div class="filters">${[['all', 'ぜんぶ'], ['web', 'Web制作'], ['design', '画像デザイン']].map(([k, n]) => html`<a class="fchip" href="#/learner/works?g=${k}" aria-pressed="${g === k}">${n}</a>`)}</div>
        <div class="grid-auto works">${works.map((w) => html`<button class="card work-card" type="button" data-act="work" data-id="${w.id}">
          <span class="wc-art">${raw(Art.preview(w.kind, { hue: w.hue, title: w.art || w.title, sub: 'エスピクトスクール' }))}</span>
          <span class="wc-body"><span class="wc-title clamp-2">${w.title}</span><span class="cluster"><span class="chip chip-ok">${ic('check')}運営OK</span><span class="xsmall muted">${fmt.date(w.at)}</span></span></span></button>`)}</div>
      </div>`
    };
  }
  act('work', (el) => {
    const w = S().works.find((x) => x.id === el.getAttribute('data-id'));
    UI.sheet({
      title: w.title, wide: true,
      body: html`<div class="card" style="overflow:hidden">${raw(Art.preview(w.kind, { hue: w.hue, title: w.art || w.title, sub: 'エスピクトスクール' }))}</div>
        <div class="grid-2">
          <div class="card card-soft card-pad stack-sm"><b class="row" style="gap:6px">${ic('edit')}くふうした所</b><p>${w.note}</p></div>
          <div class="card card-ok card-pad stack-sm"><b class="row" style="gap:6px">${ic('chat')}運営からのことば</b><p>${w.comment}</p></div>
        </div><p class="small muted">${fmt.date(w.at)} に運営が確認しました</p>`
    });
  });

  /* ---------- 案件ボード ---------- */
  function meets(job) {
    const me = L.me();
    if (job.need.text === 'だれでも') return true;
    const lvN = { beginner: 1, middle: 2, advanced: 3 };
    return me.genres.includes(job.need.genre) && (lvN[me.level] || 1) >= (lvN[job.need.level] || 1);
  }
  function pageJobs() {
    const jobs = S().jobs;
    const mine = S().me;
    const st = { open: ['募集中', 'chip-ok'], soon: ['しめきり近い', 'chip-warn'], prep: ['準備中', ''], closed: ['しめきり', ''] };
    return {
      title: '案件ボード', nav: 'jobs',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>案件ボード</h1><p class="lead">いま受けられる お仕事です。「やってみたい」を押すと、職員さん・運営と相談して決めます。</p></div></div>
        <div class="banner">${ic('info')}<span class="b-text">お仕事の内容や進め方は、事業所の職員さん・運営と いっしょに決めます。<p>はじめての人は「練習用」の案件から ためせます。</p></span></div>
        <div class="stack">${jobs.map((j) => {
          const ok = meets(j);
          const applied = j.applicants.includes(mine);
          const [sl, sc] = st[j.status] || st.open;
          return html`<article class="card job-card ${applied ? 'is-applied' : ''}">
            <div class="jc-main">${L.gmark(j.genre)}
              <div class="grow"><div class="cluster"><span class="chip ${sc}">${sl}</span>${j.practice ? html`<span class="chip chip-info">練習用（納品なし）</span>` : ''}</div>
                <h2 class="jc-title">${j.title}</h2>
                <dl class="jc-dl"><div><dt>${ic('package')}量</dt><dd>${j.amount}</dd></div><div><dt>${ic('calendar')}期間</dt><dd>${j.period}</dd></div><div><dt>${ic('building')}たのむ人</dt><dd>${j.client}</dd></div></dl>
                ${j.note ? html`<p class="small ink2">${j.note}</p>` : ''}
              </div></div>
            <div class="jc-foot">
              <span class="status ${ok ? 'ok' : 'mute'}">${ic(ok ? 'checkc' : 'lock')}${ok ? '受けられます' : `条件：${j.need.text}`}</span>
              <span class="xsmall muted">${ic('users')} 手をあげた人 ${j.applicants.length}人</span>
              <span class="grow"></span>
              ${j.status === 'prep' ? html`<button class="btn" type="button" disabled>準備中</button>` : applied ? html`<button class="btn btn-ok" type="button" data-act="job-cancel" data-id="${j.id}">${ic('check')}<span>手をあげました</span></button>` : html`<button class="btn ${ok ? 'btn-primary' : ''}" type="button" data-act="job-apply" data-id="${j.id}" ${ok ? '' : raw('aria-disabled="true"')}>${ic('hand')}<span>やってみたい</span></button>`}
            </div>
          </article>`;
        })}</div>
      </div>`
    };
  }
  act('job-apply', async (el) => {
    const j = S().jobs.find((x) => x.id === el.getAttribute('data-id'));
    const yes = await UI.confirm({ title: '手をあげますか？', icon: ic('hand'), iconCls: 'sun', text: `「${j.title}」をやってみたいと、職員さんと運営に伝えます。まだ決まりではありません。いっしょに相談して決めます。`, yes: '手をあげる', no: 'やめる' });
    if (!yes) return;
    Store.update((s) => { const x = s.jobs.find((y) => y.id === j.id); if (!x.applicants.includes(s.me)) x.applicants.push(s.me); });
    UI.toast('手をあげました。職員さん・運営から連絡があります');
  });
  act('job-cancel', (el) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { const x = s.jobs.find((y) => y.id === id); x.applicants = x.applicants.filter((a) => a !== s.me); });
    UI.toast('手をおろしました');
  });

  /* ---------- お知らせ ---------- */
  const NOTICE_ICON = { reply: ['chat', 'ok'], live: ['live', 'live'], job: ['briefcase', ''], task: ['task', ''], staff: ['user', 'sun'] };
  function pageNotices() {
    const list = S().notices.slice().sort(by('at', 'desc'));
    const today = list.filter((n) => Core.jst(n.at).date === Core.DEMO_DAY);
    const before = list.filter((n) => Core.jst(n.at).date !== Core.DEMO_DAY);
    const row = (n) => { const [i, c] = NOTICE_ICON[n.type] || ['bell', '']; return html`<li><a class="row-item notice ${n.unread ? 'is-unread' : ''}" href="${n.go || '#/learner/notices'}" data-act="notice-read" data-id="${n.id}">
      <span class="ico-badge ${c}">${ic(i)}</span><span><span class="ri-title">${n.title}</span><span class="ri-sub">${n.body}</span><span class="xsmall muted">${fmt.ago(n.at)}</span></span><span class="ri-end">${n.unread ? html`<span class="dot live" aria-label="まだ読んでいない"></span>` : ''}</span></a></li>`; };
    return {
      title: 'お知らせ', nav: 'notices',
      html: html`<div class="page">
        <div class="page-head"><div class="ph-text"><h1>お知らせ</h1></div><div class="ph-actions"><button class="btn btn-sm" type="button" data-act="notice-all">${ic('check')}<span>ぜんぶ読んだ</span></button></div></div>
        ${today.length ? html`<section class="sec"><div class="sec-head"><h2>きょう</h2></div><ul class="card rows">${today.map(row)}</ul></section>` : ''}
        <section class="sec"><div class="sec-head"><h2>これまで</h2></div><ul class="card rows">${before.map(row)}</ul></section>
      </div>`
    };
  }
  act('notice-read', (el, e) => {
    const id = el.getAttribute('data-id');
    Store.update((s) => { const n = s.notices.find((x) => x.id === id); if (n) n.unread = false; }, { silent: true });
    const href = el.getAttribute('href');
    if (href) App.go(href); else App.refresh();
  });
  act('notice-all', () => { Store.update((s) => s.notices.forEach((n) => { n.unread = false; })); UI.toast('ぜんぶ読んだにしました'); });

  /* ---------- 見やすさ・設定 ---------- */
  function pageSettings() {
    const st = S().settings.learner;
    const sw = (key, label, sub, iconName) => html`<label class="row-item set-row"><span class="ico-badge sm">${ic(iconName)}</span><span><span class="ri-title">${label}</span><span class="ri-sub">${sub}</span></span><span class="switch"><input type="checkbox" ${st[key] ? 'checked' : ''} data-change="set" data-key="${key}" aria-label="${label}"><span class="sw-track"></span></span></label>`;
    return {
      title: '見やすさ・設定', nav: 'settings',
      html: html`<div class="page settings">
        <div class="page-head"><div class="ph-text"><h1>見やすさ・設定</h1><p class="lead">自分が見やすいように、変えてみよう。すぐに画面に反映されます。</p></div></div>
        <section class="sec"><div class="sec-head"><h2>${ic('textsize')}文字の大きさ</h2></div>
          <div class="choice-grid fs-choice" style="--cols:3">${[[1, 'ふつう'], [2, '大きい'], [3, 'とても大きい']].map(([v, n]) => html`<button class="choice" type="button" data-act="set-fs" data-v="${v}" aria-pressed="${st.fs === v}"><span class="fs-a fs-a${v}">あ</span><span>${n}</span></button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('sun')}画面の色</h2></div>
          <div class="choice-grid" style="--cols:2">${[['light', '明るい', 'sun'], ['dark', 'ダーク（暗い）', 'moon']].map(([v, n, i]) => html`<button class="choice theme-${v}" type="button" data-act="set-theme" data-v="${v}" aria-pressed="${st.theme === v}">${ic(i, { size: 28 })}<span>${n}</span></button>`)}</div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('eye')}読みやすさ</h2></div>
          <div class="card rows">
            ${sw('contrast', 'くっきり表示', '文字と線を こく、太くします', 'contrast')}
            ${sw('furigana', 'ふりがな', 'むずかしい漢字に よみがなをつけます', 'textsize')}
            ${sw('reduceMotion', '動きを へらす', '画面の動きを 少なくします', 'wave')}
            ${sw('breakRemind', '休けいの おしらせ', '50分ごとに「休もう」と出します', 'coffee')}
          </div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('volume')}読み上げ</h2></div>
          <div class="card card-pad stack">
            <div class="seg seg-block" role="group" aria-label="読み上げの速さ">${[[0.75, 'ゆっくり'], [0.95, 'ふつう'], [1.2, 'はやい']].map(([v, n]) => html`<button type="button" data-act="set-rate" data-v="${v}" aria-selected="${st.speechRate === v}">${n}</button>`)}</div>
            <button class="btn" type="button" data-act="say" data-say="こんにちは。ぴくとです。この速さで 読み上げます。">${ic('volume')}<span>ためしに読む</span></button>
            <label class="row-item set-row" style="padding:8px 2px;min-height:0"><span class="ico-badge sm">${ic('chat')}</span><span><span class="ri-title">ぴくとの答えを 自動で読む</span><span class="ri-sub">答えがとどいたら、すぐに声で読みます</span></span><span class="switch"><input type="checkbox" ${st.autoSpeak ? 'checked' : ''} data-change="set" data-key="autoSpeak" aria-label="ぴくとの答えを自動で読む"><span class="sw-track"></span></span></label>
            <p class="small muted">「よむ」ボタンを押すと、その場所の文を 声で読みます。</p>
          </div></section>
        <section class="card card-pad sec preview-card"><div class="sec-head"><h2>${ic('eye')}見え方の見本</h2></div>
          <p><b>つぎの一歩</b>：ブログ講座⑤「写真と説明」を見る</p><p class="small ink2">課題「写真と目次で『介護のデータ入力』記事を完成！」のために見ます。</p>
          <div class="cluster"><span class="chip chip-lv2">中級</span><span class="chip chip-info">とりくみ中</span></div></section>
        <section class="sec"><div class="sec-head"><h2>${ic('info')}試作について</h2></div>
          <div class="card rows">
            <button class="row-item" type="button" data-act="reset">${html`<span class="ico-badge sm warn">${ic('refresh')}</span>`}<span><span class="ri-title">データを最初にもどす</span><span class="ri-sub">押したり出したりしたことが、はじめの状態にもどります</span></span><span class="chev">${ic('right')}</span></button>
            <a class="row-item" href="index.html#/">${html`<span class="ico-badge sm">${ic('back')}</span>`}<span><span class="ri-title">入口にもどる</span><span class="ri-sub">職員・運営の画面も見られます</span></span><span class="chev">${ic('right')}</span></a>
          </div></section>
      </div>`
    };
  }
  act('set', (el) => { const k = el.getAttribute('data-key'); Store.update((s) => { s.settings.learner[k] = el.checked; }); if (k === 'furigana' && el.checked) UI.toast('ふりがなを つけました'); });
  act('set-fs', (el) => { Store.update((s) => { s.settings.learner.fs = Number(el.getAttribute('data-v')); }); });
  act('set-theme', (el) => { Store.update((s) => { s.settings.learner.theme = el.getAttribute('data-v'); }); });
  act('set-rate', (el) => { Store.update((s) => { s.settings.learner.speechRate = Number(el.getAttribute('data-v')); }); });
  act('reset', async () => {
    const yes = await UI.confirm({ title: 'データを最初にもどしますか？', icon: ic('refresh'), iconCls: 'warn', text: '利用者・職員・運営のぜんぶの画面で、押したり出したりしたことが、はじめの状態にもどります。', yes: 'もどす', danger: true });
    if (!yes) return;
    Store.reset(); App.applySettings(); App.render(); UI.toast('最初の状態にもどしました');
  });

  Object.assign(L.routes, {
    'tasks': pageTasks,
    'task/:id': pageTask,
    'pikuto': pagePikuto,
    'works': pageWorks,
    'jobs': pageJobs,
    'notices': pageNotices,
    'settings': pageSettings
  });

  App.register('learner', { routes: L.routes, shell: L.shell, home: 'home' });
  Store.on(() => { if (App.current && App.current.role === 'learner') App.refresh(); });
})();
