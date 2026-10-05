import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import type { Element, Root } from 'hast'
import { toText } from 'hast-util-to-text'
import { createLowlight } from 'lowlight'
import { memo, useRef, useState, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

/** 블로그에서 실제로 쓰는 언어만 넣어 내려받는 크기를 줄인다. 목록에 없는 언어는 강조 없이 표시된다. */
const lowlight = createLowlight({ bash, c, cpp, csharp, css, diff, go, ini, java, javascript, json, python, rust, sql, typescript, xml, yaml })

/** 언어가 적힌 코드 블록에 강조용 요소를 입힌다. */
function rehypeHighlight() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (node.tagName !== 'code' || parent?.type !== 'element' || parent.tagName !== 'pre') return
      const classes = Array.isArray(node.properties.className) ? node.properties.className : []
      const language = classes.map(String).find((name) => name.startsWith('language-'))?.slice(9)
      if (!language || !lowlight.registered(language)) return
      node.children = lowlight.highlight(language, toText(node, { whitespace: 'pre' })).children as Element['children']
      node.properties.className = [...classes, 'hljs']
    })
  }
}

export interface MarkdownProps {
  body: string
  /** 아직 올리지 않은 이미지를 미리보기 주소로 바꿀 때 쓴다. */
  resolveImage?: (src: string) => string
}

function CodeBlock({ children, ...rest }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const className =
    children && typeof children === 'object' && 'props' in children
      ? String((children.props as { className?: string }).className ?? '')
      : ''
  const language = className.match(/language-(\S+)/)?.[1] ?? ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.textContent ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한이 없으면 아무 일도 하지 않는다
    }
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language}</span>
        <button type="button" onClick={copy}>
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre ref={ref} {...rest}>
        {children}
      </pre>
    </div>
  )
}

function MarkdownView({ body, resolveImage }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight]}
      components={{
        pre: ({ node: _node, ...props }) => <CodeBlock {...props} />,
        img: ({ node: _node, src, alt, ...props }) => (
          <img
            {...props}
            src={typeof src === 'string' && resolveImage ? resolveImage(src) : src}
            alt={alt ?? ''}
            loading="lazy"
          />
        ),
        a: ({ node: _node, href, children, ...props }) => {
          const external = /^https?:\/\//.test(href ?? '')
          return (
            <a
              {...props}
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {children}
            </a>
          )
        },
        table: ({ node: _node, ...props }) => (
          <div className="table-wrap">
            <table {...props} />
          </div>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  )
}

export default memo(MarkdownView)
