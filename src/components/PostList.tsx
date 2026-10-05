import { Link } from 'react-router-dom'
import { categoryUrl, postUrl } from '../lib/slug'
import type { PostMeta } from '../lib/types'

export function PostCards({ posts }: { posts: PostMeta[] }) {
  return (
    <div className="post-cards">
      {posts.map((post) => (
        <article key={post.slug} className="post-card">
          <Link to={postUrl(post.slug)} className="post-card-link">
            <h2>{post.title}</h2>
            {post.excerpt && <p>{post.excerpt}</p>}
          </Link>
          <div className="post-meta">
            <time dateTime={post.date}>{post.date}</time>
            {post.categories.map((name) => (
              <Link key={name} to={categoryUrl(name)}>
                {name}
              </Link>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

export function PostRows({ posts, showYear = true }: { posts: PostMeta[]; showYear?: boolean }) {
  return (
    <ul className="post-rows">
      {posts.map((post) => (
        <li key={post.slug}>
          <time dateTime={post.date}>{showYear ? post.date : post.date.slice(5)}</time>
          <Link to={postUrl(post.slug)}>{post.title}</Link>
        </li>
      ))}
    </ul>
  )
}

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null

  const pages: (number | null)[] = []
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - page) <= 2) pages.push(n)
    else if (pages[pages.length - 1] !== null) pages.push(null)
  }

  return (
    <nav className="pagination" aria-label="페이지">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">
        ‹
      </button>
      {pages.map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`}>…</span>
        ) : (
          <button
            key={n}
            type="button"
            className={n === page ? 'active' : ''}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" disabled={page >= total} onClick={() => onChange(page + 1)} aria-label="다음 페이지">
        ›
      </button>
    </nav>
  )
}

export function Status({ state }: { state: { status: 'loading' } | { status: 'error'; error: string } }) {
  return state.status === 'loading' ? (
    <p className="status">불러오는 중…</p>
  ) : (
    <p className="status error">{state.error}</p>
  )
}
