---
title:  ".gitignore"
layout: post
excerpt: "gitignore"

categories:
  - others 
tags:
  - [git]

toc: true
toc_sticky: true
 
date: 2025-11-30
last_modified_at: 2025-11-30
---

<br>

## gitignore

.gitignore에 지정한 경로의 파일들은 git에 올라가지 않는다.  
이렇게만 생각하고 gitingore를 사용해왔는데, 언젠가부터 빌드 관련 캐시 파일들이 아무리 gitignore에 올려도 계속 tracking되는 문제가 발생했다.  

처음엔 서너개 파일만 올라와서 직접 add에서 제외해왔으나 점점 파일 수가 늘어나서 해결할 방법을 찾아봤다.  



### tracked files  

git에서는 한 번이라도 commit된 파일들을 tracked 목록에 등록한다.  
따라서 이미 커밋 이력이 있는 파일 = .git/index의 파일 목록 대해서는 gitignore에 등록하더라도 추적이 해제되지 않는다(git ls-files 명령어로 관리중인 파일 목록 전체를 확인할 수 있다). 

#### Git의 상태 확인 로직:
if (파일이 Index에 있는가?):
    -> Tracked 파일
    -> .gitignore 무시
    -> 변경사항 추적
else:
    -> Untracked 파일
    -> .gitignore 확인
    -> 무시할지 결정


위와 같은 과정을 거쳐 gitignore 내용이 적용되기 때문에 이미 Index에 있는 파일을 아무리 추가해봤자 소용이 없다.  
따라서 커밋한 적 있는 파일에 대한 추적을 해제하고 싶다면 <b>git rm --cached</b>를 수행해서 index에 등록된 파일들을 삭제해주어야 해야한다.  



