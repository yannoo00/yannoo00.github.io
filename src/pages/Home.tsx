import { Link, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Pagination, PostCards, Status } from '../components/PostList'
import { SITE } from '../config'
import { countTerms, usePosts } from '../lib/data'
import { tagUrl } from '../lib/slug'
import type { PostMeta } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const PANEL_TAGS = 15

export function TagPanel({ posts }: { posts: PostMeta[] }) {
  const tags = countTerms(posts, 'tags')
    .sort((a, b) => b.count - a.count)
    .slice(0, PANEL_TAGS)
  if (!tags.length) return null
  return (
    <section>
      <h2 className="panel-heading">태그</h2>
      <div className="chips">
        {tags.map((tag) => (
          <Link key={tag.name} to={tagUrl(tag.name)} className="chip">
            {tag.name}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  useTitle()
  const posts = usePosts()
  const [params, setParams] = useSearchParams()

  if (posts.status !== 'ready') {
    return (
      <Page>
        <Status state={posts} />
      </Page>
    )
  }

  const total = Math.max(1, Math.ceil(posts.data.length / SITE.pageSize))
  const page = Math.min(total, Math.max(1, Number(params.get('page')) || 1))
  const visible = posts.data.slice((page - 1) * SITE.pageSize, page * SITE.pageSize)

  return (
    <Page panel={<TagPanel posts={posts.data} />}>
      {visible.length ? <PostCards posts={visible} /> : <p className="status">아직 글이 없습니다.</p>}
      <Pagination
        page={page}
        total={total}
        onChange={(next) => {
          setParams(next > 1 ? { page: String(next) } : {})
          window.scrollTo(0, 0)
        }}
      />
    </Page>
  )
}
