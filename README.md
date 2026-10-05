# YannooHub

[yannoo00.github.io](https://yannoo00.github.io) 블로그. React(Vite + TypeScript)로 만든 정적 사이트이고, GitHub Actions가 빌드해 GitHub Pages에 배포한다.

## 구조

```
content/posts/   글 (front matter가 붙은 마크다운, 파일명은 YYYY-MM-DD-제목.md)
content/about.md About 페이지 내용
public/          그대로 서빙되는 파일. 에디터로 올린 이미지는 public/img/posts/ 에 쌓인다
src/             읽기 화면과 관리 화면(src/admin)
build/           빌드 때 글 목록·검색 인덱스·피드·경로별 index.html을 만드는 Vite 플러그인
```

글 주소는 파일명에서 날짜를 뺀 부분으로 정해진다 (`/posts/제목/`). 파일명을 바꾸면 주소도 바뀐다.

## 글 쓰기

사이트의 `/admin/` 에서 GitHub fine-grained 토큰(이 리포의 Contents: Read and write)으로 로그인한 뒤 브라우저에서 쓴다.
발행하면 글과 이미지가 커밋 하나로 `main`에 올라가고, 1~2분 뒤 사이트에 반영된다.

- 이미지는 본문에 붙여넣거나 끌어다 놓으면 WebP로 변환되어 들어간다.
- "이 글의 이미지"에서 자르기, 회전, 크기 조절을 할 수 있다.

`content/posts/` 에 마크다운 파일을 직접 추가하고 push해도 된다.

## 개발

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 에 배포용 파일 생성
```

사이트 제목과 대상 리포지토리 설정은 `src/config.ts` 에 있다.
