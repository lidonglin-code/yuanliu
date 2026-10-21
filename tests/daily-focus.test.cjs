const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../dist/workflow-model.js');
const day='2026-09-24';
test('focus separates planned work from overdue, past and due followups without duplicate tasks',()=>{
 const state={tasks:[
  {id:'today',plannedDate:day,due:'2026-09-22'},
  {id:'past',plannedDate:'2026-09-23',due:'2026-09-22'},
  {id:'due',due:day},
  {id:'waiting',status:'waiting',plannedDate:day,followUp:day},
  {id:'future',plannedDate:'2026-09-25'},
  {id:'later-follow',status:'waiting',followUp:'2026-09-25'},
  {id:'no-follow',status:'waiting'},
  {id:'unscheduled'},
  {id:'done',done:true,plannedDate:day,due:'2026-09-22'}
 ],events:[{id:'later',date:day,time:'14:00'},{id:'all-day',date:day},{id:'early',date:day,time:'09:00'},{id:'other',date:'2026-09-25'}]};
 const before=JSON.stringify(state),focus=W.dailyFocus(state,day);
 assert.deepEqual(focus.tasks.map(t=>t.id),['today']);
 assert.deepEqual(new Set(focus.attention.map(t=>t.id)),new Set(['past','due','waiting']));
 assert.deepEqual(focus.completed.map(t=>t.id),['done']);
 assert.deepEqual(focus.events.map(e=>e.id),['all-day','early','later']);
 assert.equal(JSON.stringify(state),before);
 assert.equal(focus.tasks[0],state.tasks[0]);
});
test('completion and rescheduling are immediately reflected, with no copied focus records',()=>{
 const task={id:'t',plannedDate:day,projectId:'p',moduleId:'content'},state={tasks:[task],events:[]};
 assert.equal(W.dailyFocus(state,day).tasks.length,1);
 task.done=true;
 assert.equal(W.dailyFocus(state,day).tasks.length,0);
 assert.equal(W.dailyFocus(state,day).completed[0],task);
 task.done=false;W.reschedule(state,['t'],'2026-09-25');
 assert.equal(W.dailyFocus(state,day).tasks.length,0);
 assert.equal(W.dailyFocus(state,'2026-09-25').tasks[0],task);
 task.status='waiting';task.followUp=day;
 assert.equal(W.dailyFocus(state,day).attention[0],task);
 W.reschedule(state,['t'],'2026-09-26');
 assert.equal(W.dailyFocus(state,day).attention.length,0);
 assert.equal(task.projectId,'p');assert.equal(task.moduleId,'content');
});
test('home clue follows the clock, excluding ended events and preserving all-day events',()=>{
 const state={tasks:[],events:[{title:'已结束',date:day,time:'08:00',endTime:'09:00'},{title:'正在开会',date:day,time:'10:00',endTime:'11:00'},{title:'下午会议',date:day,time:'14:00',endTime:'15:00'},{title:'全天培训',date:day}]};
 const before=JSON.stringify(state);
 assert.deepEqual(W.homeCue(state,day,'10:00'),{label:'正在进行',title:'正在开会',time:'10:00'});
 assert.equal(W.homeCue(state,day,'11:00').title,'下午会议');
 assert.equal(W.homeCue(state,day,'15:00').title,'全天培训');
 assert.equal(W.homeCue(state,day,'07:00').title,'已结束');
 assert.equal(JSON.stringify(state),before);
});
test('home clue uses a project next step only when it is planned today and still belongs to that project',()=>{
 const state={tasks:[{id:'early',title:'到期事项',plannedDate:day,due:day},{id:'next',title:'项目下一步',plannedDate:day,projectId:'p'}],events:[],projects:[{id:'p',nextTaskId:'next'}]};
 assert.equal(W.homeCue(state,day,'09:00').title,'项目下一步');
 state.tasks[1].projectId='other';
 assert.equal(W.homeCue(state,day,'09:00').title,'到期事项');
 state.tasks[1].projectId='p';state.tasks[1].done=true;
 assert.equal(W.homeCue(state,day,'09:00').title,'到期事项');
 state.tasks[0].done=true;
 assert.match(W.homeCue(state,day,'09:00').title,/已完成/);
});
test('home clue does not lose overdue followups or present past event times as upcoming',()=>{
 const state={tasks:[{title:'跟进回复',status:'waiting',followUp:day}],events:[{title:'早会',date:day,time:'09:00'}]};
 assert.equal(W.homeCue(state,day,'12:00').label,'待留意');
 state.tasks=[];
 assert.match(W.homeCue(state,day,'12:00').title,/定时日程已过/);
 assert.match(W.homeCue(state,'2026-09-25','00:00').title,/还没有安排/);
});
test('focus candidates separate unscheduled and future work from attention, today, waiting and done',()=>{
 const state={tasks:[
  {id:'plain'}, {id:'due-soon',due:'2026-09-26'},
  {id:'future-late',plannedDate:'2026-10-02'}, {id:'future',plannedDate:'2026-09-25'},
  {id:'today',plannedDate:day}, {id:'past',plannedDate:'2026-09-23'},
  {id:'overdue',due:'2026-09-23'}, {id:'future-overdue',plannedDate:'2026-09-26',due:day},
  {id:'wait',status:'waiting',followUp:'2026-09-26'}, {id:'done',done:true}
 ],events:[]};
 const before=JSON.stringify(state),f=W.dailyFocus(state,day);
 assert.deepEqual(f.unscheduled.map(t=>t.id),['due-soon','plain']);
 assert.deepEqual(f.upcoming.map(t=>t.id),['future','future-late']);
 const groups=[...f.tasks,...f.attention,...f.unscheduled,...f.upcoming];
 assert.equal(new Set(groups.map(t=>t.id)).size,groups.length);
 assert.equal(JSON.stringify(state),before);
});
test('picking a candidate for today moves the same record without changing deadlines or links',()=>{
 const task={id:'pick',title:'Prepare',plannedDate:'2026-10-02',due:'2026-10-05',projectId:'p',moduleId:'m',documentIds:['d'],sourceInboxId:'i'};
 const state={tasks:[task],events:[]},before={...task};
 assert.equal(W.dailyFocus(state,day).upcoming[0],task);
 W.reschedule(state,['pick'],day);
 assert.equal(state.tasks.length,1);
 assert.equal(W.dailyFocus(state,day).tasks[0],task);
 assert.equal(W.dailyFocus(state,day).upcoming.length,0);
 assert.deepEqual(task,{...before,plannedDate:day});
});
