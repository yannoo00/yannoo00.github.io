import { Link, useParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { PostRows, Status } from '../components/PostList'
import { countTerms, postsWithTerm, usePosts } from '../lib/data'
import { categoryUrl, tagUrl } from '../lib/slug'
import { useTitle } from '../lib/useTitle'
import { TagPanel } from './Home'

type Field = 'categories' | 'tags'

const LABEL: Record<Field, string> = { categories: 'Categories', tags: 'Tags' }
const urlFor: Record<Field, (name: string) => string> = { categories: categoryUrl, tags: tagUrl }

/** 카테고리 또는 태그 전체 목록 */
export function TermIndex({ field }: { field: Field }) {
  useTitle(LABEL[field])
  const posts = usePosts()
  if (posts.status !== 'ready') {
    return (
      <Page>
        <Status state={posts} />
      </Page>
    )
  }
  const terms = countTerms(posts.data, field)

  return (
    <Page panel={field === 'categories' ? <TagPanel posts={posts.data} /> : undefined}>
      <h1 className="page-title">{LABEL[field]}</h1>
      {field === 'categories' ? (
        <ul className="term-list">
          {terms.map((term) => (
            <li key={term.name}>
              <Link to={urlFor[field](term.name)}>{term.name}</Link>
              <span className="count">{term.count}개</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="chips">
          {terms.map((term) => (
            <Link key={term.name} to={urlFor[field](term.name)} className="chip">
              {term.name} <span className="count">{term.count}</span>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}

/** 한 카테고리 또는 태그에 속한 글 목록 */
export function TermPosts({ field }: { field: Field }) {
  const param = useParams().name ?? ''
  const posts = usePosts()
  const found = posts.status === 'ready' ? postsWithTerm(posts.data, field, param) : null
  useTitle(found?.name ?? param)

  if (posts.status !== 'ready' || !found) {
    return (
      <Page>
        <Status state={posts.status === 'ready' ? { status: 'loading' } : posts} />
      </Page>
    )
  }

  return (
    <Page panel={<TagPanel posts={posts.data} />}>
      <h1 className="page-title">
        {found.name} <span className="count">{found.posts.length}개</span>
      </h1>
      {found.posts.length ? (
        <PostRows posts={found.posts} />
      ) : (
        <p className="status">이 {field === 'categories' ? '카테고리' : '태그'}에 속한 글이 없습니다.</p>
      )}
    </Page>
  )
}
