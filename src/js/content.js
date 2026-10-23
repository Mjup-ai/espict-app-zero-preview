/* =========================================================
   変わらない中身：指示書・時間割・ジャンル など
   （人の名前・事業所はすべて架空。課題と教材の題名は catalog.json から）
   ========================================================= */
(function () {
  const C = window.CATALOG;

  const GENRES = {
    pc:      { name: 'パソコンの基本', short: 'パソコン', icon: 'mouse',   cls: 'g-pc' },
    web:     { name: 'Web制作',        short: 'Web',      icon: 'globe',   cls: 'g-web' },
    ai:      { name: 'AI',             short: 'AI',       icon: 'sparkles', cls: 'g-ai' },
    design:  { name: '画像デザイン',    short: '画像',     icon: 'palette', cls: 'g-design' },
    video:   { name: '動画編集',        short: '動画',     icon: 'film',    cls: 'g-video' },
    sns:     { name: 'SNS運用',         short: 'SNS',      icon: 'hash',    cls: 'g-sns' },
    esports: { name: 'eスポーツ',       short: 'eスポーツ', icon: 'gamepad', cls: 'g-esports' }
  };
  const LEVELS = {
    beginner: { name: '初級', n: 1, cls: 'chip-lv1' },
    middle:   { name: '中級', n: 2, cls: 'chip-lv2' },
    advanced: { name: '上級', n: 3, cls: 'chip-lv3' }
  };
  const METHODS = {
    studio: { name: 'STUDIOで作る', short: 'STUDIO版', icon: 'monitor', desc: 'ホームページを作る道具「STUDIO」で、自分の手で作ります' },
    ai:     { name: 'AIで作る',     short: 'AI版',     icon: 'sparkles', desc: 'AIにお願いして作り、自分の目で確かめて直します' },
    image:  { name: '画像を作る',   short: '画像版',   icon: 'image',   desc: '記事に使う画像（OGP・バナー・図）を作ります' }
  };

  /* ---- 授業LIVE の時間割（平日 10:10 から） ---- */
  const PERIODS = [
    { key: 'p1', name: '1時間目', start: '10:10', end: '11:00' },
    { key: 'p2', name: '2時間目', start: '11:10', end: '12:00' },
    { key: 'lunch', name: 'お昼休み', start: '12:00', end: '13:00', rest: true },
    { key: 'p34', name: '3・4時間目', start: '13:00', end: '14:50' },
    { key: 'p5', name: '5時間目', start: '15:00', end: '15:50' }
  ];
  const TIMETABLE = { // 曜日(1=月) → 時間ごとのジャンル
    1: { p1: 'web', p2: 'sns', p34: 'video', p5: 'design' },
    2: { p1: 'design', p2: 'web', p34: 'video', p5: 'sns' },
    3: { p1: 'web', p2: 'design', p34: 'video', p5: 'esports' },
    4: { p1: 'sns', p2: 'design', p34: 'video', p5: 'web' },
    5: { p1: 'web', p2: 'sns', p34: 'video', p5: 'design' }
  };
  const TEACHERS = { web: 'ながの先生', sns: 'ふじい先生', video: 'おおた先生', design: 'あんどう先生', esports: 'にしだ先生' };
  const LIVE_TOPICS = {
    web: 'ブログの記事に「目次」を入れてみよう',
    sns: 'インスタの投稿文を、AIといっしょに考えよう',
    video: 'テロップを読みやすくする3つのコツ',
    design: 'OGP画像の文字を大きく見せるには',
    esports: 'チームで声をかけあう練習'
  };

  /* ---- 教材をさがす道具 ---- */
  const seriesById = {};
  const lessonById = {};
  C.series.forEach((s) => { seriesById[s.id] = s; s.episodes.forEach((e, i) => { lessonById[e.id] = Object.assign({ series: s.id, idx: i }, e); }); });
  function L(sid, label) { // 'blog', '⑤' → lesson id
    const s = seriesById[sid]; if (!s) return null;
    const e = s.episodes.find((x) => x.label === label || String(x.no) === String(label));
    return e ? e.id : null;
  }

  /* ---- 指示書（ブログ記事 9つ） ---- */
  const THEMES = {
    beginner: { title: '文字起こしってどんな仕事？', short: '文字起こし', about: '音声や動画で話していることを、文字にする仕事の紹介' },
    middle:   { title: '介護のデータ入力ってどんな仕事？', short: '介護のデータ入力', about: '介護の記録をパソコンに入力する仕事の紹介' },
    advanced: { title: '仕事をお願いする（外注する）流れ', short: '外注の流れ', about: '会社が外に仕事をお願いするときの流れの紹介' }
  };
  function blogInstr(t) {
    const th = THEMES[t.level];
    const lv = t.level;
    if (t.method === 'studio') {
      const parts = {
        beginner: { what: '見出し3つと、要点の枠', steps: [['要点の枠を入れる', '大事なことを3つ、枠の中にまとめます。', [L('blog', '⑥')]]], checks: ['「要点」の枠に、大事なことが3つ書いてある'] },
        middle: { what: '写真2まいと、目次', steps: [['写真と説明を入れる', '写真を2まい入れて、写真の下に説明の文をつけます。', [L('blog', '⑤')]], ['目次を作る', '見出しの名前を並べて、押すとその見出しに飛べるようにします。', [L('blog', '⑮'), L('blog', '⑯')]]], checks: ['写真が2まい入っている', '写真の下に説明の文がある', '目次を押すと、その見出しに飛べる'] },
        advanced: { what: '表と、流れの図', steps: [['表を作る', '「お願いする前」「お願いした後」をくらべる表を作ります。', [L('blog', '⑦')]], ['流れの図を作る', '外注の流れを、ステップの図で見せます。', [L('blog', '⑧')]]], checks: ['表がスマホでも はみ出さない', '流れの図にステップが5つある'] }
      }[lv];
      return {
        summary: [`STUDIOで「${th.title}」の記事ページを作ります。`, `${parts.what}を入れます。`, 'できたら、ページのURLを出します。'],
        goal: th.about,
        steps: [
          ['記事のページを用意する', lv === 'beginner' ? 'かんたんブログのひな形を使って、記事のページを1つ用意します。' : 'ブログ講座で作ったページを複製して、新しい記事のページにします。', lv === 'beginner' ? [L('blog-easy', '①'), L('blog-easy', '③')] : [L('blog', '⑭')]],
          ['タイトルと本文を入れる', '指示書の文章をコピーして、見出しと本文に入れます。', [L('blog', '④'), L('blog', '⑰')]]
        ].concat(parts.steps).concat([
          ['スマホで見て確かめる', 'プレビューをスマホの大きさにして、文字や写真がはみ出していないか見ます。', [L('blog', '⑬')]],
          ['URLをコピーして出す', 'ページを公開して、URLをコピーします。「これで提出する」を押して、URLをはりつけます。', [L('studio-1', '⑮')]]
        ]),
        checks: [`タイトルが「${th.title}」になっている`, '見出しが3つある'].concat(parts.checks).concat(['スマホで見ても、文字がはみ出さない']),
        submit: { type: 'url', label: 'ページのURL', placeholder: 'https://〇〇〇.studio.site/...' },
        materials: [{ name: '記事の文章（テキスト）', icon: 'file' }].concat(lv !== 'beginner' ? [{ name: lv === 'middle' ? '写真 2まい' : '図の下書き', icon: 'image' }] : []),
        sample: 'blog'
      };
    }
    if (t.method === 'ai') {
      return {
        summary: [`AIにお願いして「${th.title}」の記事ページを作ります。`, 'AIが作ったものを、自分の目で確かめて直します。', 'できたら、ページのURLを出します。'],
        goal: th.about,
        steps: [
          ['AIを使う準備をする', 'AI版ブログ①を見て、使う道具を開きます。', [L('blog-ai', '①')]],
          ['AIにページを作ってもらう', '指示書の「お願いの文」をコピーして、AIにわたします。', [L('blog-ai', '②')]],
          lv === 'beginner' ? ['文章を読んで直す', 'まちがっている所や、むずかしい言葉がないか読みます。', []] : ['AIで画像を作る', lv === 'middle' ? '記事に合う写真のような画像を2まい作ります。' : '流れの図と表を、AIに作ってもらいます。', [L('blog-ai', '③')]],
          ['自分の目で確かめる', 'AIはまちがえることがあります。名前・数字・言葉を、指示書と見くらべます。', []],
          ['確認して提出する', 'ページのURLをコピーして、「これで提出する」を押します。', [L('blog-ai', '④')]]
        ],
        checks: [`タイトルが「${th.title}」になっている`, 'AIの文章を、自分で読んで直した', lv === 'beginner' ? '要点が3つにまとまっている' : (lv === 'middle' ? '画像が2まい、目次が1つある' : '表が1つ、流れの図が1つある'), '人の名前や、本当の会社の名前が入っていない', 'スマホで見ても、文字がはみ出さない'],
        submit: { type: 'url', label: 'ページのURL', placeholder: 'https://...' },
        materials: [{ name: 'AIへのお願いの文（コピー用）', icon: 'copy' }, { name: '記事の文章（テキスト）', icon: 'file' }],
        sample: 'blog'
      };
    }
    // 画像版
    const img = {
      beginner: { what: 'OGP画像1まいと、相談バナー1まい', sizes: ['OGP画像：よこ1200 × たて630', '相談バナー：よこ600 × たて200'], lessons: [L('blog-img', 'I2'), L('blog-img', 'I7')], files: 2 },
      middle: { what: '画像を4まい（アイキャッチ・OGP・図・バナー）', sizes: ['アイキャッチ：よこ1200 × たて800', 'OGP画像：よこ1200 × たて630', '記事の図：よこ1000 × たて600', '相談バナー：よこ600 × たて200'], lessons: [L('blog-img', 'I1'), L('blog-img', 'I2'), L('blog-img', 'I3'), L('blog-img', 'I7')], files: 4 },
      advanced: { what: '流れの図をふくむ画像3まい', sizes: ['流れの図：よこ1200 × たて900', 'OGP画像：よこ1200 × たて630', 'アイキャッチ：よこ1200 × たて800'], lessons: [L('blog-img', 'I3'), L('blog-img', 'I2'), L('blog-img', 'I1')], files: 3 }
    }[lv];
    return {
      summary: [`「${th.short}」の記事に使う、${img.what}を作ります。`, '大きさ（サイズ）は、指示書のとおりにします。', 'できたら、画像のファイルを出します。'],
      goal: th.about,
      steps: [
        ['記事を読む', 'どんな記事か、いちばん伝えたいことは何かを、1つ決めます。', []],
        ['大きさを決めて作りはじめる', img.sizes.join('／'), [img.lessons[0]]],
        ['文字を大きく、読みやすくする', 'スマホで小さく見ても読める大きさにします。色は3色くらいまで。', img.lessons.slice(1, 3)],
        ['書き出して出す', 'PNG で書き出して、「これで提出する」からファイルを出します。', [img.lessons[img.lessons.length - 1]]]
      ],
      checks: ['大きさ（サイズ）が指示書のとおり', 'タイトルの文字が、小さくしても読める', '文字が画像のはしで切れていない', '色が多すぎない（3色くらいまで）', `画像が${img.files}まいそろっている`],
      submit: { type: 'image', label: `画像のファイル（${img.files}まい）`, files: img.files },
      materials: [{ name: '記事の文章（テキスト）', icon: 'file' }, { name: 'ロゴと色の見本', icon: 'palette' }],
      sample: lv === 'advanced' ? 'flow' : 'banner'
    };
  }

  /* ---- 指示書（月の指示書：試作のための仮の中身） ---- */
  function monthlyInstr(t) {
    const g = t.genre;
    const lv = t.level;
    const lvWord = lv ? LEVELS[lv].name : '';
    const base = {
      video: { what: '地域のお祭りを紹介する、1分の動画', steps: [['素材をならべる', 'もらった動画の素材を、タイムラインにならべます。', [L('video-basic', '4')]], ['いらない所をカットする', '話していない所や、ぶれている所を切ります。', [L('video-basic', '5')]], ['テロップを入れる', '大事な言葉を、画面の下に文字で出します。', [L('video-basic', '6')]], ['音の大きさをそろえる', 'BGMが声より大きくならないようにします。', [L('video-adv', '6')]], ['書き出して出す', 'MP4で書き出して、ファイルを出します。', [L('video-basic', '7')]]], checks: ['長さが1分くらい', 'テロップに字のまちがいがない', 'BGMが声より小さい', 'さいごに「おわり」の画面がある'], submit: { type: 'video', label: '動画のファイル（MP4）' }, sample: 'video' },
      design: { what: lv === 'advanced' ? 'お店のチラシ（A4）1まい' : lv === 'middle' ? 'お店のメニュー画像 2まい' : 'お知らせのバナー 1まい', steps: [['見本を見る', '指示書の見本と、使う写真を見ます。', [L('canva-basic', '2')]], ['文字を入れる', 'お店の名前と、伝えたいことを入れます。', [L('canva-basic', '5')]], ['写真や素材を入れる', '写真をならべて、大きさをそろえます。', [L('canva-basic', '4')]], ['書き出して出す', 'PNG で書き出して出します。', [L('canva-basic', '8')]]], checks: ['大きさが指示書のとおり', 'お店の名前がいちばん目立つ', '字のまちがいがない', '色が多すぎない'], submit: { type: 'image', label: '画像のファイル', files: lv === 'middle' ? 2 : 1 }, sample: 'banner' },
      web: { what: lv === 'advanced' ? 'お店のホームページ（3ページ）' : lv === 'middle' ? 'お店の紹介ページ（写真つき）' : 'お店の紹介ページ（1ページ）', steps: [['ページを作る', 'STUDIOで新しいページを作ります。', [L('web-basic', '2')]], ['文字と写真を入れる', '指示書の文章と写真を入れます。', [L('web-basic', '5'), L('web-basic', '6')]], ['すき間を整える', 'マージンとパディングで、読みやすくします。', [L('web-basic', '7')]], ['プレビューで確かめて出す', 'スマホの大きさでも確かめて、URLを出します。', [L('web-basic', '8')]]], checks: ['お店の名前が上にある', '写真が入っている', 'スマホで見てもはみ出さない', 'リンクが正しく動く'], submit: { type: 'url', label: 'ページのURL', placeholder: 'https://...' }, sample: 'blog' },
      sns: { what: t.title.includes('AI情報収集') ? 'AIのニュースを3つ集めて、やさしくまとめた文' : 'インスタグラムの投稿 3つ（画像と文）', steps: t.title.includes('AI情報収集') ? [['ニュースをさがす', '運営がえらんだサイトから、AIのニュースを3つえらびます。', [L('sns-adv', '1')]], ['やさしい言葉でまとめる', '1つのニュースを、3行でまとめます。', []], ['出どころを書く', 'どのサイトのニュースか、名前を書きます。', []], ['出す', 'まとめた文をはりつけて出します。', []]] : [['テーマを決める', '投稿のテーマを指示書からえらびます。', [L('sns-basic', '2')]], ['画像を作る', '投稿に使う画像を作ります。', [L('canva-basic', '2')]], ['文を考える', 'AIといっしょに投稿の文を考えます。', [L('sns-adv', '1')]], ['マナーを確かめて出す', '人の写真や名前が入っていないか確かめます。', [L('sns-basic', '4')]]], checks: ['3つそろっている', '人の名前や顔が入っていない', 'やさしい言葉で書いてある', '出どころ（どこの情報か）が書いてある'], submit: { type: 'text', label: '文と画像' }, sample: 'sns' }
    }[g] || { what: '指示書のとおりの作品', steps: [], checks: [], submit: { type: 'text', label: '作品' }, sample: 'blog' };
    return {
      summary: [`${base.what}を作ります。`, lvWord ? `${lvWord}の内容です。指示書のとおりに進めましょう。` : '指示書のとおりに進めましょう。', 'できたら、「これで提出する」から出します。'],
      goal: base.what,
      steps: base.steps,
      checks: base.checks,
      submit: base.submit,
      materials: [{ name: '指示書（PDF）', icon: 'file' }, { name: '素材のフォルダ', icon: 'folder' }],
      sample: base.sample,
      provisional: true
    };
  }

  /* ---- はじめてコース ---- */
  const START_INSTR = [
    { summary: ['このアプリで できることを知ります。', '「来ました」のボタン、ぴくと、提出のしかたを ためします。', 'さいごに「これで提出する」を押してみます。'], checks: ['「来ました」を押した', 'ぴくとに1回 質問した', '教材を1本 見た'], submit: { type: 'text', label: 'ひとこと' } },
    { summary: ['STUDIO入門の動画を見ながら、STUDIOをさわってみます。', 'まちがえても大丈夫。もとにもどせます。'], checks: ['STUDIO入門①を見た', 'STUDIOを開いた', '文字を1つ入れてみた'], submit: { type: 'url', label: 'ページのURL' } },
    { summary: ['練習用の「ことのは読書ガイド」のページを作ります。', 'お金はもらわない、練習のための案件です。'], checks: ['見出しが入っている', '本の紹介が3つある'], submit: { type: 'url', label: 'ページのURL' } },
    { summary: ['「ことのは読書ガイド」に、写真と目次を足します。'], checks: ['写真が入っている', '目次がある'], submit: { type: 'url', label: 'ページのURL' } },
    { summary: ['「ことのは読書ガイド」を、スマホでも見やすく仕上げます。'], checks: ['スマホで見やすい', 'メニューが動く'], submit: { type: 'url', label: 'ページのURL' } },
    { summary: ['自己紹介の文を、AIといっしょに整えます。', '本当の名前や住所は書かなくて大丈夫です。'], checks: ['3行くらいの文になった', 'むずかしい言葉がない'], submit: { type: 'text', label: '自己紹介の文' } }
  ];

  function instrFor(task) {
    if (!task) return null;
    if (task.group === 'blog-2026-10') return blogInstr(task);
    if (task.kind === 'monthly') return monthlyInstr(task);
    if (task.kind === 'start') return Object.assign({ steps: [], materials: [], sample: 'blog' }, START_INSTR[(task.step || 1) - 1]);
    if (task.kind === 'new') return Object.assign({ steps: [], materials: [], sample: 'blog' }, task.instr || {});
    return null;
  }

  /* ---- 課題をまとめて扱う ---- */
  const START_TASKS = C.start.map((s) => ({ id: s.id, src: s.src, title: s.title, kind: 'start', step: s.step, group: 'start', genre: s.step >= 2 && s.step <= 5 ? 'web' : (s.step === 6 ? 'ai' : 'pc'), level: null, practiceCase: s.practiceCase, due: null, mins: [20, 30, 60, 90, 120, 30][s.step - 1] }));
  const ALL_TASKS = C.tasks.concat(START_TASKS);

  window.CONTENT = {
    GENRES, LEVELS, METHODS, PERIODS, TIMETABLE, TEACHERS, LIVE_TOPICS, THEMES,
    seriesById, lessonById, L, instrFor, ALL_TASKS, START_TASKS,
    FACILITY: { id: 'f-hidamari', name: 'ひだまりラボ', area: '架空市みなと町', kind: 'B型' },
    STAFF: { id: 'st-mori', name: '森 ゆみ', short: '森さん' },
    OPS: { id: 'op-hirano', name: '平野', team: 'エスピクトスクール 運営' }
  };
})();
