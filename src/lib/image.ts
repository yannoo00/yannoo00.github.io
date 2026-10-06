import { REPO } from '../config'

const MAX_UPLOAD_WIDTH = 1920
const QUALITY = 0.86
/** 다시 인코딩하면 움직임이나 벡터 정보가 사라지는 형식 */
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이 브라우저에서는 이미지를 편집할 수 없습니다.')
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

export async function decode(blob: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('이미지를 열 수 없습니다. 지원하지 않는 형식일 수 있습니다.')
  }
  const { canvas, ctx } = makeCanvas(bitmap.width, bitmap.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/** WebP로 저장하고, 브라우저가 WebP 인코딩을 못 하면 JPEG로 저장한다. */
export async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp')
  if (webp?.type === 'image/webp') return webp

  // JPEG에는 투명도가 없으므로 흰 바탕에 올린다
  const { canvas: flat, ctx } = makeCanvas(canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, flat.width, flat.height)
  ctx.drawImage(canvas, 0, 0)
  const jpeg = await toBlob(flat, 'image/jpeg')
  if (!jpeg) throw new Error('이미지를 저장할 수 없습니다.')
  return jpeg
}

export function rotate(source: HTMLCanvasElement, direction: 'left' | 'right'): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(source.height, source.width)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(((direction === 'right' ? 90 : -90) * Math.PI) / 180)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return canvas
}

export function flip(source: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(source.width, source.height)
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(source, 0, 0)
  return canvas
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function crop(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement {
  const x = Math.min(Math.max(0, Math.round(rect.x)), source.width - 1)
  const y = Math.min(Math.max(0, Math.round(rect.y)), source.height - 1)
  const width = Math.min(Math.round(rect.width), source.width - x)
  const height = Math.min(Math.round(rect.height), source.height - y)
  const { canvas, ctx } = makeCanvas(width, height)
  ctx.drawImage(source, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function resize(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** 붙여넣은 이미지를 올리기 좋은 크기와 형식으로 바꾼다. */
export async function prepareUpload(file: Blob): Promise<Blob> {
  if (KEEP_AS_IS.has(file.type)) return file
  let canvas = await decode(file)
  if (canvas.width > MAX_UPLOAD_WIDTH) {
    canvas = resize(canvas, MAX_UPLOAD_WIDTH, (canvas.height * MAX_UPLOAD_WIDTH) / canvas.width)
  }
  return encode(canvas)
}

/** draw.io로 그린 그림. SVG 안에 도형 원본이 들어 있어 다시 열어 고칠 수 있다. */
const DIAGRAM_EXT = 'drawio.svg'

export const isDiagram = (url: string) => url.toLowerCase().endsWith(`.${DIAGRAM_EXT}`)

export const canEdit = (url: string) => isDiagram(url) || !/\.(gif|svg)$/i.test(url)

/** 글 주소가 바뀌어도 깨지지 않도록 날짜와 임의 값으로 이름을 짓는다. */
function newUrl(ext: string): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const id = now.getTime().toString(36) + Math.random().toString(36).slice(2, 6)
  return `${REPO.imageUrlPrefix}/${now.getFullYear()}/${month}/${id}.${ext}`
}

export const newImageUrl = (blob: Blob) => newUrl(EXTENSIONS[blob.type] ?? 'png')

export const newDiagramUrl = () => newUrl(DIAGRAM_EXT)

export const repoPathForImage = (url: string) => REPO.publicDir + url

/** 본문에서 이 블로그에 올린 이미지 주소를 나온 순서대로 찾는다. */
export function findImageUrls(body: string): string[] {
  const escaped = REPO.imageUrlPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escaped}/[\\w./-]+\\.\\w+`, 'g')
  return [...new Set(body.match(pattern) ?? [])]
}
