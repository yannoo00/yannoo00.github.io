export interface PostMeta {
  slug: string
  title: string
  /** YYYY-MM-DD */
  date: string
  categories: string[]
  tags: string[]
  excerpt: string
  /** 리포 안의 원본 마크다운 경로 */
  path: string
}

export interface SearchEntry {
  slug: string
  text: string
}
