# Windows CMD 查看 IP 和 MAC 地址

> 更新时间：2026-07-01
> 触发场景：需要在 Windows 下用 cmd 快速查看本机 IP / MAC 地址，整理常用命令速查。

## 一句话结论

- **查 IP**：`ipconfig`（简洁，只看 IP）或 `ipconfig /all`（详细，含 MAC、DNS、DHCP）
- **查 MAC**：`getmac`（最直接，只看物理地址）或 `getmac /v`（带连接名和网卡型号）
- **查局域网内 IP↔MAC 对应**：`arp -a`（看同子网其他设备的 IP-MAC 缓存）

均为 Windows 自带命令，cmd 和 PowerShell 中均可直接运行，无需安装。

## 各命令对比表

| 命令 | 主要用途 | 能看 IP | 能看 MAC | 输出长度 | 备注 |
|------|---------|:------:|:-------:|:--------:|------|
| `ipconfig` | 查本机 IP 配置 | ✅ | ❌ | 中 | 只看 IP 用它最清爽 |
| `ipconfig /all` | 查完整网络配置 | ✅ | ✅（物理地址行） | 长 | 含 DNS、DHCP、网卡描述 |
| `getmac` | 专查 MAC 地址 | ❌ | ✅ | 短 | 只列物理地址 + 传输名称 |
| `getmac /v` | 查 MAC + 网卡名/型号 | ❌ | ✅ | 短 | `/v` = verbose，多网卡时更直观 |
| `arp -a` | 查局域网 IP-MAC 缓存表 | ✅（别人的） | ✅（别人的） | 中 | 只显示通信过的同子网设备 |

## 命令详解

### 1. `ipconfig` —— 查看本机 IP（最常用）

```cmd
ipconfig
```

输出示例（已脱敏）：

```
Windows IP 配置

无线局域网适配器 WLAN:

   连接特定的 DNS 后缀 . . . . . . . :
   IPv6 地址 . . . . . . . . . . . . : 2001:da8:215:3c0a:xxxx:xxxx:xxxx:xxxx
   临时 IPv6 地址. . . . . . . . . . : 2001:da8:215:3c0a:xxxx:xxxx:xxxx:xxxx
   本地链接 IPv6 地址. . . . . . . . : fe80::xxxx:xxxx:xxxx:xxxx%6
   IPv4 地址 . . . . . . . . . . . . : 10.129.116.43
   子网掩码  . . . . . . . . . . . . : 255.255.0.0
   默认网关. . . . . . . . . . . . . : fe80::xxxx:xxxx:xxxx:xxxx%6
                                       10.129.0.1
```

说明：只显示 IPv4/IPv6、子网掩码、默认网关，**不显示 MAC**。多块网卡（以太网、WLAN、虚拟网卡 vEthernet (WSL) 等）会分别列出，"媒体已断开连接"表示该网卡未连网。

### 2. `ipconfig /all` —— 查看完整配置（含 MAC）

```cmd
ipconfig /all
```

比 `ipconfig` 多出：**物理地址（即 MAC）**、网卡描述、DNS 服务器、DHCP 服务器、是否启用 DHCP、NetBIOS 等。关键行示例：

```
无线局域网适配器 WLAN:

   描述. . . . . . . . . . . . . . . : Realtek 8852BE Wi-Fi 6 802.11ax PCIe
   物理地址. . . . . . . . . . . . . : 1C-79-2D-XX-XX-XX   ← 这就是 MAC 地址
   DHCP 已启用 . . . . . . . . . . . : 是
   自动配置已启用. . . . . . . . . . : 是
   IPv4 地址 . . . . . . . . . . . . : 10.129.116.43
   子网掩码  . . . . . . . . . . . . : 255.255.0.0
   ...
```

要点：**"物理地址"那一行就是 MAC**，格式为十六进制用 `-` 分隔（如 `1C-79-2D-XX-XX-XX`）。

### 3. `getmac` —— 专查 MAC 地址（最简洁）

```cmd
getmac
```

输出示例（已脱敏）：

```
物理地址           传输名称
=================== ==========================================================
1C-79-2D-XX-XX-XX  \Device\Tcpip_{4C6CDC89-3436-4B8D-B116-2C47FACD2A19}
1C-79-2D-XX-XX-XX  媒体已断开连接
00-FF-9E-XX-XX-XX  媒体已断开连接
N/A                 没有硬件
```

说明：只列出物理地址和传输名称。**第一行（传输名称含 `\Device\Tcpip_` 的）通常是当前活动网卡的 MAC**；显示"媒体已断开连接"的是未连网的网卡（蓝牙、虚拟网卡等）；"没有硬件"是纯软件虚拟适配器（如 aTrust VPN）。

### 4. `getmac /v` —— 带网卡名和型号的 MAC 查询

```cmd
getmac /v
```

输出示例（已脱敏）：

```
连接名          网卡型号          物理地址           传输名称
=============== ================ ================== ==========================================================
WLAN            Realtek 8852BE   1C-79-2D-XX-XX-XX  \Device\Tcpip_{4C6CDC89-3436-4B8D-B116-2C47FACD2A19}
蓝牙网络连接    Bluetooth Device 1C-79-2D-XX-XX-XX  媒体已断开连接
虚拟网卡        TAP-Windows Adap 00-FF-9E-XX-XX-XX  媒体已断开连接
虚拟网卡 2      Sangfor aTrust   N/A                 没有硬件
```

说明：`/v` 表示 verbose（详细），比 `getmac` 多出"连接名"和"网卡型号"两列，**排查多网卡时一眼能看出 MAC 属于哪块网卡**，推荐用这个。

### 5. `arp -a` —— 查看局域网内 IP 与 MAC 的对应表

```cmd
arp -a
```

作用：列出本机 ARP 缓存中"局域网内其他设备的 IP → MAC"映射，常用于：
- 排查同子网设备 IP 冲突
- 定位某台设备的 MAC 地址
- 查看本机最近通信过的同网段设备

注意：
- 只显示**同子网**内本机**最近通信过**的设备，不是全网扫描。
- 想刷新某个 IP 的 ARP 条目，先 `ping <IP>`，再 `arp -a` 即可看到。
- ARP 表有老化时间，重启或超时后条目会消失。

## 易混淆点

- **MAC 地址 = 物理地址**：`ipconfig /all` 和 `getmac` 里都叫"物理地址"，是同一个东西，格式 `1C-79-2D-5B-5C-9A`（十六进制，`-` 分隔）。Linux 下叫 link/ether，概念一致。
- **`ipconfig` vs `ipconfig /all`**：前者不显示 MAC，后者才显示。只查 IP 用前者更清爽。
- **`getmac` vs `getmac /v`**：多一个 `/v` 就多出连接名和网卡型号，多网卡场景下更直观，推荐默认用 `/v`。
- **断开的网卡也会列出来**：`getmac` 会显示"媒体已断开连接"的蓝牙、虚拟网卡等，活动网卡看传输名称含 `\Device\Tcpip_` 的那一行。
- **IPv6 地址不等于 MAC**：IPv6 地址里虽然可能含 MAC（EUI-64 机制），但 `ipconfig` 显示的 IPv6 是网络地址，要看硬件地址请直接看"物理地址"行。
- **`arp -a` 看到的是别人的 MAC**：`ipconfig`/`getmac` 看的是本机 MAC，`arp -a` 看的是局域网其他设备的 MAC，别混用。

## 使用场景速查

| 场景 | 推荐命令 |
|------|---------|
| 快速看自己的 IP | `ipconfig` |
| 排查网络问题，要看 IP + MAC + DNS + DHCP 全套 | `ipconfig /all` |
| 只要 MAC 地址（填表、绑定等） | `getmac` |
| 不确定 MAC 是哪块网卡的 | `getmac /v` |
| 想知道局域网某台设备的 MAC / 排查 IP 冲突 | `ping <IP>` 后 `arp -a` |
| 释放/续租 DHCP（修复 IP 获取异常） | `ipconfig /release` → `ipconfig /renew` |
| 清空 DNS 缓存（修复域名解析问题） | `ipconfig /flushdns` |

## 环境信息

- 操作系统：Windows 11
- 运行环境：cmd / PowerShell 均可（Windows 自带，无需安装）
- 实测日期：2026-07-01
- 注：git bash 中直接调用 `ipconfig`/`getmac` 中文会乱码（编码问题），在原生 cmd 或 PowerShell 窗口中中文显示正常。

## 相关链接或关联笔记

- Linux 下查看 IP / MAC：`ip addr` / `ifconfig`（待补充对应笔记，可放入 `linux/` 或 `troubleshooting/Linux系统管理/`）
- 远程连接与网络排查：见 `troubleshooting/远程连接与传输/`
