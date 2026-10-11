import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EMPTY_FORMAT, type EditorAction, type FormatState, type RichEditorHandle, type TextStyle } from './editorTypes'

interface Props {
  editor: RichEditorHandle | null
  busy: boolean
  onPickImages: (files: File[]) => void
  onPickFiles: (files: File[]) => void
  onDiagram: () => void
}

const FONTS: { label: string; value: string | null }[] = [
  { label: '기본서체', value: null },
  { label: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
  { label: '노토 산스', value: "'Noto Sans KR', sans-serif" },
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: '나눔손글씨', value: "'Nanum Pen Script', cursive" },
  { label: '고정폭', value: "'Nanum Gothic Coding', monospace" },
]

const SIZES = [12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40]

const COLORS = ['#000000', '#555555', '#999999', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#6741d9', '#c2255c', '#ffffff']

const HEADINGS = [
  { label: '본문', level: 0 },
  { label: '제목 1', level: 1 },
  { label: '제목 2', level: 2 },
  { label: '제목 3', level: 3 },
  { label: '제목 4', level: 4 },
]

const ICONS: Record<string, string> = {
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01',
  diagram: 'M4 4h6v5H4zM14 4h6v5h-6zM9 15h6v5H9zM7 9v3h10V9M12 12v3',
  quote: 'M5 7h5v5H7a2 2 0 0 0 2 3M14 7h5v5h-3a2 2 0 0 0 2 3',
  hr: 'M4 12h16',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M12 11v6M9 14h6',
  code: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14',
  bullet: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ordered: 'M10 6h10M10 12h10M10 18h10M4 5.5l1.5-1v4M4 11.5h3l-3 3h3M4 17h3v2H5',
  undo: 'M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12',
  redo: 'M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 12',
}

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

/** 누르는 순간 편집기의 선택 영역이 풀리지 않도록 포커스를 가져가지 않는 버튼 */
function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
  stacked,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  stacked?: boolean
}) {
  return (
    <button
      type="button"
      className={`tool${stacked ? ' stacked' : ''}${active ? ' active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
      {stacked && <span>{label}</span>}
    </button>
  )
}

export default function EditorToolbar({ editor, busy, onPickImages, onPickFiles, onDiagram }: Props) {
  const [format, setFormat] = useState<FormatState>(EMPTY_FORMAT)
  const [popover, setPopover] = useState<'color' | 'link' | null>(null)
  const [href, setHref] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return
    const sync = () => setFormat(editor.getFormat())
    sync()
    return editor.subscribe(sync)
  }, [editor])

  // 바깥을 누르면 열린 팝오버를 닫는다
  useEffect(() => {
    if (!popover) return
    const close = (e: MouseEvent) => {
      if (!bar.current?.querySelector('.popover-anchor')?.contains(e.target as Node)) setPopover(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [popover])

  const ready = !!editor && !format.codeBlock
  const run = (action: EditorAction) => editor?.run(action)
  const style = (patch: Partial<TextStyle>) => run({ type: 'style', patch })

  const submitLink = () => {
    const value = href.trim()
    if (value) run({ type: 'link', href: /^(https?:|mailto:|\/|#)/i.test(value) ? value : `https://${value}` })
    setHref('')
    setPopover(null)
  }

  const textColor = format.color ?? '#000000'

  return (
    <div className="editor-toolbar" ref={bar}>
      <div className="toolbar-row">
        <Tool stacked label="사진" disabled={!editor || busy} onClick={() => imageInput.current?.click()}>
          <Icon name="image" />
        </Tool>
        <Tool stacked label="다이어그램" disabled={!editor} onClick={onDiagram}>
          <Icon name="diagram" />
        </Tool>
        <Tool stacked label="인용구" active={format.quote} disabled={!ready} onClick={() => run({ type: 'quote' })}>
          <Icon name="quote" />
        </Tool>
        <Tool stacked label="구분선" disabled={!ready} onClick={() => run({ type: 'hr' })}>
          <Icon name="hr" />
        </Tool>
        <span className="popover-anchor">
          <Tool stacked label="링크" active={format.link || popover === 'link'} disabled={!ready} onClick={() => setPopover(popover === 'link' ? null : 'link')}>
            <Icon name="link" />
          </Tool>
          {popover === 'link' && (
            <form
              className="popover link-popover"
              onSubmit={(e) => {
                e.preventDefault()
                submitLink()
              }}
            >
              <input autoFocus value={href} placeholder="https://" aria-label="링크 주소" onChange={(e) => setHref(e.target.value)} />
              <button type="submit" className="primary">
                확인
              </button>
            </form>
          )}
        </span>
        <Tool stacked label="파일" disabled={!editor || busy} onClick={() => fileInput.current?.click()}>
          <Icon name="file" />
        </Tool>
        <Tool stacked label="소스코드" active={format.codeBlock} disabled={!editor} onClick={() => run({ type: 'codeBlock' })}>
          <Icon name="code" />
        </Tool>
        <Tool stacked label="표" disabled={!ready} onClick={() => run({ type: 'table' })}>
          <Icon name="table" />
        </Tool>
      </div>

      <div className="toolbar-row format-row">
        <select
          aria-label="문단 스타일"
          value={format.heading > 4 ? 4 : format.heading}
          disabled={!ready}
          onChange={(e) => run({ type: 'heading', level: Number(e.target.value) })}
        >
          {HEADINGS.map((h) => (
            <option key={h.level} value={h.level}>
              {h.label}
            </option>
          ))}
        </select>
        <select
          aria-label="글꼴"
          value={FONTS.find((f) => f.value === format.fontFamily)?.value ?? (format.fontFamily ? '__custom' : '')}
          disabled={!ready}
          onChange={(e) => run({ type: 'style', patch: { fontFamily: e.target.value || null } })}
        >
          {FONTS.map((f) => (
            <option key={f.label} value={f.value ?? ''}>
              {f.label}
            </option>
          ))}
          {format.fontFamily && !FONTS.some((f) => f.value === format.fontFamily) && <option value="__custom">사용자 지정</option>}
        </select>
        <select
          aria-label="글씨 크기"
          value={format.fontSize ?? ''}
          disabled={!ready}
          onChange={(e) => run({ type: 'style', patch: { fontSize: e.target.value || null } })}
        >
          <option value="">기본 크기</option>
          {SIZES.map((n) => (
            <option key={n} value={`${n}px`}>
              {n}
            </option>
          ))}
          {format.fontSize && !SIZES.some((n) => `${n}px` === format.fontSize) && <option value={format.fontSize}>{format.fontSize}</option>}
        </select>

        <span className="toolbar-sep" />
        <Tool label="굵게 (Ctrl+B)" active={format.bold} disabled={!ready} onClick={() => run({ type: 'bold' })}>
          <b>B</b>
        </Tool>
        <Tool label="기울임 (Ctrl+I)" active={format.italic} disabled={!ready} onClick={() => run({ type: 'italic' })}>
          <i>I</i>
        </Tool>
        <Tool label="밑줄" active={format.underline} disabled={!ready} onClick={() => run({ type: 'style', patch: { underline: !format.underline } })}>
          <u>U</u>
        </Tool>
        <Tool label="취소선" active={format.strike} disabled={!ready} onClick={() => run({ type: 'strike' })}>
          <s>S</s>
        </Tool>
        <Tool label="인라인 코드" active={format.code} disabled={!ready} onClick={() => run({ type: 'code' })}>
          <span className="mono">{'</>'}</span>
        </Tool>
        <span className="popover-anchor">
          <Tool label="글자 색" active={popover === 'color'} disabled={!ready} onClick={() => setPopover(popover === 'color' ? null : 'color')}>
            <span className="color-glyph" style={{ borderBottomColor: textColor }}>
              가
            </span>
          </Tool>
          {popover === 'color' && (
            <div className="popover color-popover">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="swatch"
                  style={{ background: c }}
                  aria-label={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    style({ color: c })
                    setPopover(null)
                  }}
                />
              ))}
              <button
                type="button"
                className="swatch-reset"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  style({ color: null })
                  setPopover(null)
                }}
              >
                기본색
              </button>
            </div>
          )}
        </span>

        <span className="toolbar-sep" />
        <Tool label="글머리 기호 목록" active={format.list === 'bullet'} disabled={!ready} onClick={() => run({ type: 'bulletList' })}>
          <Icon name="bullet" />
        </Tool>
        <Tool label="번호 목록" active={format.list === 'ordered'} disabled={!ready} onClick={() => run({ type: 'orderedList' })}>
          <Icon name="ordered" />
        </Tool>

        <span className="toolbar-sep" />
        <Tool label="실행 취소 (Ctrl+Z)" disabled={!editor} onClick={() => run({ type: 'undo' })}>
          <Icon name="undo" />
        </Tool>
        <Tool label="다시 실행 (Ctrl+Shift+Z)" disabled={!editor} onClick={() => run({ type: 'redo' })}>
          <Icon name="redo" />
        </Tool>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onPickImages([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onPickFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}
