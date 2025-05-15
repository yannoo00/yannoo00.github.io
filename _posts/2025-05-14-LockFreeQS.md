---
title:  "Lock Based Queue, Stack"
layout: post
excerpt: "Lock Based Queue, Stack"

categories:
  - Network
tags:
  - [Network]

toc: true
toc_sticky: true
 
date: 2025-05-13
last_modified_at: 2025-05-13
---

<br>

### Lock Free 자료구조 구현

lock을 사용하지 않고 stack, queue 같은 자료구조를 만들 수 있을까?  
가능은 하다.  
하지만 구현을 위한 비용 대비 효율이 나오지 않기 때문에 굳이...  


```cpp
// Lock Free - Stack 
template<typename T>
class LockFreeStack
{

	struct Node
	{
		Node(const T& value) : data(value)

		T data;
		Node* next;
	};

public:
	

	void Push(const &T value)
	{
		Node* node = new Node(value);
		//next로 헤드 옮기고
		node->next = _head;
		//헤드에 새 node 넣는 사이에 다른 node가 들어올 수 있다.
		//_head = node;

		// _head가 node->next와 같은지 검사. 같다면, node를 _head에 넣어주고 return true. => 이걸 atmoic하게 해주는게 compare_exchange~
		while (_head.compare_exchange_weak(node->next, node) == false)
		{
			// node -> next = _head;
		}
	}

	/*
	1. head 읽기
	2. head->next 읽기
	3. head = head->next
	4. data 추출해서 반환
	5. 추출한 노드 삭제
	*/
	bool TryPop(const &T value)
	{
		Node* oldHead = _head;


		while (oldHead && _head.compare_exchange_weak(oldHead, oldHead->next) == false)
		{
			//oldHead = _head;
		}
		if (oldHead == nullptr) 
			return false;

		// 여기서 발생하는 Exception은 터지게 냅두고 잡는게 낫다
		value = oldHead->data;
		
		//이렇게 바로 삭제하다가 다른 스레드가 head에 접근한 상태로 삭제하게 되면 crash
		// C#, JAVA 같이 GC가 있으면 사실 여기서 메모리 삭제 신경 안쓰고 종료해도 됨. 
		delete oldHead;

		return true;
	}


private:
	
	atomic<Node*> _head;
};
```
atomic으로 헤드를 만들고, compare_exchange를 활용해서 아토믹하게 새 value 를 head에 넣어준다.  
old head를 head의 next로 밀고, head에 새 value를 넣는 과정이 compare exchange를 사용하지 않으면  
원자성이 보장되지 않기 때문에 전혀 다른 값이 head에 들어오는 상황이 발생할 수 있다.  

Pop의 경우에도 내가 pop 하려는 대상이 제대로 선택되었는지 검사해줘야 한다.  
하지만 delete의 경우도 간단하지 않다.  
별다른 조치 없이 무작정 delete 하면 다른 스레드가 delete 된 head에 접근하고 있는 상황이 발생한다.  


### 개선된 Try Pop

```cpp

//LockFreeStack 클래스의 함수

	// 1. 데이터 분리
	// 2. count 체크 
	// 3. 나 혼자면 삭제
	bool TryPop(T &value)
	{
		++_popCount;

		Node* oldHead = _head;

		while (oldHead && _head.compare_exchange_weak(oldHead, oldHead->next) == false)
		{
			//oldHead = _head;
		}
		if (oldHead == nullptr)
		{
			--_popCount;
			return false;
		}
			
		//이 때의 oldHead는 compare_ 과정에서 stack에서 빠져나온 나만의 oldHead
		value = oldHead->data;
		TryDelete(oldHead);
		
		return true;
	}

	void TryDelete(Node* oldHead)
	{
		// 나 외에 누가 있는지 검사  
		if (_popCount == 1)
		{
			// 나 혼자네?
			// 삭제 예약된 노드들 삭제 시도
			Node* node = _pendingList.exchange(nullptr);
			if (--_popCount == 0)
			{
				// 끼어든 애가 없다 -> 삭제 진행 
				// list 데이터는 이미 분리해둔 상태 

				DeleteNodes(node);
			}
			else if(node)
			{
				// 누가 끼어 들었으니 다시 데이터 갖다 놓자 
				ChainPendingNodeList(node);
			}
			// 내 데이터 삭제 
			delete oldHead;
		}
		else 
		{
			//누가 있다. 삭제 예약만. 
			ChainPendingNode(oldHead);
			--_popCount;
		}
	}

	void ChainPendingNodeList(Node* first, Node* last)
	{
		last->next = _pendingList;

		while (_pendingList.compare_exchange_weak(last->next, first) == false)
		{
			
		}
	}

	void ChainPendingNodeList(Node* node)
	{
		Node* last = node;
		while (last->next)
			last = last->next;

		ChainPendingNodeList(node, last);
	}

	void ChainPendingNode(Node* node)
	{
		ChainPendingNodeList(node, node);
	}


	static void DeleteNodes(Node* node)
	{
		while (node)
		{
			Node* next = node->next;
			delete node;
			node = next;
		}
	}


private:
	
	atomic<Node*> _head;
	atomic<uint32> _popCount = 0;
	atomic<Node*> _pendingList; //삭제할 노드(첫번째 ptr, next, next, ... )
//...
```

popCount로 현재 데이터에 접근하고 있는 스레드의 숫자를 파악한다.  
TryPop에서 compare ex~ 로 oldHead를 stack에서 분리했으므로 다른 스레드에서 접근할 방법이 ㅇ없게 된다.   

이후 Delete를 시도하면서 Pop에 들어간 스레드가 없는지 popCount로 검사,  
없다면 list에 있는 예약 대기 목록까지 삭제를 시도한다.  

<br>
<br>
<br>
<br>

참고: _인프런 Rookiss_