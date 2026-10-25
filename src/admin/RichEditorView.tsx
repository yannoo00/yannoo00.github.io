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
import { toggleStrikethroughCommand, insertTableCommand, createTable } from '@milkdown/kit/preset/gfm'
import {
  addBlockTypeCommand,
  clearTextInCurrentBlockCommand,
  createCodeBlockCommand,
  headingKeymap,
  hrSchema,
  htmlSchema,
  insertHrCommand,
  linkSchema,
  listItemSchema,
  paragraphSchema,
  selectTextNearPosCommand,
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
import { NodeSelection, Plugin, Selection, TextSelection, type Command } from '@milkdown/kit/prose/state'
import { $prose, $remark, $shortcut, $view } from '@milkdown/kit/utils'
import DOMPurify from 'dompurify'
import { defaultHandlers } from 'mdast-util-to-markdown'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { CODE_LANGUAGES, languageLabel } from '../lib/codeLanguages'
import BlockMenu from './BlockMenu'
import { vscodeLight } from './codeTheme'
import { slashMenuConfig, type BlockKey } from './blockItems'
import { applyTableOp, getTableInfo, type TableInfo, type TableOp } from './tableEdit'
import TableToolbar from './TableToolbar'
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

const legacy = (mode: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(mode))

/** 언어별로 고를 때만 내려받는 문법. 이름과 별칭은 읽기 화면과 같은 목록을 쓴다. */
const loaders: Record<string, () => Promise<LanguageSupport>> = {
  C: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  'C++': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  'C#': () => import('@codemirror/legacy-modes/mode/clike').then((m) => legacy(m.csharp)),
  Java: () => import('@codemirror/lang-java').then((m) => m.java()),
  JavaScript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  TypeScript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  Python: () => import('@codemirror/lang-python').then((m) => m.python()),
  SQL: () => import('@codemirror/lang-sql').then((m) => m.sql()),
  Go: () => import('@codemirror/lang-go').then((m) => m.go()),
  Rust: () => import('@codemirror/lang-rust').then((m) => m.rust()),
  JSON: () => import('@codemirror/lang-json').then((m) => m.json()),
  HTML: () => import('@codemirror/lang-html').then((m) => m.html()),
  CSS: () => import('@codemirror/lang-css').then((m) => m.css()),
  YAML: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  Bash: () => import('@codemirror/legacy-modes/mode/shell').then((m) => legacy(m.shell)),
}

const languages = CODE_LANGUAGES.map(({ name, alias }) => LanguageDescription.of({ name, alias, load: loaders[name] }))

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

/** `cs`, `CS`처럼 적힌 코드 언어를 대표 이름(C#)으로 읽어 언어 선택 버튼과 강조가 맞게 한다. */
function normalizeCodeLang(node: MdNode & { lang?: string | null }) {
  if (node.type === 'code' && node.lang) node.lang = languageLabel(node.lang)
  node.children?.forEach(normalizeCodeLang)
}

const remarkCodeLang = $remark('blogCodeLang', () => () => normalizeCodeLang as never)

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

/** 블록 손잡이·글 선택 메뉴에서 바로 바꿀 수 있는 항목. 글은 그대로 두고 블록 종류만 바꾼다. */
const CONVERT: Partial<Record<BlockKey, EditorAction>> = {
  text: { type: 'heading', level: 0 },
  h1: { type: 'heading', level: 1 },
  h2: { type: 'heading', level: 2 },
  h3: { type: 'heading', level: 3 },
  quote: { type: 'quote' },
  bulletList: { type: 'bulletList' },
  orderedList: { type: 'orderedList' },
  taskList: { type: 'taskList' },
  code: { type: 'codeBlock' },
}

/** 메뉴에서 고른 항목을 실행한다. 구분선·이미지처럼 새로 넣는 블록은 선택한 블록 바로 아래에 넣는다. */
function runBlock(ctx: Ctx, key: BlockKey, insertDiagram: () => void) {
  const convert = CONVERT[key]
  if (convert) return runAction(ctx, convert)

  const commands = ctx.get(commandsCtx)
  const view = ctx.get(editorViewCtx)
  const { $to } = view.state.selection
  const pos = $to.depth > 0 ? $to.after(1) : $to.pos
  const tr = view.state.tr.insert(pos, paragraphSchema.type(ctx).create())
  view.dispatch(tr.setSelection(TextSelection.create(tr.doc, pos + 1)))

  switch (key) {
    case 'divider':
      return commands.call(addBlockTypeCommand.key, { nodeType: hrSchema.type(ctx) })
    case 'image':
      return commands.call(addBlockTypeCommand.key, { nodeType: imageBlockSchema.type(ctx) })
    case 'table':
      commands.call(addBlockTypeCommand.key, { nodeType: createTable(ctx, 3, 3) })
      return commands.call(selectTextNearPosCommand.key, { pos })
    case 'diagram':
      return insertDiagram()
  }
}

/**
 * 제목 맨 앞에서 Backspace를 누르면 한 단계씩 큰 제목으로 올라가지 않고 바로 본문이 된다.
 * 글자가 하나도 없는 제목은 그 자리에서 지우고 커서를 앞 블록 끝으로 옮긴다.
 */
const headingBackspace = $shortcut((ctx) => {
  const command: Command = (state, dispatch) => {
    const { $from, empty } = state.selection
    const node = $from.parent
    if (!empty || node.type.name !== 'heading' || $from.parentOffset !== 0) return false
    const start = $from.before()
    if (node.content.size === 0 && $from.depth === 1 && $from.index(0) > 0) {
      const tr = state.tr.delete(start, $from.after())
      dispatch?.(tr.setSelection(Selection.near(tr.doc.resolve(start), -1)).scrollIntoView())
      return true
    }
    dispatch?.(state.tr.setNodeMarkup(start, paragraphSchema.type(ctx)).scrollIntoView())
    return true
  }
  // 기본 제목 단축키(우선순위 50)보다 먼저 받는다
  return { HeadingBackspace: { key: 'Backspace', onRun: () => command, priority: 100 } }
})

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
  const pickBlock = useRef<(key: BlockKey) => void>(() => {})
  const runTable = useRef<(op: TableOp) => void>(() => {})
  const format = useRef<() => FormatState>(() => EMPTY_FORMAT)
  const listeners = useRef(new Set<() => void>())
  const shell = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const dragging = useRef(false)
  const [menu, setMenu] = useState<{ left: number; top: number; above: boolean } | null>(null)
  const [tableBar, setTableBar] = useState<{ info: TableInfo; left: number; top: number } | null>(null)
  const syncMenuRef = useRef<() => void>(() => {})

  /** 커서가 표 안에 있으면 표 바로 아래에 표 편집 도구를 놓는다. */
  const syncTable = () => {
    const view = viewRef.current
    const box = shell.current
    const info = view && box && view.hasFocus() ? getTableInfo(view.state) : null
    const dom = info && (view!.nodeDOM(info.pos) as HTMLElement | null)
    if (!info || !dom) {
      setTableBar(null)
      return
    }
    const target = dom.querySelector('table.children') ?? dom
    const rect = target.getBoundingClientRect()
    const base = box!.getBoundingClientRect()
    setTableBar({ info, left: Math.max(0, rect.left - base.left), top: rect.bottom - base.top + 6 })
  }

  /**
   * 글자를 선택했거나 블록 손잡이(::)를 눌러 블록이 선택되면 그 아래에 블록 메뉴를 띄운다.
   * 아래 공간이 모자라면 위로 띄운다.
   */
  const syncMenu = () => {
    syncTable()
    const view = viewRef.current
    const box = shell.current
    if (!view || !box || dragging.current) return
    const { selection } = view.state
    const inCode = selection.$from.parent.type.name === 'code_block'
    const blockNode = selection instanceof NodeSelection ? selection.node : null
    if (
      selection.empty ||
      inCode ||
      (blockNode && !blockNode.isTextblock) ||
      getTableInfo(view.state) ||
      !view.hasFocus()
    ) {
      setMenu(null)
      return
    }
    const rect = box.getBoundingClientRect()
    const dom = blockNode ? (view.nodeDOM(selection.from) as HTMLElement | null) : null
    const anchor = dom?.getBoundingClientRect() ?? {
      left: view.coordsAtPos(selection.to).left,
      top: view.coordsAtPos(selection.from).top,
      bottom: view.coordsAtPos(selection.to).bottom,
    }
    const MENU_HEIGHT = 320
    const MENU_WIDTH = 240
    const above = anchor.bottom + MENU_HEIGHT > window.innerHeight && anchor.top - MENU_HEIGHT > 0
    setMenu({
      left: Math.max(0, Math.min(anchor.left - rect.left, rect.width - MENU_WIDTH)),
      top: above ? anchor.top - rect.top - 6 : anchor.bottom - rect.top + 6,
      above,
    })
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
      if ((e.target as Element).closest('.block-menu-host, .table-toolbar')) return
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
      .addFeature(codeMirror, { languages, theme: vscodeLight, searchPlaceholder: '언어 검색', noResultText: '결과 없음', copyText: '복사' })
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
        ...slashMenuConfig,
        buildMenu: (builder) => {
          builder.getGroup('advanced').addItem('diagram', {
            label: slashMenuConfig.diagram.label,
            icon: slashMenuConfig.diagram.icon,
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
      .use(remarkCodeLang)
      .use(remarkSplitImageHtml)
      .use(htmlImageView((src) => callbacks.current.resolveImage(src)))
      .use(remarkTextStyle)
      .use(textStyleSchema)
      .use(headingBackspace)
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
      // 제목에서 Backspace·Delete를 누를 때 한 단계씩 큰 제목으로 올리던 기본 동작을 끈다
      ctx.update(headingKeymap.key, (prev) => ({ ...prev, DowngradeHeading: { ...prev.DowngradeHeading, shortcuts: [] } }))
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
      pickBlock.current = (key) => {
        crepe.editor.action((ctx) => {
          runBlock(ctx, key, () => callbacks.current.onInsertDiagram())
          ctx.get(editorViewCtx).focus()
        })
      }
      runTable.current = (op) => {
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const tr = applyTableOp(view.state, op)
          if (tr) view.dispatch(tr)
          view.focus()
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
        <BlockMenu
          left={menu.left}
          top={menu.top}
          above={menu.above}
          onPick={(key) => {
            setMenu(null)
            pickBlock.current(key)
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {tableBar && (
        <TableToolbar
          info={tableBar.info}
          left={tableBar.left}
          top={tableBar.top}
          onRun={(op) => runTable.current(op)}
        />
      )}
    </div>
  )
}
