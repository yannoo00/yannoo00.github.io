---
title:  "terraform"
layout: post
excerpt: ""

categories:
  - Cloud
tags:


toc: true
toc_sticky: true
 
date: 2026-08-29
last_modified_at: 2026-08-29
---

AWS 관리를 위해 프로젝트에서 terraform을 사용하게 되었다(aws cli 사용). terraform은 코드로 인프라 리소스를 관리할 수 있게 해준다.  
따라서 ai agent와의 궁합이 매우 좋다.  


```terraform
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
}

resource "aws_instance" "ecs_host" {
  ami                    = data.aws_ssm_parameter.ecs_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ecs_host.id]
  iam_instance_profile   = aws_iam_instance_profile.ecs_instance.name

  user_data                   = <<-EOT
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    mkdir -p /data/postgres
  EOT
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required" # IMDSv2
  }

  tags = { Name = "gachamind-ecs-host" }

  lifecycle {
    ignore_changes = [ami] # AMI 가 갱신될 때마다 인스턴스를 갈아엎지 않는다
  }
}

resource "terraform_data" "wait_for_container_instance" {
  triggers_replace = [aws_instance.ecs_host.id]

  provisioner "local-exec" {
    command = <<-EOT
      for i in $(seq 1 30); do
        n=$(aws ecs list-container-instances --cluster ${aws_ecs_cluster.main.name} --region ${var.region} --query 'length(containerInstanceArns)' --output text)
        [ "$n" != "0" ] && exit 0
        sleep 10
      done
      echo "container instance did not register in time" >&2; exit 1
    EOT
  }
}
```
프로젝트의 EC2 를 만드는 terraform 코드이다.  


```
data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/arm64/recommended/image_id"
}
```
aws_ssm_parameter 타입의 파라미터를 가져온다. ec2에 설치할 os 이미지를 가져오는 것  
이 경우 ecs 사용에 최적화된 것을 가져오도록 한다.  
여기에는 ECS agent가 설치되어있어서 부팅 시 자동으로 실행된다.  


```
resource "aws_instance" "ecs_host" {
  ami                    = data.aws_ssm_parameter.ecs_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ecs_host.id]
  iam_instance_profile   = aws_iam_instance_profile.ecs_instance.name

  user_data                   = <<-EOT
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
    mkdir -p /data/postgres
  EOT
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required" # IMDSv2
  }

  tags = { Name = "gachamind-ecs-host" }

  lifecycle {
    ignore_changes = [ami] # AMI 가 갱신될 때마다 인스턴스를 갈아엎지 않는다
  }
}
```  
resource 명령은 생성 명령으로, EC2 instance 타입 등을 지정해서 생성한다.  
var. 은 variable.tf에 정의되어있고, 의외에도 다른 곳에 정의되어있는 값들을 참조하면-  참조 그래프 순서로 terraform이 생성하도록 요청한다.  

user_data 블록은 ECS가 같은 클러스터의 머신에 같은 클러스터의 Service를 실행하기 때문에, 이 EC2를 gachaMind(프로젝트명) cluster로 묶어주기 위해 설정 파일에 값을 쓰는 작업이다.  

이렇게 EC2가 생성되면서 ECS agent가 설치되고, 그 agent는 지속적으로 ECS에서 필요한 작업이 없는지 폴링하며 체크하고 Service에서 요구하는만큼 Task가 돌아가는중인지 감시하여 Task를 실행하게 된다.  

이처럼 Terraform으로 인프라를 관리하게 되면 코드로 인프라 설정값을 관리할 수 있게 되는 것이기에 공유도 쉽고 히스토리 파악도 쉽고 ai agent와의 작업도 컨텍스트가 명확해지기에 효율적으로 수행할 수 있다.  
