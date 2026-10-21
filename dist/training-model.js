/* Local training workflows. No sample records or external services. */
(function(root){
  const types={demand:'培训需求卡',checklist:'开班准备清单',review:'课后复盘卡'};
  const steps=['确认讲师与授课内容','确认参训名单','发送培训通知','确认场地与设备','准备课件及学员材料','准备签到方式','准备评价问卷','确认现场分工'];
  const day=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const complete=(state,item)=>item.taskId?!!state.tasks.find(t=>t.id===item.taskId)?.done:!!item.done;
  function reminders(state,today=day()){
    const end=new Date(today+'T12:00:00');end.setDate(end.getDate()+7);const limit=new Date(end-end.getTimezoneOffset()*60000).toISOString().slice(0,10);
    return (state.training||[]).filter(c=>!c.archived).flatMap(c=>{
      if(c.type==='demand'&&c.stage==='waiting'&&(!c.followUp||c.followUp<=today))return [{id:c.id,title:c.title,detail:`等待${c.contact||'对方'}反馈${c.followUp?' · '+c.followUp:''}`,tone:'waiting'}];
      if(c.type==='checklist'&&c.date&&c.date<=limit){const n=(c.items||[]).filter(i=>!complete(state,i)).length;return n?[{id:c.id,title:c.title,detail:`${c.date<today?'已到开班日期':'即将开班'} · ${c.date} · ${n} 项未完成`,tone:'urgent'}]:[];}
      if(c.type==='review'){const n=(c.items||[]).filter(i=>!complete(state,i)).length;return n?[{id:c.id,title:c.title,detail:`复盘后还有 ${n} 项改进待跟进`,tone:'follow'}]:[];}
      return [];
    });
  }
  function taskFor(state,card,item,id){
    let task=state.tasks.find(t=>t.id===item.taskId);
    if(!task){task={id:id(),title:item.title,due:item.due||'',done:!!item.done,projectId:card.projectId||'',trainingId:card.id,trainingItemId:item.id};state.tasks.unshift(task);item.taskId=task.id;}
    return task;
  }
  function sync(state,card){
    for(const item of card.items||[]){const task=state.tasks.find(t=>t.id===item.taskId);if(task){task.title=item.title;task.due=item.due||'';task.projectId=card.projectId||'';}}
    const follow=state.tasks.find(t=>t.id===card.followTaskId);
    if(follow)Object.assign(follow,{title:'跟进培训需求：'+card.title,followUp:card.followUp||'',waitingFor:card.contact||'',status:card.stage==='waiting'?'waiting':'todo',projectId:card.projectId||''});
    const event=state.events.find(e=>e.id===card.eventId);
    if(event){
      Object.assign(event,{title:card.title,date:card.date,time:card.time||'',location:card.location||'',projectId:card.projectId||''});
      if(event.endTime&&(!event.time||event.endTime<=event.time))event.endTime='';
    }
    // Moving the source also moves its published document, without overwriting edited content.
    const note=state.notes.find(n=>n.id===card.noteId);if(note){if(note.projectId!==(card.projectId||'')){note.moduleIds=[];note.moduleScope='unassigned';}note.projectId=card.projectId||'';if(note.resourceType==='review')note.title=card.title+' · 复盘';}
  }
  function addAllTasks(state,card,id){let count=0;for(const item of card.items||[]){if(!state.tasks.some(t=>t.id===item.taskId)){taskFor(state,card,item,id);count++;}}return count;}
  function publishReview(state,card,id){
    let note=state.notes.find(n=>n.id===card.noteId);
    if(!note){note={id:id(),moduleIds:card.projectId?['review']:[],moduleScope:card.projectId?'modules':'unassigned'};state.notes.unshift(note);card.noteId=note.id;}
    // Existing online/local references stay intact. Old text remains as a read-only historical snapshot.
    if(!['web','local'].includes(note.resourceType)&&!note.url&&!note.path)Object.assign(note,{resourceType:'review',title:card.title+' · 复盘',category:'培训复盘'});
    Object.assign(note,{projectId:card.projectId||'',trainingId:card.id,updatedAt:new Date().toLocaleString('zh-CN')});return note;
  }
  function initializeReviewLinks(state){for(const card of state.training||[]){if(card.type!=='review')continue;const note=state.notes.find(n=>n.id===card.noteId);if(note&&(!note.trainingId||note.trainingId===card.id)&&!note.url&&!note.path&&!['web','local'].includes(note.resourceType)){note.resourceType='review';note.trainingId=card.id;}}state.reviewLinksVersion=1;}
  const api={addAllTasks,initializeReviewLinks,types,steps,complete,reminders,taskFor,sync,publishReview,day};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrainingModel=api;
})(typeof window==='undefined'?globalThis:window);
