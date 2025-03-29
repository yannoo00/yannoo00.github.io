---
layout: post
title: "SWEA dijkstra + TSP"
categories: PS
tags: DP
---

## 문제 정보
- 문제 링크: [SWEA dijkstra + TSP](비공개)
- 난이도: <span style="color:#000000">pro</span>
- 완료일: 2025년 3월 26일
- 유형: DP
- 특이사항: 삼성전자 교육 문제

### 내 코드

```C++
#include <iostream>
#include <vector>
#include <string.h>
#include <cmath>
#include <algorithm>
#include <queue>

using namespace std;
typedef pair<int, int> pii;

const int INF = 987654321;

int n, k, s, e, m, full;
int dp[1 << 10][6]; //state, cur
int stops[7];
vector<pii> edges[501];

int mini_edges[7][7];
int dist[501];
priority_queue<pii, vector<pii>, greater<pii>> pq;

void init(int _n, int _k, int mRoadAs[], int mRoadBs[], int mLens[])
{    
> for (int i = 0; i < 501; ++i)
> {
> edges[i].clear();
> }
> n = _n;
> k = _k;

> for (int i = 0; i < k; ++i)
> {
> int v1 = mRoadAs[i];
> int v2 = mRoadBs[i];
> int cost = mLens[i];

> edges[v1].push_back({cost, v2}); //비용 최소 1
> edges[v2].push_back({ cost, v1 }); //비용 최소 1
> }
}

/* 1000번 호출
*/
void addRoad(int mRoadA, int mRoadB, int mLen)
{
> edges[mRoadA].push_back({ mLen, mRoadB });
> edges[mRoadB].push_back({ mLen, mRoadA });
}

/* state에서 e로 가는 최소 비용을 반환한다
*/
int DFS(int state, int cur)
{
> if (dp[state][cur]) //이미 여기서부터의 최소 비용을 구했다
> {
> return dp[state][cur];
> }

> if (state == full) //도착지에 왔다
> {
> return dp[state][cur] = mini_edges[cur][m+1];
> }

> int ret = INF;

> //경유점만 방문
> for (int i = 1; i <= m; ++i)
> {
> int next = i;
> int cost = mini_edges[cur][next];

> if (next == cur) continue;
> if (cost == INF || !cost) continue;
> if (state & (1 << (i-1))) continue; //이미 이 경유점 방문 했음
> 
> ret = min(ret,  DFS(state + (1 << (i-1)), next)+cost);
> }

> return dp[state][cur] = ret;
}

/* 50회 호출
*/
int findPath(int mStart, int mEnd, int M, int mStops[])
{
> memset(dp, 0, sizeof(dp));
> memset(mini_edges, 0, sizeof(mini_edges));

> s = mStart;
> e = mEnd;
> m = M;
> full = (1 << m) - 1;

> stops[0] = s; //시작점
> for (int i = 1; i <= m; ++i)
> {
> stops[i] = mStops[i-1];
> }
> stops[m+1] = e; //도착점

> //모든 쌍 최단거리 구하기 (m개의 정점에서 출발하는 다익스트라)
> 
> for (int i = 0; i <= m+1; ++i) //출발지 + 모든 경유지 + 도착지에 대한 최소 비용 dijkstra
> {
> for (int j = 0; j < 501; ++j)
> {
> dist[j] = INF;
> }

> int cur = stops[i];
> dist[cur] = 0;
> pq.push({ 0, cur });

> while (!pq.empty())
> {
> int v = pq.top().second;
> int c = pq.top().first;
> pq.pop();
> if (c > dist[v]) continue;

> if (i != 0 && v == s) continue; //출발점이나 도착점을 경유하는 경로는 고려하지 않는다..
> if (i != m + 1 && v == e) continue;//출발점이나 도착점을 경유하는 경로는 고려하지 않는다..

> int len = edges[v].size();
> for (int j = 0; j < len; ++j)
> {
> int next = edges[v][j].second;
> int edge_cost = edges[v][j].first;
> int next_cost = edge_cost + c;

> if (dist[next] > next_cost)
> {
> dist[next] = next_cost;
> pq.push({ next_cost, next });
> }
> }
> } // dist -> s에서 출발하는 최소 거리로 갱신 끝

> for (int j = 0; j <= m + 1; ++j)
> {
> mini_edges[i][j] = dist[stops[j]]; //자기 자신은 어차피 0
> //mini_edges[j][i] = dist[stops[j]];
> }
> }

> int ans = DFS(0, 0);

> if (ans != INF) return ans;
> return -1;
}
```

다익스트라 + TSP로 해결하는 문제.  
백준 23840 두 단계 최단경로 4 문제와 아주 유사하고, 한 가지 차이점만 있다.  

출발점과 도착점은 한 번 밖에 방문하지 못한다는 것.  
즉 이 점들을 경유하는 간선은 고려하면 안된다.  
따라서 다익스트라를 돌릴 때 빼줘야 한다.  

시간은 0.1초 정도로 빠르게 종료
