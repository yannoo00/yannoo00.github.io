---
layout: post
title: "알고스팟 BOARDCOVER"
categories: PS
tags: 브루트 포스
---

## 문제 정보
- 문제 링크: [알고스팟 BOARDCOVER](https://www.algospot.com/judge/problem/read/BOARDCOVER)
- 난이도: <span style="color:#000000">하</span>
- 완료일: 2023년 7월 18일
- 유형: 브루트 포스

### 내 코드

```C++
#include <iostream>
#include <vector>
#include <algorithm>
#include <string>

using namespace std;

int c, h, w;
int state[20][20];
int blank;
int sum;

//	ㅁㅁ   ㅁㅁ
// 	ㅁ      ㅁ

//  ㅁ	   ㅁ
//	ㅁㅁ   ㅁㅁ

int shape1[4][2] = {{0,1}, {0,1}, {1,0}, {1,-1}};
int shape2[4][2] = {{1,0}, {1,1}, {1,1}, {1,0}};
string board[20];

void Recursion(int last)
{
	if(last == 0)//모든 칸을 채웠다면 sum+=1
	{
		sum++;
		return;
	}
	
	int row, col;
	bool find = false;
	//남은 빈칸 중 맨 왼쪽 위의 좌표를 찾고
	for(int i=0; i<h; i++)
	{
		for(int j=0; j<w; j++)
		{
			if(state[i][j])
			{
				row = i; 
				col = j;
				find = true;
				break;
			}
		}
		if(find)
			break;
	}
	
	state[row][col] = 0;
	//그 좌표에 가능한 4가지 모양에 대해 모두 시도.
	int r1, c1, r2, c2;
	for(int i=0; i<4; i++)
	{
		r1 = row + shape1[i][0];
		c1 = col + shape1[i][1];
		r2 = row + shape2[i][0];
		c2 = col + shape2[i][1];
		
		
		if( !((-1<r1 && r1<h)&&(-1<c1 && c1<w)) || !((-1<r2 && r2<h)&&(-1<c2 && c2<w)))
			continue;
		if(state[r1][c1] != 1 || state[r2][c2] != 1)
			continue;
		
		state[r1][c1] = 0;
		state[r2][c2] = 0;
		
		Recursion(last-3);
		
		state[r1][c1] = 1;
		state[r2][c2] = 1;
	}
	state[row][col] = 1;
}

int main(void)
{
	cin >> c ;
	
	
	for(int i=0; i<c; i++)
	{
	///////////////initializing/////////////////	
		sum = 0;
		blank = 0;
		for(int t=0; t<20; t++)
		{
			for(int j=0; j<20; j++)
			{
				state[t][j] = 0;
			}
		}
	/////////////////////////////////////////////
		cin >> h >> w;
		
		for(int j=0; j<h; j++)
		{
			cin >> board[j];
			
			for(int k=0; k<w; k++)
			{
				if(board[j][k]=='.')
				{
					state[j][k] = 1;
					blank++;
				}
			}
		}
		
		if(blank == 0)
		{
			cout << 1 << endl;
			continue;
		}
		else if(blank % 3 != 0)
		{
			cout << 0 << endl;
			continue;
		}
		
		Recursion(blank);
		cout << sum << "\n";
	}
}
```

‘알고리즘 문제 해결 전략’에 나온 문제 접근 방식을 보고 그대로 코드를 짰다.

순서가 상관 없는 문제였기에 임의로 계산하기 쉬운 순서를 강제했고 → 해당 자리에 올 수 있는 경우의 수는 4가지 모양이라는 것을 이용해 가능한 경우마다 일단 채운 뒤 다음 재귀함수에게 다시 상황을 넘겨준다. 이를 반복하면 해결할 수 있다.  
처음 문제를 마주하면 경우의 수가 너무 많은 것 같아 막막한 느낌이 든다. 책의 해설처럼   
**빠짐없이 모든 경우를 셀 수 있는 순서를 내가 정해서 계산** 하는 것이 중요했다. 그리고 한 지점에 대해 수행할 수 있는 4가지 모양의 경우가 있다고 보는 관점도 역시 중요했다. 나는 ‘3칸짜리 블럭을 넣어보는 행위를 어떻게 코드화 할까’ 하는 생각부터 들었는데, **한 점씩 고르고 그 점을 포함하며 블럭을 넣을 수 있는 경우가 4개라는 식** 으로 나에게 편하게 문제를 맞추는 사고방식이 필요했다.

위의 두 가지를 주 축으로 해결 전략을 세우면 코드 짜는 것은 어렵지 않다.  
나는 블럭의 모양을 구현하기 위한 배열 - shaped에서 기준점 아래 칸을 체크하는 것을 row -1로 계속 계산하는 바람에 시간을 많이 썼다. 현재 row에서 아래로 내려가는 것은 row+1인데, y축 개념으로 생각하는 것이 익숙하다보니 계속 -1을 생각하게 된다. 2차원 배열을 다룰 때는 이 점을 주의하자.  

