import { lazy, Suspense } from 'react'
import type { RichEditorProps } from './RichEditorView'

export type { RichEditorHandle } from './RichEditorView'

// 편집기는 크기가 커서 글을 쓸 때만 내려받는다
const RichEditorView = lazy(() => import('./RichEditorView'))

export default function RichEditor(props: RichEditorProps) {
  return (
    <Suspense fallback={<p className="status">편집기를 불러오는 중…</p>}>
      <RichEditorView {...props} />
    </Suspense>
  )
}
