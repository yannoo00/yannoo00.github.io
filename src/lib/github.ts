import { REPO } from '../config'
import { getToken } from './auth'

const API = 'https://api.github.com'
const REPO_API = `/repos/${REPO.owner}/${REPO.name}`

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request(path: string, init: RequestInit = {}, token = getToken()): Promise<Response> {
  if (!token) throw new GitHubError('로그인이 필요합니다.', 401)
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    const detail = await res.json().then(
      (body: { message?: string }) => body.message,
      () => undefined,
    )
    const hint =
      res.status === 401
        ? '토큰이 만료됐거나 잘못됐습니다. 다시 로그인하세요.'
        : res.status === 403 || res.status === 404
          ? '토큰에 이 리포지토리의 Contents 읽기/쓰기 권한이 있는지 확인하세요.'
          : ''
    throw new GitHubError(`GitHub 요청 실패 (HTTP ${res.status}${detail ? `: ${detail}` : ''}) ${hint}`.trim(), res.status)
  }
  return res
}

const json = <T>(path: string, init?: RequestInit, token?: string) =>
  request(path, init, token).then((res) => res.json() as Promise<T>)

const post = <T>(path: string, body: unknown, method = 'POST') =>
  json<T>(path, { method, body: JSON.stringify(body) })

/** 토큰으로 이 리포에 쓸 수 있는지 확인하고 계정 이름을 돌려준다. */
export async function verifyToken(token: string): Promise<string> {
  const repo = await json<{ permissions?: { push?: boolean }; owner: { login: string } }>(
    REPO_API,
    undefined,
    token,
  )
  if (!repo.permissions?.push) {
    throw new GitHubError('이 토큰에는 리포지토리에 쓸 권한이 없습니다. Contents 권한을 Read and write로 설정하세요.', 403)
  }
  return repo.owner.login
}

const contentsPath = (path: string) =>
  `${REPO_API}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(REPO.branch)}`

const RAW = { Accept: 'application/vnd.github.raw+json' }

export const readTextFile = (path: string) =>
  request(contentsPath(path), { headers: RAW }).then((res) => res.text())

export const readBinaryFile = (path: string) =>
  request(contentsPath(path), { headers: RAW }).then((res) => res.blob())

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(blob)
  })
}

export interface FileChange {
  path: string
  /** null이면 파일을 지운다. */
  content: string | Blob | null
}

/** 여러 파일의 추가·수정·삭제를 커밋 하나로 올린다. */
export async function commitFiles(message: string, changes: FileChange[]): Promise<string> {
  const branch = encodeURIComponent(REPO.branch)
  const ref = await json<{ object: { sha: string } }>(`${REPO_API}/git/ref/heads/${branch}`)
  const parent = ref.object.sha
  const base = await json<{ tree: { sha: string } }>(`${REPO_API}/git/commits/${parent}`)

  const tree = await Promise.all(
    changes.map(async ({ path, content }) => {
      if (content === null) return { path, mode: '100644', type: 'blob', sha: null }
      const blob = await post<{ sha: string }>(
        `${REPO_API}/git/blobs`,
        typeof content === 'string'
          ? { content, encoding: 'utf-8' }
          : { content: await toBase64(content), encoding: 'base64' },
      )
      return { path, mode: '100644', type: 'blob', sha: blob.sha }
    }),
  )

  const newTree = await post<{ sha: string }>(`${REPO_API}/git/trees`, { base_tree: base.tree.sha, tree })
  const commit = await post<{ sha: string }>(`${REPO_API}/git/commits`, {
    message,
    tree: newTree.sha,
    parents: [parent],
  })
  await post(`${REPO_API}/git/refs/heads/${branch}`, { sha: commit.sha }, 'PATCH')
  return commit.sha
}

export const actionsUrl = `https://github.com/${REPO.owner}/${REPO.name}/actions`
