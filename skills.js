// skills.js - полная система навыков
import { player } from './game.js';
import { ITEMS_DB, ITEM_RARITY } from './inventory.js';
import { savePlayer } from './telegramSave.js';

export class SkillSystem {
  constructor(player) {
    this.player = player;
    this.skillPoints = player.skillPoints || 0;
    this.unlockedSkills = this.loadUnlockedSkills();
    this.skillTree = this.createSkillTree();
    this.activeSkills = this.loadActiveSkills();
    
    // Эффекты активных навыков
    this.activeEffects = {
      passive: {},
      combat: {},
      utility: {}
    };
    
    console.log('✨ Система навыков загружена:', {
      playerSkillPoints: player.skillPoints,
      skillPoints: this.skillPoints,
      unlockedSkills: this.unlockedSkills.length,
      activeSkills: this.activeSkills.length
    });
        // Загружаем уровни навыков
    this.loadSkillLevels();
  }
  // Геттер для получения актуальных очков навыков
  get skillPoints() {
    return this.player.skillPoints || 0;
  }

  // Сеттер для установки очков навыков
  set skillPoints(value) {
    this.player.skillPoints = value;
  }

  // Загрузка очков навыков
  loadSkillPoints() {
    return this.player.skillPoints || 0;
  }

  // Загрузка разблокированных навыков
  loadUnlockedSkills() {
    return this.player.unlockedSkills || [];
  }

  // Загрузка активных навыков (экипированных)
  loadActiveSkills() {
    return this.player.activeSkills || [];
  }

  // Создание дерева навыков для текущего класса
  createSkillTree() {
    const baseTree = {
      // Навыки для всех классов
      common: {
        survival: [
          {
            id: 'survival_health',
            name: 'Живучесть',
            description: 'Увеличивает максимальное здоровье на 20 за уровень',
            maxLevel: 5,
            currentLevel: 0,
            cost: 1,
            effect: (level) => ({ hp: 20 * level }),
            icon: '❤️',
            color: '#e74c3c',
            requirements: [],
            type: 'passive'
          },
          {
            id: 'survival_regen',
            name: 'Регенерация',
            description: 'Восстанавливает 1% здоровья каждые 5 секунд',
            maxLevel: 3,
            currentLevel: 0,
            cost: 2,
            effect: (level) => ({ hpRegen: 0.01 * level }),
            icon: '💚',
            color: '#2ecc71',
            requirements: [['survival_health', 2]],
            type: 'passive'
          }
        ],
        economy: [
          {
            id: 'gold_finder',
            name: 'Находчивость',
            description: '+10% золота с врагов за уровень',
            maxLevel: 3,
            currentLevel: 0,
            cost: 1,
            effect: (level) => ({ goldMultiplier: 0.1 * level }),
            icon: '💰',
            color: '#f1c40f',
            requirements: [],
            type: 'passive'
          },
          {
            id: 'lucky_find',
            name: 'Удача',
            description: '+5% шанс на редкий лут за уровень',
            maxLevel: 3,
            currentLevel: 0,
            cost: 2,
            effect: (level) => ({ lootChance: 0.05 * level }),
            icon: '🍀',
            color: '#9b59b6',
            requirements: [['gold_finder', 1]],
            type: 'passive'
          }
        ]
      }
    };

    // Классовые навыки
    const classTrees = {
      warrior: this.createWarriorTree(),
      assassin: this.createAssassinTree(),
      mage: this.createMageTree(),
      archer: this.createArcherTree()
    };

    return {
      ...baseTree,
      [this.player.classId]: classTrees[this.player.classId] || {}
    };
  }

  // Дерево навыков Воина
  createWarriorTree() {
    return {
      offense: [
        {
          id: 'warrior_power_strike',
          name: 'Мощный удар',
          description: 'Шанс 15% нанести двойной урон',
          maxLevel: 3,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ powerStrikeChance: 0.05 * level }),
          icon: '⚔️',
          color: '#e74c3c',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'warrior_cleave',
          name: 'Рассечение',
          description: 'Атака наносит урон всем врагам вблизи',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ cleave: true }),
          icon: '🪓',
          color: '#d35400',
          requirements: [['warrior_power_strike', 2]],
          type: 'passive'
        },
        {
          id: 'warrior_berserk',
          name: 'Берсерк',
          description: 'При снижении здоровья ниже 30% увеличивает урон на 50%',
          maxLevel: 1,
          currentLevel: 0,
          cost: 4,
          effect: () => ({ berserk: true }),
          icon: '🔥',
          color: '#c0392b',
          requirements: [['warrior_cleave', 1]],
          type: 'passive'
        }
      ],
      defense: [
        {
          id: 'warrior_shield_mastery',
          name: 'Мастер щита',
          description: '+10% защиты за уровень',
          maxLevel: 5,
          currentLevel: 0,
          cost: 1,
          effect: (level) => ({ def: 5 * level }),
          icon: '🛡️',
          color: '#3498db',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'warrior_taunt',
          name: 'Провокация',
          description: 'Принуждает врагов атаковать вас',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ taunt: true }),
          icon: '🗣️',
          color: '#2980b9',
          requirements: [['warrior_shield_mastery', 3]],
          type: 'active'
        },
        {
          id: 'warrior_iron_will',
          name: 'Железная воля',
          description: 'Иммунитет к оглушению и снижению защиты',
          maxLevel: 1,
          currentLevel: 0,
          cost: 5,
          effect: () => ({ immuneToStun: true, immuneToDefDebuff: true }),
          icon: '💪',
          color: '#2c3e50',
          requirements: [['warrior_taunt', 1], ['warrior_shield_mastery', 5]],
          type: 'passive'
        }
      ],
      combat: [
        {
          id: 'warrior_charge',
          name: 'Рывок',
          description: 'Активный навык: рывок к врагу с оглушением',
          maxLevel: 1,
          currentLevel: 0,
          cost: 2,
          effect: () => ({
            type: 'active',
            cooldown: 20,
            damage: 1.5,
            stun: 2
          }),
          icon: '⚡',
          color: '#f1c40f',
          requirements: [],
          type: 'active'
        },
        {
          id: 'warrior_shout',
          name: 'Боевой клич',
          description: 'Увеличивает атаку союзников на 20% на 15 секунд',
          maxLevel: 2,
          currentLevel: 0,
          cost: 3,
          effect: (level) => ({
            type: 'active',
            cooldown: 30,
            atkBuff: 0.1 * level,
            duration: 15
          }),
          icon: '📢',
          color: '#e67e22',
          requirements: [['warrior_charge', 1]],
          type: 'active'
        }
      ]
    };
  }

  // Дерево навыков Ассасина
  createAssassinTree() {
    return {
      stealth: [
        {
          id: 'assassin_sneak',
          name: 'Скрытность',
          description: '+10% шанс уклонения за уровень',
          maxLevel: 3,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ dodge: 0.1 * level }),
          icon: '👤',
          color: '#34495e',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'assassin_backstab',
          name: 'Удар в спину',
          description: 'Критические удары наносят тройной урон',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ backstabMultiplier: 3 }),
          icon: '🗡️',
          color: '#2c3e50',
          requirements: [['assassin_sneak', 2]],
          type: 'passive'
        }
      ],
      critical: [
        {
          id: 'assassin_crit_mastery',
          name: 'Критическое мастерство',
          description: '+5% шанс крита за уровень',
          maxLevel: 5,
          currentLevel: 0,
          cost: 1,
          effect: (level) => ({ crit: 0.05 * level }),
          icon: '🎯',
          color: '#e74c3c',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'assassin_deadly_precision',
          name: 'Смертельная точность',
          description: 'Критический урон увеличен на 50%',
          maxLevel: 1,
          currentLevel: 0,
          cost: 4,
          effect: () => ({ critDamage: 0.5 }),
          icon: '💀',
          color: '#c0392b',
          requirements: [['assassin_crit_mastery', 3]],
          type: 'passive'
        }
      ],
      poison: [
        {
          id: 'assassin_poison_blade',
          name: 'Отравленный клинок',
          description: 'Атаки имеют 25% шанс отравить врага',
          maxLevel: 2,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ poisonChance: 0.125 * level }),
          icon: '☠️',
          color: '#27ae60',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'assassin_toxic_mastery',
          name: 'Токсичное мастерство',
          description: 'Яд наносит на 50% больше урона',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ poisonDamage: 0.5 }),
          icon: '🧪',
          color: '#16a085',
          requirements: [['assassin_poison_blade', 1]],
          type: 'passive'
        }
      ]
    };
  }

  // Дерево навыков Мага
  createMageTree() {
    return {
      fire: [
        {
          id: 'mage_fireball',
          name: 'Огненный шар',
          description: 'Базовый магический урон',
          maxLevel: 3,
          currentLevel: 0,
          cost: 1,
          effect: (level) => ({ fireDamage: 10 * level }),
          icon: '🔥',
          color: '#e74c3c',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'mage_firestorm',
          name: 'Огненный шторм',
          description: 'Область урона всем врагам',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ firestorm: true }),
          icon: '🌪️',
          color: '#d35400',
          requirements: [['mage_fireball', 2]],
          type: 'active'
        }
      ],
      ice: [
        {
          id: 'mage_frostbolt',
          name: 'Ледяная стрела',
          description: 'Замедляет врага на 30%',
          maxLevel: 2,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ slow: 0.15 * level }),
          icon: '❄️',
          color: '#3498db',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'mage_blizzard',
          name: 'Метель',
          description: 'Область замедления и урона',
          maxLevel: 1,
          currentLevel: 0,
          cost: 4,
          effect: () => ({ blizzard: true }),
          icon: '🌨️',
          color: '#2980b9',
          requirements: [['mage_frostbolt', 1]],
          type: 'active'
        }
      ],
      arcane: [
        {
          id: 'mage_arcane_mastery',
          name: 'Магия арканы',
          description: 'Увеличивает весь магический урон на 10% за уровень',
          maxLevel: 3,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ spellDamage: 0.1 * level }),
          icon: '🔮',
          color: '#9b59b6',
          requirements: [],
          type: 'passive'
        }
      ]
    };
  }

  // Дерево навыков Лучника
  createArcherTree() {
    return {
      archery: [
        {
          id: 'archer_precision',
          name: 'Точность',
          description: '+5% шанс попадания за уровень',
          maxLevel: 4,
          currentLevel: 0,
          cost: 1,
          effect: (level) => ({ accuracy: 0.05 * level }),
          icon: '🎯',
          color: '#2ecc71',
          requirements: [],
          type: 'passive'
        },
        {
          id: 'archer_piercing_shot',
          name: 'Пробивающий выстрел',
          description: 'Выстрел проходит сквозь врагов',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ piercing: true }),
          icon: '🏹',
          color: '#27ae60',
          requirements: [['archer_precision', 2]],
          type: 'passive'
        }
      ],
      traps: [
        {
          id: 'archer_bear_trap',
          name: 'Медвежий капкан',
          description: 'Устанавливает ловушку, которая обездвиживает врага',
          maxLevel: 2,
          currentLevel: 0,
          cost: 2,
          effect: (level) => ({ trapDuration: 3 * level }),
          icon: '🪤',
          color: '#8b4513',
          requirements: [],
          type: 'active'
        }
      ],
      survival: [
        {
          id: 'archer_camouflage',
          name: 'Камуфляж',
          description: 'Снижает агрессию врагов на 30%',
          maxLevel: 1,
          currentLevel: 0,
          cost: 3,
          effect: () => ({ threatReduction: 0.3 }),
          icon: '🌿',
          color: '#27ae60',
          requirements: [],
          type: 'passive'
        }
      ]
    };
  }

  // Проверка требований для навыка
  checkRequirements(skillId) {
    const skill = this.getSkillById(skillId);
    if (!skill || skill.requirements.length === 0) return true;
    
    return skill.requirements.every(([reqId, reqLevel]) => {
      const reqSkill = this.getSkillById(reqId);
      return reqSkill && reqSkill.currentLevel >= reqLevel;
    });
  }

  // Получение навыка по ID
  getSkillById(skillId) {
    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        for (const subcategory in this.skillTree[category]) {
          const skills = this.skillTree[category][subcategory];
          const skill = skills.find(s => s.id === skillId);
          if (skill) return skill;
        }
      }
    }
    return null;
  }

  // Прокачка навыка
  upgradeSkill(skillId) {
    const skill = this.getSkillById(skillId);
    if (!skill) {
      console.error('Навык не найден:', skillId);
      return { success: false, message: 'Навык не найден' };
    }

    // Проверяем уровень
    if (skill.currentLevel >= skill.maxLevel) {
      return { success: false, message: 'Максимальный уровень достигнут' };
    }

    // Проверяем очки навыков (используем геттер)
    if (this.skillPoints < skill.cost) {
      return { success: false, message: 'Недостаточно очков навыков' };
    }

    // Проверяем требования
    if (!this.checkRequirements(skillId)) {
      return { success: false, message: 'Требования не выполнены' };
    }

    // Прокачиваем
    skill.currentLevel++;
    // Уменьшаем очки через сеттер
    this.skillPoints -= skill.cost;
    
    // Добавляем в разблокированные
    if (!this.unlockedSkills.includes(skillId)) {
      this.unlockedSkills.push(skillId);
    }

    // Применяем эффект
    this.applySkillEffect(skill);

    // Сохраняем
    this.saveToPlayer();

    console.log(`✅ Навык прокачан: ${skill.name} (Уровень ${skill.currentLevel})`);

    return {
      success: true,
      message: `Навык "${skill.name}" повышен до уровня ${skill.currentLevel}`,
      skill: skill
    };
  }

  // Добавим метод для синхронизации очков
  syncSkillPoints() {
    this.skillPoints = this.player.skillPoints || 0;
  }

  // Применение эффекта навыка
  applySkillEffect(skill) {
    if (!skill.effect) return;

    const effect = skill.effect(skill.currentLevel);
    
    // Применяем эффект в зависимости от типа
    switch (skill.type) {
      case 'passive':
        this.activeEffects.passive[skill.id] = effect;
        this.applyPassiveEffects();
        break;
        
      case 'active':
        // Активные навыки добавляются в список доступных
        this.activeEffects.combat[skill.id] = {
          ...effect,
          name: skill.name,
          icon: skill.icon,
          currentCooldown: 0
        };
        break;
    }
  }

  // Применение всех пассивных эффектов к игроку
  applyPassiveEffects() {
    // Сначала сбрасываем все бонусы от навыков
    if (this.player.skillBonuses) {
      Object.keys(this.player.skillBonuses).forEach(stat => {
        if (stat === 'hp') {
          this.player.stats.hp -= this.player.skillBonuses[stat];
          this.player.maxHp -= this.player.skillBonuses[stat];
          this.player.currentHp = Math.min(this.player.currentHp, this.player.maxHp);
        } else {
          this.player.stats[stat] -= this.player.skillBonuses[stat];
        }
      });
    }

    // Собираем все пассивные эффекты
    const newBonuses = {};
    Object.values(this.activeEffects.passive).forEach(effect => {
      Object.keys(effect).forEach(stat => {
        newBonuses[stat] = (newBonuses[stat] || 0) + effect[stat];
      });
    });

    // Применяем новые бонусы
    Object.keys(newBonuses).forEach(stat => {
      if (stat === 'hp') {
        this.player.stats.hp += newBonuses[stat];
        this.player.maxHp += newBonuses[stat];
        this.player.currentHp += newBonuses[stat];
      } else if (stat === 'hpRegen') {
        // Обработка регенерации отдельно
        this.player.hpRegen = newBonuses[stat];
      } else if (stat === 'goldMultiplier') {
        this.player.goldMultiplier = newBonuses[stat];
      } else if (stat === 'lootChance') {
        this.player.lootChance = newBonuses[stat];
      } else {
        this.player.stats[stat] = (this.player.stats[stat] || 0) + newBonuses[stat];
      }
    });

    this.player.skillBonuses = newBonuses;
    savePlayer(this.player);
  }

  // Использование активного навыка в бою
  useSkill(skillId, battleSystem) {
    const skill = this.activeEffects.combat[skillId];
    if (!skill) {
      return { success: false, message: 'Навык не доступен' };
    }

    if (skill.currentCooldown > 0) {
      return {
        success: false,
        message: `Навык на перезарядке: ${skill.currentCooldown}с`
      };
    }

    // Применяем эффект навыка в бою
    switch (skillId) {
      case 'warrior_charge':
        if (battleSystem && battleSystem.enemy) {
          battleSystem.log(`⚡ Вы используете "Рывок" против ${battleSystem.enemy.name}!`);
          const damage = Math.floor(player.stats.atk * skill.damage);
          battleSystem.enemy.hp -= damage;
          battleSystem.activeEffects.enemyStunned = skill.stun;
          battleSystem.log(`⚡ Нанесено ${damage} урона! Враг оглушен на ${skill.stun} сек.`);
        }
        break;
        
      case 'warrior_shout':
        battleSystem.log(`📢 Вы используете "Боевой клич"!`);
        // TODO: Добавить бафф атаки на время
        break;
        
      case 'assassin_poison_dagger':
        if (battleSystem && battleSystem.enemy) {
          battleSystem.log(`☠️ Вы используете "Отравленный клинок"!`);
          battleSystem.applyPoison(skill.poisonDuration, skill.poisonDamage);
        }
        break;
    }

    // Устанавливаем перезарядку
    skill.currentCooldown = skill.cooldown;
    
    // Запускаем таймер перезарядки
    this.startCooldownTimer(skillId, skill.cooldown);

    return { success: true, message: `Навык "${skill.name}" использован!` };
  }

  // Таймер перезарядки для активных навыков
  startCooldownTimer(skillId, cooldown) {
    const skill = this.activeEffects.combat[skillId];
    if (!skill) return;

    const interval = setInterval(() => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      } else {
        clearInterval(interval);
      }
    }, 1000);
  }

  // Получение очков навыков за уровень
  addSkillPoints(amount = 1) {
    this.skillPoints += amount;
    this.player.skillPoints = this.skillPoints;
    savePlayer(this.player);
    
    console.log(`✨ Получено ${amount} очко(в) навыков. Всего: ${this.skillPoints}`);
    
    return this.skillPoints;
  }

  // Сброс всех навыков (за золото)
  resetSkills() {
    const resetCost = 100 * this.player.level;
    
    if (this.player.gold < resetCost) {
      return { success: false, message: `Недостаточно золота. Нужно: ${resetCost}` };
    }

    // Возвращаем очки навыков
    let totalPoints = 0;
    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        for (const subcategory in this.skillTree[category]) {
          this.skillTree[category][subcategory].forEach(skill => {
            totalPoints += skill.currentLevel * skill.cost;
            skill.currentLevel = 0;
          });
        }
      }
    }

    this.skillPoints = totalPoints;
    this.unlockedSkills = [];
    this.activeEffects = { passive: {}, combat: {}, utility: {} };
    this.player.skillBonuses = {};
    
    // Снимаем эффекты
    this.applyPassiveEffects();
    
    // Списание золота
    this.player.gold -= resetCost;
    
    this.saveToPlayer();
    
    return {
      success: true,
      message: `Все навыки сброшены! Возвращено ${totalPoints} очков навыков`,
      skillPoints: this.skillPoints
    };
  }

  // Сохранение в объект игрока
  saveToPlayer() {
    this.player.skillPoints = this.skillPoints;
    this.player.unlockedSkills = this.unlockedSkills;
    this.player.activeSkills = this.activeSkills;
    
    // Сохраняем текущие уровни навыков
    const skillLevels = {};
    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        for (const subcategory in this.skillTree[category]) {
          this.skillTree[category][subcategory].forEach(skill => {
            if (skill.currentLevel > 0) {
              skillLevels[skill.id] = skill.currentLevel;
            }
          });
        }
      }
    }
    
    this.player.skillLevels = skillLevels;
    savePlayer(this.player);
  }

  // Загрузка уровней навыков из сохранения
  loadSkillLevels() {
    if (!this.player.skillLevels) return;
    
    Object.keys(this.player.skillLevels).forEach(skillId => {
      const skill = this.getSkillById(skillId);
      if (skill) {
        skill.currentLevel = this.player.skillLevels[skillId];
        if (skill.currentLevel > 0) {
          this.applySkillEffect(skill);
        }
      }
    });
  }

  // Получение статистики по навыкам
  getSkillStats() {
    const stats = {
      totalSkills: 0,
      maxedSkills: 0,
      totalPointsSpent: 0,
      categories: {}
    };

    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        stats.categories[category] = { unlocked: 0, total: 0 };
        
        for (const subcategory in this.skillTree[category]) {
          this.skillTree[category][subcategory].forEach(skill => {
            stats.totalSkills++;
            stats.categories[category].total++;
            
            if (skill.currentLevel > 0) {
              stats.categories[category].unlocked++;
              stats.totalPointsSpent += skill.currentLevel * skill.cost;
              
              if (skill.currentLevel >= skill.maxLevel) {
                stats.maxedSkills++;
              }
            }
          });
        }
      }
    }

    return stats;
  }

  // Получение доступных для прокачки навыков
  getAvailableSkills() {
    const available = [];
    
    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        for (const subcategory in this.skillTree[category]) {
          this.skillTree[category][subcategory].forEach(skill => {
            if (skill.currentLevel < skill.maxLevel &&
                this.skillPoints >= skill.cost &&
                this.checkRequirements(skill.id)) {
              available.push(skill);
            }
          });
        }
      }
    }

    return available;
  }

  // Получение всех навыков по категориям для UI
  getAllSkillsByCategory() {
    const categories = {};
    
    for (const category in this.skillTree) {
      if (typeof this.skillTree[category] === 'object') {
        categories[category] = {};
        
        for (const subcategory in this.skillTree[category]) {
          categories[category][subcategory] = this.skillTree[category][subcategory];
        }
      }
    }

    return categories;
  }

  // Получение активных навыков для использования в бою
  getCombatSkills() {
    return Object.keys(this.activeEffects.combat).map(skillId => ({
      id: skillId,
      ...this.activeEffects.combat[skillId]
    }));
  }

  // Обновление кулдаунов (вызывается каждый кадр в бою)
  updateCooldowns(deltaTime) {
    Object.keys(this.activeEffects.combat).forEach(skillId => {
      const skill = this.activeEffects.combat[skillId];
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - deltaTime);
      }
    });
  }
}

// Экспорт системы навыков для использования в других модулях
export function createSkillSystem(player) {
  return new SkillSystem(player);
}

// Вспомогательные функции для UI
export function getClassColor(className) {
  const colors = {
    warrior: '#e74c3c',
    assassin: '#2c3e50',
    mage: '#9b59b6',
    archer: '#27ae60'
  };
  return colors[className] || '#3498db';
}

export function getClassIcon(className) {
  const icons = {
    warrior: '⚔️',
    assassin: '🗡️',
    mage: '🔮',
    archer: '🏹'
  };
  return icons[className] || '👤';
}
