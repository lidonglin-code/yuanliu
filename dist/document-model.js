/* Documents are references; existing text records stay intact. */
(function(root){
  function kind(item){return item.resourceType|| (item.url?'web':item.path?'local':'text');}
  function webUrl(value){
    let url;try{url=new URL(String(value||'').trim());}catch{throw Error('请填写完整的在线文档链接（https://…）。');}
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('只支持不含账号密码的 HTTP / HTTPS 链接。');
    return url.href;
  }
  function validate(item){
    const type=kind(item);if(!['web','local','text','review'].includes(type))throw Error('请选择文档类型。');
    if(type==='web')item.url=webUrl(item.url);
    if(type==='local'){item.path=String(item.path||'').trim();if(!item.path)throw Error('请填写本地文件位置。');}
    if(type==='review'&&!item.trainingId)throw Error('缺少关联复盘');item.resourceType=type;return item;
  }
  function capture(text){
    const match=String(text).match(/https?:\/\/[^\s<>"“”]+/i);if(!match)return {body:text,resourceType:'text'};
    const raw=match[0].replace(/[，。；、）)\]】]+$/,'');
    try{return {resourceType:'web',url:webUrl(raw),title:String(text).replace(match[0],'').trim().replace(/^[：:—\s]+|[：:—\s]+$/g,'')||new URL(raw).hostname,body:text};}
    catch{return {body:text,resourceType:'text'};}
  }
  function linked(state,task){const ids=new Set(task.documentIds||[]);return (state.notes||[]).filter(n=>ids.has(n.id));}
  function source(item){if(kind(item)==='review')return '复盘入口';if(kind(item)==='local')return '本地文件';if(kind(item)==='text')return '文字记录';try{const host=new URL(webUrl(item.url)).hostname;return /(^|\.)feishu\.cn$|(^|\.)larksuite\.com$/.test(host)?'飞书文档':/(^|\.)wecom\.com$|(^|\.)wedoc\.(work|weixin\.qq\.com)$/.test(host)?'企微文档':host;}catch{return '链接待修正';}}
  function moduleIds(item,modules){const valid=new Set(modules.map(m=>m.id));return [...new Set(Array.isArray(item.moduleIds)?item.moduleIds:[])].filter(id=>valid.has(id));}
  function assignModules(item,ids,modules){
    const list=[...new Set(ids)],valid=new Set(modules.map(m=>m.id));
    if(list.some(id=>!valid.has(id)))throw Error('请选择所属项目中的模块。');
    item.moduleIds=list;item.moduleScope=list.length?'modules':'unassigned';return item;
  }
  function scope(item,modules){if(moduleIds(item,modules).length)return 'modules';if(item.moduleScope)return item.moduleScope==='general'?'general':'unassigned';return item.moduleIds?.length?'unassigned':'general';}
  function matchesModule(item,filter,modules){const ids=moduleIds(item,modules);return !filter||(filter==='__general'?scope(item,modules)==='general':filter==='__unassigned'?scope(item,modules)==='unassigned':ids.includes(filter));}
  function priority(item,projectId,moduleId,modules){if(item.projectId!==projectId)return 4;const ids=moduleIds(item,modules);return moduleId&&ids.includes(moduleId)?0:scope(item,modules)==='general'?1:ids.length?2:3;}
  const api={scope,moduleIds,assignModules,matchesModule,priority,kind,webUrl,validate,capture,linked,source};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DocumentModel=api;
})(typeof window==='undefined'?globalThis:window);
