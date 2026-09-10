import { z } from "zod";

export const LAB_NAME = "Donut lab donut";
export const labCustomizationSchema = z.object({
  productName: z.string().trim().min(1).max(180),
  kind: z.literal("lab"),
  elements: z.array(z.object({
    label: z.enum(["Shape", "Size", "Icing", "Filling", "Sprinkles"]),
    value: z.string().trim().min(1).max(120)
  })).min(1).max(5)
}).superRefine((value, context) => {
  const labels = value.elements.map(element => element.label);
  if (!labels.includes("Shape") || new Set(labels).size !== labels.length) {
    context.addIssue({ code: "custom", message: "Choose a shape and one answer per design step." });
  }
});

export function labOrderNote(name, custom) {
  const isLab = name.toLowerCase() === LAB_NAME.toLowerCase();
  if (!isLab && custom?.kind !== "lab") return undefined;
  if (!isLab || custom?.kind !== "lab") throw Object.assign(new Error("Please reopen the Donut Lab and choose your design."), { status: 409, code: "LAB_DESIGN_REQUIRED" });
  const design = labCustomizationSchema.parse(custom);
  return `DONUT LAB: ${design.elements.map(element => `${element.label}: ${element.value}`).join("; ")}`;
}
