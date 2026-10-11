import { LanguageDescription, LanguageSupport, StreamLanguage, type StreamParser } from '@codemirror/language'
import { CrepeBuilder } from '@milkdown/crepe/builder'
import { blockEdit } from '@milkdown/crepe/feature/block-edit'
import { codeMirror } from '@milkdown/crepe/feature/code-mirror'
import { cursor } from '@milkdown/crepe/feature/cursor'
import { imageBlock } from '@milkdown/crepe/feature/image-block'
import { linkTooltip } from '@milkdown/crepe/feature/link-tooltip'
import { listItem } from '@milkdown/crepe/feature/list-item'
import { placeholder } from '@milkdown/crepe/feature/placeholder'
import { table } from '@milkdown/crepe/feature/table'
import { imageBlockSchema } from '@milkdown/kit/component/image-block'
import { commandsCtx, editorViewCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import { toggleStrikethroughCommand, insertTableCommand } from '@milkdown/kit/preset/gfm'
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  createCodeBlockCommand,
  htmlSchema,
  insertHrCommand,
  linkSchema,
  listItemSchema,
  wrapInBlockTypeCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'
import type { EditorView } from '@milkdown/kit/prose/view'
import { Plugin } from '@milkdown/kit/prose/state'
import { $prose, $remark, $view } from '@milkdown/kit/utils'
import DOMPurify from 'dompurify'
import { defaultHandlers } from 'mdast-util-to-markdown'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import {
  EMPTY_FORMAT,
  EMPTY_STYLE,
  isEmptyStyle,
  type EditorAction,
  type FormatState,
  type RichEditorHandle,
  type TextStyle,
} from './editorTypes'
import { remarkTextStyle, textStyleHandler, textStyleSchema } from './textStyle'
import '@milkdown/crepe/theme/common/prosemirror.css'
import '@milkdown/crepe/theme/common/reset.css'
import '@milkdown/crepe/theme/common/block-edit.css'
import '@milkdown/crepe/theme/common/code-mirror.css'
import '@milkdown/crepe/theme/common/cursor.css'
import '@milkdown/crepe/theme/common/image-block.css'
import '@milkdown/crepe/theme/common/link-tooltip.css'
import '@milkdown/crepe/theme/common/list-item.css'
import '@milkdown/crepe/theme/common/placeholder.css'
import '@milkdown/crepe/theme/common/table.css'
import '@milkdown/crepe/theme/frame.css'

export type { EditorAction, FormatState, RichEditorHandle } from './editorTypes'

export interface RichEditorProps {
  ref?: Ref<RichEditorHandle>
  /** 처음 띄울 때의 본문. 밖에서 본문을 바꿨다면 key를 바꿔 다시 띄운다. */
  initialValue: string
  onChange: (markdown: string) => void
  /** 붙여넣거나 끌어다 놓은 이미지를 받아 본문에 넣을 주소를 돌려준다. */
  onUploadImage: (file: File) => Promise<string>
  resolveImage: (src: string) => string
  /** '/' 메뉴에서 다이어그램을 골랐을 때 */
  onInsertDiagram: () => void
}

const diagramIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M3 3h8v6H8v2h8V9h-3V3h8v6h-3v4H8v2h3v6H3v-6h3v-4h0V9H3V3Zm2 2v2h4V5H5Zm10 0v2h4V5h-4ZM5 17v2h4v-2H5Z" />
  </svg>
`

const lang = (name: string, alias: string[], load: () => Promise<LanguageSupport>) =>
  LanguageDescription.of({ name, alias, load })
const legacy = (mode: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(mode))

/** 읽기 화면이 강조해 주는 언어에 맞춘 목록. 고를 때만 해당 언어를 내려받는다. */
const languages = [
  lang('C++', ['cpp', 'c', 'cc', 'h', 'hpp'], () => import('@codemirror/lang-cpp').then((m) => m.cpp())),
  lang('C#', ['cs', 'csharp'], () => import('@codemirror/legacy-modes/mode/clike').then((m) => legacy(m.csharp))),
  lang('Java', [], () => import('@codemirror/lang-java').then((m) => m.java())),
  lang('JavaScript', ['js', 'jsx'], () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true }))),
  lang('TypeScript', ['ts', 'tsx'], () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  ),
  lang('Python', ['py'], () => import('@codemirror/lang-python').then((m) => m.python())),
  lang('SQL', [], () => import('@codemirror/lang-sql').then((m) => m.sql())),
  lang('Go', ['golang'], () => import('@codemirror/lang-go').then((m) => m.go())),
  lang('Rust', ['rs'], () => import('@codemirror/lang-rust').then((m) => m.rust())),
  lang('JSON', [], () => import('@codemirror/lang-json').then((m) => m.json())),
  lang('HTML', ['xml'], () => import('@codemirror/lang-html').then((m) => m.html())),
  lang('CSS', [], () => import('@codemirror/lang-css').then((m) => m.css())),
  lang('YAML', ['yml'], () => import('@codemirror/lang-yaml').then((m) => m.yaml())),
  lang('Bash', ['sh', 'shell', 'zsh'], () => import('@codemirror/legacy-modes/mode/shell').then((m) => legacy(m.shell))),
]

interface MdNode {
  type: string
  value?: string
  title?: string | null
  alt?: string | null
  children?: MdNode[]
}

/**
 * 제목 없이 쓴 `![](주소)`는 title이 null로 읽히는데, 편집기가 이를 받아들이지 못해
 * 이미지를 통째로 빠뜨린다. 읽을 때 빈 문자열로 채워 둔다.
 */
function fillImageAttrs(node: MdNode) {
  if (node.type === 'image') {
    node.title ??= ''
    node.alt ??= ''
  }
  node.children?.forEach(fillImageAttrs)
}

const remarkImageAttrs = $remark('blogImageAttrs', () => () => fillImageAttrs as never)

const IMG_THEN_TEXT = /^(<img\b[^>]*>)[ \t]*\r?\n([\s\S]*\S[\s\S]*)$/i

/**
 * `<img …>` 바로 아랫줄에 글을 이어 쓰면 마크다운은 빈 줄이 나올 때까지를 HTML 한 덩어리로 읽어,
 * 편집기에서 그림도 글도 고칠 수 없는 글자 뭉치가 된다. 태그와 그 뒤의 글을 나눠 읽는다.
 */
const remarkSplitImageHtml = $remark('blogSplitImageHtml', () =>
  function (this: { parse: (text: string) => MdNode }) {
    // 편집기가 먼저 HTML 덩어리를 문단으로 한 번 감싸 두므로 그 안쪽도 본다
    const htmlOf = (node: MdNode) =>
      node.type === 'paragraph' && node.children?.length === 1 ? node.children[0] : node
    const split = (nodes: MdNode[]): MdNode[] =>
      nodes.flatMap((node) => {
        const html = htmlOf(node)
        const m = html.type === 'html' ? html.value?.match(IMG_THEN_TEXT) : null
        if (!m) return [node]
        const image = { type: 'paragraph', children: [{ type: 'html', value: m[1] }] }
        return [image, ...split(this.parse(m[2]).children ?? [])]
      })
    return (tree: MdNode) => {
      tree.children = split(tree.children ?? [])
    }
  } as never,
)

/**
 * 그림이 들어 있는 HTML은 태그 글자 대신 그려서 보여 준다.
 * 화면에만 그렇게 보이고, 저장할 때는 적힌 HTML 그대로 나간다.
 */
const htmlImageView = (resolveImage: (src: string) => string) =>
  $view(htmlSchema.node, () => (node) => {
    const value = String(node.attrs.value)
    const dom = document.createElement('span')
    dom.dataset.type = 'html'
    dom.dataset.value = value

    if (!/<img\b/i.test(value)) {
      dom.textContent = value
      return { dom }
    }

    dom.className = 'html-image'
    dom.innerHTML = DOMPurify.sanitize(value)
    dom.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src')
      if (src) img.src = resolveImage(src)
    })
    return { dom }
  })

/** 커서 위치(또는 선택 영역 시작)의 서식을 읽는다. */
function readFormat(view: EditorView): FormatState {
  const { state } = view
  const { $from, empty } = state.selection
  const marks = empty ? (state.storedMarks ?? $from.marks()) : ($from.nodeAfter?.marks ?? $from.marks())
  const has = (name: string) => marks.some((m) => m.type.name === name)
  const style = marks.find((m) => m.type.name === 'text_style')?.attrs as TextStyle | undefined

  let heading = 0
  let list: FormatState['list'] = null
  let quote = false
  let codeBlock = false
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === 'heading') heading = Number(node.attrs.level) || 0
    else if (node.type.name === 'code_block') codeBlock = true
    else if (node.type.name === 'blockquote') quote = true
    else if (!list && node.type.name === 'bullet_list') list = 'bullet'
    else if (!list && node.type.name === 'ordered_list') list = 'ordered'
  }

  return {
    ...EMPTY_STYLE,
    ...style,
    bold: has('strong'),
    italic: has('emphasis'),
    strike: has('strike_through'),
    code: has('inlineCode'),
    link: has('link'),
    heading,
    list,
    quote,
    codeBlock,
  }
}

/** 선택 영역(또는 앞으로 칠 글자)에 글꼴·크기·색·밑줄 값을 덮어쓴다. */
function applyTextStyle(ctx: Ctx, patch: Partial<TextStyle>) {
  const view = ctx.get(editorViewCtx)
  const type = textStyleSchema.type(ctx)
  const { state } = view
  const { from, to, empty, $from } = state.selection
  const merge = (marks: readonly { type: unknown; attrs: Record<string, unknown> }[]): TextStyle => {
    const current = marks.find((m) => m.type === type)
    return { ...EMPTY_STYLE, ...(current?.attrs as Partial<TextStyle> | undefined), ...patch }
  }

  const tr = state.tr
  if (empty) {
    const marks = state.storedMarks ?? $from.marks()
    const next = merge(marks)
    const rest = marks.filter((m) => m.type !== type)
    tr.setStoredMarks(isEmptyStyle(next) ? rest : [...rest, type.create(next)])
  } else {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return
      const start = Math.max(from, pos)
      const end = Math.min(to, pos + node.nodeSize)
      const next = merge(node.marks)
      tr.removeMark(start, end, type)
      if (!isEmptyStyle(next)) tr.addMark(start, end, type.create(next))
    })
  }
  view.dispatch(tr)
}

function runAction(ctx: Ctx, action: EditorAction) {
  const commands = ctx.get(commandsCtx)
  const view = ctx.get(editorViewCtx)
  switch (action.type) {
    case 'bold':
      return commands.call(toggleStrongCommand.key)
    case 'italic':
      return commands.call(toggleEmphasisCommand.key)
    case 'strike':
      return commands.call(toggleStrikethroughCommand.key)
    case 'code':
      return commands.call(toggleInlineCodeCommand.key)
    case 'quote':
      return commands.call(wrapInBlockquoteCommand.key)
    case 'hr':
      return commands.call(insertHrCommand.key)
    case 'codeBlock':
      return commands.call(createCodeBlockCommand.key)
    case 'table':
      return commands.call(insertTableCommand.key, { row: 3, col: 3 })
    case 'bulletList':
      return commands.call(wrapInBulletListCommand.key)
    case 'orderedList':
      return commands.call(wrapInOrderedListCommand.key)
    case 'taskList':
      return commands.call(wrapInBlockTypeCommand.key, { nodeType: listItemSchema.type(ctx), attrs: { checked: false } })
    case 'undo':
      return commands.call(undoCommand.key)
    case 'redo':
      return commands.call(redoCommand.key)
    case 'heading':
      return commands.call(wrapInHeadingCommand.key, action.level)
    case 'style':
      return applyTextStyle(ctx, action.patch)
    case 'link': {
      const { empty } = view.state.selection
      if (!empty) return commands.call(toggleLinkCommand.key, { href: action.href })
      return insertLinkText(ctx, action.href, action.href)
    }
    case 'insertLink':
      return insertLinkText(ctx, action.text, action.href)
  }
}

function insertLinkText(ctx: Ctx, text: string, href: string) {
  const view = ctx.get(editorViewCtx)
  const { schema } = view.state
  const link = linkSchema.type(ctx).create({ href })
  view.dispatch(view.state.tr.replaceSelectionWith(schema.text(text, [link]), false).scrollIntoView())
}

/** 글을 드래그해 선택했을 때 '/' 메뉴처럼 띄우는 블록 변환 목록 */
const SELECTION_MENU: { label: string; action: EditorAction }[] = [
  { label: '본문', action: { type: 'heading', level: 0 } },
  { label: '제목 1', action: { type: 'heading', level: 1 } },
  { label: '제목 2', action: { type: 'heading', level: 2 } },
  { label: '제목 3', action: { type: 'heading', level: 3 } },
  { label: '제목 4', action: { type: 'heading', level: 4 } },
  { label: '인용', action: { type: 'quote' } },
  { label: '글머리 기호 목록', action: { type: 'bulletList' } },
  { label: '번호 목록', action: { type: 'orderedList' } },
  { label: '할 일 목록', action: { type: 'taskList' } },
  { label: '코드', action: { type: 'codeBlock' } },
]

export default function RichEditorView({
  ref,
  initialValue,
  onChange,
  onUploadImage,
  resolveImage,
  onInsertDiagram,
}: RichEditorProps) {
  const root = useRef<HTMLDivElement>(null)
  const read = useRef<() => string>(() => initialValue)
  const insert = useRef<(url: string) => void>(() => {})
  const act = useRef<(action: EditorAction) => void>(() => {})
  const format = useRef<() => FormatState>(() => EMPTY_FORMAT)
  const listeners = useRef(new Set<() => void>())
  const shell = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const dragging = useRef(false)
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null)
  const syncMenuRef = useRef<() => void>(() => {})

  /** 글자가 선택돼 있으면 선택 영역 바로 아래에 메뉴 위치를 잡는다. */
  const syncMenu = () => {
    const view = viewRef.current
    const box = shell.current
    if (!view || !box || dragging.current) return
    const { selection } = view.state
    const inCode = selection.$from.parent.type.name === 'code_block'
    if (selection.empty || inCode || '$anchorCell' in selection || !view.hasFocus()) {
      setMenu(null)
      return
    }
    const end = view.coordsAtPos(selection.to)
    const rect = box.getBoundingClientRect()
    setMenu({ left: Math.max(0, Math.min(end.left - rect.left, rect.width - 200)), top: end.bottom - rect.top + 6 })
  }
  // 편집기는 한 번만 만들고, 그 안에서는 항상 최신 콜백을 부른다
  const callbacks = useRef({ onChange, onUploadImage, resolveImage, onInsertDiagram })
  callbacks.current = { onChange, onUploadImage, resolveImage, onInsertDiagram }

  syncMenuRef.current = syncMenu

  // 드래그하는 동안에는 메뉴를 띄우지 않고, 마우스를 놓을 때 한 번 판단한다
  useEffect(() => {
    const box = shell.current
    if (!box) return
    const down = (e: MouseEvent) => {
      if ((e.target as Element).closest('.selection-menu')) return
      dragging.current = true
      setMenu(null)
    }
    const up = () => {
      if (!dragging.current) return
      dragging.current = false
      setTimeout(() => syncMenuRef.current(), 0)
    }
    const blur = () => setTimeout(() => !box.contains(document.activeElement) && setMenu(null), 0)
    box.addEventListener('mousedown', down)
    document.addEventListener('mouseup', up)
    box.addEventListener('focusout', blur)
    return () => {
      box.removeEventListener('mousedown', down)
      document.removeEventListener('mouseup', up)
      box.removeEventListener('focusout', blur)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => read.current(),
      insertImage: (url) => insert.current(url),
      run: (action) => act.current(action),
      getFormat: () => format.current(),
      subscribe: (fn) => {
        listeners.current.add(fn)
        return () => void listeners.current.delete(fn)
      },
    }),
    [],
  )

  useEffect(() => {
    const upload = (file: File) => callbacks.current.onUploadImage(file)
    const crepe = new CrepeBuilder({ root: root.current, defaultValue: initialValue })
      .addFeature(codeMirror, { languages, searchPlaceholder: '언어 검색', noResultText: '결과 없음', copyText: '복사' })
      .addFeature(listItem)
      .addFeature(linkTooltip, { inputPlaceholder: '링크 주소' })
      .addFeature(cursor)
      .addFeature(imageBlock, {
        onUpload: upload,
        inlineOnUpload: upload,
        blockOnUpload: upload,
        proxyDomURL: (url) => callbacks.current.resolveImage(url),
        inlineUploadButton: '업로드',
        inlineUploadPlaceholderText: '또는 이미지 주소 붙여넣기',
        inlineConfirmButton: '확인',
        blockUploadButton: '이미지 올리기',
        blockUploadPlaceholderText: '또는 이미지 주소 붙여넣기',
        blockConfirmButton: '확인',
        blockCaptionPlaceholderText: '이미지 설명',
      })
      .addFeature(blockEdit, {
        textGroup: {
          label: '텍스트',
          text: { label: '본문' },
          h1: { label: '제목 1' },
          h2: { label: '제목 2' },
          h3: { label: '제목 3' },
          h4: { label: '제목 4' },
          h5: { label: '제목 5' },
          h6: { label: '제목 6' },
          quote: { label: '인용' },
          divider: { label: '구분선' },
        },
        listGroup: {
          label: '목록',
          bulletList: { label: '글머리 기호 목록' },
          orderedList: { label: '번호 목록' },
          taskList: { label: '할 일 목록' },
        },
        advancedGroup: {
          label: '삽입',
          image: { label: '이미지' },
          codeBlock: { label: '코드' },
          table: { label: '표' },
        },
        buildMenu: (builder) => {
          builder.getGroup('advanced').addItem('diagram', {
            label: '다이어그램 (draw.io)',
            icon: diagramIcon,
            onRun: (ctx) => {
              ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key)
              callbacks.current.onInsertDiagram()
            },
          })
        },
      })
      .addFeature(placeholder, { text: "글을 쓰거나 '/' 를 눌러 블록을 고르세요", mode: 'block' })
      .addFeature(table)

    crepe.editor
      .use(remarkImageAttrs)
      .use(remarkSplitImageHtml)
      .use(htmlImageView((src) => callbacks.current.resolveImage(src)))
      .use(remarkTextStyle)
      .use(textStyleSchema)
      .use(
        $prose(
          () =>
            new Plugin({
              view: (view) => {
                viewRef.current = view
                return {
                  update: () => {
                    listeners.current.forEach((fn) => fn())
                    syncMenuRef.current()
                  },
                }
              },
            }),
        ),
      )
      .config((ctx) => {
      ctx.update(remarkStringifyOptionsCtx, (prev) => ({
        ...prev,
        bullet: '-' as const,
        rule: '-' as const,
        handlers: {
          ...prev.handlers,
          textStyle: textStyleHandler as never,
          // 기존 글과 같이 줄 끝 공백 두 칸으로 줄바꿈을 적는다
          break: () => '  \n',
          // 편집기는 이미지 블록의 표시 배율을 alt 자리에 적는다(예: ![1.00]).
          // 읽기 화면에서는 쓰지 않는 값이라 alt로 새어 나가지 않게 지운다.
          image: (node, parent, state, info) =>
            defaultHandlers.image(/^\d+\.\d\d$/.test(node.alt ?? '') ? { ...node, alt: '' } : node, parent, state, info),
        },
      }))
    })

    let alive = true
    // 편집기를 거치면 글 전체가 편집기 표기법으로 다시 쓰인다.
    // 손대지 않은 글은 불러온 그대로 돌려주어 내용 없는 변경이 커밋되지 않게 한다.
    let baseline: string | null = null
    const current = () => {
      const markdown = crepe.getMarkdown()
      return markdown === baseline ? initialValue : markdown
    }

    crepe.on((listener) => {
      listener.markdownUpdated(() => {
        if (alive && baseline !== null) callbacks.current.onChange(current())
      })
    })

    const ready = crepe.create().then(() => {
      if (!alive) return
      baseline = crepe.getMarkdown()
      read.current = current
      act.current = (action) => {
        crepe.editor.action((ctx) => {
          runAction(ctx, action)
          ctx.get(editorViewCtx).focus()
        })
      }
      format.current = () => {
        let result = EMPTY_FORMAT
        crepe.editor.action((ctx) => {
          result = readFormat(ctx.get(editorViewCtx))
        })
        return result
      }
      listeners.current.forEach((fn) => fn())
      insert.current = (url) =>
        crepe.editor.action((ctx) => {
          ctx.get(commandsCtx).call(addBlockTypeCommand.key, { nodeType: imageBlockSchema.type(ctx), attrs: { src: url } })
        })
    })

    return () => {
      alive = false
      // 만들어지는 도중에 없애면 정리가 덜 되므로 다 만들어진 뒤에 없앤다
      void ready.then(() => crepe.destroy())
    }
    // 본문이 밖에서 바뀌면 부모가 key를 바꿔 새로 띄운다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={shell} className="rich-shell">
      <div ref={root} className="rich-editor" />
      {menu && (
        <ul className="selection-menu" style={{ left: menu.left, top: menu.top }} role="menu" aria-label="선택한 글 변환">
          {SELECTION_MENU.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                // 누르는 순간 선택이 풀리지 않도록 포커스를 옮기지 않는다
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  act.current(item.action)
                  setMenu(null)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
