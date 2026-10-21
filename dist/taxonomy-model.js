(function(root){
  const domains={projects:'项目分类',prompts:'提示词分类',skills:'Skill 分类',agents:'Agent 分类',tags:'知识典藏标签'};
  const defaults={projects:['未分类','课程开发','活动运营','内部协作'],prompts:['未分类'],skills:['未分类','培训与学习','内容创作','文档与演示','数据分析','设计与开发','日常效率'],agents:['未分类','AI 对话','写作与文档','图像与设计','音视频创作','办公与演示','数据与研究','编程与开发','AI 智能体'],tags:[]};
  const key=s=>String(s||'').trim().toLowerCase();
  const split=v=>[...new Map((Array.isArray(v)?v:String(v||'').split(/[,，、;；\n]+/)).map(t=>[key(t),String(t).trim()]).filter(([k])=>k)).values()];
  const records=(state,domain)=>domain==='tags'?['prompts','skills','agents'].flatMap(k=>state[k]||[]):state[domain]||[];
  const values=(r,domain)=>domain==='tags'?split(r.tags):[String(r.category||'未分类').trim()||'未分类'];
  function validateStore(value){if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value))throw Error('分类设置格式无效');for(const d of Object.keys(domains)){if(value[d]!==undefined&&(!Array.isArray(value[d])||value[d].some(i=>!i||typeof i.name!=='string'||!i.name.trim()||typeof i.active!=='boolean')))throw Error('分类设置格式无效');}}
  function initialize(state){
    validateStore(state.taxonomy);state.taxonomy=state.taxonomy||{};
    for(const d of Object.keys(domains)){
      const first=!Array.isArray(state.taxonomy[d]);state.taxonomy[d]=state.taxonomy[d]||[];
      if(d!=='tags'&&!state.taxonomy[d].some(i=>i.name==='未分类'))state.taxonomy[d].unshift({name:'未分类',active:true});
      const names=[...(first?defaults[d]:[]),...records(state,d).flatMap(r=>[...values(r,d),...(r.previousVersion?values(r.previousVersion,d):[])])];
      for(const name of names)if(name&&!state.taxonomy[d].some(t=>key(t.name)===key(name)))state.taxonomy[d].push({name,active:true});
      for(const r of records(state,d)){for(const value of [r,...(r.previousVersion?[r.previousVersion]:[])]){if(d==='tags')value.tags=split(value.tags).map(t=>state.taxonomy[d].find(i=>key(i.name)===key(t))?.name||t);else if(value.category)value.category=state.taxonomy[d].find(i=>key(i.name)===key(value.category))?.name||value.category;}}
    }
    return state;
  }
  function list(state,domain){if(!domains[domain])throw Error('分类范围无效');const items=state.taxonomy?.[domain]||[];return items.map(i=>({...i,count:records(state,domain).filter(r=>values(r,domain).some(v=>key(v)===key(i.name))).length}));}
  function choices(state,domain,current=''){return list(state,domain).filter(i=>i.active||key(i.name)===key(current));}
  function orderedUsed(state,domain){return list(state,domain).filter(i=>i.count).map(i=>i.name);}
  function name(value){const n=String(value||'').trim();if(!n)throw Error('请填写名称');if(n.length>40)throw Error('名称请控制在 40 字以内');if(/[,，、;；\n]/.test(n))throw Error('名称中不能包含标签分隔符');return n;}
  function find(state,domain,value){const found=state.taxonomy?.[domain]?.find(i=>key(i.name)===key(value));if(!found)throw Error('这个选项已不存在，请刷新');return found;}
  function add(state,domain,value){initialize(state);const n=name(value);if(list(state,domain).some(i=>key(i.name)===key(n)))throw Error('已有同名选项，请使用或启用它');state.taxonomy[domain].push({name:n,active:true});}
  function replaceReferences(state,domain,from,to){
    const update=r=>{if(domain==='tags')r.tags=split(values(r,domain).map(v=>key(v)===key(from)?to:v));else if(key(r.category||'未分类')===key(from))r.category=to;};
    for(const r of records(state,domain)){
      // Legacy project modes used their category; freeze that meaning before renaming it.
      if(domain==='projects'&&!r.projectMode)r.projectMode=(r.category==='培训项目'||r.stage!=='general'&&(!!r.trainingId||['demand','design','content','prepare','delivery','evaluation','review'].includes(r.stage)))?'training':'general';
      update(r);if(r.previousVersion)update(r.previousVersion);
    }
  }
  function editable(domain,value){if(domain!=='tags'&&value==='未分类')throw Error('未分类是默认选项，不能修改或停用');}
  function rename(state,domain,from,to){editable(domain,from);const target=find(state,domain,from),n=name(to);if(list(state,domain).some(i=>key(i.name)===key(n)&&key(i.name)!==key(from)))throw Error('已有同名选项，请使用“合并”');replaceReferences(state,domain,target.name,n);target.name=n;}
  function merge(state,domain,from,to){editable(domain,from);const source=find(state,domain,from),target=find(state,domain,to);if(source===target)throw Error('请选择另一个选项');if(!target.active)throw Error('请选择启用中的目标');replaceReferences(state,domain,source.name,target.name);state.taxonomy[domain]=state.taxonomy[domain].filter(i=>i!==source);}
  function toggle(state,domain,value){editable(domain,value);const item=find(state,domain,value);item.active=!item.active;}
  function move(state,domain,value,step){if(![-1,1].includes(step))throw Error('排序方向无效');const items=state.taxonomy[domain],item=find(state,domain,value),at=items.indexOf(item),to=at+step;if(to<0||to>=items.length)return;[items[at],items[to]]=[items[to],items[at]];}
  function remove(state,domain,value){editable(domain,value);const item=find(state,domain,value);if(records(state,domain).some(r=>[...values(r,domain),...(r.previousVersion?values(r.previousVersion,domain):[])].some(v=>key(v)===key(value))))throw Error('仍有内容或历史版本使用它，请停用或合并');state.taxonomy[domain]=state.taxonomy[domain].filter(i=>i!==item);}
  function prepare(state,domain,data,id){
    const old=(state[domain]||[]).find(r=>r.id===id),category=String(data.category||'未分类').trim()||'未分类';
    const option=find(state,domain,category);if(!option.active&&key(old?.category||'未分类')!==key(category))throw Error('该分类已停用，请选择其他分类');data.category=option.name;
    if(domain!=='projects')data.tags=split(data.tags).map(t=>{const tag=(state.taxonomy?.tags||[]).find(i=>key(i.name)===key(t));if(tag&&!tag.active&&!split(old?.tags).some(v=>key(v)===key(t)))throw Error('标签“'+tag.name+'”已停用');return tag?.name||name(t);});
    return data;
  }
  const api={domains,split,initialize,validateStore,list,choices,orderedUsed,add,rename,merge,toggle,move,remove,prepare};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TaxonomyModel=api;
})(typeof window==='undefined'?globalThis:window);
