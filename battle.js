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
    this.currentLocation = null;
    this.enemyIndex = 0;
    this.isBattleActive = false;
    
    this.canvas = document.getElementById('battle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.logEl = document.getElementById('battle-log');
    
    this.init();
  }

  init() {
    // Настройка canvas
    this.canvas.width = 400;
    this.canvas.height = 200;
    
    // Инициализация кнопок
    this.initControls();
  }

  initControls() {
    const attackBtn = document.getElementById('btn-attack');
    const defendBtn = document.getElementById('btn-defend');
    const skillBtn = document.getElementById('btn-skill');
    const fleeBtn = document.getElementById('btn-flee');

    if (attackBtn) {
      attackBtn.addEventListener('click', () => this.playerAttack());
    }
    
    if (defendBtn) {
      defendBtn.addEventListener('click', () => this.playerDefend());
    }
    
    if (skillBtn) {
      skillBtn.addEventListener('click', () => this.playerSkill());
    }
    
    if (fleeBtn) {
      fleeBtn.addEventListener('click', () => this.flee());
    }
  }

  async startBattle(locationId) {
    if (this.isBattleActive) {
      this.stopBattle();
    }
    
    this.currentLocation = LOCATIONS[locationId];
    this.enemyIndex = 0;
    this.isBattleActive = true;
    
    resetPlayerHp();
    this.spawnEnemy(this.enemyIndex);
    
    this.log(`⚔️ Начало битвы в локации: ${this.currentLocation.name}`);
    this.log(`👾 Встречен враг ${this.enemyIndex + 1}/${this.currentLocation.enemies}`);
    
    this.updateBattleHUD();
    
    // Запускаем игровой цикл
    this.gameInterval = setInterval(() => this.gameTick(), 1000);
    
    // Запускаем анимацию
    this.animate();
    
    return true;
  }

  gameTick() {
    if (!this.isBattleActive || player.currentHp <= 0) return;
    
    // Автоматическая атака врага (если не нажата защита)
    if (!this.isDefending) {
      this.enemyAttack();
    }
    
    this.updateBattleHUD();
  }

  playerAttack() {
    if (!this.isBattleActive || player.currentHp <= 0) return;
    
    const crit = Math.random() < player.stats.crit;
    const damage = crit ? Math.floor(player.stats.atk * 2.5) : player.stats.atk;
    
    this.enemy.hp -= damage;
    spawnDamageText(this.ctx, 280, 90, `-${damage}`, crit);
    
    this.attackPhase = 10;
    
    if (crit) {
      screenShake(this.ctx, 8);
      this.log('💥 Критический удар!');
    }
    
    this.log(`⚔️ Вы нанесли ${damage} урона`);
    
    if (this.enemy.hp <= 0) {
      this.defeatEnemy();
    }
    
    // Сбрасываем защиту после атаки
    this.isDefending = false;
    
    this.updateBattleHUD();
  }

  playerDefend() {
    this.isDefending = true;
    this.log('🛡️ Вы защищаетесь! Следующая атака врага будет слабее.');
  }

  playerSkill() {
    if (player.classId === 'warrior') {
      this.log('🪓 Воин использует "Рывок"');
      // TODO: Реализовать умения
    } else if (player.classId === 'assassin') {
      this.log('🗡️ Ассасин использует "Скрытность"');
    }
  }

  enemyAttack() {
    if (!this.enemy) return;
    
    // Уменьшаем урон при защите
    let damage = Math.max(this.enemy.atk - player.stats.def, 1);
    if (this.isDefending) {
      damage = Math.max(Math.floor(damage * 0.5), 1);
      this.log('🛡️ Защита снизила урон!');
      this.isDefending = false;
    }
    
    player.currentHp -= damage;
    spawnDamageText(this.ctx, 120, 90, `-${damage}`);
    
    this.log(`👾 Враг нанес ${damage} урона`);
    
    if (player.currentHp <= 0) {
      this.gameOver();
    }
    
    // Предупреждение о низком HP
    if (player.currentHp < player.maxHp * 0.3 && player.currentHp > 0) {
      this.log('⚠️ Низкое здоровье!');
    }
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
    
    this.stopBattle();
    savePlayer(player);
    
    // Автоматическое возвращение через 3 секунды
    setTimeout(() => {
      if (window.sceneManager) {
        window.sceneManager.showScene('menu');
      }
    }, 3000);
  }

  gameOver() {
    this.log('❌ Персонаж погиб');
    this.log('💀 Вы проиграли битву');
    
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
    
    console.log(`👾 Новый враг: HP=${this.enemy.hp}, ATK=${this.enemy.atk}`);
  }

  updateBattleHUD() {
    // Обновляем HUD в битве
    const hud = {
      level: document.getElementById('battle-level'),
      gold: document.getElementById('battle-gold'),
      hp: document.getElementById('battle-hp'),
      enemies: document.getElementById('battle-enemies')
    };
    
    if (hud.level) hud.level.textContent = player.level;
    if (hud.gold) hud.gold.textContent = player.gold;
    if (hud.hp) hud.hp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (hud.enemies && this.currentLocation) {
      hud.enemies.textContent = `${this.enemyIndex}/${this.currentLocation.enemies}`;
    }
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
    drawStickman(this.ctx, 100 + playerOffset, 120, "#4cd137");
    drawHpBar(this.ctx, 70, 20, 60, 6, player.currentHp, player.maxHp);
    
    // Враг
    if (this.enemy) {
      drawStickman(this.ctx, 300, 120, "#e74c3c");
      drawHpBar(this.ctx, 270, 20, 60, 6, this.enemy.hp, this.enemyMaxHp);
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
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('⏹️ Битва остановлена');
  }

  log(message) {
    if (this.logEl) {
      this.logEl.innerHTML += `<div>${message}</div>`;
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
