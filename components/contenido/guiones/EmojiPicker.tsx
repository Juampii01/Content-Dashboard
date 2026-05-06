'use client'

import dynamic from 'next/dynamic'

const EmojiPickerLib = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiPickerPortalProps {
  tabId: string
  anchor: { top: number; left: number }
  onSelect: (tabId: string, emoji: string) => void
  pickerRef: React.RefObject<HTMLDivElement | null>
}

export function EmojiPickerPortal({ tabId, anchor, onSelect, pickerRef }: EmojiPickerPortalProps) {
  return (
    <div
      ref={pickerRef}
      className="fixed z-50"
      style={{ top: anchor.top, left: Math.min(anchor.left, window.innerWidth - 360) }}
      onClick={e => e.stopPropagation()}
    >
      <EmojiPickerLib
        onEmojiClick={e => onSelect(tabId, e.emoji)}
        searchPlaceholder="Buscar..."
        width={320}
        height={380}
        emojiStyle={'native' as never}
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
      />
    </div>
  )
}
