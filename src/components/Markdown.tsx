import { lazy, Suspense } from 'react'
import type { MarkdownProps } from './MarkdownView'

// 마크다운 렌더러는 크기가 커서 글을 열 때만 내려받는다
const MarkdownView = lazy(() => import('./MarkdownView'))

export default function Markdown(props: MarkdownProps) {
  return (
    <Suspense fallback={<p className="status">불러오는 중…</p>}>
      <MarkdownView {...props} />
    </Suspense>
  )
}
