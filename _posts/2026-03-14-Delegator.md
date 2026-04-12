---
title:  "Delegate"
layout: post
excerpt: ""

categories:
  - C#
tags:
  - [C#]

toc: true
toc_sticky: true
 
date: 2026-03-14
last_modified_at: 2026-03-14
---

#### Delegate  

delegate는 메서드의 참조를 나타내는 타입이다.  
```public delegate int MyDelegate(string m);  ```  
위처럼 선언할 때 return, args를 포함하는 시그니쳐와 함께 선언한다. 선언과 별개로 new 전달할함수()로 인스턴스화하여 사용한다.  
이 때 function pointer처럼 단순히 함수의 주소만 저장하는게 아니라, 메서드를 호출할 객체의 ref도 함께 저장한다.  
따라서 delegate의 호출자는 **객체를 몰라도 객체의 메서드를 호출**할 수 있게 된다.  
또 callback이 필요한 상황에서도 람다처럼 간단하게 && 재사용 가능하게 사용 가능하다.  

```C#
//함수전달 
MyDelegate d = new FunctionForTest(message); // instance 

//혹은 lambda로 생성 
MyDelegate d = (message) => Console.WriteLine("hi");

d("Hello world"); //call
```
이렇게 delegator 생성 과정에서 자주 쓰이는 시그니쳐는 .NET 내장으로 형식이 지정되어있다.  
그 중 Unity에서도 자주 쓰이는 no return, no args를 의미하는  ```Action```이 있다.
```Action sayHello = () => Console.WriteLine("hi");```  
또 여기에 ```+=``` 연산자를 활용해서 여러 동작을 등록할 수 있다.  
```event``` 키워드와 함께 사용하면 덮어써지지 않고 ```+=```로 등록, ```-=```로 제거만 가능하기에 이벤트 처리에서 활용하기 좋다.  
단, 위처럼 람다로 등록해버리면 함수 이름을 찾을 수 없어 ```-=```로 구독 해제가 불가능하다.  

또 호출 시에 delegate(); 또는 delegate.Invoke() 모두 가능한데, Invoke()는 d?.Invoke()와 같이 null체크까지 한 줄로 작성할 수 있다.  



참고) [Delegates (C# Programming Guide)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/delegates/)