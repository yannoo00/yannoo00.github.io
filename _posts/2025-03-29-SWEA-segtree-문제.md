---
layout: post
title: "SWEA segtree 문제"
categories: PS
tags: 인덱스 트리
---

## 문제 정보
- 문제 링크: (비공개)
- 난이도: <span style="color:#000000">pro</span>
- 완료일: 2025년 3월 19일
- 유형: 인덱스 트리
- 특이사항: 삼성전자 교육 문제

### 내 코드

{% highlight C++ %} {% raw %}
```C++
#include <iostream>
#include <vector>
#include <algorithm>
#include <string>

using namespace std;
typedef pair<int, int> pii;
typedef pair<int, pii> pipii;

int n;

pipii tree[800000]; //{합, {최대, 최소}}
int arr[200001];

void BuildTree(int node, int l, int r)
{
	if (l == r)
	{
		tree[node].first = arr[l]; //합
		tree[node].second.first = arr[l]; //최대
		tree[node].second.second = arr[l]; //최소
		return;
	}
	
	int mid = (l + r) / 2;
	int lc = node * 2;
	int rc = node * 2 + 1;

	BuildTree(lc, l, mid);
	BuildTree(rc, mid + 1, r);

	tree[node].first = tree[lc].first + tree[rc].first;
	tree[node].second.first = max(tree[lc].second.first, tree[rc].second.first);
	tree[node].second.second = min(tree[lc].second.second, tree[rc].second.second);
}

int getSum(int node, int l, int r, int targetL, int targetR)
{
	if (targetR < l || r < targetL) return 0;

	if (targetL <= l && r <= targetR)
	{
		return tree[node].first;
	}

	int mid = (l + r) / 2;
	return getSum(node * 2, l, mid, targetL, targetR) + getSum(node * 2 + 1, mid + 1, r, targetL, targetR);
}

pii getDiff(int node, int l, int r, int targetL, int targetR)
{
	if (targetR < l || r < targetL) return { 0, 1987654321 };

	if (targetL <= l && r <= targetR)
	{
		return { tree[node].second.first, tree[node].second.second };
	}

	int mid = (l + r) / 2;
	int lc = node * 2;
	int rc = node * 2 + 1;

	pii mmL = getDiff(lc, l, mid, targetL, targetR);
	pii mmR = getDiff(rc, mid + 1, r, targetL, targetR);

	int MAX = max(mmL.first, mmR.first);
	int MIN = min(mmL.second, mmR.second);

	return {MAX, MIN};
}

void Update(int node, int l, int r, int target, int val)
{
	if (target < l || r < target) return;

	if (target == l && target == r)
	{
		arr[l] += val;
		tree[node].first += val;
		tree[node].second.first += val;
		tree[node].second.second += val;
		return;
	}

	int mid = (l + r) / 2;
	int lc = node * 2;
	int rc = node * 2 + 1;

	Update(lc, l, mid, target, val);
	Update(rc, mid + 1, r, target, val);

	tree[node].first += val;
	tree[node].second.first = max(tree[lc].second.first, tree[rc].second.first);
	tree[node].second.second = min(tree[lc].second.second, tree[rc].second.second);
}

void init(int N, int mSubscriber[]) {
	n = N;
	//int sum = 0;
	for (int i = 0; i < n; ++i)
	{
		arr[i+1] = mSubscriber[i];
		//sum += mSubscriber[i];
	}

	BuildTree(1, 1, n);

	//cout << tree[1].first << " " << sum << endl;
	return;
}

int subscribe(int mId, int mNum) {

	Update(1, 1, n, mId, mNum);

	return arr[mId];
}

int unsubscribe(int mId, int mNum) {

	Update(1, 1, n, mId, -mNum);

	return arr[mId];
}

int count(int sId, int eId) {

	return getSum(1, 1, n, sId, eId);
}

int calculate(int sId, int eId) {
	pii mm = getDiff(1,1,n,sId,eId);
	return mm.first - mm.second;
}
```
{% endraw %}{% endhighlight %}

일반적인 seg tree 문제에 MIX/MAX/SUM을 한 번에 들고 있도록 한다.

노드를 지금처럼 pipii로 구성하거나 struct로 만들어서 하나의 배열로 들고 갈 수도 있고,  
최대/최소/합을 모두 따로 배열로 만들 수도 있다(cpp에서는 속도도 딱히 차이가 나지 않는다).  

하지만 java 에서 만약 변수 3개 가지는 class로 노드 배열을 만들었다면?   
객체형 배열은 실 메모리가 아니라 주소만 보관하는 배열이 만들어지기 때문에 속도가 더 느리다.   
따라서 기본 자료형으로 만들 수 있으면 최대한 기본형 활용하는게 좋다 (cpp는 struct를 실제 메모리에 담음)  

