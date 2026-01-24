// render.js
let shakeTime = 0;
let damageTexts = [];

export function clear(ctx) {
  if (!ctx) return;
  
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * 4;
    const dy = (Math.random() - 0.5) * 4;
    ctx.setTransform(1, 0, 0, 1, dx, dy);
    shakeTime--;
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function screenShake(ctx, duration = 10) {
  shakeTime = duration;
}

export function drawHpBar(ctx, x, y, w, h, hp, maxHp) {
  if (!ctx) return;
  
  // Фон
  ctx.fillStyle = "#333";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  
  // Пустая часть
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  
  // Заполненная часть
  const fillWidth = Math.max(0, (hp / maxHp) * w);
  if (fillWidth > 0) {
    // Градиент для HP
    const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
    if (hp / maxHp > 0.5) {
      gradient.addColorStop(0, "#00b09b");
      gradient.addColorStop(1, "#96c93d");
    } else if (hp / maxHp > 0.2) {
      gradient.addColorStop(0, "#f9d423");
      gradient.addColorStop(1, "#ff4e50");
    } else {
      gradient.addColorStop(0, "#ff416c");
      gradient.addColorStop(1, "#ff4b2b");
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, fillWidth, h);
    
    // Текст HP
    ctx.fillStyle = "#fff";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(hp)}/${maxHp}`, x + w/2, y + h/2 + 3);
  }
}

export function drawStickman(ctx, x, y, color = "#000") {
  if (!ctx) return;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  
  // Голова
  ctx.beginPath();
  ctx.arc(x, y - 25, 10, 0, Math.PI * 2);
  ctx.stroke();
  
  // Тело
  ctx.beginPath();
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x, y + 15);
  ctx.stroke();
  
  // Руки
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 5);
  ctx.lineTo(x + 15, y - 5);
  ctx.stroke();
  
  // Ноги
  ctx.beginPath();
  ctx.moveTo(x, y + 15);
  ctx.lineTo(x - 12, y + 30);
  ctx.moveTo(x, y + 15);
  ctx.lineTo(x + 12, y + 30);
  ctx.stroke();
  
  // Эффекты для игрока
  if (color === "#4cd137") {
    // Свечение для игрока
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

export function spawnDamageText(ctx, x, y, value, crit = false) {
  damageTexts.push({
    x,
    y,
    value,
    life: 60,
    crit,
    alpha: 1,
    velocity: { x: (Math.random() - 0.5) * 2, y: -2 }
  });
}

export function updateDamageTexts(ctx) {
  if (!ctx) return;
  
  damageTexts = damageTexts.filter(t => t.life > 0);
  damageTexts.forEach(t => {
    // Прозрачность
    t.alpha = t.life / 60;
    
    // Стиль текста
    ctx.fillStyle = t.crit ? `rgba(255, 215, 0, ${t.alpha})` : `rgba(255, 255, 255, ${t.alpha})`;
    ctx.font = t.crit ? "bold 18px Arial" : "14px Arial";
    ctx.textAlign = "center";
    
    // Тень для крита
    if (t.crit) {
      ctx.shadowColor = "#ff0";
      ctx.shadowBlur = 10;
    }
    
    // Рисуем текст
    ctx.fillText(t.value, t.x, t.y);
    
    // Сбрасываем тень
    ctx.shadowBlur = 0;
    
    // Движение
    t.x += t.velocity.x;
    t.y += t.velocity.y;
    t.velocity.y += 0.1; // гравитация
    
    t.life--;
  });
}
