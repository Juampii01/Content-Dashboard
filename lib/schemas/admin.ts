/**
 * Zod schemas for admin API routes.
 */
import { z } from 'zod'

export const UserRoleSchema = z.enum(['admin', 'team', 'setter', 'client'])

export const UpdateUserSchema = z.object({
  role: UserRoleSchema.optional(),
  clientId: z.string().cuid().nullable().optional(),
  displayName: z.string().min(1).max(120).optional(),
  themeKey: z.enum(['eternity', 'govbidder']).optional(),
})

// slug — lowercase letters, digits, hyphens
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(slugRegex).min(1).max(120).optional(),
})

export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().regex(slugRegex).min(1).max(120).optional(),
})

export const SetActiveClientSchema = z.object({
  clientId: z.string().min(1),
})

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
