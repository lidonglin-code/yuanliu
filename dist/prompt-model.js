(function(root){
  const promptSeeds=[
    {id:'seed-needs',category:'培训设计',title:'把培训需求问清楚',body:'你是一名企业培训顾问。请根据以下业务背景，帮我澄清：1）真正要解决的业务问题；2）目标人群的具体差距；3）期望出现的行为改变；4）可观察的效果指标；5）还需要向业务方确认的问题。请用表格输出，并区分已知信息与待确认信息。'},
    {id:'seed-outline',category:'培训设计',title:'生成课程大纲初稿',body:'请基于以下培训目标和学员画像，设计一份可执行的课程大纲。包含：模块名称、学习目标、关键内容、练习方式、预计时长和所需材料。先给出结构，再指出需要我补充的信息。'},
    {id:'seed-risk',category:'项目推进',title:'梳理培训项目风险',body:'请作为培训项目经理，阅读以下项目进展，找出当前最可能影响交付的风险。按“风险描述｜影响｜发生可能性｜预警信号｜下一步动作｜责任人”输出，并优先标出本周必须处理的事项。'},
    {id:'seed-meeting',category:'项目推进',title:'会议纪要转行动清单',body:'请把下面的会议记录整理成行动清单。提取明确的决定、待办、负责人、截止日期和待确认问题；没有明确负责人的事项请标记为“待认领”，不要自行猜测。'},
    {id:'seed-review',category:'内容整理',title:'从复盘中提炼方法',body:'请阅读以下培训复盘，提炼出可以复用的方法、需要避免的问题和下次可以直接采用的动作。请保留事实与原话，不要把推测写成结论，最后给出一份下次执行清单。'},
    {id:'seed-weekly',category:'日常效率',title:'整理培训周报',body:'请根据以下本周工作记录，整理一份简洁的培训工作周报，包含：本周完成、项目进展、培训交付、风险与待跟进、下周重点。语气客观具体，缺失信息用“待补充”标记。'}
  ];
  function initialize(state){
    if(state.promptLibraryInitialized===1)return state;
    state.prompts=state.prompts||[];
    const ids=new Set(state.prompts.map(p=>p.id));
    for(const p of promptSeeds)if(!ids.has(p.id))state.prompts.push({...fields(p),id:p.id});
    state.promptLibraryInitialized=1;
    return state;
  }
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
