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

SocketAsyncEvnetArgs는 비동기 소켓 작업(Accept, Receive, Send, ...)을 수행할 때 재사용이 가능한 콘텍스트 객체이다.  비동기 작업에 필요한 모든 정보를 하나의 객체에 담아두고, 작업이 끝날 때마다 초기화해서 재사용한다.  
이걸 사용해서 클라이언트와 연결하는 예시(연결 대기)를 보자.  
```cs
//Listener.cs  
private void RegisterAccept()
{
		SocketAsyncEventArgs acceptArgs = new SocketAsyncEventArgs();
		acceptArgs.Completed += new EventHandler<SocketAsyncEventArgs>(OnAcceptCompleted);
		
		//리슨 소켓에서 새 연결을 감지할 때까지 대기(비동기)
		bool pending = _listenSocket.AcceptAsync(acceptArgs);
		//만약 대기할 필요 없이 이미 요청이 와 있는 상태라면 pending = false이고 이럴 때는 직접 OnAccept~() 호출해줘야한다.
		if (!pending)
				OnAcceptCompleted(null, acceptArgs);
}

// 연결됐을 때의 콜백 함수
private void OnAcceptCompleted(object sender, SocketAsyncEventArgs args)
{
		if (args.SocketError == SocketError.Success)
		{
				EndPoint remoteEndPoint = args.AcceptSocket.RemoteEndPoint;
				// 클라이언트와의 연결 세션 만들기. 
				Session session = _sessionFactory.Invoke();
				session.Start(args.AcceptSocket);
				session.OnConnected(remoteEndPoint);
		}

		args.AcceptSocket = null; // 다음 클라이언트 연결을 위해 초기화
		bool pending = _listenSocket.AcceptAsync(args); //재귀적으로 계속 대기.
		if (!pending)
				OnAcceptCompleted(null, args);
}
```

위처럼 SocketAsyncEventArgs 객체는 RegisterAccept()에서 한 번 생성해두고, 계속해서 OnAcceptCompleted()의 인자로 넘기면서 재사용한다.  
몇 명이 연결되든 Listener당 하나의 객체만 있는 것이다.  

다음은 연결된 클라이언트로부터 패킷을 받는 과정이다(데이터 대기).
```cs
//Session.cs

	/* 어딘가에 있는 코드
  private RecvBuffer _recvBuffer = new RecvBuffer(65535);
	
  public RecvBuffer(int bufferSize)
  {
      _buffer = new ArraySegment<byte>(new byte[bufferSize]); // byte[65535] 힙 할당
  }
*/

  private SocketAsyncEventArgs _recvArgs = new SocketAsyncEventArgs();

  public void Start(Socket socket)
  {
      _socket = socket;
      _socket.NoDelay = true;
      _recvArgs.Completed += new EventHandler<SocketAsyncEventArgs>(OnRecvCompleted);
      RegisterRecv();
  }

  private void RegisterRecv()
  {
      // 빈 공간이 부족하면 버퍼 앞으로 정리
      if (_recvBuffer.FreeSize < _recvBuffer.DataSize)
          _recvBuffer.Clean();

      // SAEA에 쓸 공간(WriteSegment)을 버퍼로 지정
      _recvArgs.SetBuffer(
          _recvBuffer.WriteSegment.Array, //쓸 배열 자체
          _recvBuffer.WriteSegment.Offset, //writePos 
          _recvBuffer.WriteSegment.Count //빈 공간 크기
      );

      bool pending = _socket.ReceiveAsync(_recvArgs);
      if (!pending)
          OnRecvCompleted(null, _recvArgs);
  }

  private void OnRecvCompleted(object sender, SocketAsyncEventArgs args)
  {
      if (args.BytesTransferred > 0 && args.SocketError == SocketError.Success)
      {
          _recvBuffer.OnWrite(args.BytesTransferred); // Write 포인터 전진
          int processLen = OnRecv(_recvBuffer.ReadSegment); // 패킷 파싱
          _recvBuffer.OnRead(processLen); // Read 포인터 전진

          RegisterRecv(); // 다음 수신 등록 (SAEA 재사용)
      }
      else
      {
          Disconnect();
      }
  }

```
SetBuffer()를 통해 SocketAsyncEventArgs에서 데이터를 받았을 때 그 데이터를 쓰게 되는 버퍼를 연결한다. OS가 데이터를 받으면 이 구간에 직접 쓰는 것인데 이 때 쓰는 메모리의 위치가 GC에 의해 바뀌지 않도록 socket의 ReceiveAsync()에서 내부적으로 고정된다.  
 큰 버퍼 하나를 생성하고 그 중 하나의 SAEA가 사용할 영역을 할당받는 방식으로 구현하면 pin 되는 메모리가 하나에 그쳐 GC의 효율적인 압축을 방해하지 않는다.  
