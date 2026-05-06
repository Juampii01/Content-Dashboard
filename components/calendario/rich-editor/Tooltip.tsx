export type TooltipState = {
  x: number
  y: number
  lines: { bold: string; rest: string }[]
  placement?: 'top' | 'left' | 'bottom' | 'right'
} | null

interface TooltipProps {
  tooltip: TooltipState
}

// Notion-style custom tooltip
export function Tooltip({ tooltip }: TooltipProps) {
  if (!tooltip) return null
  return (
    <div
      className="fixed z-[70] pointer-events-none"
      style={{
        top: tooltip.y,
        left: tooltip.x,
        transform:
          tooltip.placement === 'bottom' ? 'translate(-50%, 0)'
          : tooltip.placement === 'left'  ? 'translate(-100%, -50%)'
          : tooltip.placement === 'right' ? 'translate(0, -50%)'
          : /* top (default) */             'translate(-50%, -100%) translateY(-4px)',
      }}
    >
      <div
        className="rounded-lg px-3 py-2 text-xs shadow-xl"
        style={{
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.08)',
          minWidth: 200,
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        {tooltip.lines.map((line, i) => (
          <div key={i}>
            <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{line.bold}</strong>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{line.rest}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
