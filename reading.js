const formats = [
  {
    passage: ([a,b,c]) => `A student is putting together a glossary for a short study group. First, the group looks up “${a}” and writes it at the top of the page. The group then discusses “${b}” as a second example. Before leaving, the students agree to look up “${c}” at their next meeting.`,
    prompt: 'What is the Vietnamese meaning of the term the group plans to look up at its next meeting?',
    translation: 'Nghĩa tiếng Việt của thuật ngữ mà nhóm dự định tra ở buổi gặp tiếp theo là gì?',
    target: 2,
    evidence: 'Ở cuối đoạn, nhóm hẹn tra thuật ngữ này ở buổi gặp tiếp theo.',
  },
  {
    passage: ([a,b,c]) => `A tutor adds three terms to a review sheet: “${a}”, “${b}”, and “${c}”. The learners can already explain the first term and the last term. They are less confident about the term in the middle, so the tutor asks everyone to focus on that term before taking the quiz.`,
    prompt: 'What is the Vietnamese meaning of the term the tutor asks everyone to focus on?',
    translation: 'Nghĩa tiếng Việt của thuật ngữ mà gia sư yêu cầu cả nhóm tập trung ôn là gì?',
    target: 1,
    evidence: 'Gia sư yêu cầu ôn thuật ngữ đứng giữa trong danh sách ba thuật ngữ.',
  },
  {
    passage: ([a,b,c]) => `A student has time to check only one term before class. “${b}” and “${c}” are already in the student's notes, so the student leaves them for later. Instead, the student opens a dictionary to look up “${a}” and adds a short definition to the notes.`,
    prompt: 'What is the Vietnamese meaning of the term the student looks up before class?',
    translation: 'Nghĩa tiếng Việt của thuật ngữ mà sinh viên tra trước giờ học là gì?',
    target: 0,
    evidence: 'Sinh viên hoãn hai thuật ngữ đã có trong vở và tra thuật ngữ còn lại.',
  },
];

export function makeReading(deck, shuffle, normalize, previousWordId, previousFormat) {
  const distinct = new Map();
  for (const word of shuffle(deck)) {
    const meaning = normalize(word.vi);
    if (meaning && !distinct.has(meaning)) distinct.set(meaning, word);
  }
  const candidates = [...distinct.values()];
  if (candidates.length < 4) return null;
  const index = shuffle(formats.map((_, i) => i).filter(i => i !== previousFormat))[0];
  const format = formats[index];
  const focus = candidates.find(word => word.id !== previousWordId) || candidates[0];
  const other = shuffle(deck).filter(word => normalize(word.en) !== normalize(focus.en));
  const terms = [...new Map(other.map(word => [normalize(word.en), word])).values()].slice(0, 2);
  if (terms.length < 2) return null;
  terms.splice(format.target, 0, focus);
  const options = shuffle([focus.vi, ...candidates.filter(word => word !== focus).slice(0, 3).map(word => word.vi)]);
  const passage = format.passage(terms.map(word => word.en));
  return {word:focus, passage, options, correct:options.indexOf(focus.vi), format:index,
    prompt:format.prompt, translation:format.translation, evidence:format.evidence};
}

export function attemptCounts(attempts) {
  return {total:attempts.length, correct:attempts.filter(log=>log.correct===true).length};
}

export function frequentMistakes(logs, words) {
  const names = new Map(words.map(word => [word.id,word]));
  const rows = new Map();
  for (const log of logs) {
    const word = names.get(log.wordId);
    if (!word && !log.question) continue;
    const key = JSON.stringify([log.wordId,log.mode==='reading'?'reading':'vocab',
      log.mode==='reading'?log.question?.prompt:log.direction]);
    const row = rows.get(key) || {word, mode:log.mode, direction:log.direction,total:0,wrong:0,latestWrong:null};
    row.total++;
    if (!log.correct) {
      row.wrong++;
      if (!row.latestWrong || log.time >= row.latestWrong.time) row.latestWrong = log;
    }
    rows.set(key,row);
  }
  return [...rows.values()].filter(row=>row.wrong)
    .sort((a,b)=>b.wrong-a.wrong || b.wrong/b.total-a.wrong/a.total ||
      b.latestWrong.time-a.latestWrong.time);
}
