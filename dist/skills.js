window.createSkillLibrary=function(api){
  const M=window.SkillModel,e=api.esc;
  let query='',category='',status='',editingId='';
  const all=()=>api.getState().skills||[],find=id=>all().find(s=>s.id===id);
  const dialog=document.createElement('dialog');dialog.className='skill-dialog';dialog.setAttribute('aria-labelledby','skill-dialog-title');document.body.append(dialog);
  const action=(text,kind,id='',cls='text-button')=>`<button class="${cls}" data-skill-action="${kind}" data-id="${e(id)}">${text}</button>`;
  const external=(url,text,cls='text-button')=>`<a class="${cls}" href="${e(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  function card(s){
    const source=M.source(s.url);
    return `<article class="skill-card"><div class="skill-card-top"><span class="skill-glyph" aria-hidden="true">⌘</span><span class="skill-source"><strong>${e(source.platform)}</strong><small>${e(source.repo||source.host)}</small></span><button class="prompt-pin ${s.pinned?'active':''}" data-skill-action="pin" data-id="${e(s.id)}" aria-pressed="${!!s.pinned}" aria-label="${s.pinned?'取消置顶':'置顶'} Skill：${e(s.title)}">${s.pinned?'★':'☆'}</button><details class="prompt-menu"><summary aria-label="管理 Skill：${e(s.title)}">⋯</summary><div>${action('移除收藏','remove',s.id)}</div></details></div><h3>${action(e(s.title),'view',s.id,'library-title-button')}</h3><p class="skill-description">${e(s.description||'还没有用途说明，点「编辑」记下它能帮你做什么。')}</p><div class="skill-labels"><span class="skill-status status-${Object.hasOwn(M.statuses,s.status)?s.status:'saved'}">${e(M.statuses[s.status]||'待试用')}</span><span>${e(s.category||'未分类')}</span>${M.tags(s.tags).map(t=>`<span># ${e(t)}</span>`).join('')}</div><div class="skill-card-actions">${action('编辑','edit',s.id)}${action('调用','invoke',s.id,'button skill-open')}</div></article>`;
  }
  function results(){
    const items=all(),cats=TaxonomyModel.orderedUsed(api.getState(),'skills');if(category&&!cats.includes(category))category='';
    const searched=items.filter(s=>M.matches(s,query)),shown=window.orderLibrary(searched.filter(s=>(!category||(s.category||'未分类')===category)&&(!status||(status==='pinned'?s.pinned:s.status===status))));
    return `<aside class="library-sidebar"><span class="library-sidebar-label">分类浏览</span><div class="prompt-categories" aria-label="Skill 分类"><button data-skill-category="" aria-pressed="${!category&&status!=='pinned'}" class="${!category&&status!=='pinned'?'active':''}">全部 <span>${searched.length}</span></button><button data-skill-pinned aria-pressed="${status==='pinned'}" class="${status==='pinned'?'active':''}">已置顶 <span>${searched.filter(s=>s.pinned).length}</span></button>${cats.map(c=>`<button data-skill-category="${e(c)}" aria-pressed="${category===c}" class="${category===c?'active':''}">${e(c)} <span>${searched.filter(s=>(s.category||'未分类')===c).length}</span></button>`).join('')}</div></aside><div class="library-result-main"><div class="library-result-toolbar"><span class="skill-result-count" role="status">${shown.length} 个 Skill</span><label class="skill-category-select">状态<select id="skill-status" aria-label="Skill 状态">${[['','全部状态'],['pinned','已置顶'],...Object.entries(M.statuses)].map(([v,l])=>`<option value="${v}" ${status===v?'selected':''}>${l}</option>`).join('')}</select></label></div>${shown.length?`<div class="skill-grid">${shown.map(card).join('')}</div>`:`<div class="skill-empty"><span class="skill-empty-mark" aria-hidden="true">✧</span><h3>${items.length?'没有匹配的收藏':'把发现的好 Skill，收进自己的工具箱'}</h3><p>${items.length?'试试其他关键词、分类或状态。':'粘贴仓库或具体 Skill 地址，保存好用的工作能力。'}</p>${items.length?action('清除筛选','reset','','button'):action('＋ 收藏第一个 Skill','new','','button skill-primary')}<div class="skill-discovery">去发现 ${external('https://skills.sh/','skills.sh')}<span>·</span>${external('https://skillsmp.com/','SkillsMP')}</div></div>`}</div>`;
  }

  function refresh(){const box=document.querySelector('#skill-results');if(box)box.innerHTML=results();}
  function render(){return `<section id="skill-library" class="skill-library" aria-label="Skill 收藏"><div class="skill-library-head"><div class="skill-heading"><span class="skill-emblem" aria-hidden="true">⌘</span><div><span class="skill-kicker">MY SKILL SHELF</span><h2>Skill 收藏</h2><p>把好用的能力收在一起，需要时随手找到。</p></div></div>${action('＋ 收藏 Skill','new','','button skill-primary')}</div><div class="prompt-search-bar skill-search"><label><span aria-hidden="true">⌕</span><input type="search" id="skill-search" aria-label="搜索 Skill" placeholder="搜索名称、用途、标签或仓库" value="${e(query)}"></label>${action('重置筛选','reset')}</div><div id="skill-results">${results()}</div></section>`;}
  function show(id){
    const item=find(id);if(!item)return api.toast('收藏已移除');let url='';try{url=M.link(item.url);}catch{}
    dialog.classList.add('library-drawer');
    dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">Skill 详情</span><h2 id="skill-dialog-title">${e(item.title)}</h2></div><button class="close" data-skill-close aria-label="关闭详情">×</button></div><div class="library-detail-meta"><span class="tag">${e(item.category||'未分类')}</span><span class="tag">${e(M.statuses[item.status]||'待试用')}</span></div><h3 class="library-detail-label">用途与使用心得</h3><div class="library-detail-body">${e(item.description||'还没有填写用途说明。')}</div><div class="skill-labels">${M.tags(item.tags).map(t=>`<span># ${e(t)}</span>`).join('')}</div><h3 class="library-detail-label">调用内容</h3><pre class="skill-invocation">${e(M.invocation(item))}</pre><p class="meta">复制后粘贴给 AI；实际触发方式以所用 AI 工具为准。</p><h3 class="library-detail-label">来源地址</h3>${url?external(url,e(item.url),'library-source-link'):'<p class="error">请编辑并修正地址</p>'}<div class="dialog-actions">${action('编辑','edit',id,'button')}${action('调用','invoke',id,'button skill-primary')}</div>`;
    if(!dialog.open)dialog.showModal();
  }
  function open(id=''){
    const s=id?find(id):{};if(!s)return api.toast('这条 Skill 已移除');editingId=id;dialog.classList.remove('library-drawer');

    dialog.innerHTML=`<form id="skill-form"><div class="dialog-head"><div><span class="eyebrow">MY SKILL SHELF</span><h2 id="skill-dialog-title">${id?'编辑 Skill':'收藏 Skill'}</h2></div><button type="button" class="close" data-skill-close aria-label="关闭 Skill 表单">×</button></div><label class="field">Skill 地址<input name="url" type="text" inputmode="url" aria-label="Skill 地址" aria-describedby="skill-url-help" required value="${e(s.url||'')}" placeholder="https://github.com/作者/仓库/tree/main/skills/名称"><small class="meta" id="skill-url-help">可以是仓库、具体 Skill 目录或介绍页面的地址。</small></label><label class="field">Skill 名称<input name="title" required value="${e(s.title||'')}" placeholder="给它一个方便查找的名称"></label><label class="field">调用内容<textarea name="invokeText" aria-label="调用内容" placeholder="例如：/pptx，或你习惯使用的完整调用提示词">${e(s.id?M.invocation(s):'')}</textarea><small class="meta">点击「调用」会复制这里的内容。请按所用 AI 工具调整名称和格式。</small></label><label class="field">用途与使用心得<textarea name="description" placeholder="能帮我做什么？适合什么时候用？">${e(s.description||'')}</textarea></label><div class="field-row"><label class="field">分类<select name="category">${taxonomyCategoryOptions(api.getState(),'skills',s.category)}</select></label><label class="field">使用状态<select name="status">${Object.entries(M.statuses).map(([v,l])=>`<option value="${v}" ${(s.status||'saved')===v?'selected':''}>${l}</option>`).join('')}</select></label></div><label class="field">标签<input name="tags" value="${e(M.tags(s.tags).join('，'))}" placeholder="例如：PPT、课程开发、周报（逗号分隔）"></label><p class="meta">收藏链接后，可随时打开来源查看和使用。</p><p class="error" id="skill-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button" data-skill-close>取消</button><button class="button skill-primary" type="submit">${id?'保存修改':'保存收藏'}</button></div></form>`;
    attachTaxonomyTagPicker(dialog,api.getState());if(!dialog.open)dialog.showModal();dialog.querySelector(id?'[name=title]':'[name=url]').focus();
  }
  dialog.addEventListener('change',ev=>{if(ev.target.name==='url'){const title=dialog.querySelector('[name=title]');if(!title.value.trim())title.value=M.source(ev.target.value).name;const invoke=dialog.querySelector('[name=invokeText]');if(!invoke.value.trim())invoke.value=M.invocation({url:ev.target.value});}});
  dialog.addEventListener('submit',ev=>{
    ev.preventDefault();const data=Object.fromEntries(new FormData(ev.target));
    try{TaxonomyModel.prepare(api.getState(),'skills',data,editingId);M.save({skills:JSON.parse(JSON.stringify(all()))},editingId,data,'validation');}catch(err){dialog.querySelector('#skill-error').textContent=err.message;return;}
    if(!api.commit(s=>{M.save(s,editingId,data,api.uid());})){dialog.querySelector('#skill-error').textContent='未能保存，填写内容已保留，请重试。';return;}
    query='';category='';status='';dialog.close();api.refresh();api.toast(editingId?'Skill 已更新':'Skill 已收藏');document.querySelector('#skill-library')?.scrollIntoView({block:'start'});
  });
  document.addEventListener('input',ev=>{if(ev.target.id==='skill-search'){query=ev.target.value;refresh();}});
  document.addEventListener('change',ev=>{if(ev.target.id==='skill-status'){status=ev.target.value;refresh();}});
  document.addEventListener('click',async ev=>{
    if(ev.target.closest('[data-skill-close]')){dialog.close();return;}
    const filter=ev.target.closest('[data-skill-category]');if(filter){category=filter.dataset.skillCategory;if(status==='pinned')status='';refresh();return;}
    if(ev.target.closest('[data-skill-pinned]')){category='';status='pinned';refresh();return;}
    const button=ev.target.closest('[data-skill-action]');if(!button)return;
    const {skillAction:kind,id}=button.dataset;
    if(kind==='new'||kind==='edit'){open(id);return;}
    if(kind==='view'){show(id);return;}
    if(kind==='reset'){query='';category='';status='';const search=document.querySelector('#skill-search');if(search)search.value='';refresh();return;}
    const item=find(id);if(!item)return;
    if(kind==='pin'){if(api.commit(s=>{const target=s.skills.find(s=>s.id===id);target.pinned=!target.pinned;}))refresh();}
    if(kind==='invoke'){try{await navigator.clipboard.writeText(M.invocation(item));api.toast('调用内容已复制，请粘贴到 AI 对话');}catch{show(id);api.toast('复制失败，请在详情中手动复制调用内容');}return;}
    if(kind==='remove'){
      dialog.innerHTML=`<div class="dialog-head"><h2 id="skill-dialog-title">移除收藏</h2><button type="button" class="close" data-skill-close aria-label="关闭">×</button></div><p>从收藏中移除「${e(item.title)}」？</p><p class="meta">这不会删除原仓库或其中的文件。</p><div class="dialog-actions"><button class="button" data-skill-close>取消</button>${action('移除收藏','confirm-remove',id,'button')}</div>`;dialog.showModal();
    }
    if(kind==='confirm-remove'){if(api.commit(s=>{s.skills=s.skills.filter(s=>s.id!==id);})){dialog.close();api.refresh();api.toast('已移除 Skill 收藏');}}
  });
  return {render,show};
};
