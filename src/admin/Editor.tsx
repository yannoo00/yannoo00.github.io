import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { REPO } from '../config'
import { countTerms, usePosts } from '../lib/data'
import { parsePost, readFields, serializePost, type FrontMatter } from '../lib/frontmatter'
import { actionsUrl, commitFiles, readBinaryFile, readTextFile, type FileChange } from '../lib/github'
import {
  canEdit,
  findImageUrls,
  findUploadUrls,
  isDiagram,
  newDiagramUrl,
  newFileUrl,
  newImageUrl,
  prepareUpload,
  repoPathForImage,
} from '../lib/image'
import { dateFromFilename, postUrl, slugFromFilename, slugify } from '../lib/slug'
import { useTitle } from '../lib/useTitle'
import DiagramEditor from './DiagramEditor'
import ImageEditor from './ImageEditor'
import EditorToolbar from './EditorToolbar'
import { CategoryPicker, TagInput } from './MetaFields'
import RichEditor, { type RichEditorHandle } from './RichEditor'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))
const isPostPath = (path: string) =>
  path.startsWith(`${REPO.postsDir}/`) && path.endsWith('.md') && !path.includes('..')

const MAX_ATTACHMENT = 20 * 1024 * 1024

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
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
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
  /** 열려 있는 다이어그램 창. url이 null이면 새로 그리는 중이다 */
  const [diagram, setDiagram] = useState<{ url: string | null; source: string | null } | null>(null)
  const [busyImage, setBusyImage] = useState(false)

  /** 본문을 편집기 밖에서 바꿨을 때 올려서 편집기를 새 본문으로 다시 띄운다 */
  const [richKey, setRichKey] = useState(0)
  const rich = useRef<RichEditorHandle | null>(null)
  const [richHandle, setRichHandle] = useState<RichEditorHandle | null>(null)
  const attachRich = useCallback((handle: RichEditorHandle | null) => {
    rich.current = handle
    setRichHandle(handle)
  }, [])
  // 방금 저장하면서 스스로 바꾼 주소는 다시 불러오지 않는다
  const loadedPath = useRef<string | null>(null)

  const dirtyRef = useRef(false)
  const markDirty = (value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }

  /** 다른 글로 넘어갈 때 입력값과 이미지 상태를 새로 채운다. */
  const fill = (data: FrontMatter, fields: { title: string; date: string; categories: string[]; tags: string[] }, text: string) => {
    setOriginal(data)
    setTitle(fields.title)
    setDate(fields.date)
    setCategories(fields.categories)
    setTags(fields.tags)
    setBody(text)
    setRichKey((key) => key + 1)
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
      fill({}, { title: '', date: today(), categories: [], tags: [] }, '')
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
  // 편집기는 올리자마자 이미지를 그리므로 다음 렌더를 기다리지 않고 최신 주소를 읽는다
  const resolveLatestImage = useCallback((src: string) => previewsRef.current.get(src) ?? src, [])
  const images = useMemo(() => findImageUrls(body), [body])

  /** 편집기에 방금 친 내용까지 담긴 지금 본문 */
  const currentBody = () => rich.current?.getMarkdown() ?? body

  /** 이미지 목록처럼 편집기 밖에서 본문을 고친다. */
  const rewriteBody = (text: string) => {
    edit(setBody)(text)
    setRichKey((key) => key + 1)
  }

  const categoryOptions = useMemo(
    () => (posts.status === 'ready' ? countTerms(posts.data, 'categories').map((c) => c.name) : []),
    [posts],
  )

  /** 발행할 때 함께 커밋되도록 대기 목록에 넣고, 그 전에도 화면에 보이게 한다. */
  const stage = (url: string, blob: Blob) => {
    const preview = URL.createObjectURL(blob)
    previewsRef.current = new Map(previewsRef.current).set(url, preview)
    setPending((prev) => new Map(prev).set(url, blob))
    setPreviews((prev) => new Map(prev).set(url, preview))
  }

  /** 이미지를 올리기 좋게 바꿔 대기 목록에 넣고, 본문에 적을 주소를 돌려준다. */
  const stageImage = async (file: File) => {
    const blob = await prepareUpload(file)
    const url = newImageUrl(blob)
    stage(url, blob)
    return url
  }

  const addImages = async (files: File[]) => {
    if (!files.length) return
    setBusyImage(true)
    setMessage(null)
    try {
      for (const file of files) {
        const url = await stageImage(file)
        rich.current?.insertImage(url)
      }
      markDirty(true)
      setSaved(null)
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
    } finally {
      setBusyImage(false)
    }
  }

  /** 파일을 올릴 대기 목록에 넣고 본문에는 내려받는 링크를 적는다. */
  const addFiles = (files: File[]) => {
    setMessage(null)
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT) {
        setMessage({ kind: 'error', text: `"${file.name}"은(는) 20MB를 넘어 첨부할 수 없습니다.` })
        continue
      }
      const url = newFileUrl(file.name)
      stage(url, file)
      rich.current?.run({ type: 'insertLink', text: file.name, href: url })
      markDirty(true)
      setSaved(null)
    }
  }

  /** 편집기에 붙여넣거나 끌어다 놓은 이미지 */
  const uploadFromEditor = async (file: File) => {
    setBusyImage(true)
    setMessage(null)
    try {
      const url = await stageImage(file)
      markDirty(true)
      setSaved(null)
      return url
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) })
      throw err
    } finally {
      setBusyImage(false)
    }
  }

  const onSaveKey = (e: KeyboardEvent<HTMLElement>) => {
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
    const cleaned = currentBody()
      .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}[^)]*\\)\\n?`, 'g'), '')
      .replace(new RegExp(`<img[^>]*${escaped}[^>]*>\\n?`, 'g'), '')
    rewriteBody(cleaned)
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
      if (isDiagram(url)) setDiagram({ url, source: await blob.text() })
      else setEditing({ url, blob })
    } catch (err) {
      setMessage({ kind: 'error', text: `이미지를 불러오지 못했습니다. ${errorText(err)}` })
    } finally {
      setBusyImage(false)
    }
  }

  /** 고친 그림을 새 파일로 올리고 본문의 주소를 바꾼다. 옛 파일은 발행할 때 지워진다. */
  const swapImage = (oldUrl: string, url: string, blob: Blob) => {
    dropImage(oldUrl)
    stage(url, blob)
    rewriteBody(currentBody().split(oldUrl).join(url))
  }

  const replaceImage = (blob: Blob) => {
    if (!editing) return
    swapImage(editing.url, newImageUrl(blob), blob)
    setEditing(null)
  }

  const saveDiagram = (svg: Blob) => {
    if (!diagram) return
    const url = newDiagramUrl()
    if (diagram.url) {
      swapImage(diagram.url, url, svg)
    } else {
      stage(url, svg)
      rich.current?.insertImage(url)
      markDirty(true)
      setSaved(null)
    }
    setDiagram(null)
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
      categories,
      tags,
    }
    // 요약 입력은 없앴다. 예전 글에 남아 있는 값은 고칠 때 함께 지운다
    delete data.excerpt
    if (path) data.last_modified_at = today()

    const text = currentBody()
    const used = new Set(findUploadUrls(text))
    const changes: FileChange[] = [
      { path: target, content: serializePost(data, text) },
      ...[...pending].filter(([url]) => used.has(url)).map(([url, blob]) => ({ path: repoPathForImage(url), content: blob })),
      ...[...removed].filter((url) => !used.has(url)).map((url) => ({ path: repoPathForImage(url), content: null })),
    ]

    setSaving(true)
    setMessage(null)
    try {
      await commitFiles(`${path ? 'Update' : 'Create'}: ${cleanTitle}`, changes)
      setBody(text)
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
    <div className="editor-layer" onKeyDown={onSaveKey}>
      <header className="editor-top">
        <Link to="/admin/" className="back">
          ← 목록
        </Link>
        <span className="spacer" />
        {dirty && <span className="hint">저장하지 않은 변경이 있습니다</span>}
        <button type="button" className="primary" disabled={saving || busyImage} onClick={save}>
          {saving ? '커밋 중…' : path ? '수정 내용 발행' : '발행'}
        </button>
      </header>

      <EditorToolbar
        editor={richHandle}
        busy={busyImage}
        onPickImages={(files) => void addImages(files)}
        onPickFiles={addFiles}
        onDiagram={() => setDiagram({ url: null, source: null })}
      />

      <div className="editor-scroll">
        <div className="editor-paper">
          {message && <p className={`notice ${message.kind}`}>{message.text}</p>}
          {saved && (
            <p className="notice info">
              커밋했습니다. 1~2분 뒤 <Link to={postUrl(saved.slug)}>글 주소</Link>에 반영됩니다.{' '}
              <a href={actionsUrl} target="_blank" rel="noopener noreferrer">
                배포 진행 상황 보기
              </a>
            </p>
          )}

          <div className="editor-meta">
            <CategoryPicker value={categories} options={categoryOptions} onChange={edit(setCategories)} />
            <input
              type="date"
              className="date-input"
              aria-label="날짜"
              value={date}
              onChange={(e) => edit(setDate)(e.target.value)}
            />
          </div>

          <input
            className="editor-title"
            value={title}
            placeholder="제목"
            aria-label="제목"
            onChange={(e) => edit(setTitle)(e.target.value)}
          />

          <div className="editor-rich">
            <RichEditor
              key={richKey}
              ref={attachRich}
              initialValue={body}
              onChange={edit(setBody)}
              onUploadImage={uploadFromEditor}
              onInsertDiagram={() => setDiagram({ url: null, source: null })}
              resolveImage={resolveLatestImage}
            />
          </div>

          <TagInput value={tags} onChange={edit(setTags)} />

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
      </div>

      {editing && <ImageEditor source={editing.blob} onSave={replaceImage} onClose={() => setEditing(null)} />}
      {diagram && <DiagramEditor source={diagram.source} onSave={saveDiagram} onClose={() => setDiagram(null)} />}
    </div>
  )
}
