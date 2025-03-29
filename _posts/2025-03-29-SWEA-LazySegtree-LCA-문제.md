---
layout: post
title: "SWEA LazySegtree, LCA 문제"
categories: PS
tags: LCA
---

## 문제 정보
- 문제 링크: (비공개)
- 난이도: <span style="color:#000000">pro</span>
- 완료일: 2025년 3월 19일
- 유형: LCA
- 특이사항: 삼성전자 교육 문제 / https://book.acmicpc.net/ds/segment-tree-lazy-propagation

{% highlight C++ %} {% raw %}
```C++
#include<iostream>
#include<vector>
#include<algorithm>
#include<string>
#include<unordered_map>

using namespace std;
typedef pair<int, int> pii;
const int MAXN{ 1000000 };

unordered_map<string, int> name_to_num;
vector<pii> node[12002]; //{노드 번호, {출생일, 사망일}}
int parent[12001]; //직계 부모 저장
int depth[12001]; //트리 상 깊이 저장 
int n;

// lazy Segtree
int lazy[4000000]; // lazy 계산 값 저장
int tree[4000000]; // 구간 합 저장(start~end에 몇 개의 노드가 있는지)

void UpdateLazy(int node, int start, int end)
{
	if (lazy[node])
	{
		tree[node] += (end - start + 1) * lazy[node];
		if (start != end)
		{
			lazy[node * 2] += lazy[node];
			lazy[node * 2 + 1] += lazy[node];
		}
		lazy[node] = 0;
	}
}

void UpdateTree(int node, int start, int end, int targetL, int targetR)
{
	UpdateLazy(node, start, end); //방문하게 되면 lazy값 계산해서 값 정상화

	if (end < targetL || targetR < start) return;

	if (targetL <= start && end <= targetR)
	{
		tree[node] += (end - start + 1) * 1;
		if (start != end) //내 자식들도 1씩 더해줘야 함
		{
			lazy[node * 2] += 1;
			lazy[node * 2 + 1] += 1;
		}
		return;
	}

	int mid = (start + end) / 2;
	int left = node * 2;
	UpdateTree(left, start, mid, targetL, targetR);
	UpdateTree(left + 1, mid + 1, end, targetL, targetR);

	tree[node] = tree[left] + tree[left+1];
	return;
}

int getTree(int node, int start, int end, int targetL, int targetR)
{
	UpdateLazy(node, start, end);
	
	if (end < targetL || targetR < start) return 0;

	if (targetL <= start && end <= targetR)
	{
		return tree[node];
	}

	int left = node * 2;
	int mid = (start + end) / 2;
	int l = getTree(left, start, mid, targetL, targetR);
	int r = getTree(left+1, mid+1, end, targetL, targetR);
	return l+r;
}

void init(char mAncestor[], int mDeathday)
{
	n = 1;
	name_to_num.clear();
	for (int i = 0; i <= 12000; ++i)
	{
		depth[i] = 0;
		parent[i] = 0;
		node[i].clear();
	}
	memset(lazy, 0, sizeof(lazy));
	memset(tree, 0, sizeof(tree));
	//~초기화

	string s = mAncestor;
	name_to_num[mAncestor] = 1;

	node[1].push_back({0, mDeathday});
	//cout << tree[1];
	UpdateTree(1, 0, MAXN, 0, mDeathday);
	//cout<<" " << tree[1] << " " << getTree(1, 1, MAXN, 1000, 1000) <<endl;
	return;
}

/* 12,000번 이하 호출
선조로부터 최대 거리 2,000
최대 생존일 1,000,000
*/
int add(char mName[], char mParent[], int mBirthday, int mDeathday)
{
	++n; //새로운 n번째 노드 추가됨 
	
	string p = mParent;
	int pnum = name_to_num[p];

	string child = mName;
	name_to_num[child] = n;
	parent[n] = pnum;

	node[n].push_back({ mBirthday, mDeathday });
	depth[n] = depth[pnum] + 1;

	//cout << "Added " << mBirthday << "~" << mDeathday << endl;
	UpdateTree(1, 0, MAXN, mBirthday, mDeathday); //이 구간에 +1 해주면 됨 (무조건 +1 이라 따로 값 전달 필요 없음)
	//cout << tree[1] << endl;

	return depth[n];
}

/* 50,000번 이하 호출(매번 n으로 한 칸씩 거슬러 올라가도 2,000 * 50,000 = 100,000,000)
*/
int distance(char mName1[], char mName2[])
{
	string s1 = mName1; 
	string s2 = mName2;

	int n1 = name_to_num[s1];
	int n2 = name_to_num[s2];

	if (depth[n1] < depth[n2])
	{
		swap(n1, n2);
	}
	
	int dist = 0;

	//n1이 더 깊이 있는 노드
	while (depth[n1] > depth[n2])
	{
		n1 = parent[n1];
		++dist;
	}

	//깊이만 맞춰줬는데 같아졌다
	if (n1 == n2)
	{
		return dist;
	}
	
	//같이 한 단계씩 위로 올리기
	while (n1 != n2)
	{
		n1 = parent[n1];
		n2 = parent[n2];
		dist += 2;
	}

	return dist;
}

/* 30,000번 이하 호출
*/
int count(int mDay)
{
	return 	getTree(1, 0, MAXN, mDay, mDay); // 1부터 100만까지 범위 중 mDay~mDay의 합;
}

```
{% endraw %}{% endhighlight %}

Lazy Segment tree를 사용해야 해결할 수 있는 문제

0부터 100만일까지의 leaf node를 0으로 두고,  
새로운 미생물이 추가되면서 그 생물의 생존주기(출생일~사망일)이 추가되면  
그 기간에 해당하는 tree 노드들을 모두 update해준다.  
이 때 update 를 한 노드씩 하게 되면 그냥 배열을 수정하는 것보다 느리다(N log N).   

따라서 lazy update로 값 수정 사항을 모았다가 한 번에 수정한다.

**최적화** 최대/최소가 아닌 부분합만 계산하면 되기 때문에 펜윅트리 사용하면 더 빠르다.  
add 되었을 때 두 번의 업데이트 호출. (생존날~마지막까지 +1, 죽은 날 ~마지막까지 -1)  

