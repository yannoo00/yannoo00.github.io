/**
 * 코드 블록 언어 목록. 편집기와 읽기 화면이 함께 쓴다.
 * 글에는 `cs`, `CS`, `cpp`처럼 여러 표기가 섞여 있으므로 대소문자 구분 없이 별칭으로 찾아
 * 대표 이름(C#, C++ …)으로 보여 준다.
 */
export interface CodeLanguage {
  /** 화면에 보이는 이름이자 편집기가 글에 적는 이름 */
  name: string
  /** 대표 이름 외에 알아들을 표기(소문자) */
  alias: string[]
}

export const CODE_LANGUAGES: CodeLanguage[] = [
  { name: 'C', alias: ['h'] },
  { name: 'C++', alias: ['cpp', 'cc', 'cxx', 'hpp', 'hh'] },
  { name: 'C#', alias: ['cs', 'csharp'] },
  { name: 'Java', alias: [] },
  { name: 'JavaScript', alias: ['js', 'jsx', 'mjs'] },
  { name: 'TypeScript', alias: ['ts', 'tsx'] },
  { name: 'Python', alias: ['py'] },
  { name: 'SQL', alias: [] },
  { name: 'Go', alias: ['golang'] },
  { name: 'Rust', alias: ['rs'] },
  { name: 'JSON', alias: [] },
  { name: 'HTML', alias: ['xml'] },
  { name: 'CSS', alias: [] },
  { name: 'YAML', alias: ['yml'] },
  { name: 'Bash', alias: ['sh', 'shell', 'zsh'] },
]

const byAlias = new Map<string, CodeLanguage>()
for (const lang of CODE_LANGUAGES) {
  for (const key of [lang.name, ...lang.alias]) byAlias.set(key.toLowerCase(), lang)
}

export function findLanguage(raw: string | null | undefined): CodeLanguage | undefined {
  return raw ? byAlias.get(raw.trim().toLowerCase()) : undefined
}

/** 알고 있는 언어면 대표 이름으로, 모르는 언어면 적힌 그대로 돌려준다. */
export function languageLabel(raw: string | null | undefined): string {
  return findLanguage(raw)?.name ?? raw ?? ''
}
