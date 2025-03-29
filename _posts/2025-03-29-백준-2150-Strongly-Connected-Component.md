---
layout: post
title: "백준 2150 Strongly Connected Component"
categories: PS
tags: SCC
---

## 문제 정보
- 문제 링크: [백준 2150 Strongly Connected Component](https://www.acmicpc.net/problem/2150)
- 난이도: <span style="color:#000000">플레티넘5</span>
- 완료일: 2023년 11월 15일
- 유형: SCC
- 특이사항: 종만북 SCC 참조

### 내 코드

{% highlight C++ %} {% raw %}
```C++
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <stack>

using namespace std;

int v1, v2, v, e, sccCnt, vertexCnt;
vector<int> graph[10001];
vector<int> SCC;
vector<int> discovered;
vector<int> ans[10001];
bool printed[10001];
stack<int> st;

int Sequence(int node)
{
	int seq = discovered[node] = vertexCnt++;
	st.push(node);
	
	for(int i=0; i<graph[node].size(); i++)
	{
		int next = graph[node][i];
		
		if(discovered[next] == -1)
		{
			seq = min(seq, Sequence(next));
		}
		else if(SCC[next] == -1)
		{
			seq = min(seq, discovered[next]);
		}
	}
	
	if(seq == discovered[node])
	{
		while(true)
		{
			int t = st.top();
			st.pop();
			SCC[t] = sccCnt;
			ans[sccCnt].push_back(t);
			
			if(t == node) break;
		}
		++sccCnt;
	}
	
	return seq;
}

int main(void)
{
	ios::sync_with_stdio(false); cin.tie(NULL);
	
	cin >> v >> e;
	SCC = discovered = vector<int>(10001, -1);
	
	for(int i=0; i<e; i++)
	{
		cin >> v1 >> v2;
		graph[v1].push_back(v2);
	}
	
	for(int i=1; i<=v; i++)
	{
		if(discovered[i] == -1)
		{
			Sequence(i);
		}
	}
	
	cout << sccCnt <<"\n";
	
	for(int i=0; i<=v; i++)
	{
		if(printed[SCC[i]] == false && ans[SCC[i]].size()>0)
		{
			sort(ans[SCC[i]].begin(), ans[SCC[i]].end());
			for(int j=0; j<ans[SCC[i]].size(); j++)
			{
				cout << ans[SCC[i]][j] <<" ";
			}
			cout << "-1\n";
			printed[SCC[i]] = true;
		}
	}
}
```
{% endraw %}{% endhighlight %}

SCC를 찾고 분리하는 문제.  
SCC 개념과 그 분리 방법 -   
**타잔 알고리즘** 을 연습하는 문제인데, 늘 그렇듯 구현보단 코드 이해가 어렵다.

SCC란, 문제 제목인 Strongly Connected Component의 약자로 강결합 컴포넌트라고 한다.  
방향 그래프에서 정의되는 개념으로 두 정점 u, v에 대해 양 방향으로 가는 경로가 모두 있을 때 두 정점은 같은 SCC에 속해 있다고 말한다.  
따라서 같은 SCC에 속한 정점들 끼리는 u → v로 이동 후 다시 u로 돌아올 수 있어야 한다. 한 사이클에 포함되어 있으면 같은 SCC인 것이다.  

타잔 알고리즘은 SCC끼리 묶어주기 위해, DFS로 그래프를 탐색하면서 각 간선을 타고 이동할 때마다 지금 이 간선을 잘라 한 묶음의 SCC를 분리시킬 것인가를 **반환될 때** 결정한다. 만약 그 간선(u→v)을 자르기로 했다면 v와 연결된 모든 정점들을 v와 한 묶음으로 묶는다. 이 때 v의 자식들(v를 루트로하는 서브트리의 간선)들은, 반환 시점에 자를지 말지를 결정하기 때문에, 이미 잘려야 할 곳이 잘린 상태이고 따라서 v를 루트로 연결 가능한 정점들은 모두 v와 같은 SCC가 된다.

그렇다면 어떤 간선을 자를지 말지 여부는 어떻게 결정하나?  
u→v를 자른다는 것은 v→u로 이동하는 경로가 없다는 것이므로 v를 루트로 하는 서브 트리를 탐색하며 만나는 역방향 간선(자손→선조로 향하는 간선)으로 도달할 수 있는 가장 높은 정점(방문 순서가 빠른 정점)을 찾는다.  
만약 그 정점이 u와 같거나 그보다 높이 있는 정점이라면, 사이클이 생기므로 u→v를 자르면 안되는 것이다.  
만일 역방향 간선이 없더라도, 교차 간선(자손, 선조 관계가 아닌 정점들 사이의 간선)이 존재하고 그 교차 간선이 향하는 정점이 아직 SCC를 부여 받지 않은, 즉 아직 한 묶음으로 묶이지 않은 정점이라면 이 경우에도 u→v를 끊을 수 없다.  
SCC로 묶이지 않았다는 것은 아직 사이클의 끝을 확인하지 못했다(이어지는 정점을 찾지 못해 반환하는 과정을 아직 겪지 않았다)는 것이고 현재 탐색 중인 서브트리도 그 사이클에 포함된다는 것이다.  
반대의 경우로 교차 간선으로 연결된 다른 서브트리가 만약 다른 SCC라면 무조건 먼저 탐색이 끝나(반환 시에 간선의 절단 여부를 결정하므로) SCC 번호를 부여 받았을 것이다.  

따라서, DFS로 만나는 간선을 자를지 말지는

  1. 서브 트리의 역방향 간선이 검사 대상 간선의 출발 정점보다 높은 정점에 도달하는 경우

  2. 서브 트리의 교차 간선이 아직 SCC에 속하지 않은(그러나 방문은 먼저 한) 정점에 닿는 경우

이렇게 두 가지를 검사한 후 결정할 수 있다. 1이나 2에 해당하면 절단하지 않는다.

Sequence 함수는, 파라미터로 받은 정점을 루트로 하는 서브 트리의 정점 중 간선을 통해 이동해서 방문할 수 있는 가장 높은(방문 순서가 빠른) 정점의 방문 순서를 반환한다.  
DFS로 탐색한 결과 현재 정점이 가장 방문 순서가 빠른 정점이라면, 현재 정점을 루트로 하는 서브트리에 남아 있는 정점들을 모두 하나의 컴포넌트로 묶는 것이다(이 때 stack을 이용, 현재 노드가 나올때까지 pop해서 한 컴포넌트에 넣는다).   

재귀적으로 함수가 호출되고 반환 부분에서 컴포넌트를 묶기 때문에, 가장 먼저 호출된 루트 노드의 서브 트리들의 컴포넌트들은 먼저 stack에서 빠져 있게 된다.
