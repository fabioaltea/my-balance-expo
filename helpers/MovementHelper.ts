import { Category } from "@/state";
// Default colors for income/expense
const DEFAULT_INCOME_COLOR = "#34C759";
const DEFAULT_EXPENSE_COLOR = "#FF3B30";
const DEFAULT_ICON = "label";
export class MovementHelper {
   
   public static getMovementIcon = (
     categoryName?: string,
     categories?: Category[]
   ): string => {
     if (!categoryName || !categories) return DEFAULT_ICON;
   
     const category = categories.find(
       (c) => c.name.toLowerCase() === categoryName.toLowerCase()
     );
   
     return category?.icon || DEFAULT_ICON;
   };
   
   // Helper to get color from category data or fallback based on type
   public static getMovementColor = (
     type: "income" | "expense",
     categoryName?: string,
     categories?: Category[]
   ): string => {
     if (!categoryName || !categories) {
       return type === "income" ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR;
     }
   
     const category = categories.find(
       (c) => c.name.toLowerCase() === categoryName.toLowerCase()
     );
   
     if (category?.color) {
       return category.color;
     }
   
     return type === "income" ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR;
   }
}