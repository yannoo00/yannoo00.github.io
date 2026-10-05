import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Status } from '../components/PostList'
import { REPO } from '../config'
import { setToken, useToken } from '../lib/auth'
import { usePosts } from '../lib/data'
import { commitFiles, verifyToken } from '../lib/github'
import { postUrl } from '../lib/slug'
import type { PostMeta } from '../lib/types'
import { useTitle } from '../lib/useTitle'

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

function Login() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const token = value.trim()
    if (!token) return
    setChecking(true)
    setError('')
    try {
      await verifyToken(token)
      setToken(token)
    } catch (err) {
      setError(errorText(err))
      setChecking(false)
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1 className="page-title">관리자 로그인</h1>
      <p>
        GitHub 개인 액세스 토큰으로 로그인합니다. 토큰은 이 브라우저에만 저장되고, 글을 올릴 때 GitHub로만 전송됩니다.
      </p>
      <ol>
        <li>
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
            Fine-grained 토큰 만들기
          </a>
          를 엽니다.
        </li>
        <li>
          Repository access에서 <code>{REPO.owner}/{REPO.name}</code>만 고릅니다.
        </li>
        <li>
          Permissions에서 <code>Contents</code>를 <code>Read and write</code>로 설정합니다.
        </li>
      </ol>
      <input
        type="password"
        value={value}
        autoComplete="off"
        placeholder="github_pat_…"
        aria-label="GitHub 토큰"
        onChange={(e) => setValue(e.target.value)}
      />
      {error && <p className="notice error">{error}</p>}
      <button type="submit" className="primary" disabled={checking || !value.trim()}>
        {checking ? '확인 중…' : '로그인'}
      </button>
    </form>
  )
}

function PostTable({ posts }: { posts: PostMeta[] }) {
  const [filter, setFilter] = useState('')
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const key = filter.trim().toLowerCase()
  const visible = posts.filter(
    (p) => !deleted.has(p.slug) && (!key || `${p.title} ${p.categories.join(' ')} ${p.tags.join(' ')}`.toLowerCase().includes(key)),
  )

  const remove = async (post: PostMeta) => {
    if (!window.confirm(`"${post.title}" 글을 삭제할까요?\n리포지토리에서 파일이 지워집니다.`)) return
    setBusy(post.slug)
    setError('')
    try {
      await commitFiles(`Delete: ${post.title}`, [{ path: post.path, content: null }])
      setDeleted((prev) => new Set(prev).add(post.slug))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <input
        type="search"
        className="admin-filter"
        value={filter}
        placeholder="제목, 카테고리, 태그로 찾기"
        aria-label="글 찾기"
        onChange={(e) => setFilter(e.target.value)}
      />
      {error && <p className="notice error">{error}</p>}
      <p className="hint">
        {visible.length}개 · 방금 발행하거나 삭제한 글은 배포가 끝난 뒤(1~2분) 이 목록에 반영됩니다.
      </p>
      <ul className="admin-posts">
        {visible.map((post) => (
          <li key={post.slug}>
            <time dateTime={post.date}>{post.date}</time>
            <Link to={postUrl(post.slug)} className="title">
              {post.title}
            </Link>
            <Link to={`/admin/edit/?path=${encodeURIComponent(post.path)}`}>편집</Link>
            <button type="button" disabled={busy === post.slug} onClick={() => remove(post)}>
              {busy === post.slug ? '삭제 중…' : '삭제'}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Admin() {
  useTitle('Admin')
  const token = useToken()
  const posts = usePosts()

  if (!token) {
    return (
      <Page wide>
        <Login />
      </Page>
    )
  }

  return (
    <Page wide>
      <div className="admin">
        <div className="editor-bar">
          <h1 className="page-title">글 관리</h1>
          <span className="spacer" />
          <button type="button" onClick={() => setToken(null)}>
            로그아웃
          </button>
          <Link to="/admin/edit/" className="button primary">
            새 글 쓰기
          </Link>
        </div>
        {posts.status === 'ready' ? <PostTable posts={posts.data} /> : <Status state={posts} />}
      </div>
    </Page>
  )
}
