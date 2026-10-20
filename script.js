'use strict';

/**
 * CASE 1021 / browser-only prototype
 * Public release: 2026-10-21 10:00 and 17:00 JST.
 * Creator's test: add ?preview=1 to URL (do not share this test URL).
 */
const STORAGE_KEY = 'case1021-save-v1';
const START_AT = new Date('2026-10-21T10:00:00+09:00').getTime();
const SECOND_AT = new Date('2026-10-21T17:00:00+09:00').getTime();
const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
const app = document.querySelector('#app');
const sideStatus = document.querySelector('#sidebar-status');
const progressFill = document.querySelector('#progress-fill');
const toastElement = document.querySelector('#toast');
let toastTimer;

const DEFAULT_SAVE = () => ({
  step: 'opening',
  earlyRead: [],
  reportRead: [],
  comparisonRead: [],
  fragmentsRead: [],
  hintLevel: 0,
  visitedSteps: ['opening'],
  evidenceOrder: [],
  solved: false
});
let save;
function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || !parsed.step) return DEFAULT_SAVE();
    const base = DEFAULT_SAVE();
    const merged = {...base, ...parsed};
    ['earlyRead','reportRead','comparisonRead','fragmentsRead'].forEach(key => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    // Convert the first version's saves without losing the player's progress.
    if (!Array.isArray(parsed.visitedSteps)) {
      const last = SCENE_ORDER.indexOf(merged.step);
      merged.visitedSteps = SCENE_ORDER.slice(0, Math.max(0, last) + 1);
    }
    merged.visitedSteps = [...new Set(['opening', ...merged.visitedSteps.filter(s => SCENE_ORDER.includes(s))])];
    if (!Array.isArray(merged.evidenceOrder)) merged.evidenceOrder = [];
    if (!Number.isInteger(merged.hintLevel)) merged.hintLevel = 0;
    return merged;
  } catch (_) { return DEFAULT_SAVE(); }
}
function saveGame() {try {localStorage.setItem(STORAGE_KEY, JSON.stringify(save));} catch (_) {}}
const isFirstOpen = () => PREVIEW || Date.now() >= START_AT;
const isSecondOpen = () => PREVIEW || Date.now() >= SECOND_AT;
const secondSteps = new Set(['investigation','reports','archive','recordA','comparison','fragments','deduction','cipher','final']);
const progression = {
  opening:0, brief:7, documents:14, earlyquiz:22, intermission:28,
  investigation:36, reports:43, archive:50, recordA:60, comparison:67,
  fragments:72, deduction:81, cipher:88, final:100
};
const SCENE_ORDER = Object.keys(progression);
const sceneLabels = {
  opening:'事件の始まり', brief:'匿名の依頼', documents:'同封された三枚',
  earlyquiz:'最初の推論', intermission:'追加資料待ち', investigation:'存在しない目撃者',
  reports:'二つの報告', archive:'記録の検索', recordA:'人物Aの発見',
  comparison:'証拠の出どころ', fragments:'二枚の原稿', deduction:'人物AとB',
  cipher:'六組の暗号', final:'最終調査報告'
};
save = loadSave();

function h(text) {return String(text).replace(/[&<>"']/g, v => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));}
function para(...paragraphs) {return `<div class="story">${paragraphs.map(t => `<p>${t}</p>`).join('')}</div>`;}
function head(index, title, subtitle) {return `<div class="chapter-head"><span class="chapter-line"></span><span class="eyebrow">${index}</span></div><h1 class="chapter-title">${title}</h1>${subtitle ? `<p class="lead">${subtitle}</p>` : ''}`;}
function btn(label, next, cls='btn') {return `<button class="${cls}" type="button" data-next="${next}">${label}<span class="arrow" aria-hidden="true">↗</span></button>`;}
function paper(id, title, content, foot='') {
  return `<article class="document"><div class="document-header"><span>UEKI / ${id}</span><span>CASE 1021</span></div><h3>${title}</h3><hr>${content}${foot ? `<hr><footer>${foot}</footer>`:''}</article>`;
}
function toast(message){
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('show');
  toastTimer = setTimeout(() => toastElement.classList.remove('show'), 2700);
}
function canEnter(step) {
  if (!SCENE_ORDER.includes(step)) return false;
  if (step !== 'opening' && !isFirstOpen()) return false;
  if (secondSteps.has(step) && !isSecondOpen()) return false;
  return true;
}
function collectEvidence(id) {
  if (!save.evidenceOrder.includes(id)) save.evidenceOrder.push(id);
}
function getAllowedVisited() {
  return SCENE_ORDER.filter(step => save.visitedSteps.includes(step) && canEnter(step));
}
function go(next) {
  if (!canEnter(next)) {
    toast('この資料は、まだ公開されていません。');
    return;
  }
  const here = SCENE_ORDER.indexOf(save.step);
  const there = SCENE_ORDER.indexOf(next);
  const revisiting = save.visitedSteps.includes(next);
  if (!revisiting && there !== here + 1) {
    toast('まだ開けない場面です。順番に調査してください。');
    return;
  }
  save.step = next;
  if (!revisiting) save.visitedSteps.push(next);
  if (next === 'brief') collectEvidence('letter');
  if (next === 'recordA') collectEvidence('recordA');
  if (next === 'cipher') collectEvidence('conclusion');
  if (next === 'final') collectEvidence('final');
  saveGame();
  closeEvidence();
  render();
  window.scrollTo({top:0, behavior:'auto'});
}
function finishRead(field,id) {
  if (!save[field].includes(id)) save[field].push(id);
  const collected = {earlyRead:{letter:'letter',b:'fileB',x:'cipherX'},reportRead:{where:'reportWhere',past:'reportPast'},fragmentsRead:{one:'fragmentOne',two:'fragmentTwo'}};
  if (collected[field]?.[id]) collectEvidence(collected[field][id]);
  saveGame();
}
function chooseEvidence(id,arr,field) {
  finishRead(field,id);
  save[`${field}Selection`] = id;
  saveGame();
  render();
}
function shownPreviewNotice() {return PREVIEW ? `<div class="preview-notice">制作者用プレビューモード：公開時間の制限を解除しています。共有するときは、URLの <b>?preview=1</b> を削除してください。</div>` : '';}
function getRemaining(target){
  const d = Math.max(0, Math.ceil((target-Date.now())/1000));
  const hr = Math.floor(d/3600).toString().padStart(2,'0');
  const mn = Math.floor(d%3600/60).toString().padStart(2,'0');
  const sc = (d%60).toString().padStart(2,'0');
  return `${hr}:${mn}:${sc}`;
}
function countdown(target){return `<div class="countdown" data-countdown="${target}">${getRemaining(target)}</div>`;}

function sceneOpening(){
  if (!isFirstOpen()) return `<span class="small-tag">CONFIDENTIAL / CASE 1021</span>
    <h1 class="title-xl">CASE <em>1021.</em></h1>
    <p class="lead">一通の依頼書。ひとつの記録。そして、まだ誰も見ていない人物。</p>
    <div class="section-rule"></div>
    <div class="lock"><span class="lock-icon">◷</span>資料の封印解除まで</div>
    ${countdown(START_AT)}<p class="mini">10月21日 10:00（日本時間）公開</p>`;
  return `<span class="small-tag">CONFIDENTIAL / CASE 1021</span>
    <h1 class="title-xl">CASE <em>1021.</em></h1>
    <p class="lead">姿を見た者はいない。だが、その人物についての記録は存在していた。</p>
    <div class="section-rule"></div>
    <div class="eyebrow">INCOMING REQUEST</div>
    <p class="story">10月21日、午前10時。<br>植木探偵事務所に、差出人のない封筒が届いた。</p>
    ${para('封筒には三枚の紙が入っていた。依頼書、人物の記録、そして六組の数字。','あなたは探偵・植木誠として、この不可解な依頼を調査する。')}
    <div class="actionbar">${btn('封筒を開く','brief')}</div>`;
}
function sceneBrief(){
  return `${head('PROLOGUE / 10:00', '差出人のない封筒','依頼人は、名乗らなかった。')}
  ${para('植木誠は、机の上に封筒を置いた。封は丁寧に閉じられている。差出人の名前も、住所もない。','「厄介そうな依頼だな……」','封を切ると、白い紙が三枚滑り出た。最初の一枚は調査依頼書。')}
  ${paper('LETTER-01','人物捜索の依頼',`<p>植木 誠 様</p><p>ある人物を探していただきたい。</p><p>その人物について記された資料は存在している。しかし、その人物を直接見たという証言は、一件も確認されていない。</p><p>私は、その人物が10月21日に現れると考えている。</p><p>なぜ見つからないのか、調べてほしい。</p>`, '<span class="handnote">依頼人：匿名</span>')}
  ${para('「まだ誰も見ていない人物、か」','依頼書だけでは、名前も居場所もわからない。植木は残りの二枚を調べることにした。')}
  <div class="actionbar">${btn('同封資料を調べる','documents')}</div>`;
}
const EARLY = [
  {id:'letter', title:'依頼書', summary:'匿名の依頼人から届いた一枚', foot:'LETTER-01'},
  {id:'b', title:'人物Bの記録', summary:'目撃者が存在しない人物',foot:'FILE-B'},
  {id:'x',title:'六組の数字',summary:'意味のわからない数値列',foot:'CIPHER-X'}
];
function earlyDetails(id){
  if (id==='letter') return paper('LETTER-01','人物捜索の依頼',`<p>ある人物を探していただきたい。</p><p>その人物について記された資料は存在している。しかし、その人物を直接見たという証言は、一件も確認されていない。</p><p>私は、その人物が10月21日に現れると考えている。</p><p>なぜ見つからないのか、調べてほしい。</p>`, '依頼人：匿名');
  if (id==='b') return paper('FILE-B','人物Bについて',`<table class="meta-table"><tr><td>氏名</td><td>不明</td></tr><tr><td>記録日</td><td>10月21日</td></tr><tr><td>所在</td><td>不明</td></tr><tr><td>目撃証言</td><td>0件</td></tr></table>`, '備考：記録が作成された経緯は不明。');
  return paper('X-1021','識別不能の数値',`<p>同封の紙には六組の数字が記されている。</p><div style="font:16px/2.1 monospace;letter-spacing:.08em">0 / +2 &nbsp; +1 / -3<br>+3 / +2 &nbsp; -1 / +1<br>+7 / 0 &nbsp; 0 / 0</div>`, '<span class="handnote">「基準は、受取人の最も近くにある。」</span>');
}
function cardList(items,read,field) {
 return `<div class="evidence-grid">${items.map(o => `<button type="button" class="evidence ${save[`${field}Selection`]===o.id?'active':''}" data-read="${field}:${o.id}"><span class="evidence-id">${o.foot}</span><strong class="evidence-title">${o.title}</strong><span class="evidence-summary">${o.summary}</span><span class="evidence-foot ${read.includes(o.id)?'read-check':''}">${read.includes(o.id)?'✓ 閲覧済み':'↗ 資料を開く'}</span></button>`).join('')}</div>`;
}
function sceneDocuments(){
  const selected=save.earlyRead.length ? (save.earlyRead.includes(save.earlyReadSelection) ? save.earlyReadSelection : save.earlyRead[save.earlyRead.length-1]):null;
  return `${head('PROLOGUE / EVIDENCE', '最初の三枚','すべての資料を確認し、捜査の出発点を決める。')}
    ${cardList(EARLY,save.earlyRead,'earlyRead')}
    ${selected ? earlyDetails(selected) : '<p class="mini">資料を選ぶと、内容を確認できます。</p>'}
    <div class="actionbar">${save.earlyRead.length===3 ? btn('調査の方針を決める','earlyquiz'): `<button disabled class="btn btn-secondary">資料をすべて確認してください（${save.earlyRead.length}/3）</button>`}</div>`;
}
const QUIZ_EARLY = [
  {id:'a', label:'資料がある以上、人物Bは確実に存在している'},
  {id:'b', label:'資料は存在するが、そこに書かれた人物の実在は未確認だ'},
  {id:'c', label:'人物Bはすでに死亡している可能性が高い'}
];
function options(choices,tag){return `<div class="option-list">${choices.map((x,i)=>`<button type="button" class="option" data-answer="${tag}:${x.id}"><strong>${String.fromCharCode(65+i)}</strong>${x.label}</button>`).join('')}</div>`;}
function sceneEarlyQuiz(){
 return `${head('PROLOGUE / DEDUCTION', '最初の推論','資料の数と、証拠の強さは同じではない。')}
  ${para('三枚の紙を見比べながら、植木は手帳を開いた。','「依頼人は、記録があると言っている。だが、それは『本人を見た』という話とは違うはずだ……」')}
  <div class="question"><span class="item-label">Q. 現段階で、確実に言えることは？</span><h3>人物Bについて、最も妥当な判断を選べ。</h3>${options(QUIZ_EARLY,'early')}</div>`;
}
function sceneIntermission(){
  const unlocked=isSecondOpen();
  return `${head('PROLOGUE / END', '調査は続く','記録の存在だけでは、人物の存在を証明できない。')}
  ${para('植木は、三枚の資料を机の上に並べた。','「姿のない人物を探せ、か。妙な話だ」','やがて、事務所のパソコンに短い通知が届いた。')}
  <div class="file-tree">[CASE 1021] 新しい調査資料を受信<br>STATUS: ${unlocked?'<span class="selected">ACCESS GRANTED</span>':'LOCKED'}<br>RELEASE: 10.21 / 17:00 JST</div>
  ${unlocked? `<div class="actionbar">${btn('追加資料を開く','investigation')}</div>`: `<div class="lock"><span class="lock-icon">◷</span>次の資料は17:00に公開されます</div>${countdown(SECOND_AT)}<p class="mini">このページは閉じても大丈夫です。調査記録はこのブラウザに保存されます。</p>`}`;
}
function sceneInvestigation(){
 return `${head('CHAPTER 01 / 17:00', '存在しない目撃者','見つからない人物Bについて、二件の追加報告が届いた。')}
 ${para('午後五時。事務所のパソコンが、短い通知音を鳴らした。','画面には「調査資料1021-01」「調査資料1021-02」の二件が追加されている。','「こんどこそ、本人につながる手がかりだといいが……」','植木は資料を開いた。')}
 <div class="actionbar">${btn('追加資料を調べる','reports')}</div>`;
}
const REPORTS = [
 {id:'where',title:'人物Bの所在について',summary:'場所と時刻に関する照合',foot:'1021-01'},
 {id:'past',title:'人物Bの過去について',summary:'過去の経歴と参照番号',foot:'1021-02'}
];
function reportDetails(id){
 if(id==='where') return paper('1021-01','人物Bの所在について',`<p>人物Bに関する記録には、10月21日の日付が記されている。</p><p>しかし、その人物を直接目撃したという証言は、現在までに一件も確認されていない。</p><p>記録には人物Bが現れる具体的な場所や時刻についての記載がなく、記録が作成された経緯も不明である。</p>`,'調査対象：人物B');
 return paper('1021-02','人物Bの過去について',`<p>人物Bの過去を調査したが、その人物がこれまでどのように生活していたのかを示す資料は発見されなかった。</p><p>一方、人物Bに関する複数の文書から、共通する参照番号が確認された。</p><p>この番号が何を示しているのかは明らかになっていない。</p>`,'参照番号：<b>1020</b>');
}
function sceneReports(){
 const selected=save.reportRead.length ? (save.reportRead.includes(save.reportReadSelection)?save.reportReadSelection:save.reportRead[save.reportRead.length-1]):null;
 return `${head('CHAPTER 01 / EVIDENCE', '二つの報告','人物Bの情報は、どこから来ているのか。')}
 ${cardList(REPORTS,save.reportRead,'reportRead')}
 ${selected ? reportDetails(selected) : '<p class="mini">まず、二つの調査資料を確認してください。</p>'}
 ${save.reportRead.length===2? `${para('「目撃者がいないだけじゃない。過去の記録も、一つも出てこない……」','植木は、資料に繰り返し現れる参照番号を手帳に書き写した。','「この番号に、何かが隠れているのかもしれない」')}`: ''}
 <div class="actionbar">${save.reportRead.length===2 ? btn('資料の参照元を調べる','archive') : `<button disabled class="btn btn-secondary">資料をすべて確認してください（${save.reportRead.length}/2）</button>`}</div>`;
}
function sceneArchive(){
 return `${head('CHAPTER 02 / ARCHIVE', '記録の出どころ','資料には、繰り返し同じ参照番号が現れていた。')}
 ${para('植木は、事務所の古い記録検索システムを起動した。','「別の書類にも、同じ番号が書かれている。偶然じゃないだろう」','資料1021-02に記された四桁の番号を、検索欄に入力する。')}
 <div class="file-tree">UEKI ARCHIVE / SEARCH INDEX<br>────────────────────────<br>&gt; 検索条件：参照番号<br>&gt; 入力を待っています<span class="selected"> _</span></div>
 <form id="archive-form" class="archive-form"><input class="input" name="archive" autocomplete="off" inputmode="numeric" maxlength="12" aria-label="参照番号" placeholder="参照番号を入力" required><button type="submit" class="btn">検索する ↗</button></form><p class="mini">ヒント：調査資料1021-02の末尾を確認。</p>`;
}
function recordADocument() {
 return paper('1020-1','人物Aの記録',`<table class="meta-table"><tr><td>呼称</td><td>人物A</td></tr><tr><td>記録日</td><td>10月20日</td></tr><tr><td>記録内容</td><td>これまでに確認された出来事</td></tr><tr><td>後続資料</td><td>1020-2</td></tr></table><p style="margin-top:20px">本記録の記述は10月20日までの出来事を扱う。以降の情報は、別紙にて取り扱う。</p>`, '後続資料：1020-2');
}
function sceneRecordA(){
 return `${head('CHAPTER 02 / DISCOVERY', 'もう一人の関係者','参照番号1020に一致する記録が、一件だけ見つかった。')}
 <div class="file-tree">ARCHIVE SEARCH : 1020<br><span class="selected">✓ 1件の一致が見つかりました</span><br>└─ RECORD 1020 / 人物A / 10月20日</div>
 ${para('「人物A……？」','人物Bを探していたはずなのに、検索結果には別の人物の記録が表示された。','植木は、人物Aのファイルを開いた。')}
 ${recordADocument()}
 ${para('植木は後続資料を検索した。表示されたのは、見覚えのある文書だった。','「……人物Bの資料じゃないか」','別の人物と思っていたAとB。その記録には、同じ参照番号が使われていた。')}
 <div class="actionbar">${btn('資料の関係を検証する','comparison')}</div>`;
}
const QUIZ_COMPARE = [
 {id:'a',label:'複数の資料があるので、人物Bは実在すると確認できる'},
 {id:'b',label:'人物Aと人物Bは、必ず別の人物として行動している'},
 {id:'c',label:'Bの資料はAの記録を参照しており、独立した証拠とはいえない'}
];
function sceneComparison(){
 return `${head('CHAPTER 02 / VERIFICATION', '証拠の数','複数の書類は、複数の目撃者を意味しない。')}
 <div class="file-tree">[1020-1] 人物Aの記録（10月20日）<br>　└─ 後続資料：1020-2<br>[1020-2] 人物Bの資料（10月21日）<br>　└─ 参照元：1020-1<br>[1021-01] 人物Bの所在調査<br>　└─ 直接の目撃証言：なし<br>[1021-02] 人物Bの過去調査<br>　└─ 参照番号：1020</div>
 ${para('「Bに関する書類は何枚もある。だが、その情報をたどると、どれもAの記録に行き着く」','植木は二つの名前を手帳に書き、間に線を引いた。')}
 <div class="question"><span class="item-label">Q. 証拠の検証</span><h3>この資料群から、確実に判断できることは何か？</h3>${options(QUIZ_COMPARE,'compare')}</div>`;
}
function fragmentDetails(id) {
  if (id==='one') return paper('1020 / PAGE 1','原稿・第一面',`<p>この人物について、現在までに確認された事柄を記録する。</p><p>10月20日をもって、第一の記録を区切る。</p><p>以降の記述については、別紙に引き継ぐ。</p><p class="handnote">ただし、引き継ぐものは――</p>`,'次の紙面に続く');
  return paper('1020 / PAGE 2','原稿・第二面',`<p class="handnote">――記録の対象そのものではない。</p><p>以降の出来事は、まだ確認されていない。</p><p>そのため、これまでの事実と混同しないよう、別の記号を割り当てる。</p><p>二つの資料に記される対象は、一つである。</p>`,'原稿作成者：<span class="redacted" aria-label="非公開">非公開</span>');
}
function sceneFragments(){
 const read=save.fragmentsRead;
 return `${head('CHAPTER 03 / ORIGINAL', '二枚に分けられた原稿','人物Aの記録に付属していた原稿は、二枚に分かれていた。')}
 ${para('「人物Bの記録がAから作られた理由……それがわかるかもしれない」','植木は原稿の写しを一枚ずつ確認した。')}
 <div class="evidence-grid">
  ${[{id:'one',title:'原稿・第一面',summary:'過去の記録の終わり',foot:'1020-1 / ORIGINAL'},{id:'two',title:'原稿・第二面',summary:'後続資料の作成方針',foot:'1020-2 / ORIGINAL'}].map(o=>`<button type="button" data-read="fragmentsRead:${o.id}" class="evidence ${save.fragmentsReadSelection===o.id?'active':''}"><span class="evidence-id">${o.foot}</span><strong class="evidence-title">${o.title}</strong><span class="evidence-summary">${o.summary}</span><span class="evidence-foot ${read.includes(o.id)?'read-check':''}">${read.includes(o.id)?'✓ 閲覧済み':'↗ 原稿を読む'}</span></button>`).join('')}
 </div>
 ${save.fragmentsReadSelection ? fragmentDetails(save.fragmentsReadSelection) : ''}
 <div class="actionbar">${read.length===2?btn('二人の関係を推理する','deduction'):`<button class="btn btn-secondary" disabled>原稿を両方確認してください（${read.length}/2）</button>`}</div>`;
}
const QUIZ_DEDUCTION = [
 {id:'a',label:'BはAになりすまそうとしている別人だ'},
 {id:'b',label:'AとBは一人の人物について、異なる時点を記したものだ'},
 {id:'c',label:'BがAの記録を書き換え、過去を消した'}
];
function sceneDeduction(){
 return `${head('CHAPTER 03 / DEDUCTION', '存在しない二人目','本当に、この事件には二人の人物がいたのだろうか。')}
 ${para('植木は、二枚の原稿を横に並べた。','第一面は、すでに確認された過去を扱っていた。第二面は、まだ確認されていない事柄を扱うため、別の記号を使うと書かれている。','そして、原稿にはこう書かれていた。')}
 <div class="mono-paper">「二つの資料に記される対象は、一つである。」</div>
 ${para('植木は、二つの記録の表題を見つめた。','「人物A。人物B。別人だと思って追っていたが……」')}
 <div class="question"><span class="item-label">Q. 最も合理的な結論</span><h3>人物Aと人物Bは、どのような関係にある？</h3>${options(QUIZ_DEDUCTION,'deduction')}</div>`;
}
const CIPHER_PAIRS = ['0 / +2','+1 / -3','+3 / +2','-1 / +1','+7 / 0','0 / 0'];
const cipherHints = [
  '六組の数字が並んでいる。二つの数は、必ず対になっている。まず「基準」が何なのかを考えよう。',
  '封筒の宛先を見返そう。「受取人の最も近くにあるもの」は、植木の持ち物とは限らない。',
  '数字は、ある並びの上を「縦」と「横」にずらす量かもしれない。文字を規則正しく並べる方法を考えよう。',
  '植木誠をひらがなにすると六文字。五十音を行と列に並べ、それぞれの文字から指定された数だけ移動してみよう。'
];
function cipherHintHtml() {
  const level = Math.min(3, Math.max(0, save.hintLevel));
  return `<div class="cipher-help">
    <button type="button" class="hint-toggle" data-action="next-hint" ${level === 3?'disabled':''}>${level ? (level === 3 ? 'すべての捜査メモを確認済み' : '次の捜査メモを見る') : '行き詰まったら捜査メモを見る'} <span aria-hidden="true">▾</span></button>
    ${level ? `<div class="hint hint-progress"><span class="item-label">INVESTIGATION NOTES / ${level} OF 3</span><p>${cipherHints[level]}</p></div>` : '<p class="mini">まずは自力で解読してみよう。必要ならヒントを一段階ずつ確認できる。</p>'}
  </div>`;
}
function sceneCipher(){
 return `${head('CHAPTER 04 / CIPHER', '六組の数字','事件の最初から、解かれずに残っていた暗号。')}
 ${para('「Bは、人物Aのこれからを記録したものだった……」','植木は報告書に推理を書き込む。しかし、最初の封筒にはまだ未解決の紙が残されていた。','「依頼人は、この数字をなぜ俺に送った？」')}
 <div class="cipher-rows">${CIPHER_PAIRS.map((val,i)=>`<div class="cipher-row"><span class="n">PAIR ${String(i+1).padStart(2,'0')}</span><span class="v">${val}</span></div>`).join('')}</div>
 <div class="hint"><strong>同封の書き込み</strong><br>「基準は、受取人の最も近くにある。」</div>
 ${para('日付や住所との関連は見つからない。植木は封筒の宛名と数字を交互に見つめた。','「基準……。何を基準に、何を変化させる数字なんだ？」')}
 <div class="file-tree">UNKNOWN CIPHER / 6 PAIRS<br>REFERENCE: UNRESOLVED</div>
 <form id="cipher-form" class="cipher-form"><input class="input" type="text" name="cipher" placeholder="解読した文字を入力" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20" aria-label="暗号の解読結果" required><button class="btn" type="submit">照合する ↗</button></form>
 ${cipherHintHtml()}`;
}
function sceneFinal(){
 return `${head('CLOSING FILE / CASE 1021', '最後の依頼','解読した六文字は、一人の人物の名前だった。')}
 <div class="final-card"><span class="eyebrow">CIPHER VERIFIED</span><div class="final-rule"></div><div class="final-name">おかねひろと</div><p class="sub">最終確認者として指定された人物</p><div class="final-rule"></div></div>
 ${para('植木は、その名前を事件資料の検索欄に入力した。','すると、それまで表示されていなかった一枚の文書が現れた。')}
 ${paper('FINAL-1021','最終確認者に関する記録',`<p>人物Bについて、最終的な確認を行う者として、以下の人物が指定されている。</p><p style="font-size:21px;letter-spacing:.15em;text-align:center;margin:19px 0"><strong>おかねひろと</strong></p><table class="meta-table"><tr><td>指定理由</td><td>不明</td></tr><tr><td>人物Bとの関係</td><td>不明</td></tr><tr><td>確認結果</td><td>未記入</td></tr></table>`, '資料作成者：非公開')}
 ${para('「……最後の確認者？」','人物Bの捜索を依頼されたのは、植木自身だった。だが、最終的な確認は別の人物に委ねられている。','「どうして、この人物なんだ……？」','そのとき、事務所の電話が鳴った。')}
 <div class="calllog"><span class="section-cap">CALL RECORD / UNKNOWN</span>
  <span class="role">植木</span><p>「人物Bについて、ある程度のことはわかりました」</p>
  <span class="role">依頼人</span><p>「聞かせてください」</p>
  <span class="role">植木</span><p>「Bの記録は、人物Aの記録をもとに作られていました。二人は別人ではなく、同じ人物の異なる時点を記したものではありませんか」</p>
  <span class="role">依頼人</span><p>「そう考えた理由は？」</p>
  <span class="role">植木</span><p>「原稿には、対象は一つだと書かれています。ただし、Bについての記述はまだ確認されていない。だから、今も直接の目撃証言がないんです」</p>
  <span class="role">依頼人</span><p>「では、人物Bは見つからなかったのですね」</p>
  <span class="role">植木</span><p>「ええ。ですが、最終確認者の名前はわかりました。……おかねひろと、という人物です」</p>
  <span class="role">依頼人</span><p>「そうですか」</p>
  <span class="role">植木</span><p>「なぜ彼が選ばれたんです？　それと、あなたは一体誰なんです？」</p>
  <span class="role">依頼人</span><p>「その二つには、今はお答えできません」</p>
  <span class="role">植木</span><p>「……最後に、何が起きるのかだけでも」</p>
  <span class="role">依頼人</span><p>「それは、まだ確認されていないことです。最後の記録は、その人に任せたいのです」</p>
  <span class="role">植木</span><p>「……わかりました」</p>
  <span class="role">依頼人</span><p>「ご協力ありがとうございました、植木探偵」</p>
 </div>
 <div class="file-tree">CONNECTION TERMINATED<br>CASE 1021 / FINAL REPORT SAVED</div>
 ${para('電話が切れると、植木は最終報告書を書き上げた。')}
 ${paper('REPORT-1021','最終調査報告書',`<p><strong>捜索対象：</strong>人物B</p><p><strong>調査結果：</strong>人物Bは、人物Aと同一人物の将来について記されたものと推定する。</p><p>ただし、人物Bについての直接の目撃証言は、現時点で得られていない。</p><p>匿名の依頼人の正体、および今後起こる出来事の内容は不明。</p><hr><p><strong>最終確認者：</strong>おかねひろと</p><p><strong>確認結果：</strong>未記入</p><div class="stamp">UNRESOLVED</div>`, '調査担当：植木 誠')}
 ${para('植木は報告書を閉じた。調べられることは、ここまでだった。','何が起こるのか。なぜ、あの人物が選ばれたのか。そして匿名の依頼人は誰なのか。','その答えは、まだ資料のどこにも残されていない。')}
 <div class="divider-dots">···</div>
 <div class="final-card"><span class="eyebrow">END OF AVAILABLE RECORDS</span><div class="final-rule"></div><h2 class="mystery">CASE <em>1021</em></h2><p class="sub">存在しない二人目</p><div class="final-rule"></div><span class="small-tag">調査状況：未完了</span><p class="mini" style="margin:25px 0 0">最後の記録は、まだ誰も知らない。</p></div>
 <div class="journal"><p>調査手帳 / 植木 誠</p><p>・人物Aと人物Bの関係は推定できた。</p><p>・依頼人の正体はわからない。</p><p>・最終確認者に引き継ぐべき事項が残されている。</p></div>`;
}
const evidenceCatalog = [
  {id:'letter',title:'匿名の依頼書',code:'LETTER-01',stage:'brief',render:()=>earlyDetails('letter')},
  {id:'fileB',title:'人物Bの記録',code:'FILE-B',stage:'documents',render:()=>earlyDetails('b')},
  {id:'cipherX',title:'六組の数字',code:'CIPHER-X',stage:'documents',render:()=>earlyDetails('x')},
  {id:'reportWhere',title:'Bの所在調査',code:'1021-01',stage:'reports',render:()=>reportDetails('where')},
  {id:'reportPast',title:'Bの過去調査',code:'1021-02',stage:'reports',render:()=>reportDetails('past')},
  {id:'recordA',title:'人物Aの記録',code:'1020-1',stage:'recordA',render:recordADocument},
  {id:'fragmentOne',title:'原稿・第一面',code:'1020 / P1',stage:'fragments',render:()=>fragmentDetails('one')},
  {id:'fragmentTwo',title:'原稿・第二面',code:'1020 / P2',stage:'fragments',render:()=>fragmentDetails('two')},
  {id:'conclusion',title:'AとBの関係',code:'DEDUCTION',stage:'cipher',render:()=>paper('MEMO-1021','調査メモ',`<p>人物Bの記録は人物Aの記録から作成された。</p><p>二つの資料は別人の存在を示すものではなく、同一人物の異なる時点を記している可能性が高い。</p>`,'調査担当：植木誠')},
  {id:'final',title:'最終確認者',code:'FINAL-1021',stage:'final',render:()=>paper('FINAL-1021','最終確認者',`<p>暗号解読結果：<strong>おかねひろと</strong></p><p>人物Bの最終的な確認を委ねられた人物。</p><p>依頼人の正体と今後起こる出来事は未解明。</p>`,'調査状況：未完了')}
];
const evidenceList = document.querySelector('#evidence-list');
const evidenceCount = document.querySelector('#evidence-count');
const sceneHistory = document.querySelector('#scene-history');
const evidenceModal = document.querySelector('#evidence-modal');
const evidenceModalContent = document.querySelector('#evidence-modal-content');
const evidenceModalTitle = document.querySelector('#evidence-modal-title');
const evidenceDialog = evidenceModal.querySelector('.evidence-dialog');
const mobileEvidenceToggle = document.querySelector('#mobile-evidence-toggle');
let lastEvidenceTrigger = null;

function knownEvidence() {
  return save.evidenceOrder.map(id=>evidenceCatalog.find(item=>item.id===id)).filter(item=>item && canEnter(item.stage));
}
function renderSidebar() {
  const collected = knownEvidence();
  evidenceCount.textContent = String(collected.length).padStart(2,'0');
  evidenceList.innerHTML = collected.length ? collected.map(item=>`<button type="button" class="collected-item" data-evidence="${item.id}"><span class="collected-code">${item.code}</span><span class="collected-title">${item.title}</span><span class="collected-arrow" aria-hidden="true">↗</span></button>`).join('') : '<p class="evidence-empty">資料を開くと、ここに追加されます。</p>';
  const visited = getAllowedVisited();
  sceneHistory.innerHTML = visited.map(step=>`<button type="button" data-jump="${step}" class="history-item ${step===save.step?'current':''}" ${step===save.step?'aria-current="step"':''}>${sceneLabels[step]}</button>`).join('');
}
function closeEvidence() {
  if (evidenceModal.hidden) return;
  evidenceModal.hidden = true;
  document.body.classList.remove('modal-open');
  lastEvidenceTrigger?.focus();
  lastEvidenceTrigger = null;
}
function openEvidence(id, trigger) {
  const item = knownEvidence().find(item=>item.id===id);
  if (!item) { toast('この資料は、まだ閲覧できません。'); return; }
  lastEvidenceTrigger = trigger;
  evidenceModalTitle.textContent = item.title;
  evidenceModalContent.innerHTML = item.render();
  evidenceModal.hidden = false;
  document.body.classList.add('modal-open');
  evidenceDialog.focus();
}
function sceneNavigation() {
  if (!isFirstOpen()) return '';
  const visited = getAllowedVisited();
  const position = visited.indexOf(save.step);
  const prev = position>0 ? visited[position-1] : '';
  const next = position>=0 && position < visited.length-1 ? visited[position+1] : '';
  return `<nav class="scene-nav" aria-label="場面の移動">
    <button type="button" data-nav="previous" ${prev?'':'disabled'} aria-label="前の場面へ戻る">← 戻る</button>
    <span>閲覧済み ${String(position+1).padStart(2,'0')} / ${String(visited.length).padStart(2,'0')}</span>
    <button type="button" data-nav="forward" ${next?'':'disabled'} aria-label="次の閲覧済みの場面へ">進む →</button>
  </nav>`;
}
function navigateVisited(direction) {
  const visited = getAllowedVisited();
  const index = visited.indexOf(save.step);
  const next = visited[index + (direction==='previous'?-1:1)];
  if (next) go(next);
}
function migrateEvidenceForExistingSave() {
  // Existing players should retain evidence they had already opened in v1.
  const old = [
    ...(save.visitedSteps.includes('brief')?['letter']:[]),
    ...(save.earlyRead.includes('b')?['fileB']:[]),
    ...(save.earlyRead.includes('x')?['cipherX']:[]),
    ...(save.reportRead.includes('where')?['reportWhere']:[]),
    ...(save.reportRead.includes('past')?['reportPast']:[]),
    ...(save.visitedSteps.includes('recordA')?['recordA']:[]),
    ...(save.fragmentsRead.includes('one')?['fragmentOne']:[]),
    ...(save.fragmentsRead.includes('two')?['fragmentTwo']:[]),
    ...(save.visitedSteps.includes('cipher')?['conclusion']:[]),
    ...(save.visitedSteps.includes('final')?['final']:[])
  ];
  for (const id of old) collectEvidence(id);
  saveGame();
}
migrateEvidenceForExistingSave();

const scenes = {
  opening:sceneOpening,brief:sceneBrief,documents:sceneDocuments,earlyquiz:sceneEarlyQuiz,
  intermission:sceneIntermission,investigation:sceneInvestigation,reports:sceneReports,archive:sceneArchive,
  recordA:sceneRecordA,comparison:sceneComparison,fragments:sceneFragments,deduction:sceneDeduction,
  cipher:sceneCipher,final:sceneFinal
};
function render(){
  if (!scenes[save.step]) save.step='opening';
  if (!isFirstOpen()) save.step='opening';
  if (secondSteps.has(save.step) && !isSecondOpen()) save.step='intermission';
  if (!save.visitedSteps.includes(save.step)) save.visitedSteps.push(save.step);
  saveGame();
  sideStatus.textContent=save.step==='final'?'未完了 / 引継待ち':save.step==='intermission'&&!isSecondOpen()?'追加資料待ち':'調査進行中';
  progressFill.style.width=`${progression[save.step] || 0}%`;
  renderSidebar();
  app.innerHTML=shownPreviewNotice()+sceneNavigation()+scenes[save.step]();
}
function normalizeKana(value){return value.trim().replace(/[\s\u3000・･]/g,'').replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
function onCorrect(next,message){toast(message);go(next);}
function onAnswer(tag,choice){
  if(tag==='early'){
    if(choice==='b') onCorrect('intermission','正解。記録の存在は、人物の実在の証明にならない。');
    else toast('その結論を裏付ける証拠は、まだありません。');
  } else if(tag==='compare'){
    if(choice==='c') onCorrect('fragments','正解。複数の文書が、同じ記録に由来していた。');
    else toast('資料の出どころをもう一度確認してください。');
  } else if(tag==='deduction'){
    if(choice==='b') onCorrect('cipher','正解。二つの記録は、一人の人物の異なる時点を扱っている。');
    else toast('原稿には「二つの資料に記される対象は、一つ」とあります。');
  }
}
app.addEventListener('click', event=>{
  const target=event.target.closest('button');
  if(!target) return;
  if(target.dataset.nav){navigateVisited(target.dataset.nav);return;}
  if(target.dataset.next){go(target.dataset.next);return;}
  if(target.dataset.read){
    const [field,id]=target.dataset.read.split(':');
    const valid={earlyRead:EARLY.map(x=>x.id),reportRead:REPORTS.map(x=>x.id),fragmentsRead:['one','two']};
    if(valid[field]?.includes(id))chooseEvidence(id,save[field],field);
    return;
  }
  if(target.dataset.answer){const [tag,id]=target.dataset.answer.split(':');onAnswer(tag,id);return;}
  if(target.dataset.action==='next-hint'){
    save.hintLevel=Math.min(3,save.hintLevel+1);saveGame();render();return;
  }
});
app.addEventListener('submit', event=>{
  event.preventDefault();
  const form=event.target;
  if(form.id==='archive-form'){
    const value=(new FormData(form).get('archive')||'').toString().trim().replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0));
    if(value==='1020')onCorrect('recordA','記録1020：人物Aが見つかった。');
    else toast('該当する記録が見つかりません。番号を確認してください。');
  }
  if(form.id==='cipher-form'){
    const value=normalizeKana((new FormData(form).get('cipher')||'').toString());
    if(value==='おかねひろと'){
      save.solved=true;saveGame();onCorrect('final','暗号を解読しました。関係者ファイルが解放されます。');
    } else toast('照合できませんでした。数字と書き込みを見直してください。');
  }
});
document.addEventListener('click', event=>{
  const evidenceButton = event.target.closest('[data-evidence]');
  if (evidenceButton) {openEvidence(evidenceButton.dataset.evidence, evidenceButton);return;}
  const jumpButton = event.target.closest('[data-jump]');
  if (jumpButton && getAllowedVisited().includes(jumpButton.dataset.jump)) {go(jumpButton.dataset.jump);return;}
  if (event.target.closest('[data-close-evidence]')) closeEvidence();
});
document.addEventListener('keydown', event=>{
  if (event.key==='Escape' && !evidenceModal.hidden) closeEvidence();
  if (event.key==='Tab' && !evidenceModal.hidden) {
    // Keep keyboard focus within the open modal.
    const nodes=[...evidenceModal.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
    if(!nodes.length)return;
    const first=nodes[0], last=nodes[nodes.length-1];
    if(event.shiftKey && (document.activeElement===first || document.activeElement===evidenceDialog)){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  }
});
mobileEvidenceToggle.addEventListener('click',()=>{
  const open=document.querySelector('.sidebar').classList.toggle('evidence-open');
  mobileEvidenceToggle.setAttribute('aria-expanded',String(open));
});
document.querySelector('#reset-button').addEventListener('click',()=>{
 if(confirm('調査記録を初期化して、最初から始めますか？')){
   save=DEFAULT_SAVE();saveGame();go('opening');
 }
});
setInterval(()=>{
  const elem=app.querySelector('[data-countdown]');
  if(!elem)return;
  const target=Number(elem.dataset.countdown);
  if(Date.now()>=target){render();return;}
  elem.textContent=getRemaining(target);
},1000);
render();
