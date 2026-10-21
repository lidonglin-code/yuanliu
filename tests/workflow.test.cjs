const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../dist/workflow-model.js');
const M=require('../dist/training-model.js');
const empty=()=>({tasks:[],events:[],projects:[],notes:[],training:[],inbox:[]});
test('old tasks remain visible; dates, waiting and completion form exclusive groups',()=>{
 const day='2026-09-23';
 const cases=[[{},'unscheduled'],[{plannedDate:'2026-09-22'},'past'],[{plannedDate:day},'today'],[{plannedDate:'2026-09-24'},'upcoming'],[{status:'waiting',plannedDate:day},'waiting'],[{done:true,status:'waiting'},'done'],[{done:false,status:'done'},'unscheduled']];
 for(const [task,expected] of cases)assert.equal(W.bucket(task,day),expected);
});
test('waiting reminders start at follow-up date, deadlines still surface, no duplicates',()=>{
 const state=empty();state.tasks=[{id:'a',status:'waiting',followUp:'2026-09-23',waitingFor:'讲师',due:'2026-09-22'},{id:'b',status:'waiting',followUp:'2026-09-24'},{id:'c',status:'waiting'},{id:'d',done:true,due:'2026-09-01'}];
 const results=W.taskReminders(state,'2026-09-23','2026-09-26');assert.equal(results.length,2);assert.match(results[0].detail,/已逾期/);assert.match(results[0].detail,/讲师/);assert.equal(results[0].action,'task:a');assert.match(results[1].detail,/安排跟进/);
});
test('inbox splits into multiple destinations, keeps provenance and supports completion/reopening',()=>{
 const state=empty();state.inbox.push({id:'i',text:'原始需求\n保留换行'});
 W.saveRecord(state,'task',{id:'t',title:'跟进需求',projectId:'p',projectStage:'content',plannedDate:'2026-09-23'},'i');
 assert.equal(state.tasks[0].sourceText,state.inbox[0].text);assert.equal(state.inbox[0].targetId,'t');assert.equal(state.inbox[0].processed,false);assert.equal(state.tasks[0].projectStage,'content');
 W.saveRecord(state,'task',{id:'t2',title:'第二件事'},'i');W.saveRecord(state,'note',{id:'n',title:'方案链接'},'i');assert.equal(W.inboxTargets(state.inbox[0]).length,3);W.finishInbox(state,'i');assert.throws(()=>W.saveRecord(state,'task',{id:'duplicate'},'i'));assert.equal(state.tasks.length,2);W.finishInbox(state,'i',false);W.saveRecord(state,'event',{id:'e',title:'评审'},'i');assert.equal(W.inboxTargets(state.inbox[0]).length,4);
 W.saveRecord(state,'task',{id:'t',title:'修改任务'});assert.equal(state.tasks[0].sourceInboxId,'i');
});
test('project next step reflects rename, completion, deletion and move without stale fallback',()=>{
 const state=empty(),p={id:'p',nextTaskId:'t',next:'过期文字'};state.tasks.push({id:'t',title:'交付课件',projectId:'p'});
 assert.equal(W.nextText(state,p),'交付课件');state.tasks[0].title='评审课件';assert.equal(W.nextText(state,p),'评审课件');
 state.tasks[0].done=true;assert.match(W.nextText(state,p),/已完成/);state.tasks[0].projectId='another';assert.match(W.nextText(state,p),/移出/);state.tasks=[];assert.match(W.nextText(state,p),/移除/);
 assert.equal(W.nextText(state,{next:'补充目标'}),'补充目标');
});
test('training tasks keep the same identity and planning when checklist changes',()=>{
 const state=empty(),card={id:'c',projectId:'p',items:[{id:'i',title:'准备课件'}]};const task=M.taskFor(state,card,card.items[0],()=> 't');task.plannedDate='2026-09-24';task.status='waiting';task.followUp='2026-09-23';
 card.items[0].title='评审课件';M.sync(state,card);assert.equal(state.tasks.length,1);assert.equal(task.title,'评审课件');assert.equal(task.followUp,'2026-09-23');assert.equal(task.plannedDate,'2026-09-24');
});
test('review publishing keeps one note and source project/record links',()=>{
 const state=empty(),card={id:'r',projectId:'p',title:'培训',learning:'有效方法',items:[]};M.publishReview(state,card,()=> 'n');card.learning='改进的方法';M.publishReview(state,card,()=> 'other');assert.equal(state.notes.length,1);assert.equal(state.notes[0].trainingId,'r');assert.equal(state.notes[0].projectId,'p');assert.equal(state.notes[0].resourceType,'review');assert.equal(state.notes[0].body,undefined);
});
test('demand follow-ups respect the chosen date instead of appearing early',()=>{
 const state=empty();state.training=[{id:'d',title:'需求',type:'demand',stage:'waiting',followUp:'2026-09-24'}];
 assert.equal(M.reminders(state,'2026-09-23').length,0);assert.equal(M.reminders(state,'2026-09-24').length,1);
 state.training[0].archived=true;assert.equal(M.reminders(state,'2026-09-25').length,0);
});
test('missed plans and overdue deadlines are independent, waiting uses its follow-up date',()=>{
 const today='2026-09-23', t={id:'a',plannedDate:'2026-09-22',due:'2026-09-30'};
 assert.equal(W.bucket(t,today),'past');assert.equal(W.overdue(t,today),false);
 t.due='2026-09-22';assert.equal(W.overdue(t,today),true);
 t.plannedDate='2026-09-24';assert.equal(W.bucket(t,today),'upcoming');assert.equal(W.overdue(t,today),true);
 t.status='waiting';t.followUp='2026-09-25';assert.equal(W.calendarDate(t),'2026-09-25');assert.equal(W.bucket(t,today),'waiting');
 t.followUp='';assert.equal(W.calendarDate(t),'');t.done=true;assert.equal(W.overdue(t,today),false);
});
test('rescheduling preserves deadlines and provenance, handles waiting and skips completed tasks',()=>{
 const state=empty();state.tasks=[{id:'a',plannedDate:'2026-09-20',due:'2026-09-21',sourceInboxId:'i',projectStage:'content'},{id:'b',status:'waiting',followUp:'2026-09-20',plannedDate:'2026-09-19'},{id:'c',done:true,plannedDate:'2026-09-20'}];
 W.reschedule(state,['a','b','c','missing'],'2026-10-02');
 assert.equal(state.tasks[0].plannedDate,'2026-10-02');assert.equal(state.tasks[0].due,'2026-09-21');assert.equal(state.tasks[0].sourceInboxId,'i');assert.equal(state.tasks[0].projectStage,'content');
 assert.equal(state.tasks[1].followUp,'2026-10-02');assert.equal(state.tasks[1].plannedDate,'2026-09-19');assert.equal(state.tasks[2].plannedDate,'2026-09-20');
 assert.throws(()=>W.reschedule(state,['a'],'2026-02-30'));assert.throws(()=>W.reschedule(state,['a'],''));
});
test('weeks cross months and years, always start Monday and end Sunday',()=>{
 assert.deepEqual(W.weekDays('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
 assert.equal(W.weekDays('2026-09-27')[0],'2026-09-21');assert.equal(W.weekDays('2026-09-21')[6],'2026-09-27');
});
test('month grid includes every date once, covers leap days and six-week months',()=>{
 for(const month of ['2024-02','2026-02','2026-08','2026-09','2026-12']){
  const days=W.monthDays(month+'-15'),count=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  assert.equal(days.length%7,0);assert.equal(new Set(days).size,days.length);assert.equal(days.filter(d=>d.startsWith(month)).length,count);
  assert.equal(new Date(days[0]+'T12:00:00').getDay(),1);assert.equal(new Date(days.at(-1)+'T12:00:00').getDay(),0);
 }
 assert.ok(W.monthDays('2024-02-01').includes('2024-02-29'));assert.equal(W.monthDays('2026-08-15').length,42);
});
test('month navigation clamps month ends and crosses year boundaries',()=>{
 assert.equal(W.shiftMonth('2026-01-31',1),'2026-02-28');assert.equal(W.shiftMonth('2024-01-31',1),'2024-02-29');
 assert.equal(W.shiftMonth('2026-12-31',1),'2027-01-31');assert.equal(W.shiftMonth('2026-01-15',-1),'2025-12-15');
});

test('AI edited and confirmed drafts store one destination and cannot be completed twice',()=>{
 const state={...empty(),aiMessages:[{role:'assistant',action:{type:'task',data:{title:'整理课件'}}}]};
 W.saveRecord(state,'task',{id:'t',title:'整理新版课件'});W.completeAssistantAction(state,0,'task','t');
 assert.equal(state.aiMessages[0].targetType,'task');assert.equal(state.aiMessages[0].targetId,'t');
 assert.equal(state.aiMessages[0].confirmed,true);assert.throws(()=>W.completeAssistantAction(state,0,'task','other'));
 assert.throws(()=>W.completeAssistantAction(state,9,'task','other'));assert.equal(state.tasks.length,1);
});
test('training project association propagates to followups, events and materials without losing content',()=>{
 const state=empty(),card={id:'c',type:'demand',title:'需求',projectId:'new',stage:'waiting',contact:'业务方',followUp:'2026-10-01',followTaskId:'t',eventId:'e',noteId:'n',date:'2026-10-02',time:'15:00'};
 state.tasks=[{id:'t',projectId:'old',plannedDate:'2026-09-30',done:true,description:'保留任务说明'}];
 state.events=[{id:'e',projectId:'old',time:'14:00',endTime:'14:30'}];state.notes=[{id:'n',projectId:'old',body:'手动整理后的资料',moduleIds:['design']}];
 M.sync(state,card);
 for(const record of [...state.tasks,...state.events,...state.notes])assert.equal(record.projectId,'new');
 assert.equal(state.tasks[0].done,true);assert.equal(state.tasks[0].plannedDate,'2026-09-30');assert.equal(state.tasks[0].description,'保留任务说明');
 assert.equal(state.tasks[0].waitingFor,'业务方');assert.equal(state.events[0].endTime,'');assert.equal(state.notes[0].body,'手动整理后的资料');
 assert.deepEqual(state.notes[0].moduleIds,[]);
 state.notes[0].moduleIds=['content'];M.sync(state,card);assert.deepEqual(state.notes[0].moduleIds,['content']);
});
test('creation defaults follow the entry point without inheriting unrelated dates or projects',()=>{
 const ctx={today:'2026-10-05',selectedDate:'2026-10-12',projectId:'p'};
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'focus'}),{plannedDate:'2026-10-05'});
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'planning',mode:'tasks',filter:'all'}),{projectId:'p',plannedDate:''});
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'planning',mode:'tasks',filter:'today'}),{projectId:'p',plannedDate:'2026-10-05'});
 for(const mode of ['calendar','month']){
  assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'planning',mode}),{projectId:'p',plannedDate:'2026-10-12'});
  assert.deepEqual(W.creationSeed({...ctx,type:'event',view:'planning',mode}),{projectId:'p',date:'2026-10-12'});
 }
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'calendar',unplanned:true}),{projectId:'p',plannedDate:''});
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'inbox'}),{plannedDate:''});
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'today'}),{plannedDate:''});
 assert.deepEqual(W.creationSeed({...ctx,type:'task',view:'planning',mode:'calendar',projectId:'none'}),{plannedDate:'2026-10-12'});
});
