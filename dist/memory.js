window.createWorkMemory=function(api){
  const M=MemoryModel,e=api.esc;
  let kind='all',filter='',query='',scope='',routeScope='';
  const all=()=>api.getState().memories||[],projects=()=>api.getState().projects;
  const find=id=>all().find(m=>m.id===id);
  const options=(items,value)=>items.map(([id,label])=>`<option value="${e(id)}" ${id===value?'selected':''}>${e(label)}</option>`).join('');
  const button=(label,action,id='',cls='text-button')=>`<button type="button" class="${cls}" data-memory-action="${action}" data-memory-id="${e(id)}">${label}</button>`;
  const stamp=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('zh-CN'):'日期未记录';};
  const scopeName=m=>m.projectId?projects().find(p=>p.id===m.projectId)?.title||'原项目已移除':'通用背景';
  const kindMatches=(m,id)=>id==='preference'?['preference','habit'].includes(m.kind):m.kind===id;
  const dialog=document.createElement('dialog');dialog.id='memory-editor';dialog.className='memory-dialog';dialog.setAttribute('aria-labelledby','memory-dialog-title');document.body.append(dialog);
  function row(m){
    const s=M.status(m);let url='';try{url=M.link(m.sourceUrl);}catch{}
    return `<article class="memory-row"><div class="memory-row-meta"><span>${e(M.kinds[m.kind]||'工作记忆')}</span><span class="memory-status status-${s}">${M.statuses[s]}</span><span>${e(scopeName(m))}</span></div><h3>${e(m.title)}</h3><p class="memory-body">${e(m.body)}</p><div class="memory-provenance">来源：${e(m.sourceLabel||'手动记录')}${url?` · <a href="${e(url)}" target="_blank" rel="noopener noreferrer">查看来源</a>`:''}${m.sourceText?`<details><summary>查看原始输入</summary><p>${e(m.sourceText)}</p></details>`:''}</div><div class="memory-row-foot"><span>更新于 ${stamp(m.updatedAt)}${m.expiresAt?' · '+e(m.expiresAt)+' 起失效':''} · ${s==='confirmed'&&m.allowAI&&(!m.projectId||projects().some(p=>p.id===m.projectId))?'智能模式自动读取':'不参与 AI 上下文'}</span><div>${s==='deleted'?button('恢复','restore',m.id):`${s==='pending'?button('确认记忆','confirm',m.id):''}${button('编辑','edit',m.id)}${s!=='expired'?button('标记过期','expire',m.id):''}${button('移入回收站','delete',m.id)}`}</div></div></article>`;
  }
  function currentWork(){
    const state=api.getState(),items=projects().filter(p=>p.status!=='done'&&(!scope||(scope!=='__global'&&p.id===scope))&&[p.title,p.description].join(' ').toLowerCase().includes(query.toLowerCase()));
    return `<div class="memory-live-intro"><span class="memory-live-dot"></span>实时关联已有项目、任务与日程，修改原记录后这里同步更新。</div>${items.map(p=>{const tasks=state.tasks.filter(t=>t.projectId===p.id&&!t.done),events=state.events.filter(v=>v.projectId===p.id&&v.date>=new Date().toLocaleDateString('sv-SE'));return `<article class="memory-row"><div class="memory-row-meta"><span>当前项目</span><span>${e(({planning:'筹备中',doing:'进行中',blocked:'待处理'})[p.status]||'进行中')}</span></div><h3><a href="#project-${e(encodeURIComponent(p.id))}">${e(p.title)}</a></h3><p class="memory-body">${e(p.description||'还没有填写项目目标，可在项目中补充。')}</p><div class="memory-row-foot"><span>${tasks.length} 项未完成任务 · ${events.length} 场待开展日程${p.due?' · 目标 '+e(p.due):''}</span>${button('记下项目背景','project-new',p.id)}</div></article>`;}).join('')||'<div class="memory-empty"><h3>当前没有匹配的进行中项目</h3><p>项目进度会从「项目纵横」自动关联过来。</p><a class="text-button" href="#projects">前往项目纵横 →</a></div>'}`;
  }
  function results(){
    if(kind==='current')return currentWork();
    const items=all().filter(m=>(filter?M.status(m)===filter:M.status(m)!=='deleted')&&(kind==='all'||kindMatches(m,kind))&&(!scope||(scope==='__global'?!m.projectId:m.projectId===scope))&&[m.title,m.body,m.sourceLabel,scopeName(m)].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
    return `<div class="memory-result-count" role="status">${items.length} 条记忆 · 最近更新优先</div>${items.length?items.map(row).join(''):`<div class="memory-empty"><span class="memory-empty-symbol">✧</span><h3>${all().length?'没有匹配的记忆':'让下一次协助，从了解你开始'}</h3><p>${all().length?'可以换一个关键词或清除筛选。':'先记下你的职责、表达偏好、长期规则、项目背景或关键决定。'}</p>${all().length?button('清除筛选','reset','','button'):button('写下第一条记忆','new','','button primary')}</div>`}`;
  }
  function refreshResults(){const box=document.querySelector('#memory-results');if(box)box.innerHTML=results();}
  function render(projectScope=''){
    if(projectScope!==routeScope){scope=projectScope;routeScope=projectScope;kind='all';filter='';query='';}
    const active=all().filter(m=>M.status(m)!=='deleted');
    const sections=[['all','全部记忆'],['profile','我的职责'],['preference','表达偏好'],['rule','长期规则'],['current','当前工作'],['project','项目背景'],['decision','关键决定']];
    const autoCount=active.filter(m=>M.status(m)==='confirmed'&&m.allowAI&&(!m.projectId||projects().some(p=>p.id===m.projectId))).length;
    return `<section class="memory-workspace"><div class="memory-banner"><div class="memory-totals"><span><b>${autoCount}</b>自动读取</span><span><b>${projects().filter(p=>p.status!=='done').length}</b>当前项目</span></div></div><p class="memory-mode">智能模式会在每次回答前自动结合已确认的长期记忆与当前项目。只有允许 AI 使用且未过期的记忆会进入上下文；外部文档只提供名称，不读取正文。</p><div class="memory-toolbar"><label class="memory-search">⌕ <input id="memory-search" type="search" aria-label="搜索工作记忆" placeholder="搜索职责、偏好、规则、背景或决定" value="${e(query)}"></label><label>范围<select id="memory-scope" aria-label="记忆使用范围">${options([['','全部范围'],['__global','通用背景'],...projects().map(p=>[p.id,p.title]),...(scope&&!['__global',''].includes(scope)&&!projects().some(p=>p.id===scope)?[[scope,'原项目已移除']]:[])],scope)}</select></label><label>状态<select id="memory-status" aria-label="记忆状态" ${kind==='current'?'disabled':''}>${options([['','全部状态'],...Object.entries(M.statuses)],filter)}</select></label></div><div class="memory-layout"><nav class="memory-sections" aria-label="记忆分类">${sections.map(([id,label])=>`<button data-memory-kind="${id}" aria-pressed="${kind===id}" class="${kind===id?'active':''}">${label}<span>${id==='current'?'实时':id==='all'?active.length:active.filter(m=>kindMatches(m,id)).length}</span></button>`).join('')}<p>通用记忆长期生效；项目记忆与对应项目的短期工作一起提供给 AI。</p></nav><div id="memory-results">${results()}</div></div></section>`;
  }
  function edit(id='',seed={}){
    const old=id?find(id):null;if(id&&!old)return api.toast('这条记忆已不存在');
    const m=old||{kind:Object.hasOwn(M.kinds,kind)?kind:'profile',projectId:scope==='__global'?'':scope,status:'confirmed',allowAI:true,...seed};
    const sourceProjects=[['','通用背景（跨项目）'],...projects().map(p=>[p.id,p.title])];
    if(m.projectId&&!projects().some(p=>p.id===m.projectId))sourceProjects.push([m.projectId,'原项目已移除，请重新选择']);
    const kindOptions=Object.entries(M.kinds).filter(([kindId])=>kindId!=='habit'||m.kind==='habit');
    dialog.innerHTML=`<form><div class="dialog-head"><div><span class="eyebrow">WORK MEMORY</span><h2 id="memory-dialog-title">${id?'编辑':'添加'}工作记忆</h2></div>${button('×','close','','close')}</div><div class="memory-form-grid"><label class="field memory-full">标题<input name="title" aria-label="记忆标题" maxlength="100" required value="${e(m.title||'')}" placeholder="例如：我负责企业培训项目的全流程管理"></label><label class="field memory-full">记忆内容<textarea name="body" aria-label="记忆内容" required maxlength="12000" rows="5" placeholder="写清职责、偏好、长期规则、项目背景或关键决定……">${e(m.body||'')}</textarea></label><label class="field">分类<select name="kind">${options(kindOptions,m.kind)}</select></label><label class="field">使用范围<select name="projectId">${options(sourceProjects,m.projectId||'')}</select></label><label class="field">状态<select name="status">${options(Object.entries(M.statuses).filter(([s])=>s!=='deleted'),M.status(m))}</select></label><label class="field">失效日期（选填）<input type="date" name="expiresAt" value="${e(m.expiresAt||'')}"></label><label class="field">来源说明<input name="sourceLabel" maxlength="300" value="${e(m.sourceLabel||'手动记录')}" placeholder="例如：本人确认的工作原则"></label><label class="field">来源链接（选填）<input type="url" name="sourceUrl" value="${e(m.sourceUrl||'')}" placeholder="https://…"></label><label class="memory-consent memory-full"><input type="checkbox" name="allowAI" ${m.allowAI?'checked':''}>加入智能上下文，由 AI 在每次回答前读取</label><p class="meta memory-full">已确认、未过期且允许使用的记忆会自动进入智能上下文；发送前可展开查看实际内容。</p></div><p class="error" role="alert"></p><div class="dialog-actions">${button('取消','close','','button')}<button class="button primary" type="submit">保存记忆</button></div></form>`;
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();const input=Object.fromEntries(new FormData(event.target));input.allowAI=event.target.elements.allowAI.checked;
      try{const record=M.build(input,old,projects(),api.uid());if(!old&&seed.sourceText)record.sourceText=seed.sourceText;
        if(api.commit(next=>{M.initialize(next);const index=next.memories.findIndex(v=>v.id===record.id);if(index<0)next.memories.unshift(record);else next.memories[index]=record;})){dialog.close();api.refresh();api.toast('工作记忆已保存');}
        else dialog.querySelector('.error').textContent='未能保存，输入内容已保留，请稍后重试。';
      }catch(error){dialog.querySelector('.error').textContent=error.message;}
    };
    dialog.showModal();dialog.querySelector('[name="title"]').focus();
  }
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-memory-kind]');if(tab){kind=tab.dataset.memoryKind;api.refresh();document.querySelector(`[data-memory-kind="${kind}"]`)?.focus();return;}
    const target=event.target.closest('[data-memory-action]');if(!target)return;
    const action=target.dataset.memoryAction,id=target.dataset.memoryId;
    if(action==='close'){dialog.close();return;}
    if(action==='new'){edit();return;}if(action==='edit'){edit(id);return;}
    if(action==='project-new'){edit('',{projectId:id,kind:'project'});return;}
    if(action==='reset'){query='';filter='';scope='';api.refresh();return;}
    const item=find(id);if(!item)return;
    if(api.commit(next=>{const index=next.memories.findIndex(m=>m.id===id),m=next.memories[index];
      if(action==='delete')next.memories[index]=M.remove(m);
      else if(action==='restore')next.memories[index]=M.restore(m);
      else if(action==='confirm'||action==='expire'){m.status=action==='confirm'?'confirmed':'expired';m.updatedAt=new Date().toISOString();}
    })){api.refresh();api.toast(action==='delete'?'已移入回收站，可随时恢复':'记忆已更新');}
  });
  document.addEventListener('input',event=>{if(event.target.id==='memory-search'){query=event.target.value;refreshResults();}});
  document.addEventListener('change',event=>{if(event.target.id==='memory-scope'){scope=event.target.value;refreshResults();}if(event.target.id==='memory-status'){filter=event.target.value;refreshResults();}});
  return {render,edit};
};
