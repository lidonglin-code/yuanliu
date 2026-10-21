/* Project -> module -> task. Legacy training stages retain their stable IDs. */
(function(root){
  const trainingModules=[['demand','需求澄清'],['design','方案设计'],['content','内容开发'],['prepare','开班准备'],['delivery','培训实施'],['evaluation','效果评估'],['review','复盘沉淀']];
  function isTraining(p){return !!p&&(p.projectMode?p.projectMode==='training':p.category==='培训项目'||p.stage!=='general'&&(!!p.trainingId||trainingModules.some(([id])=>id===p.stage)));}
  function modules(p){
    if(!p)return [];
    const saved=Array.isArray(p.modules)?p.modules:[];
    const base=isTraining(p)?trainingModules.map(([id,title])=>({id,title,description:'',...saved.find(m=>m.id===id)})):[];
    return [...base,...saved.filter(m=>m&&m.id&&m.title&&!base.some(b=>b.id===m.id))];
  }
  function taskModule(p,t,records=[]){
    if(!p||t.projectId!==p.id)return '';
    const linked=records.find(r=>r.id===t.trainingId),linkedStage=({demand:'demand',checklist:'prepare',review:'review'})[linked?.type];
    const id=linkedStage&&modules(p).some(m=>m.id===linkedStage)?linkedStage:t.moduleId!==undefined?t.moduleId:(t.projectStage&&t.projectStage!=='general'?t.projectStage:linkedStage)||'';
    return modules(p).some(m=>m.id===id)?id:'';
  }
  function saveModule(p,data,id){
    const title=String(data.title||'').trim();if(!title)throw Error('请填写模块名称。');
    const list=modules(p);if(list.some(m=>m.id!==id&&m.title.toLowerCase()===title.toLowerCase()))throw Error('这个项目里已有同名模块。');
    if(id&&!list.some(m=>m.id===id))throw Error('模块已不存在，请刷新后重试。');
    const item={...(list.find(m=>m.id===id)||{}),id:id||data.id,title,description:String(data.description||'').trim()};
    if(!item.id)throw Error('模块标识不能为空。');
    p.modules=id?list.map(m=>m.id===id?item:m):[...list,item];return item;
  }
  function assignTask(p,t,moduleId){
    if(!p||t.projectId!==p.id)throw Error('任务不属于这个项目。');
    if(moduleId&&!modules(p).some(m=>m.id===moduleId))throw Error('请选择这个项目下的模块。');
    t.moduleId=moduleId||'';t.projectStage=isTraining(p)&&trainingModules.some(([id])=>id===moduleId)?moduleId:'general';
    return t;
  }
  function projectHash(id,{tab='modules',moduleId='',filter='all'}={}){
    const query=new URLSearchParams({tab});if(moduleId&&tab==='modules')query.set('module',moduleId);if(filter!=='all'&&tab==='modules')query.set('filter',filter);
    return '#project-'+encodeURIComponent(id)+'?'+query.toString();
  }
  function parseProjectHash(hash){
    const raw=String(hash).replace(/^#/,'');if(!raw.startsWith('project-'))return null;
    const [path,query='']=raw.split('?');let id;try{id=decodeURIComponent(path.slice(8));}catch{return null;}if(!id)return null;
    const params=new URLSearchParams(query),tab=params.get('tab'),filter=params.get('filter');
    return {id,tab:['modules','schedule','materials','overview'].includes(tab)?tab:'modules',moduleId:params.get('module')||'',filter:['todo','waiting','overdue','done'].includes(filter)?filter:'all'};
  }
  function sourceContext(state,record,recordType){
    const task=record.sourceTaskId?state.tasks.find(t=>t.id===record.sourceTaskId):null;
    const p=state.projects.find(p=>p.id===(record.originProjectId||record.projectId||task?.projectId));if(!p)return null;
    if(recordType==='event')return {project:p,tab:'schedule',moduleId:'',moduleTitle:''};
    const moduleId=record.sourceStage==='general'?'':record.sourceStage||taskModule(p,task||record,state.training||[]);
    const valid=modules(p).some(m=>m.id===moduleId);
    return {project:p,tab:record.sourceStage==='general'?'overview':recordType==='note'&&!valid?'materials':'modules',moduleId:valid?moduleId:'',moduleTitle:valid?modules(p).find(m=>m.id===moduleId).title:''};
  }
  const api={trainingModules,isTraining,modules,taskModule,saveModule,assignTask,projectHash,parseProjectHash,sourceContext};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProjectModel=api;
})(typeof window==='undefined'?globalThis:window);
