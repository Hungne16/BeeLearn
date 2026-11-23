import {unzipSync,strFromU8} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import type {Vocabulary} from './model.js';
export const importFields=['word','meaning','pos','ipa','example','translation','topic','language','related','acceptedMeanings','synonyms'] as const;
export type ImportField=typeof importFields[number];
export const importLabels:Record<ImportField,string>={word:'Từ vựng',meaning:'Nghĩa',pos:'Loại từ',ipa:'Phiên âm',example:'Ví dụ',translation:'Dịch ví dụ',topic:'Chủ đề',language:'Ngôn ngữ',related:'Từ liên quan',acceptedMeanings:'Nghĩa tương đương',synonyms:'Từ đồng nghĩa'};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases:Record<ImportField,string[]>={word:['word','vocabulary','english','tuvung','tumoi','tu','term'],meaning:['meaning','definition','vietnamese','nghia','nghiatiengviet','dinhnghia','tiengviet'],pos:['pos','partofspeech','loaitu','tuloai'],ipa:['ipa','pronunciation','phienam'],example:['example','sentence','cauvidu','vidu'],translation:['translation','dichcauvidu','dichvidu','dichcau'],topic:['topic','category','chude'],language:['language','ngonngu'],related:['related','relatedwords','tulienquan'],acceptedMeanings:['acceptedmeanings','nghiatuongduong'],synonyms:['synonyms','tudongnghia']};
export function parseDelimited(text:string,delimiter?:string):string[][]{
 text=text.replace(/^\uFEFF/,'');if(text.length>2000000)throw Error('Bảng quá lớn. Hãy chia thành các phần nhỏ hơn.');
 delimiter??=text.split(/\r?\n/).slice(0,5).some(s=>s.includes('\t'))?'\t':((text.split(/\r?\n/)[0].match(/;/g)?.length??0)>(text.split(/\r?\n/)[0].match(/,/g)?.length??0)?';':',');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted||!cell)quoted=!quoted;else cell+=c}else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('Có ô chưa đóng dấu ngoặc kép. Hãy kiểm tra lại bảng.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length>2001)throw Error('Tối đa 2.000 dòng trong một bảng. Hãy tách file nhỏ hơn.');return rows;
}
export function detectColumns(rows:string[][]){const first=rows[0]??[],mapping:Partial<Record<ImportField,number>>={};for(const key of importFields){const index=first.findIndex(s=>aliases[key].includes(normalize(s)));if(index>=0)mapping[key]=index}const header=Object.keys(mapping).length>=2;if(!header){mapping.word=0;mapping.meaning=1}return {mapping,header};}
export interface ImportRow{line:number;values:Record<ImportField,string>;error:string;duplicate:boolean}
export function reviewImport(rows:string[][],mapping:Partial<Record<ImportField,number>>,header:boolean,existing:Vocabulary[]=[]):ImportRow[]{
 if(mapping.word===undefined||mapping.meaning===undefined||mapping.word===mapping.meaning)throw Error('Chọn hai cột khác nhau cho Từ vựng và Nghĩa.');
 const seen=new Set(existing.map(c=>c.word.normalize('NFC').trim().toLocaleLowerCase()));return rows.slice(header?1:0).map((row,i)=>{const values=Object.fromEntries(importFields.map(k=>[k,(row[mapping[k]??-1]??'').trim()])) as Record<ImportField,string>;values.language||='en-US';let error=!values.word?'Thiếu từ vựng':!values.meaning?'Thiếu nghĩa':'';if(importFields.some(k=>values[k].length>(['example','translation'].includes(k)?2000:500)))error='Nội dung trong ô quá dài';const key=values.word.normalize('NFC').trim().toLocaleLowerCase(),duplicate=!!values.word&&seen.has(key);if(!error&&!duplicate)seen.add(key);return {line:i+(header?2:1),values,error,duplicate}});
}
export function acceptedImport(rows:ImportRow[]){return rows.filter(r=>!r.error&&!r.duplicate).map(r=>{const {acceptedMeanings,synonyms,...values}=r.values;return {id:crypto.randomUUID(),...values,...(acceptedMeanings?{acceptedMeanings:acceptedMeanings.split('|').map(v=>v.trim()).filter(Boolean)}:{}),...(synonyms?{synonyms:synonyms.split('|').map(v=>v.trim()).filter(Boolean)}:{})} satisfies Vocabulary});}
const array=(v:any):any[]=>v===undefined?[]:Array.isArray(v)?v:[v];
const text=(v:any):string=>typeof v==='object'&&v!==null?String(v['#text']??''):String(v??'');
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,parseAttributeValue:false,trimValues:false,alwaysCreateTextNode:true});
function xml(value:Uint8Array|undefined){if(!value)throw Error('File Excel thiếu dữ liệu cần thiết.');const body=strFromU8(value);if(/<!DOCTYPE|<!ENTITY/i.test(body)||XMLValidator.validate(body)!==true)throw Error('Cấu trúc Excel không hợp lệ.');return parser.parse(body)}
function rich(v:any){return v?.t!==undefined?text(v.t):array(v?.r).map(r=>text(r.t)).join('')}
function col(reference:string){let n=0;for(const c of reference.replace(/[0-9]/g,''))n=n*26+c.charCodeAt(0)-64;return n-1}
export interface WorkbookTable{name:string;rows:string[][];warnings:string[]}
export function readXlsx(data:Uint8Array):WorkbookTable[]{
 if(data.byteLength>8*1024*1024)throw Error('File Excel tối đa 8 MB.');let size=0,count=0;let files:ReturnType<typeof unzipSync>;
 try{files=unzipSync(data,{filter:f=>{if(++count>2000)throw Error('File có quá nhiều thành phần.');const use=/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name);if(use){size+=f.originalSize;if(f.originalSize>8*1024*1024||size>20*1024*1024)throw Error('File Excel sau giải nén quá lớn.');}return use}})}catch(err){const message=(err as Error).message;throw Error(/^File /.test(message)?message:'Không đọc được file Excel. Hãy lưu lại định dạng .xlsx không có mật khẩu hoặc dùng CSV.')}
 const workbook=xml(files['xl/workbook.xml']),rels=xml(files['xl/_rels/workbook.xml.rels']),strings=files['xl/sharedStrings.xml']?array(xml(files['xl/sharedStrings.xml']).sst?.si).map(rich):[];
 const relationships=new Map(array(rels.Relationships?.Relationship).filter(r=>r['@_TargetMode']!=='External').map(r=>[r['@_Id'],r['@_Target']]));
 const sheets=array(workbook.workbook?.sheets?.sheet);if(sheets.length>30)throw Error('File tối đa 30 trang tính. Hãy tách thành file nhỏ hơn.');
 return sheets.map(sheet=>{let target=String(relationships.get(sheet['@_id'])??'');if(target.startsWith('/'))target=target.slice(1);else target='xl/'+target.replace(/^\.\//,'');if(!/^xl\/worksheets\/[^/]+\.xml$/.test(target))throw Error('Không đọc được đường dẫn trang tính.');const parsed=xml(files[target]),rows:string[][]=[],warnings:string[]=[];
  for(const row of array(parsed.worksheet?.sheetData?.row)){const result:string[]=[];for(const cell of array(row.c)){const n=col(String(cell['@_r']??''));if(n<0||n>99)continue;if(cell.f!==undefined){warnings.push('Có ô công thức đã bỏ qua. Hãy dán giá trị nếu muốn nhập ô đó.');result[n]='';continue}const type=cell['@_t'];result[n]=type==='s'?strings[Number(text(cell.v))]??'':type==='inlineStr'?rich(cell.is):text(cell.v)}if(result.some(v=>v?.trim()))rows.push(Array.from({length:result.length},(_,i)=>result[i]??''));if(rows.length>2001)throw Error('Trang tính vượt 2.000 dòng. Hãy chia nhỏ file.')}
  return {name:String(sheet['@_name']??'Trang tính'),rows,warnings:[...new Set(warnings)]};
 });
}
