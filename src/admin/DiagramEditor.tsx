import { useEffect, useRef, useState } from 'react'

const ORIGIN = 'https://embed.diagrams.net'
/** proto=json: 메시지를 JSON으로 주고받는다. saveAndExit: 저장하면 바로 닫는 버튼을 쓴다. */
const EMBED_URL = `${ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&noSaveBtn=1&lang=ko`
const SVG_PREFIX = 'data:image/svg+xml;base64,'

interface Props {
  /** 고칠 다이어그램의 SVG. 새로 그릴 때는 null */
  source: string | null
  onSave: (svg: Blob) => void
  onClose: () => void
}

function toBase64(text: string) {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const fromBase64 = (data: string) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

/**
 * draw.io를 iframe으로 띄워 그린다. 그림은 이 브라우저와 iframe 사이에서만 오가고,
 * 도형 원본이 함께 담긴 SVG로 돌려받아 나중에 다시 열어 고칠 수 있다.
 */
export default function DiagramEditor({ source, onSave, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const handlers = useRef({ onSave, onClose })
  handlers.current = { onSave, onClose }

  useEffect(() => {
    const send = (message: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), ORIGIN)

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ORIGIN || e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return
      let message: { event?: string; data?: string }
      try {
        message = JSON.parse(e.data)
      } catch {
        return
      }
      switch (message.event) {
        case 'init':
          send({ action: 'load', autosave: 0, xml: source ? SVG_PREFIX + toBase64(source) : '' })
          break
        case 'load':
          setReady(true)
          break
        case 'save':
          // 저장 내용을 도형 원본이 담긴 SVG로 다시 달라고 한다
          send({ action: 'export', format: 'xmlsvg', spin: '저장하는 중…' })
          break
        case 'export':
          if (message.data?.startsWith(SVG_PREFIX)) {
            handlers.current.onSave(new Blob([fromBase64(message.data.slice(SVG_PREFIX.length))], { type: 'image/svg+xml' }))
          } else {
            setError('다이어그램을 저장하지 못했습니다.')
          }
          break
        case 'exit':
          handlers.current.onClose()
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [source])

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="다이어그램 편집">
      <div className="modal diagram-editor">
        <header>
          <h2>다이어그램</h2>
          {!ready && !error && <span className="hint">draw.io를 불러오는 중…</span>}
          {error && <span className="status error">{error}</span>}
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </header>
        <iframe ref={frame} src={EMBED_URL} title="draw.io" />
      </div>
    </div>
  )
}
