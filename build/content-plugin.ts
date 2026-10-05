import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { REPO, SITE } from '../src/config.ts'
import { parsePost, plainText, readFields } from '../src/lib/frontmatter.ts'
import { categoryUrl, dateFromFilename, postUrl, slugFromFilename, tagUrl } from '../src/lib/slug.ts'
import type { PostMeta, SearchEntry } from '../src/lib/types.ts'

interface LoadedPost {
  meta: PostMeta
  body: string
}

const EXCERPT_LENGTH = 160
const FEED_SIZE = 20

function loadPosts(root: string): LoadedPost[] {
  const dir = path.join(root, REPO.postsDir)
  const posts: LoadedPost[] = []
  const seen = new Map<string, string>()

  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.toLowerCase().endsWith('.md')) continue
    const filename = file.normalize('NFC')
    const slug = slugFromFilename(filename)
    if (!slug) continue
    if (seen.has(slug)) {
      throw new Error(`글 주소가 겹칩니다: "${seen.get(slug)}" 와 "${filename}" (/posts/${slug}/)`)
    }
    seen.set(slug, filename)

    const { data, body } = parsePost(fs.readFileSync(path.join(dir, file), 'utf8'))
    const fields = readFields(data, {
      title: slug.replace(/-/g, ' '),
      date: dateFromFilename(filename) ?? '1970-01-01',
    })
    posts.push({
      meta: {
        slug,
        title: fields.title,
        date: fields.date,
        categories: fields.categories,
        tags: fields.tags,
        excerpt: fields.excerpt || plainText(body).slice(0, EXCERPT_LENGTH),
        path: `${REPO.postsDir}/${filename}`,
      },
      body,
    })
  }

  return posts.sort(
    (a, b) => b.meta.date.localeCompare(a.meta.date) || b.meta.path.localeCompare(a.meta.path),
  )
}

function loadAbout(root: string): string {
  const file = path.join(root, 'content/about.md')
  return fs.existsSync(file) ? parsePost(fs.readFileSync(file, 'utf8')).body : ''
}

function searchIndex(posts: LoadedPost[]): SearchEntry[] {
  return posts.map((p) => ({ slug: p.meta.slug, text: plainText(p.body).toLowerCase() }))
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function feed(posts: LoadedPost[]): string {
  const latest = posts.slice(0, FEED_SIZE)
  const entries = latest
    .map(({ meta }) => {
      const url = SITE.url + postUrl(meta.slug)
      return [
        '  <entry>',
        `    <title>${escapeHtml(meta.title)}</title>`,
        `    <link href="${escapeHtml(url)}" rel="alternate" type="text/html" />`,
        `    <id>${escapeHtml(url)}</id>`,
        `    <published>${meta.date}T00:00:00+09:00</published>`,
        `    <updated>${meta.date}T00:00:00+09:00</updated>`,
        ...meta.categories.map((c) => `    <category term="${escapeHtml(c)}" />`),
        `    <summary>${escapeHtml(meta.excerpt)}</summary>`,
        '  </entry>',
      ].join('\n')
    })
    .join('\n')
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${SITE.url}/</id>`,
    `  <title>${escapeHtml(SITE.title)}</title>`,
    `  <subtitle>${escapeHtml(SITE.description)}</subtitle>`,
    `  <updated>${latest[0]?.meta.date ?? '1970-01-01'}T00:00:00+09:00</updated>`,
    `  <link rel="self" type="application/atom+xml" href="${SITE.url}/feed.xml" />`,
    `  <link rel="alternate" type="text/html" href="${SITE.url}/" />`,
    entries,
    '</feed>',
    '',
  ].join('\n')
}

function sitemap(posts: LoadedPost[]): string {
  const urls = [
    ...['/', '/categories/', '/tags/', '/archives/', '/about/'].map((loc) => ({ loc, lastmod: '' })),
    ...posts.map(({ meta }) => ({ loc: postUrl(meta.slug), lastmod: meta.date })),
  ]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      ({ loc, lastmod }) =>
        `  <url><loc>${escapeHtml(SITE.url + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
    '',
  ].join('\n')
}

/** 경로마다 놓을 index.html. GitHub Pages가 주소를 직접 열어도 200으로 응답하게 한다. */
function shell(template: string, title: string, description: string): string {
  const fullTitle = title ? `${title} | ${SITE.title}` : SITE.title
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      [
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta property="og:title" content="${escapeHtml(title || SITE.title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:site_name" content="${escapeHtml(SITE.title)}" />`,
      ].join('\n    '),
    )
}

export function contentPlugin(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'

  return {
    name: 'blog-content',

    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
    },

    // 개발 서버에서는 요청마다 글을 다시 읽어 수정 내용이 바로 보이게 한다
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0])
        if (!url.startsWith('/data/')) return next()

        const send = (type: string, content: string) => {
          res.setHeader('Content-Type', `${type}; charset=utf-8`)
          res.setHeader('Cache-Control', 'no-store')
          res.end(content)
        }
        const posts = loadPosts(root)
        if (url === '/data/posts.json') {
          return send('application/json', JSON.stringify(posts.map((p) => p.meta)))
        }
        if (url === '/data/search.json') {
          return send('application/json', JSON.stringify(searchIndex(posts)))
        }
        if (url === '/data/about.md') return send('text/markdown', loadAbout(root))

        const match = url.match(/^\/data\/posts\/(.+)\.md$/)
        const post = match && posts.find((p) => p.meta.slug === match[1].normalize('NFC'))
        if (post) return send('text/markdown', post.body)

        res.statusCode = 404
        res.end('Not found')
      })
    },

    generateBundle() {
      const posts = loadPosts(root)
      const emit = (fileName: string, source: string) =>
        this.emitFile({ type: 'asset', fileName, source })

      emit('data/posts.json', JSON.stringify(posts.map((p) => p.meta)))
      emit('data/search.json', JSON.stringify(searchIndex(posts)))
      emit('data/about.md', loadAbout(root))
      for (const post of posts) emit(`data/posts/${post.meta.slug}.md`, post.body)
      emit('feed.xml', feed(posts))
      emit('sitemap.xml', sitemap(posts))
    },

    closeBundle() {
      const templateFile = path.join(outDir, 'index.html')
      if (!fs.existsSync(templateFile)) return
      const template = fs.readFileSync(templateFile, 'utf8')
      const posts = loadPosts(root)

      const write = (route: string, title: string, description = SITE.description) => {
        const dir = path.join(outDir, decodeURIComponent(route))
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, 'index.html'), shell(template, title, description))
      }

      for (const { meta } of posts) write(postUrl(meta.slug), meta.title, meta.excerpt)
      for (const name of new Set(posts.flatMap((p) => p.meta.categories))) write(categoryUrl(name), name)
      for (const name of new Set(posts.flatMap((p) => p.meta.tags))) write(tagUrl(name), name)
      write('/categories/', 'Categories')
      write('/tags/', 'Tags')
      write('/archives/', 'Archives')
      write('/about/', 'About')
      write('/search/', 'Search')
      write('/admin/', 'Admin')
      write('/admin/edit/', 'Admin')

      // 그 밖의 주소는 404.html이 앱을 띄워 클라이언트 라우터가 처리한다
      fs.writeFileSync(path.join(outDir, '404.html'), shell(template, '', SITE.description))
    },
  }
}
