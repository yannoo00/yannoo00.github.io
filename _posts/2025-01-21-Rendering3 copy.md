---
title:  "삼각형 렌더링하기 - Renderer 클래스 만들기"
layout: post
excerpt: "Direct를 활용해 삼각형을 렌더링해보자. "

categories:
  - Direct
tags:
  - [Direct, rendering]

toc: true
toc_sticky: true
 
date: 2025-01-21
last_modified_at: 2025-01-22
---

# 삼각형을 렌더링 해보자!

window API, Direct를 활용해 삼각형을 렌더링하는 과정을 공부해보자. 

<br>


<br>

## 1~2까지의 진행단계

1. 윈도우 api로 다이렉트를 사용할 윈도우 화면을 만듦  
화면 늘리고 줄이고 등의 이벤트(->메시지)에 반응하는 화면
2. renderer 클래스를 만듦  
쉐이더 설정을 하고 렌더링을 위한 버퍼 설정 등 적용