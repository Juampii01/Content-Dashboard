import { getMultiplierColor, getMultiplierBg } from '@/lib/utils/multiplier'
import { formatMultiplier } from '@/lib/utils/formatters'

interface Props {
  multiplier: number
  isAd?: boolean
}

export function MetricBadge({ multiplier, isAd }: Props) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-bold px-2 py-0.5 rounded"
        style={{
          backgroundColor: getMultiplierBg(multiplier),
          color: getMultiplierColor(multiplier),
          border: `1px solid ${getMultiplierColor(multiplier)}40`,
        }}>
        {formatMultiplier(multiplier)}
      </span>
      {isAd && (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: '#2A1C1F', color: '#B08A4A', border: '1px solid #B08A4A40' }}>
          Ads
        </span>
      )}
    </div>
  )
}
