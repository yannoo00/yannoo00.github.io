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

### Lock 기반 자료구조 구현



```cpp
#include "pch.h"
#include <iostream>
#include "CorePch.h"
#include <thread>
#include <atomic> 
#include <mutex>
#include <windows.h>
#include <future>

using namespace std;


queue<int32> q;
stack<int32> s;

void Push()
{
	while (true)
	{
		int32 value = rand() % 100;
		q.push(value);

		this_thread::sleep_for(10ms);
	}
}

void Pop()
{
	while (true)
	{
		if (q.empty()) continue;

		int32 data = q.front();
		q.pop();
		cout << data << endl;
	}
}


int main()
{
	thread t1(Push);
	thread t3(Pop);
	thread t2(Pop);

	t1.join();
	t2.join();
}

```
분명 if를 걸어줬지만 lock을 따로 사용하지 않으면 empty==false로 contiue를 지나왔는데 데이터가 비어있는 경우가 생길 수 있다.  
두 pop 스레드가 if문을 거의 동시에 지나오는 경우가 발생하기 때문이다.  

따라서 queue 등을 직접 lock 기반으로 구현하여 활용하면 편리하다.  




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


```
push, pop을 할 때마다 내부에서 lock을 잡아주도록 구현했다.  
현재 자료구조가 empty인지 확인해봤자 멀티스레드에서는 확인 이후 pop까지의 과정에서 무슨 일이 일어날지 알 수 없기 때문에 의미가 없다.  
따라서 pop할 수 없는 상황(빈 상황)을 가정하고 구현한다.  
WaitPop의 경우 condition 변수를 사용하여 empty인지 무한 확인할 필요 없이 대기하다가 notify를 받고 움직이게 된다.  


<br>
<br>
<br>
<br>

참고: _인프런 Rookiss_