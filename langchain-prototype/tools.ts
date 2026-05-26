import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const calculateMacros = new DynamicStructuredTool({
  name: "calculate_macros",
  description:
    "Calculate macro percentages from grams. Takes protein, carbs, and fat in grams and returns calorie breakdown and percentages.",
  schema: z.object({
    proteinGrams: z.number().describe("Protein in grams"),
    carbsGrams: z.number().describe("Carbohydrates in grams"),
    fatGrams: z.number().describe("Fat in grams"),
  }),
  func: async ({ proteinGrams, carbsGrams, fatGrams }) => {
    const proteinCals = proteinGrams * 4;
    const carbsCals = carbsGrams * 4;
    const fatCals = fatGrams * 9;
    const totalCals = proteinCals + carbsCals + fatCals;

    if (totalCals === 0) return "No macros provided.";

    const result = {
      totalCalories: totalCals,
      protein: {
        grams: proteinGrams,
        calories: proteinCals,
        percentage: Math.round((proteinCals / totalCals) * 100),
      },
      carbs: {
        grams: carbsGrams,
        calories: carbsCals,
        percentage: Math.round((carbsCals / totalCals) * 100),
      },
      fat: {
        grams: fatGrams,
        calories: fatCals,
        percentage: Math.round((fatCals / totalCals) * 100),
      },
    };

    return JSON.stringify(result, null, 2);
  },
});

export const customTools = [calculateMacros];
