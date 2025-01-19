---
title:  "삼각형 렌더링하기 - windows API"
layout: post
excerpt: "Direct를 활용해 삼각형을 렌더링해보자. "

categories:
  - Direct
tags:
  - [Direct, rendering]

toc: true
toc_sticky: true
 
date: 2025-01-18
last_modified_at: 2025-01-18
---

# 삼각형을 렌더링 해보자!

window API, Direct를 활용해 삼각형을 렌더링하는 과정을 공부해보자. 

<br>


## 결과 미리보기
![Image](https://github.com/user-attachments/assets/24cd4ad9-8c29-4e10-ab9f-e289817b6198)
<br>

## 윈도우 창 만들기
DirectX가 windows플랫폼에서 동작하는 그래픽스 API이므로 
window 위에 DirectX11(D3D11)로 그래픽스를 구현한다. 

windows api를 활용하기 위해 `#include <windows.h>`부터 넣어준다.

그 다음 windows프로그램의 진입 지점인 WinMain 함수를 정의한다.
### WinMain

```cpp
int WINAPI WinMain(
    HINSTANCE hInstance,       // 프로그램의 인스턴스 핸들
    HINSTANCE hPrevInstance,   // 사용되지 않음 (이전 버전과의 호환성)
    LPSTR lpCmdLine,          // 명령줄 매개변수
    int nShowCmd              // 윈도우 표시 방법
)
```



```cpp
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd)
{
	// 윈도우 클래스 이름
	WCHAR WindowClass[] = L"JungleWindowClass";

	// 윈도우 타이틀바에 표시될 이름
	WCHAR Title[] = L"Game Tech Lab";

	// 각종 메시지를 처리할 함수인 WndProc의 함수 포인터를 WindowClass 구조체에 넣는다.
    WNDCLASSW wndclass = { 
        0,              // 스타일
        WndProc,        // 윈도우 프로시저 함수
        0,              // 클래스 여분 메모리
        0,              // 윈도우 여분 메모리
        0,              // 인스턴스 핸들
        0,              // 아이콘
        0,              // 커서
        0,              // 배경 브러시
        0,              // 메뉴 이름
        WindowClass     // 클래스 이름
    };

	// 윈도우 클래스 등록
	RegisterClassW(&wndclass);

	// 1024 x 1024 크기에 윈도우 생성
    HWND hWnd = CreateWindowExW(
        0,                              // 확장 윈도우 스타일
        WindowClass,                    // 윈도우 클래스 이름
        Title,                          // 윈도우 타이틀
        WS_POPUP | WS_VISIBLE |        // 윈도우 스타일
        WS_OVERLAPPEDWINDOW,           
        CW_USEDEFAULT,                 // X 위치 (기본값)
        CW_USEDEFAULT,                 // Y 위치 (기본값)
        1024,                          // 윈도우 너비
        1024,                          // 윈도우 높이
        nullptr,                       // 부모 윈도우
        nullptr,                       // 메뉴 핸들
        hInstance,                     // 인스턴스 핸들
        nullptr                        // 생성 매개변수
    );

	bool bIsExit = false;
	
	// 각종 생성하는 코드를 여기에 추가합니다.

	// Main Loop (Quit Message가 들어오기 전까지 아래 Loop를 무한히 실행하게 됨)
	while (bIsExit == false)
	{
		MSG msg;

		// 처리할 메시지가 더 이상 없을때 까지 수행
		while (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE))
		{
			// 키 입력 메시지를 번역
			TranslateMessage(&msg);

			// 메시지를 적절한 윈도우 프로시저에 전달, 메시지가 위에서 등록한 WndProc 으로 전달됨
			DispatchMessage(&msg);

			if (msg.message == WM_QUIT)
			{
				bIsExit = true;
				break;
			}
		}

		////////////////////////////////////////////
		// 매번 실행되는 코드를 여기에 추가
		
		
		
		////////////////////////////////////////////
	}
	
	// 소멸하는 코드를 여기에 추가

	return 0;
}

```
WinMain 함수는 프로그램의 진입점이 된다.  
프로그램 전체의 초기화와 실행을 관리하며 윈도우 클래스 등록, 실제 윈도우 생성, 윈도우 표시 방식을 설정한다.  
루프 처리도 여기서 이뤄지고, main함수와 같은 역할로 보면 될 듯 하다.

### WndProc
```cpp
LRESULT CALLBACK WndProc(
    HWND hWnd,       // 메시지를 받은 윈도우의 핸들
    UINT message,    // 메시지 종류
    WPARAM wParam,   // 메시지의 추가 정보
    LPARAM lParam    // 메시지의 추가 정보
)


//각종 메시지를 처리할 함수 
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	switch (message)
	{
	case WM_DESTROY:
		//Signal that the app should quit
		PostQuitMessage(0);
		break;
	default:
		return DefWindowProc(hWnd, message, wParam, lParam);
	}

	return 0;
}
```

WndProc 함수는 windows로 부터 오는 메시지를 처리한다.  
1. 사용자의 클릭, 키보드 입력 등의 이벤트가 발생
2. windows가 이를 메시지로 변환
3. 메시지가 프로그램의 메시지 큐에 push 
4. WinMain의 메시지 루프가 메시지를 가져옴 
5. WinProc이 해당 메시지를 처리 

이런 흐름이다. (DefWindowProc이 처리하지 않은 메시지를 기본적으로 처리한다)
<br>
<br>
### 윈도우 핸들
윈도우 핸들이란, windows운영체제에서 생성된 각각의 윈도우를 식별하기 위한 고유의 ID이다.  
즉 창을 구분하기 위한 고유 번호와 같다.
`HWND hWnd = CreateWindowExW(...)`로 새로운 윈도우를 생성하면
이 윈도우에 고유의 핸들 값이 할당된다. 
윈도우를 구분해주고 메시지 발생 시 어떤 윈도우의 메시지인지를 식별하는 등 
windows프로그래밍의 기본적인 요소이다.
