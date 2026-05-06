export const MAX_AVATAR_SIZE = 256 // px
export const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024 // 5 MB pre-resize

export async function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const ratio = Math.min(MAX_AVATAR_SIZE / width, MAX_AVATAR_SIZE / height, 1)
      const w = Math.round(width * ratio)
      const h = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas error')); return }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load error'))
    }
    img.src = url
  })
}
