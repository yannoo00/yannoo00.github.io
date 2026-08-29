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

AWS 관리를 위해 프로젝트에서 terraform을 사용하게 되었다.  

terraform은 aws 내 서비스들의 상태와, 코드에 적힌 상태를 비교하여 코드에 기재된 설정값으로 aws 서비스들을 맞춰준다(API호출).  


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
프로젝트의 EC2 설정값인데,  
각 코드의 의미를 분석해보자.  

