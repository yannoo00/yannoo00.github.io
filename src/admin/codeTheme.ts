import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * 편집기 코드 블록의 색. VS Code의 기본 밝은 테마(Light+)와 같은 색을 쓴다.
 * 읽기 화면의 색(styles.css의 .hljs-*)과 맞춰 두었다.
 */
export const VSCODE = {
  text: '#000000',
  comment: '#008000',
  keyword: '#0000ff',
  control: '#af00db',
  type: '#267f99',
  func: '#795e26',
  variable: '#001080',
  constant: '#0070c1',
  string: '#a31515',
  number: '#098658',
  regexp: '#811f3f',
  escape: '#ee0000',
  tag: '#800000',
  attr: '#e50000',
}

const style = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: VSCODE.comment },
  { tag: [t.keyword, t.definitionKeyword, t.modifier, t.operatorKeyword, t.self, t.null, t.bool, t.atom], color: VSCODE.keyword },
  { tag: [t.controlKeyword, t.moduleKeyword], color: VSCODE.control },
  { tag: [t.processingInstruction, t.meta, t.macroName], color: VSCODE.control },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: VSCODE.type },
  {
    tag: [t.function(t.variableName), t.function(t.definition(t.variableName)), t.function(t.propertyName)],
    color: VSCODE.func,
  },
  { tag: [t.variableName, t.propertyName, t.definition(t.variableName), t.labelName], color: VSCODE.variable },
  { tag: [t.constant(t.variableName), t.standard(t.variableName)], color: VSCODE.constant },
  { tag: [t.string, t.special(t.string), t.character, t.docString], color: VSCODE.string },
  { tag: [t.number, t.integer, t.float], color: VSCODE.number },
  { tag: t.regexp, color: VSCODE.regexp },
  { tag: t.escape, color: VSCODE.escape },
  { tag: [t.tagName, t.angleBracket], color: VSCODE.tag },
  { tag: t.attributeName, color: VSCODE.attr },
  { tag: [t.operator, t.punctuation, t.bracket], color: VSCODE.text },
  { tag: t.invalid, color: VSCODE.escape },
])

export const vscodeLight = syntaxHighlighting(style)
