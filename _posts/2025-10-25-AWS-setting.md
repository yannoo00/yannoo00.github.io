---
title:  "AWS로 DB와 서버 배포하기"
layout: post
excerpt: "AWS setting"

categories:
  - Server 
tags:
  - [AWS, database]

toc: true
toc_sticky: true
 
date: 2025-10-25
last_modified_at: 2025-10-25
---

<br>

## AWS RDS Security Setting


AWS RDS를 생성하고 개발 테스팅을 위해 ip 연결 설정하는 내용 요약  

<img width="1694" height="851" alt="Image" src="https://github.com/user-attachments/assets/3f9e371d-5f83-47f1-a723-7dc4a9847928" />
 


### public accessibility  
db 인스턴스를 생성하면 기본적으로 Security의 public accessble 값이 False로 설정된다.  
이러면 AWS 외부에서 이 DB에 아예 접속할 수 없도록 instance의 IP 자체를 생성하지 않는다.  
local IP로 테스트 할 것이라면 True로 설정하자. 


### Inbound rules  
Security group의 rules에는 Inbound와 Outbound가 있다.  
<img width="1647" height="283" alt="Image" src="https://github.com/user-attachments/assets/25a8cf36-7813-4796-85f5-f9a0f9b7daac" />

외부에서 db에 접속하는 방향의 설정은 Inbound이고 그 반대로 db가 외부 서버에 연결하는 것과 관련된 것이 Outbound 설정이다. 외부 연결은 기본적으로 모든 연결을 허용한다(0.0.0.0/0)  
로컬 서버에서 db 연결을 테스트 하려면 Inbound 설정을 통해 원하는 IP를 등록해둘 수 있다.  


```python

conn = pymysql.connect(
    host=os.getenv('DATABASE_URL'),
    port=int(os.getenv('DATABASE_port')),
    user=os.getenv('DATABASE_user'),
    password=os.getenv('DATABASE_password'),
    database=os.getenv('DATABASE_name')
)
print("연결 성공")

```

sqlalchemy를 사용하여 연결 테스트.  
연결한 MySQL DB는 MySQL Workbench 등을 사용해서 편하게 UI로 확인이 가능하다.  
<img width="747" height="602" alt="Image" src="https://github.com/user-attachments/assets/2baff25c-de81-47ed-bc7c-a61bb862cc0c" />  
(간단하게 확인 할 때는 터미널로 AWS RDS end-point에 연결하여 쿼리를 날려도 된다)  


이후 flask 서버를 배포하고 그 서버를 AWS에서 이처럼 등록하면 인터넷 연결이 바뀔 때마다 ip를 등록하지 않고 publicity를 아예 막아버린 채 사용할 수 있다.  
<br>  
<br>  
<br>  


## AWS에 flask 서버 띄우기  

<img width="1703" height="445" alt="Image" src="https://github.com/user-attachments/assets/ed5f2d8b-930f-4442-a41a-c48342f46ede" />
Applications -> Elastic Beanstalk -> Create New Environment  
서버는 Elastic Beanstalk으로 설정(https://joojae.com/aws-elastic-beanstalk/)   


<img width="1697" height="900" alt="Image" src="https://github.com/user-attachments/assets/35ed4a88-0b1d-429d-bbdb-f15f03a3d51b" />
HTTP API 처리를 위한 표준   
설정 이후 배포할 서버 코드를 업로드 해줘야한다.  

application.py
```python
"""
Elastic Beanstalk WSGI 엔트리포인트
EB는 'application.py' 파일의 'application' 객체를 찾습니다
"""

from app import app as application

# EB가 찾을 수 있도록 application 객체를 export
# application = app (위에서 이미 import됨)

if __name__ == '__main__':
    application.run()

```
Elastick Beans가 압축하여 업로드한 폴더의 application.py/application 객체를 찾아 서버를 구동하기 때문에 기존 app.py에서 사용하던 app 객체를 여기에도 넣어줬다.  



.ebextensions/ 폴더에는 EB(Elastick Beans) 설정 관련 파일을 넣는다.
01_flask.config  
```python
option_settings:
  aws:elasticbeanstalk:application:environment:
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
  aws:elasticbeanstalk:container:python:
    WSGIPath: application:application
```


.ebignore 파일에는 콘솔 명령어로 EB에 업로드할 때 먼저 읽혀서 zip에서 제외할 대상을 선택해준다.  
```python
# Elastic Beanstalk 배포 시 제외할 파일들

# 환경 변수 (EB 콘솔에서 설정해야 함)
.env

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# 가상환경
venv/
env/
ENV/
.venv/

# Database (로컬 DB는 업로드 안함)
*.db
*.sqlite3
instance/

# 개발용 스크립트
DB_CONNECTION_TEST.py
migrate_cafes_only.py
migrate_data.py
sqlite_to_mysql_migration.py
check_mysql_data.py

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Git
.git/
.gitignore

```


제외 파일을 빼고 압축하는 명령어를 실행해도 된다.   
zip -r ../cagong-backend-eb.zip . -x "*.git*" "__pycache__/*" "*.pyc" "*.db" "*.sqlite3" "instance/*" ".env" "venv/*"  



<br>

<img width="1111" height="517" alt="Image" src="https://github.com/user-attachments/assets/1f82d48c-8a1b-479c-8136-3bffb9bd4128" />

IAM role을 만들어야한다.  이는 우리 서버를 띄워주는 컴퓨터가 우리 DB에 접근할 때 어떤 권한을 갖게 할지 설정하는 것이라고 함  

<img width="1705" height="832" alt="Image" src="https://github.com/user-attachments/assets/a97436fb-7106-48e1-8d9c-e0bc179c9483" />  
일단 다른 S3 같은 서비스에 접근할 권할을 주는 Compute로 했다.   


<img width="1085" height="847" alt="Image" src="https://github.com/user-attachments/assets/2bb2924b-b025-4b70-9e10-3cbd842f0f23" />  
Instance는 서버가 실행되는 VPC를 사용할 공간을 나누는 것인데(https://wikidocs.net/273845) 1개로만 운영하는 것은 위험성이 있으니 2개로 골랐다.  
이 때 database를 Enable 하는 것은 서버 열면서 DB도 새로 만드는거다.  지금 이미 RDS 만들어둔 상황이므로 쓸 필요 없음   

<img width="1056" height="471" alt="Image" src="https://github.com/user-attachments/assets/86a5ca8b-9b5d-4347-95c9-b1399a4fd4e6" />
제일 중요한 것으로 설정 Step5의 Environment properties에 환경 변수 등록을 해줘야 한다.  

 

<img width="1405" height="802" alt="Image" src="https://github.com/user-attachments/assets/6e68f905-d2e5-4bde-8a04-67cd0f34f806" />
위처럼 설정을 마치고 Create 하였는데 degraded 되었다...  






콘솔 Log에서 배포에 대한 Log file을 받을 수 있다. AI에게 그대로 주면 바로 원인을 찾아준다.  

EB 기본설정상 Nginx로 HTTP 요청을 받는데,  
내가 업로드한 파일의 requirements.txt에는 gunicorn이 없어서 NginX와 WSGI로 통신할 방법이 없어졌다.  

<b>web: gunicorn application:application --bind 0.0.0.0:8000 --workers 3 --timeout 120</b>  
위처럼 Procfile(EB 배포시 구체적인 설정 가능)도 추가했다.   
또 백엔드 폴더를 만들면서 requirements.txt를 채우지 않아 새로 작성해줬다(아나콘다를 쓰니까 이거 채우는게 불편하다).  

web 웹 연결을 처리하는 서버
gunicorn 구니콘 실행할 것  
application:application application.py의 application 객체를 찾아서 실행  
bind 0.0.0.0:8000  EC2 서버의 모든 IP로부터 오는 요청 허용, 8000번 포트에서 대기  
동시처리 워커 최대 3   

<img width="924" height="987" alt="Image" src="https://github.com/user-attachments/assets/d1728eac-7fc3-4081-ad15-bd04e047a1be" />  
연결 성공 !  