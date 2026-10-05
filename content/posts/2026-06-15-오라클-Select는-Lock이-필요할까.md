---
title:  "오라클 Select는 Lock이 필요할까?"
layout: post
excerpt: ""

categories:
  - DB
tags:
  - [DB]

toc: true
toc_sticky: true
 
date: 2026-06-15
last_modified_at: 2026-06-15
---

오라클의 select는 lock이 필요하지 않다.  

MVCC 모델을 사용하는 오라클은 SELECT문에 lock을 잡지 않는다. 다른 트랜잭션이 변경한 row를 읽을 때 복사본 블록을 만들어서 쿼리가 '시작된 시점'으로 돌려서 읽는다. 변경이 진행 중인 (커밋 전인) row를 읽을 때에도 Lock이 풀릴 때까지 기다리지 않고 복사본을 만들어 읽는다.  
따라서 Select문에서 락을 잡을 필요가 없다. 오라클에서는 DML과 Select가 서로를 방해하지 않는 것이다.  

이 때  MVCC 모델이란, Multi-Version Concurrency Control로 데이터베이스에서 동시성(Concurrency)과 일관성(Consistency)을 모두 잡기 위해 사용하는 가장 대표적인 트랜잭션 제어 기법이다. 업데이트가 발생할 때 업데이트 전 버전/ 후 버전 처럼 하나의 데이터에 대해 여러가지 복사본을 들고 있게 된다.  
오라클에서는 데이터를 수정할 때 과거로 돌아가기 위한 데이터를 UNDO 로그에 기록해둔다. (과거 데이터 그대로를 들고 있는게 아니라 과거 데이터로 돌아갈 수 있는 일종의 메타 데이터 같은 것)  

따라서 select에서 다른 select이나 DML에 대한 대기 없이 바로 사용이 가능하다.  

오라클같은 대형 RDBS는 대부분 MVCC를 사용하지만 MS-SQL은 SELECT에는 공유 lock을 사용하고 DML에는 배타 LOCK을 사용하여 DML이 진행되는 도중에는 데이터를 읽을 수 없게 막는다. 각각 트레이드오프가 있을 것이다. 데이터가 변경되는 동안 아예 못읽게 하여 의미적으로 더 명확히 데이터의 처리를 해야할 수도 있을 것이고 DML 진행 중에는 옛날 버전이라도 보게 하여 속도를 높여주는게 나을 수도 있다.  
