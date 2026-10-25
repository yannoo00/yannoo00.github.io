import { useEffect, useRef, useState } from 'react'
import { BLOCK_GROUPS, type BlockKey } from './blockItems'

interface BlockMenuProps {
  left: number
  top: number
  /** 선택 영역 위쪽에 띄울 때. top이 메뉴의 아래 끝이 된다. */
  above?: boolean
  onPick: (key: BlockKey) => void
  onClose: () => void
}

const ITEMS = BLOCK_GROUPS.flatMap((g) => g.items)

/**
 * 블록 손잡이(::)를 누르거나 글을 선택했을 때 띄우는 메뉴.
 * '/' 메뉴와 똑같이 보이도록 Crepe 메뉴의 마크업과 클래스를 그대로 쓴다.
 */
export default function BlockMenu({ left, top, above, onPick, onClose }: BlockMenuProps) {
  const [hover, setHover] = useState(0)
  const hoverRef = useRef(0)
  hoverRef.current = hover
  const groupsRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  const closeRef = useRef(onClose)
  pickRef.current = onPick
  closeRef.current = onClose

  const scrollTo = (index: number) => {
    const box = groupsRef.current
    const target = box?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    if (box && target) box.scrollTop = target.offsetTop - box.offsetTop
  }

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      // 메뉴가 받은 키는 편집기까지 가지 않게 막는다
      const consume = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (e.key === 'Escape') {
        consume()
        closeRef.current()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        consume()
        const next = Math.max(0, Math.min(ITEMS.length - 1, hoverRef.current + (e.key === 'ArrowDown' ? 1 : -1)))
        setHover(next)
        scrollTo(next)
      } else if (e.key === 'Enter') {
        consume()
        pickRef.current(ITEMS[hoverRef.current].key)
      } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        closeRef.current()
      }
    }
    window.addEventListener('keydown', keydown, { capture: true })
    return () => window.removeEventListener('keydown', keydown, { capture: true })
  }, [])

  let index = 0
  const ranges = BLOCK_GROUPS.map((g) => {
    const start = index
    index += g.items.length
    return [start, index] as const
  })

  return (
    <div className={`milkdown block-menu-host${above ? ' above' : ''}`} style={{ left, top }}>
      {/* 누르는 순간 편집기의 선택이 풀리지 않도록 포커스를 옮기지 않는다 */}
      <div className="milkdown-slash-menu" data-show="true" onMouseDown={(e) => e.preventDefault()}>
        <nav className="tab-group">
          <ul>
            {BLOCK_GROUPS.map((group, g) => (
              <li
                key={group.key}
                className={hover >= ranges[g][0] && hover < ranges[g][1] ? 'selected' : ''}
                onClick={() => {
                  setHover(ranges[g][0])
                  scrollTo(ranges[g][0])
                }}
              >
                {group.label}
              </li>
            ))}
          </ul>
        </nav>
        <div className="menu-groups" ref={groupsRef}>
          {BLOCK_GROUPS.map((group, g) => (
            <div key={group.key} className="menu-group">
              <h6>{group.label}</h6>
              <ul role="menu" aria-label={group.label}>
                {group.items.map((item, i) => {
                  const at = ranges[g][0] + i
                  return (
                    <li
                      key={item.key}
                      role="menuitem"
                      data-index={at}
                      className={hover === at ? 'hover' : ''}
                      onMouseEnter={() => setHover(at)}
                      onClick={() => onPick(item.key)}
                    >
                      <span className="milkdown-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                      <span>{item.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
