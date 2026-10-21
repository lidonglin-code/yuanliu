(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.MemoryModel=model;})(typeof window==='undefined'?globalThis:window,()=>{
  const kinds={profile:'我的职责',preference:'表达偏好',rule:'长期规则',project:'项目背景',decision:'关键决定',habit:'工作习惯'};
  const statuses={pending:'待确认',confirmed:'已确认',expired:'已过期',deleted:'回收站'};
  const text=value=>typeof value==='string'?value.trim():'';
  function initialize(state){if(!Array.isArray(state.memories))state.memories=[];}
  function today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function status(item,date=today()){
    if(item.status==='deleted')return 'deleted';
    if(item.status==='expired'||(item.expiresAt&&item.expiresAt<=date))return 'expired';
    return item.status==='confirmed'?'confirmed':'pending';
  }
  function link(value){if(!text(value))return '';const url=new URL(text(value));if(url.username||url.password)throw Error('来源链接不能包含账号或密码。');if(!['https:','http:'].includes(url.protocol))throw Error('来源链接请使用 http 或 https 地址。');return url.href;}
  function build(input,old,projects,id,now=new Date().toISOString()){
    const title=text(input.title),body=text(input.body),projectId=text(input.projectId);
    if(!title||!body)throw Error('请填写记忆标题和内容。');
    if(title.length>100||body.length>12000)throw Error('标题最多 100 字，内容最多 12000 字。');
    if(projectId&&!projects.some(p=>p.id===projectId))throw Error('关联项目已不存在，请重新选择使用范围。');
    const expiresAt=text(input.expiresAt);
    if(expiresAt&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)||!Number.isFinite(Date.parse(expiresAt))||new Date(expiresAt).toISOString().slice(0,10)!==expiresAt))throw Error('请选择有效的失效日期。');
    return {...old,id:old?.id||id,title,body,kind:Object.hasOwn(kinds,input.kind)?input.kind:'profile',projectId,
      status:['pending','confirmed','expired'].includes(input.status)?input.status:'pending',
      allowAI:input.allowAI===true,sourceLabel:text(input.sourceLabel),sourceUrl:link(input.sourceUrl),expiresAt,
      createdAt:old?.createdAt||now,updatedAt:now};
  }
  // Future model integration must request the exact project scope; no cross-project retrieval.
  function eligible(state,projectId='',date=today()){
    return (state.memories||[]).filter(m=>status(m,date)==='confirmed'&&m.allowAI===true&&
      (!m.projectId||(m.projectId===projectId&&(state.projects||[]).some(p=>p.id===projectId))));
  }
  function remove(item,now=new Date().toISOString()){return {...item,previousStatus:item.status,status:'deleted',updatedAt:now};}
  function restore(item,now=new Date().toISOString()){return {...item,status:['confirmed','pending','expired'].includes(item.previousStatus)?item.previousStatus:'pending',updatedAt:now};}
  return {kinds,statuses,initialize,status,link,build,eligible,remove,restore};
});
