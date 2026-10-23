/* =========================================================
   ぴくと（AI）の答え方 — 試作では、ことばに合わせて答えを選ぶ
   やくそく：①合格かどうかは言わない ②ヒントを出す
            ③体や気持ちがつらそうな時は、職員さんに知らせる
   ========================================================= */
(function () {
  const K = window.CONTENT;

  const RULES = [
    { key: 'danger', re: /(死にたい|しにたい|消えたい|きえたい|いなくなりたい|自分を傷|生きてる意味|いきてるいみ)/ },
    { key: 'distress', re: /(つらい|辛い|いやになった|嫌になった|しんどい|苦しい|くるしい|ねむれ|眠れ|頭が痛|あたまがいた|お腹が痛|おなかがいた|おなか痛|気持ち悪|きもちわる|体調|たいちょう|こわい|怖い|不安|ふあん|泣きそう|なきそう|なきたい|泣きたい)/ },
    { key: 'tired', re: /(つかれ|疲れ|休みたい|やすみたい|休けい|休憩|ねむい|眠い|集中でき|しゅうちゅうでき|あきた|飽きた)/ },
    { key: 'judge', re: /(合格|ごうかく|これでいい|これで いい|合って|あってる|あっている|大丈夫かな|だいじょうぶかな|正解|せいかい|何点|なんてん|OKかな|オーケー)/ },
    { key: 'image', re: /(画像|写真|しゃしん|がぞう).*(入らない|はいらない|できない|出ない|でない|うまく|小さ|大き|ずれ)/ },
    { key: 'export', re: /(書き出|かきだ|書きだ|エクスポート|mp4|MP4)/ },
    { key: 'size', re: /(大きさ|サイズ|OGP|ogp|何ピクセル|なんぴくせる)/ },
    { key: 'toc', re: /(目次|もくじ)/ },
    { key: 'simple', re: /(かんたん|簡単|わからない|分からない|わかんない|むずかし|難し|指示書|しじしょ|意味)/ },
    { key: 'next', re: /(つぎ|次|なにを|何を|どこから|はじめ|始め|やること)/ },
    { key: 'review', re: /(見て|みて|見直|みなお|文章|ぶんしょう|誤字|ごじ|チェックして)/ },
    { key: 'small', re: /(小さく|ちいさく|分けて|わけて|細かく|こまかく)/ },
    { key: 'hello', re: /(こんにちは|おはよう|こんばんは|はじめまして|ありがとう|よろしく)/ }
  ];

  function lessonLink(id) {
    const l = K.lessonById[id];
    if (!l) return null;
    const s = K.seriesById[l.series];
    return { label: `${s.title}${l.label ? ' ' + l.label : ''}「${l.title}」`, go: `#/learner/watch/${id}` };
  }

  /** ctx: { task, instr, ts（課題のきろく） } */
  function reply(text, ctx) {
    const c = ctx || {};
    const t = String(text || '');
    const rule = RULES.find((r) => r.re.test(t));
    const key = rule ? rule.key : 'default';
    const instr = c.instr;
    const checks = instr ? instr.checks || [] : [];
    const done = c.ts && c.ts.checks ? c.ts.checks : [];
    const notYet = checks.filter((_, i) => !done[i]);

    switch (key) {
      case 'danger':
        return { mood: 'normal', alert: 'emergency', text: '話してくれて、ありがとう。\nとても大事なことだから、いま職員さんにも知らせたよ。すぐに来てくれるからね。\nひとりで がまんしなくて大丈夫だよ。' };
      case 'distress':
        return { mood: 'normal', alert: 'emergency', text: '話してくれて、ありがとう。\n体や気持ちのことは、職員さんに相談するのが いちばんだよ。いま、職員さんに知らせたよ。\nむりしないで、座って待っていてね。', actions: [{ label: '休けいする', act: 'break-start' }] };
      case 'tired':
        return { mood: 'happy', text: 'ここまで、よくがんばったね。\n少し休もう。水を飲んだり、目をとじたりするのも いいよ。\nもどったら、つぎにやることを いっしょに見よう。', actions: [{ label: '休けいする（10分）', act: 'break-start' }] };
      case 'judge':
        return {
          mood: 'normal',
          text: '合格かどうかは、運営の人が見て決めるよ。ぼくは言えないんだ。\nかわりに、指示書のチェックを いっしょに見てみよう。' + (notYet.length ? '\nまだチェックしていない所があるよ：' : '\nチェックは ぜんぶ ついているね。出す前に、もう一度スマホの大きさでも見てみてね。'),
          steps: notYet.slice(0, 4)
        };
      case 'image':
        return { mood: 'think', text: '画像がうまく入らない時は、この順番で ためしてみてね。', steps: ['入れたい場所の「ボックス」を えらぶ', '右の「画像」から、ファイルを えらぶ', '大きさは「はば 100%」にする', 'それでも だめなら、画像のファイルが 10MBより小さいか見る'], links: [lessonLink(K.L('blog', '⑤'))].filter(Boolean) };
      case 'export':
        return { mood: 'think', text: '書き出しは、この順番だよ。', steps: ['上のメニューの「ファイル」→「書き出し」→「メディア」', '形式は「H.264」をえらぶ', '名前と、保存する場所を決める', '「書き出し」を押して、おわるまで待つ'], links: [lessonLink(K.L('video-basic', '7'))].filter(Boolean) };
      case 'size':
        return { mood: 'think', text: 'OGP画像は、よこ1200 × たて630 がおすすめだよ。\nスマホで小さく見えても読めるように、タイトルの文字は大きめにしよう。\n画像のはしには、少しすき間をあけると いいよ。', links: [lessonLink(K.L('blog-img', 'I2'))].filter(Boolean) };
      case 'toc':
        return { mood: 'think', text: '目次は、見出しの名前をならべて、押すとその見出しに飛べるようにするよ。', steps: ['見出しに「ID」の名前をつける', '目次の文字に、その ID へのリンクをつける', 'プレビューで押して、飛べるか ためす'], links: [lessonLink(K.L('blog', '⑮')), lessonLink(K.L('blog', '⑯'))].filter(Boolean) };
      case 'simple':
        if (instr) return { mood: 'happy', text: 'この課題を、かんたんに言うとね：', steps: instr.summary, after: 'まずは「' + (instr.steps[0] ? instr.steps[0][0] : '指示書を読む') + '」から はじめよう。' };
        return { mood: 'happy', text: 'どの課題のことかな？\n課題のページで「質問する」を押すと、その課題のことを かんたんに説明できるよ。' };
      case 'next': {
        if (!c.explicit && c.next && c.next.title) {
          return { mood: 'happy', text: `つぎは「${c.next.title}」だよ。` + (c.next.sub ? `\n${c.next.sub}` : '') + '\n下のボタンから、すぐに はじめられるよ。', links: [{ label: c.next.action, go: c.next.go }] };
        }
        if (instr && instr.steps && instr.steps.length) {
          const idx = Math.min((c.ts && c.ts.step) || 0, instr.steps.length - 1);
          const st = instr.steps[idx];
          const links = (st[2] || []).map(lessonLink).filter(Boolean);
          return { mood: 'happy', text: `つぎは「${st[0]}」だよ。\n${st[1]}`, links };
        }
        return { mood: 'happy', text: 'つぎにやることは、「きょう」の画面の いちばん上に出ているよ。\nそこを押せば、すぐに はじめられるよ。', links: [{ label: '「きょう」を見る', go: '#/learner/home' }] };
      }
      case 'review':
        return { mood: 'think', text: '見直すときは、この4つを見てみてね。', steps: ['タイトルが指示書と同じか', '字のまちがいがないか（声に出して読むと見つけやすいよ）', 'スマホの大きさでも、はみ出していないか', '人の名前や電話番号が入っていないか'], after: 'よかったら、気になる文をここに はりつけてね。言いかえのヒントを出すよ。' };
      case 'small':
        if (instr && instr.steps) {
          const idx = Math.min((c.ts && c.ts.step) || 0, instr.steps.length - 1);
          const st = instr.steps[idx];
          return { mood: 'happy', text: `「${st[0]}」を、もっと小さく分けてみたよ。1つずつ やってみよう。`, steps: [st[1].split('。')[0] + '。', 'できたら、指示書のチェックを1つ つける', 'わからなくなったら、動画を もう一度見る'].filter(Boolean) };
        }
        return { mood: 'happy', text: 'やることを小さく分けると、すすめやすくなるよ。どの課題のことか、課題のページで聞いてみてね。' };
      case 'hello':
        return { mood: 'happy', text: 'こんにちは！ぴくとだよ。\nわからないことや、こまったことがあったら、なんでも聞いてね。' };
      default:
        return { mood: 'think', text: 'もう少し、くわしく教えてね。\nたとえば「どの画面で」「何をしたら」「どうなった」を書いてくれると、答えやすいよ。\n画面の写真をはってくれても いいよ。', suggest: ['つぎに何をすればいい？', '指示書をかんたんに言って', 'やることを小さく分けて'] };
    }
  }

  /** メッセージを HTML の吹き出しにする（ステップ・動画リンク・ボタンつき） */
  function bubbleHtml(r) {
    const { esc } = Core;
    let h = esc(r.text);
    if (r.steps && r.steps.length) h += `<ol class="b-steps">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>`;
    if (r.after) h += '\n' + esc(r.after);
    const acts = [];
    (r.links || []).forEach((l) => acts.push(`<a class="btn btn-soft btn-sm" href="${esc(l.go)}">${Icons.icon('playc')}<span>${esc(l.label)}</span></a>`));
    (r.actions || []).forEach((a) => acts.push(`<button class="btn btn-sm" type="button" data-act="${esc(a.act)}">${Icons.icon('coffee')}<span>${esc(a.label)}</span></button>`));
    if (acts.length) h += `<div class="b-actions">${acts.join('')}</div>`;
    return h;
  }

  window.Pikuto = { reply, bubbleHtml, lessonLink };
})();
