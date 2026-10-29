import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';

const args=process.argv.slice(2),arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const output=fileURLToPath(await createVerificationOutput('material-layer-cache',arg('--output')));
const root=path.resolve(arg('--root','.'));
const report={scope:'Actual material raster comparisons, inherited compositing fallback, invalidation and bounded long-run cache; not native FPS.',comparisons:[],checks:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800},offline:true});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('https://kgame-material-test.invalid/**',async route=>{
    const file=path.resolve(root,decodeURIComponent(new URL(route.request().url()).pathname).slice(1));
    assert.ok(file.startsWith(root+path.sep));
    const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.ogg':'audio/ogg'};
    await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:await fs.readFile(file)});
  });
  await page.goto('https://kgame-material-test.invalid/play.html');
  await page.waitForFunction(()=>G.render.assets.getImageEntry('assets/ui/combat_panel_rotten_wood_plank_gpt4ovip_01.png').loaded);
  await page.evaluate(()=>G.main.setPaused(true));
  for(const density of [1,1.6875,2]){
    const results=await page.evaluate(density=>{
      const U=G.render.canvasUtils,A=G.render.assets,variants=[
        {width:44,height:60,hideNails:true},{width:142,height:54,hideNails:true},
        {width:220,height:78,hideNails:false},{width:140,height:54,alpha:.45},
        {width:140,height:54,filter:'brightness(.7)'},{width:140,height:54,shadow:true},
        {width:140,height:54,composite:'multiply'},{width:140,height:54,dash:true}
      ];
      window.materialPairs=[];
      return variants.map((v,index)=>{
        const canvases=[U.createLayer(280,180,density),U.createLayer(280,180,density)];
        canvases.forEach((c,i)=>{
          const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.fillStyle='#121519';ctx.fillRect(0,0,280,180);
          if(v.alpha)ctx.globalAlpha=v.alpha;if(v.filter)ctx.filter=v.filter;
          if(v.shadow){ctx.shadowColor='#efdbb9';ctx.shadowBlur=6;ctx.shadowOffsetX=4;ctx.shadowOffsetY=2;}
          if(v.composite)ctx.globalCompositeOperation=v.composite;if(v.dash)ctx.setLineDash([3,2]);
          A.drawCombatPanelSurface(ctx,17.25,23.5,v.width,v.height,{hideNails:v.hideNails,overlayAlpha:.36,stroke:'rgba(140,109,75,.26)',highlight:'rgba(180,144,93,.04)',lineWidth:1,skipCache:i===0});
        });
        const a=canvases[0],b=canvases[1],da=a.getContext('2d').getImageData(0,0,a.width,a.height).data,db=b.getContext('2d').getImageData(0,0,b.width,b.height).data;
        let sum=0,strong=0;for(let i=0;i<da.length;i+=4){let max=0;for(let j=0;j<3;j++){const d=Math.abs(da[i+j]-db[i+j]);sum+=d;max=Math.max(max,d);}if(max>40)strong++;}
        materialPairs.push(...canvases);
        return {density,index,fallback:index>=3,meanRgbDifference:sum/(da.length/4*3),strongDifferenceFraction:strong/(da.length/4)};
      });
    },density);
    for(const r of results){assert.ok(r.meanRgbDifference<1.5,JSON.stringify(r));assert.ok(r.strongDifferenceFraction<.012,JSON.stringify(r));if(r.fallback)assert.equal(r.meanRgbDifference,0);report.comparisons.push(r);}
    const png=await page.evaluate(()=>{const a=materialPairs[0],c=document.createElement('canvas');c.width=a.width*2;c.height=a.height*8;const ctx=c.getContext('2d');materialPairs.forEach((a,i)=>ctx.drawImage(a,i%2*a.width,Math.floor(i/2)*a.height));return c.toDataURL();});
    await fs.writeFile(path.join(output,'material-'+density+'.png'),Buffer.from(png.split(',')[1],'base64'));
  }
  report.cache=await page.evaluate(()=>{
    const U=G.render.canvasUtils,A=G.render.assets;U.layers.clear();
    const ctx=U.createLayer(420,240,2).getContext('2d');ctx.imageSmoothingQuality='high';
    let allocations=0;const create=U.createLayer;U.createLayer=function(...a){allocations++;return create.apply(this,a);};
    try{
      for(let i=0;i<100;i++)A.drawCombatPanelSurface(ctx,10+i*.1,10,44,60,{hideNails:true,overlayAlpha:.36});
      const motionAllocations=allocations;A.drawCombatPanelSurface(ctx,10,10,44,60,{hideNails:true,overlayAlpha:.18});const paletteAllocations=allocations-motionAllocations;
      for(let i=0;i<90;i++)A.drawCombatPanelSurface(ctx,10,10,340+i,190,{hideNails:true,overlayAlpha:.2+i*.001});
      const bounded=U.getLayerCacheDebug();
      const huge=U.cachedLayer('oversized-probe',4000,4000,1,()=>{}),oversizedCached=[...U.layers.values()].includes(huge);
      return {motionAllocations,paletteAllocations,bounded,afterOversized:U.getLayerCacheDebug(),oversizedCached};
    }finally{U.createLayer=create;}
  });
  assert.equal(report.cache.motionAllocations,1);assert.equal(report.cache.paletteAllocations,1);
  assert.ok(report.cache.bounded.bytes<=report.cache.bounded.budgetBytes);assert.ok(report.cache.bounded.layers<90);
  assert.equal(report.cache.oversizedCached,false);assert.deepEqual(report.cache.afterOversized,report.cache.bounded);
  report.checks.push('24 direct/cached material pixel comparisons at three densities','Opacity/filter/shadow/custom-composite/dash fallbacks exactly match direct pixels','100 translations reuse one layer; hover palette changes content','90 distinct panels remain bounded; oversized one-off allocation is not retained');
  assert.equal(report.errors.length,0);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'summary.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,cache:report.cache,errors:report.errors,failure:report.failure}));}
