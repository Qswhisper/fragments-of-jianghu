/* Background-only cover for wide displays; figures, UI, input and saves retain 1280x720. */
(function(){
 'use strict';
 const stage=document.getElementById('game-canvas');
 const shell=document.getElementById('game-shell');if(!stage||!shell)return;
 const backdrop=document.createElement('canvas');backdrop.id='world-backdrop';backdrop.setAttribute('aria-hidden','true');
 shell.prepend(backdrop);
 const brush=backdrop.getContext('2d',{alpha:false});
 let mode='',signature='',view={width:1280,height:720},last=null,painted='',stateKey='';
 const records=new Map();
 function begin(state){
  const b=stage.getBoundingClientRect(),scale=b.width/1280;
  const width=innerWidth/scale,height=innerHeight/scale;
  const opening=state.scene==='arrival'||state.scene==='title'&&state.title?.mode!=='report'||state.scene==='combat'&&!state.map?.currentNodeId;
  const nextMode=opening?'':state.scene==='map'&&!G.journeyPassage?.active(state)?'atlas':state.scene==='combat'?'combat':state.scene==='reward'?'reward':state.scene==='shop'?'shop':state.scene==='rest'?'rest':state.scene==='map'?'passage':state.scene==='event'||state.scene==='title'?'story':state.scene;
  const nextKey=[nextMode,state.map?.actNumber,state.event?.eventId,state.map?.passage?.act].join(':');
  if(nextKey!==stateKey){last=null;painted='';stateKey=nextKey;}
  mode=nextMode;view={width:Math.max(1280,width),height:Math.max(720,height)};
  signature=[mode,view.width.toFixed(2),view.height.toFixed(2)].join(':');
  backdrop.hidden=!mode||(view.width<1282&&view.height<722);
  if(!backdrop.hidden&&mode==='atlas')paint(null);
  else if(last&&!backdrop.hidden)paint(last);
 }
 function shade(c){
  if(mode==='combat'){
   c.fillStyle='rgba(15,22,29,.19)';c.fillRect(-2000,-2000,5280,4720);
   const edge=c.createRadialGradient(663,325,155,640,340,760);edge.addColorStop(0,'rgba(5,8,11,.10)');edge.addColorStop(.62,'rgba(5,8,11,.40)');edge.addColorStop(1,'rgba(4,6,8,.92)');c.fillStyle=edge;c.fillRect(-2000,-2000,5280,4720);
   const ground=c.createLinearGradient(0,390,0,720);ground.addColorStop(0,'rgba(6,8,10,0)');ground.addColorStop(.47,'rgba(6,8,10,.70)');ground.addColorStop(1,'rgba(5,7,9,.96)');c.fillStyle=ground;c.fillRect(-2000,390,5280,2330);
  }else if(mode==='story'){
   const edge=c.createLinearGradient(0,0,1280,0);edge.addColorStop(0,'rgba(5,9,12,.06)');edge.addColorStop(.52,'rgba(5,9,12,.05)');edge.addColorStop(1,'rgba(5,9,12,.38)');c.fillStyle=edge;c.fillRect(-2000,-2000,5280,4720);
  }else if(mode==='shop'){
   const g=c.createLinearGradient(0,0,0,150);g.addColorStop(0,'#080f14bf');g.addColorStop(1,'#080f1400');c.fillStyle=g;c.fillRect(-2000,-2000,5280,2150);
  }else if(mode==='passage'){
   const g=c.createLinearGradient(620,0,1280,0);g.addColorStop(0,'rgba(5,9,12,0)');g.addColorStop(.30,'rgba(5,9,12,.34)');g.addColorStop(1,'rgba(5,9,12,.58)');c.fillStyle=g;c.fillRect(620,-2000,2660,4720);
  }
 }
 function paint(record){
  const key=[signature,record?.path,record?.filter,JSON.stringify(record?.options),innerWidth,innerHeight,devicePixelRatio].join('|');if(key===painted)return;
  const density=Math.min(2,devicePixelRatio||1),w=Math.round(innerWidth*density),h=Math.round(innerHeight*density);
  if(backdrop.width!==w||backdrop.height!==h){backdrop.width=w;backdrop.height=h;}
  brush.setTransform(w/view.width,0,0,h/view.height,(view.width-1280)/2*w/view.width,(view.height-720)/2*h/view.height);
  brush.fillStyle=mode==='atlas'?'#b9aa8d':'#101619';brush.fillRect(-view.width,-view.height,view.width*3,view.height*3);
  if(record){brush.save();brush.filter=record.filter;draw(brush,record.image,record.options);brush.restore();shade(brush);}
  painted=key;
 }
 function draw(c,image,options={}){
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const scale=Math.max(view.width/iw,view.height/ih),w=iw*scale,h=ih*scale;
  const x=-(view.width-1280)/2-(w-view.width)*(options.focusX??.5),y=-(view.height-720)/2-(h-view.height)*(options.focusY??.5);
  c.save();c.globalAlpha=options.alpha??1;if(options.compositeMode)c.globalCompositeOperation=options.compositeMode;c.drawImage(image,x,y,w,h);c.restore();
 }
 function cover(c,path,image,x,y,w,h,options){
  if(!mode||mode==='atlas'||x!==0||y!==0||w!==1280||h!==720||backdrop.hidden)return false;
  // Only physical scene art is expanded. Full-screen textures/effects never
  // become a backdrop, and portraits/cards are never sampled or duplicated.
  if(!/assets\/(journey|ui)\//.test(path)||!/(background|battle-|event-|report-|shop-interior|nemesis-|rest-background|events-|art-refresh-|art-feedback-|scenes-feedback-|chapters-)/.test(path))return false;
  const record={path,image,options:options||{},filter:c.filter||'none'};last=record;records.set(signature+'|'+path,record);if(records.size>32)records.delete(records.keys().next().value);paint(record);draw(c,image,options);return true;
 }
 function restore(path){if(backdrop.hidden)return;const record=records.get(signature+'|'+path);if(record){last=record;paint(record);}}
 G.render.worldViewport={begin,cover,restore,get signature(){return signature;},debug:()=>({mode,signature,view,path:last?.path,visible:!backdrop.hidden,artOnly:true,retainedRecords:records.size})};
})();
