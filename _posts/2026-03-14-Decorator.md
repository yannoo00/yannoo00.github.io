---
title:  "Decorator"
layout: post
excerpt: "typescript에서의 decorator"

categories:
  - Design
tags:
  - [Design, Decorator]

toc: true
toc_sticky: true
 
date: 2026-03-14
last_modified_at: 2026-03-14
---

Decorator 패턴은 객체에 동적으로 기능을 추가할 때 용이하다.  
이는 객체 지향의 SOLID 중 Open-close principle(OCP) 설계 기법과도 맞닿아 있다.  

동적으로 기능을 추가하는 상황을 가정한 코드를 보자.  
```C#
using System;

// 1. Component (공통 인터페이스)
public interface ICoffee
{
    string GetDescription();
    double GetCost();
}

// 2. Concrete Component (기본 객체)
// 가장 기초 상태의 커피.
public class SimpleCoffee : ICoffee
{
    public string GetDescription() => "일반 커피";
    
    public double GetCost() => 2000;
}

// 3. Base Decorator (decorator 추상 클래스)
public abstract class CoffeeDecorator : ICoffee
{
    protected ICoffee _coffee;

    // 생성자를 통해 감쌀 객체를 주입받음
    public CoffeeDecorator(ICoffee coffee)
    {
        _coffee = coffee;
    }

    public virtual string GetDescription() => _coffee.GetDescription();
    
    public virtual double GetCost() => _coffee.GetCost();
}

// 4. Decorators
// 기본 decorator를 상속받아 요금과 설명을 추가

public class MilkDecorator : CoffeeDecorator
{
    public MilkDecorator(ICoffee coffee) : base(coffee) { }

    public override string GetDescription() => $"{base.GetDescription()}, 우유 추가";
    
    public override double GetCost() => base.GetCost() + 500;
}

public class SyrupDecorator : CoffeeDecorator
{
    public SyrupDecorator(ICoffee coffee) : base(coffee) { }

    public override string GetDescription() => $"{base.GetDescription()}, 시럽 추가";
    
    public override double GetCost() => base.GetCost() + 300;
}

// 5. 클라이언트 실행 코드
class Program
{
    static void Main()
    {
        // 기본 커피 생성
        ICoffee myCoffee = new SimpleCoffee();
        Console.WriteLine($"{myCoffee.GetDescription()} | 가격: {myCoffee.GetCost()}원");
        // 출력: 일반 커피 | 가격: 2000원

        // 커피에 우유 추가
        myCoffee = new MilkDecorator(myCoffee);
        Console.WriteLine($"{myCoffee.GetDescription()} | 가격: {myCoffee.GetCost()}원");
        // 출력: 일반 커피, 우유 추가 | 가격: 2500원

        // 커피에 우유가 추가된 상태에서 시럽 추가
        myCoffee = new SyrupDecorator(myCoffee);
        Console.WriteLine($"{myCoffee.GetDescription()} | 가격: {myCoffee.GetCost()}원");
        // 출력: 일반 커피, 우유 추가, 시럽 추가 | 가격: 2800원
    }
}
```  
가장 먼저 데코레이터와 데코레이터가 붙을 클래스 모두가 같은 클래스를 상속해야 한다.  
이 경우 인터페이스를 상속받고 있지만 상관없다. 중요한 것은 어떤 decorator를 추가했든 그 클래스를 다시 다른 클래스에 전달할 수 있어야 한다는 것이다.  

이렇게 decorator 패턴으로 구현하면 새로운 기능의 추가/수정이 필요할 때 해당 decorator 하나만 작업하면 된다.  

C#에서는 Stream을 이런 방식으로 구현하고 있다.  
```C#
using System;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;

class Program
{
    static void Main()
    {
        byte[] data = { 1, 2, 3, 4, 5 };

        // 1. 기본 객체 (Concrete Component) 생성
        using (Stream fileStream = new FileStream("test.dat", FileMode.Create))
        {
            // 2. 첫 번째 Decorator
            // FileStream에 '압축' 기능을 덧씌움
            using (Stream gzipStream = new GZipStream(fileStream, CompressionMode.Compress))
            {
                using (Aes aes = Aes.Create())
                {
                    // 3. 두 번째 Decorator
                    // 압축된 스트림 위에 '암호화' 기능을 한 번 더 덧씌움
                    using (Stream cryptoStream = new CryptoStream(gzipStream, aes.CreateEncryptor(), CryptoStreamMode.Write))
                    {
                        // 클라이언트는 가장 바깥쪽에 포장된 cryptoStream에만 데이터를 쓴다.
                        // 데이터 흐름: 암호화(Crypto) -> 압축(GZip) -> 파일저장(File)
                        cryptoStream.Write(data, 0, data.Length);
                        
                        Console.WriteLine("파일이 암호화 및 압축되어 저장되었습니다.");
                    }
                }
            }
        }
    }
}
```   