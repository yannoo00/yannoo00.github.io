---
title:  "Thread와 Context Switching"
layout: post
excerpt: ""

categories:
  - OS
tags:


toc: true
toc_sticky: true
 
date: 2026-06-22
last_modified_at: 2026-06-22
---

Thread는 자신만의 고유한 stack 영역을 가진다.  
그러면 각 trhead의 stack 영역에서는 최소한 race condition이 발생할 수 ~~없다~~. (=> 내 스택에 있는 지역 변수의 주소를 heap에 올리고, 그걸 통해 다른 스레드에서 충분히 접근할 수 있다)  
race condition이 발생하려면 여러 thread 들이 동시에 같은 데이터에 접근해야 한다.  

전체 thread가 공유하는 영역은 Code(실행 프로그램 코드) / Data(전역 변수, 정적 변수 등) / Heap(동적 할당) 이다.  
이와 별개로, thread 고유한 데이터이지만 stack 메모리에 올라가는 다른 코드처럼 함수 scope 범위에서만 유효한게 아니라 마치 전역변수같은 생명주기를 가질 수 있는 영역이 있는데 이를 TLS(Thread Local Storage)라고 한다.  
```cs
[ThreadStatic]
    public static int TlsValue = 0;
``` 
위처럼 쓸 수 있다.   

그렇다면 OS는 어떤 TLS, stack이 어떤 스레드의 것인지 어떻게 알까? thread별로 어떤 저장 공간이 생겨야 가능할 것이다.  

OS는 스레드를 관리할 때 스레드 상태를 담은 TCB(Thread Control Block)를 사용한다. 컨텍스트 스위칭이 발생하면 TCB에 CPU 레지스터의 값들을 저장하고, 다음 스레드의 TCB 값을 레지스터에 복사한다.   
TCB에 포함되는 정보들 중 stack pointer가 현재 활성화된 스레드의 스택 top을 가리키고 있다가 이 값이 다음 스레드의 스택 주소로 바뀐다. 세그먼트 레지스터는 현재 스레드의 TLS 기본 주소를 가리키는데, 컨텍스트 스위칭 때 이 레지스터 값도 함께 바뀐다.  

같은 프로세스에서 스레드만 교체되는게 아니라, 아예 다른 프로세스의 스레드로 교체된다면?  
우선 가상메모리 주소를 교체해야한다. 이 정보는 PCB(Process Control Block)에 들어있다. 가상메모리 주소를 실제 물리 주소로 바꾸기 위한 TLB(Translation Lookaside Buffer)도 전부 비워준다.  

따라서 Thread의 스위칭 자체도 비용이 발생하지만 아예 다른 프로세스로의 컨텍스트 스위칭은 더 무겁다.  