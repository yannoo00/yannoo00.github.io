---
title:  "다형성을 가진 기본 클래스에게는 virtual 소멸자를..."
layout: post
excerpt: "effective C++"

categories:
  - C++
tags:
  - [C++]

toc: true
toc_sticky: true
 
date: 2025-03-14
last_modified_at: 2025-03-14
---


<br>


# virtual ~MyClass();

"C++의 규정에 의하면, 기본 클래스 포인터를 통해 파생 클래스 객체가 삭제될 때 그 기본 클래스에 비가상 소멸자가 들어 있으면 프로그램 동작은 미정의 사항이다" 



~~~cpp
class TimeKeeper
{

public:
	TimeKeeper();
	~TimeKeeper();
    ...
};

class WristWatch: public TimeKeeper{ ... };
~~~

이런 클래스가 있고,
~~~cpp
TimeKeeper* getTimeKeeper(); //TimeKeeper 파생 클래스를 통해 동적으로 할당된 객체의 포인터를 반환. ex) return new WristWatch();

TimeKeeper *ptk = getTimeKeeper();
...
delete ptk;
~~~
이렇게 getter를 만들어 TimeKeeper 클래스 계통으로부터 동적으로 할당된 객체를 얻어와서 사용하고, delete 해주면...  
TimeKeeper 계통의 WristWatch를 가져왔을 때 이 WristWatch는 삭제되지 못한 채로 남게 된다.  
base 객체의 소멸자만 호출되기 때문이다. 이 경우를 C++ 표준에서 undefined behavior로 정의한다.

우리가 원하는 것은 포인터 변수의 자료형과 관계 없이 모든 소멸자가 호출되는 것이다.  
 따라서 <b>다형성을 가지는 기본 객체의 소멸자는 virtual로</b> 만들어 줘야 한다.  


  
*STL 컨테이너 타입(vector, list, set 등) 또한 가상 소멸자가 없는 클래스이다.  
이렇게 다형성을 갖도록 설계되지 않은 이들을 파생시켜서 뭔가 새로운 나만의 class를 만들게 된다면 소멸 단계에서 미정의 동작에 빠지게 될 수 있다.

