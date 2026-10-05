import { useEffect, useState } from 'react'
import { looseKey } from './slug'
import type { PostMeta, SearchEntry } from './types'

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} 을(를) 불러오지 못했습니다 (HTTP ${res.status})`)
  return res
}

let postsPromise: Promise<PostMeta[]> | null = null
let searchPromise: Promise<SearchEntry[]> | null = null

export function loadPosts(): Promise<PostMeta[]> {
  postsPromise ??= fetchOk('/data/posts.json')
    .then((r) => r.json() as Promise<PostMeta[]>)
    .catch((err) => {
      postsPromise = null
      throw err
    })
  return postsPromise
}

export function loadSearchIndex(): Promise<SearchEntry[]> {
  searchPromise ??= fetchOk('/data/search.json')
    .then((r) => r.json() as Promise<SearchEntry[]>)
    .catch((err) => {
      searchPromise = null
      throw err
    })
  return searchPromise
}

export const loadPostBody = (slug: string) =>
  fetchOk(`/data/posts/${encodeURIComponent(slug)}.md`).then((r) => r.text())

export const loadAbout = () => fetchOk('/data/about.md').then((r) => r.text())

export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T }

/** key가 바뀔 때마다 load를 다시 실행한다. */
export function useAsync<T>(load: () => Promise<T>, key: string): Async<T> {
  const [state, setState] = useState<{ key: string; value: Async<T> }>({
    key,
    value: { status: 'loading' },
  })

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => !cancelled && setState({ key, value: { status: 'ready', data } }),
      (err: unknown) =>
        !cancelled &&
        setState({
          key,
          value: { status: 'error', error: err instanceof Error ? err.message : String(err) },
        }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state.key === key ? state.value : { status: 'loading' }
}

export const usePosts = () => useAsync(loadPosts, 'posts')

export interface Term {
  name: string
  count: number
}

/** 대소문자만 다른 이름은 하나로 합치고, 가장 많이 쓰인 표기를 대표로 삼는다. */
export function countTerms(posts: PostMeta[], field: 'categories' | 'tags'): Term[] {
  const groups = new Map<string, Map<string, number>>()
  for (const post of posts) {
    for (const name of post[field]) {
      const key = looseKey(name)
      const variants = groups.get(key) ?? new Map<string, number>()
      variants.set(name, (variants.get(name) ?? 0) + 1)
      groups.set(key, variants)
    }
  }
  return [...groups.values()]
    .map((variants) => {
      const entries = [...variants].sort((a, b) => b[1] - a[1])
      return { name: entries[0][0], count: entries.reduce((sum, [, n]) => sum + n, 0) }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

/** 주소의 이름과 대소문자·공백 차이를 무시하고 맞는 글을 고른다. */
export function postsWithTerm(posts: PostMeta[], field: 'categories' | 'tags', param: string) {
  const key = looseKey(param)
  const name = countTerms(posts, field).find((t) => looseKey(t.name) === key)?.name
  return {
    name: name ?? param,
    posts: posts.filter((p) => p[field].some((n) => looseKey(n) === key)),
  }
}
