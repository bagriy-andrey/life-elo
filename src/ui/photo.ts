export const PHOTO_MAX = 256
const QUALITY = 0.85

/** Fits (w, h) within a max x max box keeping the aspect ratio; never upscales. */
export function fitSize(w: number, h: number, max = PHOTO_MAX): { width: number; height: number } {
  const longest = Math.max(w, h)
  if (!(longest > 0)) return { width: 1, height: 1 }
  const k = Math.min(1, max / longest)
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

interface Decoded {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies EXIF orientation; width/height are then the displayed size.
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() }
    } catch {
      // fall through to <img> decoding (it also honors EXIF orientation by default)
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/** Resizes an image file to <=256 px (longest side) and returns a JPEG data URL. Rejects on non-images / decode errors. */
export async function resizeImage(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('not an image')
  const d = await decode(file)
  try {
    if (!(d.width > 0 && d.height > 0)) throw new Error('empty image')
    const { width, height } = fitSize(d.width, d.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#fff' // JPEG has no alpha
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(d.source, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    d.release()
  }
}
