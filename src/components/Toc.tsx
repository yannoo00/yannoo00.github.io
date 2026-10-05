import { useEffect, useState, type RefObject } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

/** 본문이 그려진 뒤 제목을 모아 목차를 만들고, 스크롤 위치에 맞는 항목을 표시한다. */
export default function Toc({ container }: { container: RefObject<HTMLElement | null> }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const root = container.current
    if (!root) return
    let elements: HTMLElement[] = []

    const onScroll = () => {
      let current = ''
      for (const el of elements) {
        if (el.getBoundingClientRect().top > 100) break
        current = el.id
      }
      setActive(current)
    }
    const collect = () => {
      elements = [...root.querySelectorAll<HTMLElement>('h2[id], h3[id]')]
      setHeadings(
        elements.map((el) => ({ id: el.id, text: el.textContent ?? '', level: Number(el.tagName[1]) })),
      )
      onScroll()
    }

    collect()
    // 본문은 늦게 그려지므로 내용이 바뀔 때마다 제목을 다시 모은다
    const observer = new MutationObserver(collect)
    observer.observe(root, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [container])

  if (headings.length < 2) return null

  return (
    <nav className="toc" aria-label="목차">
      <h2 className="panel-heading">목차</h2>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`toc-level-${h.level}${h.id === active ? ' active' : ''}`}>
            <a href={`#${encodeURIComponent(h.id)}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
