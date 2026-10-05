import { Page } from '../components/Layout'
import { PostRows, Status } from '../components/PostList'
import { usePosts } from '../lib/data'
import type { PostMeta } from '../lib/types'
import { useTitle } from '../lib/useTitle'
import { TagPanel } from './Home'

export default function Archives() {
  useTitle('Archives')
  const posts = usePosts()
  if (posts.status !== 'ready') {
    return (
      <Page>
        <Status state={posts} />
      </Page>
    )
  }

  const years = new Map<string, PostMeta[]>()
  for (const post of posts.data) {
    const year = post.date.slice(0, 4)
    years.set(year, [...(years.get(year) ?? []), post])
  }

  return (
    <Page panel={<TagPanel posts={posts.data} />}>
      <h1 className="page-title">Archives</h1>
      {[...years].map(([year, list]) => (
        <section key={year} className="archive-year">
          <h2>
            {year} <span className="count">{list.length}개</span>
          </h2>
          <PostRows posts={list} showYear={false} />
        </section>
      ))}
    </Page>
  )
}
