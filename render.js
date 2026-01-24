const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let shakeTime = 0;
let damageTexts = [];

export function clear() {
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * 4;
    const dy = (Math.random() - 0.5) * 4;
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    shakeTime--;
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function screenShake(duration = 10) {
  shakeTime = duration;
}

export function drawHpBar(x, y, w, h, hp, maxHp) {
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x, y, Math.max(0, (hp / maxHp) * w), h);
}

export function drawStickman(x, y, color = "#000") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x - 10, y + 35);
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x + 10, y + 35);
  ctx.stroke();
}

export function spawnDamageText(x, y, value, crit = false) {
  damageTexts.push({
    x,
    y,
    value,
    life: 30,
    crit,
  });
}

export function updateDamageTexts() {
  damageTexts = damageTexts.filter(t => t.life > 0);
  damageTexts.forEach(t => {
    ctx.fillStyle = t.crit ? "#ff0" : "#fff";
    ctx.font = t.crit ? "bold 14px Arial" : "12px Arial";
    ctx.fillText(t.value, t.x, t.y);
    t.y -= 0.5;
    t.life--;
  });
}
