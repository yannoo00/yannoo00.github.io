---
title:  "Lock Free Stack 2"
layout: post
excerpt: "Lock Free Stack 2"

categories:
  - Network
tags:
  - [Network]

toc: true
toc_sticky: true
 
date: 2025-05-17
last_modified_at: 2025-05-17
---

<br>

### Lock Free Stack - GC를 이용할 수 없나??

C#이나 JAVA에서는 골치 아픈 delete를 생각하지 않아도 ref만 끊어두면   
 Garbage Collection에게 삭제를 맡길 수 있다고 했다.  

Shared Pointer를 사용하면 비슷한 맥락으로 구현할 수 있지 않을까?


```cpp
#pragma once

#include <mutex>

template<typename T>
class LockStack
{
public:
	LockStack() {}
	LockStack(const LockStack&) = delete;
	LockStack& operator=(const LockStack&) = delete;

	void Push(T value)
	{
		lock_guard<mutex> lock(_mutex);
		_stack.push(std::move(value));
		_condVar.notify_one();
	}

	//멀티스레드에서는 empty 보고 pop을 하려고 해도 empty가 보장 못해줌. 
	bool Empty()
	{
		lock_guard <mutex> lock(_mutex);
		return _stack.empty();
	}

	bool TryPop(T& value)
	{
		lock_guard<mutex> lock(_mutex);
		if (_stack.empty())
		{
			return false;
		}

		value = std::move(_stack.top());
		_stack.pop();

		return true;
	}

	//condition을 이용해 empty == true일 때까지 대기
	void WaitPop(T& value)
	{
		unique_lock<mutex> lock(_mutex);
		_condVar.wait(lock, [this] { return _stack.empty() == false; });
		value = std::move(_stack.top());
		_stack.pop();
	}


private:
	stack<T> _stack;
	mutex _mutex;
	condition_variable _condVar;
};


// Lock Free - Stack 
// 성능 뛰어나진 않음.
template<typename T>
class LockFreeStack
{
	struct Node
	{
		Node(const T& value) : data(make_shared<T>(value)), next(nullptr)
		{

		}

		shared_ptr<T> data;
		shared_ptr<Node> next;
	};


public:
	
	void Push(const T &value)
	{
		shared_ptr<Node> node = make_shared<Node>(value);
		node->next = std::atomic_load(&_head); //꺼내올 때 ref 카운터 ++ 해줘야 메모리 지킬 수 있음
		while (std::atomic_compare_exchange_weak(&_head, &node->next, node) == false)
		{
		}
	}

	shared_ptr<T> TryPop()
	{
		shared_ptr<Node> oldHead = std::atomic_load(& _head);

		while (oldHead && std::atomic_compare_exchange_weak(&_head, &oldHead, oldHead->next) == false)
		{
		}

		if (oldHead == nullptr)
			return shared_ptr<T>();
		else
			return oldHead->data;
	}
	
	
private:
	
	shared_ptr<Node> _head;
	
};
```

shared_ptr을 활용해서 stack을 구현했다. 제대로 동작은 하지만 shared ptr의 ref count 관리가 lock을 이용하기 때문에 lock-free인 것은 아니다.  
완벽한 lock free를 위해서, GC를 직접 적용하기 위해 reference count를 구현해보자.


### 개선된 Try Pop

```cpp

#pragma once

#include <mutex>

template<typename T>
class LockStack
{
public:
	LockStack() {}
	LockStack(const LockStack&) = delete;
	LockStack& operator=(const LockStack&) = delete;

	void Push(T value)
	{
		lock_guard<mutex> lock(_mutex);
		_stack.push(std::move(value));
		_condVar.notify_one();
	}

	//멀티스레드에서는 empty 보고 pop을 하려고 해도 empty가 보장 못해줌. 
	bool Empty()
	{
		lock_guard <mutex> lock(_mutex);
		return _stack.empty();
	}

	bool TryPop(T& value)
	{
		lock_guard<mutex> lock(_mutex);
		if (_stack.empty())
		{
			return false;
		}

		value = std::move(_stack.top());
		_stack.pop();

		return true;
	}

	//condition을 이용해 empty == true일 때까지 대기
	void WaitPop(T& value)
	{
		unique_lock<mutex> lock(_mutex);
		_condVar.wait(lock, [this] { return _stack.empty() == false; });
		value = std::move(_stack.top());
		_stack.pop();
	}


private:
	stack<T> _stack;
	mutex _mutex;
	condition_variable _condVar;
};


// Lock Free - Stack 
// 성능 뛰어나진 않음.
template<typename T>
class LockFreeStack
{
	struct Node;

	struct CountedNodePtr
	{
		int32 externalCount = 0;
		Node* ptr = nullptr; 
	};


	struct Node
	{
		Node(const T& value) : data(make_shared<T>(value))
		{

		}

		shared_ptr<T> data;
		atomic<int32> internalCount = 0;
		CountedNodePtr next;
	};


public:

	void Push(const T& value)
	{
		CountedNodePtr node;
		node.ptr = new Node(value);
		node.externalCount = 1;

		node.ptr->next = _head;
		while (_head.compare_exchange_weak(node.ptr->next, node) == false)
		{
		}
	}

	shared_ptr<T> TryPop()
	{
		CountedNodePtr oldHead = _head;
		while (true)
		{
			//참조권 획득
			IncreaseHeadCount(oldHead);

			//최소한 extnernalCount >=2 일테니 삭제X
			Node* ptr = oldHead.ptr;
			if (ptr == nullptr)
				return shared_ptr<T>();

			//소유권 획득 
				// node pointer와 counter값 까지 같아야 완전히 같은 것.
			if (_head.compare_exchange_strong(oldHead, ptr->next))
			{
				shared_ptr<T> res;
				res.swap(ptr->data);

				//꺼내 쓴 노드를 삭제해도 되나? (다른 애가 접근하고 있지 않음이 보장되어야 함)
				// 나 말고 누가 있는지 체크
				const int32 countIncrease = oldHead.externalCount - 2;

				if (ptr->internalCount.fetch_add(countIncrease) == -countIncrease)
					delete ptr;

				return res;
			}
			else if(ptr->internalCount.fetch_sub(1) == 1)
			{
				//참조권은 얻었으나 소유권은 실패
				delete ptr;
			}
		}
	}


private:
	void IncreaseHeadCount(CountedNodePtr& oldCounter)
	{
		while (true)
		{
			CountedNodePtr newCounter = oldCounter;
			newCounter.externalCount++; 

			if (_head.compare_exchange_strong(oldCounter, newCounter))
			{
				oldCounter.externalCount = newCounter.externalCount;
				break;
			}
		}
	}


private:
	
	atomic<CountedNodePtr> _head;
	
};
```

delete을 진행할 때, 나만이 사용하고 있는지 확인해야 하고 이는 다음과 같이 이뤄진다.    
1. external은 누군가 node에 접근하면 ++ 된다.  
2. 나만 이 노드에 접근했다면 external은 만들 때 1, 접근할 때 1 더해져서 2가 된다.  
3. 여기서 내가 더하게 되는 2만큼 뺀 값을 countIncrease로 하고, 이 값이 internalCount와 같다면(2-2 = 0) delete한다.
4. 그렇지 않다면 다른 누군가 접근해서 external에 ++한 것이므로 return한다.  
*(fetch_ ~ 는 마치 return count++ 처럼 계산은 적용되지만 지금 뱉는 값은 증가/감소하기 전의 값이다.)  





<br>
<br>
<br>
<br>

참고: _인프런 Rookiss_