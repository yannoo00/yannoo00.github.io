export const SITE = {
  title: 'YannooHub',
  tagline: "Yannoo's programming",
  description: '야누의 개발일지',
  url: 'https://yannoo00.github.io',
  pageSize: 10,
}

/** 에디터가 커밋할 대상 리포지토리 */
export const REPO = {
  owner: 'yannoo00',
  name: 'yannoo00.github.io',
  branch: 'main',
  postsDir: 'content/posts',
  /** 이미지가 저장되는 리포 경로. 사이트에서는 `public`을 뺀 경로로 서빙된다. */
  publicDir: 'public',
  imageUrlPrefix: '/img/posts',
}
