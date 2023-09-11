function getFormattedDuration(durationMs) {
  let durationSec = durationMs / 1000;
  const durationMin = Math.floor(durationSec / 60);

  let durationStr = `${durationSec.toFixed()}s`;
  if (durationMin > 0) {
    durationSec = durationSec % 60;
    durationStr = `${durationMin.toFixed()}m ${durationSec.toFixed()}s`;
  }

  return durationStr;
}

/**
 * @param {import("./gameState").GameState} gameState
 */
export function showDefeat(gameState) {
  const {
    time: { currentFrameTime, startTime },
  } = gameState;

  document.body.dataset.stage = "defeat";

  const durationMs = currentFrameTime - startTime;
  let durationStr = getFormattedDuration(durationMs);

  document.querySelector("#duration").innerHTML = durationStr;

  const bestEffort = localStorage.getItem(`0ctothorp.js13k23.bestDurationMs`) || "0";
  if (Math.floor(durationMs) > Number(bestEffort)) {
    localStorage.setItem(`0ctothorp.js13k23.bestDurationMs`, durationMs.toFixed());
  }

  if (Number(bestEffort) > 0) {
    document.querySelector("#best-effort-p").classList.remove("dispnone");
    document.querySelector("#best-effort-v").innerHTML = getFormattedDuration(Number(bestEffort));
  }
}
