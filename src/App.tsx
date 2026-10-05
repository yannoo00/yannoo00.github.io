import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'
import Layout, { Page } from './components/Layout'
import { useToken } from './lib/auth'
import About from './pages/About'
import Archives from './pages/Archives'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Post from './pages/Post'
import Search from './pages/Search'
import { TermIndex, TermPosts } from './pages/Terms'

// 관리 화면은 글을 읽는 사람에게 필요 없으므로 따로 내려받는다
const Admin = lazy(() => import('./admin/Admin'))
const Editor = lazy(() => import('./admin/Editor'))

const loading = (
  <Page wide>
    <p className="status">불러오는 중…</p>
  </Page>
)

function RequireLogin({ children }: { children: ReactNode }) {
  return useToken() ? children : <Navigate to="/admin/" replace />
}

export const router = createBrowserRouter(
  createRoutesFromElements(
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="posts/:slug" element={<Post />} />
        <Route path="categories" element={<TermIndex field="categories" />} />
        <Route path="categories/:name" element={<TermPosts field="categories" />} />
        <Route path="tags" element={<TermIndex field="tags" />} />
        <Route path="tags/:name" element={<TermPosts field="tags" />} />
        <Route path="archives" element={<Archives />} />
        <Route path="about" element={<About />} />
        <Route path="search" element={<Search />} />
        <Route path="admin" element={<Suspense fallback={loading}><Admin /></Suspense>} />
        <Route
          path="admin/edit"
          element={
            <Suspense fallback={loading}>
              <RequireLogin>
                <Editor />
              </RequireLogin>
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>,
  ),
)
