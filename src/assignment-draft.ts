export type AssignmentKind='vocabulary'|'grammar'|'mixed';
export const assignmentLabels={flashcard:'Học thẻ',memory:'Lật thẻ bắt nghĩa',shooter:'Bắn từ vựng',grammarLesson:'Đọc bài ngữ pháp',grammarQuiz:'Luyện ngữ pháp',sentenceBuilder:'Xếp câu',grammarDetective:'Thám tử ngữ pháp'};
export type AssignmentTask=keyof typeof assignmentLabels;
export interface LessonChoice{id:string;title:string;exerciseCounts:{quiz:number;builder:number;detective:number}}
export function availableTasks(kind:AssignmentKind,lesson?:LessonChoice):AssignmentTask[]{return [...(kind!=='grammar'?['flashcard','memory','shooter'] as AssignmentTask[]:[]),...(kind!=='vocabulary'&&lesson?(['grammarLesson',...(lesson.exerciseCounts.quiz?['grammarQuiz']:[]),...(lesson.exerciseCounts.builder?['sentenceBuilder']:[]),...(lesson.exerciseCounts.detective?['grammarDetective']:[])] as AssignmentTask[]):[])]}
export function recommendedTasks(kind:AssignmentKind,lesson?:LessonChoice):AssignmentTask[]{return availableTasks(kind,lesson).filter(k=>['flashcard','memory','grammarLesson','grammarQuiz'].includes(k))}
export function suggestedTitle(kind:AssignmentKind,deckName='',lessonTitle=''){return ('Luyện tập · '+[kind!=='grammar'?deckName:'',kind!=='vocabulary'?lessonTitle:''].filter(Boolean).join(' + ')).slice(0,150)}
export function dueInDays(days:number,now=new Date()){const date=new Date(now);date.setDate(date.getDate()+days);date.setHours(20,0,0,0);return date}
export function localDateTime(date:Date){const local=new Date(date);local.setMinutes(local.getMinutes()-local.getTimezoneOffset());return local.toISOString().slice(0,16)}
export interface AssignmentDraft{kind:AssignmentKind;deckId:string;lessonId:string;title:string;description:string;activities:AssignmentTask[];deadline:number;startAt:number;minAccuracy:number;maxAttempts:number;gameSize:number;requireRemembered:boolean;audience:'all'|'individual';targets:string[]}
export function assignmentInput(draft:AssignmentDraft,context:{classId:string;requestId:string;decks:{id:string;name:string}[];lessons:LessonChoice[];review?:{deckId:string;ids:string[];assignmentId:string}},now=Date.now()){
 const deck=context.decks.find(d=>d.id===draft.deckId),lesson=context.lessons.find(l=>l.id===draft.lessonId);
 if(draft.kind!=='grammar'&&!deck)throw Error('Chọn bộ từ muốn giao nhé.');
 if(draft.kind!=='vocabulary'&&!lesson)throw Error('Chọn bài ngữ pháp muốn giao nhé.');
 const allowed=availableTasks(draft.kind,lesson);const activities=[...new Set(draft.activities.filter(a=>allowed.includes(a)))];
 if(!activities.length)throw Error('Chọn ít nhất một hoạt động học.');
 if(draft.kind==='mixed'&&(!activities.some(a=>['flashcard','memory','shooter'].includes(a))||!activities.some(a=>!['flashcard','memory','shooter'].includes(a))))throw Error('Bài kết hợp cần có hoạt động từ vựng và ngữ pháp.');
 if(!draft.title.trim()||draft.title.trim().length>150)throw Error('Tên bài tập cần từ 1 đến 150 ký tự.');
 if(!Number.isFinite(draft.deadline)||draft.deadline<=now)throw Error('Chọn hạn nộp sau thời điểm hiện tại nhé.');
 if(!Number.isFinite(draft.startAt)||draft.startAt>=draft.deadline)throw Error('Giờ bắt đầu phải trước hạn nộp.');
 if(!Number.isInteger(draft.minAccuracy)||draft.minAccuracy<0||draft.minAccuracy>100)throw Error('Độ chính xác cần từ 0 đến 100%.');
 if(!Number.isInteger(draft.maxAttempts)||draft.maxAttempts<0||draft.maxAttempts>100)throw Error('Số lượt làm cần từ 0 đến 100.');
 if(![8,12,20].includes(draft.gameSize))throw Error('Chọn 8, 12 hoặc 20 từ mỗi lượt chơi.');
 if(draft.audience==='individual'&&!draft.targets.length)throw Error('Chọn học sinh nhận bài, hoặc chuyển về cả lớp.');
 return {classId:context.classId,requestId:context.requestId,title:draft.title.trim(),description:draft.description,deckId:draft.kind==='grammar'?'':draft.deckId,grammarLessonId:draft.kind==='vocabulary'?'':draft.lessonId,activities,deadline:draft.deadline,startAt:draft.startAt,minAccuracy:draft.minAccuracy,maxAttempts:draft.maxAttempts,gameSize:draft.gameSize,requireRemembered:draft.kind!=='grammar'&&draft.requireRemembered,targets:draft.audience==='individual'?[...new Set(draft.targets)]:null,...(context.review&&draft.kind!=='grammar'&&draft.deckId===context.review.deckId?{reviewWordIds:context.review.ids,reviewSourceAssignmentId:context.review.assignmentId}:{})};
}
