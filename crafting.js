// crafting.js
export class CraftingSystem {
  constructor(inventorySystem) {
    this.inventorySystem = inventorySystem;
    this.recipes = this.loadRecipes();
  }
  
  loadRecipes() {
    return {
      // Простой пример рецепта
      'health_potion_medium': {
        name: 'Среднее зелье здоровья',
        ingredients: [
          { itemId: 'health_potion_small', quantity: 3 },
          { itemId: 'iron_ore', quantity: 1 }
        ],
        result: {
          item: { 
            id: 'crafted_health_potion_medium',
            name: 'Среднее зелье здоровья (Крафт)',
            type: 'potion',
            effect: { type: 'heal', value: 250 },
            icon: '🧪',
            value: 45
          },
          quantity: 1
        }
      }
    };
  }
  
  canCraft(recipeId) {
    const recipe = this.recipes[recipeId];
    if (!recipe) return false;
    
    return recipe.ingredients.every(ing => {
      const item = this.inventorySystem.getItem(ing.itemId);
      return item && item.quantity >= ing.quantity;
    });
  }
  
  craft(recipeId) {
    if (!this.canCraft(recipeId)) {
      return { success: false, message: 'Недостаточно материалов' };
    }
    
    const recipe = this.recipes[recipeId];
    
    // Убираем ингредиенты
    recipe.ingredients.forEach(ing => {
      this.inventorySystem.removeItem(ing.itemId, ing.quantity);
    });
    
    // Добавляем результат
    this.inventorySystem.addItem(recipe.result.item);
    
    return { 
      success: true, 
      message: `Создано: ${recipe.name}` 
    };
  }
}