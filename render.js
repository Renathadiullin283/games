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
  if (color === "#4cd137" || color === "#9b59b6") {
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

// Новая функция для рисования фона
export function drawBackground(ctx, locationType, offset = 0) {
  if (!ctx) return;
  
  const canvas = ctx.canvas;
  
  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Фон в зависимости от типа локации
  switch(locationType) {
    case 'factory':
      // Заводской фон
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Грунт
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(0, 150, canvas.width, 50);
      
      // Трубы и здания (движущиеся с offset)
      ctx.fillStyle = '#34495e';
      for (let i = 0; i < 3; i++) {
        const x = (i * 150 + offset) % (canvas.width + 150);
        ctx.fillRect(x - 100, 100, 50, 80); // Труба
        ctx.fillRect(x - 50, 120, 70, 60);  // Здание
      }
      break;
      
    case 'forest':
      // Лесной фон
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a5276');
      gradient.addColorStop(1, '#145a32');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Земля
      ctx.fillStyle = '#784212';
      ctx.fillRect(0, 150, canvas.width, 50);
      
      // Деревья (движущиеся с offset)
      ctx.fillStyle = '#2e4053';
      for (let i = 0; i < 4; i++) {
        const x = (i * 100 + offset) % (canvas.width + 100);
        // Ствол
        ctx.fillRect(x - 5, 120, 10, 30);
        // Крона
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(x, 110, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2e4053';
      }
      break;
      
    case 'dungeon':
      // Подземелье
      ctx.fillStyle = '#17202a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Пол
      ctx.fillStyle = '#424949';
      ctx.fillRect(0, 150, canvas.width, 50);
      
      // Стены (движущиеся с offset)
      ctx.fillStyle = '#2c3e50';
      for (let i = 0; i < 5; i++) {
        const x = (i * 80 + offset) % (canvas.width + 80);
        ctx.fillRect(x - 20, 80, 40, 70); // Колонна
        // Факелы
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(x, 70, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
      }
      break;
      
    default:
      // Стандартный фон
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Земля
      ctx.fillStyle = '#2d3436';
      ctx.fillRect(0, 150, canvas.width, 50);
      
      // Звезды
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 20; i++) {
        const x = (i * 37 + offset) % canvas.width;
        const y = (i * 19) % 100 + 20;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  
  // Дорожка (общая для всех локаций)
  ctx.fillStyle = '#636e72';
  ctx.fillRect(0, 155, canvas.width, 5);
}

// Функция для рисования элементов локации
export function drawLocationElement(ctx, type, x, y, size = 1.0) {
  if (!ctx) return;
  
  ctx.save();
  
  switch(type) {
    case 'tree':
      // Дерево
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x - 5 * size, y - 30 * size, 10 * size, 30 * size);
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(x, y - 40 * size, 20 * size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'rock':
      // Камень
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(x, y, 15 * size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'bush':
      // Куст
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(x, y, 12 * size, 0, Math.PI * 2);
      ctx.arc(x + 10 * size, y, 10 * size, 0, Math.PI * 2);
      ctx.arc(x - 10 * size, y, 10 * size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'cloud':
      // Облако
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 10 * size, 0, Math.PI * 2);
      ctx.arc(x + 12 * size, y - 5 * size, 8 * size, 0, Math.PI * 2);
      ctx.arc(x + 20 * size, y, 10 * size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  
  ctx.restore();
}
