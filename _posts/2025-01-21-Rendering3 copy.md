---
title:  "삼각형 렌더링하기 - Renderer 클래스 만들기"
layout: post
excerpt: "Direct를 활용해 삼각형을 렌더링해보자. "

categories:
  - Direct
tags:
  - [Direct, rendering]

toc: true
toc_sticky: true
 
date: 2025-01-23
last_modified_at: 2025-01-23
---

# 삼각형을 렌더링 해보자!

window API, Direct를 활용해 삼각형을 렌더링하는 과정을 공부해보자. 

<br>


<br>

## 1~2까지의 진행단계

1. 윈도우 api로 다이렉트를 사용할 윈도우 화면을 만듦  
화면 늘리고 줄이고 등의 이벤트(->메시지)에 반응하는 화면
2. renderer 클래스를 만듦  
쉐이더 설정을 하고 렌더링을 위한 버퍼 설정.

이제 렌더러의 함수를 불러와서 윈도우에 그려주면 끝이다. 


~~~cpp
struct FVertexSimple
{
    float x, y, z;    // 3D 공간의 위치 좌표
    float r, g, b, a; // 색상 값 (Red, Green, Blue, Alpha)
};

FVertexSimple triangle_vertices[] = {
    {  0.0f,  1.0f, 0.0f,  1.0f, 0.0f, 0.0f, 1.0f }, // 상단 점 (빨간색)
    {  1.0f, -1.0f, 0.0f,  0.0f, 1.0f, 0.0f, 1.0f }, // 우하단 점 (초록색)
    { -1.0f, -1.0f, 0.0f,  0.0f, 0.0f, 1.0f, 1.0f }  // 좌하단 점 (파란색)
};
~~~
일단 이렇게 삼각형의 정점을 정의한다.


~~~cpp
// 렌더러와 셰이더 초기화
renderer.Create(hWnd);
renderer.CreateShader();

// Renderer와 Shader 생성 이후에 버텍스 버퍼를 생성한다.
FVertexSimple* vertices = triangle_vertices;
UINT ByteWidth = sizeof(triangle_vertices);
UINT numVertices = sizeof(triangle_vertices) / sizeof(FVertexSimple);

// 버텍스 버퍼 생성 설정
D3D11_BUFFER_DESC vertexbufferdesc = {};
vertexbufferdesc.ByteWidth = ByteWidth;                    // 버퍼 크기
vertexbufferdesc.Usage = D3D11_USAGE_IMMUTABLE;           // 변경되지 않는 데이터
vertexbufferdesc.BindFlags = D3D11_BIND_VERTEX_BUFFER;    // 버텍스 버퍼로 사용

// 버텍스 데이터 설정
D3D11_SUBRESOURCE_DATA vertexbufferSRD = { vertices };

ID3D11Buffer* vertexBuffer;

// GPU 메모리에 버텍스 버퍼 생성
renderer.Device->CreateBuffer(&vertexbufferdesc, &vertexbufferSRD, &vertexBuffer);

// 버텍스 버퍼 소멸은 Renderer 소멸전에 처리 
vertexBuffer->Release();
renderer.ReleaseShader();
renderer.Release();

~~~

GPU가 사용할 수 있는 형태로 데이터를 버퍼에 저장하고, 매 프레임마다 이 데이터를 사용해 삼각형을 그려 화면에 표시한다. 

결과적으로 위쪽이 빨간색, 오른쪽 아래가 초록색, 왼쪽 아래가 파란색인 삼각형이 나타나게 된다. 