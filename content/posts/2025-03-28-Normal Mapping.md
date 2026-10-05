---
title:  "Normal Mapping(법선 매핑)"
layout: post
excerpt: "texture 맵에 있는 세부 사항들이 조명 결과에도 반영되게 하기 위한 동적 조명 구현 방법"

categories:
  - Graphics
tags:
  - [DirectX, graphics]

toc: true
toc_sticky: true
 
date: 2025-03-28
last_modified_at: 2025-03-28
---

<br>


# Normal Mapping
 
![Image](https://github.com/user-attachments/assets/ea26f1a0-c5df-4f7d-a8cb-bfe8e01c67d0)
<br>
 https://3dkingdoms.com/tutorial.htm


조명은 메시에서 전달받은 정점을 기반으로 계산을 수행하기 때문에, 사진처럼 갑옷이 사슬 구조의 텍스쳐를 가지고 있다고 해도 실제 메시 구조가 사슬처럼 울퉁불퉁하지 않다면 이를 반영할 수 없다.  

하지만 normal mapping을 적용하면 폴리곤을 유지한채로 더욱 텍스처의 질감을 살리는 표현을 할 수 있다.  
텍스처의 normal map을 구하고 그것을 조명과 같은 좌표계로 옮긴 뒤, 빛을 계산하면 된다.
 
<br>

## Normal Map이란


![Image](https://github.com/user-attachments/assets/32a9db85-ed7d-45d8-911c-d7f89159a6ea)
<br>
_UnityDoc_ - Normal map에 저장된 법선(normal)들을 2차원으로 시각화한 그림.

법선 맵은 흔히 보던 그 푸르딩딩한 텍스처를 말한다. 일반 텍스처처럼 RGB를 생으로 담는게 아니라, 각 텍셀(텍스처 내의 단일 픽셀)에 압축된 x, y, z 좌표성분들을 RGB 채널에 담는다.  

![Image](https://github.com/user-attachments/assets/bb694642-ffc6-48a7-8e5e-05bb5883e2ad)  
즉 법선 맵이라는 이름 그대로 픽셀에 법선 벡터를 저장한 텍스처인 것이다.  
일단 normal값을 RGB로 인코딩 할 때는 -1 ~ 1의 값을 0~255로 만들어 저장한다.  
이 때 z축이 텍스처 평면에 수직인 방향에 대응되므로 이 법선들은 대부분 z축 방향으로 뻗어나오고, 그 결과 RGB채널에서 B값이 제일 커져서 푸르스름하게 보인다.  
이 RGB를 다시 [0 ~1 ]로 정규화하고(그래픽 하드웨어에서 텍스처 샘플링할 때 처리),  
[-1 ~ 1]의 노말 벡터로 복원하여 계산에 사용한다.  

<br>

## Tangent Space

![Image](https://github.com/user-attachments/assets/07e658b5-99d3-4628-9ff5-f93ccdfd051e)  
_tangent space_

위에서 본 법선 맵의 법선 벡터들은 텍스처 공간을 기준으로 정의된다.  
이 때 텍스처 공간은 3D 모델의 각 정점에 접하는 좌표계인 tangent space를 바탕으로 세 벡터 TBN을 구하고,  
접면 tangent space가 같아지도록 모델을 펴서 저장한 공간이다.  
하지만 빛은 당연히 World 공간을 기준으로 내리쬐고 우리는 노말 맵을 world로 가져와야 한다(반대의 기법도 있다).  

이를 위해서,  
Tangent Space -> View space 로 이동해야 한다. 

좌표계 변환을 위해서,
tangent space의 T, B, N이 view space의 X, Y, Z로 가야 한다고 하자.  
이 때 필요한 변환 행렬은(회전만 필요하므로 3X3으로 수행)  

{목표 좌표계의 X축에 해당하는 출발 좌표 축},  
{목표 좌표계의 Y축에 해당하는 출발 좌표 축},  
{목표 좌표계의 Z축에 해당하는 출발 좌표 축}  
이므로  M =  
{Tx Ty Tz},  
{Bx By Bz},  
{Nx Ny Nz}  
가 된다.  

TBN을 구해준 후 이 M을 곱해주면 view space에서 사용할 수 있는 좌표를 얻게 된다. 

