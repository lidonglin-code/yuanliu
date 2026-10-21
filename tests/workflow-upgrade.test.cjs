const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../dist/assistant-model.js'),M=require('../dist/training-model.js'),W=require('../dist/workflow-model.js'),D=require('../dist/document-model.js');
const empty=()=>({tasks:[],events:[],projects:[],notes:[],training:[],inbox:[]});
test('assistant distinguishes dated work from appointments and supports explicit task intent',()=>{
 const day='2026-09-24';let p=A.parse('明天整理课程反馈',day);assert.equal(p.action.type,'task');assert.equal(p.action.data.plannedDate,'2026-09-25');
 p=A.parse('明天下午三点半和业务方开会',day);assert.equal(p.action.type,'event');assert.equal(p.action.data.time,'15:30');assert.equal(p.action.data.date,'2026-09-25');
 p=A.parse('记一个任务：明天下午三点整理课程反馈',day);assert.equal(p.action.type,'task');assert.equal(p.action.data.plannedDate,'2026-09-25');
 assert.equal(A.parse('本周五整理课程反馈',day).action.data.plannedDate,'2026-09-25');assert.equal(A.parse('下周一整理课程反馈',day).action.data.plannedDate,'2026-09-28');
 assert.equal(A.parse('2026-02-30 开会',day).action,undefined);
 assert.equal(A.parse('记录一下课程复盘',day).action.type,'note');assert.equal(A.parse('建立一个培训项目',day).action.type,'project');
});
test('assistant type changes retain dates and original draft information',()=>{
 const p=A.parse('明天整理课程反馈','2026-09-24');const event=A.convert(p.action,'event');assert.equal(event.data.date,'2026-09-25');assert.equal(A.convert(event,'task').data.plannedDate,'2026-09-25');assert.equal(event.data.title,p.action.data.title);assert.equal(p.action.type,'task');
 assert.throws(()=>A.convert(p.action,'unsupported'));
});
test('legacy inbox destinations survive reopening and repeated saves do not duplicate links',()=>{
 const state=empty();state.inbox=[{id:'i',text:'原文',processed:true,targetType:'task',targetId:'t'}];W.finishInbox(state,'i',false);W.saveRecord(state,'task',{id:'t',title:'更新'},'i');W.saveRecord(state,'note',{id:'n',title:'文档'},'i');assert.deepEqual(W.inboxTargets(state.inbox[0]),[{type:'task',id:'t'},{type:'note',id:'n'}]);assert.equal(state.notes[0].sourceText,'原文');W.finishInbox(state,'i');assert.equal(state.inbox[0].processed,true);
});
test('batch task creation is idempotent and keeps linked task planning and completion',()=>{
 const state=empty(),c={id:'c',projectId:'p',items:[{id:'a',title:'确认讲师'},{id:'b',title:'准备课件',done:true,due:'2026-10-01'}]};let n=0;
 assert.equal(M.addAllTasks(state,c,()=>String(++n)),2);state.tasks.find(t=>t.id===c.items[0].taskId).plannedDate='2026-09-25';assert.equal(M.addAllTasks(state,c,()=>String(++n)),0);assert.equal(state.tasks.length,2);assert.equal(state.tasks.find(t=>t.id===c.items[1].taskId).done,true);assert.equal(state.tasks.find(t=>t.id===c.items[0].taskId).plannedDate,'2026-09-25');
});
test('review migration retains historical text and publication never overwrites it',()=>{
 const state=empty(),c={id:'r',type:'review',title:'培训复盘',noteId:'n',projectId:'p',learning:'最新心得',items:[]};state.training=[c];state.notes=[{id:'n',body:'用户修改后的旧文本',projectId:'p',moduleIds:['review']}];M.initializeReviewLinks(state);assert.equal(state.notes[0].resourceType,'review');M.publishReview(state,c,()=> 'other');assert.equal(state.notes.length,1);assert.equal(state.notes[0].body,'用户修改后的旧文本');assert.equal(state.notes[0].trainingId,'r');c.title='改名复盘';M.sync(state,c);assert.equal(state.notes[0].title,'改名复盘 · 复盘');assert.deepEqual(state.notes[0].moduleIds,['review']);
 state.notes[0].resourceType='web';state.notes[0].url='https://example.com/review';M.publishReview(state,c,()=> 'other');assert.equal(state.notes[0].resourceType,'web');assert.equal(state.notes[0].url,'https://example.com/review');
});
test('project completion requires explicit handling of pending work and preserves outstanding tasks',()=>{
 const state=empty(),p={id:'p',status:'doing'};state.projects=[p];state.tasks=[{id:'t',title:'跟进',projectId:'p',done:false}];state.training=[{id:'r',projectId:'p',items:[{id:'i',title:'待加入任务'}]}];state.notes=[{id:'n',projectId:'p'},{id:'foreign',projectId:'q'}];assert.equal(W.closeout(state,'p').looseItems.length,1);assert.throws(()=>W.completeProject(state,p));assert.equal(p.status,'doing');W.completeProject(state,p,{acknowledged:true,documentIds:['n','n','foreign']});assert.equal(p.status,'done');assert.equal(state.tasks[0].done,false);assert.deepEqual(p.finalDocumentIds,['n']);assert.ok(p.completedAt);
});
test('unassigned and project-wide documents have separate visibility',()=>{
 const mods=[{id:'a'},{id:'b'}],d={id:'d',moduleIds:['a','b']};D.assignModules(d,['b'],mods);assert.equal(D.matchesModule(d,'a',mods),false);D.assignModules(d,[],mods);assert.equal(D.matchesModule(d,'__general',mods),false);assert.equal(D.matchesModule(d,'__unassigned',mods),true);d.moduleScope='general';assert.equal(D.matchesModule(d,'__general',mods),true);assert.equal(D.matchesModule({},'__general',mods),true);
});
