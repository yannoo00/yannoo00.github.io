---
title:  "Web, WAS 서버"
layout: post
excerpt: ""

categories:
  - Web
tags:
  - [Network]

toc: true
toc_sticky: true
 
date: 2026-07-12
last_modified_at: 2026-07-12
---

Web서버는 정적인 파일들을 클라이언트에게 서빙해주는 역할, NginX, 아파치 등이 있고  
WAS는 동적으로 데이터를 가져와 Web서버에게 전달해주는 역할로 톰캣 등이 있다.   
3-Tier 구조는 이렇게 Web <-> WAS <-> DB 로 이뤄진다.  

node js를 주로 사용하다보니 이런 개념이 헷갈렸다. 직접 코딩을 할 때는 nginx니, Tomcat이니 하는 것들은 직접 만질 일이 거의 없이 어플리케이션의 코드 작업만 하고, node app run 이런 식으로 추상화되어 한 번에 해결해주는 부분이 많았던 것 같다.  

프론트엔드 html 작업을 한다고 가정하면, index.html 만들고 style.css 만들고, 라우팅 하고, 등등 여러가지 작업을 할 것이다.  
그리고 특정 url로 접근하면 내 index.html이 클라이언트에게 보이게 되는 것을 기대한다. 클라이언트가 접근할 수 있게 포트를 열어서 들어오는 요청에 대해 내가 작성한 정적 파일을 보여주는 역할을 nginx가 한다.  
GET /index.html HTTP/1.1 ...이런 요청을 파싱해서 index.html 정적 파일을 서빙해주는 것이다.  
마찬가지로 백엔드 - WAS도, DB에서 정보를 가져와야 할 경우 이 Web서버가 WAS로 'user A정보 줘라' 같은 요청을 보낼 것이고 그걸 받아서 DB왕복 후 돌려주는 역할을 하고, 내가 짜둔 코드를 기반으로 들어오는 요청을 읽고 코드를 찾아가는 기능을 WAS가 처리한다.  


```cs
// C#이나 C++로 바닥부터 소켓 서버를 만들 때의 대략적인 모습
void Main() {
    // 1. 8080 포트를 열고 대기한다 (Bind & Listen)
    Socket serverSocket = new Socket(...);
    serverSocket.Bind(new IPEndPoint(IPAddress.Any, 8080));
    serverSocket.Listen(100);

    // 2. 무한 루프를 돌며 클라이언트의 접속을 기다린다 (무한 루프)
    while (true) {
        Socket clientSocket = serverSocket.Accept(); // 여기서 블로킹되거나 비동기로 대기
        
        // 3. 일꾼(스레드) 하나를 만들어서 소켓 처리를 맡긴다
        Thread pool = new Thread(() => HandleClient(clientSocket));
        pool.Start();
    }
}

void HandleClient(Socket client) {
    // 4. 소켓에서 raw 바이트 데이터를 읽어온다 (Read)
    byte[] buffer = new byte[1024];
    client.Receive(buffer);
    
    // 5. 파싱해서 문자열로 만든다 ("GET /api/users HTTP/1.1\r\n...")
    string requestText = Encoding.UTF8.GetString(buffer);
    
    // 6. 내가 짠 라우팅 / API 로직 실행
    if (requestText.Contains("GET /api/users")) {
        string json = CallMyUserApi(); 
        client.Send(Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\n\r\n" + json));
    }
    client.Close();
}
```  

C#으로 소켓 통신을 한다고 하자. 무한루프를 돌리면서 클라이언트 요청을 대기하다가 들어온 요청을 파싱해서 적절한 handler를 호출하는 방식을 떠올릴 수 있다. 결국 모든 서버는 클라 요청을 대기하고 -> 받아서 처리. 이걸 반복한다. 이런 기능을 지원해주는 다양한 프레임워크가 있다. express, ASP.NET 등...  
```js
import express from 'express';
const app = express();

app.get('/api/users', (req, res) => {
    res.json({ name: "Kim" });
});

app.listen(3000);
```
비슷하게 클라 요청을 대기하는 코드이지만 훨씬 간단하다. 직접 스레드를 관리하거나 무한루프를 돌지 않는다. 이런 js 코드에서, listen(3000)은 위의 C# 코드처럼 while문을 열고 3000번 포트로 들어오는 요청을 계속해서 감시한다.  while 루프, 바이트 파싱, 스레드 관리 등을 대신 해주는 것이다.  
Node.js에서는 이제 웹 프레임워크에 이런 WAS 기능이 통합되어 있는 것으로 전통적인 java 진영이 아니면 톰캣 같이 프로그램이 따로 존재하는 WAS가 옛날 개념이 된 것 같다.  
이제 WAS라고 하면, 백엔드 프로세스를 의미하는 것이고 다양한 웹 프레임워크에서 전통적인 WAS의 역할을 같이 지원해준다고 이해하면 될 것 같다.  

그럼 nginx랑 express 같은 웹프레임워크는 결국 둘 다 클라이언트의 요청을 기다리고 - api 콜 해주는 서버 프로세스라는 점에서 결국 같은 것 아닌가?  물론 이렇게 둘 다 OS 소켓을 열고 네트워크 패킷을 받아 처리한다는 점에서는 같다. 하지만 역할상 당연한거고, 각자의 전문 분야가 있는 것이다.  
일단 nginx에서는 코드를 실행하는 능력이 없다. 경로에 따른 정적 파일 반환, 리버스 프록시 / 로드 밸런싱 등을 담당한다.  
반면 웹 프레임워크는 정말 코드를 실행하는 '실행 환경'이 돌아가고 있다. 그게 V8엔진, .NET 런타임 등이다. 요청이 오면 실제로 코드를 실행해서 연산을 하고 결과를 돌려준다. 

그럼 이렇게 client(브라우저) -> nginx -> WAS를 거치는 동적 데이터에 대한 요청이 어떻게 처리될지 생각해보자.  
우선 클라가 프론트엔드 index 페이지에 접근한다 -> 거기에는 유저 닉네임을 보여주는 ui가 있는데, 프론트엔드에서는 fetch를 통해 이 데이터를 가져온다.  nginx는 우선 이 브라우저에게 index 정적 파일을 다 준다. 브라우저는 그걸 실행한다. html -> css -> js 순서로.. 이 때 js 파일 중 fetch()가 있다. 브라우저가 이걸 실행한다 -> api/user/어쩌구.. 가 있다.  이게 nginx에게 간다.  
nginx는 이걸 WAS쪽으로 토스한다. WAS에서는 이 api에 해당하는 코드가 실행되고 데이터를 얻어와 nginx에게 다시 전달, nginx가 최종적으로 클라이언트에게 전달한다.