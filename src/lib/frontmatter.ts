import { dump, load, JSON_SCHEMA } from 'js-yaml'

export type FrontMatter = Record<string, unknown>

export interface PostFields {
  title: string
  date: string
  categories: string[]
  tags: string[]
}

const FM_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/

export function parsePost(raw: string): { data: FrontMatter; body: string } {
  const m = raw.match(FM_RE)
  if (!m) return { data: {}, body: raw }
  let data: FrontMatter = {}
  try {
    const parsed = load(m[1], { schema: JSON_SCHEMA })
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as FrontMatter
  } catch {
    // YAML로 읽을 수 없는 front matter는 제목만이라도 건진다
    const title = m[1].match(/^title:\s*(.+)$/m)
    if (title) data = { title: title[1].trim().replace(/^["']|["']$/g, '') }
  }
  return { data, body: m[2].replace(/^\s*\n/, '') }
}

function toList(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.flatMap(toList)
  const text = String(value).trim()
  return text ? [text] : []
}

export function readFields(data: FrontMatter, fallback: { title: string; date: string }): PostFields {
  const rawDate = data.date == null ? '' : String(data.date).trim()
  const dateMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  return {
    title: data.title == null ? fallback.title : String(data.title).trim() || fallback.title,
    date: dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : fallback.date,
    categories: [...new Set(toList(data.categories))],
    tags: [...new Set(toList(data.tags))],
  }
}

export function serializePost(data: FrontMatter, body: string): string {
  const yaml = dump(data, { schema: JSON_SCHEMA, lineWidth: -1 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body.trim()}\n`
}

/** 목록·검색용으로 마크다운에서 본문 텍스트만 뽑는다. */
export function plainText(body: string): string {
  return body
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
