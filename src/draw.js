/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *    progress: number;
 *    fgColor: string;
 *    bgColor: string;
 *    topLeft: import('./utils').Vec2;
 *    h: number;
 *    w: number;
 * }} cfg
 */
function progressBar(
  ctx,
  { bgColor = "rgba(255, 255, 255, 0.25)", fgColor = "rgb(0, 255, 0)", progress, topLeft, w, h }
) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(topLeft.x, spos.y - sEnemySize / 2 - hpBarHeight, sEnemySize * 0.9, hpBarHeight);

  ctx.fillStyle = fgColor;
  ctx.fillRect(spos.x - (sEnemySize * 0.9) / 2, spos.y - sEnemySize / 2 - hpBarHeight, w, h);
}

export default {
  progressBar,
};
