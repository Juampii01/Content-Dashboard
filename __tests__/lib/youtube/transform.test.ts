import {
  parseIsoDurationToSeconds,
  formatDurationLabel,
  pickThumbnail,
  transformVideo,
} from '@/lib/youtube/transform'
import type { YTVideo } from '@/lib/schemas/youtube'

describe('lib/youtube/transform.parseIsoDurationToSeconds', () => {
  it.each([
    ['PT3S', 3],
    ['PT1M', 60],
    ['PT1H', 3600],
    ['PT1M30S', 90],
    ['PT1H2M3S', 3723],
    ['PT2H', 7200],
  ])('parses %s → %d', (iso, expected) => {
    expect(parseIsoDurationToSeconds(iso)).toBe(expected)
  })

  it.each([undefined, null, '', 'not-a-duration', 'P1D', 'PT'])(
    'returns 0 for invalid input: %p',
    (bad) => {
      expect(parseIsoDurationToSeconds(bad as string | null | undefined)).toBe(0)
    },
  )
})

describe('lib/youtube/transform.formatDurationLabel', () => {
  it.each([
    [0, '0:00'],
    [-5, '0:00'],
    [45, '0:45'],
    [90, '1:30'],
    [599, '9:59'],
    [3600, '1:00:00'],
    [3661, '1:01:01'],
    [7265, '2:01:05'],
  ])('formats %d seconds → %s', (sec, expected) => {
    expect(formatDurationLabel(sec)).toBe(expected)
  })
})

describe('lib/youtube/transform.pickThumbnail', () => {
  it('prefers maxres over all other sizes', () => {
    expect(
      pickThumbnail({
        maxres: { url: 'max' },
        standard: { url: 'std' },
        high: { url: 'hi' },
        medium: { url: 'med' },
        default: { url: 'def' },
      }),
    ).toBe('max')
  })

  it('falls through: standard → high → medium → default', () => {
    expect(pickThumbnail({ standard: { url: 'std' }, default: { url: 'def' } })).toBe('std')
    expect(pickThumbnail({ high: { url: 'hi' }, default: { url: 'def' } })).toBe('hi')
    expect(pickThumbnail({ medium: { url: 'med' }, default: { url: 'def' } })).toBe('med')
    expect(pickThumbnail({ default: { url: 'def' } })).toBe('def')
  })

  it('returns null when no sizes present', () => {
    expect(pickThumbnail({})).toBeNull()
    expect(pickThumbnail(undefined)).toBeNull()
  })
})

function makeVideo(overrides: Partial<YTVideo> = {}): YTVideo {
  return {
    id: 'vid-1',
    snippet: {
      title: 'Video Title',
      description: 'desc',
      channelId: 'ch-1',
      publishedAt: '2026-04-01T10:00:00Z',
      thumbnails: { high: { url: 'https://i.ytimg.com/hi.jpg' } },
    },
    statistics: {
      viewCount: '1000',
      likeCount: '50',
      commentCount: '10',
      favoriteCount: '0',
    },
    contentDetails: { duration: 'PT1M30S' },
    ...overrides,
  } as YTVideo
}

describe('lib/youtube/transform.transformVideo', () => {
  it('maps a full happy-path video', () => {
    const out = transformVideo(makeVideo({ id: 'ABC123' }))
    expect(out).toMatchObject({
      videoId: 'ABC123',
      channelId: 'ch-1',
      title: 'Video Title',
      description: 'desc',
      thumbnailUrl: 'https://i.ytimg.com/hi.jpg',
      url: 'https://www.youtube.com/watch?v=ABC123',
      durationSec: 90,
      durationLabel: '1:30',
      viewsCount: 1000,
      likesCount: 50,
      commentsCount: 10,
      favoriteCount: 0,
    })
    expect(out.publishedAt).toBeInstanceOf(Date)
  })

  it('defaults missing title to "(sin título)"', () => {
    const out = transformVideo(
      makeVideo({ snippet: { channelId: 'c', thumbnails: {} } } as unknown as YTVideo['snippet'] extends never
        ? never
        : Partial<YTVideo>),
    )
    expect(out.title).toBe('(sin título)')
  })

  it('handles string-numeric statistics robustly', () => {
    const out = transformVideo(
      makeVideo({
        statistics: { viewCount: '42', likeCount: '', commentCount: 'abc', favoriteCount: '9' },
      } as unknown as Partial<YTVideo>),
    )
    expect(out.viewsCount).toBe(42)
    expect(out.likesCount).toBe(0) // empty string → 0
    expect(out.commentsCount).toBe(0) // NaN parseInt → 0
    expect(out.favoriteCount).toBe(9)
  })

  it('returns publishedAt null when snippet.publishedAt missing', () => {
    const out = transformVideo(
      makeVideo({
        snippet: { channelId: 'c', thumbnails: {}, title: 't', description: '' },
      } as unknown as Partial<YTVideo>),
    )
    expect(out.publishedAt).toBeNull()
  })

  it('channelId defaults to empty string when snippet missing', () => {
    const out = transformVideo({ id: 'X', contentDetails: {}, statistics: {} } as unknown as YTVideo)
    expect(out.channelId).toBe('')
    expect(out.durationSec).toBe(0)
    expect(out.durationLabel).toBe('0:00')
  })
})
