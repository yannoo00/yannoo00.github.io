import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/** 카테고리를 검색해 고르는 드롭다운. 목록 맨 아래에서 새 카테고리를 만들 수 있다. */
export function CategoryPicker({
  value,
  options,
  onChange,
}: {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const key = query.trim().toLowerCase()
  const known = [...new Set([...options, ...value])]
  const visible = known.filter((name) => !key || name.toLowerCase().includes(key))
  const exists = known.some((name) => name.toLowerCase() === key)

  const pick = (name: string) => {
    if (!value.includes(name)) onChange([...value, name])
    setOpen(false)
    setQuery('')
    setCreating(false)
  }

  const create = () => {
    const name = query.trim()
    if (name) pick(name)
  }

  return (
    <div className="category-picker" ref={root}>
      <div className="category-chips">
        {value.map((name) => (
          <span key={name} className="chip">
            {name}
            <button type="button" aria-label={`${name} 카테고리 빼기`} onClick={() => onChange(value.filter((n) => n !== name))}>
              ×
            </button>
          </span>
        ))}
        <button type="button" className="category-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {value.length ? '카테고리 추가' : '카테고리 선택'} ▾
        </button>
      </div>

      {open && (
        <div className="dropdown">
          <input
            autoFocus
            type="search"
            value={query}
            placeholder={creating ? '새 카테고리 이름' : '카테고리 검색'}
            aria-label="카테고리 검색"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (creating || (!visible.length && key)) create()
                else if (visible.length === 1) pick(visible[0])
              }
              if (e.key === 'Escape') setOpen(false)
            }}
          />
          <ul role="listbox">
            {visible.map((name) => (
              <li key={name}>
                <button type="button" role="option" aria-selected={value.includes(name)} onClick={() => pick(name)}>
                  {name}
                  {value.includes(name) && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            ))}
            {!visible.length && <li className="empty">일치하는 카테고리가 없습니다</li>}
          </ul>
          <button
            type="button"
            className="dropdown-create"
            disabled={creating && (!key || exists)}
            onClick={() => (creating ? create() : setCreating(true))}
          >
            {creating ? (key && !exists ? `“${query.trim()}” 만들기` : '이름을 입력하세요') : '+ 새로 만들기'}
          </button>
        </div>
      )}
    </div>
  )
}

/** 쉼표나 스페이스바를 누르면 입력한 말이 태그로 묶인다. */
export function TagInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const commit = (text: string) => {
    const names = text.split(/[,\s]+/).map((s) => s.replace(/^#/, '').trim()).filter(Boolean)
    if (!names.length) return
    onChange([...new Set([...value, ...names])])
  }

  const onInput = (text: string) => {
    // 한글 조합 중에도 구분 글자가 들어온 뒤의 값으로 판단한다
    if (/[,\s]/.test(text)) {
      commit(text)
      setDraft('')
    } else {
      setDraft(text)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="tag-input">
      {value.map((name) => (
        <span key={name} className="chip">
          #{name}
          <button type="button" aria-label={`${name} 태그 빼기`} onClick={() => onChange(value.filter((n) => n !== name))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={value.length ? '' : '태그를 입력하고 쉼표나 스페이스바를 누르세요'}
        aria-label="태그"
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit(draft)
          setDraft('')
        }}
      />
    </div>
  )
}
