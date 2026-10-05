import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
import { Link, useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import Markdown from '../components/Markdown'
import { REPO } from '../config'
import { usePosts } from '../lib/data'
import { parsePost, readFields, serializePost, type FrontMatter } from '../lib/frontmatter'
import { actionsUrl, commitFiles, readBinaryFile, readTextFile, type FileChange } from '../lib/github'
import { canEdit, findImageUrls, newImageUrl, prepareUpload, repoPathForImage } from '../lib/image'
import { dateFromFilename, postUrl, slugFromFilename, slugify } from '../lib/slug'
import { useTitle } from '../lib/useTitle'
import ImageEditor from './ImageEditor'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const splitList = (text: string) => [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))]
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))
const isPostPath = (path: string) =>
  path.startsWith(`${REPO.postsDir}/`) && path.endsWith('.md') && !path.includes('..')

interface Saved {
  path: string
  slug: string
}

export default function Editor() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const path = params.get('path')
  const posts = usePosts()
  useTitle(path ? '글 편집' : '새 글')

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [categories, setCategories] = useState('')
  const [tags, setTags] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [original, setOriginal] = useState<FrontMatter>({})

  const [loading, setLoading] = useState(!!path)
  const [loadError, setLoadError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)

  /** 아직 커밋하지 않은 이미지 */
  const [pending, setPending] = useState<Map<string, Blob>>(new Map())
  /** 저장할 때 리포에서 지울 이미지 주소 */
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  /** 배포 전에도 미리보기가 보이도록 붙들어 두는 로컬 주소 */
  const [previews, setPreviews] = useState<Map<string, string>>(new Map())
  const [editing, setEditing] = useState<{ url: string; blob: Blob } | null>(null)
  const [busyImage, setBusyImage] = useState(false)

  const textarea = useRef<HTMLTextAreaElement>(null)
  // 방금 저장하면서 스스로 바꾼 주소는 다시 불러오지 않는다
  const loadedPath = useRef<string | null>(null)

  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }

  /** 다른 글로 넘어갈 때 입력값과 이미지 상태를 새로 채운다. */
  const fill = (data: FrontMatter, fields: { title: string; date: string; categories: string[]; tags: string[]; excerpt: string }, text: string) => {
    setOriginal(data)
    setTitle(fields.title)
    setDate(fields.date)
    setCategories(fields.categories.join(', '))
    setTags(fields.tags.join(', '))
    setExcerpt(fields.excerpt)
    setBody(text)
    setPending(new Map())
    setRemoved(new Set())
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url))
      return new Map()
    })
    setMessage(null)
    setSaved(null)
    markDirty(false)
  }

  useEffect(() => {
    if (path === loadedPath.current) return
    if (!path) {
      loadedPath.current = null
      fill({}, { title: '', date: today(), categories: [], tags: [], excerpt: '' }, '')
      setLoadError('')
      setLoading(false)
      return
    }
    if (!isPostPath(path)) {
      setLoadError('편집할 수 없는 경로입니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    readTextFile(path).then(
      (raw) => {
        if (cancelled) return
        const filename = path.split('/').pop() ?? ''
        const { data, body: text } = parsePost(raw)
        loadedPath.current = path
        fill(
          data,
          readFields(data, {
            title: slugFromFilename(filename).replace(/-/g, ' '),
            date: dateFromFilename(filename) ?? today(),
          }),
          text,
        )
        setLoading(false)
      },
      (err: unknown) => {
        if (cancelled) return
        setLoadError(errorText(err))
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // 사이트 안에서 다른 화면으로 갈 때도 쓰던 글을 잃지 않게 묻는다
  const blocker = useBlocker(useCallback(() => dirtyRef.current, []))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 변경이 있습니다. 이 화면을 떠날까요?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  // 화면을 떠날 때 미리보기 주소를 정리한다
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const edit = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    markDirty(true)
    setSaved(null)
  }

  const resolveImage = useCallback((src: string) => previews.get(src) ?? src, [previews])
  const images = useMemo(() => findImageUrls(body), [body])

  const insertAtCursor = (text: string) => {
    const el = textarea.current
    if (!el) return edit(setBody)(body + text)
    el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end')
    edit(setBody)(el.value)
  }

  const addImages = async (files: File[]) => {
    setBusyImage(true)
    setMessage(null)
    try {
      for (const file of files) {
        const blob = await prepareUpload(file)
        const url = newImageUrl(blob)
        setPending((prev) => new Map(prev).set(url, blob))
        setPreviews((prev) => new Map(prev).set(url, URL.createObjectURL(blob)))
        insertAtCursor(`![](${url})\n`)
      }
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
    } finally {
      setBusyImage(false)
    }
  }

  const imageFiles = (list: FileList | null | undefined) =>
    [...(list ?? [])].filter((file) => file.type.startsWith('image/'))

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imageFiles(e.clipboardData.files)
    if (!files.length) return
    e.preventDefault()
    void addImages(files)
  }

  const onDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    const files = imageFiles(e.dataTransfer.files)
    if (!files.length) return
    e.preventDefault()
    void addImages(files)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      insertAtCursor('  ')
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      void save()
    }
  }

  /** 본문에서 이미지를 빼고, 이미 올라간 파일이면 저장할 때 지우도록 표시한다. */
  const dropImage = (url: string) => {
    if (pending.has(url)) {
      setPending((prev) => {
        const next = new Map(prev)
        next.delete(url)
        return next
      })
    } else {
      setRemoved((prev) => new Set(prev).add(url))
    }
  }

  const removeImage = (url: string) => {
    if (!window.confirm('이 이미지를 글에서 빼고 삭제할까요?')) return
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const cleaned = body
      .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}[^)]*\\)\\n?`, 'g'), '')
      .replace(new RegExp(`<img[^>]*${escaped}[^>]*>\\n?`, 'g'), '')
    edit(setBody)(cleaned)
    dropImage(url)
  }

  const openImage = async (url: string) => {
    setBusyImage(true)
    setMessage(null)
    try {
      let blob = pending.get(url)
      if (!blob) {
        // 방금 커밋해서 아직 배포되지 않은 이미지는 사이트에 없으므로 리포에서 직접 받는다
        const res = await fetch(url).catch(() => null)
        blob =
          res?.ok && res.headers.get('content-type')?.startsWith('image/')
            ? await res.blob()
            : await readBinaryFile(repoPathForImage(url))
      }
      setEditing({ url, blob })
    } catch (err) {
      setMessage({ kind: 'error', text: `이미지를 불러오지 못했습니다. ${errorText(err)}` })
    } finally {
      setBusyImage(false)
    }
  }

  const replaceImage = (blob: Blob) => {
    if (!editing) return
    const url = newImageUrl(blob)
    dropImage(editing.url)
    setPending((prev) => new Map(prev).set(url, blob))
    setPreviews((prev) => new Map(prev).set(url, URL.createObjectURL(blob)))
    edit(setBody)(body.split(editing.url).join(url))
    setEditing(null)
  }

  const save = async () => {
    if (saving) return
    const cleanTitle = title.trim()
    if (!cleanTitle) return setMessage({ kind: 'error', text: '제목을 입력하세요.' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setMessage({ kind: 'error', text: '날짜를 YYYY-MM-DD 형식으로 입력하세요.' })

    let target = path
    if (!target) {
      const slug = slugify(cleanTitle)
      if (!slug) return setMessage({ kind: 'error', text: '제목에 글자나 숫자가 하나 이상 있어야 합니다.' })
      if (posts.status === 'ready' && posts.data.some((p) => p.slug === slug)) {
        return setMessage({ kind: 'error', text: `같은 주소(/posts/${slug}/)의 글이 이미 있습니다. 제목을 바꿔 주세요.` })
      }
      target = `${REPO.postsDir}/${date}-${slug}.md`
    }

    const data: FrontMatter = {
      ...original,
      title: cleanTitle,
      date,
      categories: splitList(categories),
      tags: splitList(tags),
    }
    // 비어 있는 요약은 적지 않는다. 목록에서는 본문 앞부분이 대신 쓰인다
    if (excerpt.trim()) data.excerpt = excerpt.trim()
    else delete data.excerpt
    if (path) data.last_modified_at = today()

    const used = new Set(findImageUrls(body))
    const changes: FileChange[] = [
      { path: target, content: serializePost(data, body) },
      ...[...pending].filter(([url]) => used.has(url)).map(([url, blob]) => ({ path: repoPathForImage(url), content: blob })),
      ...[...removed].filter((url) => !used.has(url)).map((url) => ({ path: repoPathForImage(url), content: null })),
    ]

    setSaving(true)
    setMessage(null)
    try {
      await commitFiles(`${path ? 'Update' : 'Create'}: ${cleanTitle}`, changes)
      setOriginal(data)
      setPending(new Map())
      setRemoved(new Set())
      markDirty(false)
      setSaved({ path: target, slug: slugFromFilename(target.split('/').pop() ?? '') })
      if (!path) {
        loadedPath.current = target
        navigate(`/admin/edit/?path=${encodeURIComponent(target)}`, { replace: true })
      }
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadError) {
    return (
      <Page wide>
        <p className={loadError ? 'status error' : 'status'}>{loadError || '글을 불러오는 중…'}</p>
        {loadError && <Link to="/admin/">관리 화면으로</Link>}
      </Page>
    )
  }

  return (
    <Page wide>
      <div className="editor">
        <div className="editor-bar">
          <Link to="/admin/">← 목록</Link>
          <span className="spacer" />
          {dirty && <span className="hint">저장하지 않은 변경이 있습니다</span>}
          <button type="button" className="primary" disabled={saving || busyImage} onClick={save}>
            {saving ? '커밋 중…' : path ? '수정 내용 발행' : '발행'}
          </button>
        </div>

        {message && <p className={`notice ${message.kind}`}>{message.text}</p>}
        {saved && (
          <p className="notice info">
            커밋했습니다. 1~2분 뒤 <Link to={postUrl(saved.slug)}>글 주소</Link>에 반영됩니다.{' '}
            <a href={actionsUrl} target="_blank" rel="noopener noreferrer">
              배포 진행 상황 보기
            </a>
          </p>
        )}

        <div className="editor-fields">
          <label className="field-title">
            <span>제목</span>
            <input value={title} onChange={(e) => edit(setTitle)(e.target.value)} placeholder="제목" />
          </label>
          <label>
            <span>날짜</span>
            <input type="date" value={date} onChange={(e) => edit(setDate)(e.target.value)} />
          </label>
          <label>
            <span>카테고리</span>
            <input value={categories} onChange={(e) => edit(setCategories)(e.target.value)} placeholder="Network" />
          </label>
          <label>
            <span>태그 (쉼표로 구분)</span>
            <input value={tags} onChange={(e) => edit(setTags)(e.target.value)} placeholder="TCP, 혼잡 제어" />
          </label>
          <label className="field-wide">
            <span>요약 (비우면 본문 앞부분을 씁니다)</span>
            <input value={excerpt} onChange={(e) => edit(setExcerpt)(e.target.value)} />
          </label>
        </div>

        <div className="editor-panes">
          <div className="editor-pane">
            <div className="pane-head">
              <span>마크다운</span>
              <label className="file-button">
                {busyImage ? '이미지 처리 중…' : '이미지 추가'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    void addImages(imageFiles(e.target.files))
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <textarea
              ref={textarea}
              value={body}
              spellCheck={false}
              placeholder="여기에 글을 쓰세요. 이미지는 붙여넣거나 끌어다 놓으면 됩니다."
              onChange={(e) => edit(setBody)(e.target.value)}
              onPaste={onPaste}
              onDrop={onDrop}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className="editor-pane">
            <div className="pane-head">
              <span>미리보기</span>
            </div>
            <div className="content preview">
              {title && <h1>{title}</h1>}
              <Markdown body={body} resolveImage={resolveImage} />
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <section className="editor-images">
            <h2 className="panel-heading">이 글의 이미지</h2>
            <ul>
              {images.map((url) => (
                <li key={url}>
                  <img src={resolveImage(url)} alt="" />
                  <div>
                    {pending.has(url) && <span className="hint">발행 전</span>}
                    {canEdit(url) && (
                      <button type="button" disabled={busyImage} onClick={() => openImage(url)}>
                        편집
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(url)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {editing && <ImageEditor source={editing.blob} onSave={replaceImage} onClose={() => setEditing(null)} />}
    </Page>
  )
}
