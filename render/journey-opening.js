/* The approved fixed-painting direction, shared by the real opening and sample. */
(function () {
  'use strict';
  const ui=document.getElementById('entry-ui'),baseLayout=G.render.journeyEntry.layout,baseRender=G.scenes.title.render;
  const descriptions={
    blade:{line:"逼出破绽，再舍身下重手。",kind:'破绽'},
    iron:{line:"蓄势反击；借掩护避枪。",kind:'架势'},
    dirty:{line:"迷眼断筋，拖垮对手。",kind:'溃烂'},
    combo:{line:"近身连打，压住敌势。",kind:'连环'}
  };
  const inspectBox={x:860,y:616,width:168,height:72};let selected='',detailAnimation,builtMode='';
  const arrivalPaths={gate:G.render.journeyStory.paths.arrival,alley:'assets/journey/redesign-20261005/arrival-alley.png'};
  Object.values(arrivalPaths).forEach(p=>G.render.assets.getImageEntry(p));
  function place(e,b){Object.assign(e.style,{left:b.x/12.8+'%',top:b.y/7.2+'%',width:b.width/12.8+'%',height:b.height/7.2+'%'});return e;}
  function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  function label(text,cls,b){const e=place(node('div',text,cls),b);ui.append(e);return e;}
  function action(text,cls,b,id,callback){const e=place(node('button',undefined,cls),b);e.type='button';e.setAttribute('aria-label',text);e.dataset.entryFocus=id;e.onclick=callback||(()=>{if(id.startsWith('arrival-')&&G.render.journeyMotion?.debug().transition)return;G.main.queueSceneClick({x:b.x+b.width/2,y:b.y+b.height/2});});e.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key))event.preventDefault();});ui.append(e);return e;}
  function primary(text,b,id,note){const e=action(text,'entry-start',b,id);e.append(node('span',text,'cinematic-start-label'),node('span','','cinematic-forward'));if(note)e.append(node('span',note,'cinematic-start-note'));e.querySelector('.cinematic-forward').setAttribute('aria-hidden','true');return e;}
  function fit(){const c=document.getElementById('game-canvas').getBoundingClientRect(),s=document.getElementById('game-shell').getBoundingClientRect();Object.assign(ui.style,{left:c.left-s.left+'px',top:c.top-s.top+'px',width:c.width+'px',height:c.height+'px'});}
  G.render.journeyEntry.layout=function(base){return {...baseLayout(base),styleRail:{x:852,y:192,width:354,height:72,gap:4,horizontal:false},backButton:{x:58,y:40,width:142,height:46},startButton:{x:1048,y:612,width:158,height:72}};};
  function build(s){
    ui.replaceChildren();ui.classList.add('cinematic-entry');ui.classList.remove('cinematic-menu','cinematic-arrival','cinematic-passage');selected='';const L=G.scenes.title.getLayout(),boxes=G.scenes.title.getStyleBoxes(L);
    label('选择流派','cinematic-heading',{x:852,y:98,width:354,height:48});
    label('武艺仍在，重整此行招式','cinematic-kind',{x:852,y:151,width:354,height:24});
    const marker=label('','cinematic-selection',{x:835,y:211,width:3,height:24});marker.setAttribute('aria-hidden','true');
    boxes.forEach((b,i)=>{const o=s.title.options[i],e=action(o.name,'entry-school',b,o.id),number=node('span',String(i+1).padStart(2,'0'),'cinematic-number'),kind=node('span',descriptions[o.id].kind,'cinematic-kind');number.setAttribute('aria-hidden','true');kind.setAttribute('aria-hidden','true');e.append(number,node('span',o.name,'school-name'),kind);});
    const detail=label('','cinematic-detail',{x:888,y:510,width:318,height:88});detail.setAttribute('aria-live','polite');detail.setAttribute('aria-atomic','true');
    const inspect=action('起手招式','entry-loadout',inspectBox,'loadout',()=>G.journeyShell.openStarterDeck());
    inspect.append(node('span','起手招式'),node('span',' ↗','cinematic-small-arrow'));
    primary('入城',L.startButton,'start');
    const back=action('返回','entry-back',L.backButton,'back');back.append(node('span','返回','cinematic-back-label'));
  }
  function buildMenu(s){
    ui.replaceChildren();ui.classList.add('cinematic-entry','cinematic-menu');ui.classList.remove('cinematic-arrival','cinematic-passage');selected='';
    label('江湖残卷','entry-title',{x:78,y:114,width:470,height:94});label('1.0 正式版','entry-subtitle entry-version',{x:88,y:214,width:340,height:38});
    const copy=['踏入九城','再续前路','设置','制作与鸣谢'];
    G.scenes.title.getLayout().menuButtons.forEach((b,i)=>{if(i===1&&!s.title.continueAvailable)return;const callback=i===2?()=>G.journeyShell.openSettings():i===3?()=>G.journeyShell.openCredits():null;const e=action(copy[i],'entry-menu-button'+(i===0?' primary':''),b,b.id,callback);e.append(node('span',copy[i]));if(i===0){const arrow=node('span','','cinematic-forward');arrow.setAttribute('aria-hidden','true');e.append(arrow);}});
    const note=G.render.journeyEntry.saveNote(s);if(note)label(note,'entry-save-note',{x:88,y:496,width:480,height:22});
  }
  function sync(s){
    if(G.render.journeyMotion?.disabled()){detailAnimation?.cancel();detailAnimation=null;}
    else if(detailAnimation&&G.main){if(G.main.isPaused()&&detailAnimation.playState==='running')detailAnimation.pause();else if(!G.main.isPaused()&&detailAnimation.playState==='paused')detailAnimation.play();}
    ui.querySelectorAll('.entry-school').forEach(e=>{const active=e.dataset.entryFocus===s.title.selectedStyle;e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));e.querySelectorAll('.school-hint').forEach(h=>h.setAttribute('aria-hidden','true'));});
    if(selected===s.title.selectedStyle)return;selected=s.title.selectedStyle;const index=s.title.options.findIndex(o=>o.id===selected),detail=ui.querySelector('.cinematic-detail');
    ui.querySelector('.cinematic-selection').style.top=(211+index*76)/7.2+'%';detail.textContent=descriptions[selected].line;
    detailAnimation?.cancel();if(!G.render.journeyMotion?.disabled())detailAnimation=detail.animate([{opacity:.15,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  G.scenes.title.render=function(s,ctx){
    baseRender(s,ctx);const mode=s.scene==='title'&&['menu','styles'].includes(s.title?.mode)&&!G.render.journeyEntry.waiting(s)?s.title.mode:null;
    if(!mode){ui.classList.remove('cinematic-entry','cinematic-menu','cinematic-arrival');selected='';builtMode='';return;}
    if(mode==='menu'){const menuMode='menu:'+s.title.continueAvailable+':'+G.render.journeyEntry.saveNote(s);if(builtMode!==menuMode||!ui.classList.contains('cinematic-menu')){buildMenu(s);builtMode=menuMode;}return;}
    // Light falls away gradually toward the choices, without a panel boundary.
    const shade=ctx.createLinearGradient(700,0,1280,0);shade.addColorStop(0,'rgba(4,7,8,0)');shade.addColorStop(.5,'rgba(4,7,8,.08)');shade.addColorStop(1,'rgba(4,7,8,.12)');ctx.save();ctx.fillStyle=shade;ctx.fillRect(700,0,580,720);ctx.restore();
    if(builtMode!=='styles'||!ui.querySelector('.cinematic-heading')){build(s);builtMode='styles';}sync(s);
  };
  const arrivalLayout=()=>({next:{x:790,y:552,width:410,height:64}});
  const waiting=s=>s.scene==='arrival'&&!G.render.assets.getImageEntry(arrivalPaths[s.arrival?.stage||'gate']).loaded;
  function buildArrival(s){
    const gate=s.arrival.stage==='gate',focused=ui.contains(document.activeElement)?document.activeElement.dataset.entryFocus:null;
    ui.replaceChildren();ui.classList.add('cinematic-entry','cinematic-arrival');ui.classList.remove('cinematic-menu','cinematic-passage');
    label(gate?'雨夜入城':'泥巷拦路','cinematic-heading',{x:740,y:146,width:470,height:64});
    const prose=label('','cinematic-story-body',{x:742,y:230,width:466,height:305});
    G.journeyNarrative.arrival(s,s.arrival.stage).split('\n').filter(Boolean).forEach((line,i)=>{const paragraph=node('p',line);if(gate&&i===0)paragraph.textContent=line.replace('死士，','死士，\n');prose.append(paragraph);});
    const L=arrivalLayout();primary(gate?'循缺口入城':'迎上拦路人',L.next,'arrival-next');
    if(focused==='arrival-next'||focused==='start')ui.querySelector('[data-entry-focus="arrival-next"]').focus({preventScroll:true});
  }
  G.scenes.arrival.getLayout=arrivalLayout;
  G.scenes.arrival.coversCanvas=true;
  G.scenes.arrival.render=function(s,ctx){
    G.journeyShell?.syncUI(s);fit();
    if(waiting(s)){ui.hidden=true;builtMode='';ctx.fillStyle='#101618';ctx.fillRect(0,0,1280,720);G.render.woodcut.text(ctx,'静候片刻，城门将开。',640,362,22,'#a9a08b','center');return;}
    ctx.fillStyle='#101618';ctx.fillRect(0,0,1280,720);G.render.assets.drawImageCover(ctx,arrivalPaths[s.arrival.stage],0,0,1280,720);
    const shade=ctx.createLinearGradient(630,0,1280,0);shade.addColorStop(0,'rgba(5,9,12,0)');shade.addColorStop(.38,'rgba(5,9,12,.45)');shade.addColorStop(1,'rgba(5,9,12,.55)');ctx.fillStyle=shade;ctx.fillRect(630,0,650,720);
    ui.hidden=false;const mode='arrival:'+s.arrival.stage;if(builtMode!==mode||!ui.classList.contains('cinematic-arrival')){buildArrival(s);builtMode=mode;}
  };
  const passageLayout=()=>{
    const phone=!!window.KGAME_MOBILE||document.getElementById('game-canvas').getBoundingClientRect().width<900;
    const x=phone?698:742,width=phone?510:466;
    return {phone,heading:{x:x-2,y:142,width,height:74},body:{x,y:240,width,height:316},next:{x,y:586,width,height:88}};
  };
  const passageWaiting=s=>{const p=G.journeyPassage.describe(s);return !!p&&!G.render.assets.getImageEntry(p.art).loaded;};
  function renderPassage(s,ctx){
    const p=G.journeyPassage.describe(s);if(!p)return;
    const L=passageLayout();
    G.journeyShell?.syncUI(s);fit();
    ctx.fillStyle='#101618';ctx.fillRect(0,0,1280,720);
    if(passageWaiting(s)){ui.hidden=true;builtMode='';return;}
    G.render.assets.drawImageCover(ctx,p.art,0,0,1280,720);
    const shade=ctx.createLinearGradient(620,0,1280,0);shade.addColorStop(0,'rgba(5,9,12,0)');shade.addColorStop(.30,'rgba(5,9,12,.34)');shade.addColorStop(1,'rgba(5,9,12,.58)');ctx.fillStyle=shade;ctx.fillRect(620,0,660,720);
    ui.hidden=false;
    const mode='passage:'+p.act+':'+(s.mission?.storyRevision||0)+':'+L.phone;
    if(builtMode===mode&&ui.classList.contains('cinematic-arrival'))return;
    ui.replaceChildren();ui.classList.add('cinematic-entry','cinematic-arrival','cinematic-passage');ui.classList.remove('cinematic-menu');
    ui.style.setProperty('--story-body-size',L.phone?'2.03125cqw':'1.71875cqw');
    ui.style.setProperty('--story-action-size',L.phone?'2.8125cqw':'2.65625cqw');
    label(p.title,'cinematic-heading',L.heading);
    const prose=label('','cinematic-story-body',L.body);
    p.body.split('\n').filter(Boolean).forEach(line=>prose.append(node('p',line)));
    primary(p.button,L.next,'passage-next');builtMode=mode;
  }
  window.addEventListener('keydown',e=>{if(e.defaultPrevented||e.repeat||!['Enter',' '].includes(e.key)||e.target.closest?.('button,input,select,textarea')||document.getElementById('journey-dialog').open||!G.journeyPassage?.active(G.main?.getState()))return;e.preventDefault();const b=passageLayout().next;G.main.queueSceneClick({x:b.x+b.width/2,y:b.y+b.height/2});});
  G.render.journeyOpening={inspectBox,descriptions,arrivalPaths,waiting,passageLayout,passageWaiting,renderPassage};
  G.render.journeyEntrySample=G.render.journeyOpening;
})();

