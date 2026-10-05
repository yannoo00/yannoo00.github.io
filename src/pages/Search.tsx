import { Link, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Status } from '../components/PostList'
import { loadPosts, loadSearchIndex, useAsync } from '../lib/data'
import { postUrl } from '../lib/slug'
import { useTitle } from '../lib/useTitle'

const MAX_RESULTS = 50
const SNIPPET_RADIUS = 60

function snippet(text: string, term: string): string {
  const at = text.indexOf(term)
  if (at < 0) return ''
  const start = Math.max(0, at - SNIPPET_RADIUS)
  const end = Math.min(text.length, at + term.length + SNIPPET_RADIUS)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export default function Search() {
  const [params] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  useTitle(query ? `검색: ${query}` : 'Search')

  const data = useAsync(async () => {
    const [posts, index] = await Promise.all([loadPosts(), loadSearchIndex()])
    const text = new Map(index.map((entry) => [entry.slug, entry.text]))
    return posts.map((post) => ({
      post,
      head: [post.title, ...post.categories, ...post.tags].join(' ').toLowerCase(),
      text: text.get(post.slug) ?? '',
    }))
  }, 'search')

  if (data.status !== 'ready') {
    return (
      <Page>
        <Status state={data} />
      </Page>
    )
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  // 제목·태그에 맞은 글을 본문에만 맞은 글보다 먼저 보여 준다
  const matches = terms.length
    ? data.data
        .filter((item) => terms.every((t) => item.head.includes(t) || item.text.includes(t)))
        .map((item) => ({ ...item, inHead: terms.every((t) => item.head.includes(t)) }))
        .sort((a, b) => Number(b.inHead) - Number(a.inHead))
    : []

  return (
    <Page>
      <h1 className="page-title">
        검색{query && `: ${query}`} {query && <span className="count">{matches.length}개</span>}
      </h1>
      {!query && <p className="status">위쪽 검색창에 찾을 말을 입력하고 Enter를 누르세요.</p>}
      {query && !matches.length && <p className="status">맞는 글이 없습니다.</p>}
      <ul className="search-results">
        {matches.slice(0, MAX_RESULTS).map(({ post, text }) => (
          <li key={post.slug}>
            <Link to={postUrl(post.slug)}>{post.title}</Link>
            <time dateTime={post.date}>{post.date}</time>
            <p>{snippet(text, terms[0]) || post.excerpt}</p>
          </li>
        ))}
      </ul>
      {matches.length > MAX_RESULTS && (
        <p className="status">처음 {MAX_RESULTS}개만 표시했습니다. 검색어를 더 구체적으로 입력해 보세요.</p>
      )}
    </Page>
  )
}
