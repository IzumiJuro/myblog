---
layout: ../../layouts/MarkdownWorksLayout.astro
title: "模拟Traceroute"
description: "模拟Traceroute命令的功能，能够对给定的目标IP地址进行路由探测，并探测出途径路由的IP地址。"
image:
  url: "/GitHub.webp"
  alt: "GitHub wallpaper"
worksImage1:
  url: "https://s2.loli.net/2024/02/13/oOwFU4yj1cdeX5B.png"
  alt: "first image of your project."
platform: command-line
stack: Rust, tokio
github: "还没上传"
---

# 1  目的与任务

在计算机领域,Traceroute(Tracert)是一个常用的计算机网络诊断命令,用于显示可能的路线和测量数据包在互联网协议(IP)网络中的过境延迟.路径的历史被记录为从路由(路径)中每个连续的主机收到的数据包的往返时间;每一跳的平均时间之和是建立连接所花费的总时间的衡量.除非所有(通常是三个)发送的数据包丢失两次以上,否则 Traceroute 会继续进行;然后连接就会丢失,路由就不能被评估.另一方面,尽管 Ping 命令也可以进行侦测,但由于 IP 头的限制,Ping 命令只能计算从目的点出发的最终往返时间,无法完全记录数据包经过的所有路由器,因此,在路由探测方面 Traceroute 命令弥补了 Ping 命令的缺陷.

## 1.1 目的

本次课程设计选题是模拟 Traceroute 命令的功能,并编写代码实现路由探测.通过这种方式,我们希望能够对给定的目标 IP 地址进行路由探测,并探测出途径路由的 IP 地址.

## 1.2 任务要求

在本次课程设计中,我们的任务是编写代码来模拟 Traceroute 命令的功能.具体而言,我们需要完成以下任务：

1. 输入目标 IP 地址,并使用 UDP 协议发送数据包到目标地址.
2. 记录每一跳的往返时间,并计算平均时间.
3. 在每一跳的数据包丢失两次或两次以上时进行超时处理.
4. 输出途径路由的 IP 地址以及每一跳的平均时间.

# 2   实现过程

## 2.1 Traceroute 原理

当 Traceroute 检测到它所运行的主机和目标主机之间的路由时,它可以发送一个 UDP 数据包.最初,这个 UDP 数据包在网络层封装后,TTL 值被设置为 1,所以当到达第一条路由时(如果源主机与目的主机不在同一个以太网上),TTL 值变为 0,数据包被丢弃,路由器会发送一个 ICMP 超时消息(Time to live exceeded in transit),消息的 IP 前缀字段中源主机的 IP 地址就是路由的地址,如此类推,它便得到一连串数据包路径.

### 2.1.1 TTL

存活时间(TTL)值,也被称为跳数限制(hop limit),指一个数据包在经过一个路由器时,可传递的最长距离.可用于确定向目的地址间经过的中间路由器.Traceroute 发送的数据包的 TTL 值从一个数据包开始逐渐增加,TTL 值为 1.路由器在路由时将数据包的 TTL 值递减 1,并丢弃 TTL 值为 0 的数据包,返回 ICMP 错误信息 ICMP Time Exceeded.对于第一组数据包,第一个路由器收到数据包,递减 TTL 值并丢弃数据包,因为此时它的 TTL 值为 0.路由器发送一个 ICMP 超时消息回给源头.下一组数据包的 TTL 值为 2,所以第一个路由器转发了这些数据包,但是第二个路由器丢弃了这些数据包并回复了 ICMP 超时.以这种方式进行,traceroute 使用返回的 ICMP 超时消息建立一个数据包经过的路由器列表,直到到达目的地,如果使用 UDP 数据包,则返回 ICMP 目标不可达消息,如果使用 ICMP 回声消息,则返回 ICMP 回声消息.

### 2.1.2 UDP 数据包

UDP 是用户数据包协议(user datagram protocol)的简称,它是一种简单的数据报式传输层协议.UDP 数据报结构(如图 1 所示)非常简单,头部只包含端口号等若干个字段.

![image.png](https://s2.loli.net/2024/02/13/2NCDL1IK5ZOBz6W.png)

UDP 报文分为头部和数据两个部分.其中,头部只有 4 个字段：

1. 源端口( source port ),发送方的端口号;
2. 目的端口( destination port ),接收方的端口号;
3. 报文长度( length ),即整个 UDP 报文的长度,包括头部和数据,单位为 字节 .
4. 检验和( checksum );

UDP 报文需要借助 IP 协议提供的主机通信能力,作为数据搭载在 IP 包(如图 2 所示)中发往目标主机.

![image.png](https://s2.loli.net/2024/02/13/pcyMLYA8PkFdwTO.png)

而 IP 包是封装在以太网帧的负载(Payload)中(如图 3 所示)的.这样,当数据包在网络中传输时,每一层都会提供自己的封装,使得数据包能够在不同网络之间传输

![image.png](https://s2.loli.net/2024/02/13/3YHyneoF7zlULTk.png)

### 2.1.3 RTT

RTT(Round-Trip Time)即往返时间,是指源主机发送一个数据包到目的主机,再由目的主机发回的时间.Traceroute 会计算每一跳的平均 RTT,并将它们的总和作为建立连接所花费的总时间的衡量.沿着路径的每个路由器返回的时间戳值是延迟(延时)值,通常以每个数据包的毫秒为单位.发送者期望在指定的秒数内得到回复.如果一个数据包在预期的时间间隔内没有被确认,就会显示一个星号(或提示超时).IP 协议并不要求数据包采取相同的路线到达一个特定的目的地,因此列出的主机可能是其他数据包已经经过的主机.如果位于第 N 跳的主机没有回复,输出中就会跳过该跳.

## 2.2 Traceroute 代码实现

在本次课程设计中,我们使用 Rust 语言实现了 Traceroute 功能.Rust 是一种系统编程语言,具有静态类型检查和内存安全保证,以及媲美 C++的高性能.这使得它适用于编写网络程序,特别是对于像 Traceroute 这样的应用程序,需要处理许多不同的网络协议和复杂的网络路由.另一方面,Rust 提供了许多强大的功能,如生命周期检查、所有权系统和并发支持,使得它能够更好地管理内存和处理多线程环境.这些功能使得 Rust 成为编写 Traceroute 应用程序的理想选择.

### 2.2.1 配置结构体

首先,我们定义了一个名为 Config 的结构体,用于存储 Traceroute 的配置信息.Config 结构体包含以下字段：

1. port：端口
2. max_hops：最大跳数
3. number_of_queries：每个跳数的查询次数
4. ttl：存活时间
5. timeout：超时时间
6. channel：通道
   这些字段用于配置 Traceroute 的运行参数,以便更好地测量数据包的往返时间和路由的 IP 地址.

TraceRouteHop 结构体用于存储每一跳的信息,包含以下字段：

1. ttl：存活时间
2. query_result：表示每一跳的查询结果列表

TracerouteQueryResult 结构体用于存储每一次查询的结果,包含以下字段：

1. rtt：表示往返时间
2. addr：表示收到数据包的地址

TraceRoute 结构体用于存储 Traceroute 信息,包含以下字段：

1. addr：目标地址.
2. config：Traceroute 的配置信息.
3. done：标志 Traceroute 是否完成.
   这些结构体用于存储 Traceroute 运行的结果,方便后续的处理和展示

Protocol 枚举类用于存储协议类型,包含以下可能的值：

- UDP
- TCP
- ICMP

PacketBuilder 结构体用于构建数据包,包含以下字段：

1. protocol: 表示使用的协议,可以是 UDP、TCP 或 ICMP 中的一种.
2. source_mac: 表示源主机的 MAC 地址.
3. source_ip: 表示源主机的 IP 地址.

Channel 结构体用于存储通道信息,包含以下字段：

1. interface：表示网络接口.
2. packet_builder：表示数据包构建器.
3. payload_offset：表示负载偏移量.
4. port：表示端口.
5. ttl：表示存活时间.
6. seq：表示序列号.

### 2.2.2 组装 UDP 数据包

一旦我们配置好了 Traceroute 应用程序的设置,我们就可以开始组装 UDP 数据包了.为了组装 UDP 数据包,我们需要以下信息：源 MAC 地址,源 IP 地址,目的 IP 地址,目的端口,TTL 值.

我们使用 Rust 的 pnet 库来组装数据包,它是一个用于创建和解析网络数据包的库.组装 UDP 数据包的过程主要包括三个部分：以太网头部、IP 头部和 UDP 头部.

第一步,我们首先创建了一个 66 字节的缓冲区(以太网头部的长度是 14 字节,IPv4 头部的长度是 20 字节,UDP 头部的长度是 8 字节,所以数据包的总长度是 14+20+8=42 字节.但是数据包还有 24 字节的负载,所以缓冲区的大小需要为 42+24=66 字节),然后使用 pnet 库提供的 MutableEthernetPacket 结构体来创建一个以太网头部.我们将目的地址设置为 0,因为我们要发送广播包(为了找到网关路由器);将源地址设置为给定的值;将以太网类型设置为 IPv4.

第二步,我们使用 pnet 库的 MutableIpv4Packet 结构体来创建一个 IPv4 头部.我们将版本设置为 4,因为这是一个 IPv4 数据包;将头部长度设置为 5,因为 IPv4 头部由 5 个 32 位字组成;将总长度设置为 52,因为 IPv4 头部的长度是 20 字节,而 UDP 头部的长度是 8 字节,而负载的长度是 24 字节,所以总长度为 20+8+24=52 字节;将生存时间设置为给定的值;将下一层协议设置为 UDP,因为我们要发送一个 UDP 数据包;将源地址设置为给定的值;将目标地址设置为给定的值;计算并设置校验和.

第三步,我们使用 pnet 库提供的 MutableUdpPacket 结构体来创建 UDP 头部.我们将源端口设置为一个随机值(UDP 是一种无连接协议,每个数据包都是独立的,所以源端口没有固定的值.随机值可以避免端口冲突的情况,从而确保每个数据包都能够正常发送),目标端口设置为给定的值,UDP 头部的长度设置为 32 字节(8 字节的 UDP 头部加上 24 字节的负载),负载设置为 24 字节的 0.最后,我们调用 pnet 库提供的 ipv4_checksum 函数来计算 UDP 头部的校验和.

### 2.2.3 发送 UDP 数据包

在发送数据包之前,我们需要配置通道 Channel.Channel 是一个结构体,用于存储发送数据包所需的信息.我们使用 PacketBuilder 结构体来构建数据包,使用 pnet 库提供的 NetworkInterface 结构体来配置网络接口.

下面是发送数据包的流程：
第一步：创建一个通道,我们使用迭代器的 find 方法找到网络接口的第一个 IPv4 地址,并将其转换为字符串.然后,我们使用 Ipv4Addr::from_str 函数将字符串解析为 Ipv4Addr 类型的值.接下来,我们使用这个接口的 MAC 地址和 IP 地址来创建一个 PacketBuilder 对象,并将其作为 packet_builder 字段的值.然后,我们将端口号,TTL 和序列号设置为给定的值,并返回一个新的 Channel

第二步: 使用 channel()函数创建了一个 Ethernet 通道,这个函数是由 pnet 库提供的.这个通道用于发送和接收数据包,因此函数返回一个(tx, rx)元组,其中 tx 是发送数据包的句柄,rx 是接收数据包的句柄.然后使用 PacketBuilder 结构体提供的 build_packet()方法创建一个数据包.最后,使用 tx.send_to()方法将数据包发送到给定的地址.判断通道使用的协议是否为 TCP.如果是,则不增加序列号;如果不是(即为 UDP 或 ICMP),则增加序列号.当通道使用 UDP 或 ICMP 协议时,序列号是用于标识每个发送的数据包的.这样接收端就可以使用序列号来判断是否有丢失的数据包.而对于 TCP 协议,序列号已经被 TCP 自身的流量控制机制所取代,所以不需要增加序列号.

### 2.2.4 接收 UDP 数据包

下面是接收数据包的流程：

第一步：我们需要一个函数 process_incoming_packet()来接收数据包,这个函数会创建一个通道来接收数据包.创建通道的过程和发送数据包时的过程类似,也是使用 pnet 库提供的 channel()函数,并使用 Ethernet 通道,然后通过 rx.next()方法接收数据包.然后,我们需要处理接收到的数据包.为此,我们需要检查数据包的协议类型,因为我们只关心 UDP 和 ICMP 数据包.如果数据包是 UDP 数据包,我们就使用 handle_ipv4_packet()函数处理它;如果是 ICMP 数据包,我们就使用 handle_icmp_packet()函数处理它.如果数据包不是 UDP 或 ICMP 数据包,则返回一个错误.然后,我们就可以使用 handle_ipv4_packet()函数来处理 UDP 数据包了.这个函数会解析数据包的源 IP 地址,然后返回这个地址作为字符串.

第二步：我们可以使用 recv_timeout()方法来接收数据包.这个方法会接收数据包,并处理超时.如果超时,则返回一个错误字符串;如果成功接收到数据包,则返回源 IP 地址.recv_timeout()方法内部调用了 recv()方法,recv()方法会不断循环调用 process_incoming_packet()方法来接收数据包.

### 2.2.5 获取查询结果

下面是获取查询结果的流程：
第一步：我们需要获取下一个查询结果,具体来说就是首先获取当前时间,然后通过 send_to 方法向目标地址发送数据包,然后使用 recv_timeout 方法接收数据包,同时设置超时时间.然后创建一个 TracerouteQueryResult 类型的变量,将当前时间与发送数据包的时间之差作为 RTT(路由时间),然后将获取的地址作为该变量的地址.最后返回 TracerouteQueryResult 变量.

第二步：我们需要计算下一个跳数,具体来说就是首先创建一个空的数组,保存查询结果(TraceRouteQueryResult),然后使用循环遍历 number_of_queries 次数.在每次循环中,我们调用 get_next_query_result()函数来获取下一个查询结果,并将结果添加到数组中.如果结果的地址不是"\*"并且数组中没有相同的地址,则将结果添加到数组中.最后,使用得到的查询结果数组和递增的 TTL 值创建一个 TraceRouteHop 对象,并返回它.

### 2.2.6 输出结果

遍历每一个跳数(hop),然后输出 ttl 值和查询结果(query_result).在遍历查询结果时,输出其路由时间(rtt)以毫秒为单位的值和地址(addr).如果查询结果为空,则说明已经到达目的地.

## 2.3 实验结果与分析

当我们编写好了程序之后,编译之后运行,以 example.com(93.184.216.34)为例运行.结果如图 4 所示.结果表明我们的程序能够正常工作,它能够正确的输出路由信息.我们可以看到,在第 4 跳到第 8 跳之间,地址发生了变化,并且 rtt 的值也不一样.这是因为在这一段的路由中有多个路由器,并且每个路由器都有自己的 IP 地址和 rtt.在第 9 跳到第 12 跳之间,rtt 的值都在 150ms 左右,地址也没有变化.这是因为在这一段路由中,所有路由器的性能都很相似.在第 13 跳,我们发现地址变成了我们想要查询的地址,这表明我们已经到达了目的地,并且程序正常结束.

![image.png](https://s2.loli.net/2024/02/13/oOwFU4yj1cdeX5B.png)

图 4  运行结果示例

同样,我们用 wireshark 软件抓包来验证一下,由于我们使用的 UDP 协议发送数据包,所以在上面 wireshark 的过滤框中输入 udp.possible_traceroute || icmp 可以看到很多我们发送的数据包(如图 5 所示)

![image.png](https://s2.loli.net/2024/02/13/fGLxXDieMcozFyA.png)

图 5  wireshark 抓包结果

我们选取第一条(图 6)来查看,IP 数据包和 UDP 数据包的内容正和我们在程序中编写的一致.

![](https://s2.loli.net/2024/02/13/fGLxXDieMcozFyA.png)

图 6 第一条 UDP 报文

接着我们来看最后一条收到的 ICMP 报文(图 7),可以看到这条 ICMP 报文的源地址就是我们一开始的目的地址,这就说明我们已经追踪完了全部的路由路径.

![image.png](https://s2.loli.net/2024/02/13/1ZdjQVcolt6azAT.png)

图 7 最后一条 ICMP 报文

# 3   设计总结

## 3.1 存在问题

当存在多个网络适配器(如图 8 所示),程序可能无法正确识别准确的网络接口,导致程序在错误的网络接口一直发送数据包且无法正确收到回复,在循环中请求不断超时(如图 9 所示).暂时的解决方法是禁用其他无关的接口,只保留一个网络接口(如以太网).

![](https://s2.loli.net/2024/02/13/QY3fNbZAgMJFSEq.png)

图 8 存在多个网络适配器

![image.png](https://s2.loli.net/2024/02/13/mvZazgc6RXiePJG.png)

图 9 程序一直超时

## 3.2 改进方案

首先,由于 Traceroute 的实现不仅仅只有 UDP 协议,还有 ICMP 和 TCP 的实现方法,可以考虑在之后的程序中添加一个参数来指定所使用的协议来进行路由追踪.

此外,还可以考虑通过手动指定网络接口来解决多网卡的问题,或者通过自动检测网络接口来确定正确的网络接口进行路由追踪.还可以考虑使用系统的路由表来自动选择最优的路由路径进行追踪.

## 3.3 实验心得

在本次课程设计中,我选择了 Rust 这门语言来实现 Traceroute 功能,一方面是想挑战一下自己,检验一下自己对于这门语言的掌握能力,另一方面是因为 Rust 是一门非常优秀的编程语言,它具有很多优秀的特性,如快速运行时间、内存安全性、类型安全性等.使用 Rust 开发网络程序也十分方便,具有很多好用的库和抽象层,可以让我们快速而安全地开发网络应用程序.

在开发过程中,我首先使用了 Rust 标准库和 pnet 库中的网络相关的抽象层,来创建 UDP 数据包,我们需要了解如何处理不同类型的数据包,如 Ethernet 帧、IPv4 数据包和 ICMP 数据包.这些都是我们在学习过程中需要掌握的知识点,并通过这些来实现 Traceroute 的基本功能.随后,我通过自定义一些数据类型和函数来封装这些抽象层,使得程序更加模块化,代码更加清晰.

# 4 参考资料

[1] [9分钟让你明明白白看懂Traceroute(路由追踪)的原理与实现](https://zhuanlan.zhihu.com/p/404043710)

[2] [[Wireshark]抓包分析tracerouter命令的流程](https://blog.csdn.net/lingfy1234/article/details/121481241)

[3] [TCP/UDP/ICMP Traceroute的原理及区别](https://zhuanlan.zhihu.com/p/101810847)
