(function(root){
  const statuses={saved:'待试用',trying:'试用中',active:'常用'};
  function initialize(state){if(!Array.isArray(state.skills))state.skills=[];return state;}
  function link(value){
    let raw=String(value||'').trim();
    if(!raw)throw Error('请填写 Skill 地址。');
    if(!/^[a-z][a-z\d+.-]*:/i.test(raw))raw='https://'+raw;
    let url;try{url=new URL(raw);}catch{throw Error('请输入有效的网页地址。');}
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.'))throw Error('请使用不含账号密码的 HTTP 或 HTTPS 网页地址。');
    url.pathname=url.pathname.replace(/\/+$/,'')||'/';
    return url.href;
  }
  function source(value){
    try{const url=new URL(link(value)),parts=url.pathname.split('/').filter(Boolean);let last=parts.at(-1)||url.hostname;
      if(/^skill\.md$/i.test(last))last=parts.at(-2)||last;
      try{last=decodeURIComponent(last);}catch{}
      const host=url.hostname.replace(/^www\./,'');
      return {host,platform:({'github.com':'GitHub','gitlab.com':'GitLab','gitee.com':'Gitee','codeberg.org':'Codeberg'})[host]||host,repo:parts.slice(0,2).join('/'),name:last.replace(/\.git$/,'')};
    }catch{return {host:'',platform:'链接待修正',repo:'',name:''};}
  }
  function tags(value){return [...new Set((Array.isArray(value)?value:String(value||'').split(/[,，、;；\n]+/)).map(v=>String(v).trim()).filter(Boolean))];}
  function matches(item,query){const text=[item.title,item.url,item.description,item.category,...tags(item.tags),statuses[item.status]].join(' ').toLowerCase();return String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean).every(word=>text.includes(word));}
  function invocation(item){
    if(String(item.invokeText||'').trim())return String(item.invokeText).trim();
    try{const u=new URL(link(item.url)),parts=u.pathname.split('/').filter(Boolean),marker=parts.findIndex((p,i)=>i>=2&&['tree','blob','src'].includes(p));
      if(['github.com','gitlab.com','gitee.com','codeberg.org'].includes(u.hostname)&&marker>=2&&parts.length>marker+2){
        const name=source(item.url).name;
        if(/^[a-z0-9][a-z0-9_-]*$/i.test(name))return '/'+name;
      }
      return '请使用这个 Skill：'+link(item.url);
    }catch{return '';}
  }
  function save(state,id,data,newId){
    const url=link(data.url),title=String(data.title||'').trim();if(!title)throw Error('请填写 Skill 名称。');
    const items=state.skills||[],existing=id&&items.find(s=>s.id===id);if(id&&!existing)throw Error('这条 Skill 已被移除，请重新打开。');
    if(items.some(s=>{try{return s.id!==id&&link(s.url)===url;}catch{return false;}}))throw Error('这个地址已经收藏过了，可以直接编辑已有 Skill。');
    const value={title,url,description:String(data.description||'').trim(),category:String(data.category||'').trim()||'未分类',tags:tags(data.tags),status:Object.hasOwn(statuses,data.status)?data.status:'saved',updatedAt:new Date().toISOString()};
    if(Object.hasOwn(data,'invokeText'))value.invokeText=String(data.invokeText||'').trim();
    if(existing){Object.assign(existing,value);return existing;}
    const item={...value,id:newId,pinned:false,createdAt:value.updatedAt};state.skills=[item,...items];return item;
  }
  function sorted(items){return [...items].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(b.createdAt||'').localeCompare(a.createdAt||''));}
  const api={statuses,link,source,tags,matches,save,sorted,initialize,invocation};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SkillModel=api;
})(typeof window==='undefined'?globalThis:window);
