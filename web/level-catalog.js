import { LEVELS } from './levels.js';
import { ACADEMY_LEVELS } from './academy-levels.js';
import { OPTICS_LEVELS } from './optics-levels.js';
import { V2_LEVELS } from './levels-v2.js';
import { validateLevels } from './level-validation.js';
validateLevels(V2_LEVELS);
export const CATALOGS={
 academy:{id:'academy',name:'入学试炼（原版）',levels:ACADEMY_LEVELS,progressKey:'night-white-logic-gates-v1-progress',notesKey:'night-white-logic-gates-v1-notes',welcomeKey:'academy-welcomed'},
 original:{id:'original',name:'原版映射',levels:LEVELS,progressKey:'night-white-five-v1-progress',notesKey:null,welcomeKey:'academy-welcomed'},
 optics:{id:'optics',name:'历史逻辑光学',levels:OPTICS_LEVELS,progressKey:'night-white-academy-v1-progress',notesKey:'night-white-academy-v1-notes',welcomeKey:'academy-welcomed'},
 v2:{id:'v2',name:'2.0关卡',levels:V2_LEVELS,progressKey:'night-white-v2-progress',notesKey:'night-white-v2-notes',welcomeKey:'night-white-v2-welcomed'},
};
export const catalogFor=version=>CATALOGS[version]||CATALOGS.academy;
export function readProgress(storage,catalog){try{const value=JSON.parse(storage.getItem(catalog.progressKey)||'[]');const ids=catalog.id==='v2'?(value?.format===1&&value?.catalog==='v2'?value.completed:[]):value;return Array.isArray(ids)?[...new Set(ids.filter(id=>catalog.levels.some(l=>l.id===id)))]:[];}catch{return [];}}
export function writeProgress(storage,catalog,completed){try{storage.setItem(catalog.progressKey,JSON.stringify(catalog.id==='v2'?{format:1,catalog:'v2',completed}:completed));}catch{/* optional persistence */}}
