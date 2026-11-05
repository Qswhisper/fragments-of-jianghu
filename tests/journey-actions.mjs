// Actual pointer passage through the optional full-game prologue.
export async function finishArrival(page,{touch=false}={}){
  await page.waitForFunction(()=>['arrival','combat'].includes(G.main.getState().scene));
  for(let i=0;i<3&&await page.evaluate(()=>G.main.getState().scene==='arrival');i++){
    await page.waitForFunction(()=>!G.render.journeyMotion?.debug().transition&&!G.render.journeyOpening?.waiting(G.main.getState()));const b=await page.evaluate(()=>G.scenes.arrival.getLayout().next),c=await page.locator('#game-canvas').boundingBox();
    const x=c.x+(b.x+b.width/2)*c.width/1280,y=c.y+(b.y+b.height/2)*c.height/720;
    if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y,{delay:45});await page.waitForTimeout(180);
  }
  await page.waitForFunction(()=>G.main.getState().scene==='combat');
}
