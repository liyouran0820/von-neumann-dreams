import * as Game from './engine.js';
import * as Levels from './levels.js';
import * as View from './renderer.js';
import * as Icons from './icons.js';
const $=id=>document.getElementById(id), KEY='night-white-five-v1-progress';
let completed=[];try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))completed=x.filter(v=>Levels.LEVELS.some(l=>l.id===v));}catch{}
let index=0,level=Levels.LEVELS[0],state=Game.createState(level),hint=0,walking=0;
const name=w=>w==='night'?'夜':'白';
function persist(){try{localStorage.setItem(KEY,JSON.stringify(completed));}catch{}}
function render(){
 document.body.dataset.world=state.view;
 $('levels').innerHTML=Levels.LEVELS.map((l,i)=>`<button data-level="${i}" class="${i===index?'active':''}" aria-current="${i===index?'step':'false'}">${completed.includes(l.id)?'✓ ':''}${i+1} <span>${l.name.split(' · ')[0]}</span></button>`).join('');
 $('chapter').textContent=`THE MIDNIGHT ACADEMY / 0${index+1}`;$('title').textContent=level.name;$('goal').textContent=level.goal;
 $('status').textContent=`身体：${name(state.body.world)} (${state.body.x},${state.body.y}) · 观察：${name(state.view)}`;
 $('board').innerHTML=View.renderMap(level,state,state.view);$('mini').innerHTML=View.renderMap(level,state,Game.other(state.view),true);$('other-title').textContent=name(Game.other(state.view))+'世界';
 $('feedback').textContent=state.boxes?`夜 A：${state.boxes.night} ${state.feedback?.night?.blocked?'受阻':''} ↔ 白 A：${state.boxes.day} ${state.feedback?.day?.blocked?'受阻':''}`:'固定桥 · 全宽齐平通行';
 $('mapping').textContent=`映射 ${state.mapping?'1/1 · '+state.mapping:'0/1'}`;
 const objects=[...(level.track?[{id:'A',world:state.view}]:[]),...level.bridges.filter(b=>b.world===state.view)];
 $('objects').innerHTML=objects.map(o=>`<button data-object="${o.id}" class="${state.preview?.id===o.id?'selected':''}">${o.id==='A'?'真实箱 A':'真实桥 '+o.id} · 预览</button>`).join('')||'<span class="muted">此视角没有可选真实物件；可切换观察。</span>';
 $('preview-status').textContent=state.preview?(state.preview.id==='A'?'真实 A ↔ A · 位置保持':'固定结构 · 无真实对应物 · 将生成实体虚影')+(state.mapping&&state.mapping!==state.preview.id?`；替换 ${state.mapping}`:''):'点真实物件，查看映射预览。';
 $('activate').disabled=!Game.canActivate(level,state)||state.failed||state.won;
 document.querySelectorAll('[data-move]').forEach(b=>b.disabled=state.view!==state.body.world||state.failed||state.won);
 document.querySelectorAll('[data-push]').forEach(b=>b.disabled=state.failed||state.won);
 $('teleport').disabled=state.failed||state.won||state.view!==state.body.world||!level.portals.some(([x,y])=>x===state.body.x&&y===state.body.y);
 if(state.preview&&!Game.canActivate(level,state))$('preview-status').textContent='生成区域被阻挡 · 无法激活，原映射保持。';$('cancel-preview').disabled=!state.preview;$('unlink').disabled=!state.mapping||state.failed||state.won;
 $('message').textContent=state.message|| (state.view!==state.body.world?'观察中 · 身体移动暂停，映射仍可操作。':'');
 $('goals').innerHTML=Game.goals(level,state).map(g=>`<li class="${g.ok?'done':''}">${g.ok?'✓':'○'} ${g.label}${g.required===false?'（机关状态）':''}</li>`).join('');
 $('undo').disabled=!state.history.length;$('completion').hidden=!state.won;$('complete-title').textContent=index===4?'天文台点亮 · 验收完成':'已抵达 '+level.name.split(' · ')[0];$('next').hidden=index===4;
 if(state.won&&!completed.includes(level.id)){completed.push(level.id);persist();render();}
}
function action(type,arg){walking++;Game.act(level,state,type,arg);render();}
function load(i){walking++;index=i;level=Levels.LEVELS[i];state=Game.createState(level);hint=0;$('hint').textContent='查看提示 H1';$('hint-text').textContent='';$('help-panel').hidden=true;render();}
document.addEventListener('click',e=>{
 const el=e.target.closest('button,[data-object],[data-cell]');if(!el)return;
 if(el.dataset.level!==undefined){load(Number(el.dataset.level));return;}
 if(el.dataset.object){walking++;Game.select(level,state,el.dataset.object);render();return;}
 if(el.dataset.push){action('push',el.dataset.push);return;}
 if(el.dataset.move){action('move',el.dataset.move.split(',').map(Number));return;}
 if(el.dataset.cell&&el.closest('#board')){
  const [x,y]=el.dataset.cell.split(',').map(Number),b=level.bridges.find(b=>b.world===state.view&&x>=b.x[0]&&x<=b.x[1]&&y>=b.y[0]&&y<=b.y[1]);
  if(b){Game.select(level,state,b.id);render();return;}
  const path=Game.findPath(level,state,x,y);if(!path){state.message=state.view!==state.body.world?'先返回身体视角才能走路。':'当前没有可达路线。';render();return;}
  const token=++walking;(async()=>{for(const step of path){if(token!==walking)break;Game.act(level,state,'move',step);render();await new Promise(r=>setTimeout(r,90));}})();
 }
});
for(const [id,type] of [['activate','activate'],['cancel-preview','cancelPreview'],['unlink','unlink'],['teleport','teleport'],['undo','undo'],['recover','recover'],['view','view']])$(id).onclick=()=>action(type);
$('body-view').onclick=()=>action('view',state.body.world);$('reset').onclick=()=>load(index);$('replay').onclick=()=>load(index);$('next').onclick=()=>load(Math.min(4,index+1));$('begin').onclick=()=>{$('intro').hidden=true;};$('help').onclick=()=>{$('help-panel').hidden=!$('help-panel').hidden;};$('hint').onclick=()=>{$('help-panel').hidden=false;hint=Math.min(hint+1,3);$('hint-text').textContent=level.hints.slice(0,hint===3?level.hints.length:hint).map((h,i)=>`H${Math.min(i+1,3)}：${h.replaceAll('Tab','V')}`).join('\n');$('hint').textContent=hint===3?'已展开全部提示':`查看提示 H${hint+1}`;};$('clear-progress').onclick=()=>{completed=[];persist();load(0);};
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase(),moves={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]},push={arrowleft:'left',arrowright:'right',arrowup:'up',arrowdown:'down'},keys={v:'view',e:'activate',q:'unlink',z:'undo',f:'teleport'};if(moves[k]){e.preventDefault();action('move',moves[k]);}else if(push[k]){e.preventDefault();action('push',push[k]);}else if(keys[k]){e.preventDefault();action(keys[k]);}});
const icon=key=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${Icons.ICONS[key].map(d=>`<path d="${d}"/>`).join('')}</svg>`;
$('undo').insertAdjacentHTML('afterbegin',icon('undo'));$('activate').insertAdjacentHTML('afterbegin',icon('link'));$('unlink').insertAdjacentHTML('afterbegin',icon('unlink'));render();
