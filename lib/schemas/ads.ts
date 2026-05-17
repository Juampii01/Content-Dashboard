import { z } from 'zod'

// ─── Meta Graph API — ad accounts ────────────────────────────────────────────

export const MetaAdAccountSchema = z.object({
  id: z.string(),              // "act_123456"
  name: z.string().optional(),
  currency: z.string().optional(),
  account_status: z.number().optional(), // 1=active, 2=disabled, etc.
})

export const MetaAdAccountsResponseSchema = z.object({
  data: z.array(MetaAdAccountSchema).optional(),
  paging: z.object({ cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
})

// ─── Meta Graph API — campaign insights ──────────────────────────────────────

export const MetaInsightsSchema = z.object({
  spend: z.string().optional(),         // "12.50"
  impressions: z.string().optional(),   // "3400"
  clicks: z.string().optional(),        // "120"
  reach: z.string().optional(),
  ctr: z.string().optional(),
  cpc: z.string().optional(),
  actions: z
    .array(z.object({ action_type: z.string(), value: z.string() }))
    .optional(),
  action_values: z
    .array(z.object({ action_type: z.string(), value: z.string() }))
    .optional(),
})

export const MetaCampaignSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: z.string().optional(),
  objective: z.string().optional(),
  insights: z
    .object({ data: z.array(MetaInsightsSchema).optional() })
    .optional(),
})

export const MetaCampaignsResponseSchema = z.object({
  data: z.array(MetaCampaignSchema).optional(),
  paging: z.object({ cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
})

// ─── Query params ─────────────────────────────────────────────────────────────

export const AdCampaignsQuerySchema = z.object({
  platform: z.enum(['meta']).default('meta'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})
