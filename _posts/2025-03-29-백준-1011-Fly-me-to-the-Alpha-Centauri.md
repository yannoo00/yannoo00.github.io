---
layout: post
title: "백준 1011 Fly me to the Alpha Centauri"
categories: PS
tags: 수학
---

## 문제 정보
- 문제 링크: [백준 1011 Fly me to the Alpha Centauri](https://www.acmicpc.net/problem/1011)
- 난이도: <span style="color:#FFA500">골드5</span>
- 완료일: 2024년 3월 4일
- 유형: 수학

### 내 코드

{% highlight C++ %} {% raw %}
#include<iostream	
#include<string.h	

using namespace std;

int x, y;

int main()
{    
	 int t;
	 cin 		 t;
	 for(int test=0; test<t; test++)
	 {
	 cin 		 x 		 y;
	 long long diff = y-x;
	 long long k=1;

	 while((k*k) < diff)
	 {
	 k++;
	 }
	 if((k*k) 	 diff)
	 k--;

	 if(diff == k*k)
	 {
	 cout << k*2-1 << "\n";
	 }
	 else if(diff - k*k 	 k)
	 {
	 cout << k*2-1 +2 << "\n";
	 }
	 else
	 cout << k*2-1 +1 << "\n";
	 }
}

{% endraw %}{% endhighlight %}

1699 문제와 동일.
