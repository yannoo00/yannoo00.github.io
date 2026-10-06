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
import { toolbar } from '@milkdown/crepe/feature/toolbar'
import { imageBlockSchema } from '@milkdown/kit/component/image-block'
import { commandsCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { addBlockTypeCommand, clearTextInCurrentBlockCommand } from '@milkdown/kit/preset/commonmark'
import { $remark } from '@milkdown/kit/utils'
import { defaultHandlers } from 'mdast-util-to-markdown'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import '@milkdown/crepe/theme/common/prosemirror.css'
import '@milkdown/crepe/theme/common/reset.css'
import '@milkdown/crepe/theme/common/block-edit.css'
import '@milkdown/crepe/theme/common/code-mirror.css'
import '@milkdown/crepe/theme/common/cursor.css'
import '@milkdown/crepe/theme/common/image-block.css'
import '@milkdown/crepe/theme/common/link-tooltip.css'
import '@milkdown/crepe/theme/common/list-item.css'
import '@milkdown/crepe/theme/common/placeholder.css'
import '@milkdown/crepe/theme/common/toolbar.css'
import '@milkdown/crepe/theme/common/table.css'
import '@milkdown/crepe/theme/frame.css'

export interface RichEditorHandle {
  /** 입력 직후에도 빠진 글자 없이 지금 내용을 돌려준다. */
  getMarkdown: () => string
  /** 커서가 있는 곳 아래에 이미지를 넣는다. */
  insertImage: (url: string) => void
}

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
  // 편집기는 한 번만 만들고, 그 안에서는 항상 최신 콜백을 부른다
  const callbacks = useRef({ onChange, onUploadImage, resolveImage, onInsertDiagram })
  callbacks.current = { onChange, onUploadImage, resolveImage, onInsertDiagram }

  useImperativeHandle(
    ref,
    () => ({ getMarkdown: () => read.current(), insertImage: (url) => insert.current(url) }),
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
      .addFeature(toolbar)
      .addFeature(placeholder, { text: "글을 쓰거나 '/' 를 눌러 블록을 고르세요", mode: 'block' })
      .addFeature(table)

    crepe.editor.use(remarkImageAttrs).config((ctx) => {
      ctx.update(remarkStringifyOptionsCtx, (prev) => ({
        ...prev,
        bullet: '-' as const,
        rule: '-' as const,
        handlers: {
          ...prev.handlers,
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

  return <div ref={root} className="rich-editor" />
}
