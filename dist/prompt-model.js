(function(root){
  // Collections belong to the user. Loading or importing never adds starter records.
  function initialize(state){if(!Array.isArray(state.prompts))state.prompts=[];return state;}
  function tags(value){
    const parts=Array.isArray(value)?value:String(value||'').split(/[,，、;；\n]+/);
    const seen=new Set();return parts.map(x=>String(x).trim()).filter(x=>{const k=x.toLowerCase();if(!x||seen.has(k))return false;seen.add(k);return true;});
  }
  function fields(p){return {title:String(p.title||'').trim(),category:String(p.category||'').trim()||'未分类',body:String(p.body||'').trim(),tags:tags(p.tags)};}
  function matches(p,query){const haystack=[p.title,p.body,p.category,...tags(p.tags)].join(' ').toLowerCase();return String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean).every(term=>haystack.includes(term));}
  function save(state,id,data,newId){
    const value=fields(data);if(!value.title||!value.body)throw Error('请填写名称和提示词内容。');
    state.prompts=state.prompts||[];const existing=id&&state.prompts.find(p=>p.id===id);
    if(id&&!existing)throw Error('这条提示词已不存在，请重新打开。');
    const now=new Date().toISOString();
    if(existing){
      if(JSON.stringify(fields(existing))!==JSON.stringify(value))existing.previousVersion={...fields(existing),savedAt:existing.updatedAt||now};
      Object.assign(existing,value,{updatedAt:now});return existing;
    }
    const item={...value,id:newId,createdAt:now,updatedAt:now};
    state.prompts.unshift(item);return item;
  }
  function restore(state,id){
    const p=state.prompts.find(p=>p.id===id);if(!p?.previousVersion)throw Error('没有可恢复的上一版本。');
    const previous=fields(p.previousVersion),current={...fields(p),savedAt:p.updatedAt};
    Object.assign(p,previous,{previousVersion:current,updatedAt:new Date().toISOString()});return p;
  }
  function togglePin(state,id){const pins=new Set(state.promptPins||[]);pins.has(id)?pins.delete(id):pins.add(id);state.promptPins=[...pins];return pins.has(id);}
  function sorted(catalog,pins=[]){const set=new Set(pins);return [...catalog].sort((a,b)=>Number(set.has(b.id))-Number(set.has(a.id)));}
  const api={initialize,tags,fields,matches,save,restore,togglePin,sorted};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PromptModel=api;
})(typeof window==='undefined'?globalThis:window);
