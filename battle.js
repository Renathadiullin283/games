// battle.js
import { player, resetPlayerHp } from './game.js';
import { LOCATIONS } from './data.js';
import { savePlayer } from './telegramSave.js';
import { clear, drawStickman, drawHpBar, spawnDamageText, updateDamageTexts, screenShake } from './render.js';

class BattleSystem {
  constructor() {
    this.enemy = null;
    this.enemyMaxHp = 0;
    this.attackPhase = 0;
    this.animationId = null;
    this.gameInterval = null;
    this.skillInterval = null;
    this.currentLocation = null;
    this.enemyIndex = 0;
    this.isBattleActive = false;
    this.isAutoBattle = true;
    this.isPaused = false;
    this.returnToMenuTimeout = null;
    
    // Настройки умений
    this.skills = {
      warrior: [
        {
          id: 'powerStrike',
          name: 'Мощный удар',
          description: 'Наносит 200% урона',
          cooldown: 5,
          lastUsed: 0,
          effect: (baseDamage) => Math.floor(baseDamage * 2.0)
        },
        {
          id: 'shieldBash',
          name: 'Удар щитом',
          description: 'Оглушает врага на 1 ход',
          cooldown: 8,
          lastUsed: 0,
          effect: (baseDamage) => {
            this.stunEnemy(1);
            return Math.floor(baseDamage * 1.5);
          }
        }
      ],
      assassin: [
        {
          id: 'backstab',
          name: 'Удар в спину',
          description: 'Критический удар с шансом 100%',
          cooldown: 6,
          lastUsed: 0,
          effect: (baseDamage) => {
            this.activeEffects.nextCrit = true;
            return Math.floor(baseDamage * 2.0);
          }
        },
        {
          id: 'poisonDagger',
          name: 'Отравленный клинок',
          description: 'Наносит доп. урон в течение времени',
          cooldown: 7,
          lastUsed: 0,
          effect: (baseDamage) => {
            this.applyPoison(3, Math.floor(baseDamage * 0.3));
            return Math.floor(baseDamage * 1.3);
          }
        }
      ]
    };
    
    // Эффекты
    this.activeEffects = {
      enemyStunned: 0,
      enemyPoisoned: { turns: 0, damage: 0 },
      playerDodging: false,
      nextCrit: false
    };
    
    this.canvas = document.getElementById('battle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.logEl = document.getElementById('battle-log');
    
    this.init();
  }

  init() {
    if (!this.canvas) {
      console.error('Canvas не найден!');
      return;
    }
    
    this.canvas.width = 400;
    this.canvas.height = 200;
    
    this.removeBattleButtons();
    this.addPauseButton();
    this.addSkillUI();
  }

  removeBattleButtons() {
    const battleControls = document.querySelector('.battle-controls');
    if (battleControls) {
      const buttons = battleControls.querySelectorAll('button:not(#btn-flee)');
      buttons.forEach(btn => {
        if (btn.id !== 'btn-pause') btn.style.display = 'none';
      });
    }
  }

  addPauseButton() {
    let battleControls = document.querySelector('.battle-controls');
    if (!battleControls) {
      battleControls = document.createElement('div');
      battleControls.className = 'battle-controls';
      document.querySelector('.battle-canvas-container')?.appendChild(battleControls);
    }
    
    // Очищаем старые кнопки (кроме кнопки бегства)
    const existingPause = battleControls.querySelector('#btn-pause');
    if (existingPause) existingPause.remove();
    
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'btn-pause';
    pauseBtn.className = 'battle-btn';
    pauseBtn.innerHTML = '⏸️ Пауза';
    pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    
    battleControls.appendChild(pauseBtn);
    
    pauseBtn.addEventListener('click', () => this.togglePause());
    
    // Кнопка бегства
    let fleeBtn = battleControls.querySelector('#btn-flee');
    if (!fleeBtn) {
      fleeBtn = document.createElement('button');
      fleeBtn.id = 'btn-flee';
      fleeBtn.className = 'battle-btn';
      fleeBtn.innerHTML = '🏃‍♂️ Бежать';
      fleeBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
      battleControls.appendChild(fleeBtn);
      fleeBtn.addEventListener('click', () => this.flee());
    }
  }

  addSkillUI() {
    const skillsContainer = document.createElement('div');
    skillsContainer.className = 'skills-container';
    skillsContainer.id = 'skills-container';
    
    const battleCanvasContainer = document.querySelector('.battle-canvas-container');
    if (battleCanvasContainer) {
      const existingSkills = battleCanvasContainer.querySelector('#skills-container');
      if (existingSkills) existingSkills.remove();
      battleCanvasContainer.appendChild(skillsContainer);
    }
  }

  togglePause() {
    if (!this.isBattleActive) return;
    
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('btn-pause');
    
    if (this.isPaused) {
      this.log('⏸️ Бой на паузе');
      pauseBtn.innerHTML = '▶️ Продолжить';
      pauseBtn.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
      
      if (this.gameInterval) {
        clearInterval(this.gameInterval);
        this.gameInterval = null;
      }
      if (this.skillInterval) {
        clearInterval(this.skillInterval);
        this.skillInterval = null;
      }
    } else {
      this.log('▶️ Бой продолжается');
      pauseBtn.innerHTML = '⏸️ Пауза';
      pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
      
      this.startGameLoop();
      this.startSkillSystem();
    }
  }

  async startBattle(locationId) {
    console.log('⚔️ Начинаем битву в локации:', locationId);
    
    // Останавливаем предыдущую битву, если была
    this.stopBattle();
    
    this.currentLocation = LOCATIONS[locationId];
    if (!this.currentLocation) {
      console.error('Локация не найдена:', locationId);
      return false;
    }
    
    this.enemyIndex = 0;
    this.isBattleActive = true;
    this.isPaused = false;
    
    // Сбрасываем эффекты
    this.resetEffects();
    
    resetPlayerHp();
    this.spawnEnemy(this.enemyIndex);
    
    this.log(`⚔️ Начало автоматической битвы в ${this.currentLocation.name}`);
    this.log(`👾 Встречен враг ${this.enemyIndex + 1}/${this.currentLocation.enemies}`);
    
    this.updateBattleHUD();
    
    // Запускаем игровой цикл
    this.startGameLoop();
    
    // Запускаем систему умений
    this.startSkillSystem();
    
    // Запускаем анимацию
    this.animate();
    
    return true;
  }

  startGameLoop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    
    this.gameInterval = setInterval(() => {
      if (!this.isBattleActive || this.isPaused || player.currentHp <= 0) return;
      
      // Автоматическая атака игрока
      this.autoPlayerAttack();
      
      // Применяем эффекты (яд, оглушение и т.д.)
      this.processEffects();
      
      // Атака врага (если не оглушен)
      if (this.activeEffects.enemyStunned <= 0) {
        this.autoEnemyAttack();
      } else {
        this.log(`🌀 Враг оглушен, пропускает ход`);
        this.activeEffects.enemyStunned--;
      }
      
      this.updateBattleHUD();
      
    }, 1000);
  }

  startSkillSystem() {
    if (this.skillInterval) {
      clearInterval(this.skillInterval);
    }
    
    this.skillInterval = setInterval(() => {
      if (!this.isBattleActive || this.isPaused || player.currentHp <= 0) return;
      
      this.useRandomSkill();
      
    }, 3000);
  }

  autoPlayerAttack() {
    if (!this.enemy || this.enemy.hp <= 0) return;
    
    let damage = player.stats.atk;
    let isCrit = false;
    
    // Проверяем гарантированный крит
    if (this.activeEffects.nextCrit) {
      damage = Math.floor(damage * 2.5);
      isCrit = true;
      this.activeEffects.nextCrit = false;
      this.log('💥 Гарантированный критический удар!');
    } else {
      // Обычный крит
      const critChance = player.stats.crit || 0;
      if (Math.random() < critChance) {
        damage = Math.floor(damage * 2.5);
        isCrit = true;
      }
    }
    
    this.enemy.hp -= damage;
    spawnDamageText(this.ctx, 280, 90, `-${damage}`, isCrit);
    
    this.attackPhase = 10;
    
    if (isCrit) {
      screenShake(this.ctx, 5);
    }
    
    if (this.enemy.hp <= 0) {
      this.defeatEnemy();
    } else {
      this.log(`⚔️ Вы нанесли ${damage} урона`);
    }
  }

  useRandomSkill() {
    if (!this.enemy || this.enemy.hp <= 0 || !this.isBattleActive) return;
    
    const playerClass = player.classId || 'warrior';
    const availableSkills = this.skills[playerClass] || [];
    if (availableSkills.length === 0) return;
    
    const currentTime = Date.now();
    
    // Фильтруем умения, которые готовы к использованию
    const readySkills = availableSkills.filter(skill => {
      const timeSinceUse = currentTime - skill.lastUsed;
      return timeSinceUse >= skill.cooldown * 1000;
    });
    
    if (readySkills.length === 0) return;
    
    // Выбираем случайное умение
    const randomSkill = readySkills[Math.floor(Math.random() * readySkills.length)];
    const baseDamage = player.stats.atk;
    
    // Применяем умение
    randomSkill.lastUsed = currentTime;
    const enhancedDamage = randomSkill.effect(baseDamage);
    
    // Наносим урон
    this.enemy.hp -= enhancedDamage;
    spawnDamageText(this.ctx, 280, 90, `-${enhancedDamage}`, true);
    
    this.log(`✨ Использовано умение: ${randomSkill.name}`);
    this.log(`⚡ Нанесено ${enhancedDamage} урона`);
    
    if (this.enemy.hp <= 0) {
      this.defeatEnemy();
    }
    
    // Эффект тряски для умений
    screenShake(this.ctx, 3);
    
    // Обновляем UI умений
    this.updateSkillCooldowns();
  }

  autoEnemyAttack() {
    if (!this.enemy || !this.isBattleActive || player.currentHp <= 0) return;
    
    // Проверяем уклонение
    if (this.activeEffects.playerDodging) {
      this.log(`🌀 Вы уклонились от атаки!`);
      this.activeEffects.playerDodging = false;
      return;
    }
    
    let damage = Math.max(this.enemy.atk - player.stats.def, 1);
    
    // Случайный крит врага (10% шанс)
    if (Math.random() < 0.1) {
      damage = Math.floor(damage * 2);
      this.log(`💥 Враг нанес критический урон!`);
    }
    
    player.currentHp -= damage;
    spawnDamageText(this.ctx, 120, 90, `-${damage}`);
    
    this.log(`👾 Враг нанес ${damage} урона`);
    
    if (player.currentHp <= 0) {
      this.gameOver();
    } else if (player.currentHp < player.maxHp * 0.3) {
      this.log(`⚠️ Низкое здоровье! ${player.currentHp}/${player.maxHp}`);
    }
  }

  processEffects() {
    // Обработка яда на враге
    if (this.activeEffects.enemyPoisoned.turns > 0) {
      const poisonDamage = this.activeEffects.enemyPoisoned.damage;
      if (this.enemy && this.enemy.hp > 0) {
        this.enemy.hp -= poisonDamage;
        spawnDamageText(this.ctx, 280, 90, `-${poisonDamage}`, false);
        
        this.activeEffects.enemyPoisoned.turns--;
        this.log(`☠️ Яд наносит ${poisonDamage} урона врагу`);
        
        if (this.enemy.hp <= 0) {
          this.defeatEnemy();
        }
      }
    }
  }

  stunEnemy(turns) {
    this.activeEffects.enemyStunned = turns;
    this.log(`🌀 Враг оглушен на ${turns} ход(ов)`);
  }

  applyPoison(turns, damage) {
    this.activeEffects.enemyPoisoned = { turns, damage };
    this.log(`☠️ Враг отравлен на ${turns} ход(ов) (${damage} урона за ход)`);
  }

  defeatEnemy() {
    if (!this.isBattleActive) return;
    
    const goldReward = 10 + Math.floor(this.enemyIndex / 2);
    player.gold += goldReward;
    
    this.log(`💀 Враг ${this.enemyIndex + 1} побежден!`);
    this.log(`💰 Получено ${goldReward} золота`);
    
    this.enemyIndex++;
    
    if (this.enemyIndex >= this.currentLocation.enemies) {
      this.victory();
      return;
    }
    
    // Сбрасываем эффекты для нового врага
    this.activeEffects.enemyStunned = 0;
    this.activeEffects.enemyPoisoned = { turns: 0, damage: 0 };
    
    this.spawnEnemy(this.enemyIndex);
    this.log(`👾 Встречен враг ${this.enemyIndex + 1}/${this.currentLocation.enemies}`);
    
    savePlayer(player);
    this.updateBattleHUD();
  }

  victory() {
    if (!this.isBattleActive) return;
    
    const goldReward = 50 + this.currentLocation.level * 20;
    player.gold += goldReward;
    player.level += 1;
    
    this.log('🏆 Все враги побеждены!');
    this.log(`🎉 Получено: ${goldReward} золота и 1 уровень опыта`);
    this.log(`🎮 Уровень повышен: ${player.level}`);
    
    // Останавливаем битву
    this.stopBattle();
    
    // Сохраняем прогресс
    savePlayer(player);
    
    // Обновляем HUD
    if (window.sceneManager) {
      window.sceneManager.updateAllDisplays();
    }
    
    // Автоматическое возвращение через 3 секунды
    if (this.returnToMenuTimeout) {
      clearTimeout(this.returnToMenuTimeout);
    }
    
    this.returnToMenuTimeout = setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 3000);
  }

  gameOver() {
    if (!this.isBattleActive) return;
    
    this.log('❌ Персонаж погиб');
    this.log('💀 Вы проиграли битву');
    this.log(`🔄 Возвращаемся в меню...`);
    
    // Останавливаем битву
    this.stopBattle();
    
    // Сохраняем прогресс
    savePlayer(player);
    
    // Немедленное возвращение в меню
    if (this.returnToMenuTimeout) {
      clearTimeout(this.returnToMenuTimeout);
    }
    
    this.returnToMenuTimeout = setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 2000);
  }

  flee() {
    if (confirm('Вы уверены, что хотите сбежать?')) {
      this.log('🏃‍♂️ Вы сбежали с поля боя');
      this.stopBattle();
      
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }
  }

  spawnEnemy(index) {
    const loc = this.currentLocation;
    this.enemyMaxHp = Math.floor(loc.enemyHp * Math.pow(loc.hpGrowth || 1.2, index));
    this.enemy = {
      hp: this.enemyMaxHp,
      atk: Math.floor(loc.enemyAtk * Math.pow(loc.atkGrowth || 1.1, index)),
    };
    
    console.log(`👾 Новый враг: HP=${this.enemy.hp}, ATK=${this.enemy.atk}`);
  }

  resetEffects() {
    this.activeEffects = {
      enemyStunned: 0,
      enemyPoisoned: { turns: 0, damage: 0 },
      playerDodging: false,
      nextCrit: false
    };
    
    // Сбрасываем таймеры умений
    const playerClass = player.classId || 'warrior';
    if (this.skills[playerClass]) {
      this.skills[playerClass].forEach(skill => {
        skill.lastUsed = 0;
      });
    }
  }

  updateBattleHUD() {
    if (!this.isBattleActive) return;
    
    const hud = {
      level: document.getElementById('battle-level'),
      gold: document.getElementById('battle-gold'),
      hp: document.getElementById('battle-hp'),
      enemies: document.getElementById('battle-enemies'),
      atk: document.getElementById('battle-atk'),
      def: document.getElementById('battle-def')
    };
    
    if (hud.level) hud.level.textContent = player.level;
    if (hud.gold) hud.gold.textContent = player.gold;
    if (hud.hp) hud.hp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (hud.atk) hud.atk.textContent = player.stats.atk;
    if (hud.def) hud.def.textContent = player.stats.def;
    
    if (hud.enemies && this.currentLocation) {
      hud.enemies.textContent = `${this.enemyIndex}/${this.currentLocation.enemies}`;
    }
    
    this.updateSkillCooldowns();
  }

  updateSkillCooldowns() {
    const skillsContainer = document.getElementById('skills-container');
    if (!skillsContainer) return;
    
    const playerClass = player.classId || 'warrior';
    const availableSkills = this.skills[playerClass] || [];
    
    skillsContainer.innerHTML = '';
    
    availableSkills.forEach(skill => {
      const currentTime = Date.now();
      const timeSinceUse = currentTime - skill.lastUsed;
      const cooldownRemaining = Math.max(0, skill.cooldown * 1000 - timeSinceUse) / 1000;
      const isReady = cooldownRemaining <= 0;
      
      const skillEl = document.createElement('div');
      skillEl.className = 'skill-item';
      skillEl.innerHTML = `
        <div class="skill-name">${skill.name}</div>
        <div class="skill-cooldown ${isReady ? 'ready' : 'cooldown'}">
          ${isReady ? 'Готов' : cooldownRemaining.toFixed(1)}
        </div>
        <div class="skill-bar">
          <div class="skill-bar-fill" style="width: ${isReady ? 100 : 100 - (cooldownRemaining / skill.cooldown) * 100}%"></div>
        </div>
      `;
      
      skillsContainer.appendChild(skillEl);
    });
  }

  animate() {
    if (!this.isBattleActive || !this.ctx) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      return;
    }
    
    clear(this.ctx);
    
    // Анимация удара
    const playerOffset = this.attackPhase > 0 ? (this.attackPhase > 5 ? 5 : -5) : 0;
    if (this.attackPhase > 0) this.attackPhase--;
    
    // Игрок
    const playerColor = player.classId === 'warrior' ? '#4cd137' : '#9b59b6';
    drawStickman(this.ctx, 100 + playerOffset, 120, playerColor);
    drawHpBar(this.ctx, 70, 20, 60, 6, player.currentHp, player.maxHp);
    
    // Враг
    if (this.enemy) {
      // Эффект оглушения
      const enemyColor = this.activeEffects.enemyStunned > 0 ? '#f39c12' : '#e74c3c';
      drawStickman(this.ctx, 300, 120, enemyColor);
      drawHpBar(this.ctx, 270, 20, 60, 6, this.enemy.hp, this.enemyMaxHp);
      
      // Эффект яда
      if (this.activeEffects.enemyPoisoned.turns > 0) {
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(300, 120 - 25, 15, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    updateDamageTexts(this.ctx);
    
    // Сохраняем ID анимации для отмены
    this.animationId = requestAnimationFrame(() => this.animate());
  }

stopBattle() {
  console.log('🛑 Останавливаем битву...');
  
  // Устанавливаем флаги
  this.isBattleActive = false;
  this.isPaused = false;
  
  // Очищаем все интервалы
  if (this.gameInterval) {
    clearInterval(this.gameInterval);
    this.gameInterval = null;
    console.log('⏹️ Очищен gameInterval');
  }
  
  if (this.skillInterval) {
    clearInterval(this.skillInterval);
    this.skillInterval = null;
    console.log('⏹️ Очищен skillInterval');
  }
  
  // Останавливаем анимацию
  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
    console.log('⏹️ Остановлена анимация');
  }
  
  // Очищаем таймаут возврата в меню
  if (this.returnToMenuTimeout) {
    clearTimeout(this.returnToMenuTimeout);
    this.returnToMenuTimeout = null;
    console.log('⏹️ Очищен returnToMenuTimeout');
  }
  
  // Сбрасываем состояние
  this.enemy = null;
  this.currentLocation = null;
  this.enemyIndex = 0;
  
  // Сбрасываем эффекты
  this.activeEffects = {
    enemyStunned: 0,
    enemyPoisoned: { turns: 0, damage: 0 },
    playerDodging: false,
    nextCrit: false
  };
  
  // Очищаем canvas
  if (this.ctx) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  console.log('✅ Битва полностью остановлена');
}

  log(message) {
    if (!this.logEl) return;
    
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'});
    this.logEl.innerHTML += `<div><small>[${timestamp}]</small> ${message}</div>`;
    
    // Ограничиваем количество сообщений
    const messages = this.logEl.querySelectorAll('div');
    if (messages.length > 15) {
      messages[0].remove();
    }
    
    this.logEl.scrollTop = this.logEl.scrollHeight;
    console.log(message);
  }
}

// Глобальный экземпляр
let battleSystem = null;

// Экспортируемая функция для начала битвы
export function startBattle(locationId) {
  console.log('🎮 Запуск битвы для локации:', locationId);
  
  if (!battleSystem) {
    battleSystem = new BattleSystem();
  }
  
  // Переключаемся на сцену битвы
  if (window.sceneManager) {
    window.sceneManager.showScene('battle');
    
    // Даем время на отрисовку сцены
    setTimeout(() => {
      if (battleSystem.startBattle(locationId)) {
        console.log('✅ Битва успешно начата');
      } else {
        console.error('❌ Не удалось начать битву');
        window.sceneManager.showScene('menu');
      }
    }, 100);
  }
}

// Экспортируем для отладки
export { battleSystem };
