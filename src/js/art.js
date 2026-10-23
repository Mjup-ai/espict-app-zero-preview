/* =========================================================
   作品の見本（ブログ・バナー・図・動画・SNS）を HTML で描く
   ========================================================= */
(function () {
  const { esc } = Core;
  function preview(kind, o) {
    const opt = Object.assign({ hue: 200, title: '文字起こしってどんな仕事？', sub: 'エスピクトスクールの記事', big: false }, o || {});
    const h = opt.hue;
    const style = `--h:${h}`;
    const t = esc(opt.title);
    if (kind === 'banner') {
      return `<div class="art art-banner" style="${style}" aria-hidden="true"><div class="art-in">
        <div class="ab-shape s1"></div><div class="ab-shape s2"></div>
        <div class="ab-text"><div class="ab-kicker">${esc(opt.sub)}</div><div class="ab-title">${t}</div><div class="ab-btn">相談する →</div></div>
      </div></div>`;
    }
    if (kind === 'flow') {
      return `<div class="art art-flow" style="${style}" aria-hidden="true"><div class="art-in"><div class="af-title">${t}</div>
        <div class="af-row">${['相談', '見つもり', 'お願い', '作る', 'とどける'].map((s, i) => `<div class="af-box"><b>${i + 1}</b><span>${s}</span></div>`).join('<i></i>')}</div></div></div>`;
    }
    if (kind === 'video') {
      return `<div class="art art-video" style="${style}" aria-hidden="true"><div class="art-in"><div class="av-sky"></div><div class="av-hill"></div><div class="av-sun"></div>
        <div class="av-play"><span></span></div><div class="av-cap">${t}</div><div class="av-bar"><i></i></div></div></div>`;
    }
    if (kind === 'sns') {
      return `<div class="art art-sns" style="${style}" aria-hidden="true"><div class="art-in">${[0, 1, 2, 3, 4, 5].map((i) => `<div class="as-post" style="--k:${i}"><span></span></div>`).join('')}</div></div>`;
    }
    // blog（ページの見本）
    return `<div class="art art-blog" style="${style}" aria-hidden="true"><div class="art-in">
      <div class="ag-bar"><i></i><i></i><i></i><span></span></div>
      <div class="ag-page">
        <div class="ag-head"><span class="ag-logo"></span><span class="ag-nav"></span></div>
        <div class="ag-title">${t}</div>
        <div class="ag-img"></div>
        <div class="ag-toc"><b>目次</b><span></span><span></span><span></span></div>
        <div class="ag-lines"><span></span><span></span><span style="width:70%"></span></div>
      </div>
    </div></div>`;
  }
  window.Art = { preview };
})();
