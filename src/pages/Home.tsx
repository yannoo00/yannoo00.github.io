import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Pagination, PostCards, Status } from '../components/PostList'
import { SITE } from '../config'
import { usePosts } from '../lib/data'
import { useTitle } from '../lib/useTitle'

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
    <Page>
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
