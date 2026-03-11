import { Category, Movement } from "@/src/state";
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

   /**
    * Predict the most likely category for a description based on historical movements.
    * Uses substring matching and word overlap to find similar past movements,
    * then returns the most frequently used category among matches.
    */
   public static predictCategory = (
     description: string,
     movements: Movement[],
     categories: Category[],
   ): string | null => {
     const input = description.trim().toLowerCase();
     if (input.length < 3) return null;

     const categoryNames = new Set(
       categories.map((c) => c.name.toLowerCase()),
     );

     const inputWords = input.split(/\s+/).filter((w) => w.length >= 3);

     // Score each movement by similarity to the input description
     const scored: { category: string; score: number }[] = [];

     for (const mov of movements) {
       if (!mov.category || !mov.description) continue;
       const movDesc = mov.description.trim().toLowerCase();
       if (movDesc.length < 2) continue;

       let score = 0;

       // Exact match (highest weight)
       if (movDesc === input) {
         score = 10;
       }
       // Input contains movement description or vice versa
       else if (movDesc.includes(input) || input.includes(movDesc)) {
         score = 5;
       }
       // Word overlap: count matching words
       else if (inputWords.length > 0) {
         const movWords = movDesc.split(/\s+/).filter((w) => w.length >= 3);
         const matches = inputWords.filter((w) =>
           movWords.some((mw) => mw.includes(w) || w.includes(mw)),
         ).length;
         if (matches > 0) {
           score = matches * 2;
         }
       }

       if (score > 0) {
         scored.push({ category: mov.category, score });
       }
     }

     if (scored.length === 0) return null;

     // Aggregate scores per category
     const categoryScores = new Map<string, number>();
     for (const { category, score } of scored) {
       categoryScores.set(
         category,
         (categoryScores.get(category) || 0) + score,
       );
     }

     // Find the category with the highest total score
     let bestCategory: string | null = null;
     let bestScore = 0;
     for (const [cat, total] of categoryScores) {
       if (total > bestScore && categoryNames.has(cat.toLowerCase())) {
         bestScore = total;
         bestCategory = cat;
       }
     }

     return bestCategory;
   };
}