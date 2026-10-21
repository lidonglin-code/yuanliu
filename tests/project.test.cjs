const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../dist/project-model.js');
test('legacy training projects expose seven stable modules without changing stored records',()=>{
 const p={id:'p',category:'培训项目',stage:'content',stageNotes:{content:'原始课件记录'}},before=JSON.stringify(p);
 assert.deepEqual(P.modules(p).map(m=>m.id),['demand','design','content','prepare','delivery','evaluation','review']);
 assert.equal(P.taskModule(p,{projectId:'p',projectStage:'content'}),'content');
 assert.equal(P.taskModule(p,{projectId:'p',trainingId:'c'},[{id:'c',type:'checklist'}]),'prepare');
 assert.equal(P.taskModule(p,{projectId:'p',projectStage:'general'}),'');assert.equal(JSON.stringify(p),before);
});
test('ordinary projects only get user-created modules; rename preserves task IDs and notes',()=>{
 const p={id:'p',projectMode:'general',stageNotes:{m:'进展'}};assert.deepEqual(P.modules(p),[]);
 P.saveModule(p,{id:'m',title:'范围确认',description:'界定工作范围'});const t={projectId:'p',title:'确认清单',due:'2026-09-30',sourceInboxId:'i'};
 P.assignTask(p,t,'m');P.saveModule(p,{title:'需求与范围',description:'更新说明'},'m');
 assert.equal(P.taskModule(p,t),'m');assert.equal(P.modules(p)[0].title,'需求与范围');assert.equal(p.stageNotes.m,'进展');assert.equal(t.due,'2026-09-30');assert.equal(t.sourceInboxId,'i');
 assert.throws(()=>P.saveModule(p,{id:'n',title:'需求与范围'}));assert.throws(()=>P.saveModule(p,{title:'   '},'m'));
});
test('module assignment is scoped to a project, legacy explicit unassignment and moves do not resurrect stage membership',()=>{
 const training={id:'p',category:'培训项目'},general={id:'q',projectMode:'general',modules:[{id:'m',title:'模块'}]};
 const t={projectId:'p',projectStage:'content'};P.assignTask(training,t,'');assert.equal(P.taskModule(training,t),'');
 assert.throws(()=>P.assignTask(general,t,'m'));assert.throws(()=>P.assignTask(training,t,'m'));
 t.projectId='q';P.assignTask(general,t,'m');assert.equal(P.taskModule(general,t),'m');assert.equal(t.projectStage,'general');
 assert.equal(P.taskModule(general,{projectId:'q',moduleId:'unknown'}),'');
});
test('training names are editable, source-linked tasks stay with training tools, backups retain custom modules',()=>{
 const p={id:'p',projectMode:'training'};P.saveModule(p,{title:'课程内容开发'},'content');P.saveModule(p,{id:'m',title:'后续跟进'});
 assert.equal(P.modules(p).length,8);assert.equal(P.modules(p).find(m=>m.id==='content').title,'课程内容开发');
 assert.equal(P.taskModule(p,{projectId:'p',moduleId:'m',trainingId:'c'},[{id:'c',type:'review'}]),'review');
 const copy=JSON.parse(JSON.stringify(p));assert.deepEqual(P.modules(copy),P.modules(p));assert.equal(P.modules(copy).filter(m=>m.id==='content').length,1);
});
test('retained modules preserve legacy membership when a project changes mode',()=>{
 const p={id:'p',category:'培训项目'},t={projectId:'p',projectStage:'content'};
 p.modules=P.modules(p);p.projectMode='general';p.stage='general';
 assert.equal(P.modules(p).length,7);assert.equal(P.taskModule(p,t),'content');
 assert.equal(P.taskModule(p,{projectId:'p',trainingId:'c'},[{id:'c',type:'checklist'}]),'prepare');
});
test('project URLs round-trip module, tab and filter and support legacy links',()=>{
 const target={tab:'modules',moduleId:'content',filter:'waiting'};
 assert.deepEqual(P.parseProjectHash(P.projectHash('p-1',target)),{id:'p-1',...target});
 assert.deepEqual(P.parseProjectHash('#project-old'),{id:'old',tab:'modules',moduleId:'',filter:'all'});
 assert.equal(P.parseProjectHash('#project-p?tab=unknown&filter=unknown').tab,'modules');
 assert.equal(P.parseProjectHash('#project-%xx'),null);
 assert.deepEqual(P.parseProjectHash(P.projectHash('p',{tab:'materials',moduleId:'content',filter:'done'})),{id:'p',tab:'materials',moduleId:'',filter:'all'});
});
test('source links target actual modules, original project notes and project-level progress correctly',()=>{
 const a={id:'a',projectMode:'general',modules:[{id:'m',title:'文档'}]},b={id:'b',category:'培训项目'};
 const state={projects:[a,b],tasks:[{id:'t',projectId:'a',moduleId:'m'}],training:[{id:'c',projectId:'b',type:'checklist'}]};
 assert.equal(P.sourceContext(state,state.tasks[0]).moduleTitle,'文档');
 assert.equal(P.sourceContext(state,{sourceTaskId:'t',projectId:'a'}).moduleId,'m');
 const source=P.sourceContext(state,{originProjectId:'a',projectId:'b',sourceStage:'m'});assert.equal(source.project.id,'a');assert.equal(source.moduleTitle,'文档');
 assert.equal(P.sourceContext(state,{projectId:'a',sourceStage:'general'}).tab,'overview');
 assert.equal(P.sourceContext(state,{projectId:'b',trainingId:'c'}).moduleId,'prepare');
 assert.equal(P.sourceContext(state,{projectId:'missing'}),null);
});
test('event and project-level document links return to their correct project section',()=>{
 const p={id:'p',category:'培训项目'},state={projects:[p],tasks:[],training:[]};
 assert.equal(P.sourceContext(state,{projectId:'p'},'event').tab,'schedule');
 assert.equal(P.sourceContext(state,{projectId:'p'},'note').tab,'materials');
 assert.equal(P.sourceContext(state,{projectId:'p',sourceStage:'content'},'note').tab,'modules');
});
