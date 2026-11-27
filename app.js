import {scheduleAnswer,retrievability,quality,eligible} from './scheduler.js';
import {makeReading,attemptCounts,frequentMistakes} from './reading.js';
const $=s=>document.querySelector(s), content=$('#content');let db,words=[],logs=[],settings={direction:'mixed',dailyGoal:20},page='home',quiz=null,studyMode='choice',filter='',categoryFilter='all',beforeInstall=null,toastTimer;
const demo=[['maintain','duy trì','Công việc'],['improve','cải thiện','Công việc'],['achieve','đạt được','Công việc'],['develop','phát triển','Công việc'],['require','yêu cầu','Công việc'],['consider','cân nhắc','Công việc'],['increase','tăng lên','Công việc'],['decrease','giảm xuống','Công việc'],['efficient','hiệu quả','Công việc'],['accurate','chính xác','Công việc'],['benefit','lợi ích','Công việc'],['challenge','thử thách','Công việc'],['opportunity','cơ hội','Công việc'],['confidence','sự tự tin','Công việc'],['essential','thiết yếu','Công việc'],['significant','đáng kể','Công việc'],['analyze','phân tích','Công việc'],['evaluate','đánh giá','Công việc'],['approach','phương pháp tiếp cận','Công việc'],['establish','thiết lập','Công việc']];
function uuid(){return globalThis.crypto?.randomUUID?.()||('w'+Date.now()+Math.random().toString(36).slice(2))}function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function localDate(ts=Date.now()){const d=new Date(ts);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function fromDay(day){const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d).getTime()}function dayOffset(i){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return localDate(d.getTime())}function formatDate(ts){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ts))}function pct(x){return `${Math.round(x*100)}%`}function randomize(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000)}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('lexiflow-local',1);req.onupgradeneeded=()=>{let d=req.result;if(!d.objectStoreNames.contains('words'))d.createObjectStore('words',{keyPath:'id'});if(!d.objectStoreNames.contains('logs'))d.createObjectStore('logs',{keyPath:'id'});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function getAll(store){return new Promise((resolve,reject)=>{let r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function write(stores, mutate) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || Error('Không thể lưu dữ liệu'));
    try { mutate(tx); }
    catch (error) { tx.abort(); reject(error); }
  });
}
function put(store, item) { return write(store, tx => tx.objectStore(store).put(item)); }
function remove(store, id) { return write(store, tx => tx.objectStore(store).delete(id)); }
function replaceData(newWords, newLogs, newSettings) {
  return write(['words','logs','settings'], tx => {
    for (const [name, rows] of [['words', newWords], ['logs', newLogs], ['settings', newSettings]]) {
      const store = tx.objectStore(name);
      store.clear();
      for (const row of rows) store.add(row);
    }
  });
}
async function refresh(){[words,logs]=await Promise.all([getAll('words'),getAll('logs')]);const s=await getAll('settings');settings={direction:'mixed',dailyGoal:20,speechRate:1,...Object.fromEntries(s.map(x=>[x.key,x.value]))}}function wordObject(en,vi,category='Chung'){return {id:uuid(),en:en.trim(),vi:vi.trim(),category:category.trim()||'Chung',createdAt:Date.now(),reviews:0,successes:0,lapses:0,stability:0,difficulty:5,due:0,lastReviewed:0}}
function progressStreak(){const dates=new Set(logs.map(x=>localDate(x.time))),today=dayOffset(0),yesterday=dayOffset(-1);if(!dates.has(today)&&!dates.has(yesterday))return 0;let i=dates.has(today)?0:-1,days=0;while(dates.has(dayOffset(i))){days++;i--}return days}
function stats(){let due=words.filter(w=>eligible(w)).length,reviewed=words.filter(w=>w.reviews),answers=logs.filter(l=>l.mode!=='recall'&&l.mode!=='reading'), recalled=logs.filter(l=>l.mode==='recall'), accuracy=answers.length?answers.filter(l=>l.correct).length/answers.length:0,ret=reviewed.length?reviewed.reduce((sum,w)=>sum+retrievability(w),0)/reviewed.length:0;return {due,reviewed:reviewed.length,accuracy,ret,answered:answers.length,recallCount:recalled.length,recallRate:recalled.length?recalled.filter(l=>l.correct).length/recalled.length:0,learnedToday:new Set(logs.filter(l=>localDate(l.time)===dayOffset(0)).map(l=>l.wordId)).size}}
const icons={home:'◫',study:'⚡',words:'▤',stats:'◷',settings:'⚙'};function setPage(p){page=p;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));$('#page-title').textContent=({home:'Tổng quan',study:'Luyện tập',reading:'Ôn bài đọc',words:'Kho từ vựng',stats:'Thống kê ghi nhớ',settings:'Cài đặt'})[p];$('#streak-badge').textContent=`🔥 ${progressStreak()} ngày`;render();window.scrollTo({top:0,behavior:'instant'})}function render(){if(page==='home')home();else if(page==='study')study();else if(page==='reading')readingPage();else if(page==='words')wordPage();else if(page==='stats')statsPage();else settingsPage()}
function home(){const s=stats(),categories=new Set(words.map(w=>w.category)).size;content.innerHTML=`<section class="hero"><div><div class="eyebrow">BUILD A BETTER MEMORY</div><h2>Mỗi từ mới, một bước tiến. ✨</h2><p>Ôn từ vựng với lịch tự động hoặc luyện đọc hiểu bằng câu hỏi 4 đáp án.</p><button class="btn" id="start-home">⚡ Bắt đầu ôn tập</button></div><div class="hero-art">📚</div></section><div class="grid"><div class="panel"><div class="stat-caption">TỔNG TỪ VỰNG</div><div class="stat-value">${words.length}</div><div class="stat-foot">${categories} chủ đề</div></div><div class="panel"><div class="stat-caption">CẦN ÔN HÔM NAY</div><div class="stat-value">${s.due}</div><div class="stat-foot">Sẵn sàng luyện tập</div></div><div class="panel"><div class="stat-caption">KHẢ NĂNG NHỚ ƯỚC TÍNH</div><div class="stat-value">${pct(s.ret)}</div><div class="stat-foot">Trên ${s.reviewed} từ đã ôn</div></div></div><div class="section-head"><h2>Tiến độ hôm nay</h2><span class="pill">Mục tiêu ${settings.dailyGoal} từ</span></div><div class="panel"><div class="space-between"><strong>${s.learnedToday} / ${settings.dailyGoal} từ</strong><span class="muted small-text">${Math.min(100,Math.round(s.learnedToday/settings.dailyGoal*100))}%</span></div><div class="progress" style="margin-top:16px"><div style="width:${Math.min(100,s.learnedToday/settings.dailyGoal*100)}%"></div></div><p class="footer-note">Mỗi từ được tính một lần mỗi ngày, dù bạn ôn nhiều lượt.</p></div><div class="grid two" style="margin-top:17px"><div class="panel"><h3>📈 Chất lượng học tập</h3><div class="feature-list" style="margin-top:22px"><div class="feature-row"><span>Tỷ lệ trắc nghiệm đúng</span><strong>${pct(s.accuracy)}</strong></div><div class="feature-row"><span>Từ đã ôn ít nhất một lần</span><strong>${s.reviewed}</strong></div><div class="feature-row"><span>Từ ghi nhớ tốt</span><strong>${words.filter(w=>quality(w)==='strong').length}</strong></div></div></div><div class="panel"><h3>🚀 Thao tác nhanh</h3><p class="muted small-text">Nhập từ mới bằng cách dán danh sách hoặc tạo từng từ.</p><div class="split"><button class="btn secondary small" id="add-word-home">+ Thêm từ</button><button class="btn secondary small" id="add-sample">✦ ${words.length?'Thêm':'Tạo'} bộ từ mẫu</button></div></div></div>`;$('#start-home').onclick=()=>setPage('study');$('#add-word-home').onclick=()=>wordModal();$('#add-sample').onclick=addSample}
async function addSample(){const keys=new Set(words.map(w=>w.en.toLocaleLowerCase('en')));let count=0;for(let [en,vi,cat]of demo){if(!keys.has(en.toLowerCase())){await put('words',wordObject(en,vi,cat));count++}}await refresh();toast(`Đã thêm ${count} từ mẫu`);render()}
function answerKey(value) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
function wordKey(word) {
  return JSON.stringify([answerKey(word.en),answerKey(word.vi),answerKey(word.category)]);
}
function buildQuestion(word, reverse, deck = words) {
  const key = reverse ? 'en' : 'vi';
  const prompt = reverse ? 'vi' : 'en';
  const byAnswer = new Map();
  for (const entry of deck) {
    if (answerKey(entry[prompt]) !== answerKey(word[prompt])) {
      byAnswer.set(answerKey(entry[key]), entry[key]);
    }
  }
  byAnswer.delete(answerKey(word[key]));
  byAnswer.delete('');
  if (byAnswer.size < 3) return null;
  const options = randomize([word[key], ...randomize([...byAnswer.values()]).slice(0, 3)]);
  return {word, reverse, options, correct: options.indexOf(word[key]), selected: null, done: false};
}
const speechRates = ['0.5','0.65','0.75','0.85','1','1.15','1.25','1.5'];
let ipaDictionary;
let lastPronunciation;

function speechRateLabel(rate) {
  return rate.replace('.', ',') + '×';
}

function speakerButtons(word) {
  const savedRate = String(settings.speechRate ?? 1);
  const shown = lastPronunciation?.id === word.id && lastPronunciation.value;
  return `<span class="speech-actions">
    <button type="button" class="speech-btn" data-speak="${escapeHTML(word.id)}" aria-label="Nghe phát âm Anh–Mỹ">🔊 Nghe</button>
    <select class="speech-btn speech-rate" data-speech-rate aria-label="Tốc độ phát âm">
      ${speechRates.map(rate => `<option value="${rate}" ${rate===savedRate?'selected':''}>${speechRateLabel(rate)}</option>`).join('')}
    </select>
    <span class="ipa-output" data-ipa-output role="status"${shown?'':' hidden'}>${shown?escapeHTML(shown):''}</span>
  </span>`;
}

function loadIpaDictionary() {
  ipaDictionary ??= fetch('./ipa-en-us.txt').then(async response => {
    if (!response.ok) throw Error('Không tải được từ điển IPA');
    const entries = new Map();
    for (const line of (await response.text()).split(/\r?\n/)) {
      const tab = line.indexOf('\t');
      if (tab > 0) entries.set(line.slice(0, tab).toLowerCase(), line.slice(tab + 1).trim());
    }
    if (!entries.size) throw Error('Từ điển IPA trống');
    return entries;
  }).catch(error => {
    ipaDictionary = undefined;
    throw error;
  });
  return ipaDictionary;
}

async function lookupIpa(word) {
  if (typeof word.ipa === 'string' && word.ipa.trim()) {
    const custom = word.ipa.trim();
    return custom.startsWith('/') ? custom : '/' + custom + '/';
  }
  const entries = await loadIpaDictionary();
  const key = word.en.normalize('NFC').toLowerCase().trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
  if (entries.has(key)) return entries.get(key);
  const tokens = key.match(/[\p{L}\p{N}]+(?:'[\p{L}]+)*/gu) || [];
  if (!tokens.length) return '';
  const parts = tokens.map(token => entries.get(token)?.split(',')[0]);
  if (!parts.every(Boolean)) return '';
  return tokens.length === 1 ? parts[0] : parts.join(' ') + ' (từng từ)';
}

async function showPronunciation(word, output) {
  output.hidden = false;
  output.textContent = 'Đang tra IPA…';
  const request = {id:word.id, value:''};
  lastPronunciation = request;
  try {
    const ipa = await lookupIpa(word);
    request.value = ipa ? 'IPA · ' + ipa : 'Chưa có IPA. Bạn có thể bổ sung trong Kho từ vựng.';
  } catch {
    request.value = 'Chưa tải được từ điển IPA. Hãy thử lại khi có mạng.';
    if (lastPronunciation === request) lastPronunciation = undefined;
  }
  output.textContent = request.value;
  if (lastPronunciation === request) {
    for (const button of content.querySelectorAll('button[data-speak]')) {
      if (button.dataset.speak !== word.id) continue;
      const current = button.parentElement.querySelector('[data-ipa-output]');
      current.hidden = false;
      current.textContent = request.value;
    }
  }
}
function speakEnglish(text, rate) {
  const synth = globalThis.speechSynthesis;
  if (!synth || !globalThis.SpeechSynthesisUtterance) {
    toast('Trình duyệt này chưa hỗ trợ phát âm.');
    return;
  }
  const american = synth.getVoices().filter(voice =>
    voice.lang.toLowerCase().replaceAll('_', '-') === 'en-us');
  const local = american.find(voice => voice.localService);
  if (!local && !navigator.onLine) {
    toast('Cần cài giọng English (United States) trên thiết bị để nghe offline.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  if (local || american[0]) utterance.voice = local || american[0];
  utterance.onerror = event => {
    if (!['canceled', 'interrupted'].includes(event.error)) {
      toast('Chưa phát được âm thanh. Kiểm tra giọng tiếng Anh Mỹ trên thiết bị.');
    }
  };
  synth.cancel();
  synth.speak(utterance);
}

function bindSpeech() {
  globalThis.speechSynthesis?.getVoices();
  content.addEventListener('change', async event => {
    const select = event.target.closest('select[data-speech-rate]');
    if (!select || !speechRates.includes(select.value)) return;
    const rate = select.value;
    settings.speechRate = Number(rate);
    content.querySelectorAll('select[data-speech-rate]').forEach(control => {control.value = rate});
    try {
      await put('settings', {key:'speechRate',value:Number(rate)});
    } catch {
      toast('Chưa lưu được tốc độ cho lần mở tiếp theo.');
    }
  });
  content.addEventListener('click', event => {
    const button = event.target.closest('button[data-speak]');
    if (!button) return;
    const word = words.find(entry => entry.id === button.dataset.speak);
    if (!word) return;
    const output = button.parentElement.querySelector('[data-ipa-output]');
    void showPronunciation(word, output);
    speakEnglish(word.en, settings.speechRate ?? 1);
  });
}

function studyTopic() {
  return words.some(word => word.category === settings.studyTopic) ? settings.studyTopic : '';
}
function studyDeck(topic = studyTopic()) {
  return topic ? words.filter(word => word.category === topic) : words;
}
function studyTopics() {
  return [...new Set(words.map(word => word.category))].filter(Boolean)
    .sort((a,b) => a.localeCompare(b,'vi'));
}
function randomStudyTopic(now = Date.now()) {
  const current = studyTopic();
  const topics = studyTopics().filter(topic => topic !== current);
  const dueTopics = new Set(words.filter(word => eligible(word, now)).map(word => word.category));
  const available = topics.filter(topic => dueTopics.has(topic));
  return randomize(available.length ? available : topics)[0] || current;
}
function studyModeControls(topic) {
  const topics = studyTopics();
  return `<div class="study-modes" aria-label="Cách luyện tập">
    <label class="study-topic">
      <span>Chủ đề học</span>
      <select id="study-topic" class="select" ${quiz?.saving?'disabled':''}>
        <option value="">Ngẫu nhiên · tất cả chủ đề</option>
        ${topics.map(name => `<option value="${escapeHTML(name)}" ${name===topic?'selected':''}>${escapeHTML(name)}</option>`).join('')}
      </select>
    </label>
    ${topics.length>1?`<button class="btn small secondary" id="random-topic" ${quiz?.saving?'disabled':''}>Bốc một chủ đề</button>`:''}
    <button class="btn small secondary" data-mode="recall" aria-pressed="${studyMode==='recall'}">Tự nhớ</button>
    <button class="btn small secondary" data-mode="choice" aria-pressed="${studyMode==='choice'}">Trắc nghiệm</button>
  </div>`;
}
async function changeStudyTopic(topic) {
  if (quiz?.saving) return;
  settings.studyTopic = topic;
  nextQuestion();
  render();
  try {
    await put('settings', {key:'studyTopic',value:topic});
  } catch {
    toast('Chưa lưu được chủ đề cho lần mở tiếp theo.');
  }
}
function bindStudyModes() {
  $('#study-topic').onchange = event => changeStudyTopic(event.target.value);
  const randomTopic = $('#random-topic');
  if (randomTopic) randomTopic.onclick = () => changeStudyTopic(randomStudyTopic());
  content.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
    if (quiz?.saving) return;
    const practice = quiz?.practice;
    studyMode = button.dataset.mode;
    nextQuestion(practice);
    render();
  });
}
let nextReviewTimer;
function study() {
  clearTimeout(nextReviewTimer);
  const topic = studyTopic();
  const deck = studyDeck(topic);
  if (!quiz || !deck.some(word => word.id === quiz.word.id)) nextQuestion();
  const q = quiz;
  const now = Date.now();
  const due = deck.filter(word => eligible(word, now)).length;
  if (!q) {
    const hasPractice = deck.some(word => word.reviews && !practicedWords.has(word.id) && quality(word,now)!=='strong');
    const lacksChoices = studyMode === 'choice' && (distinctCount(deck, 'en') < 4 || distinctCount(deck, 'vi') < 4);
    content.innerHTML = studyModeControls(topic) + `<div class="panel empty">
      <h2>${!words.length?'Bắt đầu bằng một từ':lacksChoices?'Chủ đề cần ít nhất 4 từ và nghĩa khác nhau':due?'Chưa đủ đáp án cho các từ đến hạn':'Đã hoàn thành lượt ôn'}</h2>
      <p>${!words.length?'Thêm từ của bạn hoặc thử với bộ từ mẫu.':lacksChoices||due?'Chọn Tự nhớ để ôn bằng các từ trong phạm vi hiện tại.':'Ứng dụng sẽ đưa từ trở lại khi đến hạn. Luyện thêm sẽ giữ nguyên lịch ôn.'}</p>
      <div class="split" style="justify-content:center">${!words.length
        ? '<button class="btn" id="sample-study">Thêm bộ từ mẫu</button><button class="btn secondary" id="add-study">Thêm từ của tôi</button>'
        : lacksChoices || due ? '' : (hasPractice ? '<button class="btn" id="free-practice">Luyện tập thêm</button>' : '') + '<button class="btn secondary" id="go-stats">Xem thống kê</button>'}</div></div>`;
    bindStudyModes();
    if ($('#sample-study')) $('#sample-study').onclick = addSample;
    if ($('#add-study')) $('#add-study').onclick = () => wordModal();
    if ($('#free-practice')) $('#free-practice').onclick = () => {nextQuestion(true); render()};
    if ($('#go-stats')) $('#go-stats').onclick = () => setPage('stats');
    const nextDue = deck.reduce((soonest, word) =>
      word.reviews && word.due > now ? Math.min(soonest, word.due) : soonest, Infinity);
    if (Number.isFinite(nextDue)) {
      nextReviewTimer = setTimeout(() => {
        if (page === 'study' && !quiz) render();
      }, Math.min(2147483647, nextDue - now + 20));
    }
    return;
  }

  const recall = studyMode === 'recall';
  const wrongChoice = !recall && q.done && q.selected !== q.correct;
  content.innerHTML = `<div class="quiz-shell">${studyModeControls(topic)}<div class="quiz-head">
    <span class="pill">${q.reverse?'VI → EN':'EN → VI'} · ${escapeHTML(q.word.category)}</span>
    <span class="muted small-text">${q.practice?'Luyện thêm':`${due} từ đến hạn`}</span></div>
    <div class="quiz-card">
      <div class="eyebrow">${q.reverse?'TIẾNG ANH LÀ GÌ?':'NGHĨA TIẾNG VIỆT LÀ GÌ?'}</div>
      <div class="word" lang="${q.reverse?'vi':'en'}">${escapeHTML(q.reverse?q.word.vi:q.word.en)}</div>
      ${q.reverse?'':speakerButtons(q.word)}
      ${recall&&!q.done?'<p class="hint">Tự nói hoặc nghĩ đáp án trước khi xem.</p><button class="btn" id="reveal-answer">Hiện đáp án</button>':''}
    </div>
    ${recall?'':answerButtons(q)}
    ${q.done?`<div class="feedback ${wrongChoice?'bad':'good'}"><strong>${recall?'Đáp án':wrongChoice?'✕ Chưa đúng':'✓ Chính xác!'}</strong>
      <p class="muted" style="margin:9px 0">${escapeHTML(q.word.en)} — ${escapeHTML(q.word.vi)}</p>
      ${q.reverse?speakerButtons(q.word):''}
      ${recall && q.correctAnswer===undefined
        ? '<div class="rating-row"><button class="btn small secondary" id="recall-right">Tôi nhớ đúng</button><button class="btn small danger" id="recall-wrong">Tôi nhớ sai</button></div>'
        : continueButton(q,'Câu tiếp theo')}</div>`:''}</div>`;

  bindStudyModes();
  if ($('#reveal-answer')) $('#reveal-answer').onclick = () => {q.done = true; render()};
  content.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
    q.selected = Number(button.dataset.answer);
    q.done = true;
    void saveReview(q, q.selected === q.correct, false);
  });
  if ($('#recall-right')) $('#recall-right').onclick = () => saveReview(q,true,true);
  if ($('#recall-wrong')) $('#recall-wrong').onclick = () => saveReview(q,false,true);
  if ($('#retry-answer')) $('#retry-answer').onclick = () => saveReview(q,q.correctAnswer,recall);
  if ($('#continue-answer')) $('#continue-answer').onclick = () => {
    nextQuestion(q.practice,q.word.id);
    render();
  };
}

async function saveReview(q, correct, recall) {
  if (q.saving || q.saved || quiz !== q) return;
  q.correctAnswer = correct;
  q.saving = true;
  render();
  const now = Date.now();
  const direction = q.reverse?'vi-en':'en-vi';
  try {
    await write(['words','logs'], tx => {
      const store = tx.objectStore('words');
      const current = store.get(q.word.id);
      current.onsuccess = () => {
        const word = current.result;
        if (!word || word.en !== q.word.en || word.vi !== q.word.vi) {
          tx.abort();
          return;
        }
        if (!q.practice) store.put({...scheduleAnswer(word, correct, now),lastDirection:direction});
        tx.objectStore('logs').add({id:uuid(),wordId:word.id,time:now,correct,grade:correct?3:1,
          direction,mode:recall?'recall':'choice',practice:q.practice,
          question:{prompt:q.reverse?word.vi:word.en,answer:q.reverse?word.en:word.vi,
            selected:recall?'':q.options[q.selected]}});
      };
    });
    q.saved = true;
    if (q.practice) practicedWords.add(q.word.id);
    if (q.word.reviews) reviewedSinceNew++;
    else reviewedSinceNew = 0;
    await refresh();
  } catch {
    if (!q.saved) toast('Không thể lưu lượt ôn. Hãy thử lưu lại.');
  } finally {
    q.saving = false;
    if (page === 'study' || page === 'home' || page === 'stats') render();
  }
}
function distinctCount(deck, field) {
  return new Set(deck.map(word => answerKey(word[field]))).size;
}
const practicedWords = new Set();
let reviewedSinceNew = 0;
function nextQuestion(practice = false, previousId) {
  const now = Date.now();
  const topic = studyTopic();
  const deck = studyDeck(topic);
  const pool = deck.filter(word => practice
    ? word.reviews && !practicedWords.has(word.id) && quality(word,now)!=='strong'
    : eligible(word,now));
  const candidates = practice || !topic ? randomize(pool) : pool;
  const priority = word => {
    if (!word.reviews) return reviewedSinceNew >= 2 ? 0 : 3;
    if (word.lastGrade === 1) return 1;
    return quality(word,now) === 'strong' ? 4 : 2;
  };
  candidates.sort((a,b)=>priority(a)-priority(b) || (topic&&!practice
    ? (a.due || 0)-(b.due || 0) || (a.createdAt || 0)-(b.createdAt || 0) : 0));
  const previousIndex = candidates.findIndex(word => word.id === previousId);
  if (previousIndex !== -1) candidates.push(...candidates.splice(previousIndex, 1));
  quiz = null;
  for (const word of candidates) {
    const reverse = settings.direction === 'vi-en' ||
      (settings.direction === 'mixed' && (word.lastDirection
        ? word.lastDirection === 'en-vi'
        : Math.random() > 0.5));
    if (studyMode === 'recall') {
      quiz = {word, reverse, done:false, practice};
    } else {
      quiz = buildQuestion(word, reverse, deck);
      if (!quiz && settings.direction === 'mixed') quiz = buildQuestion(word, !reverse, deck);
      if (quiz) quiz.practice = practice;
    }
    if (quiz) break;
  }
}
let reading = null;
let readingTopic = '';
function readingPage() {
  const topics = studyTopics();
  if (readingTopic && !topics.includes(readingTopic)) {
    readingTopic = '';
    reading = null;
  }
  const deck = studyDeck(readingTopic);
  if (!reading || !deck.some(word => word.id === reading.word.id && word.en === reading.word.en && word.vi === reading.word.vi)) {
    reading = makeReading(deck, randomize, answerKey);
  }
  const q = reading;
  content.innerHTML = `<div class="quiz-shell">
    <label class="study-topic reading-topic"><span>Chủ đề</span>
      <select id="reading-topic" class="select" ${q?.saving?'disabled':''}>
        <option value="">Tất cả chủ đề</option>
        ${topics.map(topic=>`<option value="${escapeHTML(topic)}" ${topic===readingTopic?'selected':''}>${escapeHTML(topic)}</option>`).join('')}
      </select>
    </label>
    ${q?`<article class="panel reading-passage">
      <h2>Đoạn văn</h2><p lang="en">${escapeHTML(q.passage)}</p>
      <h3 lang="en">${escapeHTML(q.prompt)}</h3>
    </article>${answerButtons(q)}
    ${q.done?`<div class="feedback ${q.selected===q.correct?'good':'bad'}">
      <strong>${q.selected===q.correct?'✓ Chính xác':'✕ Chưa đúng'}</strong>
      <p><b>Dịch câu hỏi</b> · ${escapeHTML(q.translation)}</p>
      <p><b>Đáp án</b> · ${escapeHTML(q.options[q.correct])}</p>
      <p>${escapeHTML(q.evidence)}</p>
      ${continueButton(q,'Bài đọc tiếp theo')}
    </div>`:''}`:`<div class="panel empty"><h2>Chưa đủ từ để tạo bài đọc</h2>
      <p>Cần ít nhất 4 nghĩa tiếng Việt khác nhau và 3 từ tiếng Anh khác nhau. Bạn có thể chọn tất cả chủ đề hoặc thêm từ vào kho.</p>
    </div>`}</div>`;

  $('#reading-topic').onchange = event => {
    readingTopic = event.target.value;
    reading = null;
    readingPage();
  };
  if (!q) return;
  content.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
    q.selected = Number(button.dataset.answer);
    q.done = true;
    void saveReading(q);
  });
  if ($('#retry-answer')) $('#retry-answer').onclick = () => saveReading(q);
  if ($('#continue-answer')) $('#continue-answer').onclick = () => {
    reading = makeReading(deck, randomize, answerKey, q.word.id, q.format);
    readingPage();
  };
}

async function saveReading(q) {
  if (q.saving || q.saved) return;
  q.saving = true;
  readingPage();
  try {
    await put('logs', {id:q.logId ??= uuid(), wordId:q.word.id, time:q.time ??= Date.now(),
      correct:q.selected===q.correct, mode:'reading', question:{
        passage:q.passage, prompt:q.prompt, translation:q.translation,
        answer:q.options[q.correct], selected:q.options[q.selected],
      }});
    q.saved = true;
    await refresh();
  } catch {
    if (!q.saved) toast('Không thể lưu lượt đọc. Hãy thử lưu lại.');
  } finally {
    q.saving = false;
    if (page === 'reading' && reading === q) readingPage();
    if (page === 'stats' || page === 'home') render();
  }
}

function answerButtons(q) {
  return `<div class="answers">${q.options.map((option,i)=>`<button class="answer
    ${q.done?(i===q.correct?'correct':i===q.selected?'wrong':''):''
    }" data-answer="${i}" ${q.done?'disabled':''}><span class="letter">${'ABCD'[i]}</span>
    <span>${escapeHTML(option)}</span></button>`).join('')}</div>`;
}

function continueButton(q, label) {
  if (q.saving) return '<p role="status" class="muted small-text">Đang lưu…</p>';
  return q.saved
    ? `<button class="btn small" id="continue-answer">${label}</button>`
    : '<button class="btn small" id="retry-answer">Thử lưu lại</button>';
}

function dailyReviewSummary() {
  const groups = new Map();
  for (const log of logs) {
    const date = localDate(log.time);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(log);
  }
  const days = Array.from({length:7}, (_,index) => {
    const day = dayOffset(-index);
    const attempts = groups.get(day) || [];
    const counts = attemptCounts(attempts);
    return {day,...counts,reading:attempts.filter(log=>log.mode==='reading').length};
  });
  const today = days[0];
  const mistakes = frequentMistakes(logs,words);
  return `<section class="panel review-summary">
    <h2>Kết quả luyện tập theo ngày</h2>
    <p><strong>Hôm nay: ${today.total} câu · ${today.total?pct(today.correct/today.total):'—'} đúng</strong></p>
    <div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Từ vựng</th><th>Đọc hiểu</th><th>Tổng câu</th><th>Tỷ lệ đúng</th></tr></thead>
    <tbody>${days.map(day=>`<tr><td>${formatDate(fromDay(day.day))}</td><td>${day.total-day.reading}</td><td>${day.reading}</td><td>${day.total}</td><td>${day.total?pct(day.correct/day.total):'—'}</td></tr>`).join('')}</tbody></table></div>
  </section>
  <section class="panel review-summary">
    <h2>Câu thường sai</h2>
    ${mistakes.length?mistakes.map((row,index)=>{
      const detail = row.latestWrong.question;
      const label = detail?.prompt || (row.direction==='vi-en'?row.word?.vi:row.word?.en) || 'Câu đã luyện';
      const display = row.mode==='reading' ? `${label} · ${detail?.answer || ''}` : label;
      return `<details${index>=10?' class="extra-mistake" hidden':''}><summary>
        ${escapeHTML(display)} <small>${row.wrong}/${row.total} lần sai</small>
      </summary>${detail?.passage?`<p lang="en">${escapeHTML(detail.passage)}</p>`:''}
        ${detail?.translation?`<p>${escapeHTML(detail.translation)}</p>`:''}
        ${detail?.selected?`<p>Bạn chọn: ${escapeHTML(detail.selected)}</p>`:''}
        <p>Đáp án: ${escapeHTML(detail?.answer || (row.direction==='vi-en'?row.word?.en:row.word?.vi) || '—')}</p>
      </details>`;
    }).join(''):'<p class="muted">Các câu trả lời sai sẽ xuất hiện ở đây.</p>'}
    ${mistakes.length>10?'<button class="btn small secondary" id="all-mistakes">Xem thêm câu sai</button>':''}
  </section>`;
}

function wordPage(){const cats=[...new Set(words.map(w=>w.category))].sort();let filtered=words.filter(w=>(w.en+' '+w.vi+' '+w.category).toLowerCase().includes(filter.toLowerCase())&&(categoryFilter==='all'||w.category===categoryFilter)).sort((a,b)=>a.en.localeCompare(b.en));content.innerHTML=`<div class="toolbar"><input class="input" id="search-words" placeholder="🔎 Tìm từ hoặc nghĩa..." value="${escapeHTML(filter)}"><select class="select" id="cat-filter"><option value="all">Tất cả chủ đề</option>${cats.map(c=>`<option value="${escapeHTML(c)}" ${categoryFilter===c?'selected':''}>${escapeHTML(c)}</option>`).join('')}</select><button class="btn" id="open-add">+ Thêm từ</button><button class="btn secondary" id="open-bulk">⇧ Nhập hàng loạt</button></div><div class="space-between" style="margin-bottom:16px"><span class="muted small-text">${filtered.length} / ${words.length} từ</span><span class="muted small-text">Dữ liệu lưu trên thiết bị này</span></div><div class="word-list">${filtered.length?filtered.map(w=>`<div class="word-item"><div style="min-width:0"><strong>${escapeHTML(w.en)}</strong> <span class="pill">${escapeHTML(w.category)}</span><p>${escapeHTML(w.vi)} · ${w.reviews?`Đã ôn ${w.reviews} lần`:'Chưa học'}</p>${speakerButtons(w)}</div><div class="actions"><button data-edit="${escapeHTML(w.id)}" title="Chỉnh sửa">✎</button><button data-delete="${escapeHTML(w.id)}" title="Xóa">✕</button></div></div>`).join(''):'<div class="panel empty">Chưa có từ vựng phù hợp. Hãy thêm từ mới.</div>'}</div>`;$('#search-words').oninput=e=>{filter=e.target.value;wordPage();const input=$('#search-words');input.focus();input.setSelectionRange(filter.length,filter.length)};$('#cat-filter').onchange=e=>{categoryFilter=e.target.value;wordPage()};$('#open-add').onclick=()=>wordModal();$('#open-bulk').onclick=bulkModal;document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>wordModal(words.find(w=>w.id===b.dataset.edit)));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteWord(b.dataset.delete))}
function modal(html){const el=$('#modal');el.innerHTML=`<div class="modal" role="dialog" aria-modal="true">${html}</div>`;el.hidden=false;el.onclick=e=>{if(e.target===el)closeModal()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal)}function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML=''}function wordModal(w=null){modal(`<div class="space-between"><h2>${w?'Chỉnh sửa':'Thêm'} từ vựng</h2><button class="icon-button" data-close>✕</button></div><form id="word-form"><div class="field"><label for="en">Từ tiếng Anh</label><input id="en" class="input" maxlength="120" required value="${escapeHTML(w?.en||'')}" placeholder="e.g. accomplish"></div><div class="field"><label for="vi">Nghĩa tiếng Việt</label><input id="vi" class="input" maxlength="220" required value="${escapeHTML(w?.vi||'')}" placeholder="e.g. hoàn thành"></div><div class="field"><label for="ipa">IPA (tùy chọn)</label><input id="ipa" class="input" maxlength="160" value="${escapeHTML(w?.ipa||'')}" placeholder="/əˈkɑmplɪʃ/"></div><div class="field"><label for="category">Chủ đề</label><input id="category" class="input" maxlength="70" value="${escapeHTML(w?.category||'Chung')}"></div><button class="btn full" type="submit">${w?'Lưu thay đổi':'Thêm từ vựng'}</button></form>`);$('#word-form').onsubmit=async e=>{e.preventDefault();let en=$('#en').value.trim(),vi=$('#vi').value.trim(),category=$('#category').value.trim()||'Chung';let ipa=$('#ipa').value.trim();if(!en||!vi)return;if(words.some(x=>x.id!==w?.id&&wordKey(x)===wordKey({en,vi,category}))){toast('Từ và nghĩa này đã có trong chủ đề');return}const changed=w&&(w.en!==en||w.vi!==vi);await put('words',w?{...w,en,vi,category,ipa,...(changed?{reviews:0,successes:0,lapses:0,stability:0,difficulty:5,due:0,lastReviewed:0,lastGrade:0,lastDirection:null,spacedSuccesses:0,correctStreak:0,learnAgain:false}:{})}:{...wordObject(en,vi,category),ipa});lastPronunciation=undefined;quiz=null;await refresh();closeModal();render();toast(w?'Đã cập nhật từ':'Đã thêm từ vựng')}}
async function deleteWord(id){const w=words.find(w=>w.id===id);if(!w||!confirm(`Xóa từ “${w.en}”?`))return;await remove('words',id);quiz=null;await refresh();render();toast('Đã xóa từ')}
function parseBulk(text,category){const rows=[],errors=[];for(const [i,line] of text.split(/\r?\n/).entries()){if(!line.trim())continue;const parts=line.split(/\t|\s*[;|]\s*|\s+[-–—]\s+/);if(parts.length<2||!parts[0].trim()||!parts.slice(1).join(' ').trim()){errors.push(i+1);continue}rows.push(wordObject(parts[0],parts.slice(1).join(' - '),category))}return {rows,errors}}
function bulkModal(){modal(`<div class="space-between"><h2>Nhập từ vựng hàng loạt</h2><button class="icon-button" data-close>✕</button></div><p class="muted small-text">Mỗi dòng một từ, dùng dấu <b>;</b>, dấu <b>|</b>, tab hoặc <b> - </b> giữa từ và nghĩa.</p><form id="bulk-form"><div class="field"><label for="bulk-cat">Chủ đề</label><input id="bulk-cat" class="input" placeholder="Ví dụ: IELTS" value="Chung"></div><div class="field"><label for="bulk-text">Danh sách từ vựng</label><textarea id="bulk-text" class="textarea" required placeholder="maintain; duy trì&#10;achieve; đạt được&#10;improve; cải thiện&#10;benefit; lợi ích"></textarea></div><button class="btn full" type="submit">Nhập danh sách</button></form>`);$('#bulk-form').onsubmit=async e=>{e.preventDefault();const {rows,errors}=parseBulk($('#bulk-text').value,$('#bulk-cat').value.trim()||'Chung');const present=new Set(words.map(wordKey));let added=0,duplicate=0;for(const w of rows){const key=wordKey(w);if(present.has(key)){duplicate++;continue}await put('words',w);present.add(key);added++}quiz=null;await refresh();closeModal();render();toast(`Đã nhập ${added} từ; trùng ${duplicate}; sai định dạng ${errors.length}`)}}
function chartSVG(points){const w=650,h=220,pad=30,ys=points.map(p=>p.value),max=100;const coords=points.map((p,i)=>[pad+i*(w-2*pad)/Math.max(1,points.length-1),h-pad-p.value/max*(h-2*pad)]);return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ tỷ lệ trả lời đúng 7 ngày"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="chart-grid"/><line x1="${pad}" y1="${pad}" x2="${w-pad}" y2="${pad}" class="chart-grid"/><line x1="${pad}" y1="${(h)/2}" x2="${w-pad}" y2="${h/2}" class="chart-grid"/><text x="0" y="${pad+4}" class="chart-label">100%</text><text x="0" y="${h-pad+4}" class="chart-label">0%</text>${coords.length>1?`<polyline class="chart-line" points="${coords.map(p=>p.join(',')).join(' ')}"/>`:''}${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4" class="chart-dot"/><text x="${x}" y="${h-7}" text-anchor="middle" class="chart-label">${points[i].label}</text>`).join('')}</svg>`}
function statsPage(){const s=stats(),counts={strong:0,medium:0,weak:0,new:0};words.forEach(w=>counts[quality(w)]++);const points=Array.from({length:7},(_,i)=>{const day=dayOffset(i-6),ls=logs.filter(l=>l.mode!=='recall'&&l.mode!=='reading'&&localDate(l.time)===day);return {label:new Date(fromDay(day)).toLocaleDateString('vi-VN',{weekday:'short'}),value:ls.length?Math.round(ls.filter(l=>l.correct).length/ls.length*100):0,n:ls.length}});const upcoming=Array.from({length:7},(_,i)=>{const day=dayOffset(i),n=words.filter(w=>w.reviews&&localDate(w.due)===day).length;return {day,n}});content.innerHTML=`${dailyReviewSummary()}<div class="grid"><div class="panel"><div class="stat-caption">TỪ ĐÃ HỌC</div><div class="stat-value">${s.reviewed}</div><div class="stat-foot">trên ${words.length} từ</div></div><div class="panel"><div class="stat-caption">TRẮC NGHIỆM ĐÚNG</div><div class="stat-value">${pct(s.accuracy)}</div><div class="stat-foot">${s.answered} câu trắc nghiệm</div></div><div class="panel"><div class="stat-caption">KHẢ NĂNG NHỚ DỰ ĐOÁN</div><div class="stat-value">${pct(s.ret)}</div><div class="stat-foot">ước tính từ mô hình DSR</div></div></div><div class="grid two" style="margin-top:18px"><div class="panel"><h3>📈 Tỷ lệ trả lời đúng · 7 ngày</h3><p class="chart-caption">Ngày không luyện tập được hiển thị ở mức 0%, không tính vào tỷ lệ tổng.</p>${chartSVG(points)}</div><div class="panel"><h3>🧠 Phân loại mức độ ghi nhớ</h3><p class="muted small-text">${s.recallCount ? `Tự nhớ đúng ${pct(s.recallRate)} qua ${s.recallCount} lượt.` : 'Kết quả Tự nhớ sẽ hiện sau lượt đầu tiên.'}</p><div class="bar-list" style="margin-top:25px">${[['strong','Ghi nhớ tốt','#54d6ad'],['medium','Đang củng cố','#83a3ff'],['weak','Dễ quên','#fa9f70'],['new','Chưa học','#7686a3']].map(([k,t,c])=>`<div class="bar-row"><div><span>${t}</span><strong>${counts[k]}</strong></div><div class="bar-fill"><span style="width:${words.length?100*counts[k]/words.length:0}%;background:${c}"></span></div></div>`).join('')}</div></div></div><div class="section-head"><h2>📅 Lịch ôn 7 ngày tới</h2></div><div class="panel"><div class="schedule-list">${upcoming.map(x=>`<div class="schedule-item"><span class="muted small-text">${formatDate(fromDay(x.day))}</span><strong>${x.n} từ</strong></div>`).join('')}</div><p class="footer-note">Từ quá hạn được tính trong số “Cần ôn hôm nay” ở trang tổng quan.</p></div><p class="footer-note">Chỉ số “khả năng nhớ” là xác suất ước tính theo mô hình, không phải kết quả kiểm tra trí nhớ lâm sàng. Mô hình cần nhiều lượt ôn để phản ánh tốt hơn khả năng ghi nhớ.</p>`;
const more = $('#all-mistakes');
if (more) more.onclick = () => {
  content.querySelectorAll('.extra-mistake').forEach(row => {row.hidden = false});
  more.remove();
};
}
function settingsPage(){content.innerHTML=`<div class="grid two"><div class="panel"><h3>⚙ Tùy chọn học tập</h3><div class="field"><label for="direction">Chiều câu hỏi</label><select class="select" id="direction"><option value="mixed" ${settings.direction==='mixed'?'selected':''}>Kết hợp hai chiều</option><option value="en-vi" ${settings.direction==='en-vi'?'selected':''}>Anh → Việt</option><option value="vi-en" ${settings.direction==='vi-en'?'selected':''}>Việt → Anh</option></select></div><div class="field"><label for="daily-goal">Mục tiêu từ mỗi ngày</label><input type="number" id="daily-goal" min="1" max="500" class="input" value="${settings.dailyGoal}"></div><button class="btn" id="save-settings">Lưu tùy chọn</button></div><div class="panel"><h3>🛡 Sao lưu và khôi phục</h3><p class="muted small-text">Dữ liệu chỉ lưu trên thiết bị hiện tại. Hãy xuất bản sao lưu định kỳ để tránh mất dữ liệu nếu xóa trình duyệt hoặc đổi máy. Gộp JSON thêm từ và lịch sử từ tệp vào kho hiện tại.</p><div class="split"><button class="btn secondary" id="export-data">⬇ Xuất JSON</button><button class="btn secondary" id="import-data">⬆ Gộp JSON</button><button class="btn ghost small" id="restore-data">Khôi phục thay thế</button><input id="file-input" type="file" accept="application/json,.json" hidden></div></div><div class="panel"><h3>📱 Cài trên điện thoại</h3><p class="muted small-text">iPhone: mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Android: Chrome → Cài đặt ứng dụng / Thêm vào màn hình chính. Cần HTTPS để cài đặt và chạy offline qua Service Worker.</p><p class="footer-note">Khi cập nhật mã nguồn cùng địa chỉ web, dữ liệu IndexedDB được giữ lại nếu không xóa dữ liệu trang web.</p></div><div class="panel"><h3>ℹ Thuật toán</h3><p class="muted small-text">ĐK.Language tự lên lịch sau mỗi đáp án. Từ sai đến hạn lại sau 2 phút. Chuỗi trả lời đúng cách ngày giãn dần lịch ôn. Chế độ Tự nhớ cho bạn tự kiểm tra đúng hoặc sai sau khi lật thẻ.</p><p class="footer-note">Chọn tốc độ 0,5×–1,5×. Bấm Nghe để hiện IPA Anh–Mỹ. Để nghe offline, thiết bị cần có giọng English (United States) dùng được ngoại tuyến.</p><button class="btn danger small" id="reset-data">Xóa toàn bộ dữ liệu</button></div></div>`;$('#save-settings').onclick=async()=>{const g=Number($('#daily-goal').value);if(!Number.isInteger(g)||g<1||g>500){toast('Mục tiêu phải từ 1 đến 500');return}const direction=$('#direction').value;await write('settings',tx=>{const store=tx.objectStore('settings');store.put({key:'dailyGoal',value:g});store.put({key:'direction',value:direction})});settings={...settings,dailyGoal:g,direction};quiz=null;toast('Đã lưu thiết lập')};$('#export-data').onclick=exportData;const fileInput=$('#file-input');$('#import-data').onclick=()=>{fileInput.dataset.replace='false';fileInput.click()};$('#restore-data').onclick=()=>{fileInput.dataset.replace='true';fileInput.click()};fileInput.onchange=importData;$('#reset-data').onclick=async()=>{if(!confirm('Bạn chắc chắn muốn XÓA tất cả từ vựng và lịch sử? Hành động không thể hoàn tác.'))return;if(!confirm('Xác nhận lần cuối: xóa dữ liệu vĩnh viễn?'))return;await replaceData([], [], Object.entries(settings).map(([key,value])=>({key,value})));quiz=null;await refresh();render();toast('Đã xóa toàn bộ dữ liệu')}}
function exportData(){const data={format:'lexiflow-backup',version:1,exportedAt:new Date().toISOString(),words,logs,settings};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dk-language-backup-${localDate()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Đã xuất file sao lưu')}
function mergeBackup(currentWords, currentLogs, backup) {
  const keys = new Map(currentWords.map(word => [wordKey(word),word]));
  const wordIds = new Set(currentWords.map(word => word.id));
  const remappedIds = new Map();
  const changedWords = new Map();
  let addedWords = 0;

  for (const incoming of backup.words) {
    const key = wordKey(incoming);
    const existing = keys.get(key);
    if (!existing) {
      const id = wordIds.has(incoming.id) ? uuid() : incoming.id;
      const word = {...incoming,id};
      wordIds.add(id);
      keys.set(key,word);
      remappedIds.set(incoming.id,id);
      changedWords.set(id,word);
      addedWords++;
      continue;
    }
    remappedIds.set(incoming.id,existing.id);
    const useIncoming = (incoming.lastReviewed || 0) > (existing.lastReviewed || 0);
    const ipa = existing.ipa || incoming.ipa;
    if (useIncoming || ipa !== existing.ipa) {
      const word = {...existing,...(useIncoming?incoming:{}),
        id:existing.id,en:existing.en,vi:existing.vi,category:existing.category,ipa};
      keys.set(key,word);
      changedWords.set(word.id,word);
    }
  }

  const logIds = new Set(currentLogs.map(log => log.id));
  const logKey = log => JSON.stringify([log.wordId,log.time,log.correct,log.grade,log.direction,
    log.mode === 'reading'?'reading':log.mode === 'recall'?'recall':'choice',Boolean(log.practice),log.mode==='reading'?log.question?.prompt:null]);
  const events = new Set(currentLogs.map(logKey));
  const addedLogs = [];
  for (const log of backup.logs) {
    const wordId = remappedIds.get(log.wordId);
    if (!wordId && log.mode !== 'reading') continue;
    const entry = {...log,wordId:wordId || log.wordId};
    const key = logKey(entry);
    if (events.has(key)) continue;
    if (logIds.has(entry.id)) entry.id = uuid();
    logIds.add(entry.id);
    events.add(key);
    addedLogs.push(entry);
  }
  return {changedWords, addedLogs, addedWords};
}

async function mergeData(backup) {
  let result;
  await write(['words','logs'], tx => {
    const wordStore = tx.objectStore('words');
    const logStore = tx.objectStore('logs');
    const existingWords = wordStore.getAll();
    const existingLogs = logStore.getAll();
    existingLogs.onsuccess = () => {
      result = mergeBackup(existingWords.result, existingLogs.result, backup);
      for (const word of result.changedWords.values()) wordStore.put(word);
      for (const log of result.addedLogs) logStore.add(log);
    };
  });
  return result;
}
function backupSettings(obj) {
  const restored = [];
  if (['mixed','en-vi','vi-en'].includes(obj.settings?.direction)) {
    restored.push({key:'direction',value:obj.settings.direction});
  }
  if (Number.isInteger(obj.settings?.dailyGoal) && obj.settings.dailyGoal >= 1 && obj.settings.dailyGoal <= 500) {
    restored.push({key:'dailyGoal',value:obj.settings.dailyGoal});
  }
  if (typeof obj.settings?.studyTopic === 'string' && obj.words.some(word => word.category === obj.settings.studyTopic)) {
    restored.push({key:'studyTopic',value:obj.settings.studyTopic});
  }
  if (speechRates.includes(String(obj.settings?.speechRate))) {
    restored.push({key:'speechRate',value:Number(obj.settings.speechRate)});
  }
  return restored;
}

async function importData(e) {
  const input = e.target;
  const file = input.files?.[0];
  if (!file) return;
  const replace = input.dataset.replace === 'true';
  input.disabled = true;
  try {
    if (file.size > 15*1024*1024) throw Error('File quá lớn (tối đa 15MB)');
    const obj = JSON.parse(await file.text());
    if (obj?.format !== 'lexiflow-backup' || obj.version !== 1 || !Array.isArray(obj.words) || !Array.isArray(obj.logs)) {
      throw Error('Không đúng định dạng bản sao lưu ĐK.Language');
    }
    if (obj.words.length > 100000 || obj.logs.length > 1000000) throw Error('Dữ liệu vượt giới hạn');
    const validWord = word => word && typeof word.id==='string' && word.id &&
      typeof word.en==='string' && word.en.trim() && typeof word.vi==='string' && word.vi.trim() &&
      typeof word.category==='string' && Number.isFinite(word.reviews) && Number.isFinite(word.due);
    const validLog = log => log && typeof log.id==='string' && log.id &&
      typeof log.wordId==='string' && Number.isFinite(log.time) && typeof log.correct==='boolean';
    if (!obj.words.every(validWord) || !obj.logs.every(validLog) ||
        new Set(obj.words.map(word=>word.id)).size !== obj.words.length ||
        new Set(obj.logs.map(log=>log.id)).size !== obj.logs.length) {
      throw Error('Cấu trúc dữ liệu không hợp lệ');
    }

    let message;
    if (replace) {
      if (!confirm(`Thay thế kho hiện tại bằng ${obj.words.length} từ và ${obj.logs.length} lượt học? Hãy xuất sao lưu trước nếu cần.`)) return;
      await replaceData(obj.words,obj.logs,backupSettings(obj));
      message = `Đã khôi phục ${obj.words.length} từ`;
    } else {
      const result = await mergeData(obj);
      const matched = obj.words.length - result.addedWords;
      message = `Đã thêm ${result.addedWords} từ và ${result.addedLogs.length} lượt học. Đã đối chiếu ${matched} mục trùng.`;
    }
    lastPronunciation = undefined;
    reading = null;
    practicedWords.clear();
    quiz = null;
    await refresh();
    render();
    toast(message);
  } catch (err) {
    toast('Không thể nhập: '+err.message);
  } finally {
    input.value = '';
    input.disabled = false;
  }
}
async function init(){try{db=await openDB();await refresh();bindSpeech();$('#date-label').textContent=new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());document.querySelectorAll('[data-page]').forEach(el=>el.onclick=()=>setPage(el.dataset.page));window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();beforeInstall=e;$('#install-btn').hidden=false});$('#install-btn').onclick=async()=>{if(beforeInstall){await beforeInstall.prompt();beforeInstall=null;$('#install-btn').hidden=true}};if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('#offline-status').lastChild.textContent=' Sẵn sàng học offline'}).catch(err=>console.warn('SW:',err));setPage('home')}catch(e){console.error(e);content.innerHTML=`<div class="panel empty"><h2>Không mở được dữ liệu offline</h2><p>Vui lòng mở ứng dụng qua HTTPS hoặc localhost và bật quyền lưu trữ của trình duyệt.</p><p class="muted small-text">${escapeHTML(e.message)}</p></div>`}}init();
