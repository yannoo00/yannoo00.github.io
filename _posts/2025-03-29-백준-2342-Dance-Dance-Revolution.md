---
layout: post
title: "백준 2342 Dance Dance Revolution"
categories: PS
tags: DP
---

## 문제 정보
- 문제 링크: [백준 2342 Dance Dance Revolution](https://www.acmicpc.net/problem/2342)
- 난이도: <span style="color:#FFA500">골드 3</span>
- 완료일: 2023년 6월 17일
- 유형: DP
- 특이사항: 재귀함수 에러 →오래 걸림

### 틀린 코드

{% highlight C++ %} {% raw %}
#include <iostream	
#include <algorithm	
#include <queue	
#include <cstdlib	

using namespace std;

int lowest;
int arr[100001];
int memo[2][100001];
int feet[2]; //0-	 left foot , 1-	 right foot. initial = 0, 0
int cnt; // length of sequence
int sum;
int l, r;

int Calculator(int left, int right, int target)
{
	int lc = 0; int rc= 0;
	
	if(abs(left - target)==2)
		lc = 4;
	else if(abs(left - target)==1 || abs(left - target)==3)
		lc = 3;
	else if(left - target == 0)
		lc = 1;
	
	if(abs(right - target)==2)
		rc = 4;
	else if(abs(right - target)==1 || abs(right - target)==3)
		rc = 3;
	else if(right - target == 0)
		rc = 1;
	
	if(!right)
		rc = 2;
	
	if(rc < lc)
	{
		lowest = rc;
		return 1;
	}
		
	else if(lc < rc)
	{
		lowest = lc;
		return 0;
	}
		
	else
	{
		lowest = lc;
		return 2;
	}
		
}

int DFS(int idx, int cost)
{
	int cur_feet[2] = {0,};
	cur_feet[0] = feet[0];
	cur_feet[1] = feet[1];
	
	if(idx == cnt) //cnt는 수열 길이만큼의 크기를 갖는다.
	{
		return cost;
	}
		
	
	int value = Calculator(feet[0], feet[1], arr[idx]);
	int cur_cost = lowest;
	int best = 0;
	
	if(value == 2)
	{
		feet[0] = arr[idx];
		int a;
		if(memo[0][idx+1]	0)
			a = memo[0][idx+1];
		else
			a= DFS(idx+1, cost+cur_cost);
		feet[0] = cur_feet[0]; 
		
		feet[1] = arr[idx+1];
		int b;
		if(memo[1][idx+1]	0)
			b = memo[1][idx+1];
		else
			b= DFS(idx+1, cost+cur_cost);
		feet[1] = cur_feet[1];
		
		if(a<=b)
		{
			memo[0][idx] = a;
			return a;
		}
		else
		{
			memo[1][idx] = b;
			return b;
		}
	}
	else
	{
		feet[value] = arr[idx];
		if(memo[value][idx+1]	0)
			best = memo[value][idx+1];
		else	
			best = DFS(idx+1, cost + cur_cost);
		feet[value] = cur_feet[value];
		
		memo[value][idx] = best;
		return best;
	}
}

int main(void)
{
	int k;
	
	while(true)
	{
		cin 		 k;
		if(!k)
			break;
		
		arr[cnt] = k;
		cnt++;
	}
	
	if(!arr[0])
	{
		cout << 0;
		return 0;
	}
	
	feet[0] = arr[0];
	cout << DFS(1, 2);
	
}

{% endraw %}{% endhighlight %}

DFS와 memoization을 활용해서 코드를 적어봤지만, 모든 경우를 다루지 못해 오답 처리 되었다.  
나는 매 선택마다 cost가 최소인 선택을 하고, 왼 발로 밟을 때와 오른 발로 밟을 때의 cost가 같다면 분기하는 식으로 코드를 짰는데 문제는 이처럼   
**그리디** 하게 항상 최저 cost를 선택하는 것이 최적 해가 아닌 경우가 있다는 것이다.

### 오답 코드 2

{% highlight C++ %} {% raw %}
#include <iostream	
#include <algorithm	
#include <cstdlib	

using namespace std;

int cnt; // length of sequence

int dp[5][5][100002];
int arr[100002];

//int MIN = 9999999;
int Calculator(int x, int y)
{
	if(x == 0)
		return 2;
	
	if(abs(x-y)==2)
		return 4;
	
	if(abs(x-y)==0)
		return 1;
	
	else
		return 3;
}

int DFS(int left, int right, int cost, int idx )
{	
	if(idx +1 == cnt)
	{		
//cout <<left<<right <<" / "<< cost << " return!"<<endl;
		return cost;	
	}
		
//cout << left << right <<"\n";
	
	int a = 999999, b = 999999;
	
	if(arr[idx] == arr[idx+1])
	{
		if(!dp[left][right][idx+1])
			a = DFS(left, right, cost+1, idx+1);
		else
			a = dp[left][right][idx+1];
		dp[left][right][idx] = a;
		//dp[right][left][idx] = a;
		return a;
	} 
		
		
	if(!dp[left][arr[idx+1]][idx+1] && left != arr[idx+1])
	{
		a = DFS( left, arr[idx+1], cost+Calculator(right, arr[idx+1]), idx+1);
	}
	else if(left != arr[idx+1])
	{
		a = dp[left][arr[idx+1]][idx+1];
	}
	if(!dp[arr[idx+1]][right][idx+1]&& right != arr[idx+1])
	{
		b = DFS( arr[idx+1], right, cost+Calculator(left, arr[idx+1]), idx+1);
	}
	else if(right != arr[idx+1])
	{
		b = dp[arr[idx+1]][right][idx+1];
	}	
	
	dp[left][right][idx] = min(a, b);
	
	return min(a, b);
}

int main(void)
{
	int k=0;
	
	cin 		 k;
	if(!k)
	{
		cout << 0;
		return 0;
	}
	else
		arr[cnt] = k;
	cnt++;
	
	while(true)
	{
		cin 		 k;
		if(!k)
			break;
		
		arr[cnt] = k;
		cnt++;
	}
	
	cout << min( DFS(arr[0], 0, 2, 0), DFS(0, arr[0], 2, 0) );	
}

{% endraw %}{% endhighlight %}

1%에서 바로 틀렸다고 한다. 도대체 뭐가 틀렸는지 모르겠다.

⇒ dp배열로 memoization 하는 과정을 없애고 DFS만 남긴 채 제출해봤더니 시간 초과를 받았다. 즉, dp배열을 활용하는 것에 문제가 있었던 것이다.  
left, right, idx가 같으면 cost도 같다고 가정했는데 이는 틀릴 수 밖에 없었다.  
  
**cost가 첫 호출부터 맨 마지막 호출까지 누적되며 기록되기 때문에, 어느 한 idx에서 두 발이 같은 위치에 놓였다 하더라도 앞선 호출에서 누적된 cost 값이 다르다면 뒤에 누적될 값도 당연히 그에 따라 달라질 수 밖에 없** 다!

애초에 어떻게 나머지 반례들이 통과됐는지 신기할 만큼 중대한 오류다. 어딘가 계속 재귀함수를 짜면서 위화감이 들었는데 그게 이 부분이었다.

### 오답 코드3

{% highlight C++ %} {% raw %}
#include <iostream	
#include <algorithm	
#include <cstdlib	

using namespace std;

int cnt; // length of sequence

int dp[5][5][100002];
int arr[100002];

//int MIN = 9999999;
int Calculator(int x, int y)
{
	if(x == 0)
		return 2;
	
	if(abs(x-y)==2)
		return 4;
	
	if(abs(x-y)==0)
		return 1;
	
	else
		return 3;
}

int DFS(int left, int right, int cost, int idx )
{	
	if(left == right)
		return 999999;
	
	if(idx == cnt-1) //다음index가 없고 자신이 마지막 index라면 cost를 return
	{	
		return 0;	
	}
	if(dp[left][right][idx]!=0) //이미 등장한 적 있는 dp라면.
	{
		return dp[left][right][idx];
	}

	if(arr[idx] == arr[idx+1]) //다음번 order도 현재와 같을 때 -	 지금 밟고 있는 발로 그대로 밟아야함 -	 밟은 판넬의 변화 X
	{
		dp[left][right][idx] = DFS(left, right, 1, idx+1) + cost;
		return dp[left][right][idx];
	} 
	else
	{
		dp[left][right][idx] 
		= min(DFS( left, arr[idx+1], Calculator(right, arr[idx+1]), idx+1),
		DFS( arr[idx+1], right, Calculator(left, arr[idx+1]), idx+1)) +cost;
		
		return dp[left][right][idx];
	}
}

int main(void)
{
	int k=0;
	
	cin 		 k;
	if(!k)
	{
		cout << 0;
		return 0;
	}
	else
		arr[cnt] = k;
	cnt++;
	
	while(true)
	{
		cin 		 k;
		if(!k)
			break;
		
		arr[cnt] = k;
		cnt++;
	}
	
	cout << DFS(arr[0], 0, 2, 0);	
}

{% endraw %}{% endhighlight %}

현재 자기 자신을 호출하는데 든 비용을 포함해서 dp배열에 포함하다보니, 같은 경우가 아님에도 같은 경우로 취급된다.  
자기 자신을 호출 할 때 든 비용은 배제하고 현재부터 앞으로 들 비용만을 담아야한다.  

### 정답 코드

{% highlight C++ %} {% raw %}
#include <iostream	
#include <algorithm	
#include <cstdlib	

using namespace std;

int cnt; // length of sequence

int dp[5][5][100002];
int arr[100002];

int Calculator(int x, int y)
{
	if(x == 0)
		return 2;
	
	if(abs(x-y)==2)
		return 4;
	
	if(abs(x-y)==0)
		return 1;
	
	else
		return 3;
}

int DFS(int left, int right,int idx )
{	
	if(left == right)
		return 999999;
	if(idx == cnt-1) //다음index가 없고 자신이 마지막 index라면 cost를 return
		return 0;	
	if(dp[left][right][idx]!=0) //이미 등장한 적 있는 dp라면.
		return dp[left][right][idx];

	dp[left][right][idx] 
	= min(DFS( left, arr[idx+1], idx+1) + Calculator(right, arr[idx+1]),
	DFS(arr[idx+1], right, idx+1) + Calculator(left, arr[idx+1]));
	
	return dp[left][right][idx];
}

int main(void)
{
	int k=0;
	
	cin 		 k;
	if(!k)
	{
		cout << 0;
		return 0;
	}
	else
		arr[cnt] = k;
	cnt++;
	
	while(true)
	{
		cin 		 k;
		if(!k)
			break;
		
		arr[cnt] = k;
		cnt++;
	}
	
	cout << DFS(arr[0], 0, 0) +2;	
}

{% endraw %}{% endhighlight %}

정말 너무 힘들게 풀었다. 거의 일주일 동안 백준 풀 틈이 나면 이 문제만 봤다.

지금 생각해보면 좀 어이가 없을 만큼 풀이는 복잡하지 않다. 여태껏 풀어본 DFS와 Memoization을 활용하는 문제들이 2차원 배열까지만 사용해서 해결할 수 있다는 것에 반해 이 문제는 3차원 배열을 써야 한다는 것이 다르다. 위 3번째 오답 코드에서 DFS함수의 매개변수 cost를 제거하고, 현재 포함 앞으로 필요할 cost가 아니라 앞으로 필요할 코스트만을 누적해서 전달하는 식으로 코드를 수정했다.

DP배열에 담은 것은 ‘**지금 index와 두 발의 상태로부터 마지막 index까지 방문하는데 필요한 최소 cost** ’ 이다.  
즉   
**‘지금의 상태(index, left, right)’를 출발점으로 가정** 한다. 현재 위치에 오는 데 필요했던 cost를 생각하지 않고 현재를 출발점으로 하여 끝까지 가는데에 얼만큼의 비용이 필요한지를 기록하는 것이다.  
이 코드로 처음 시도할 땐 현재 위치에 도달하는 데에 필요한 cost를 포함시킨 채로 DP 배열을 채웠다.   
그 결과 같은 위치에 왼 발, 오른 발이 있는 채로 같은 index에 도달한 시점이 있다고 하더라도, 앞서 어떤 과정을 거쳐서 현재 위치에 도달했는지에 따라 DP값이 달라질 수 있기 때문에 오류가 발생했다.  

DFS를 짜면서 머릿속으로 설계가 잘 안되어서 일단 짜면서 생각하는 식으로 구현했는데, 그 과정에서 제대로 세세하게 따져보지 못한 부분이 심각한 오류로 발견되었다. 또 왼발+오른발+인덱스까지 모두 같은 경우만을 기록했을 때 효과적으로 코드 수행 시간을 통과할 수 있을 만큼 줄여줄지 역시 확신하지 못했다. 완성된 결과만 놓고 보면 쉬운 코드인데 처음 러프하게 코드를 짜는 과정에서 쓸모없는 매개 변수 cost를 넣어두고 이후로 그것의 필요성을 의심하지 않았던게 아쉽다.

**가장 중요한 오류는 DP에 무엇을 표현한 것인지와 그 DP를 채우는 DFS함수의 작동 방식이 달랐다는 것이다!  
  
** 아무튼 끝내 잘 풀어서 뿌듯하다.

### 다른 코드

{% highlight C++ %} {% raw %}
#include<bits/stdc++.h	
using namespace std;
const int INF = 0x3f3f3f3f;

int n, i;
int dp[100001][5][5]{};

int calDist(int a, int b){ // a -	 b
	 if(a==b) return 1;
	 if(a==0) return 2;
	 a--, b--;
	 if((a+1)%4==b || (a+3)%4==b) return 3;
	 else if((a+2)%4 == b) return 4;
	 else return INF;
}

int main() {
	 ios_base::sync_with_stdio(0);
	 cin.tie(0);
	 
	 memset(dp, 0x3f, sizeof(dp));
	 dp[0][0][0] = 0;

	 for(i=1; ; i++){
	 cin		n;
	 if(n==0) break;
	 for(int x=0; x<5; x++) {
	 for(int y=0; y<5; y++){
	 if(dp[i-1][x][y]	=INF) continue;
	 int a = calDist(x,n);
	 int b = calDist(y,n);
	 dp[i][x][n] = min(dp[i][x][n], dp[i-1][x][y] + b); // y -	 n
	 dp[i][n][y] = min(dp[i][n][y], dp[i-1][x][y] + a); // x -	 n
	 }
	 }
	 }

	 i--;
	 int ans = INF;
	 for(int x=0; x<5; x++){
	 for(int y=0; y<5; y++){
	 ans = min(ans, dp[i][x][y]);
	 }
	 }
	 cout<<ans;
}

{% endraw %}{% endhighlight %}

재귀함수를 사용하지 않고 해결한 경우다.  
dp[l][r][idx] 는 내 코드에서와 마찬가지로 idx까지 입력받았을 때 l, r을 밟고 있는 경우를 뜻한다.  

**dp[i][x][n] = min(dp[i][x][n], dp[i-1][x][y] + b); // y - > n** **dp[i][n][y] = min(dp[i][n][y], dp[i-1][x][y] + a); // x - > n** 이 두 점화식이 핵심이다. y로 n번째를 밟는 경우 n-1번째의 x, y상태에서 y가 n으로 이동하는데 필요한 비용 만큼을 더한 값이 후보가 될 수 있고, 만일 이미 같은 상황을 계산한 적 있다면 그 때의 계산 값 역시 후보가 될 수 있다. 둘 중 더 작은 값을 취한다. x로 n번재를 밟는 경우도 마찬가지로 계산한다.  
x로 n을 밟는 경우와 y로 n을 밟는 경우를 모두 계산하기 때문에 1번째부터 n번째까지 순서대로 계산하지만 이미 방문한 곳을 다시 방문할 가능성이 있다.  

