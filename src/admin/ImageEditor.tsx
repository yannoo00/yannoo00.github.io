import { useEffect, useState } from 'react'
import ReactCrop, { type PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { crop as cropCanvas, decode, encode, flip, resize, rotate } from '../lib/image'

interface Props {
  source: Blob
  onSave: (blob: Blob) => void
  onClose: () => void
}

const hasArea = (c?: PercentCrop): c is PercentCrop => !!c && c.width > 0.5 && c.height > 0.5

export default function ImageEditor({ source, onSave, onClose }: Props) {
  const [original, setOriginal] = useState<HTMLCanvasElement | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState('')
  const [selection, setSelection] = useState<PercentCrop>()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockRatio, setLockRatio] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    decode(source).then(
      (decoded) => {
        if (cancelled) return
        setOriginal(decoded)
        setCanvas(decoded)
      },
      (err: Error) => !cancelled && setError(err.message),
    )
    return () => {
      cancelled = true
    }
  }, [source])

  // 작업본이 바뀔 때마다 화면에 보일 미리보기와 크기 입력값을 맞춘다
  useEffect(() => {
    if (!canvas) return
    setSelection(undefined)
    setWidth(canvas.width)
    setHeight(canvas.height)
    let url = ''
    let cancelled = false
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setPreview(url)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [canvas])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const applyCrop = (target: HTMLCanvasElement, area: PercentCrop) =>
    cropCanvas(target, {
      x: (area.x / 100) * target.width,
      y: (area.y / 100) * target.height,
      width: (area.width / 100) * target.width,
      height: (area.height / 100) * target.height,
    })

  const sizeChanged = !!canvas && width > 0 && height > 0 && (width !== canvas.width || height !== canvas.height)

  const changeWidth = (value: number) => {
    setWidth(value)
    if (lockRatio && canvas && value > 0) setHeight(Math.max(1, Math.round((value * canvas.height) / canvas.width)))
  }
  const changeHeight = (value: number) => {
    setHeight(value)
    if (lockRatio && canvas && value > 0) setWidth(Math.max(1, Math.round((value * canvas.width) / canvas.height)))
  }
  const scale = (ratio: number) => {
    if (!canvas) return
    setWidth(Math.max(1, Math.round(canvas.width * ratio)))
    setHeight(Math.max(1, Math.round(canvas.height * ratio)))
  }

  const save = async () => {
    if (!canvas) return
    setSaving(true)
    setError('')
    try {
      // 적용 버튼을 누르지 않고 남겨 둔 자르기 영역과 크기 값도 결과에 반영한다
      let result = canvas
      if (hasArea(selection)) result = applyCrop(result, selection)
      else if (sizeChanged) result = resize(result, width, height)
      onSave(await encode(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="이미지 편집">
      <div className="modal image-editor">
        <header>
          <h2>이미지 편집</h2>
          {canvas && (
            <span className="count">
              {canvas.width} × {canvas.height}px
            </span>
          )}
        </header>

        <div className="image-stage">
          {error && <p className="status error">{error}</p>}
          {!error && !preview && <p className="status">이미지를 여는 중…</p>}
          {preview && (
            <ReactCrop crop={selection} onChange={(_, percent) => setSelection(percent)} keepSelection={false}>
              <img src={preview} alt="편집 중인 이미지" />
            </ReactCrop>
          )}
        </div>

        {canvas && (
          <div className="image-tools">
            <div className="tool-group">
              <span className="tool-label">자르기</span>
              <button
                type="button"
                disabled={!hasArea(selection)}
                onClick={() => hasArea(selection) && setCanvas(applyCrop(canvas, selection))}
              >
                선택 영역으로 자르기
              </button>
              <span className="hint">이미지 위를 드래그해 영역을 고르세요.</span>
            </div>

            <div className="tool-group">
              <span className="tool-label">회전</span>
              <button type="button" onClick={() => setCanvas(rotate(canvas, 'left'))}>
                ↺ 왼쪽 90°
              </button>
              <button type="button" onClick={() => setCanvas(rotate(canvas, 'right'))}>
                ↻ 오른쪽 90°
              </button>
              <button type="button" onClick={() => setCanvas(flip(canvas))}>
                ⇋ 좌우 반전
              </button>
            </div>

            <div className="tool-group">
              <span className="tool-label">크기</span>
              <input
                type="number"
                min={1}
                value={width || ''}
                aria-label="너비(px)"
                onChange={(e) => changeWidth(Number(e.target.value))}
              />
              <span>×</span>
              <input
                type="number"
                min={1}
                value={height || ''}
                aria-label="높이(px)"
                onChange={(e) => changeHeight(Number(e.target.value))}
              />
              <label className="check">
                <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} />
                비율 유지
              </label>
              <button type="button" onClick={() => scale(0.75)}>
                75%
              </button>
              <button type="button" onClick={() => scale(0.5)}>
                50%
              </button>
              <button type="button" disabled={!sizeChanged} onClick={() => setCanvas(resize(canvas, width, height))}>
                크기 적용
              </button>
            </div>
          </div>
        )}

        <footer>
          <button type="button" disabled={!original || canvas === original} onClick={() => setCanvas(original)}>
            처음으로 되돌리기
          </button>
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={!canvas || saving} onClick={save}>
            {saving ? '저장 중…' : '편집 완료'}
          </button>
        </footer>
      </div>
    </div>
  )
}
