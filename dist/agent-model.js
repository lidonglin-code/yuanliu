(function(root){
  const links=typeof module!=='undefined'&&module.exports?require('./skill-model.js'):root.SkillModel;
  const statuses=links.statuses;
  const samples=[
    {key:'doubao',title:'豆包 · 日常对话助手',url:'https://www.doubao.com/chat/',category:'AI 对话',tags:['中文','日常写作','头脑风暴'],description:'字节跳动旗下 AI 助手。可尝试用来讨论培训主题、梳理工作思路、起草通知和沟通文案。作为待试用收藏，具体效果可在使用后补充。'},
    {key:'kimi',title:'Kimi · 资料阅读与文档',url:'https://www.kimi.com/',category:'写作与文档',tags:['资料阅读','培训方案','报告'],description:'支持文件处理、内容整理和文档生成。可尝试用于梳理培训需求材料、总结访谈记录、起草方案与复盘报告。'},
    {key:'gamma',title:'Gamma · 课件与演示制作',url:'https://gamma.app/',category:'办公与演示',tags:['PPT','培训课件','项目汇报'],description:'从想法、大纲或已有内容生成演示文稿，并可继续编辑和导出。可尝试制作课程介绍、开班说明和培训项目汇报初稿。'},
    {key:'napkin',title:'Napkin · 文字转图解',url:'https://www.napkin.ai/',category:'图像与设计',tags:['流程图','思维导图','知识可视化'],description:'将文字和想法转成图解、流程图或思维导图。可尝试把培训流程、课程结构和知识要点做成便于讲解的视觉材料。'},
    {key:'ai-bot',title:'AI 工具集 · 发现更多工具',url:'https://ai-bot.cn/',category:'工具导航',tags:['AI 导航','工具发现','分类浏览'],description:'按用途浏览 AI 产品与网站的导航站。发现想试的写作、办公、设计或智能体工具后，可把其官网继续收藏到这里。'}
  ];
  function initializeSamples(state){
    if(state.agentSamplesVersion===1)return state;
    state.agents=state.agents||[];
    const existing=new Set(state.agents.map(item=>{try{return link(item.url);}catch{return item.url;}}));
    for(const sample of [...samples].reverse()){
      if(existing.has(link(sample.url)))continue;
      let id='sample-agent-'+sample.key;
      while(state.agents.some(item=>item.id===id))id+='-sample';
      save(state,'',{...sample,status:'saved'},id);
    }
    state.agentSamplesVersion=1;
    return state;
  }
  function link(value){try{return links.link(value);}catch(err){throw Error(err.message.replaceAll('Skill 地址','网站地址'));}}
  function source(value){try{const host=new URL(link(value)).hostname.replace(/^www\./,'');return {host,name:host.split('.')[0]};}catch{return {host:'链接待修正',name:''};}}
  function save(state,id,data,newId){
    const bucket={skills:state.agents||[]};
    try{const item=links.save(bucket,id,data,newId);state.agents=bucket.skills;return item;}catch(err){throw Error(err.message.replaceAll('Skill','网站'));}
  }
  const api={statuses,link,source,save,initializeSamples,tags:links.tags,matches:links.matches,sorted:links.sorted};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentModel=api;
})(typeof window==='undefined'?globalThis:window);
