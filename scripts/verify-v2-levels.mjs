import assert from 'node:assert/strict';
import { V2_LEVELS } from '../web/levels-v2.js';
import { validateLevels } from '../web/level-validation.js';
import * as Game from '../web/engine.js';
import { pathToFileURL } from 'node:url';
export function executeRoute(level,route,state=Game.createState(level)) {
 let actions=0;
 const act=(type,arg)=>{assert(Game.act(level,state,type,arg),level.id+' rejected '+type+' '+JSON.stringify(arg)+' at '+JSON.stringify(state.body)+' '+state.message);actions++;assert(!state.failed,level.id+' failed: '+state.message);};
 for(const [type,...args] of route){
  if(type==='bind'){const [id,world='day']=args;act('view',{world,recordHistory:false});assert(Game.select(level,state,id,world));act('activate');}
  else if(type==='walk'){act('view',{world:state.body.world,recordHistory:false});const path=Game.findPath(level,state,...args);assert(path,level.id+' no path to '+args+' from '+JSON.stringify(state.body));for(const step of path)act('move',step);}
  else if(type==='move'){act('view',{world:state.body.world,recordHistory:false});for(const ch of args[0])act('move',({R:[1,0],L:[-1,0],U:[0,-1],D:[0,1]})[ch]);}
  else if(type==='push')for(const ch of args[0])act('push',ch==='R'?'right':'left');
  else if(type==='portal'){act('view',{world:state.body.world,recordHistory:false});const path=Game.findPath(level,state,...args);assert(path);for(const step of path)act('move',step);act('teleport');}
  else if(type==='mirror'){act('view',{world:'night',recordHistory:false});act('mirror',args[0]);}
  else act(type,args[0]);
 }
 return {state,actions};
}
export const REFERENCE_ROUTES=[
 [['bind','A','night'],['push','RR'],['walk',7,1]],
 [['move','D'],['bind','A','night'],['push','LLLLR'],['walk',7,1]],
 [['portal',3,3],['portal',9,3],['walk',10,3]],
 [['move','D'],['portal',6,3],['walk',6,1],['move','DD'],['bind','A','night'],['push','LLLLR'],['portal',10,3],['walk',11,3]],
 [['bind','A','night'],['push','LLLLRR'],['bind','B'],['walk',11,3]],
 [['bind','G'],['move','R'],['walk',3,3],['walk',8,3]],
 [['bind','G'],['move','R'],['push','LL'],['walk',5,4],['walk',8,4]],
 [['walk',2,2],['move','U'],['walk',1,3],['bind','G'],['move','RRR'],['unlink'],['activate'],['walk',7,1]],
 [['walk',2,2],['move','U'],['walk',1,3],['bind','G'],['move','RRRR'],['unlink'],['activate'],['walk',5,3],['move','RR'],['walk',10,1]],
 [['walk',2,1],['move','D'],['walk',1,3],['move','RRRRRR'],['walk',8,4],['move','U'],['walk',11,3]],
 [['walk',5,4],['move','U'],['walk',6,2],['move','L'],['walk',5,1],['bind','B'],['walk',4,1],['move','D'],['walk',10,3]],
 [['mirror','M1'],['mirror','M2'],['walk',7,3]],
 [['move','D'],['bind','A','night'],['push','R'],['walk',6,3],['mirror','M'],['bind','B'],['walk',11,3]],
];
export function verifyV2(){validateLevels(V2_LEVELS);return V2_LEVELS.map((level,i)=>{const {state,actions}=executeRoute(level,REFERENCE_ROUTES[i]);assert(state.won,level.id+' did not win');return {id:level.id,actions,body:state.body,status:'PASS'};});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(verifyV2(),null,2));
