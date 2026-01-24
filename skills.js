// skills.js
export class SkillSystem {
  constructor(player) {
    this.player = player;
    this.skillTree = this.loadSkillTree();
    this.unlockedSkills = this.loadUnlockedSkills();
  }
  
  loadSkillTree() {
    return {
      warrior: {
        attack: [
          {
            id: 'power_strike',
            name: 'Мощный удар',
            description: '+20% к урону',
            level: 1,
            cost: 1,
            effect: (stats) => ({ atk: stats.atk * 1.2 }),
            requirements: []
          }
        ],
        defense: [
          // ... навыки защиты
        ]
      },
      assassin: {
        // ... для ассасина
      }
    };
  }
  
  unlockSkill(skillId) {
    // Логика разблокировки навыков
  }
}