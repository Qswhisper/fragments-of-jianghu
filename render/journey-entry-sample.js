/* A separate playable direction study. The production entry remains unchanged. */
(function () {
  'use strict';
  const ui=document.getElementById('entry-ui'),baseLayout=G.render.journeyEntry.layout,baseRender=G.scenes.title.render;
  const descriptions={
    blade:{line:'以伤换命，叠破绽后斩杀。',kind:'破绽'},
    iron:{line:'先蓄架势，硬接一轮后反击。',kind:'架势'},
    dirty:{line:'迷眼、断筋，让伤势逐步恶化。',kind:'溃烂'},
    combo:{line:'贴近对手，连环出手压住敌势。',kind:'连环'}
  };
  const inspectBox={x:916,y:570,width:218,height:40};let selected='',detailAnimation;
  function place(e,b){Object.assign(e.style,{left:b.x/12.8+'%',top:b.y/7.2+'%',width:b.width/12.8+'%',height:b.height/7.2+'%'});return e;}
  function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  function label(text,cls,b){const e=place(node('div',text,cls),b);ui.append(e);return e;}
  function action(text,cls,b,id,callback){const e=place(node('button',undefined,cls),b);e.type='button';e.setAttribute('aria-label',text);e.dataset.entryFocus=id;e.onclick=callback||(()=>G.main.queueSceneClick({x:b.x+b.width/2,y:b.y+b.height/2}));ui.append(e);return e;}
  G.render.journeyEntry.layout=function(base){return {...baseLayout(base),styleRail:{x:880,y:210,width:320,height:54,gap:14,horizontal:false},backButton:{x:58,y:40,width:142,height:46},startButton:{x:916,y:620,width:282,height:76}};};
  function build(s){
    ui.replaceChildren();ui.classList.add('cinematic-entry');selected='';const L=G.scenes.title.getLayout(),boxes=G.scenes.title.getStyleBoxes(L);
    label('入城之前','cinematic-eyebrow',{x:880,y:99,width:320,height:24});
    label('选择流派','cinematic-heading',{x:880,y:133,width:320,height:48});
    const marker=label('','cinematic-selection',{x:858,y:226,width:3,height:22});marker.setAttribute('aria-hidden','true');
    boxes.forEach((b,i)=>{const o=s.title.options[i],e=action(o.name,'entry-school',b,o.id),number=node('span',String(i+1).padStart(2,'0'),'cinematic-number'),kind=node('span',descriptions[o.id].kind,'cinematic-kind');number.setAttribute('aria-hidden','true');kind.setAttribute('aria-hidden','true');e.append(number,node('span',o.name,'school-name'),kind);});
    const detail=label('','cinematic-detail',{x:916,y:482,width:282,height:72});detail.setAttribute('aria-live','polite');detail.setAttribute('aria-atomic','true');
    const inspect=action('招式','entry-loadout',inspectBox,'loadout',()=>G.journeyShell.openStarterDeck());inspect.append(node('span','查看起手招式'),node('span','↗','cinematic-small-arrow'));
    const start=action('入城','entry-start',L.startButton,'start');start.append(node('span','入城','cinematic-start-label'),node('span','','cinematic-forward'),node('span','从城门开始这一程','cinematic-start-note'));start.querySelector('.cinematic-forward').setAttribute('aria-hidden','true');
    const back=action('返回','entry-back',L.backButton,'back');back.append(node('span','返回','cinematic-back-label'));
  }
  function sync(s){
    if(G.render.journeyMotion?.disabled()){detailAnimation?.cancel();detailAnimation=null;}
    else if(detailAnimation&&G.main){if(G.main.isPaused()&&detailAnimation.playState==='running')detailAnimation.pause();else if(!G.main.isPaused()&&detailAnimation.playState==='paused')detailAnimation.play();}
    ui.querySelectorAll('.entry-school').forEach(e=>{const active=e.dataset.entryFocus===s.title.selectedStyle;e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));e.querySelectorAll('.school-hint').forEach(h=>h.setAttribute('aria-hidden','true'));});
    if(selected===s.title.selectedStyle)return;selected=s.title.selectedStyle;const index=s.title.options.findIndex(o=>o.id===selected),detail=ui.querySelector('.cinematic-detail');
    ui.querySelector('.cinematic-selection').style.top=(226+index*68)/7.2+'%';detail.textContent=descriptions[selected].line;
    detailAnimation?.cancel();if(!G.render.journeyMotion?.disabled())detailAnimation=detail.animate([{opacity:.15,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  G.scenes.title.render=function(s,ctx){
    baseRender(s,ctx);const active=s.scene==='title'&&s.title?.mode==='styles'&&!G.render.journeyEntry.waiting(s);
    if(!active){ui.classList.remove('cinematic-entry');selected='';return;}
    // Light falls away gradually toward the choices, without a panel boundary.
    const shade=ctx.createLinearGradient(700,0,1280,0);shade.addColorStop(0,'rgba(4,7,8,0)');shade.addColorStop(.5,'rgba(4,7,8,.08)');shade.addColorStop(1,'rgba(4,7,8,.12)');ctx.save();ctx.fillStyle=shade;ctx.fillRect(700,0,580,720);ctx.restore();
    if(!ui.querySelector('.cinematic-heading'))build(s);sync(s);
  };
  G.render.journeyEntrySample={inspectBox,descriptions};
})();
