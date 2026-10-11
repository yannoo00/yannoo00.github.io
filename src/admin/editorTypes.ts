/** 편집기와 도구 모음이 함께 쓰는 값. 편집기 본체를 불러오지 않고도 가져다 쓸 수 있도록 따로 둔다. */

/**
 * 글꼴·글씨 크기·글자 색·밑줄은 마크다운에 표기법이 없어 `<span style="…">`로 적는다.
 * 읽기 화면은 원본 HTML을 그대로 그리므로 별도 처리 없이 같은 모양으로 보인다.
 */
export interface TextStyle {
  fontFamily: string | null
  fontSize: string | null
  color: string | null
  underline: boolean
}

export const EMPTY_STYLE: TextStyle = { fontFamily: null, fontSize: null, color: null, underline: false }

export const isEmptyStyle = (s: TextStyle) => !s.fontFamily && !s.fontSize && !s.color && !s.underline

/** 스타일 값을 style 속성 문자열로 만든다. 큰따옴표 속성 안이므로 글꼴 이름은 작은따옴표로 감싼다. */
export function styleToCss(s: TextStyle): string {
  const parts: string[] = []
  if (s.fontFamily) parts.push(`font-family:${s.fontFamily.replace(/"/g, "'")}`)
  if (s.fontSize) parts.push(`font-size:${s.fontSize}`)
  if (s.color) parts.push(`color:${s.color}`)
  if (s.underline) parts.push('text-decoration:underline')
  return parts.join(';')
}

/** 고정 도구 모음이 지금 커서 위치에서 보여 줄 상태 */
export interface FormatState extends TextStyle {
  bold: boolean
  italic: boolean
  strike: boolean
  code: boolean
  link: boolean
  /** 0이면 본문 */
  heading: number
  list: 'bullet' | 'ordered' | null
  quote: boolean
  codeBlock: boolean
}

export type EditorAction =
  | { type: 'bold' | 'italic' | 'strike' | 'code' | 'quote' | 'hr' | 'codeBlock' | 'table' | 'bulletList' | 'orderedList' | 'taskList' | 'undo' | 'redo' }
  | { type: 'heading'; level: number }
  | { type: 'style'; patch: Partial<TextStyle> }
  | { type: 'link'; href: string }
  | { type: 'insertLink'; text: string; href: string }

export interface RichEditorHandle {
  /** 입력 직후에도 빠진 글자 없이 지금 내용을 돌려준다. */
  getMarkdown: () => string
  /** 커서가 있는 곳 아래에 이미지를 넣는다. */
  insertImage: (url: string) => void
  run: (action: EditorAction) => void
  getFormat: () => FormatState
  /** 커서나 내용이 바뀔 때마다 부른다. 해제 함수를 돌려준다. */
  subscribe: (fn: () => void) => () => void
}

export const EMPTY_FORMAT: FormatState = {
  ...EMPTY_STYLE,
  bold: false,
  italic: false,
  strike: false,
  code: false,
  link: false,
  heading: 0,
  list: null,
  quote: false,
  codeBlock: false,
}

