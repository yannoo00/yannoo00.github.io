---
title:  "Deferred Rendering"
layout: post
excerpt: "빛을 받을 물체를 필터링해서 조명 계산"

categories:
  - Graphics
tags:
  - [DirectX, graphics]

toc: true
toc_sticky: true
 
date: 2025-04-06
last_modified_at: 2025-04-06
---

<br>

## Forward Rendering  

모든 객체가 모든 조명에 대해 계산된다.  

비교적 단순하고 뭔가 정보를 저장하기 위한 중간 버퍼 등이 필요하지 않아 메모리 사용량이 적다.  
하지만 많은 조명이 있는 상황에서는 효율적이지 못하다.

<br>

# Deferred Rendering


<div style="display: flex;">
  <img src="https://github.com/user-attachments/assets/da04d08c-38d2-4fd6-853b-9a2f1177bd8d" width="51%" alt=""/>
  <img src="https://github.com/user-attachments/assets/7dd2a785-c36a-4f01-b551-47690b123bef" width="49%" alt=""/>
</div>  

_WIKIPEIDA_ _ _Deffered Shding_

Deferred Rendering은  
모든 객체에 대해 조명 계산을 하기에 앞서 position, normal, diffuse, diffuse light, specular light 등을 별도의 렌더 타겟(_A render target is a memory buffer for rendering pixels_)에 저장한다.  
그리고 "빛의 영향 범위에 있는 픽셀에 대해서만" 조명 계산을 수행하여 최적화한다.  

따라서 렌더링 과정은  
1. <b>Geometry Pass</b>  
  조명 계산 없이 모든 객체를 렌더링 하여 G-Buffer를 생성한다.  
  MRT(Multiple Render Target)를 사용하여 한 번의 패스로 여러 속성을 동시에 저장한다.  
2. <b>Lightning Pass</b>  
  빛의 영향 범위에 있는 픽셀에 대해서만, G-Buffer의 정보를 이용하여 조명 계산을 수행한다.   

이 두 가지 기본 과정을 거치게 된다.

이렇게 위치 기반으로 필터링 해준다는 장점만 보면 그냥 객체의 위치를 가져와서 lightning의 영향을 받는 위치인지 아닌지 판별하고 Forward 렌더링을 적용하는 것과 다를게 없지 않나 생각할 수 있는데,   
G-Buffer에 이렇게 저장해둔 객체의 정보는 매 프레임마다 갱신되는 것이지만  
한 프레임 내 여러 렌더링 패스에서 재사용 될 수 있다.  
(조명 계산, 후처리 효과 등... )

상황에 따라서는 메모리를 위해 forward rendering을 채택해야 할 수도 있다.

<br>

## Resource Barrier   

DirectX12와 같은 최신 그래픽 API에서, Resource Barrier는 GPU 파이프라인 내에서 리소스 접근을 동기화하는 중요한 메커니즘이다.  
각 그래픽 명령이 실행되기 위해서 사용되는 리소스는 적절한 상태를 가져야 하고,  
Resource Barrier가 리소스에 대한 상태를 관리하기 위한 객체이다. 어떤 리소스가 원하는 상태가 되기 전까지는 그 리소스를 실행할 수 없도록 한다. 

이 렌더링 단계에서는 G-Buffer를 생성하는 단계와 조명 계산을 수행하는 단계 사이에서 리소스가 가져야할 상태가 다르기에 G-Buffer의 상태 전환을 명시적으로 관리해야 한다.

<br>


<br>
<br>
<br>

참고: _인프런 Rookiss_