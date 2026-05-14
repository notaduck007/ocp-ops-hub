import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

export const detailSearchSchema = z.object({
  edit: fallback(z.boolean(), false).optional(),
});

export const detailSearchValidator = zodValidator(detailSearchSchema);

export type DetailSearch = z.infer<typeof detailSearchSchema>;
