// battle.js
import { player, resetPlayerHp } from './game.js';
import { LOCATIONS } from './data.js';
import { savePlayer } from './telegramSave.js';
import { clear, drawStickman, drawHpBar, spawnDamageText, updateDamageTexts, screenShake, drawBackground } from './render.js';

class BattleSystem {
  constructor() {
    this.enemy = null;
    this.enemyMaxHp = 0;
    this.attackPhase = 0;
    this.animationId = null;
    this.gameInterval = null;
    this.skillInterval = null;
    this.travelInterval = null;
    this.currentLocation = null;
    this.enemyIndex = 0;
    this.isBattleActive = false;
    this.isAutoBattle = true;
    this.isPaused = false;
    this.isTraveling = true; // Новое состояние - путешествие
    this.isInCombat = false; // Новое состояние - битва
    this.returnToMenuTimeout = null;
    this.enemiesDefeated = 0;
    this.travelProgress = 0;
    this.locationProgress = 0; // Прогресс прохождения локации (0-100%)
    this.nextEnemyTime = 0;
    this.enemySpawnTimer = null;
    
    // Настройки путешествия
    this.travelSettings = {
      baseEnemyInterval: 8000, // 8 секунд между врагами
      minEnemyInterval: 5000,  // минимум 5 секунд
      maxEnemyInterval: 12000, // максимум 12 секунд
      travelSpeed: 0.5,        // скорость прогресса путешествия (% в секунду)
      maxLocationProgress: 100, // максимум прогресса локации
      enemiesPerLocation: 8     // примерное количество врагов за локацию
    };
    
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
    
    // Анимация путешествия
    this.travelAnimation = {
      playerX: 100,
      playerY: 120,
      playerStep: 0,
      backgroundOffset: 0,
      enemyAppear: 0, // 0-100, появление врага
      enemyX: 400 // Враг появляется справа
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
    this.addTravelUI();
  }

  removeBattleButtons() {
    const battleControls = document.querySelector('.battle-controls');
    if (battleControls) {
      battleControls.innerHTML = '';
    }
  }

  addTravelUI() {
    const battleControls = document.querySelector('.battle-controls');
    if (!battleControls) return;
    
    // Кнопка паузы
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'btn-pause';
    pauseBtn.className = 'battle-btn';
    pauseBtn.innerHTML = '⏸️ Пауза';
    pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    pauseBtn.addEventListener('click', () => this.togglePause());
    
    // Кнопка бегства
    const fleeBtn = document.createElement('button');
    fleeBtn.id = 'btn-flee';
    fleeBtn.className = 'battle-btn';
    fleeBtn.innerHTML = '🏃‍♂️ Покинуть локацию';
    fleeBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
    fleeBtn.addEventListener('click', () => this.leaveLocation());
    
    // Кнопка ускорения (если нужно)
    const speedBtn = document.createElement('button');
    speedBtn.id = 'btn-speed';
    speedBtn.className = 'battle-btn';
    speedBtn.innerHTML = '⚡ x2 Скорость';
    speedBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    speedBtn.addEventListener('click', () => this.toggleSpeed());
    
    battleControls.appendChild(pauseBtn);
    battleControls.appendChild(fleeBtn);
    battleControls.appendChild(speedBtn);
  }

  async startBattle(locationId) {
    console.log('🚶 Начинаем путешествие по локации:', locationId);
    
    // Останавливаем предыдущую битву, если была
    this.stopBattle();
    
    this.currentLocation = LOCATIONS[locationId];
    if (!this.currentLocation) {
      console.error('Локация не найдена:', locationId);
      return false;
    }
    
    this.enemyIndex = 0;
    this.enemiesDefeated = 0;
    this.travelProgress = 0;
    this.locationProgress = 0;
    this.isBattleActive = true;
    this.isTraveling = true;
    this.isInCombat = false;
    this.isPaused = false;
    this.isFastSpeed = false;
    
    // Сбрасываем эффекты
    this.resetEffects();
    
    resetPlayerHp();
    
    this.log(`🌄 Начало путешествия по ${this.currentLocation.name}`);
    this.log(`🗺️ Прогресс локации: 0%`);
    this.log(`👣 Вы движетесь по локации, враги будут появляться каждые 5-10 секунд`);
    
    this.updateBattleHUD();
    
    // Запускаем путешествие
    this.startTravel();
    
    // Запускаем систему умений (для будущих битв)
    this.startSkillSystem();
    
    // Запускаем анимацию
    this.animate();
    
    // Запускаем таймер для первого врага
    this.scheduleNextEnemy();
    
    return true;
  }

  startTravel() {
    if (this.travelInterval) {
      clearInterval(this.travelInterval);
    }
    
    const speedMultiplier = this.isFastSpeed ? 2 : 1;
    
    this.travelInterval = setInterval(() => {
      if (!this.isBattleActive || this.isPaused || this.isInCombat) return;
      
      // Увеличиваем прогресс путешествия
      this.travelProgress += this.travelSettings.travelSpeed * speedMultiplier;
      this.locationProgress = Math.min(
        (this.enemiesDefeated / this.travelSettings.enemiesPerLocation) * 100,
        100
      );
      
      // Анимация шага персонажа
      this.travelAnimation.playerStep = (this.travelAnimation.playerStep + 1) % 20;
      this.travelAnimation.backgroundOffset = (this.travelAnimation.backgroundOffset + 1) % 400;
      
      // Обновляем HUD каждые 2 секунды
      if (Math.floor(this.travelProgress) % 2 === 0) {
        this.updateBattleHUD();
      }
      
    }, 1000); // Обновляем каждую секунду
  }

  scheduleNextEnemy() {
    if (!this.isBattleActive || this.isInCombat) return;
    
    // Очищаем предыдущий таймер
    if (this.enemySpawnTimer) {
      clearTimeout(this.enemySpawnTimer);
    }
    
    // Случайный интервал между врагами (5-10 секунд)
    const minTime = this.travelSettings.minEnemyInterval;
    const maxTime = this.travelSettings.maxEnemyInterval;
    const spawnTime = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
    
    // Учитываем ускорение
    const actualSpawnTime = this.isFastSpeed ? spawnTime / 2 : spawnTime;
    
    this.nextEnemyTime = Date.now() + actualSpawnTime;
    
    this.enemySpawnTimer = setTimeout(() => {
      if (this.isBattleActive && !this.isInCombat && !this.isPaused) {
        this.spawnEnemy();
      }
    }, actualSpawnTime);
    
    const minutes = Math.floor(actualSpawnTime / 60000);
    const seconds = Math.floor((actualSpawnTime % 60000) / 1000);
    this.log(`👀 Следующий враг появится через ${seconds} сек.`);
  }

  spawnEnemy() {
    if (!this.isBattleActive || this.isInCombat || this.isPaused) return;
    
    this.isTraveling = false;
    this.isInCombat = true;
    
    // Создаем врага с учетом текущего индекса
    this.enemyIndex++;
    this.enemyMaxHp = Math.floor(
      this.currentLocation.enemyHp * Math.pow(this.currentLocation.hpGrowth || 1.2, this.enemyIndex - 1)
    );
    this.enemy = {
      hp: this.enemyMaxHp,
      atk: Math.floor(
        this.currentLocation.enemyAtk * Math.pow(this.currentLocation.atkGrowth || 1.1, this.enemyIndex - 1)
      ),
    };
    
    // Сброс анимации появления врага
    this.travelAnimation.enemyAppear = 0;
    this.travelAnimation.enemyX = 400;
    
    this.log(`⚔️ Враг #${this.enemyIndex} появился!`);
    this.log(`👾 HP: ${this.enemy.hp}, ATK: ${this.enemy.atk}`);
    
    // Запускаем боевой цикл
    this.startCombat();
    
    // Обновляем HUD
    this.updateBattleHUD();
  }

  startCombat() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    
    this.gameInterval = setInterval(() => {
      if (!this.isBattleActive || !this.isInCombat || this.isPaused || player.currentHp <= 0) return;
      
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
      if (!this.isBattleActive || !this.isInCombat || this.isPaused || player.currentHp <= 0) return;
      
      this.useRandomSkill();
      
    }, 3000);
  }

  autoPlayerAttack() {
    if (!this.enemy || this.enemy.hp <= 0 || !this.isInCombat) return;
    
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
      this.log(`⚔️ Вы нанесли ${damage} урона (осталось ${this.enemy.hp} HP)`);
    }
  }

  useRandomSkill() {
    if (!this.enemy || this.enemy.hp <= 0 || !this.isInCombat) return;
    
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
    if (!this.enemy || !this.isInCombat || player.currentHp <= 0) return;
    
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

  defeatEnemy() {
    if (!this.isBattleActive || !this.isInCombat) return;
    
    // Награда за врага
    const baseGold = 10 + Math.floor(this.enemyIndex / 2);
    const goldReward = Math.floor(baseGold * (1 + this.currentLocation.level / 10));
    player.gold += goldReward;
    this.enemiesDefeated++;
    
    this.log(`💀 Враг #${this.enemyIndex} побежден!`);
    this.log(`💰 Получено ${goldReward} золота`);
    this.log(`🏆 Всего побеждено: ${this.enemiesDefeated} врагов`);
    
    // Обновляем прогресс локации
    this.locationProgress = Math.min(
      (this.enemiesDefeated / this.travelSettings.enemiesPerLocation) * 100,
      100
    );
    
    // Завершаем бой
    this.endCombat();
    
    // Если прошли всю локацию
    if (this.locationProgress >= 100) {
      this.completeLocation();
      return;
    }
    
    // Сохраняем прогресс
    savePlayer(player);
    
    // Возвращаемся к путешествию и планируем следующего врага
    this.isTraveling = true;
    this.isInCombat = false;
    
    // Останавливаем боевые интервалы
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    
    this.log(`🌄 Возвращаемся к путешествию...`);
    this.log(`🗺️ Прогресс локации: ${Math.round(this.locationProgress)}%`);
    
    // Планируем следующего врага
    setTimeout(() => {
      this.scheduleNextEnemy();
    }, 1000);
    
    this.updateBattleHUD();
  }

  endCombat() {
    this.isInCombat = false;
    this.enemy = null;
    
    // Останавливаем боевые интервалы
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  completeLocation() {
    this.log('🏆 Локация полностью исследована!');
    this.log('🎉 Вы получили награду за прохождение!');
    
    const completionReward = 100 + this.currentLocation.level * 50;
    player.gold += completionReward;
    player.level += 1;
    
    this.log(`💰 Дополнительная награда: ${completionReward} золота`);
    this.log(`📈 Уровень повышен: ${player.level}`);
    
    // Останавливаем всё
    this.stopBattle();
    
    // Сохраняем прогресс
    savePlayer(player);
    
    // Обновляем HUD
    if (window.sceneManager) {
      window.sceneManager.updateAllDisplays();
    }
    
    // Автоматическое возвращение через 5 секунд
    this.returnToMenuTimeout = setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 5000);
  }

  gameOver() {
    this.log('❌ Персонаж погиб');
    this.log('💀 Вы проиграли в битве');
    this.log(`🔄 Возвращаемся в меню...`);
    
    // Останавливаем всё
    this.stopBattle();
    
    // Сохраняем прогресс
    savePlayer(player);
    
    // Обновляем HUD
    if (window.sceneManager) {
      window.sceneManager.updateAllDisplays();
    }
    
    // Возврат в меню через 3 секунды
    this.returnToMenuTimeout = setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 3000);
  }

  leaveLocation() {
    if (confirm('Вы уверены, что хотите покинуть локацию? Весь прогресс будет сохранен.')) {
      this.log('🏃‍♂️ Вы покинули локацию');
      this.log(`🏆 Итог: побеждено ${this.enemiesDefeated} врагов`);
      
      // Награда за частичное прохождение
      if (this.enemiesDefeated > 0) {
        const partialReward = Math.floor(10 * this.enemiesDefeated);
        player.gold += partialReward;
        this.log(`💰 Получено ${partialReward} золота за победы`);
      }
      
      this.stopBattle();
      savePlayer(player);
      
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }
  }

  togglePause() {
    if (!this.isBattleActive) return;
    
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('btn-pause');
    
    if (this.isPaused) {
      this.log('⏸️ Игра на паузе');
      pauseBtn.innerHTML = '▶️ Продолжить';
      pauseBtn.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
      
      // Останавливаем все интервалы
      if (this.travelInterval) {
        clearInterval(this.travelInterval);
        this.travelInterval = null;
      }
      if (this.gameInterval) {
        clearInterval(this.gameInterval);
        this.gameInterval = null;
      }
      if (this.skillInterval) {
        clearInterval(this.skillInterval);
        this.skillInterval = null;
      }
      if (this.enemySpawnTimer) {
        clearTimeout(this.enemySpawnTimer);
        this.enemySpawnTimer = null;
      }
    } else {
      this.log('▶️ Игра продолжается');
      pauseBtn.innerHTML = '⏸️ Пауза';
      pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
      
      // Возобновляем путешествие
      this.startTravel();
      
      // Возобновляем умения
      this.startSkillSystem();
      
      // Возобновляем планирование врага, если мы в путешествии
      if (this.isTraveling && !this.isInCombat) {
        this.scheduleNextEnemy();
      }
      
      // Возобновляем бой, если мы в бою
      if (this.isInCombat) {
        this.startCombat();
      }
    }
  }

  toggleSpeed() {
    if (!this.isBattleActive || this.isPaused) return;
    
    this.isFastSpeed = !this.isFastSpeed;
    const speedBtn = document.getElementById('btn-speed');
    
    if (this.isFastSpeed) {
      this.log('⚡ Скорость увеличена в 2 раза!');
      speedBtn.innerHTML = '🐢 Обычная скорость';
      speedBtn.style.background = 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)';
      
      // Перезапускаем путешествие с новой скоростью
      if (this.travelInterval) {
        clearInterval(this.travelInterval);
        this.travelInterval = null;
      }
      this.startTravel();
      
      // Перепланируем врага с учетом новой скорости
      if (this.enemySpawnTimer) {
        clearTimeout(this.enemySpawnTimer);
        this.scheduleNextEnemy();
      }
    } else {
      this.log('🐢 Скорость возвращена к обычной');
      speedBtn.innerHTML = '⚡ x2 Скорость';
      speedBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
      
      // Возвращаем обычную скорость
      if (this.travelInterval) {
        clearInterval(this.travelInterval);
        this.travelInterval = null;
      }
      this.startTravel();
      
      // Перепланируем врага
      if (this.enemySpawnTimer) {
        clearTimeout(this.enemySpawnTimer);
        this.scheduleNextEnemy();
      }
    }
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
      def: document.getElementById('battle-def'),
      progress: document.getElementById('battle-progress'),
      locationName: document.getElementById('battle-location-name')
    };
    
    if (hud.level) hud.level.textContent = player.level;
    if (hud.gold) hud.gold.textContent = player.gold;
    if (hud.hp) hud.hp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (hud.atk) hud.atk.textContent = player.stats.atk;
    if (hud.def) hud.def.textContent = player.stats.def;
    
    // Обновляем информацию о локации
    if (hud.locationName && this.currentLocation) {
      hud.locationName.textContent = this.currentLocation.name;
    }
    
    // Обновляем прогресс
    if (hud.progress) {
      hud.progress.textContent = `Прогресс: ${Math.round(this.locationProgress)}%`;
    }
    
    // Обновляем счетчик врагов
    if (hud.enemies) {
      const enemiesText = this.isInCombat 
        ? `Бой с врагом #${this.enemyIndex}` 
        : `Побеждено: ${this.enemiesDefeated}`;
      hud.enemies.textContent = enemiesText;
    }
    
    // Обновляем кулдауны умений (только в бою)
    if (this.isInCombat) {
      this.updateSkillCooldowns();
    }
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
    
    // Рисуем фон локации
    this.drawLocationBackground();
    
    if (this.isTraveling && !this.isInCombat) {
      this.drawTravelScene();
    } else if (this.isInCombat) {
      this.drawCombatScene();
    }
    
    updateDamageTexts(this.ctx);
    
    // Сохраняем ID анимации для отмены
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  drawLocationBackground() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Фон неба
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Звезды (для ночи)
    if (this.currentLocation?.name.includes('Лес') || this.currentLocation?.name.includes('Подземелье')) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 20; i++) {
        const x = (i * 37 + this.travelAnimation.backgroundOffset) % canvas.width;
        const y = (i * 19) % 100 + 20;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Земля
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, 150, canvas.width, 50);
    
    // Дорожка
    ctx.fillStyle = '#636e72';
    ctx.fillRect(0, 155, canvas.width, 5);
    
    // Прогресс бар
    const progressWidth = (canvas.width - 40) * (this.locationProgress / 100);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(20, 10, canvas.width - 40, 8);
    ctx.fillStyle = this.locationProgress >= 100 ? '#00b894' : '#3498db';
    ctx.fillRect(20, 10, progressWidth, 8);
    
    // Текст прогресса
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.locationProgress)}%`, canvas.width / 2, 18);
  }

  drawTravelScene() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Анимация шагающего персонажа
    const stepOffset = Math.sin(this.travelAnimation.playerStep * 0.3) * 3;
    const playerY = 120 + stepOffset;
    
    // Рисуем персонажа
    const playerColor = player.classId === 'warrior' ? '#4cd137' : '#9b59b6';
    drawStickman(ctx, 100, playerY, playerColor);
    
    // HP бар персонажа
    drawHpBar(ctx, 70, 20, 60, 6, player.currentHp, player.maxHp);
    
    // Текст состояния
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🚶 Путешествие...', canvas.width / 2, 140);
    
    // Время до следующего врага
    if (this.nextEnemyTime) {
      const timeLeft = Math.max(0, this.nextEnemyTime - Date.now());
      const secondsLeft = Math.ceil(timeLeft / 1000);
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`Следующий враг через: ${secondsLeft} сек.`, canvas.width / 2, 160);
    }
  }

  drawCombatScene() {
    const ctx = this.ctx;
    
    // Анимация удара
    const playerOffset = this.attackPhase > 0 ? (this.attackPhase > 5 ? 5 : -5) : 0;
    if (this.attackPhase > 0) this.attackPhase--;
    
    // Анимация появления врага
    if (this.travelAnimation.enemyAppear < 100) {
      this.travelAnimation.enemyAppear += 5;
      this.travelAnimation.enemyX = 400 - (this.travelAnimation.enemyAppear / 100) * 100;
    }
    
    // Игрок
    const playerColor = player.classId === 'warrior' ? '#4cd137' : '#9b59b6';
    drawStickman(ctx, 100 + playerOffset, 120, playerColor);
    drawHpBar(ctx, 70, 20, 60, 6, player.currentHp, player.maxHp);
    
    // Враг
    if (this.enemy) {
      const enemyX = this.travelAnimation.enemyX;
      
      // Эффект оглушения
      const enemyColor = this.activeEffects.enemyStunned > 0 ? '#f39c12' : '#e74c3c';
      drawStickman(ctx, enemyX, 120, enemyColor);
      drawHpBar(ctx, enemyX - 30, 20, 60, 6, this.enemy.hp, this.enemyMaxHp);
      
      // Эффект яда
      if (this.activeEffects.enemyPoisoned.turns > 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(enemyX, 120 - 25, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  stopBattle() {
    console.log('🛑 Останавливаем битву...');
    
    this.isBattleActive = false;
    this.isTraveling = false;
    this.isInCombat = false;
    this.isPaused = false;
    
    // Очищаем все интервалы и таймеры
    if (this.travelInterval) {
      clearInterval(this.travelInterval);
      this.travelInterval = null;
    }
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    
    if (this.skillInterval) {
      clearInterval(this.skillInterval);
      this.skillInterval = null;
    }
    
    if (this.enemySpawnTimer) {
      clearTimeout(this.enemySpawnTimer);
      this.enemySpawnTimer = null;
    }
    
    // Останавливаем анимацию
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Очищаем таймаут возврата в меню
    if (this.returnToMenuTimeout) {
      clearTimeout(this.returnToMenuTimeout);
      this.returnToMenuTimeout = null;
    }
    
    // Сбрасываем состояние
    this.enemy = null;
    this.currentLocation = null;
    this.enemyIndex = 0;
    this.enemiesDefeated = 0;
    this.locationProgress = 0;
    
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

  stunEnemy(turns) {
    this.activeEffects.enemyStunned = turns;
    this.log(`🌀 Враг оглушен на ${turns} ход(ов)`);
  }

  applyPoison(turns, damage) {
    this.activeEffects.enemyPoisoned = { turns, damage };
    this.log(`☠️ Враг отравлен на ${turns} ход(ов) (${damage} урона за ход)`);
  }
}

// Глобальный экземпляр
let battleSystem = null;

// Экспортируемая функция для начала битвы
export function startBattle(locationId) {
  console.log('🎮 Запуск путешествия по локации:', locationId);
  
  if (!battleSystem) {
    battleSystem = new BattleSystem();
  }
  
  // Переключаемся на сцену битвы
  if (window.sceneManager) {
    window.sceneManager.showScene('battle');
    
    // Даем время на отрисовку сцены
    setTimeout(() => {
      if (battleSystem.startBattle(locationId)) {
        console.log('✅ Путешествие успешно начато');
      } else {
        console.error('❌ Не удалось начать путешествие');
        window.sceneManager.showScene('menu');
      }
    }, 100);
  }
}

// Экспортируем для отладки
export { battleSystem };
