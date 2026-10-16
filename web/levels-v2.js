// Independently authored from 关卡设计v2.0.md at fb17ac7; old campaigns are untouched.
const rect=(x1,x2,y1,y2)=>{const a=[];for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)a.push([x,y]);return a;};
const row=(x1,x2,y)=>rect(x1,x2,y,y), col=(x,y1,y2)=>rect(x,x,y1,y2);
const union=(...sets)=>[...new Map(sets.flat().map(c=>[c.join(','),c])).values()];
const sig=signal=>({signal}), op=(op,...ids)=>({op,args:ids.map(sig)});
const node=(id,kind,...args)=>({id,...op(kind,...args)});
const target=(id,entity,cell)=>({id,type:'target',entity,cell});
const plate=(id,world,...cells)=>({id,type:'contact',world,cells});
const sensor=(id,world,name)=>({id,type:'sensor',world,sensor:name});
const circuit=(id,world,inputs,nodes,output)=>({id,world,inputs,nodes,output});
const door=(id,world,cell,signal,label)=>({id,world,cells:[cell],signal,label});
const deck=(id,world,cells,signal)=>({id,world,cells,signal,label:id==='H'?'地桥':id.replace('H','')+'桥'});
const weight=(id,world,cell)=>({id,world,cell,kind:'weight',height:.6,nearPush:true,label:'配重 '+id});
const position=(entity,cell,label)=>({type:'position',entity,cell,label});
const signalGoal=(signal,label,value=true)=>({type:'signal',signal,value,label});
function base(n,name,start,exit,walkN,walkW=[],pits=[]) {
 return {schemaVersion:2,id:'V2-'+String(n).padStart(2,'0'),number:n,name,goal:'抵达夜侧出口。',
 start,exit:[exit],walk:{night:walkN,day:walkW},pits,entities:[],groups:{},doors:[],decks:[],portals:[],checkpoints:[],requirements:[],
 walls:{night:[],day:[]},science:{kind:'v2',world:'night',circuits:[],optics:{}},
 academy:{title:name,schools:'午夜学院 · 2.0',note:'通过场景中的输入和输出，预测下一步。',completion:n===13?'十三项试炼完成。':name+'已完成'},
 hints:['观察输入的来源。','结合本世界的止挡与身体位置。','查看目标，再安排映射与通行。']};
}
function pair(l,nRange,wRange,initial,y=7) {
 const ns=nRange.map(x=>[x,y]),ws=wRange.map(x=>[x,y]);
 l.entities.push({id:'A_N',world:'night',cell:[initial,y],rail:ns,kind:'rail',height:.62,nearPush:false,group:'A',label:'夜侧实验箱'},
 {id:'A_W',world:'day',cell:[initial,y],rail:ws,kind:'rail',height:.62,nearPush:false,group:'A',label:'白侧实验箱'});
 l.groups.A={id:'A',kind:'pair',members:['A_N','A_W'],label:'实验箱'};
}
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
function movable(l,nRange,wRange,initial,y,kind='screen') {
 l.entities.push({id:'G_W',world:'day',cell:[initial,y],rail:wRange.map(x=>[x,y]),kind,height:kind==='screen'?1.9:.62,opticalHalfExtents:kind==='screen'?[.39,.08]:undefined,nearPush:kind!=='rail',group:'G',label:kind==='screen'?'白侧光幕':'白侧滑车'});
 l.groups.G={id:'G',kind:'ghost',source:'G_W',sourceWorld:'day',target:'night',ghostId:'G_N',rail:nRange.map(x=>[x,y]),label:kind==='screen'?'光幕':'滑车'};
}
function bridge(l,cells,condition) {
 l.groups.B={id:'B',kind:'bridge',world:'day',target:'night',cells,condition,label:'白侧桥'};
}
function light(E,M,S,id='L',rotatable=false,orientation='\\',absorbers=[]) {
 return {height:1.6,emitters:[{id:'E-'+id,cell:E,direction:[1,0]}],mirrors:[{id:rotatable?'M': 'M-'+id,cell:M,orientation,rotatable}],
 sensors:[{id,cell:S,label:id}],absorbers};
}
export const V2_LEVELS=[];
for(const n of [1,2]) {
 const l=base(n,n===1?'双生标本':'回声不返',[3,0],[7,1],union(rect(1,5,0,3),[[6,1],[7,1]]));
 pair(l,range(2,n===1?3:6),range(n===1?2:0,n===1?5:6),n===1?2:4);
 l.walls.night=col(6,0,3).filter(c=>c[1]!==1);
 if(n===1){
  const c=circuit('双靶AND','night',[target('A','A_N',[3,7]),target('B','A_W',[4,7])],[node('Y','and','A','B')],'Y');
  c.crossWorld={inputs:['A','B'],output:'Y',door:'D'};l.science.circuits=[c];
 }else{
  l.entities.push(weight('K','night',[3,1]));
  const c=circuit('双靶与压板','night',[target('a','A_N',[3,7]),target('w','A_W',[1,7]),plate('b','night',[3,2])],[node('C','and','a','w'),node('Y','and','C','b')],'Y');
  c.crossWorld={inputs:['a','w'],output:'C',door:'D'};l.science.circuits=[c];
 }
 l.doors=[door('D','night',[6,1],'Y','与门')];
 l.requirements=[position('A_N',[3,7],n===1?'夜靶 A':'夜侧轨靶'),position('A_W',[n===1?4:1,7],n===1?'白靶 B':'白侧轨靶')];
 l.goal=n===1?'让夜靶A、白靶B同时亮起，打开AND门。':'夜靶a与白靶w先合成C，再由C与压板b打开AND门。';
 l.hints=n===1?['A来自夜箱到3，B来自白箱到4。','夜箱被止挡挡住时，白箱仍能继续移动。','映A，向右两次至夜3／白4，再穿门。']:['第一道AND合并夜靶a与白靶w，第二道AND合并C与压板b。','K保持b；越过已亮目标，为回程准备位差。','向下推K压板；映A左四次、右一次至夜3／白1，再走出口。'];V2_LEVELS.push(l);
}
{
 const l=base(3,'借道',[1,3],[10,3],union(rect(1,3,1,5),rect(5,11,1,5)),rect(3,9,1,5));
 l.walls.night=col(4,1,5);l.portals=[[3,3],[9,3]];l.goal='亲自借白世界的道路，回到夜侧出口。';
 l.hints=['观察白侧连通的地面。','Space只改变观察，身体仍在夜侧。','夜P1穿到白侧，到P2再穿回夜侧。'];V2_LEVELS.push(l);
}
{
 const l=base(4,'身后的门',[2,1],[11,3],union(rect(1,3,1,5),[[4,3]],rect(5,7,1,5),rect(9,11,1,5)),union(rect(5,7,1,5),[[8,3]],rect(9,11,1,5)));
 l.walls.night=union(col(4,1,5).filter(c=>c[1]!==3),col(8,1,5));l.walls.day=col(8,1,5).filter(c=>c[1]!==3);
 l.portals=[[6,3],[10,3]];pair(l,range(2,6),range(0,6),4);l.entities.push(weight('K_N','night',[2,2]),weight('K_W','day',[6,2]));
 l.science.circuits=[circuit('夜XOR','night',[target('a','A_N',[3,7]),plate('b','night',[2,3])],[node('N','xor','a','b')],'N'),
 circuit('白AND','day',[target('c','A_W',[1,7]),plate('d','day',[6,4])],[node('W','and','c','d')],'W')];
 l.doors=[door('DN','night',[4,3],'N','夜异或门'),door('DW','day',[8,3],'W','白与门')];
 l.requirements=[position('A_N',[3,7],'夜侧轨靶'),position('A_W',[1,7],'白侧轨靶')];
 l.checkpoints=[{world:'day',x:[5,7],y:[1,5]}];l.goal='亲自搬运两侧配重，校准夜3／白1，再到出口。';
 l.hints=['夜门与白门使用不同运算。','先通过夜门；身后门关闭仍能前进。','夜K压板，穿P1搬白K至(6,4)；映A左四右一，再经白门与P2。'];V2_LEVELS.push(l);
}
{
 const l=base(5,'两岸同心',[1,4],[11,3],union(rect(0,6,0,5).filter(c=>!(c[1]===2&&c[0]>=3)),row(7,9,3),rect(10,12,0,5)),rect(0,12,0,5).filter(c=>c[1]!==2),rect(7,9,0,5));
 pair(l,range(3,6),range(0,6),4,2);bridge(l,row(7,9,3),'Y');
 const c=circuit('双世界AND','day',[target('a','A_N',[5,2]),target('b','A_W',[2,2])],[node('Y','and','a','b')],'Y');
 c.crossWorld={inputs:['a','b'],output:'Y',bridge:'B'};l.science.circuits=[c];l.goal='两侧真箱同时压板，激活白桥，再映到夜侧。';
 l.hints=['两块板需要同时保持亮起。','白板亮过仍需离开，让回程形成三格位差。','映A左四右二；两灯同时亮后换映白桥B，走过夜桥。'];V2_LEVELS.push(l);
}
for(const n of [6,7]) {
 const l=base(n,n===6?'暗室':'两处熄灯',n===6?[3,1]:[4,1],n===6?[8,3]:[8,4],n===6?union(row(3,7,1),[[3,2]],row(3,8,3)):union(rect(0,9,0,2),[[5,3]],row(5,8,4)),[],n===6?row(6,7,3):row(6,7,4));
 movable(l,range(n===6?4:1,n===6?6:8),range(n===6?4:1,n===6?6:5),n===6?4:5,1);
 l.science.optics.night=n===6?light([2,0],[5,0],[5,2],'LN'):light([0,0],[6,0],[6,2],'LN');
 l.science.circuits=[circuit('夜NOT','night',[sensor('LN','night','LN')],[node('YN','not','LN')],'YN')];
 if(n===7){l.science.optics.day=light([0,0],[3,0],[3,2],'LW');l.science.circuits.push(circuit('白NOT','day',[sensor('LW','day','LW')],[node('YW','not','LW')],'YW'));l.requirements=[signalGoal('YN','夜侧熄灯'),signalGoal('YW','白侧熄灯')];}
 l.decks=[deck('H','night',n===6?row(6,7,3):row(6,7,4),'YN')];
 l.goal=n===6?'推动光幕遮住反射光，沿非门桥前进。':'两侧光幕同时遮断反射光，抵达夜侧出口。';
 l.hints=n===6?['跟随镜面后的光找受光器。','遮光令输入归零，NOT令桥接通。','映G；向右近推一次，再从左侧绕到下方桥。']:['两束光位于不同刻度。','用身体或轨末挡住一端的回程。','映G，近推至夜6；人物留夜5，遥左两次，保持白3／夜6后过桥。'];V2_LEVELS.push(l);
}
for(const n of [8,9]) {
 const l=base(n,n===8?'第二次显影':'两堵墙',[1,3],n===8?[7,1]:[10,1],n===8?union(rect(1,3,0,4),[[4,1]],rect(5,7,0,4)):union(rect(1,3,0,4),[[4,1]],rect(5,8,0,4),[[9,1]],rect(10,11,0,4)));
 movable(l,n===8?[2,3,5,6]:[2,3,5,6,7,8],n===8?range(2,6):[2,3,4,5,6,8],2,3,'rail');
 l.walls.night=col(4,0,4).filter(c=>c[1]!==1);if(n===9)l.walls.night.push(...col(9,0,4).filter(c=>c[1]!==1));
 l.entities.push(weight('K','night',[2,1]));
 l.science.circuits=[circuit(n===8?'AND':'双AND','night',[target('p','G_N',[n===8?5:6,3]),plate('b','night',[2,0]),...(n===9?[target('q','G_N',[8,3])]:[])],[node('Y1','and','p','b'),...(n===9?[node('Y2','and','q','b')]:[])],n===8?'Y1':'Y2')];
 l.doors=[door('D1','night',[4,1],'Y1','入口与门'),...(n===9?[door('D2','night',[9,1],'Y2','出口与门')]:[])];
 l.goal=n===8?'压板b保持接通，重生虚影至轨靶p，令AND开门。':'保持压板b；用重生与两端止挡先后接通两道AND门。';
 l.hints=n===8?['门接AND：p是夜影到5，b是压板占位。','旧影过不了墙；Q解除后，E从白本体当前位置重生。','把K推到上方b板；映G向右推三次至白5／夜3，Q后E，再穿门。']:['入口Y1=p AND b，出口Y2=q AND b；p在6，q在8。','压板用K保持；先让本体越过夜4，再让夜影越过白7。','K推上方b板；映G右推四次，Q后E在6重生；过入口，再右推夜影至8。'];V2_LEVELS.push(l);
}
{
 const floor=union(rect(1,5,1,5),[[6,3]],rect(7,9,1,5),[[10,3]],rect(11,12,2,4));
 const l=base(10,'只留一路',[2,3],[11,3],floor,structuredClone(floor));
 l.entities.push(weight('K1','night',[2,2]),weight('K2','night',[4,2]));l.walls.night=union(col(6,1,5).filter(c=>c[1]!==3),col(10,1,5).filter(c=>c[1]!==3));
 l.walls.day=structuredClone(l.walls.night);
 l.science.circuits=[circuit('XOR与AND','night',[plate('a','night',[2,2]),plate('b','night',[4,2]),plate('c','night',[8,2])],[node('Y','xor','a','b'),node('Z','and','Y','c')],'Z')];
 l.doors=[door('D1','night',[6,3],'Y','异或门'),door('D2','night',[10,3],'Z','与门')];
 l.goal='留下恰好一路，把移出的配重运到后方压板。';l.hints=['前门打开以后，后门还缺什么？','撤离的配重可以继续使用。','留一箱在原板，另一箱经前门送到(8,2)。'];V2_LEVELS.push(l);
}
{
 const l=base(11,'错开的交接',[6,3],[10,3],union(row(1,9,3),rect(9,11,2,4),rect(1,6,0,1),row(1,4,2),rect(1,6,4,5),[[5,2],[6,2]]),[],union(rect(7,8,0,5),rect(5,6,2,3)));
 l.entities.push(weight('K','night',[5,3]),{id:'T_W',world:'day',cell:[2,3],kind:'fixed',height:.6,label:'白侧镇纸'});
 l.groups.T={id:'T',kind:'ghost',source:'T_W',sourceWorld:'day',target:'night',ghostId:'T_N',label:'镇纸'};l.initialMapping='T';bridge(l,row(7,8,3));
 l.science.circuits=[circuit('OR与XOR','night',[plate('p','night',[2,3]),plate('q','night',[3,3]),plate('b','night',[4,3])],[node('a','or','p','q'),node('Y','xor','a','b')],'Y')];
 l.decks=[deck('H','night',rect(5,6,2,3),'Y')];l.checkpoints=[{world:'night',x:[1,6],y:[0,1]}];
 l.goal='先把自己和配重移到永久地面，再完成输入交接。';l.hints=['双路亮时，谁还依赖脚下的H？','先把K和身体都送到连续岸地。','K搬到(4,2)，人在(5,1)换B，再把K推到压板。'];V2_LEVELS.push(l);
}
{
 const floor=union(rect(1,5,1,4),[[6,3],[7,3]]);
 const l=base(12,'两盏灯',[2,3],[7,3],floor,structuredClone(floor));l.walls.night=col(6,1,4).filter(c=>c[1]!==3);l.walls.day=structuredClone(l.walls.night);
 const a=light([1,1],[2,1],[2,4],'a',true,'\\',[[2,0]]),b=light([3,1],[4,1],[4,4],'b',true,'\\',[[4,0]]);
 a.mirrors[0].id='M1';b.mirrors[0].id='M2';l.science.optics.night={height:1.6,emitters:[...a.emitters,...b.emitters],mirrors:[...a.mirrors,...b.mirrors],sensors:[...a.sensors,...b.sensors],absorbers:[...a.absorbers,...b.absorbers]};
 l.science.circuits=[circuit('NAND','night',[sensor('a','night','a'),sensor('b','night','b')],[node('Y','nand','a','b')],'Y')];l.doors=[door('D','night',[6,3],'Y','与非门')];
 l.goal='改变反射输入，观察与非门的通行条件。';l.hints=['比较两灯全亮与全灭时的输出。','与非只排除两路同时为1。','转走至少一路，全部转走也能通行。'];V2_LEVELS.push(l);
}
{
 const pits=rect(4,10,0,5).filter(c=>!(c[0]===6&&c[1]===3));
 const l=base(13,'零的另一端',[3,0],[11,3],union(row(1,11,3),rect(1,3,0,5),rect(11,12,2,4)),[],pits);
 pair(l,range(1,3),range(1,3),1);l.entities.push(weight('K','night',[3,1]));bridge(l,row(9,10,3));
 l.science.optics.night=light([0,1],[2,1],[2,4],'L',true,'/',[[2,0]]);
 l.science.circuits=[circuit('AND与双NAND','night',[target('p','A_N',[2,7]),sensor('L','night','L'),plate('b','night',[3,2])],[node('a','and','p','L'),node('C','nand','a','b'),node('Y','nand','C','C')],'Y')];
 l.decks=[deck('H前','night',row(4,5,3),'C'),deck('H后','night',row(7,8,3),'Y')];l.checkpoints=[{world:'night',x:[6,6],y:[3,3]}];
 l.goal='到中庭后补齐条件，利用两级与非门并换映白桥。';l.hints=['轨靶与受光先进入哪个节点？','过前桥前保留一个条件为0，到中庭再补齐。','K压板，A到2且镜面朝/；到中庭转镜，最后换B。'];V2_LEVELS.push(l);
}
// Grid is a presentation/legacy optics envelope; walk/pits remain authoritative.
const lessonTitles=['AND 与独立阻挡','双AND与逆向校准','身体穿行','XOR / AND','双世界 AND','NOT 与光幕','双侧 NOT','AND 与重新显影','双AND与两端约束','XOR → AND','OR → XOR','NAND','AND → NAND'];
for(const l of V2_LEVELS) {
 l.academy.title=lessonTitles[l.number-1];
 l.grids={};l.bridges=[];
 for(const world of ['night','day']) {
  const grid=Array.from({length:9},()=>Array(13).fill(' '));
  for(const [x,y] of l.walk[world])grid[y][x]='.';
  for(const [x,y] of l.pits)grid[y][x]='~';
  for(const [x,y] of l.walls[world])grid[y][x]='#';
  for(const d of l.doors.filter(d=>d.world===world))for(const [x,y] of d.cells)grid[y][x]='D';
  for(let i=0;i<l.portals.length;i++){const [x,y]=l.portals[i];grid[y][x]=String(i+1);}
  l.grids[world]=grid.map(r=>r.join(''));
 }
 l.science.formula=l.science.circuits.map(c=>c.nodes.map(n=>n.id+' = '+n.args.map(a=>a.signal).join(' '+n.op.toUpperCase()+' ')).join(' · ')).filter(Boolean).join(' / ');
}
