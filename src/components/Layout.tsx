import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SITE } from '../config'
import { useToken } from '../lib/auth'
import { countTerms, usePosts } from '../lib/data'
import { categoryUrl } from '../lib/slug'

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const posts = usePosts()
  const token = useToken()
  const categories = posts.status === 'ready' ? countTerms(posts.data, 'categories') : []

  return (
    <aside id="sidebar" aria-label="사이드바">
      <header className="profile">
        <Link to="/" className="site-title" onClick={onNavigate}>
          {SITE.title}
        </Link>
        <p className="site-subtitle">{SITE.tagline}</p>
      </header>

      <nav>
        <ul>
          <li>
            <NavLink to="/" end onClick={onNavigate}>
              HOME
            </NavLink>
          </li>
          <li>
            <NavLink to="/categories/" end onClick={onNavigate} className="nav-heading">
              CATEGORIES
            </NavLink>
            <ul className="nav-sub">
              {categories.map((c) => (
                <li key={c.name}>
                  <NavLink to={categoryUrl(c.name)} onClick={onNavigate}>
                    <span>{c.name}</span>
                    <span className="count">({c.count})</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <NavLink to="/tags/" onClick={onNavigate}>
              TAGS
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-bottom">
        {token && (
          <Link to="/admin/edit/" onClick={onNavigate}>
            새 글
          </Link>
        )}
        <Link to="/admin/" onClick={onNavigate}>
          {token ? '관리' : 'Admin'}
        </Link>
      </div>
    </aside>
  )
}

const SECTIONS: Record<string, string> = {
  posts: 'Posts',
  categories: 'Categories',
  tags: 'Tags',
  archives: 'Archives',
  about: 'About',
  search: 'Search',
  admin: 'Admin',
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const onSearchPage = pathname.startsWith('/search')
  const [query, setQuery] = useState(onSearchPage ? (params.get('q') ?? '') : '')

  useEffect(() => {
    if (!onSearchPage) setQuery('')
  }, [onSearchPage])

  const section = SECTIONS[pathname.split('/')[1]]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) navigate(`/search/?q=${encodeURIComponent(q)}`)
  }

  return (
    <header id="topbar">
      <button type="button" className="menu-button" aria-label="메뉴 열기" onClick={onMenu}>
        ☰
      </button>
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/">Home</Link>
        {section && <span>{section}</span>}
      </nav>
      <form role="search" onSubmit={submit}>
        <input
          type="search"
          value={query}
          placeholder="검색"
          aria-label="글 검색"
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    </header>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const token = useToken()
  const [menuOpen, setMenuOpen] = useState(false)
  // 목록 화면에서만 바로 새 글을 시작할 수 있게 한다
  const showNewPost = !!token && !/^\/(admin\/edit|posts|about)/.test(pathname)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={menuOpen ? 'app menu-open' : 'app'}>
      <Sidebar onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="mask" onClick={() => setMenuOpen(false)} />}
      <div id="main-wrapper">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <Outlet />
        {showNewPost && (
          <Link to="/admin/edit/" className="fab" aria-label="새 글 쓰기" title="새 글 쓰기">
            +
          </Link>
        )}
        <footer id="footer">
          © {new Date().getFullYear()} {SITE.title}
        </footer>
      </div>
    </div>
  )
}

/** 본문과 오른쪽 패널을 나란히 놓는다. 패널은 넓은 화면에서만 보인다. */
export function Page({ children, panel, wide }: { children: ReactNode; panel?: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'page wide' : 'page'}>
      <main>{children}</main>
      {!wide && <aside className="panel">{panel}</aside>}
    </div>
  )
}
