import { useEffect } from 'react'
import { SITE } from '../config'

export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE.title}` : SITE.title
  }, [title])
}
