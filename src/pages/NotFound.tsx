import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { useTitle } from '../lib/useTitle'

export default function NotFound() {
  useTitle('404')
  return (
    <Page>
      <h1 className="page-title">페이지를 찾을 수 없습니다</h1>
      <p>
        주소가 바뀌었거나 없는 글입니다. <Link to="/">홈으로 돌아가기</Link>
      </p>
    </Page>
  )
}
