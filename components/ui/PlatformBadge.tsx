/**
 * PlatformBadge — visual marker for "this thing is from YouTube/Instagram".
 *
 * Two variants used across transcript / content-research / video-feed:
 *   - "pill"  → pill with icon + label, used as a header chip on cards.
 *   - "icon"  → icon only, used in dense card headers next to other meta.
 *
 * Extracted from 3 separate near-identical implementations so a future
 * platform (TikTok? LinkedIn?) only needs to be added here.
 */
import { Camera, Play } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

export type Platform = 'youtube' | 'instagram'

const PLATFORM_META: Record<
  Platform,
  { label: string; Icon: ComponentType<LucideProps> }
> = {
  youtube: { label: 'YouTube', Icon: Play },
  instagram: { label: 'Instagram', Icon: Camera },
}

interface PlatformBadgeProps {
  platform: Platform
  /** "pill" → icon + label; "icon" → icon only. Default: "pill". */
  variant?: 'pill' | 'icon'
  /** Icon size in px. Default 11 (pill) / 14 (icon). */
  size?: number
}

export function PlatformBadge({ platform, variant = 'pill', size }: PlatformBadgeProps) {
  const { label, Icon } = PLATFORM_META[platform]

  if (variant === 'icon') {
    return <Icon size={size ?? 14} style={{ color: 'var(--accent)' }} aria-label={label} />
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        border: '1px solid var(--border)',
        color: 'var(--accent)',
        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
      }}
    >
      <Icon size={size ?? 11} aria-hidden="true" />
      {label}
    </span>
  )
}
