// battle.js
import { player, resetPlayerHp } from './game.js';
import { LOCATIONS } from './data.js';
import { ENEMY_TYPES, ENEMY_ABILITIES } from './enemies.js';
import { ITEMS_DB } from './inventory.js';
import { savePlayer } from './telegramSave.js';
import { 
            clear, 
            drawStickman, 
            drawHpBar, 
            spawnDamageText, 
            updateDamageTexts, 
            screenShake,
            drawBackground
          } from "./render.js";

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
    this.locationSelection = document.getElementById('location-selection');
    this.battleGame = document.getElementById('battle-game');
    this.locationList = document.getElementById('location-list');
    
    
    // Настройки путешествия
      this.travelSettings = {
      baseEnemyInterval: 7000,
      minEnemyInterval: 4000,
      maxEnemyInterval: 10000,
      travelSpeed: 1.2,
      maxLocationProgress: 100,
      enemiesPerLocation: 10,
      backgroundSpeed: 12.0
    };
                // Система врагов
    this.enemyTypes = ENEMY_TYPES;
    this.enemyAbilities = ENEMY_ABILITIES;
    
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
            setTimeout(() => {
    this.removeBattleButtons();
    this.addTravelUI();
    this.addSkillUI();
  }, 100);
    
    // Показываем выбор локаций при инициализации
    this.showLocationSelection();
    
    this.addTravelUI();
  }
            showLocationSelection() {
    // Останавливаем текущую битву, если есть
    this.stopBattle();
    
    // Показываем выбор локаций, скрываем игровой интерфейс
    if (this.locationSelection) {
      this.locationSelection.style.display = 'block';
    }
    if (this.battleGame) {
      this.battleGame.style.display = 'none';
    }
    
    // Заполняем список локаций
    this.updateLocationList();
  }

  showBattleInterface() {
   if (window.sceneManager) {
    window.sceneManager.showScene('battle');
    }           
    // Показываем игровой интерфейс, скрываем выбор локаций
    if (this.locationSelection) {
      this.locationSelection.style.display = 'none';
    }
    if (this.battleGame) {
      this.battleGame.style.display = 'block';
    }
  }

 updateLocationList() {
    if (!this.locationList) return;
    
    this.locationList.innerHTML = '';
    
    // Сортируем локации по уровню
    const sortedLocations = Object.entries(LOCATIONS).sort(([, a], [, b]) => a.baseLevel - b.baseLevel);
    
    for (const [locId, loc] of sortedLocations) {
      const btn = document.createElement('div');
      btn.className = 'location-btn';
      
      // Проверяем доступность локации
      const isAvailable = player && player.level >= loc.baseLevel;
      
      if (!isAvailable) {
        btn.classList.add('locked');
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
      }
      
      btn.innerHTML = `
        <div class="location-icon">${this.getLocationIcon(loc.name)}</div>
        <div class="location-details">
          <strong>${loc.name}</strong>
          <div class="location-stats">
            <span>📊 Ур. ${loc.baseLevel}</span>
            <span>👾 Врагов: ${loc.enemies}</span>
            ${loc.enemyHp ? `<span>❤️ HP: ${loc.enemyHp}</span>` : ''}
            ${loc.enemyAtk ? `<span>⚔️ ATK: ${loc.enemyAtk}</span>` : ''}
          </div>
          ${!isAvailable ? '<div class="location-lock">🔒 Требуется уровень ' + loc.baseLevel + '</div>' : ''}
        </div>
      `;
      
      if (isAvailable) {
        btn.onclick = () => {
          console.log(`🎮 Выбрана локация: ${loc.name}`);
          this.startBattle(locId);
        };
      }
      
      this.locationList.appendChild(btn);
    }
  }
  getLocationIcon(locationName) {
    if (locationName.includes('Завод')) return '🏭';
    if (locationName.includes('Лес')) return '🌲';
    if (locationName.includes('Подземелье')) return '🏰';
    return '📍';
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
  
  battleControls.innerHTML = '';
  
  // Кнопка возврата к выбору локаций
  const backBtn = document.createElement('button');
  backBtn.id = 'btn-back-to-locations';
  backBtn.className = 'battle-btn btn-back-to-locations';
  backBtn.innerHTML = '← Вернуться к выбору локаций';
  backBtn.style.background = 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)';
  backBtn.addEventListener('click', () => this.returnToLocationSelection());
  
  // Кнопка паузы
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'btn-pause';
  pauseBtn.className = 'battle-btn';
  pauseBtn.innerHTML = '⏸️ Пауза';
  pauseBtn.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
  pauseBtn.addEventListener('click', () => this.togglePause());
  
  // Кнопка ускорения
  const speedBtn = document.createElement('button');
  speedBtn.id = 'btn-speed';
  speedBtn.className = 'battle-btn';
  speedBtn.innerHTML = '⚡ x2 Скорость';
  speedBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
  speedBtn.addEventListener('click', () => this.toggleSpeed());
  
  battleControls.appendChild(backBtn);
  battleControls.appendChild(pauseBtn);
  battleControls.appendChild(speedBtn);
}
addSkillUI() {
  const skillsContainer = document.getElementById('skills-container');
  if (!skillsContainer) return;
  
  // Показываем контейнер только в бою
  skillsContainer.style.display = this.isInCombat ? 'block' : 'none';
  
  // Обновляем умения
  this.updateSkillCooldowns();
}
usePlayerSkill(skillId) {
  if (!window.sceneManager || !window.sceneManager.skillSystem) return;
  
  const result = window.sceneManager.skillSystem.useSkill(skillId, this);
  
  if (result.success) {
    this.log(result.message);
    // Обновляем UI навыков
    if (window.sceneManager.updateActiveSkills) {
      window.sceneManager.updateActiveSkills();
    }
  } else {
    this.log(`❌ ${result.message}`);
  }
}
returnToLocationSelection() {
  if (this.isBattleActive) {
    if (confirm('Вы уверены, что хотите прервать путешествие и вернуться к выбору локаций?')) {
      this.stopBattle();
      this.showLocationSelection();
      this.log('🔄 Возвращаемся к выбору локаций');
    }
  } else {
    this.showLocationSelection();
  }
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
            this.showBattleInterface();
    
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
      this.travelAnimation.playerStep = (this.travelAnimation.playerStep + 2) % 20;
      this.travelAnimation.backgroundOffset = (this.travelAnimation.backgroundOffset + 2) % 800;
      
      // Обновляем HUD каждые 2 секунды
      if (Math.floor(this.travelProgress) % 2 === 0) {
        this.updateBattleHUD();
      }
      
    }, 200); // Обновляем каждую секунду
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
    
    this.enemyIndex++;
    
    // Выбираем тип врага для локации
    const enemyType = this.selectEnemyTypeForLocation();
    
    // Создаем врага с учетом типа и уровня
    const enemy = this.createEnemy(enemyType, this.enemyIndex);
    this.enemy = enemy;
    this.enemyMaxHp = enemy.hp;
    
    // Сброс анимации появления врага
    this.travelAnimation.enemyAppear = 0;
    this.travelAnimation.enemyX = 400;
    
    this.log(`⚔️ ${enemy.name} появился! (Уровень ${enemy.level})`);
    this.log(`❤️ HP: ${enemy.hp}, ⚔️ ATK: ${enemy.atk}, 🛡️ DEF: ${enemy.def}`);
    
    // Запускаем боевой цикл
    this.startCombat();
    
    this.updateBattleHUD();
  }
            // Выбор типа врага для текущей локации
  selectEnemyTypeForLocation() {
    if (!this.currentLocation || !this.currentLocation.enemyTypes) {
      // Возвращаем базового врага если типы не определены
      return 'goblin';
    }
    
    const enemyTypes = this.currentLocation.enemyTypes;
    let totalWeight = 0;
    
    // Считаем общий вес
    enemyTypes.forEach(type => {
      totalWeight += type.weight;
    });
    
    // Рандомный выбор с учетом весов
    let random = Math.random() * totalWeight;
    let selectedType = 'goblin'; // дефолтный тип
    
    for (const type of enemyTypes) {
      if (random < type.weight) {
        selectedType = type.type;
        break;
      }
      random -= type.weight;
    }
    
    // Проверяем шанс элитного врага
    if (Math.random() < (this.currentLocation.eliteChance || 0)) {
      // Выбираем элитного врага из доступных
      const eliteTypes = enemyTypes.filter(t => 
        ['ogre', 'dark_mage', 'dragon_whelp'].includes(t.type)
      );
      if (eliteTypes.length > 0) {
        const eliteType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
        selectedType = eliteType.type;
        this.log(`⚠️ Появился элитный враг!`);
      }
    }
    
    // Проверяем шанс босса (только на последних врагах в локации)
    if (this.enemyIndex >= 5 && Math.random() < (this.currentLocation.bossChance || 0)) {
      selectedType = 'dragon_whelp';
      this.log(`🔥 ПОЯВИЛСЯ БОСС!`);
    }
    
    return selectedType;
  }
  // Создание врага на основе типа и индекса
  createEnemy(enemyTypeId, index) {
    const baseEnemy = this.enemyTypes[enemyTypeId] || this.enemyTypes.goblin;
    const locationLevel = this.currentLocation.baseLevel || 1;
    
    // Расчет характеристик с учетом уровня локации и индекса врага
    const level = locationLevel + Math.floor(index / 3);
    const hpGrowth = this.currentLocation.hpGrowth || 1.2;
    const atkGrowth = this.currentLocation.atkGrowth || 1.1;
    const defGrowth = this.currentLocation.defGrowth || 1.05;
    
    const hp = Math.floor(baseEnemy.baseHp * Math.pow(hpGrowth, index - 1) * (1 + (level - 1) * 0.1));
    const atk = Math.floor(baseEnemy.baseAtk * Math.pow(atkGrowth, index - 1) * (1 + (level - 1) * 0.08));
    const def = Math.floor(baseEnemy.baseDef * Math.pow(defGrowth, index - 1) * (1 + (level - 1) * 0.05));
    const gold = Math.floor(baseEnemy.baseGold * (1 + (level - 1) * 0.15));
    const exp = Math.floor(baseEnemy.baseExp * (1 + (level - 1) * 0.12));
    
    // Выбор способностей врага
    const abilities = baseEnemy.abilities.map(abilityId => {
      return this.enemyAbilities[abilityId] || this.enemyAbilities.basic_attack;
    });
    
    return {
      ...baseEnemy,
      hp,
      maxHp: hp,
      atk,
      def,
      gold,
      exp,
      level,
      abilities,
      currentAbility: 0,
      type: enemyTypeId,
      lootTable: baseEnemy.lootTable || [],
      weakAgainst: baseEnemy.weakAgainst || [],
      resistantTo: baseEnemy.resistantTo || []
    };
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
    if (window.sceneManager && window.sceneManager.skillSystem) {
    const skillSystem = window.sceneManager.skillSystem;
    
    // Бонус от навыка "Мощный удар"
    const powerStrikeSkill = skillSystem.getSkillById('warrior_power_strike');
    if (powerStrikeSkill && powerStrikeSkill.currentLevel > 0) {
      const powerStrikeChance = 0.05 * powerStrikeSkill.currentLevel;
      if (Math.random() < powerStrikeChance) {
        damage *= 2;
        this.log('⚔️ Сработал "Мощный удар"!');
      }
    }
    
    // Бонус от навыка "Критическое мастерство"
    const critSkill = skillSystem.getSkillById('assassin_crit_mastery');
    if (critSkill && critSkill.currentLevel > 0) {
      player.stats.crit += 0.05 * critSkill.currentLevel;
    }
  }
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
    
    // Выбираем способность врага
    const ability = this.selectEnemyAbility();
    let damage = Math.max(this.enemy.atk - player.stats.def, 1);
    
    // Модификатор способности
    damage = Math.floor(damage * ability.damage);
    
    // Критический удар врага (5% шанс)
    let isCrit = false;
    if (Math.random() < 0.05) {
      damage = Math.floor(damage * 1.8);
      isCrit = true;
      this.log(`💥 Враг нанес критический урон!`);
    }
    
    // Применяем эффект способности
    if (ability.effect) {
      this.applyEnemyAbilityEffect(ability.effect);
    }
    
    // Наносим урон
    player.currentHp -= damage;
    spawnDamageText(this.ctx, 120, 90, `-${damage}`, isCrit);
    
    this.log(`👾 ${this.enemy.name} использовал "${ability.name}" и нанес ${damage} урона`);
    
    if (player.currentHp <= 0) {
      this.gameOver();
    } else if (player.currentHp < player.maxHp * 0.3) {
      this.log(`⚠️ Низкое здоровье! ${player.currentHp}/${player.maxHp}`);
    }
  }
    // Выбор способности врага
  selectEnemyAbility() {
    if (!this.enemy.abilities || this.enemy.abilities.length === 0) {
      return this.enemyAbilities.basic_attack;
    }
    
    // Простая логика: цикл по способностям
    const currentAbility = this.enemy.currentAbility || 0;
    const ability = this.enemy.abilities[currentAbility];
    
    // Переходим к следующей способности
    this.enemy.currentAbility = (currentAbility + 1) % this.enemy.abilities.length;
    
    return ability;
  }
  
  // Применение эффекта способности врага
  applyEnemyAbilityEffect(effect) {
    if (!effect) return;
    
    switch (effect.type) {
      case 'poison':
        this.activeEffects.enemyPoisoned = { 
          turns: effect.duration, 
          damage: effect.damage 
        };
        this.log(`☠️ Вы отравлены! ${effect.damage} урона в течение ${effect.duration} ходов`);
        break;
        
      case 'bleed':
        this.activeEffects.bleeding = {
          turns: effect.duration,
          damage: effect.damage
        };
        this.log(`🩸 Кровотечение! ${effect.damage} урона в течение ${effect.duration} ходов`);
        break;
        
      case 'burn':
        this.activeEffects.burning = {
          turns: effect.duration,
          damage: effect.damage
        };
        this.log(`🔥 Вы горите! ${effect.damage} урона в течение ${effect.duration} ходов`);
        break;
        
      case 'stun':
        this.activeEffects.playerStunned = effect.duration;
        this.log(`🌀 Вы оглушены на ${effect.duration} ход(ов)`);
        break;
        
      case 'curse':
        // Временное снижение статов
        const stat = effect.stat || 'def';
        const value = effect.value || -5;
        
        if (!this.activeEffects.curses) {
          this.activeEffects.curses = {};
        }
        
        this.activeEffects.curses[stat] = value;
        this.log(`👻 Проклятие! ${stat} уменьшен на ${Math.abs(value)}`);
        break;
        
      case 'heal':
        this.enemy.hp = Math.min(this.enemy.hp + effect.value, this.enemy.maxHp);
        this.log(`💚 ${this.enemy.name} восстановил ${effect.value} HP`);
        break;
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
    const goldReward = this.enemy.gold || 10;
    const expReward = this.enemy.exp || 15;
    
    player.gold += goldReward;
    const leveledUp = addExp(expReward);
  
  this.enemiesDefeated++;
  
  this.log(`💀 ${this.enemy.name} побежден!`);
  this.log(`💰 Получено ${goldReward} золота`);
  this.log(`🌟 Получено ${expReward} опыта`);
  if (leveledUp) {
  this.log(`✨ Уровень повышен! Новый уровень: ${player.level}`);
    // Очки навыков начисляются автоматически в addExp
  }
               // Обновляем UI через сцену
  if (window.sceneManager) {
    window.sceneManager.updateAllDisplays();
  }
  
    
    this.enemiesDefeated++;
    
    this.log(`💀 ${this.enemy.name} побежден!`);
    this.log(`💰 Получено ${goldReward} золота`);
    this.log(`🌟 Получено ${expReward} опыта`);
    this.log(`🏆 Всего побеждено: ${this.enemiesDefeated} врагов`);
    
    // Генерация лута
    const loot = this.generateLoot();
    if (loot.length > 0) {
      loot.forEach(item => {
        this.log(`🎁 Получен предмет: ${item.name}`);
        // TODO: Добавить предмет в инвентарь
      });
    }
    
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
    
    savePlayer(player);
    
    // Возвращаемся к путешествию и планируем следующего врага
    this.isTraveling = true;
    this.isInCombat = false;
    
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    
    this.log(`🌄 Возвращаемся к путешествию...`);
    this.log(`🗺️ Прогресс локации: ${Math.round(this.locationProgress)}%`);
    
    setTimeout(() => {
      this.scheduleNextEnemy();
    }, 1000);
    
    this.updateBattleHUD();
  }
  
  // Генерация лута из таблицы дропа врага
  generateLoot() {
    const loot = [];
    
    if (!this.enemy.lootTable || this.enemy.lootTable.length === 0) {
      return loot;
    }
    
    this.enemy.lootTable.forEach(lootItem => {
      if (Math.random() < lootItem.chance) {
        // TODO: Получить предмет из ITEMS_DB или MATERIALS
        loot.push({
          name: lootItem.item,
          type: 'material'
        });
      }
    });
    
    return loot;
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
    
    const baseReward = this.currentLocation.rewards || { gold: 100, exp: 200 };
    const completionReward = {
      gold: baseReward.gold * this.currentLocation.baseLevel,
      exp: baseReward.exp * this.currentLocation.baseLevel
    };
    
    player.gold += completionReward.gold;
    player.level += 1;
    
    // Улучшение статов при повышении уровня
    player.stats.hp += 20;
    player.stats.atk += 5;
    player.stats.def += 2;
    player.maxHp = player.stats.hp;
    player.currentHp = player.maxHp;
    
    this.log(`💰 Дополнительная награда: ${completionReward.gold} золота`);
    this.log(`🌟 Дополнительный опыт: ${completionReward.exp} опыта`);
    this.log(`📈 Уровень повышен: ${player.level}`);
    this.log(`❤️ Максимальное HP увеличено до ${player.maxHp}`);
    this.log(`⚔️ Атака увеличена до ${player.stats.atk}`);
    this.log(`🛡️ Защита увеличена до ${player.stats.def}`);
    
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

// Замените старый метод drawLocationBackground на этот:
drawLocationBackground() {
  const ctx = this.ctx;
  const canvas = this.canvas;
  
  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Определяем тип фона
  let backgroundColor = '#1a1a2e';
  let groundColor = '#2d3436';
  
  if (this.currentLocation) {
    if (this.currentLocation.name.includes('Завод')) {
      backgroundColor = '#2c3e50';
      groundColor = '#7f8c8d';
    } else if (this.currentLocation.name.includes('Лес')) {
      backgroundColor = '#1a5276';
      groundColor = '#784212';
    } else if (this.currentLocation.name.includes('Подземелье')) {
      backgroundColor = '#17202a';
      groundColor = '#424949';
    }
  }
  
  // Рисуем фон
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Рисуем землю
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, 150, canvas.width, 50);
  
  // Прогресс бар
  const progressWidth = (canvas.width - 40) * (this.locationProgress / 100);
  
  // Фон прогресс бара
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(20, 10, canvas.width - 40, 12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(20, 10, canvas.width - 40, 12);
  
  // Заполненная часть
  if (this.locationProgress >= 100) {
    ctx.fillStyle = '#00b894';
  } else {
    const gradient = ctx.createLinearGradient(20, 10, 20 + progressWidth, 10);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(20, 10, progressWidth, 12);
  
  // Текст прогресса
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(this.locationProgress)}%`, canvas.width / 2, 16);
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
    const playerColor = player.classId === 'warrior' ? '#4cd137' : 
                       player.classId === 'assassin' ? '#9b59b6' : 
                       player.classId === 'mage' ? '#3498db' : '#4cd137';
    drawStickman(ctx, 100 + playerOffset, 120, playerColor);
    drawHpBar(ctx, 70, 20, 60, 6, player.currentHp, player.maxHp);
    
    // Враг
    if (this.enemy) {
      const enemyX = this.travelAnimation.enemyX;
      
      // Цвет врага в зависимости от типа
      let enemyColor = '#e74c3c'; // дефолтный красный
      if (this.enemy.type === 'goblin') enemyColor = '#27ae60';
      if (this.enemy.type === 'wolf') enemyColor = '#7f8c8d';
      if (this.enemy.type === 'skeleton') enemyColor = '#ecf0f1';
      if (this.enemy.type === 'robot') enemyColor = '#95a5a6';
      if (this.enemy.type === 'ogre') enemyColor = '#d35400';
      if (this.enemy.type === 'dark_mage') enemyColor = '#8e44ad';
      if (this.enemy.type === 'dragon_whelp') enemyColor = '#e74c3c';
      
      // Эффект оглушения
      if (this.activeEffects.enemyStunned > 0) {
        enemyColor = '#f39c12';
      }
      
      // Рисуем врага
      drawStickman(ctx, enemyX, 120, enemyColor);
      
      // Рисуем спрайт врага (текст)
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.enemy.sprite || '👹', enemyX, 90);
      
      // HP бар врага
      drawHpBar(ctx, enemyX - 30, 20, 60, 6, this.enemy.hp, this.enemy.maxHp);
      
      // Эффекты на враге
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
