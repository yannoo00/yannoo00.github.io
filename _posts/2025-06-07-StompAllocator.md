---
title:  "Stomp Allocator"
layout: post
excerpt: "Stomp Allocator"

categories:
  - C++
tags:
  - [C++]

toc: true
toc_sticky: true
 
date: 2025-06-07
last_modified_at: 2025-06-07
---

<br>

## Stomp Allocator

windows API인 virtualAlloc과 메모리 할당 위치 조정을 통한 overflow 방지 기능이 탑재된 Stomp allocator를 구현해보자.

```cpp
/*-------------------
	StompAllocator.h
-------------------*/

class StompAllocator
{
	enum { PAGE_SIZE = 0x1000 };

public:
	static void*	Alloc(int32 size);
	static void		Release(void* ptr);
};

/*-------------------
	StompAllocator.cpp
-------------------*/
/* ver_old
메모리 오버플로우를 잡지 못함. 메모리를 페이지 단위로 할당 받기 때문에 [ ]
요청한 메모리를 초과해서 건들여도 할당 받은 공간에 속한다면 에러 탐지 못함
객체가 할당되는 위치를 할당 받은 메모리의 끝에 맞도록 뒤에서 시작하게 한다면??
[111        ] -> [        111] 이렇게. 언더플로우는 못잡겠지만 overflow가 훨씬 잦음.
*/

void* StompAllocator::Alloc(int32 size)
{
	const int64 pageCount = (size + PAGE_SIZE - 1) / PAGE_SIZE; //반올림
	return ::VirtualAlloc(NULL, pageCount * PAGE_SIZE, MEM_RESERVE | MEM_COMMIT, PAGE_READWRITE);
}

void StompAllocator::Release(void* ptr)
{
	::VirtualFree(ptr, 0, MEM_RELEASE);
}
```
virtualAlloc은 windows API로, 페이지 단위로 메모리를 할당받을 수 있고 상태도 직접 지정 가능하다.  
페이지를 관리하는 페이지 테이블에 할당 받은 페이지를 접근 가능으로 표시한다.  

virtualFree(MEM_RELEASE)를 하게 되면 물리 메모리를 시스템에 반환한다. 그리고 페이지 테이블에서 해당 항목을 완전히 삭제한다.  
이 때문에 CPU에서 접근을 시도하면 페이지 테이블에서 해당 주소에 해당하는 페이지가 없고 page fault 발생, VMA(가상메모리영역)에도 해당 주소가 없기 때문에 Access Violation 에러가 발생한다.  

페이지 배수 단위로 작동하기 때문에 그보다 훨신 작은 데이터를 쓸 때 비효율적으로 동작할 수 있지만  
VirtualFree로 해제한 공간에는 아예 접근하는 것으로 오류가 발생하기 때문에 사용할 가치가 있다.  

```cpp
void* StompAllocator::Alloc(int32 size)
{
	const int64 pageCount = (size + PAGE_SIZE - 1) / PAGE_SIZE;
	const int64 dataOffset = pageCount * PAGE_SIZE - size;
	void* baseAddress = ::VirtualAlloc(NULL, pageCount * PAGE_SIZE, MEM_RESERVE | MEM_COMMIT, PAGE_READWRITE);
	return static_cast<void*>(static_cast<int8*>(baseAddress) + dataOffset);
}


void StompAllocator::Release(void* ptr)
{
	const int64 address = reinterpret_cast<int64>(ptr);
	const int64 baseAddress = address - (address % PAGE_SIZE);
	::VirtualFree(reinterpret_cast<void*>(baseAddress), 0, MEM_RELEASE);
}
```
페이지 단위로 받아오고 작은 메모리만 사용하게 되면 \[\[실제사용\]-------] 이렇게 메모리에 남는 공간이 생기고,  
실제 사용 영역에서 overflow가 발생해도 이를 탐지할 수 없게 된다. 
(overflow가 발생한다는 것은 그 자체로 잘못된 상황)  
이 때 사용할 공간의 size를 계산해서, 할당받은 page 크기에서 뺀 위치부터 메모리 할당을 시작한다면 ?

이제 메모리는 [-------[실제사용]] 이렇게 구조가 바뀌어서 overflow를 잡을 수 있게 된다.  
반대로 underflow를 못잡게 되지만, overflow가 훨씬 잦다는 점을 생각하면 이 방식이 유리하다.  



<br>
<br>
<br>
<br>
참고: _인프런 Rookiss_