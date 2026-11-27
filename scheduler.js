export const DAY = 86400000;
const MINUTE = DAY / 1440;
const TARGET_RECALL = 0.9;

export const grades = [
  {id:1, label:'Quên', hint:'Không tự nhớ được'},
  {id:2, label:'Khó', hint:'Nhớ đúng nhưng mất nhiều công sức'},
  {id:3, label:'Nhớ', hint:'Tự nhớ đúng'},
  {id:4, label:'Dễ', hint:'Tự nhớ đúng ngay'},
];

function elapsedDays(word, now) {
  return Math.max(0, (now - (word.lastReviewed ?? now)) / DAY);
}

export function retrievability(word, now = Date.now()) {
  if (!word.reviews) return 0;
  return 1 / (1 + elapsedDays(word, now) / (9 * Math.max(0.1, word.stability || 1)));
}

export function schedule(word, grade, now = Date.now()) {
  if (!grades.some(option => option.id === grade)) throw Error('Điểm không hợp lệ');
  const reviews = word.reviews || 0;
  const elapsed = elapsedDays(word, now);
  const predicted = retrievability(word, now);
  const difficulty = Math.min(10, Math.max(1, (word.difficulty ?? 5) + [0, 1, .4, -.2, -.65][grade]));
  let stability = word.stability || 1;
  if (!reviews) {
    stability = [0, .1, .4, 1, 3][grade];
  } else if (grade === 1) {
    stability = Math.max(.1, stability * (.4 + (1 - predicted) * .25));
  } else if (elapsed >= .75) {
    const growth = [0, 0, .6, 1.5, 2.4][grade] * (11 - difficulty) / 9;
    stability = Math.min(365, stability * (1 + growth * Math.max(.2, 1 - predicted + .15)));
  }

  const learning = !reviews || word.learnAgain === true ||
    (word.learnAgain === undefined && word.lastGrade === 1);
  const targetDays = 9 * stability * (1 / TARGET_RECALL - 1);
  let delay;
  if (grade === 1) {
    delay = 2 * MINUTE;
  } else if (grade === 2 && learning) {
    delay = 10 * MINUTE;
  } else {
    const multiplier = grade === 2 ? .7 : grade === 4 ? 1.3 : 1;
    delay = Math.round(Math.max(1, Math.min(365, targetDays * multiplier)) * DAY);
  }
  const spacedSuccesses = (word.spacedSuccesses ?? Math.min(word.successes || 0, 2)) +
    Number(grade >= 3 && reviews > 0 && elapsed >= .75);

  return {...word, difficulty, stability, interval:delay / DAY, due:now + delay,
    lastReviewed:now, reviews:reviews + 1, lapses:(word.lapses || 0) + Number(grade === 1),
    successes:(word.successes || 0) + Number(grade >= 3), lastGrade:grade,
    spacedSuccesses, learnAgain:grade === 1 || (grade === 2 && learning)};
}

export function quality(word, now = Date.now()) {
  if (!word.reviews) return 'new';
  const probability = retrievability(word, now);
  if (word.lastGrade === 1 || probability < .65) return 'weak';
  const spacedSuccesses = word.spacedSuccesses ?? Math.min(word.successes || 0, 2);
  return probability >= .85 && spacedSuccesses >= 2 ? 'strong' : 'medium';
}

export function eligible(word, now = Date.now()) {
  return !word.reviews || word.due <= now;
}

export function scheduleAnswer(word, correct, now = Date.now()) {
  const updated = schedule(word, correct ? 3 : 1, now);
  const priorStreak = word.correctStreak ?? (
    word.lastGrade >= 3 ? Math.min(2, word.spacedSuccesses ?? word.successes ?? 0) : 0
  );
  const correctStreak = correct ? priorStreak + Number(!word.reviews ||
    elapsedDays(word, now) >= .75 || word.lastGrade === 1) : 0;
  const interval = correct ? Math.max(updated.interval,
    [1, 1, 3, 7, 14, 30, 60][Math.min(correctStreak, 6)]) : updated.interval;
  return {...updated, correctStreak, interval, due:correct ? now + interval * DAY : updated.due};
}
