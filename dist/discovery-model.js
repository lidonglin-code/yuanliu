(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.DiscoveryModel=model;})(typeof window==='undefined'?globalThis:window,()=>{
  const catalog=[
    {id:'transit',domain:'天文学',concept:'凌日法',title:'看不见一颗行星，也能知道它在那里吗？',summary:'有时，发现一个世界的线索，是恒星光线里一次微小的变暗。',body:['行星从恒星前方经过，挡住一小部分星光，这个现象叫“凌日”。望远镜可以持续测量恒星亮度，寻找反复出现的下降。','凌日法通过光的变化间接寻找行星。亮度下降的幅度能帮助估计行星相对恒星的大小；重复出现的时间间隔则提示轨道周期。','这种方法也有观察条件：行星轨道的方向必须让它从我们的视线中掠过恒星。没有观测到凌日，并不等于那里没有行星。'],example:'像隔着窗帘看灯：你未必能看清经过灯前的物体，却可能从光线规律性的变化发现它。这个比喻只用于理解间接观测。',question:'面对一件难以直接观察的事，你可以寻找什么可重复的间接信号？',source:'NASA · What’s a transit?',url:'https://science.nasa.gov/exoplanets/whats-a-transit/',motif:'orbit'},
    {id:'color',domain:'包容性设计',concept:'冗余线索',title:'如果去掉颜色，一张图还能被读懂吗？',summary:'颜色之外，多给一条识别线索，信息就能被更多人接住。',body:['W3C 的“颜色使用”准则要求：不能只靠颜色传达信息、提示操作或区分视觉元素。不同人的色觉能力不同，颜色信息也可能在某些显示条件下变得难以辨认。','因此，颜色可以与文字、形状、图案等线索配合。这样，即使某条视觉线索失效，读者仍有别的路径理解含义。','这里强调的是信息表达方式；字体与背景的对比度还需要另行检查。加一个标签，也并不等于整个界面就已经满足所有无障碍要求。'],example:'假设项目状态原本只有红点、绿点，可以再加“待处理”“已完成”文字；折线图除了不同颜色，还可以使用实线和虚线。',question:'看看你最近做的一张图：如果打印成黑白版，哪些信息会消失？',source:'W3C · Understanding SC 1.4.1: Use of Color',url:'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color',motif:'grid'},
    {id:'coral',domain:'海洋生物学',concept:'共生关系',title:'一座珊瑚礁，藏着怎样的合作关系？',summary:'珊瑚和体内微小的藻类，通过物质交换共同生活。',body:['许多造礁珊瑚的组织内生活着共生藻。珊瑚为它们提供受保护的环境，以及光合作用所需的部分物质。','藻类利用阳光进行光合作用，产生的有机物等为珊瑚提供重要支持。这种相互关联的生活方式，是理解珊瑚礁的一个入口。','观察一个生物时，只看它自身可能不够。与它共同生活的其他生物，也可能深刻影响它的生存条件。不同珊瑚的情况并非完全相同，不能把这一关系套用到所有珊瑚。'],example:'NOAA 的珊瑚教程展示了珊瑚与共生藻之间的交换：一方提供环境与原料，另一方将光能转化为可利用的产物。',question:'你身边有哪些看起来独立的事物，其实依赖一段不显眼的合作关系？',source:'NOAA · What is Zooxanthellae?',url:'https://oceanservice.noaa.gov/education/tutorial_corals/coral02_zooxanthellae.html',motif:'branch'},
    {id:'sound',domain:'声学与音乐',concept:'共振',title:'为什么长短不同的管子，会“选中”不同的声音？',summary:'管子的长度改变了它对声音频率的响应。',body:['旧金山探索馆的“Pipes of Pan”展项介绍了管子的共振：每根管子会在与其长度有关的特定频率下产生明显响应。','声音中可以包含很多频率。一根管子对其中某些频率响应更强，因而让我们听到不同的音调特征。','这个现象提醒我们：接收声音的结构本身也在影响结果。实际频率还与管口条件等因素有关，不能仅凭长短推算所有管子的音高。'],example:'在展项里，人们聆听不同长度的管子，可以感受共振频率的差异。这里的关键是结构改变了频率响应。',question:'试着听一听同一段声音在不同空间里的变化：你能分辨声音来源和空间带来的影响吗？',source:'Exploratorium · Pipes of Pan',url:'https://annex.exploratorium.edu/xref/exhibits/pipes_of_pan.html',motif:'wave'},
    {id:'entropy',domain:'信息论',concept:'信息熵',title:'一条消息有多少信息，与它有多少字一样吗？',summary:'信息论从“不确定性”出发，给了我们另一种衡量方式。',body:['信息熵衡量随机变量的不确定性。若结果几乎可以提前知道，不确定性就比较低；在多个等可能结果中做选择，不确定性会更高。','以公平硬币为例，正反两种结果各有一半机会，结果揭晓前的香农熵是 1 比特。如果结果始终是正面，对这一结果就没有同样的不确定性。','这种数学意义的信息量，不等于一段话的情感、价值或重要程度。它描述的是概率与不确定性，使用时需要守住这个边界。'],example:'“硬币这次是正面”和“今天太阳升起了”即使字数接近，也可能对应完全不同的事前不确定性。这里用的是简化的概率模型。',question:'你最近获得的一条信息，究竟消除了哪个具体的不确定性？',source:'NIST · Entropy glossary',url:'https://csrc.nist.gov/glossary/term/entropy',motif:'grid'},
    {id:'sculpture',domain:'现代雕塑',concept:'抽象表达',title:'一只没有羽毛和翅膀的“鸟”，还能表达什么？',summary:'从布朗库西的《空间中的鸟》，尝试另一种观看方式。',body:['美国国家美术馆收藏的一件《空间中的鸟》创作于 1925 年，作者是康斯坦丁·布朗库西。作品使用大理石、石材和木材。','馆方的视觉描述呈现了一个纵向伸展、中部略鼓、两端渐收的形体，以及层叠的底座。它没有用写实的羽毛和翅膀去塑造一只鸟。','观看练习：暂时放下“像不像鸟”的判断，转而观察曲线、比例和向上的方向。你是否会从这些形式中感到某种运动？这是一个开放的阅读角度，并不是唯一解释。'],example:'打开来源页，先看作品再看名称：分别写下三个形容词，比较名称是否改变了你的观看。',question:'如果只能留下三条线，你会怎样表达“生长”“等待”或“轻盈”？',source:'National Gallery of Art · Bird in Space',url:'https://www.nga.gov/artworks/50750-bird-space',motif:'spire'},
    {id:'keystone',domain:'生态系统',concept:'关键种',title:'为什么一种动物，能改变一片生态系统？',summary:'理解一个系统，有时要看关系和影响，而不只是数量。',body:['美国国家公园管理局介绍海獭时，将它们视为北太平洋近岸生态系统中的关键种。这个概念关注某个物种对生态结构产生的重要影响。','海獭的捕食会影响食物网中的其他生物。冰川湾的海獭恢复过程，为研究这些关联提供了观察机会。','因此，评估一个物种的作用，除了看数量，也需要看它与其他物种的关系。生态系统存在地区差异，某地观察到的结果不能原样推广到所有环境。'],example:'NPS 的冰川湾研究简介，把海獭种群的恢复与近岸食物网的变化放在一起讨论，展示了从关系理解系统的思路。',question:'观察一个你熟悉的系统：哪个数量不多、却连接着许多环节的角色，容易被低估？',source:'NPS · Sea Otters: A Keystone Species in Glacier Bay',url:'https://www.nps.gov/articles/000/so2020brief.htm',motif:'branch'}
  ].map(article=>({...article,mode:'curated',checkedAt:'2026-09-25'}));
  function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
  function localDate(date=new Date()){return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function initialize(state){if(!Array.isArray(state.dailyReadings))state.dailyReadings=[];if(!Array.isArray(state.insights))state.insights=[];}
  function forDate(state,date=localDate()){return (state.dailyReadings||[]).find(r=>r.date===date);}
  function select(state,date=localDate()){
    const existing=forDate(state,date);if(existing)return existing;
    const past=(state.dailyReadings||[]).filter(r=>r.date<date).sort((a,b)=>b.date.localeCompare(a.date));
    const seen=new Set(past.map(r=>r.article.id));
    let article=catalog.find(a=>!seen.has(a.id));
    const revisit=!article;
    if(!article){const index=catalog.findIndex(a=>a.id===past[0]?.article.id);article=catalog[(index+1)%catalog.length];}
    return {date,article:JSON.parse(JSON.stringify(article)),revisit,openedAt:''};
  }
  function ensure(state,date=localDate()){initialize(state);const record=forDate(state,date);if(record)return record;const next=select(state,date);state.dailyReadings.unshift(next);return next;}
  function find(state,id){return (state.insights||[]).find(a=>a.id===id)||(state.dailyReadings||[]).find(r=>r.article.id===id)?.article||catalog.find(a=>a.id===id);}
  function save(state,article,now=new Date().toISOString()){initialize(state);if(!state.insights.some(a=>a.id===article.id))state.insights.unshift({...JSON.parse(JSON.stringify(article)),savedAt:now});}
  function unsave(state,id){initialize(state);state.insights=state.insights.filter(a=>a.id!==id);}
  return {catalog,safeUrl,localDate,initialize,forDate,select,ensure,find,save,unsave};
});
