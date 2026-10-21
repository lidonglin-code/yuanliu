/* Shared workflow rules. Existing records remain valid without new fields. */
(function(root){
  const status=t=>t.done?'done':t.status==='waiting'?'waiting':'todo';
  function bucket(t,today){
    if(status(t)==='done')return 'done';
    if(status(t)==='waiting')return 'waiting';
    if(!t.plannedDate)return 'unscheduled';
    return t.plannedDate<today?'past':t.plannedDate===today?'today':'upcoming';
  }
  const overdue=(t,today)=>status(t)!=='done'&&!!t.due&&t.due<today;
  const calendarDate=t=>t.status==='waiting'?(t.followUp||''):(t.plannedDate||'');
  function shiftDate(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function planningGroups(tasks){
    const groups=[{id:'unscheduled',title:'待安排',tasks:[]},{id:'scheduled',title:'已安排',tasks:[]},{id:'waiting',title:'等待回复',tasks:[]}];
    for(const task of tasks){if(task.done)continue;groups[status(task)==='waiting'?2:task.plannedDate?1:0].tasks.push(task);}
    for(const group of groups){const date=t=>group.id==='unscheduled'?(t.due||'9999'):(calendarDate(t)||'9999');group.tasks.sort((a,b)=>date(a).localeCompare(date(b)));}
    return groups.filter(g=>g.tasks.length);
  }
  function creationSeed({type,view,mode,filter,today,selectedDate,projectId,unplanned=false}){
    const planning=['planning','calendar'].includes(view),calendar=view==='calendar'||view==='planning'&&['calendar','month'].includes(mode);
    const seed=planning&&projectId&&projectId!=='none'?{projectId}:{};
    if(type==='task'){
      const date=unplanned?'':view==='focus'?today:calendar?selectedDate:planning&&filter==='today'?today:'';
      return {...seed,plannedDate:date||''};
    }
    if(type==='event')return {...seed,date:calendar?selectedDate:today};
    return {};
  }
  // Views share the original records; attention never duplicates today's planned work.
  function dailyFocus(state,today){
    const tasks=state.tasks.filter(t=>bucket(t,today)==='today');
    const attention=state.tasks.filter(t=>!t.done&&bucket(t,today)!=='today'&&(
      bucket(t,today)==='past'||overdue(t,today)||t.due===today||
      (status(t)==='waiting'&&t.followUp&&t.followUp<=today)
    )).sort((a,b)=>Number(overdue(b,today))-Number(overdue(a,today))||
      (a.due||a.followUp||a.plannedDate||'').localeCompare(b.due||b.followUp||b.plannedDate||''));
    const events=state.events.filter(e=>e.date===today).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const completed=state.tasks.filter(t=>t.done&&t.plannedDate===today);
    const attentionIds=new Set(attention.map(t=>t.id));
    const candidates=state.tasks.filter(t=>!attentionIds.has(t.id));
    const unscheduled=candidates.filter(t=>bucket(t,today)==='unscheduled').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
    const upcoming=candidates.filter(t=>bucket(t,today)==='upcoming').sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||(a.due||'9999').localeCompare(b.due||'9999'));
    return {tasks,events,attention,completed,unscheduled,upcoming};
  }
  function weekDays(day){const d=new Date(day+'T12:00:00');return Array.from({length:7},(_,i)=>{const v=new Date(d);v.setDate(d.getDate()-((d.getDay()+6)%7)+i);return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;});}
  // One useful clue from existing records, without inventing a task priority.
  function homeCue(state,today,time){
    const {tasks,events,attention,completed}=dailyFocus(state,today);
    const active=events.find(e=>e.time&&e.endTime&&e.time<=time&&time<e.endTime);
    const upcoming=events.find(e=>e.time&&e.time>=time);
    const event=active||upcoming||events.find(e=>!e.time);
    if(event)return {label:active?'正在进行':event.time?'下一场日程':'全天日程',title:event.title,time:event.time||'全天'};
    const nextIds=new Set((state.projects||[]).filter(p=>p.status!=='done'&&p.nextTaskId&&tasks.some(t=>t.id===p.nextTaskId&&t.projectId===p.id)).map(p=>p.nextTaskId));
    const task=tasks.slice().sort((a,b)=>Number(nextIds.has(b.id))-Number(nextIds.has(a.id))||(a.due||'9999').localeCompare(b.due||'9999'))[0];
    if(task)return {label:'今天推进',title:task.title,time:''};
    if(attention.length)return {label:'待留意',title:attention[0].title,time:''};
    return {label:'',title:completed.length?'今天安排的任务已完成，留一点时间给自己。':events.length?'今天的定时日程已过，按自己的节奏继续。':'今天还没有安排，按自己的节奏开始。',time:''};
  }
  const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function monthDays(day){
    const first=new Date(day.slice(0,7)+'-01T12:00:00'),last=new Date(first.getFullYear(),first.getMonth()+1,0,12),offset=(first.getDay()+6)%7;
    const count=Math.max(35,Math.ceil((offset+last.getDate())/7)*7);
    return Array.from({length:count},(_,i)=>{const date=new Date(first);date.setDate(1-offset+i);return localDate(date);});
  }
  function shiftMonth(day,amount){
    const date=new Date(day+'T12:00:00'),wanted=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+amount);
    const last=new Date(date.getFullYear(),date.getMonth()+1,0,12).getDate();date.setDate(Math.min(wanted,last));return localDate(date);
  }
  function reschedule(state,ids,date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('请选择有效日期');
    for(const t of state.tasks){if(!ids.includes(t.id)||status(t)==='done')continue;t[status(t)==='waiting'?'followUp':'plannedDate']=date;}
  }
  function nextTask(state,project){return state.tasks.find(t=>t.id===project.nextTaskId&&t.projectId===project.id)}
  function nextText(state,project){
    if(!project.nextTaskId)return project.next||'还没有确定下一步';
    const task=nextTask(state,project);
    if(!task)return '原任务已移除或移出项目，请选择下一步';
    return task.done?'已完成：'+task.title+' · 请安排下一步':task.title;
  }
  function taskReminders(state,today,limit){
    return state.tasks.filter(t=>!t.done).flatMap(t=>{
      const parts=[];let date='';
      if(t.due&&t.due<=limit){parts.push((t.due<today?'已逾期':'即将截止')+' · '+t.due);date=t.due;}
      if(status(t)==='waiting'&&(!t.followUp||t.followUp<=today)){
        parts.push('等待'+(t.waitingFor||'对方')+'回复 · '+(t.followUp?'跟进 '+t.followUp:'请安排跟进日期'));
        if(!date||t.followUp&&t.followUp<date)date=t.followUp||today;
      }
      return parts.length?[{kind:'任务',title:t.title,detail:parts.join('；'),tone:t.due&&t.due<today?'urgent':'waiting',action:'task:'+t.id,sortDate:date}]:[];
    });
  }
  function saveRecord(state,type,item,inboxId){
    const key={task:'tasks',event:'events',project:'projects',note:'notes'}[type];
    const source=inboxId&&state.inbox.find(x=>x.id===inboxId);
    if(inboxId&&(!source||source.processed))throw Error('这条收件箱内容已经整理，请关闭后查看已整理记录。');
    if(source)Object.assign(item,{sourceInboxId:source.id,sourceText:source.text});
    const index=state[key].findIndex(x=>x.id===item.id);
    if(index<0)state[key].unshift(item);else state[key][index]={...state[key][index],...item};
    if(source){const targets=inboxTargets(source);if(!targets.some(t=>t.type===type&&t.id===item.id))targets.push({type,id:item.id});Object.assign(source,{processed:false,targets,targetType:type,targetId:item.id});}
    return item;
  }
  function inboxTargets(source){return Array.isArray(source.targets)?source.targets:(source.targetId?[{type:source.targetType,id:source.targetId}]:[]);}
  function finishInbox(state,id,processed=true){const source=state.inbox.find(x=>x.id===id);if(!source)throw Error('原始信息已不存在');source.targets=inboxTargets(source);source.processed=processed;source.processedAt=processed?new Date().toISOString():'';}
  function closeout(state,projectId){
    const tasks=state.tasks.filter(t=>t.projectId===projectId&&!t.done);
    const looseItems=(state.training||[]).filter(c=>c.projectId===projectId&&!c.archived).flatMap(c=>(c.items||[]).filter(i=>!i.done&&!state.tasks.some(t=>t.id===i.taskId)).map(i=>({title:i.title,recordTitle:c.title})));
    return {tasks,looseItems,documents:state.notes.filter(n=>n.projectId===projectId)};
  }
  function completeProject(state,project,{acknowledged=false,documentIds=[]}={}){
    const pending=closeout(state,project.id);if((pending.tasks.length||pending.looseItems.length)&&!acknowledged)throw Error('请先确认剩余事项的处理方式');
    project.status='done';project.completedAt=new Date().toISOString();project.finalDocumentIds=[...new Set(documentIds)].filter(id=>pending.documents.some(n=>n.id===id));
    project.closeoutAcknowledged=acknowledged;return project;
  }
  // Store the destination on the proposal so editing and confirming share one completion path.
  function completeAssistantAction(state,index,type,id){
    const message=state.aiMessages?.[index];
    if(!message?.action||message.action.type!==type)throw Error('助理草稿已失效，请重新打开。');
    if(message.confirmed)throw Error('这条内容已经保存。');
    if(!id)throw Error('缺少保存记录。');
    Object.assign(message,{confirmed:true,targetType:type,targetId:id});
  }
  const api={shiftDate,planningGroups,creationSeed,inboxTargets,finishInbox,closeout,completeProject,completeAssistantAction,status,bucket,overdue,calendarDate,dailyFocus,homeCue,weekDays,monthDays,shiftMonth,reschedule,nextTask,nextText,taskReminders,saveRecord};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WorkflowModel=api;
})(typeof window==='undefined'?globalThis:window);
