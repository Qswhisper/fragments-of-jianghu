/* Keep the painted figure and street in one image; only interface accents vary. */
(function () {
  'use strict';
  const ui=document.getElementById('entry-ui'),background=G.render.journeyEntry.paths.styles;
  const moods={
    blade:{accent:'#a66652',ink:'#c69c7e'},
    iron:{accent:'#a99470',ink:'#c5b18d'},
    dirty:{accent:'#839772',ink:'#b0ba98'},
    combo:{accent:'#809c9c',ink:'#b2c0bd'}
  };
  const baseRender=G.scenes.title.render;
  let active=false,lastTime=0,clock=0,target='blade',accentId='',lightStrength=0;
  function tick(s){
    const now=s.timeMs||0,dt=active?Math.max(0,Math.min(60,now-lastTime)):0;
    lastTime=now;active=true;target=s.title.selectedStyle||'blade';
    if(!G.render.journeyMotion?.disabled())clock+=dt;
    if(accentId!==target){accentId=target;ui.style.setProperty('--school-accent',moods[target].accent);ui.style.setProperty('--school-ink',moods[target].ink);}
  }
  G.scenes.title.render=function(s,ctx){
    baseRender(s,ctx);
    if(s.scene!=='title'||s.title?.mode!=='styles'||G.render.journeyEntry.waiting(s)){active=false;accentId='';return;}
    tick(s);
    // A slow, broad daylight change affects the complete painting together.
    // No separate silhouette, camera movement, cursor drift or style-dependent tint.
    lightStrength=G.render.journeyMotion?.disabled()?0:.008+.004*Math.sin(clock/6500);
    if(lightStrength){
      ctx.save();const light=ctx.createRadialGradient(624,130,80,624,220,730);
      light.addColorStop(0,'rgba(185,199,203,'+lightStrength+')');light.addColorStop(1,'rgba(185,199,203,0)');
      ctx.fillStyle=light;ctx.fillRect(0,0,1280,720);ctx.restore();
    }
  };
  G.render.journeyEntryStage={assetPaths:[background],moods,ready:()=>G.render.assets.getImageEntry(background).loaded,
    debug:()=>({active,target,clock,lightStrength,reduced:!!G.render.journeyMotion?.disabled(),renderer:'fixed-background',background,sceneTransform:'none'})};
})();
