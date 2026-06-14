---
title:  "SocketAsyncEventArgs"
layout: post
excerpt: ""

categories:
  - C#
tags:
  - [network, C#]

toc: true
toc_sticky: true
 
date: 2026-03-28
last_modified_at: 2026-03-28
---

### SocketAsyncEventArgs  

SocketAsyncEvnetArgs는 비동기 소켓 작업(Accept, Receive, Send, ...)을 수행할 때 재사용이 가능한 콘텍스트 객체이다.  이것은 비동기 작업에 필요한 모든 정보를 하나의 객체에 담아두고, 작업이 끝날 때마다 초기화해서 재사용한다.  
매번 소켓 통신을 할 때마다 객체를 생성/소멸시킨다면 그 비용만으로 서버가 멈출지도 모르겠다.  

고정된 크기의 바이트 배열을 할당받아 사용하다가 작업이 완료되면 Completed 이벤트를통해 등록된 메서드가 호출된다.  
