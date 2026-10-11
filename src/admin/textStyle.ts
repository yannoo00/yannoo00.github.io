import { $markSchema, $remark } from '@milkdown/kit/utils'
import type { Mark } from '@milkdown/kit/prose/model'
import { EMPTY_STYLE, isEmptyStyle, styleToCss, type TextStyle } from './editorTypes'

/** 글꼴·크기·색·밑줄 외의 선언이 섞여 있으면 null을 돌려주어 원래 HTML 그대로 두게 한다. */
export function cssToStyle(css: string): TextStyle | null {
  const style: TextStyle = { ...EMPTY_STYLE }
  for (const decl of css.split(';')) {
    if (!decl.trim()) continue
    const at = decl.indexOf(':')
    if (at < 0) return null
    const name = decl.slice(0, at).trim().toLowerCase()
    const value = decl.slice(at + 1).trim()
    if (!value) return null
    if (name === 'font-family') style.fontFamily = value
    else if (name === 'font-size') style.fontSize = value
    else if (name === 'color') style.color = value
    else if (name === 'text-decoration' && value === 'underline') style.underline = true
    else return null
  }
  return isEmptyStyle(style) ? null : style
}

interface MdNode {
  type: string
  value?: string
  style?: TextStyle
  children?: MdNode[]
}

const SPAN_OPEN = /^<span\s+style="([^"]*)"\s*>$/i
const SPAN_CLOSE = /^<\/span\s*>$/i

/**
 * `<span style="…">글</span>`은 마크다운에서 여는 태그, 글, 닫는 태그로 쪼개져 읽힌다.
 * 같은 줄 안에서 짝이 맞는 것만 하나의 `textStyle` 노드로 묶는다.
 */
function wrapSpans(nodes: MdNode[]): MdNode[] {
  const out: MdNode[] = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const style = node.type === 'html' && node.value ? cssToStyle(node.value.match(SPAN_OPEN)?.[1] ?? '') : null
    if (style) {
      let depth = 1
      let end = -1
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j]
        if (other.type !== 'html' || !other.value) continue
        if (/^<span\b[^>]*>$/i.test(other.value)) depth++
        else if (SPAN_CLOSE.test(other.value) && --depth === 0) {
          end = j
          break
        }
      }
      if (end > 0) {
        out.push({ type: 'textStyle', style, children: wrapSpans(nodes.slice(i + 1, end)) })
        i = end
        continue
      }
    }
    out.push(node)
  }
  return out
}

function visitNode(node: MdNode) {
  if (!node.children) return
  node.children.forEach(visitNode)
  node.children = wrapSpans(node.children)
}

export const remarkTextStyle = $remark('blogTextStyle', () => () => visitNode as never)

export const textStyleSchema = $markSchema('text_style', () => ({
  attrs: {
    fontFamily: { default: null },
    fontSize: { default: null },
    color: { default: null },
    underline: { default: false },
  },
  parseDOM: [
    {
      tag: 'span[style]',
      getAttrs: (dom) => {
        const style = cssToStyle((dom as HTMLElement).getAttribute('style') ?? '')
        return style ?? false
      },
    },
  ],
  toDOM: (mark) => ['span', { style: styleToCss(mark.attrs as TextStyle) }, 0],
  parseMarkdown: {
    match: (node) => node.type === 'textStyle',
    runner: (state, node, markType) => {
      state.openMark(markType, node.style as Record<string, unknown>)
      state.next(node.children)
      state.closeMark(markType)
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'text_style',
    runner: (state, mark: Mark) => {
      state.withMark(mark, 'textStyle', undefined, { style: mark.attrs })
    },
  },
}))

/** remark-stringify가 `textStyle` 노드를 span 태그로 적는 방법 */
export function textStyleHandler(
  node: { style?: TextStyle; children?: unknown[] },
  _parent: unknown,
  state: { containerPhrasing: (node: never, info: never) => string },
  info: Record<string, unknown>,
) {
  const inner = state.containerPhrasing(node as never, { ...info, before: '>', after: '<' } as never)
  const css = node.style ? styleToCss(node.style) : ''
  return css ? `<span style="${css}">${inner}</span>` : inner
}
