window.createAgentLibrary=function(api){
  const M=window.AgentModel,e=api.esc;
  let query='',category='',status='',editingId='';
  const all=()=>api.getState().agents||[],find=id=>all().find(s=>s.id===id);
  const dialog=document.createElement('dialog');dialog.className='skill-dialog agent-dialog';dialog.setAttribute('aria-labelledby','agent-dialog-title');document.body.append(dialog);
  const action=(text,kind,id='',cls='text-button')=>`<button class="${cls}" data-agent-action="${kind}" data-id="${e(id)}">${text}</button>`;
  const external=(url,text,cls='text-button')=>`<a class="${cls}" href="${e(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  function card(s){
    const source=M.source(s.url);let url='';try{url=M.link(s.url);}catch{}
    return `<article class="skill-card agent-card"><div class="skill-card-top"><span class="skill-glyph agent-monogram" aria-hidden="true">${e(Array.from(s.title||'A')[0].toUpperCase())}</span><span class="skill-source"><strong>${e(s.category||'未分类')}</strong><small>${e(source.host)}</small></span><button class="prompt-pin ${s.pinned?'active':''}" data-agent-action="pin" data-id="${e(s.id)}" aria-pressed="${!!s.pinned}" aria-label="${s.pinned?'取消置顶':'置顶'}网站：${e(s.title)}">${s.pinned?'★':'☆'}</button><details class="prompt-menu"><summary aria-label="管理网站：${e(s.title)}">⋯</summary><div>${action('移除收藏','remove',s.id)}</div></details></div><h3>${action(e(s.title),'view',s.id,'library-title-button')}</h3><p class="skill-description">${e(s.description||'还没有用途说明，点「编辑」记下它能帮你做什么。')}</p><div class="skill-labels"><span class="skill-status status-${Object.hasOwn(M.statuses,s.status)?s.status:'saved'}">${e(M.statuses[s.status]||'待试用')}</span><span>${e(s.category||'未分类')}</span>${M.tags(s.tags).map(t=>`<span># ${e(t)}</span>`).join('')}</div><div class="skill-card-actions">${action('编辑','edit',s.id)}${action('复制链接','copy',s.id)}${url?external(url,'访问','button skill-open'):'<span class="error">请编辑地址</span>'}</div></article>`;
  }
  function results(){
    const items=all(),cats=TaxonomyModel.orderedUsed(api.getState(),'agents');if(category&&!cats.includes(category))category='';
    const searched=items.filter(s=>M.matches(s,query)),shown=window.orderLibrary(searched.filter(s=>(!category||(s.category||'未分类')===category)&&(!status||(status==='pinned'?s.pinned:s.status===status))));
    return `<aside class="library-sidebar"><span class="library-sidebar-label">分类浏览</span><div class="prompt-categories" aria-label="网站分类"><button data-agent-category="" aria-pressed="${!category&&status!=='pinned'}" class="${!category&&status!=='pinned'?'active':''}">全部 <span>${searched.length}</span></button><button data-agent-pinned aria-pressed="${status==='pinned'}" class="${status==='pinned'?'active':''}">已置顶 <span>${searched.filter(s=>s.pinned).length}</span></button>${cats.map(c=>`<button data-agent-category="${e(c)}" aria-pressed="${category===c}" class="${category===c?'active':''}">${e(c)} <span>${searched.filter(s=>(s.category||'未分类')===c).length}</span></button>`).join('')}</div></aside><div class="library-result-main"><div class="library-result-toolbar"><span class="skill-result-count" role="status">${shown.length} 个网站</span><label class="skill-category-select">状态<select id="agent-status" aria-label="网站状态">${[['','全部状态'],['pinned','已置顶'],...Object.entries(M.statuses)].map(([v,l])=>`<option value="${v}" ${status===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${shown.length?`<div class="skill-grid">${shown.map(card).join('')}</div>`:`<div class="skill-empty"><span class="skill-empty-mark" aria-hidden="true">✧</span><h3>${items.length?'没有匹配的收藏':'把喜欢的 AI 产品，收进你的专属导航'}</h3><p>${items.length?'试试其他关键词、分类或状态。':'保存网站地址，记下它的用途和使用心得。'}</p>${items.length?action('清除筛选','reset','','button'):action('＋ 收藏第一个 AI 网站','new','','button skill-primary')}<div class="skill-discovery">去发现 ${external('https://ai-bot.cn/','浏览 AI 工具集')}</div></div>`}</div>`;
  }

  function refresh(){const box=document.querySelector('#agent-results');if(box)box.innerHTML=results();}
  function render(){return `<section id="agent-library" class="skill-library agent-library" aria-label="Agent 收藏"><div class="skill-library-head"><div class="skill-heading"><span class="skill-emblem" aria-hidden="true">◎</span><div><span class="skill-kicker">MY AI TOOLBOX</span><h2>Agent 收藏</h2><p>收藏值得常用的 AI 产品，让好工具随手可达。</p></div></div>${action('＋ 收藏 AI 网站','new','','button skill-primary')}</div><div class="prompt-search-bar skill-search"><label><span aria-hidden="true">⌕</span><input type="search" id="agent-search" aria-label="搜索 AI 网站" placeholder="搜索产品名称、用途、标签或网址" value="${e(query)}"></label>${action('重置筛选','reset')}</div><div id="agent-results">${results()}</div></section>`;}
  function show(id){
    const item=find(id);if(!item)return api.toast('收藏已移除');let url='';try{url=M.link(item.url);}catch{}
    dialog.classList.add('library-drawer');
    dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">网站详情</span><h2 id="agent-dialog-title">${e(item.title)}</h2></div><button class="close" data-agent-close aria-label="关闭详情">×</button></div><div class="library-detail-meta"><span class="tag">${e(item.category||'未分类')}</span><span class="tag">${e(M.statuses[item.status]||'待试用')}</span></div><h3 class="library-detail-label">用途与使用心得</h3><div class="library-detail-body">${e(item.description||'还没有填写用途说明。')}</div><div class="skill-labels">${M.tags(item.tags).map(t=>`<span># ${e(t)}</span>`).join('')}</div><h3 class="library-detail-label">来源地址</h3>${url?external(url,e(item.url),'library-source-link'):'<p class="error">请编辑并修正地址</p>'}<div class="dialog-actions">${action('编辑','edit',id,'button')}${url?external(url,'访问','button skill-primary'):''}</div>`;
    if(!dialog.open)dialog.showModal();
  }
  function open(id=''){
    const s=id?find(id):{};if(!s)return api.toast('这个网站 已移除');editingId=id;dialog.classList.remove('library-drawer');

    dialog.innerHTML=`<form id="agent-form"><div class="dialog-head"><div><span class="eyebrow">MY AI TOOLBOX</span><h2 id="agent-dialog-title">${id?'编辑 AI 网站':'收藏 AI 网站'}</h2></div><button type="button" class="close" data-agent-close aria-label="关闭网站表单">×</button></div><label class="field">网站地址<input name="url" type="text" inputmode="url" aria-label="网站地址" aria-describedby="agent-url-help" required value="${e(s.url||'')}" placeholder="https://网站域名"><small class="meta" id="agent-url-help">填写产品官网或你常用的功能页面地址。</small></label><label class="field">网站名称<input name="title" required value="${e(s.title||'')}" placeholder="给它一个方便查找的名称"></label><label class="field">用途与使用心得<textarea name="description" placeholder="能帮我做什么？适合什么时候用？">${e(s.description||'')}</textarea></label><div class="field-row"><label class="field">分类<select name="category">${taxonomyCategoryOptions(api.getState(),'agents',s.category)}</select></label><label class="field">使用状态<select name="status">${Object.entries(M.statuses).map(([v,l])=>`<option value="${v}" ${(s.status||'saved')===v?'selected':''}>${l}</option>`).join('')}</select></label></div><label class="field">标签<input name="tags" value="${e(M.tags(s.tags).join('，'))}" placeholder="例如：中文、PPT、课程开发（逗号分隔）"></label><p class="meta">保存后可直接访问网站，也可以继续补充使用心得。</p><p class="error" id="agent-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button" data-agent-close>取消</button><button class="button skill-primary" type="submit">${id?'保存修改':'保存收藏'}</button></div></form>`;
    attachTaxonomyTagPicker(dialog,api.getState());if(!dialog.open)dialog.showModal();dialog.querySelector(id?'[name=title]':'[name=url]').focus();
  }
  dialog.addEventListener('change',ev=>{if(ev.target.name==='url'){const title=dialog.querySelector('[name=title]');if(!title.value.trim())title.value=M.source(ev.target.value).name;}});
  dialog.addEventListener('submit',ev=>{
    ev.preventDefault();const data=Object.fromEntries(new FormData(ev.target));
    try{TaxonomyModel.prepare(api.getState(),'agents',data,editingId);M.save({agents:JSON.parse(JSON.stringify(all()))},editingId,data,'validation');}catch(err){dialog.querySelector('#agent-error').textContent=err.message;return;}
    if(!api.commit(s=>{M.save(s,editingId,data,api.uid());})){dialog.querySelector('#agent-error').textContent='未能保存，填写内容已保留，请重试。';return;}
    query='';category='';status='';dialog.close();api.refresh();api.toast(editingId?'网站已更新':'网站已收藏');document.querySelector('#agent-library')?.scrollIntoView({block:'start'});
  });
  document.addEventListener('input',ev=>{if(ev.target.id==='agent-search'){query=ev.target.value;refresh();}});
  document.addEventListener('change',ev=>{if(ev.target.id==='agent-status'){status=ev.target.value;refresh();}});
  document.addEventListener('click',async ev=>{
    if(ev.target.closest('[data-agent-close]')){dialog.close();return;}
    const filter=ev.target.closest('[data-agent-category]');if(filter){category=filter.dataset.agentCategory;if(status==='pinned')status='';refresh();return;}
    if(ev.target.closest('[data-agent-pinned]')){category='';status='pinned';refresh();return;}
    const button=ev.target.closest('[data-agent-action]');if(!button)return;
    const {agentAction:kind,id}=button.dataset;
    if(kind==='new'||kind==='edit'){open(id);return;}
    if(kind==='view'){show(id);return;}
    if(kind==='reset'){query='';category='';status='';const search=document.querySelector('#agent-search');if(search)search.value='';refresh();return;}
    const item=find(id);if(!item)return;
    if(kind==='pin'){if(api.commit(s=>{const target=s.agents.find(s=>s.id===id);target.pinned=!target.pinned;}))refresh();}
    if(kind==='copy'){try{await navigator.clipboard.writeText(M.link(item.url));api.toast('网站链接已复制');}catch{api.toast('复制失败，可打开编辑框手动复制地址');}}
    if(kind==='remove'){
      dialog.innerHTML=`<div class="dialog-head"><h2 id="agent-dialog-title">移除收藏</h2><button type="button" class="close" data-agent-close aria-label="关闭">×</button></div><p>从收藏中移除「${e(item.title)}」？</p><p class="meta">这只会移除收藏链接，不会影响该网站的账号或内容。</p><div class="dialog-actions"><button class="button" data-agent-close>取消</button>${action('移除收藏','confirm-remove',id,'button')}</div>`;dialog.showModal();
    }
    if(kind==='confirm-remove'){if(api.commit(s=>{s.agents=s.agents.filter(s=>s.id!==id);})){dialog.close();api.refresh();api.toast('已移除网站收藏');}}
  });
  return {render,show};
};
