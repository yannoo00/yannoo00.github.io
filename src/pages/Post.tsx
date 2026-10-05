import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import Markdown from '../components/Markdown'
import { Status } from '../components/PostList'
import Toc from '../components/Toc'
import { useToken } from '../lib/auth'
import { loadPostBody, useAsync, usePosts } from '../lib/data'
import { categoryUrl, postUrl, tagUrl } from '../lib/slug'
import { useTitle } from '../lib/useTitle'
import NotFound from './NotFound'

export default function Post() {
  const slug = (useParams().slug ?? '').normalize('NFC')
  const posts = usePosts()
  const body = useAsync(() => loadPostBody(slug), slug)
  const token = useToken()
  const article = useRef<HTMLDivElement>(null)

  const index = posts.status === 'ready' ? posts.data.findIndex((p) => p.slug === slug) : -1
  const post = posts.status === 'ready' ? posts.data[index] : undefined
  useTitle(post?.title)

  if (posts.status !== 'ready') {
    return (
      <Page>
        <Status state={posts} />
      </Page>
    )
  }
  if (!post) return <NotFound />

  const newer = posts.data[index - 1]
  const older = posts.data[index + 1]

  return (
    <Page panel={<Toc container={article} />}>
      <article className="post">
        <header>
          <h1>{post.title}</h1>
          <div className="post-meta">
            <time dateTime={post.date}>{post.date}</time>
            {post.categories.map((name) => (
              <Link key={name} to={categoryUrl(name)}>
                {name}
              </Link>
            ))}
            {token && (
              <Link to={`/admin/edit/?path=${encodeURIComponent(post.path)}`} className="edit-link">
                편집
              </Link>
            )}
          </div>
        </header>

        <div className="content" ref={article}>
          {body.status === 'ready' ? <Markdown body={body.data} /> : <Status state={body} />}
        </div>

        {post.tags.length > 0 && (
          <div className="chips post-tags">
            {post.tags.map((name) => (
              <Link key={name} to={tagUrl(name)} className="chip">
                {name}
              </Link>
            ))}
          </div>
        )}

        <nav className="post-nav" aria-label="이전 글과 다음 글">
          {older ? (
            <Link to={postUrl(older.slug)}>
              <small>이전 글</small>
              <span>{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link to={postUrl(newer.slug)} className="next">
              <small>다음 글</small>
              <span>{newer.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </Page>
  )
}
