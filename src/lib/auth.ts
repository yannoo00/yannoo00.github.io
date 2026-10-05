import { useSyncExternalStore } from 'react'

const KEY = 'gh_token'
const EVENT = 'gh-token-change'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    // 저장소를 쓸 수 없으면 로그인 상태를 유지하지 못할 뿐이다
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export const useToken = () => useSyncExternalStore(subscribe, getToken)
