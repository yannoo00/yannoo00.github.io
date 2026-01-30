---
title:  "Overlapped 기반 통신 모델과 IOCP 모델의 차이"
layout: post
excerpt: "Network"

categories:
  - Network 
tags:
  - [Network, socket]

toc: true
toc_sticky: true
 
date: 2026-01-25
last_modified_at: 2026-01-25
---

<br>



## Overlapped I/O란

Windows에서 비동기 I/O를 수행하는 방식이다. 소켓에 Overlapped 속성을 부여하면 I/O 함수 호출 시 작업 완료를 기다리지 않고 즉시 반환된다. 작업이 끝나면 운영체제가 완료를 알려준다.  

완료 통지 방식은 크게 두 가지다.  
- Event 기반: WaitForMultipleObjects로 이벤트 시그널을 대기  
- Callback 기반: Alertable Wait 상태에서 APC 큐를 통해 콜백 함수 실행  

이 글에서는 Callback 기반 모델의 한계를 살펴보고, IOCP가 이를 어떻게 해결하는지 정리한다.  


## Callback 기반 Overlapped 모델

WSARecv, WSASend 등의 함수에 완료 루틴(Completion Routine)을 등록한다. I/O가 완료되면 해당 스레드가 Alertable Wait 상태일 때 콜백이 호출된다.  
Alertable Wait 상태는 SleepEx, WaitForSingleObjectEx 같은 함수에 bAlertable = true로 호출해야 진입할 수 있다.  

### Alertable Wait란?  

Aleratable wait 상태는 스레드가 **APC(Asynchronous Procedure Call) 큐**를 처리할 준비가 된 대기 상태다. windows 환경에서 스레드는 저마다의 APC 큐를 가진다. 비동기 I/O가 완료되면 운영체제가 완료 루틴을 해당 스레드의 APC 큐에 푸시한다.  
따라서 명시적으로 스레드가 이 큐를 확인하도록 요청을 보내어 Alertable Wait 상태로 진입하게 하면, 스레드는 대기하면서 APC 큐에 들어오는 정보를 확인할 것이다.  



## Callback 모델의 한계

### 스레드 종속성 문제

콜백은 I/O를 요청한 스레드에서만 실행된다. WSARecv를 호출한 스레드가 반드시 Alertable Wait 상태에 들어가야 완료 통지를 받을 수 있다.  

이게 왜 문제인가. 서버에서 수천 개의 클라이언트를 처리한다고 가정해보자. 각 클라이언트의 I/O 요청이 특정 스레드에 묶여 있으면 작업 분산이 어렵다. 스레드 A가 요청한 I/O는 스레드 B가 처리할 수 없다.  


### Alertable Wait 강제

콜백을 받으려면 스레드가 명시적으로 Alertable Wait 상태에 진입해야 한다. 이 상태에서는 다른 작업을 수행할 수 없다. 스레드가 대기만 하고 있어야 한다는 뜻이다.  

결국 I/O 완료를 기다리는 동안 CPU 자원을 활용하지 못한다.  


### 확장성 한계

클라이언트 수가 늘어나면 스레드도 늘려야 할 것 같지만, 스레드를 무한정 늘릴 수는 없다. 컨텍스트 스위칭 비용이 증가하고 메모리 사용량도 늘어난다.  

그렇다고 스레드 수를 제한하면 특정 스레드에 I/O가 몰릴 때 병목이 발생한다. 스레드 간 부하 분산 메커니즘이 없기 때문이다.  


## IOCP가 해결하는 것

### 스레드 풀과 완료 포트

IOCP는 **완료 포트(Completion Port)**라는 커널 객체를 사용한다. 여러 소켓을 하나의 완료 포트에 연결할 수 있다. I/O가 완료되면 결과가 완료 포트의 큐에 쌓인다.  

워커 스레드들은 GetQueuedCompletionStatus를 호출해 큐에서 완료 통지를 꺼내온다. **어떤 스레드가 어떤 소켓의 I/O를 처리할지는 운영체제가 결정**한다.  

즉 callback 모델에서 워커 IO를 요청한 그 스레드의 APC 큐에 결과가 들어가고, 그 스레드가 Alertable Wait 상태에 들어가서 큐를 읽어야 했던 것과 달리 스레드 공용 큐가 생기고, 거기에 Get 요청을 보내면 OS가 완료 정보를 분배해서 스레드들에게 주는 방식이다.  


### 스레드 종속성 해소

I/O를 요청한 스레드와 완료를 처리하는 스레드가 달라도 된다. 스레드 A가 WSARecv를 호출하고, 스레드 B가 그 완료를 처리할 수 있다. 이로써 작업 분산이 자연스럽게 이루어진다.


### 효율적인 스레드 관리

IOCP는 동시 실행 스레드 수를 제한할 수 있다. 보통 CPU 코어 수만큼 설정한다. 완료 통지가 없으면 스레드는 대기 상태가 되고, 통지가 오면 깨어나서 처리한다.

운영체제가 스레드 스케줄링을 최적화한다. 불필요한 컨텍스트 스위칭을 줄이고, 캐시 효율성을 높인다.


### 부하 분산

여러 스레드가 하나의 완료 큐를 공유한다. 특정 스레드가 바쁘면 다른 스레드가 큐에서 작업을 가져간다. 자연스러운 로드 밸런싱이 이루어진다.


## 완료 작업 식별

IOCP에서는 GetQueuedCompletionStatus가 "완료된 작업 아무거나 하나"를 반환한다. 어떤 소켓의 어떤 작업인지 지정해서 기다리는 게 아니다. 그래서 완료 정보에 식별 정보를 담아야 한다.

두 가지를 사용한다.

첫째는 CompletionKey다. CreateIoCompletionPort로 소켓을 완료 포트에 연결할 때 지정한다. 보통 세션 구조체 포인터를 넣는다. GetQueuedCompletionStatus 호출 시 이 값이 반환되므로 어떤 클라이언트의 작업인지 알 수 있다.

둘째는 OVERLAPPED 구조체다. WSARecv, WSASend 호출 시 이 구조체 포인터를 넘기고, 완료 시 같은 포인터가 반환된다. 기본 OVERLAPPED에는 작업 타입 정보가 없으므로 확장해서 사용한다.

```c
struct ExtendedOverlapped {
    OVERLAPPED overlapped;  // 반드시 첫 번째 멤버
    int operationType;      // OP_RECV, OP_SEND 등
    WSABUF wsaBuf;
    char buffer[1024];
};
```

overlapped가 첫 번째 멤버여야 하는 이유는 포인터 캐스팅 때문이다. GetQueuedCompletionStatus는 OVERLAPPED 포인터를 반환한다. 첫 번째 멤버면 주소가 같으므로 ExtendedOverlapped 포인터로 캐스팅해서 나머지 멤버에 접근할 수 있다.

Callback 모델에서는 Recv용 콜백, Send용 콜백을 따로 등록했다. IOCP에서는 하나의 루프에서 operationType을 보고 분기한다.  


## 정리

Callback 기반 Overlapped 모델은 비동기 I/O를 지원하지만 스레드 종속성 문제가 있다. 요청한 스레드에서만 완료를 처리할 수 있고, Alertable Wait 상태를 유지해야 한다. 대규모 동시 접속 처리에 적합하지 않다.

IOCP는 완료 포트를 통해 이 문제를 해결한다. I/O 완료와 스레드를 분리하고, 워커 스레드 풀이 완료 큐를 공유한다. 운영체제 수준에서 스레드 스케줄링과 부하 분산을 지원한다.

Windows 서버 환경에서 IOCP를 사용하는 이유는 단순히 성능이 좋아서가 아니다. 구조적으로 확장 가능한 모델이기 때문이다.

 