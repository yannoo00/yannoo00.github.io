const DATE_PREFIX = /^(\d{4})-(\d{1,2})-(\d{1,2})-/

/** Jekyll의 `:title` 퍼머링크와 같은 규칙으로 파일명에서 슬러그를 만든다. */
export function slugFromFilename(filename: string): string {
  const name = filename.replace(/\.md$/i, '').replace(DATE_PREFIX, '')
  return slugify(name)
}

export function slugify(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._~!$&'()+,;=@]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function dateFromFilename(filename: string): string | null {
  const m = filename.match(DATE_PREFIX)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

/** 카테고리·태그 이름을 URL과 비교할 때 쓰는 느슨한 키 */
export function looseKey(text: string): string {
  return text.normalize('NFC').trim().toLowerCase().replace(/[\s/]+/g, '-')
}

/** 이름에 든 `/`는 경로 구분자로 읽히므로 주소에서는 `-`로 바꾼다. */
const termSegment = (name: string) => encodeURIComponent(name.trim().replace(/\/+/g, '-'))

export const postUrl = (slug: string) => `/posts/${encodeURIComponent(slug)}/`
export const categoryUrl = (name: string) => `/categories/${termSegment(name)}/`
export const tagUrl = (name: string) => `/tags/${termSegment(name)}/`
