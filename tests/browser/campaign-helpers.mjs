/** Deliberate campaign intro action; camera setup START now opens round one intro. */
export async function beginRoundIntro(page,index=0){
 await page.waitForFunction(i=>window.__RR_GAME_TEST__?.getState().campaign?.phase==='intro'&&window.__RR_GAME_TEST__.getState().campaign.roundIndex===i,index);
 await page.locator('#begin-campaign-round').click();
 await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
}
