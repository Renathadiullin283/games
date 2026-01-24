const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

export function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawHpBar(x, y, w, h, hp, maxHp) {
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x, y, (hp / maxHp) * w, h);
}

export function drawStickman(x, y, color = "#000") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // head
  ctx.beginPath();
  ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
  ctx.stroke();

  // body
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 20);
  ctx.stroke();

  // arms
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.stroke();

  // legs
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x - 10, y + 35);
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x + 10, y + 35);
  ctx.stroke();
}
