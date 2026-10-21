const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../dist/workflow-model.js');
test('planning groups partition unfinished tasks, put waiting ahead of planned dates and hide empty groups',()=>{
 const tasks=[{id:'loose'},{id:'past',plannedDate:'2026-09-30'},{id:'future',plannedDate:'2026-10-08'},{id:'today',plannedDate:'2026-10-05'},{id:'waiting',status:'waiting',plannedDate:'2026-10-05',followUp:'2026-10-09'},{id:'done',done:true,plannedDate:'2026-10-05'}];
 const before=JSON.stringify(tasks),groups=W.planningGroups(tasks);
 assert.deepEqual(groups.map(g=>[g.id,g.tasks.map(t=>t.id)]),[['unscheduled',['loose']],['scheduled',['past','today','future']],['waiting',['waiting']]]);
 assert.equal(JSON.stringify(tasks),before);assert.equal(groups[0].tasks[0],tasks[0]);
 assert.deepEqual(W.planningGroups([{id:'done',done:true}]),[]);
});
test('waiting group follows follow-up date; unscheduled tasks prioritize due dates',()=>{
 const groups=W.planningGroups([{id:'later',status:'waiting',followUp:'2026-10-10'},{id:'sooner',status:'waiting',followUp:'2026-10-06'},{id:'no-date',status:'waiting',due:'2026-10-01'},{id:'loose'},{id:'due',due:'2026-10-07'}]);
 assert.deepEqual(groups.map(g=>g.tasks.map(t=>t.id)),[['due','loose'],['sooner','later','no-date']]);
});
test('date labels use local calendar arithmetic across month, year and leap-day boundaries',()=>{
 assert.equal(W.shiftDate('2026-12-31',1),'2027-01-01');
 assert.equal(W.shiftDate('2024-02-28',1),'2024-02-29');
 assert.equal(W.shiftDate('2026-03-01',-1),'2026-02-28');
});
