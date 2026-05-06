import { mediaToUserReel, accountToSnapshot } from '@/lib/instagram/transform'
import type { InstagramMedia, InstagramAccount } from '@/lib/schemas/instagram'

function makeMedia(overrides: Partial<InstagramMedia> = {}): InstagramMedia {
  return {
    id: 'media-id-1',
    media_type: 'IMAGE',
    permalink: 'https://www.instagram.com/p/CABC123/',
    timestamp: '2026-04-20T10:00:00+0000',
    ...overrides,
  } as InstagramMedia
}

describe('lib/instagram/transform.mediaToUserReel', () => {
  it('maps the happy-path IMAGE media', () => {
    const out = mediaToUserReel(
      makeMedia({
        id: '12345',
        caption: 'Hola mundo',
        media_url: 'https://cdn.ig/image.jpg',
        like_count: 42,
        comments_count: 7,
      }),
    )
    expect(out).toMatchObject({
      instagramId: '12345',
      shortcode: 'CABC123',
      url: 'https://www.instagram.com/p/CABC123/',
      thumbnailUrl: 'https://cdn.ig/image.jpg',
      videoUrl: null, // image, not video
      caption: 'Hola mundo',
      likesCount: 42,
      commentsCount: 7,
    })
    expect(out.publishedAt).toBeInstanceOf(Date)
  })

  it('treats VIDEO media_type as a video (videoUrl populated)', () => {
    const out = mediaToUserReel(
      makeMedia({
        media_type: 'VIDEO',
        media_url: 'https://cdn.ig/video.mp4',
        thumbnail_url: 'https://cdn.ig/thumb.jpg',
      }),
    )
    expect(out.videoUrl).toBe('https://cdn.ig/video.mp4')
    expect(out.thumbnailUrl).toBe('https://cdn.ig/thumb.jpg')
  })

  it('treats REELS media_type as a video', () => {
    const out = mediaToUserReel(
      makeMedia({ media_type: 'REELS', media_url: 'https://cdn.ig/reel.mp4' }),
    )
    expect(out.videoUrl).toBe('https://cdn.ig/reel.mp4')
  })

  it('falls back to media_url for thumbnail when thumbnail_url is absent', () => {
    const out = mediaToUserReel(
      makeMedia({ media_url: 'https://cdn.ig/image.jpg' }),
    )
    expect(out.thumbnailUrl).toBe('https://cdn.ig/image.jpg')
  })

  it('prefers provided shortcode over permalink parse', () => {
    const out = mediaToUserReel(
      makeMedia({
        shortcode: 'EXPLICIT',
        permalink: 'https://www.instagram.com/p/PARSED/',
      }),
    )
    expect(out.shortcode).toBe('EXPLICIT')
  })

  it('extracts shortcode from /reel/ permalink when shortcode missing', () => {
    const out = mediaToUserReel(
      makeMedia({ permalink: 'https://www.instagram.com/reel/REEL_SC/', shortcode: undefined }),
    )
    expect(out.shortcode).toBe('REEL_SC')
  })

  it('extracts shortcode from /tv/ permalink when shortcode missing', () => {
    const out = mediaToUserReel(
      makeMedia({ permalink: 'https://www.instagram.com/tv/TV_SC/', shortcode: undefined }),
    )
    expect(out.shortcode).toBe('TV_SC')
  })

  it('falls back to the media id when permalink is missing and no shortcode', () => {
    const out = mediaToUserReel(
      makeMedia({ id: '999', permalink: undefined, shortcode: undefined }),
    )
    expect(out.shortcode).toBe('999')
    expect(out.url).toBe('https://www.instagram.com/p/999/')
  })

  it('defaults numeric counts to 0 when absent', () => {
    const out = mediaToUserReel(makeMedia({ like_count: undefined, comments_count: undefined }))
    expect(out.likesCount).toBe(0)
    expect(out.commentsCount).toBe(0)
  })

  it('parses timestamp into a Date, or null when missing', () => {
    expect(mediaToUserReel(makeMedia({ timestamp: undefined })).publishedAt).toBeNull()
    const d = mediaToUserReel(makeMedia({ timestamp: '2026-01-15T12:34:56+0000' })).publishedAt
    expect(d).toBeInstanceOf(Date)
    expect((d as Date).toISOString()).toBe('2026-01-15T12:34:56.000Z')
  })
})

describe('lib/instagram/transform.accountToSnapshot', () => {
  it('maps followers and posts', () => {
    const out = accountToSnapshot({ followers_count: 1234, media_count: 56 } as InstagramAccount)
    expect(out).toEqual({ followers: 1234, posts: 56 })
  })

  it('defaults missing counts to 0', () => {
    const out = accountToSnapshot({} as InstagramAccount)
    expect(out).toEqual({ followers: 0, posts: 0 })
  })
})
