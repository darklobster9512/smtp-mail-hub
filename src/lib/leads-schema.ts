import { z } from "zod";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const leadInputSchema = z.object({
  email: z.string().trim().max(255).regex(EMAIL_RE, "Ungültige E-Mail-Adresse"),
  first_name: z.string().trim().max(100).optional().nullable(),
  last_name: z.string().trim().max(100).optional().nullable(),
  source: z.string().trim().max(100).optional().nullable(),
});
export type LeadInput = z.infer<typeof leadInputSchema>;
