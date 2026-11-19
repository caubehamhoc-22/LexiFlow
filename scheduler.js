// Adaptive DSR scheduler inspired by spaced repetition research.
// Not a reference implementation of FSRS; uses stability, difficulty, retrievability.
export const DAY=86400000;
export const grades=[{id:1,label:'Quên',hint:'Ôn sớm'},{id:2,label:'Khó',hint:'Nhớ rất khó'},{id:3,label:'Nhớ',hint:'Nhớ được'},{id:4,label:'Dễ',hint:'Nhớ ngay'}];
export function retrievability(word,now=Date.now()){if(!word.reviews)return 0;const elapsed=Math.max(0,(now-(word.lastReviewed||now))/DAY);return Math.pow(1+elapsed/(9*Math.max(.12,word.stability||1)),-1)}
export function schedule(word,grade,now=Date.now()){
 if(![1,2,3,4].includes(grade))throw new Error('Điểm không hợp lệ');
 const previous=word.reviews||0;
 let difficulty=word.difficulty??5,stability=word.stability||1;
 const r=previous?retrievability(word,now):0;
 difficulty=Math.max(1,Math.min(10,difficulty+({1:1.0,2:.45,3:-.2,4:-.6}[grade])));
 if(!previous){stability=({1:.1,2:.5,3:1.5,4:3.5}[grade]);}
 else if(grade===1){stability=Math.max(.10,stability*(.35+.3*(1-r)));}
 else {const factor=1+({2:.3,3:1.0,4:1.65}[grade])*(11-difficulty)/9*Math.max(.25,1-r+.25);stability=Math.max(.15,stability*factor)}
 const interval=grade===1?10/1440:grade===2?Math.max(.5,stability*.65):Math.max(1,stability*(grade===4?1.3:1));
 return {...word,difficulty,stability,interval,lastReviewed:now,due:now+interval*DAY,reviews:previous+1,lapses:(word.lapses||0)+(grade===1?1:0),successes:(word.successes||0)+(grade>=3?1:0),lastGrade:grade};
}
export function quality(word,now=Date.now()){if(!word.reviews)return 'new';const p=retrievability(word,now);return p>=.85&&word.reviews>=2?'strong':p>=.65?'medium':'weak'}
export function eligible(word,now=Date.now()){return !word.reviews||word.due<=now}
