import { Page } from '../components/Layout'
import Markdown from '../components/Markdown'
import { Status } from '../components/PostList'
import { loadAbout, useAsync } from '../lib/data'
import { useTitle } from '../lib/useTitle'

export default function About() {
  useTitle('About')
  const about = useAsync(loadAbout, 'about')
  return (
    <Page>
      <h1 className="page-title">About</h1>
      <div className="content">
        {about.status === 'ready' ? <Markdown body={about.data} /> : <Status state={about} />}
      </div>
    </Page>
  )
}
