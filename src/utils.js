/** @typedef {{x: number; y: number}} NumVec2 */

export function debounce(fn, time) {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), time);
  };
}

/**
 * @param {NumVec2} vec
 */
export function vecLen(vec) {
  return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

/**
 * @param {NumVec2} a
 * @param {NumVec2} b
 */
export function vecSub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecNorm(v) {
  const len = vecLen(v);
  return { x: v.x / len, y: v.y / len };
}

/**
 * @param {import("./utils.js").NumVec2} pos - this param is mutated
 * @param {import("./utils.js").NumVec2} target
 * @param {number} speed
 */
export function moveTowards(pos, target, speed) {
  const vec = vecSub(target, pos);
  const len = vecLen(vec);
  const moveByVecPercent = speed / len;
  pos.x = pos.x + moveByVecPercent * vec.x;
  pos.y = pos.y + moveByVecPercent * vec.y;
}

/**
 * @param {NumVec2} pos - this param is mutated
 * @param {NumVec2} target
 * @param {number} speed
 */
export function moveAlongDirection(pos, target, speed) {
  const dir = vecNorm(target);
  pos.x = pos.x + speed * dir.x;
  pos.y = pos.y + speed * dir.y;
}
