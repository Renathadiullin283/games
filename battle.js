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
    this.isAutoBattle = true; // Автоматический бой
    
    // Настройки умений
    this.skills = {
      // Воин
      warrior: [
        {
          id: 'powerStrike',
          name: 'Мощный удар',
          description: 'Наносит 200% урона',
          cooldown: 5, // 5 секунд
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
            this.stunEnemy(1); // Оглушение на 1 ход
            return Math.floor(baseDamage * 1.5);
          }
        },
        {
          id: 'whirlwind',
          name: 'Вихрь клинков',
          description: 'Наносит урон всем врагам',
          cooldown: 12,
          lastUsed: 0,
          effect: (baseDamage) => Math.floor(baseDamage * 2.5)
        }
      ],
      // Ассасин
      assassin: [
        {
          id: 'backstab',
          name: 'Удар в спину',
          description: 'Критический удар с шансом 100%',
          cooldown: 6,
          lastUsed: 0,
          effect: (baseDamage) => {
            this.guaranteedCrit = true;
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
            this.applyPoison(3, Math.floor(baseDamage * 0.3)); // 3 хода, 30% от урона
            return Math.floor(baseDamage * 1.3);
          }
        },
        {
          id: 'shadowStep',
          name: 'Шаг тени',
          description: 'Уклоняется от следующей атаки',
          cooldown: 10,
          lastUsed: 0,
          effect: (baseDamage) => {
            this.dodgeNextAttack = true;
            return Math.floor(baseDamage * 1.2);
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
    // Настройка canvas
    this.canvas.width = 400;
    this.canvas.height = 200;
    
    // Удаляем обработчики кнопок (они больше не нужны)
    this.removeBattleButtons();
    
    // Добавляем кнопку паузы/продолжения
    this.addPauseButton();
  }

  removeBattleButtons() {
    // Скрываем кнопки битвы, оставляем только "Бежать"
    const battleControls = document.querySelector('.battle-controls');
    if (battleControls) {
      // Оставляем только кнопку бегства
      const buttons = battleControls.querySelectorAll('button:not(#btn-flee)');
      buttons.forEach(btn => btn.style.display = 'none');
    }
  }

  addPauseButton() {
    // Создаем кнопку паузы
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'btn-pause';
    pauseBtn.className = 'battle-btn';
    pauseBtn.innerHTML = '⏸️ Пауза';
    pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    
    const battleControls = document.querySelector('.battle-controls');
    if (battleControls) {
      battleControls.appendChild(pauseBtn);
    }
    
    pauseBtn.addEventListener('click', () => this.togglePause());
  }

  togglePause() {
    if (!this.isBattleActive) return;
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
      if (this.skillInterval) {
        clearInterval(this.skillInterval);
        this.skillInterval = null;
      }
      document.getElementById('btn-pause').innerHTML = '▶️ Продолжить';
      this.log('⏸️ Бой на паузе');
    } else {
      this.startGameLoop();
      document.getElementById('btn-pause').innerHTML = '⏸️ Пауза';
      this.log('▶️ Бой продолжается');
    }
  }

  async startBattle(locationId) {
    if (this.isBattleActive) {
      this.stopBattle();
    }
    
    this.currentLocation = LOCATIONS[locationId];
    this.enemyIndex = 0;
    this.isBattleActive = true;
    
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
      if (!this.isBattleActive || player.currentHp <= 0) return;
      
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
      
    }, 1000); // Интервал 1 секунда
  }

  startSkillSystem() {
    if (this.skillInterval) {
      clearInterval(this.skillInterval);
    }
    
    // Используем умения каждые 3 секунды (можно настроить)
    this.skillInterval = setInterval(() => {
      if (!this.isBattleActive || player.currentHp <= 0) return;
      
      this.useRandomSkill();
      
    }, 3000); // Каждые 3 секунды
  }

  autoPlayerAttack() {
    if (!this.enemy || this.enemy.hp <= 0) return;
    
    const currentTime = Date.now();
    const playerClass = player.classId || 'warrior';
    let damage = player.stats.atk;
    
    // Проверяем гарантированный крит
    if (this.activeEffects.nextCrit) {
      damage = Math.floor(damage * 2.5);
      this.log(`💥 Гарантированный критический удар!`);
      this.activeEffects.nextCrit = false;
    } else {
      // Обычный крит
      const crit = Math.random() < player.stats.crit;
      if (crit) {
        damage = Math.floor(damage * 2.5);
      }
    }
    
    // Применяем усиления от умений
    const classSkills = this.skills[playerClass];
    classSkills.forEach(skill => {
      if (currentTime - skill.lastUsed < skill.cooldown * 1000) {
        // Умение на перезарядке
        return;
      }
    });
    
    this.enemy.hp -= damage;
    spawnDamageText(this.ctx, 280, 90, `-${damage}`);
    
    this.attackPhase = 10;
    
    if (this.enemy.hp <= 0) {
      this.defeatEnemy();
    } else {
      this.log(`⚔️ Вы нанесли ${damage} урона (${this.enemy.hp}/${this.enemyMaxHp})`);
    }
  }

  useRandomSkill() {
    if (!this.enemy || this.enemy.hp <= 0) return;
    
    const playerClass = player.classId || 'warrior';
    const availableSkills = this.skills[playerClass];
    const currentTime = Date.now();
    
    // Фильтруем умения, которые готовы к использованию
    const readySkills = availableSkills.filter(skill => 
      currentTime - skill.lastUsed >= skill.cooldown * 1000
    );
    
    if (readySkills.length === 0) return;
    
    // Выбираем случайное умение из готовых
    const randomSkill = readySkills[Math.floor(Math.random() * readySkills.length)];
    
    // Применяем умение
    const baseDamage = player.stats.atk;
    const enhancedDamage = randomSkill.effect(baseDamage);
    
    // Наносим урон
    this.enemy.hp -= enhancedDamage;
    spawnDamageText(this.ctx, 280, 90, `-${enhancedDamage}`, true);
    
    // Обновляем время последнего использования
    randomSkill.lastUsed = currentTime;
    
    this.log(`✨ Использовано умение: ${randomSkill.name}`);
    this.log(`⚡ Нанесено ${enhancedDamage} урона`);
    
    if (this.enemy.hp <= 0) {
      this.defeatEnemy();
    }
    
    // Эффект тряски для умений
    screenShake(this.ctx, 5);
  }

  autoEnemyAttack() {
    if (!this.enemy || !this.isBattleActive) return;
    
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
      this.enemy.hp -= poisonDamage;
      spawnDamageText(this.ctx, 280, 90, `-${poisonDamage}`, false, '#00ff00');
      
      this.activeEffects.enemyPoisoned.turns--;
      this.log(`☠️ Яд наносит ${poisonDamage} урона врагу`);
      
      if (this.enemy.hp <= 0) {
        this.defeatEnemy();
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
    const goldReward = 10 + Math.floor(this.enemyIndex / 2);
    player.gold += goldReward;
    
    this.log(`💀 Враг ${this.enemyIndex + 1} побежден!`);
    this.log(`💰 Получено ${goldReward} золота`);
    
    this.enemyIndex++;
    
    if (this.enemyIndex >= this.currentLocation.enemies) {
      this.victory();
      return;
    }
    
    this.spawnEnemy(this.enemyIndex);
    this.log(`👾 Встречен враг ${this.enemyIndex + 1}/${this.currentLocation.enemies}`);
    
    savePlayer(player);
  }

  victory() {
    const goldReward = 50 + this.currentLocation.level * 20;
    player.gold += goldReward;
    player.level += 1;
    
    this.log('🏆 Все враги побеждены!');
    this.log(`🎉 Получено: ${goldReward} золота и 1 уровень опыта`);
    this.log(`🎮 Уровень повышен: ${player.level}`);
    
    this.stopBattle();
    savePlayer(player);
    
    // Автоматическое возвращение через 5 секунд
    setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 5000);
  }

  gameOver() {
    this.log('❌ Персонаж погиб');
    this.log('💀 Вы проиграли битву');
    this.log(`🔄 Возвращаемся в меню...`);
    
    this.stopBattle();
    savePlayer(player);
    
    // Автоматическое возвращение через 3 секунды
    setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 3000);
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
    this.enemyMaxHp = Math.floor(loc.enemyHp * Math.pow(loc.hpGrowth, index));
    this.enemy = {
      hp: this.enemyMaxHp,
      atk: Math.floor(loc.enemyAtk * Math.pow(loc.atkGrowth, index)),
    };
    
    // Сбрасываем эффекты при появлении нового врага
    this.activeEffects.enemyStunned = 0;
    this.activeEffects.enemyPoisoned = { turns: 0, damage: 0 };
    
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
    this.skills[playerClass].forEach(skill => {
      skill.lastUsed = 0;
    });
  }

  updateBattleHUD() {
    // Обновляем HUD в битве
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
    
    // Обновляем кулдауны умений
    this.updateSkillCooldowns();
  }

  updateSkillCooldowns() {
    const playerClass = player.classId || 'warrior';
    const skillsContainer = document.querySelector('.skills-container');
    
    if (!skillsContainer) return;
    
    skillsContainer.innerHTML = '';
    
    this.skills[playerClass].forEach(skill => {
      const currentTime = Date.now();
      const timeSinceUse = currentTime - skill.lastUsed;
      const cooldownRemaining = Math.max(0, skill.cooldown * 1000 - timeSinceUse) / 1000;
      
      const skillEl = document.createElement('div');
      skillEl.className = 'skill-item';
      skillEl.innerHTML = `
        <div class="skill-name">${skill.name}</div>
        <div class="skill-cooldown">${cooldownRemaining > 0 ? cooldownRemaining.toFixed(1) : 'Готов'}</div>
        <div class="skill-bar">
          <div class="skill-bar-fill" style="width: ${100 - (cooldownRemaining / skill.cooldown) * 100}%"></div>
        </div>
      `;
      
      skillsContainer.appendChild(skillEl);
    });
  }

  animate() {
    if (!this.isBattleActive) {
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
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  stopBattle() {
    this.isBattleActive = false;
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    
    if (this.skillInterval) {
      clearInterval(this.skillInterval);
      this.skillInterval = null;
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('⏹️ Битва остановлена');
  }

  log(message) {
    if (this.logEl) {
      const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      this.logEl.innerHTML += `<div><small>[${timestamp}]</small> ${message}</div>`;
      
      // Ограничиваем количество сообщений
      const messages = this.logEl.querySelectorAll('div');
      if (messages.length > 20) {
        messages[0].remove();
      }
      
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
    console.log(message);
  }
}

// Создаём глобальный экземпляр
let battleSystem = null;

// Экспортируемая функция для начала битвы
export function startBattle(locationId) {
  if (!battleSystem) {
    battleSystem = new BattleSystem();
  }
  
  // Переключаемся на сцену битвы
  if (window.sceneManager) {
    window.sceneManager.showScene('battle');
  }
  
  // Начинаем битву через небольшую задержку для анимации
  setTimeout(() => {
    battleSystem.startBattle(locationId);
  }, 300);
}

// Экспортируем для отладки
export { battleSystem };
