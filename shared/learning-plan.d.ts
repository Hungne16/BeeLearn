import type {Deck,LearningRecord,Vocabulary} from '../src/model.js';
export function schedule(old:LearningRecord|undefined,good:boolean,now?:number):LearningRecord;
export interface PlanLesson{id:string;title:string;level:string;assignmentPath?:string;exerciseCounts:{quiz:number};progressStatus?:string;progress?:{lastAt:number;completedAt?:number|null}}
export interface LearningPlan{cards:(Vocabulary&{deckId:string;deckName:string})[];reviewCount:number;newCount:number;grammar:{id:string;title:string;level:string;questionCount:number}|null}
export function chooseLearningPlan(decks:Deck[],records:Record<string,LearningRecord>,lessons:PlanLesson[],now?:number):LearningPlan;
