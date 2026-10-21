(function(root){
  const node=typeof module!=='undefined'&&module.exports;
  const P=node?require('./project-model.js'):root.ProjectModel;
  const D=node?require('./document-model.js'):root.DocumentModel;
  const kinds={prompt:'prompts',skill:'skills',agent:'agents'};
  function tools(state,refs=[]){return [...new Set(Array.isArray(refs)?refs:[])].flatMap(key=>{if(typeof key!=='string')return [];const i=key.indexOf(':'),kind=key.slice(0,i),id=key.slice(i+1),item=(state[kinds[kind]]||[]).find(x=>x.id===id);return item?[{key,kind,item}]:[];});}
  function linkedTools(state,type,record){const parent=type==='task'?(state.projects||[]).find(p=>p.id===record.projectId):null;return tools(state,[...(record.toolRefs||[]),...(parent?.toolRefs||[])]);}
  function date(value){if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||isNaN(Date.parse(value))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value))throw Error('请选择有效日期。');return value||'';}
  function reply(state,id,data,newId,now=new Date().toISOString()){
    const task=state.tasks.find(t=>t.id===id);if(!task||task.done||task.status!=='waiting')throw Error('这项任务已不在等待回复，请关闭后查看最新状态。');
    const action=data.action;if(!['resume','next','done'].includes(action))throw Error('请选择收到回复后的处理方式。');
    const plannedDate=date(data.plannedDate),title=String(data.title||'').trim();
    if(action==='next'&&(!title||!newId||state.tasks.some(t=>t.id===newId)))throw Error('请填写下一步任务。');
    const project=state.projects.find(p=>p.id===task.projectId);
    const entry={at:now,waitingFor:task.waitingFor||'',waitingReason:task.waitingReason||'',followUp:task.followUp||'',note:String(data.note||'').trim(),action};
    let next;
    if(action==='next'){
      const moduleId=P.taskModule(project,task,state.training||[]);
      next={id:newId,title,done:false,status:'todo',plannedDate,projectId:project?.id||'',moduleId,projectStage:moduleId||'general',documentIds:D.linked(state,task).map(n=>n.id),toolRefs:tools(state,task.toolRefs).map(x=>x.key),sourceTaskId:id,createdAt:now,updatedAt:now};
      entry.nextTaskId=newId;state.tasks.unshift(next);
      if(project?.nextTaskId===id)project.nextTaskId=newId;
    }
    task.replyHistory=[...(task.replyHistory||[]),entry];task.status=action==='resume'?'todo':'done';task.done=action!=='resume';task.followUp='';task.waitingFor='';task.waitingReason='';task.updatedAt=now;
    if(action==='resume')task.plannedDate=plannedDate;else task.completedAt=now;
    return {task,next};
  }
  function continuation(state,project){
    const modules=P.modules(project),pending=state.tasks.filter(t=>t.projectId===project.id&&!t.done),explicit=pending.find(t=>t.id===project.nextTaskId),focus=modules.find(m=>m.id===(project.focusModuleId||project.stage));
    const ranked=[...pending].sort((a,b)=>Number(a.status==='waiting')-Number(b.status==='waiting')||Number(P.taskModule(project,b,state.training)===focus?.id)-Number(P.taskModule(project,a,state.training)===focus?.id)||(a.status==='waiting'?(a.followUp||'9999'):(a.plannedDate||a.due||'9999')).localeCompare(b.status==='waiting'?(b.followUp||'9999'):(b.plannedDate||b.due||'9999')));
    const task=explicit||ranked[0],module=task?modules.find(m=>m.id===P.taskModule(project,task,state.training)):focus;
    const waiting=pending.filter(t=>t.status==='waiting').sort((a,b)=>(a.followUp||'9999').localeCompare(b.followUp||'9999'));
    const docs=(state.notes||[]).filter(n=>(task?.documentIds||[]).includes(n.id)||n.projectId===project.id&&(D.scope(n,modules)==='general'||module&&D.moduleIds(n,modules).includes(module.id))).sort((a,b)=>Number((task?.documentIds||[]).includes(b.id))-Number((task?.documentIds||[]).includes(a.id)));
    return {task,module,waiting,docs,explicit:!!explicit};
  }
  function prompt(state,type,record,body){
    const project=type==='project'?record:state.projects.find(p=>p.id===record.projectId),task=type==='task'?record:null,module=task?P.modules(project).find(m=>m.id===P.taskModule(project,task,state.training)):null;
    const values={'项目名称':project?.title||'','项目目标':project?.description||'','任务名称':task?.title||'','模块名称':module?.title||''};
    const filled=String(body||'').replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(all,key)=>values[key]||all);
    const docs=task?D.linked(state,task):(state.notes||[]).filter(n=>n.projectId===project?.id&&D.scope(n,P.modules(project))==='general');
    const context=[project?.title&&'项目：'+project.title,project?.description&&'项目目标：'+project.description,module&&'模块：'+module.title,task&&'当前任务：'+task.title,task?.description&&'任务说明：'+task.description,task?.due&&'截止日期：'+task.due,...docs.filter(n=>D.kind(n)==='web').map(n=>'相关文档：'+n.title+' '+n.url)].filter(Boolean);
    return filled+(context.length?'\n\n工作背景（文档仅提供链接，正文未读取）：\n'+context.join('\n'):'');
  }
  const api={tools,linkedTools,reply,continuation,prompt};if(node)module.exports=api;else root.WorkSupportModel=api;
})(typeof window==='undefined'?globalThis:window);
