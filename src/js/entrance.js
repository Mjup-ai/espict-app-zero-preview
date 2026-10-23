/* =========================================================
   入口（3つの入口・つながりを試す・試作の時計）
   ========================================================= */
(function () {
  'use strict';
  const { html, raw, ic } = Core;

  function page() {
    const s = Store.state;
    const k = s.clock;
    const waiting = s.submissions.filter((x) => x.status === 'waiting').length;
    const openAlerts = s.alerts.filter((a) => a.status === 'open').length;
    return {
      title: '入口',
      html: html`<div class="entrance">
        <header class="en-top">
          <div class="row en-brand">${raw(Icons.logoMark(40))}<div><div class="wordmark">エスピクトスクール</div><div class="xsmall muted bold">アプリの試作<span class="hide-sp">（クリックして ためせます）</span></div></div></div>
          <a class="btn btn-sm btn-ghost" href="notes.html">${ic('file')}<span>考えたこと</span></a>
        </header>

        <section class="en-hero">
          <div class="en-hero-text">
            <span class="en-kicker">${ic('sparkles')}見た目と体験を、ゼロから つくりなおしました</span>
            <h1>つぎの一歩が、<br>いつも見える。</h1>
            <p>利用者は「いま何をすればいいか」で迷わない。職員は「声をかけるべき人」がすぐ分かる。運営は「確認と返事」をすばやく、やさしく。3つの入口から ためせます。</p>
          </div>
          <div class="en-hero-art" aria-hidden="true">
            <div class="en-phone">
              <div class="en-phone-bar"><span></span></div>
              <div class="en-ph-greet">おはようございます、さくらさん</div>
              <div class="en-ph-hero"><b>つぎの一歩</b><span>ブログ講座⑤「写真と説明」の つづきを見る</span><i>▶ つづきから見る</i></div>
              <div class="en-ph-live"><b>授業LIVE</b><span>10:10〜 Web制作</span><em>18<small>分後</small></em></div>
              <div class="en-ph-row"><i></i><i></i></div>
              <div class="en-ph-tab"><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <div class="en-pk">${raw(Icons.pikuto(120, 'happy'))}</div>
          </div>
        </section>

        <section class="en-doors" aria-label="3つの入口">
          <a class="door door-learner" href="#/learner/home">
            <span class="door-ico">${raw(Icons.pikuto(56, 'happy'))}</span>
            <span class="door-role">利用者（受講者）</span>
            <span class="door-title">きょうの つぎの一歩</span>
            <span class="door-list"><span>${ic('steps')}いまやることが1つだけ大きく出る</span><span>${ic('live')}授業LIVE まで あと何分</span><span>${ic('send')}出し方は2つのボタンだけ</span><span>${ic('volume')}読み上げ・ふりがな・文字の大きさ</span></span>
            <span class="door-go">ひらく${ic('next')}</span>
          </a>
          <a class="door door-staff" href="#/staff/today">
            <span class="door-ico"><span class="ico-badge lg">${ic('users')}</span></span>
            <span class="door-role">事業所の職員（支援員）</span>
            <span class="door-title">声かけが必要な人が、すぐ分かる</span>
            <span class="door-list"><span>${ic('alert')}緊急の知らせは「対応した」まで いちばん上</span><span>${ic('users')}来た・取り組み中・止まっている が ひと目で</span><span>${ic('calcheck')}出席と月の報告（下書きつき）</span></span>
            <span class="door-go">ひらく${openAlerts ? html`<span class="count">${openAlerts}</span>` : ''}${ic('next')}</span>
          </a>
          <a class="door door-admin" href="#/admin/review">
            <span class="door-ico"><span class="ico-badge lg">${ic('inbox')}</span></span>
            <span class="door-role">運営（エスピクトスクール）</span>
            <span class="door-title">確認と返事を、すばやく・やさしく</span>
            <span class="door-list"><span>${ic('sparkles')}AIの判定と返事の下書き →「OK／直してOK／出さない」</span><span>${ic('textsize')}やさしい日本語チェックつき</span><span>${ic('layers')}課題を「作り方×級」でまとめて配信</span></span>
            <span class="door-go">ひらく${waiting ? html`<span class="count">${waiting}</span>` : ''}${ic('next')}</span>
          </a>
        </section>

        <section class="en-flows">
          <div class="sec-head"><h2>${ic('route')}3つの画面は つながっています</h2></div>
          <p class="muted small">この端末のブラウザの中で、データがつながります。PCなら、2つのタブで同時に開くと すぐに反映されます。</p>
          <div class="grid-3">
            <div class="flow-card"><span class="flow-no">A</span><b>出す → 確かめる → 返事がとどく</b>
              <ol><li><span><a href="#/learner/task/${window.TASK_IDS.blogS2}">利用者</a>で課題を「これで提出する」</span></li><li><span><a href="#/admin/review">運営の提出チェック</a>で「OK」</span></li><li><span>利用者の課題のチャットに返事がとどく</span></li></ol></div>
            <div class="flow-card"><span class="flow-no">B</span><b>こまった → 職員さんへ</b>
              <ol><li><span><a href="#/learner/home">利用者</a>で「こまった？」→「職員さんを呼ぶ」</span></li><li><span><a href="#/staff/today">職員の画面</a>の いちばん上に出る</span></li><li><span>「対応した」を押すと、利用者にも伝わる</span></li></ol></div>
            <div class="flow-card"><span class="flow-no">C</span><b>ぴくとへの相談 → 緊急の知らせ</b>
              <ol><li><span><a href="#/learner/pikuto">ぴくと</a>に「つらい」などと書く</span></li><li><span>ぴくとは合否を言わず、職員さんに知らせる</span></li><li><span><a href="#/staff/today">職員の画面</a>に緊急の知らせ</span></li></ol></div>
          </div>
        </section>

        <section class="en-tools grid-2">
          <div class="card card-pad stack">
            <b class="row" style="gap:8px">${ic('clock')}試作の時計（${Core.fmt.date(Clock.now())}）</b>
            <p class="small muted">時間を変えると、授業LIVEや職員の画面の様子が変わります。</p>
            <div class="seg seg-block" role="group" aria-label="時間">${Object.entries(Core.PRESETS).map(([key, p]) => html`<button type="button" data-act="set-clock" data-k="${key}" aria-selected="${k === key}">${p.time}</button>`)}</div>
            <p class="xsmall muted">${Core.PRESETS[k].label}</p>
          </div>
          <div class="card card-pad stack">
            <b class="row" style="gap:8px">${ic('refresh')}データを最初にもどす</b>
            <p class="small muted">出したり押したりしたことを、はじめの状態にもどします。</p>
            <button class="btn" type="button" data-act="reset">${ic('refresh')}<span>最初にもどす</span></button>
          </div>
        </section>

        <footer class="en-foot">
          <p>人の名前・事業所・お店・会社は すべて架空です。課題と教材の題名は、エスピクトスクールのカタログ（catalog.json）から使っています。</p>
          <p>サーバーなしで動く試作です。データは この端末のブラウザの中だけに保存されます。外には送りません。</p>
        </footer>
      </div>`
    };
  }
  act('set-clock', (el) => { Store.update((s) => { s.clock = el.getAttribute('data-k'); }); App.render(); UI.toast(`時計を ${Core.PRESETS[el.getAttribute('data-k')].label} にしました`, { icon: 'clock' }); });

  App.register('entrance', { routes: { '': page, 'home': page }, home: '' });
  Store.on(() => { if (App.current && App.current.role === 'entrance') App.render({ keepScroll: true }); });
})();
