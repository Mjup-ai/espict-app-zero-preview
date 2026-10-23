/* =========================================================
   はじめの状態（架空のデータ）。「最初にもどす」でここに戻る
   ========================================================= */
(function () {
  window.SEED_VERSION = 8;
  const C = window.CATALOG;
  const K = window.CONTENT;
  const T = (frag, extra) => { // 題名の一部で課題をさがす
    const t = K.ALL_TASKS.find((x) => x.title.includes(frag) && (!extra || extra(x)));
    if (!t) console.warn('task not found', frag);
    return t ? t.id : null;
  };
  const at = (day, hhmm) => `${day}T${hhmm}:00+09:00`;
  const TODAY = '2026-10-26';

  /* ---- 課題のID（よく使うもの） ---- */
  const ID = {
    blogS1: T('「文字起こしってどんな仕事？」ページ'),
    blogS2: T('写真と目次で「介護のデータ入力」'),
    blogS3: T('図と表で伝える！'),
    blogA1: T('AIにお願い！'),
    blogA2: T('AIで作る！写真と目次'),
    blogA3: T('AIで図と表まで'),
    blogI1: T('OGPと相談バナー'),
    blogI2: T('4つの画像で'),
    blogI3: T('流れの図に挑戦'),
    web10a: T('Web制作 指示書 10月 初級'),
    web10b: T('Web制作 指示書 10月 中級'),
    web10c: T('Web制作 指示書 10月 上級'),
    des10a: T('画像デザイン 指示書 10月 初級'),
    des10b: T('画像デザイン 指示書 10月 中級'),
    des10c: T('画像デザイン 指示書 10月 上級'),
    vid10: T('動画編集 指示書 10月'),
    sns10: T('SNS運用 指示書 10月'),
    ai10: T('AI情報収集 指示書 10月'),
    web9a: T('Web制作 指示書 9月 初級'),
    web9b: T('Web制作 指示書 9月 中級'),
    des9: T('画像デザイン 指示書 9月'),
    web8: T('Web制作 指示書 8月'),
    des8: T('画像デザイン 指示書 8月'),
    web7: T('Web制作 指示書 7月'),
    vid9: T('動画編集 指示書 9月', (x) => !x.title.includes('2つ目')),
    sns9: T('SNS運用 指示書 9月'),
    start1: K.START_TASKS[0].id, start2: K.START_TASKS[1].id, start3: K.START_TASKS[2].id
  };
  window.TASK_IDS = ID;

  /* ---- ひだまりラボ（架空）の利用者 ---- */
  const MINE = [
    { id: 'u-sakura', name: '青木 さくら', kana: 'あおき さくら', genres: ['web', 'design'], level: 'middle', since: '2026-04-08', color: '#0094c8', goal: 'ブログの記事を、ひとりで最後まで作れるようになる', rate: .95, inT: '09:45', outT: '15:30' },
    { id: 'u-yuma', name: '石田 ゆうま', kana: 'いしだ ゆうま', genres: ['video'], level: 'beginner', since: '2026-06-02', color: '#6a4fcf', goal: 'テロップ入りの動画を1本仕上げる', rate: .88, inT: '09:28', outT: '15:00' },
    { id: 'u-miku', name: '上野 みく', kana: 'うえの みく', genres: ['design'], level: 'middle', since: '2025-11-10', color: '#c42d68', goal: 'OGP画像を時間内に作れるようになる', rate: .92, inT: '09:20', outT: '15:40' },
    { id: 'u-kenta', name: '遠藤 けんた', kana: 'えんどう けんた', genres: ['video'], level: 'middle', since: '2025-09-01', color: '#3d7a2e', goal: '在宅で週3日、続けて取り組む', rate: .75, inT: '09:40', outT: '14:30', home: true },
    { id: 'u-rina', name: '岡本 りな', kana: 'おかもと りな', genres: ['sns'], level: 'beginner', since: '2026-08-18', color: '#b35200', goal: 'インスタの投稿文を考えられるようになる', rate: .7, inT: '10:00', outT: '14:00' },
    { id: 'u-sho', name: '加藤 しょう', kana: 'かとう しょう', genres: ['web'], level: 'beginner', since: '2026-07-01', color: '#0077a8', goal: 'STUDIOでページを1つ作る', rate: .8, inT: '10:30', outT: '15:00' },
    { id: 'u-aoi', name: '木村 あおい', kana: 'きむら あおい', genres: ['sns', 'ai'], level: 'middle', since: '2026-02-03', color: '#0b7a70', goal: 'AIのニュースを毎週まとめる', rate: .9, inT: '09:30', outT: '15:20' },
    { id: 'u-takumi', name: '小林 たくみ', kana: 'こばやし たくみ', genres: ['esports', 'video'], level: 'beginner', since: '2026-05-12', color: '#3d7a2e', goal: 'ゲームの動画を編集してみる', rate: .85, inT: '09:45', outT: '15:00' },
    { id: 'u-hinata', name: '斎藤 ひなた', kana: 'さいとう ひなた', genres: ['web'], level: 'beginner', since: '2026-10-19', color: '#e2367a', goal: 'アプリの使い方になれる', rate: 1, inT: '09:38', outT: '14:00', isNew: true },
    { id: 'u-ren', name: '杉山 れん', kana: 'すぎやま れん', genres: ['design'], level: 'advanced', since: '2025-06-16', color: '#c42d68', goal: 'チラシの仕事を受けられるようになる', rate: .93, inT: '09:15', outT: '15:45' },
    { id: 'u-honoka', name: '田中 ほのか', kana: 'たなか ほのか', genres: ['web', 'ai'], level: 'middle', since: '2026-03-09', color: '#0b7a70', goal: 'AI版ブログを中級まで出す', rate: .8, inT: '09:33', outT: '15:00' },
    { id: 'u-sota', name: '中村 そうた', kana: 'なかむら そうた', genres: ['video'], level: 'beginner', since: '2026-04-20', color: '#6a4fcf', goal: '毎日 決まった時間に来る', rate: .78, inT: '09:25', outT: '15:00' }
  ];

  /* きょうの動き（staff 画面はこれを「いまの時刻」で読む）。[時刻, 種類, 中身, 追加] */
  const DAY = {
    'u-yuma': { mood: 'ふつう', seg: [['09:28', 'arrive'], ['09:35', 'lesson', K.L('video-basic', '7')], ['09:52', 'task', ID.vid10, { stuck: '10:00', note: 'ぴくとに「書き出しができない」と3回聞いています' }], ['12:00', 'break'], ['13:00', 'live', 'video'], ['14:50', 'task', ID.vid10], ['15:00', 'leave']] },
    'u-miku': { mood: 'げんき', seg: [['09:20', 'arrive'], ['09:24', 'task', ID.blogI1], ['09:48', 'submit', ID.blogI1], ['09:50', 'lesson', K.L('blog-img', 'I1')], ['10:30', 'task', ID.blogI2], ['12:00', 'break'], ['13:00', 'task', ID.blogI2], ['15:00', 'live', 'design'], ['15:40', 'leave']] },
    'u-kenta': { mood: 'ふつう', home: true, seg: [['09:40', 'arrive'], ['09:45', 'task', ID.vid10], ['11:00', 'break'], ['11:15', 'lesson', K.L('video-adv', '6')], ['12:00', 'break'], ['13:00', 'live', 'video'], ['14:30', 'leave']] },
    'u-rina': { absent: '通院のため お休み（ご家族から連絡あり）' },
    'u-sho': { late: '10:30', seg: [['10:31', 'arrive'], ['10:35', 'lesson', K.L('web-basic', '3')], ['11:10', 'live', 'sns'], ['12:00', 'break'], ['13:00', 'task', ID.web10a], ['15:00', 'leave']], mood: 'ふつう' },
    'u-aoi': { mood: 'げんき', seg: [['09:30', 'arrive'], ['09:34', 'task', ID.ai10], ['10:10', 'live', 'web'], ['11:00', 'task', ID.ai10], ['11:10', 'live', 'sns'], ['12:00', 'break'], ['13:00', 'submit', ID.ai10], ['13:05', 'task', ID.sns10], ['15:20', 'leave']] },
    'u-takumi': { mood: 'ふつう', seg: [['09:45', 'arrive'], ['09:50', 'lesson', K.L('video-adv', '2')], ['10:40', 'pikuto'], ['10:50', 'lesson', K.L('video-adv', '3')], ['12:00', 'break'], ['13:00', 'live', 'video'], ['15:00', 'leave']] },
    'u-hinata': { mood: 'ふつう', isNew: true, seg: [['09:38', 'arrive'], ['09:40', 'task', ID.start2], ['09:44', 'lesson', K.L('studio-1', '③')], ['10:10', 'live', 'web'], ['11:00', 'task', ID.start2], ['12:00', 'break'], ['13:00', 'lesson', K.L('studio-1', '④')], ['14:00', 'leave']] },
    'u-ren': { mood: 'げんき', seg: [['09:15', 'arrive'], ['09:18', 'task', ID.des10c], ['12:00', 'break'], ['13:00', 'task', ID.des10c], ['15:00', 'live', 'design'], ['15:45', 'leave']] },
    'u-honoka': { mood: 'つかれぎみ', seg: [['09:33', 'arrive'], ['09:40', 'task', ID.blogA2], ['10:10', 'live', 'web'], ['11:00', 'break'], ['11:20', 'task', ID.blogA2, { stuck: '11:20', note: '休けいのあと、手が止まっています' }], ['12:00', 'break'], ['13:00', 'task', ID.blogA2], ['15:00', 'leave']] },
    'u-sota': { mood: 'つかれぎみ', seg: [['09:25', 'arrive'], ['09:30', 'pikuto'], ['09:47', 'pikuto', null, { alert: true }], ['10:10', 'break'], ['13:00', 'lesson', K.L('video-basic', '2')], ['15:00', 'leave']] }
  };

  /* ---- ほかの事業所（架空） ---- */
  const FACILITIES = [
    ['f-hidamari', 'ひだまりラボ', '架空市みなと町', 12], ['f-soramame', 'そらまめ工房', '架空市あさひ台', 18], ['f-aozora', 'あおぞらワークス', '架空町かわべ', 15],
    ['f-komorebi', 'こもれびデジタル', '架空市もりの里', 21], ['f-minami', 'みなみ風ラボ', '架空市しおさい', 9], ['f-tsumugi', 'つむぎ作業所', '架空郡さとやま', 14],
    ['f-hoshi', 'ほしぞらクリエイト', '架空市ほしみ野', 17], ['f-habataki', 'はばたきベース', '架空市つばさ町', 11], ['f-wakaba', 'わかばスタジオ', '架空市わかば', 13],
    ['f-irodori', 'いろどり舎', '架空市にじが丘', 16], ['f-akari', 'あかりワークス', '架空市ともしび', 10], ['f-nozomi', 'のぞみデジタル', '架空市みらい町', 19],
    ['f-hinata', 'ひなたぼっこ', '架空市はるかぜ', 8], ['f-umikaze', 'うみかぜ工房', '架空市なぎさ', 12], ['f-morinoie', 'もりのいえ', '架空郡こだま', 7],
    ['f-kirari', 'きらりラボ', '架空市ひかり町', 20], ['f-mahoroba', 'まほろば作業所', '架空市やまと台', 15], ['f-tsukushi', 'つくしの家', '架空市はなの', 9],
    ['f-sakamichi', 'さかみちワークス', '架空市おかの上', 12], ['f-kotori', 'ことり工房', '架空市すずめ台', 10], ['f-ichigo', 'いちご畑ラボ', '架空町べりー', 11],
    ['f-yumeji', 'ゆめじデザイン', '架空市ゆめみ', 13], ['f-kawasemi', 'かわせみ舎', '架空市せせらぎ', 6], ['f-tanpopo', 'たんぽぽワーク', '架空市わたげ', 14]
  ].map(([id, name, area, n], i) => ({ id, name, area, learners: n, since: ['2025-03', '2025-04', '2025-06', '2025-09', '2025-11', '2026-01', '2026-04', '2026-07'][i % 8], staff: 2 + (i % 3), plan: i % 5 === 0 ? 'お試し中' : '利用中' }));

  const FAM = ['佐藤', '鈴木', '高橋', '伊藤', '渡辺', '山本', '中島', '小川', '前田', '藤田', '松本', '井上', '森', '池田', '橋本', '山下', '石川', '坂本', '吉田', '長谷川', '村上', '近藤', '後藤', '岡田', '清水', '山崎', '阿部', '原田', '野口', '松田'];
  const GIV = ['はな', 'だいき', 'ゆい', 'こうた', 'あやか', 'しゅん', 'まこと', 'えみ', 'りく', 'なつき', 'かいと', 'さき', 'ゆうと', 'かな', 'そら', 'いつき', 'ことね', 'れお', 'あいり', 'はやと', 'みお', 'たいが', 'ゆな', 'そうま', 'ひより', 'けい', 'のぞみ', 'しおり', 'たける', 'まい'];
  const GEN = ['web', 'design', 'video', 'sns', 'web', 'design', 'ai'];
  const r = Core.rng(20261026);
  const OTHERS = [];
  FACILITIES.slice(1).forEach((f, fi) => {
    const n = Math.min(f.learners, 6);
    for (let i = 0; i < n; i++) {
      const fam = FAM[(fi * 7 + i * 3) % FAM.length], giv = GIV[(fi * 5 + i * 7) % GIV.length];
      OTHERS.push({ id: `u-${f.id.slice(2)}-${i}`, name: `${fam} ${giv}`, facility: f.id, genres: [GEN[(fi + i) % GEN.length]], level: ['beginner', 'middle', 'advanced', 'beginner', 'middle'][(fi + i) % 5], since: `2026-0${1 + ((fi + i) % 9)}-01`, color: ['#0094c8', '#c42d68', '#6a4fcf', '#b35200', '#0b7a70', '#3d7a2e'][(fi + i) % 6], active: r() > .3, subs: Math.floor(r() * 14) + 1, okRate: Math.round(70 + r() * 28) });
    }
  });

  /* ---- 出席の記録（10月1日〜きょう） ---- */
  function weekdaysOfOct() {
    const out = [];
    for (let d = 1; d <= 26; d++) { const ds = `2026-10-${String(d).padStart(2, '0')}`; const wd = new Date(ds + 'T12:00:00+09:00').getUTCDay(); if (wd >= 1 && wd <= 5) out.push(ds); }
    return out;
  }
  const OCT = weekdaysOfOct();
  function makeAttendance() {
    const att = {};
    MINE.forEach((u) => {
      const rr = Core.rng(Core.hashStr(u.id));
      att[u.id] = {};
      OCT.forEach((ds) => {
        if (ds === TODAY) return;
        if (u.isNew && ds < '2026-10-19') return;
        const came = rr() < u.rate;
        if (!came) { att[u.id][ds] = { absent: true, reason: rr() < .5 ? '体調' : '通院' }; return; }
        const [ih, im] = u.inT.split(':').map(Number), [oh, om] = u.outT.split(':').map(Number);
        const inM = ih * 60 + im + Math.round((rr() - .5) * 16);
        const outM = oh * 60 + om + Math.round((rr() - .5) * 30) - (rr() < .12 ? 90 : 0);
        const brk = 60 + (rr() < .3 ? 10 : 0);
        att[u.id][ds] = { in: inM, out: outM, brk, home: !!u.home && rr() < .8, work: Math.max(60, outM - inM - brk) };
      });
    });
    return att;
  }

  /* ---- 運営に届いている提出（AIの判定と返事の下書きつき） ---- */
  function sub(o) { return Object.assign({ id: 'sb-' + Math.random().toString(36).slice(2, 8), status: 'waiting', files: [], message: '' }, o); }
  function submissions() {
    return [
      sub({ id: 'sb-miku1', learner: 'u-miku', facility: 'f-hidamari', task: ID.blogI1, at: at(TODAY, '09:48'), kind: 'image', files: ['OGP_文字起こし.png', '相談バナー.png'], message: '文字を大きくしてみました。色は青とオレンジにしました。',
        ai: { verdict: 'good', conf: 86, points: [[1, 'OGP画像は 1200×630 で、指示どおりです'], [1, 'タイトルの文字が大きく、スマホでも読めます'], [1, '相談バナーのボタンの形が分かりやすいです'], [0, 'バナーの右はしで「ご相談」の「談」が少し切れています']],
          draft: '上野さん、OGP画像と相談バナーを見ました。\nタイトルの文字が大きくて、スマホで見てもすぐ読めます。青とオレンジの組み合わせも、記事に合っています。\n\n1つだけ、相談バナーの右はしで「ご相談」の文字が少し切れています。文字を少し左によせると、もっとよくなります。\n\nこのまま進めて大丈夫です。おつかれさまでした！' } }),
      sub({ id: 'sb-kenta1', learner: 'u-kenta', facility: 'f-hidamari', task: ID.vid10, at: at('2026-10-25', '14:12'), kind: 'video', files: ['秋まつり_紹介.mp4（1分04秒）'], message: '在宅で作りました。BGMをつけました。',
        ai: { verdict: 'fix', conf: 78, points: [[1, '長さは1分4秒で、ほぼ指示どおりです'], [0, 'BGMが声より大きく、話が聞きとりにくい所があります（0:12〜0:20）'], [0, 'テロップ「開催日時」が「開催日字」になっています'], [1, 'さいごに「おわり」の画面があります']],
          draft: '遠藤さん、秋まつりの紹介動画を見ました。\n1分の中に、お祭りの楽しい様子がよくまとまっています。さいごの画面もきれいです。\n\n2つだけ、直すと もっとよくなります。\n① 0:12〜0:20 で、BGMが声より大きくなっています。BGMの音を少し小さくしてください。\n② テロップの「開催日字」は「開催日時」です。\n\n直したら、もう一度「これで提出する」から出してください。' } }),
      sub({ id: 'sb-sakura1', learner: 'u-sakura', facility: 'f-hidamari', task: ID.web10a, at: at('2026-10-23', '15:10'), kind: 'url', files: ['https://aoki-sakura-cafe.studio.site'], message: 'お店の紹介ページを作りました。写真の大きさをそろえました。',
        ai: { verdict: 'good', conf: 88, points: [[1, 'お店の名前がいちばん上にあります'], [1, '写真の大きさがそろっていて、見やすいです'], [1, 'スマホで見ても、はみ出していません'], [1, 'リンクは3つとも動きます']],
          draft: '青木さん、お店の紹介ページを見ました。\n写真の大きさがそろっていて、とても見やすいです。スマホで見ても、文字がきれいにおさまっています。\n\n指示書のチェックは、ぜんぶできています。\nつぎは中級にもチャレンジしてみてください。おつかれさまでした！' } }),
      sub({ learner: 'u-soramame-0', facility: 'f-soramame', task: ID.blogA2, at: at('2026-10-26', '09:31'), kind: 'url', files: ['https://kaigo-data.studio.site'],
        ai: { verdict: 'good', conf: 81, points: [[1, '目次から見出しへ飛べます'], [1, '画像が2まい入っています'], [0, '「介護記録」と「介護の記録」の書き方がまざっています']],
          draft: '佐藤さん、AIで作った「介護のデータ入力」の記事を見ました。\n目次から見出しへきちんと飛べて、読みやすいです。画像も記事に合っています。\n\n「介護記録」と「介護の記録」の書き方が、まざっている所があります。どちらかにそろえると、もっと読みやすくなります。' } }),
      sub({ learner: 'u-aozora-1', facility: 'f-aozora', task: ID.sns10, at: at('2026-10-26', '09:12'), kind: 'text', files: ['投稿1〜3（画像3まい・文3つ）'],
        ai: { verdict: 'check', conf: 54, points: [[1, '投稿が3つそろっています'], [0, '2つ目の画像に、人の顔がはっきり写っています。本人の了解があるか確かめが必要です'], [1, 'ハッシュタグの数がちょうどいいです']],
          draft: '鈴木さん、インスタの投稿3つを見ました。\n文がやさしくて、読みやすいです。\n\n2つ目の画像に、人の顔がはっきり写っています。SNSに出す時は、写っている人の「いいよ」が必要です。職員さんと確かめてから、もう一度出してください。' } }),
      sub({ learner: 'u-komorebi-2', facility: 'f-komorebi', task: ID.blogS3, at: at('2026-10-25', '16:40'), kind: 'url', files: ['https://gaichu-flow.studio.site'],
        ai: { verdict: 'fix', conf: 72, points: [[1, '流れの図にステップが5つあります'], [0, '表がスマホで右にはみ出しています'], [1, '見出しが3つあります']],
          draft: '高橋さん、外注の流れの記事を見ました。\n流れの図がとても分かりやすいです。5つのステップが、ひと目で分かります。\n\nスマホで見ると、表が右にはみ出しています。ブログ講座⑬「タブレットとスマホ」を見て、表のはばを直してください。' } }),
      sub({ learner: 'u-minami-0', facility: 'f-minami', task: ID.des10b, at: at('2026-10-25', '13:05'), kind: 'image', files: ['メニュー1.png', 'メニュー2.png'],
        ai: { verdict: 'good', conf: 84, points: [[1, '2まいそろっています'], [1, 'お店の名前がいちばん目立っています'], [1, '字のまちがいはありません']],
          draft: '伊藤さん、メニューの画像2まいを見ました。\nお店の名前が目立っていて、料理の写真もおいしそうです。\nこのまま進めて大丈夫です。おつかれさまでした！' } }),
      sub({ learner: 'u-tsumugi-3', facility: 'f-tsumugi', task: ID.ai10, at: at('2026-10-25', '11:22'), kind: 'text', files: ['AIニュースまとめ（3つ）'],
        ai: { verdict: 'fix', conf: 69, points: [[1, 'ニュースが3つあります'], [0, '3つ目のニュースに、出どころ（サイトの名前）がありません'], [1, '1つを3行でまとめています']],
          draft: '渡辺さん、AIのニュースのまとめを見ました。\nどのニュースも3行で、やさしい言葉でまとめられています。\n\n3つ目のニュースに、出どころ（どのサイトか）が書いてありません。サイトの名前を書き足してください。' } }),
      sub({ learner: 'u-hoshi-1', facility: 'f-hoshi', task: ID.blogS1, at: at('2026-10-24', '15:58'), kind: 'url', files: ['https://mojiokoshi.studio.site'],
        ai: { verdict: 'good', conf: 90, points: [[1, 'タイトルが指示どおりです'], [1, '見出しが3つあります'], [1, '要点の枠に3つ書いてあります']],
          draft: '山本さん、「文字起こしってどんな仕事？」のページを見ました。\n要点の枠がとても分かりやすいです。見出しも3つそろっています。\nこのまま進めて大丈夫です。つぎは中級にもチャレンジしてみてください！' } }),
      sub({ learner: 'u-habataki-0', facility: 'f-habataki', task: ID.blogI3, at: at('2026-10-24', '14:30'), kind: 'image', files: ['流れの図.png', 'OGP.png', 'アイキャッチ.png'],
        ai: { verdict: 'good', conf: 80, points: [[1, '3まいそろっています'], [1, '流れの図の矢印が分かりやすいです'], [0, 'アイキャッチの色が5色あり、少し多いです']],
          draft: '中島さん、外注の記事の画像3まいを見ました。\n流れの図の矢印が分かりやすく、順番がすぐ分かります。\nアイキャッチは色が5色あるので、3色くらいにへらすと、もっとすっきりします。' } }),
      sub({ learner: 'u-wakaba-2', facility: 'f-wakaba', task: ID.web10b, at: at('2026-10-24', '11:02'), kind: 'url', files: ['https://wakaba-shop.studio.site'],
        ai: { verdict: 'check', conf: 48, points: [[0, 'ページに、電話番号のような数字が書いてあります。本当の番号か確かめが必要です'], [1, '写真が入っています'], [1, 'スマホで見てもはみ出しません']],
          draft: '小川さん、お店の紹介ページを見ました。\n写真の入れ方がきれいで、見やすいページです。\n\nページに電話番号のような数字があります。練習では、本当の番号は書かないでください。「000-0000-0000」のように直してください。' } }),
      sub({ learner: 'u-irodori-4', facility: 'f-irodori', task: ID.vid10, at: at('2026-10-23', '16:20'), kind: 'video', files: ['お祭り紹介_v2.mp4（58秒）'], message: '2回目の提出です。BGMを小さくしました。',
        ai: { verdict: 'good', conf: 87, points: [[1, 'BGMが声より小さくなりました'], [1, 'テロップの字のまちがいが直っています'], [1, '長さは58秒です']],
          draft: '前田さん、直した動画を見ました。\nBGMの音がちょうどよくなって、話がよく聞こえます。テロップも直っています。\nこのまま進めて大丈夫です。直すのも、おつかれさまでした！' } }),
      sub({ learner: 'u-nozomi-1', facility: 'f-nozomi', task: ID.blogA1, at: at('2026-10-23', '13:44'), kind: 'url', files: ['https://ai-mojiokoshi.studio.site'],
        ai: { verdict: 'fix', conf: 74, points: [[0, 'AIが書いた文に「弊社」という言葉が残っています'], [1, '要点が3つにまとまっています'], [1, 'スマホで見てもはみ出しません']],
          draft: '藤田さん、AIで作った記事ページを見ました。\n要点が3つにまとまっていて、分かりやすいです。\n\n文の中に「弊社」という言葉が残っています。この記事では使わない言葉なので、消してください。AIの文は、さいごに自分の目で読むのが大事です。' } }),
      sub({ learner: 'u-akari-0', facility: 'f-akari', task: ID.des10a, at: at('2026-10-23', '10:15'), kind: 'image', files: ['お知らせバナー.png'],
        ai: { verdict: 'good', conf: 83, points: [[1, '大きさが指示どおりです'], [1, '文字が読みやすいです']],
          draft: '松本さん、お知らせのバナーを見ました。\n文字が大きく、何のお知らせかすぐ分かります。\nこのまま進めて大丈夫です。おつかれさまでした！' } })
    ];
  }

  /** AIの下書きの書き出し「〇〇さん、」を、その人の名字にそろえる */
  function fixDraftNames(list) {
    const all = MINE.concat(OTHERS);
    list.forEach((sb) => {
      const u = all.find((x) => x.id === sb.learner);
      if (!u || !sb.ai || !sb.ai.draft) return;
      const fam = u.name.split(' ')[0];
      sb.ai.draft = sb.ai.draft.replace(/^[^、\n]{1,8}さん、/, `${fam}さん、`);
    });
    return list;
  }

  /* ---- 利用者（さくら）のきろく ---- */
  function lessonProgress() {
    const p = {};
    const all = (sid, upto, val) => { const s = K.seriesById[sid]; s.episodes.forEach((e, i) => { if (upto == null || i < upto) p[e.id] = val == null ? 1 : val; }); };
    all('pc-basic'); all('studio-1'); all('studio-2', 6); all('blog-easy'); all('web-basic', 8); all('canva-basic', 5);
    all('blog', 4);
    p[K.L('blog', '⑤')] = 0.4;
    p[K.L('blog-img', 'I2')] = 1; p[K.L('blog-img', 'I7')] = 1;
    return p;
  }
  function taskState() {
    return {
      [ID.blogS1]: { status: 'ok', checks: [1, 1, 1, 1], startedAt: at('2026-10-21', '13:10'), submittedAt: at('2026-10-21', '15:20'), okAt: at('2026-10-22', '11:05') },
      [ID.blogI1]: { status: 'ok', checks: [1, 1, 1, 1, 1], startedAt: at('2026-10-23', '10:20'), submittedAt: at('2026-10-23', '14:02'), okAt: at('2026-10-24', '16:20'), unread: true },
      [ID.blogS2]: { status: 'doing', checks: [1, 1, 1, 0, 0, 0], startedAt: at('2026-10-24', '13:00'), step: 2 },
      [ID.web10a]: { status: 'submitted', checks: [1, 1, 1, 1], startedAt: at('2026-10-20', '10:00'), submittedAt: at('2026-10-23', '15:10') },
      [ID.web9a]: { status: 'ok', okAt: at('2026-09-26', '10:00') },
      [ID.des9]: { status: 'ok', okAt: at('2026-09-18', '10:00') },
      [ID.web8]: { status: 'ok', okAt: at('2026-08-27', '10:00') },
      [ID.des8]: { status: 'ok', okAt: at('2026-08-21', '10:00') },
      [ID.web7]: { status: 'ok', okAt: at('2026-07-29', '10:00') },
      [ID.start1]: { status: 'ok', okAt: at('2026-04-09', '10:00') },
      [ID.start2]: { status: 'ok', okAt: at('2026-04-10', '10:00') },
      [ID.start3]: { status: 'ok', okAt: at('2026-04-15', '10:00') }
    };
  }
  function chats() {
    return {
      [ID.blogS1]: [
        { from: 'sys', at: at('2026-10-21', '15:20'), text: '「これで提出する」で出しました' },
        { from: 'ops', at: at('2026-10-22', '11:05'), who: '運営（平野）', text: '青木さん、「文字起こしってどんな仕事？」のページを見ました。\n要点の枠に、大事なことが3つ、すっきりまとまっています。見出しも分かりやすいです。\n\nこのまま進めて大丈夫です。つぎは中級の「介護のデータ入力」にもチャレンジしてみてください！' }
      ],
      [ID.blogI1]: [
        { from: 'me', at: at('2026-10-23', '11:40'), text: 'OGP画像の文字は、どのくらいの大きさがいいですか？' },
        { from: 'bot', at: at('2026-10-23', '11:40'), text: 'スマホで小さく見えても読めるように、タイトルは 60〜80 くらいの大きさがおすすめだよ。\n画像の上と下に、少しすき間をあけると、もっと読みやすくなるよ。\n動画「画像案件I2 OGP画像の作り方」の 3分ごろに、やり方があるよ。' },
        { from: 'sys', at: at('2026-10-23', '14:02'), text: '「これで提出する」で出しました（画像2まい）' },
        { from: 'ops', at: at('2026-10-24', '16:20'), who: '運営（平野）', text: '青木さん、OGP画像と相談バナーを見ました。\nタイトルの文字が大きくて、スマホでもすぐ読めます。バナーの「相談する」ボタンも、押したくなる形でとてもいいです。\n\nこのまま進めて大丈夫です。おつかれさまでした！' }
      ],
      [ID.blogS2]: [
        { from: 'me', at: at('2026-10-24', '13:30'), text: '写真の下の説明は、何文字くらいですか？' },
        { from: 'bot', at: at('2026-10-24', '13:30'), text: '写真の説明は、1〜2行（20〜40文字くらい）がちょうどいいよ。\n「どんな写真か」と「記事のどこに関係あるか」を書くと、読む人に伝わりやすいよ。' }
      ],
      [ID.web10a]: [
        { from: 'sys', at: at('2026-10-23', '15:10'), text: '「これで提出する」で出しました（URL）' }
      ]
    };
  }
  function works() {
    return [
      { id: 'w1', art: '文字起こし', task: ID.blogI1, title: '「文字起こし」記事のOGP画像と相談バナー', kind: 'banner', genre: 'design', at: at('2026-10-24', '16:20'), status: 'ok', note: 'タイトルの文字を大きくして、青とオレンジの2色にしました。', comment: 'バナーの「相談する」ボタンも、押したくなる形でとてもいいです。', hue: 205 },
      { id: 'w2', art: '文字起こしってどんな仕事？', task: ID.blogS1, title: '「文字起こしってどんな仕事？」ページ', kind: 'blog', genre: 'web', at: at('2026-10-22', '11:05'), status: 'ok', note: '要点の枠に、大事なことを3つまとめました。', comment: '要点の枠に、大事なことが3つ、すっきりまとまっています。', hue: 195 },
      { id: 'w3', art: 'カフェ ひだまり', task: ID.web9a, title: 'Web制作 指示書 9月 初級（お店の紹介ページ）', kind: 'blog', genre: 'web', at: at('2026-09-26', '10:00'), status: 'ok', note: 'はじめて自分でメニューを作りました。', comment: 'メニューの並びがきれいです。', hue: 160 },
      { id: 'w4', art: '秋のお知らせ', task: ID.des9, title: '画像デザイン 指示書 9月（お知らせバナー）', kind: 'banner', genre: 'design', at: at('2026-09-18', '10:00'), status: 'ok', note: 'キャンバで作りました。', comment: '文字がとても読みやすいです。', hue: 330 },
      { id: 'w5', art: '夏まつりのご案内', task: ID.web8, title: 'Web制作 指示書 8月（夏のイベントページ）', kind: 'blog', genre: 'web', at: at('2026-08-27', '10:00'), status: 'ok', note: '写真を3まい使いました。', comment: '写真の並べ方が上手です。', hue: 40 },
      { id: 'w6', art: 'きょうのメニュー', task: ID.des8, title: '画像デザイン 指示書 8月（メニュー画像）', kind: 'banner', genre: 'design', at: at('2026-08-21', '10:00'), status: 'ok', note: '色を3色にしぼりました。', comment: '色のバランスがいいです。', hue: 15 },
      { id: 'w7', art: 'はじめてのページ', task: ID.web7, title: 'Web制作 指示書 7月（はじめてのページ）', kind: 'blog', genre: 'web', at: at('2026-07-29', '10:00'), status: 'ok', note: 'はじめて最後まで作れたページです。', comment: '最後まで作れましたね！', hue: 260 }
    ];
  }
  function notices() {
    return [
      { id: 'n1', type: 'reply', at: at('2026-10-24', '16:20'), title: '運営から返事がとどきました', body: '「文字起こし」記事のOGPと相談バナー', go: `#/learner/task/${ID.blogI1}?tab=chat`, unread: true },
      { id: 'n2', type: 'live', at: at(TODAY, '09:00'), title: 'きょうの授業LIVEは 10:10から', body: '1時間目は Web制作（ながの先生）', go: '#/learner/live', unread: true },
      { id: 'n3', type: 'job', at: at('2026-10-23', '18:00'), title: '案件ボードに新しいお仕事', body: '商店街のお店紹介ブログ記事（3本）', go: '#/learner/jobs', unread: false },
      { id: 'n4', type: 'reply', at: at('2026-10-22', '11:05'), title: '運営から返事がとどきました', body: '「文字起こしってどんな仕事？」ページ', go: `#/learner/task/${ID.blogS1}?tab=chat`, unread: false },
      { id: 'n5', type: 'task', at: at('2026-10-21', '19:00'), title: '新しい課題がとどきました', body: '10月のブログ記事（作り方3つ × 級3つ）', go: '#/learner/tasks', unread: false },
      { id: 'n6', type: 'staff', at: at('2026-10-20', '15:30'), title: '職員の森さんから', body: '来週の月曜日も、いつもどおり 9:30から開いています', go: '', unread: false }
    ];
  }
  function jobs() {
    return [
      { id: 'j1', title: '商店街のお店紹介 ブログ記事（3本）', genre: 'web', need: { genre: 'web', level: 'middle', text: 'Web制作 中級の課題を1つ出した人' }, amount: '記事 3本', period: '11月4日〜11月20日', due: '2026-11-20', status: 'open', client: '架空商店街の会', applicants: ['u-soramame-0'], note: 'ブログ講座で習った「写真と説明」「目次」を使います。' },
      { id: 'j2', title: '地域の秋まつり ポスター画像（A4 1まい）', genre: 'design', need: { genre: 'design', level: 'middle', text: '画像デザイン 中級の課題を1つ出した人' }, amount: '画像 1まい', period: '10月28日〜11月5日', due: '2026-11-05', status: 'open', client: '架空町 まつり実行委員会', applicants: ['u-ren', 'u-kirari-1', 'u-yumeji-2'], note: '写真は運営からわたします。' },
      { id: 'j3', title: 'カフェのインスタ投稿（5つ）', genre: 'sns', need: { genre: 'sns', level: 'beginner', text: 'SNS運用の課題を1つ出した人' }, amount: '投稿 5つ', period: '11月1日〜11月15日', due: '2026-11-15', status: 'open', client: '架空カフェ こもれび', applicants: ['u-aoi'], note: '文はAIといっしょに考えてもOKです。' },
      { id: 'j4', title: 'イベント記録動画（3分）のカット編集', genre: 'video', need: { genre: 'video', level: 'middle', text: '動画編集 中級の課題を1つ出した人' }, amount: '動画 1本', period: '10月27日〜10月31日', due: '2026-10-31', status: 'soon', client: '架空市 市民センター', applicants: ['u-kenta', 'u-irodori-4'], note: 'しめきりが近いです。' },
      { id: 'j5', title: 'ホームページの画像 さしかえ（10まい）', genre: 'design', need: { genre: 'design', level: 'beginner', text: '画像デザインの教材を3本見た人' }, amount: '画像 10まい', period: '11月10日〜11月30日', due: '2026-11-30', status: 'open', client: '架空工務店', applicants: [], note: '大きさをそろえる作業です。はじめての人にもおすすめ。' },
      { id: 'j6', title: '【模擬案件】Web制作 初級『ことのは読書ガイド』', genre: 'web', practice: true, need: { genre: 'web', level: 'beginner', text: 'だれでも' }, amount: 'ページ 1つ', period: 'いつでも', due: null, status: 'open', client: '練習用（納品なし）', applicants: [], note: '本番の流れを、練習で体験できます。' },
      { id: 'j7', title: '音声の文字起こし（30分）', genre: 'pc', need: { genre: 'pc', level: 'beginner', text: 'パソコンの基本を見おわった人' }, amount: '音声 30分', period: '12月から', due: null, status: 'prep', client: '架空大学 研究室', applicants: [], note: 'ただいま準備中です。' },
      { id: 'j8', title: 'AIニュースのまとめ（週に1回）', genre: 'ai', need: { genre: 'sns', level: 'middle', text: 'AI情報収集の課題を2つ出した人' }, amount: '毎週 3つ', period: '11月〜12月', due: '2026-12-25', status: 'open', client: 'エスピクトスクール 運営', applicants: ['u-aoi', 'u-tsumugi-3'], note: '' }
    ];
  }
  function deliveries() {
    return [
      { id: 'd1', title: '架空商店街の会：お店紹介記事（10月分）', client: '架空商店街の会', job: 'j1', stage: 'check', due: '2026-10-30', items: 3, done: 3, people: ['u-soramame-0', 'u-hoshi-1', 'u-sakura'] },
      { id: 'd2', title: '架空町 まつり実行委員会：のぼり画像', client: '架空町 まつり実行委員会', job: 'j2', stage: 'making', due: '2026-11-05', items: 2, done: 1, people: ['u-ren'] },
      { id: 'd3', title: '架空市 市民センター：講座の記録動画', client: '架空市 市民センター', job: 'j4', stage: 'making', due: '2026-10-31', items: 1, done: 0, people: ['u-kenta'] },
      { id: 'd4', title: '架空カフェ こもれび：9月のインスタ投稿', client: '架空カフェ こもれび', job: 'j3', stage: 'ready', due: '2026-10-28', items: 5, done: 5, people: ['u-aoi', 'u-aozora-1'] },
      { id: 'd5', title: '架空工務店：施工例ページの画像', client: '架空工務店', job: 'j5', stage: 'done', due: '2026-10-15', items: 8, done: 8, people: ['u-miku', 'u-akari-0'], deliveredAt: '2026-10-15' },
      { id: 'd6', title: '架空大学 研究室：インタビューの文字起こし', client: '架空大学 研究室', job: 'j7', stage: 'done', due: '2026-10-10', items: 2, done: 2, people: ['u-nozomi-1'], deliveredAt: '2026-10-09' }
    ];
  }

  window.makeSeed = function () {
    return {
      v: window.SEED_VERSION,
      clock: 'morning',
      me: 'u-sakura',
      settings: {
        learner: { fs: 1, theme: 'light', contrast: false, furigana: false, speechRate: 0.95, reduceMotion: false, breakRemind: true },
        staff: { fs: 1, theme: 'light', contrast: false, reduceMotion: false },
        admin: { fs: 1, theme: 'light', contrast: false, reduceMotion: false }
      },
      facilities: FACILITIES,
      mine: MINE.map((u) => Object.assign({ facility: 'f-hidamari' }, u)),
      others: OTHERS,
      day: DAY,
      attendance: makeAttendance(),
      // きょうの「わたし」（さくら）の出席：まだ押していない
      myDay: { status: 'none', in: null, mood: null, breaks: [], out: null, activity: null },
      lessons: lessonProgress(),
      tasks: taskState(),
      chats: chats(),
      pikuto: [{ from: 'bot', at: at(TODAY, '09:00'), text: 'おはよう、さくらさん。ぴくとだよ。\nわからないことがあったら、なんでも聞いてね。\n合格かどうかは言えないけど、ヒントはいっしょに考えるよ。' }],
      submissions: fixDraftNames(submissions()),
      decided: [],
      alerts: [
        { id: 'al-sota', type: 'emergency', learner: 'u-sota', at: at(TODAY, '09:47'), status: 'open', title: 'ぴくとへの相談に、つらい気持ちのことばがありました', quote: 'きのうから ねむれなくて、もう ぜんぶ いやになった', hint: 'まずは静かな場所で、ゆっくり話を聞いてください。体調のことも聞いてみてください。' }
      ],
      alertLog: [
        { id: 'al-old1', type: 'call', learner: 'u-yuma', at: at('2026-10-23', '13:40'), status: 'done', title: '「職員さんを呼ぶ」が押されました', doneAt: at('2026-10-23', '13:42'), doneBy: '森 ゆみ', note: '書き出しの設定をいっしょに確認した' }
      ],
      staffLogs: [],
      notices: notices(),
      jobs: jobs(),
      myJobs: [],
      deliveries: deliveries(),
      works: works(),
      extraTasks: [],
      reports: {},
      staffNotes: { 'u-sakura': '写真の説明文を考えるのが上手になってきた。中級のブログに取り組み中。' }
    };
  };
  window.SEED_HELPERS = { OCT, TODAY };
})();
