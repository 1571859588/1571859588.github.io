# frpc 学习笔记：内网穿透从入门到实战

> 更新时间：2026-06-28 | 适用版本：frp 0.52+ (TOML 配置格式)

---

## 一、什么是 frpc / FRP？

### 1.1 一句话解释

**FRP（Fast Reverse Proxy）** 是一个高性能的反向代理工具，用于将内网服务暴露到公网。`frpc` 是它的客户端部分。

### 1.2 什么是"内网穿透"？—— 从一个真实场景说起

> 你在家写了个 Web 应用跑在本地 `localhost:8080`，想让朋友访问，但你没有公网 IP。

这就是**内网穿透**要解决的问题：

```
你的朋友（公网）
      │
      │  访问 http://your-server.com:6000
      ▼
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  公网服务器   │ ◄─────► │   你的电脑(内网)   │         │  朋友的浏览器     │
│  运行 frps    │  隧道    │   运行 frpc       │         │                  │
│  有公网 IP    │         │  localhost:8080   │         └──────────────────┘
└──────────────┘         └──────────────────┘
```

**原理简述**：
- 你的电脑（frpc）**主动**连接到公网服务器（frps），建立一条"隧道"
- 朋友访问公网服务器的某个端口
- frps 把流量通过隧道转发给你本地的服务
- 因为是 frpc 主动连出去的，所以**不需要你有公网 IP**，也**不需要开路由器端口映射**

### 1.3 FRP 的两个组件

| 组件 | 全称 | 部署位置 | 作用 |
|------|------|----------|------|
| **frps** | FRP Server | 公网服务器（云服务器） | 接收外部请求，转发给对应的 frpc |
| **frpc** | FRP Client | 内网机器（你的电脑） | 主动连接 frps，将流量转发到本地服务 |

> 记忆口诀：**s = server（服务端），c = client（客户端）**。frps 在云上等，frpc 从内网连过去。

---

## 二、完整搭建流程

### 2.1 第一步：部署服务端（frps）

**在你的公网云服务器上操作。**

#### 下载 FRP

```bash
# 去 GitHub releases 页面下载最新版
# https://github.com/fatedier/frp/releases

# 示例：下载 v0.61.0 Linux amd64 版本
wget https://github.com/fatedier/frp/releases/download/v0.61.0/frp_0.61.0_linux_amd64.tar.gz

# 解压
tar -zxvf frp_0.61.0_linux_amd64.tar.gz
cd frp_0.61.0_linux_amd64
```

#### 配置 frps.toml

```toml
# frps.toml - 服务端配置文件
bindPort = 7000          # frpc 连接 frps 的端口（默认 7000）
auth.method = "token"    # 认证方式
auth.token = "your_secure_token_here_123"  # 客户端必须匹配这个 token

# Dashboard 管理面板（可选但推荐）
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "admin123"
```

> **注意**：旧版 FRP（< 0.52）使用 INI 格式（`frps.ini`），新版使用 TOML 格式（`frps.toml`）。如果你看到 `[common]` 这种写法，那就是旧版 INI 格式。

#### 启动 frps

```bash
# 前台运行（调试用）
./frps -c frps.toml

# 后台运行
nohup ./frps -c frps.toml > frps.log 2>&1 &
```

#### 别忘了开防火墙端口

```bash
# 云服务器安全组 / 防火墙需要放行：
# - 7000（frpc 连接端口）
# - 7500（Dashboard，建议限制 IP）
# - 6000-6100（你打算映射的端口范围）
```

---

### 2.2 第二步：配置客户端（frpc）

**在你的内网电脑上操作。**

#### 下载 FRP（同一压缩包，里面有 frpc）

```bash
# Windows：下载 frp_x.x.x_windows_amd64.zip
# Mac：下载 frp_x.x.x_darwin_amd64.tar.gz 或 darwin_arm64（M 芯片）
# Linux：下载 frp_x.x.x_linux_amd64.tar.gz
```

#### 配置 frpc.toml

```toml
# frpc.toml - 客户端配置文件
serverAddr = "x.x.x.x"       # 你的公网服务器 IP
serverPort = 7000             # 对应 frps 的 bindPort
auth.method = "token"
auth.token = "your_secure_token_here_123"  # 必须和 frps 一致！
```

#### 启动 frpc

```bash
# 前台运行
./frpc -c frpc.toml

# 看到 "start proxy success" 就说明连接成功了
```

---

### 2.3 配置格式对照（旧版 INI vs 新版 TOML）

| 特性 | 旧版 INI（< 0.52） | 新版 TOML（0.52+） |
|------|---------------------|---------------------|
| 配置文件名 | `frps.ini` / `frpc.ini` | `frps.toml` / `frpc.toml` |
| 服务端端口 | `[common]` → `bind_port = 7000` | `bindPort = 7000` |
| Token 认证 | `token = xxx` | `auth.method = "token"` + `auth.token = "xxx"` |
| 代理定义 | `[ssh]` → `type = tcp` | `[[proxies]]` → `name = "ssh"` + `type = "tcp"` |

> 如果你在网上看到教程用 `[common]` 和 `[ssh]` 这种段落格式，那就是旧版 INI。新版 TOML 用 `[[proxies]]` 数组来定义代理。

---

## 三、常用场景 & 完整配置示例

### 3.1 场景一：TCP 隧道 —— 远程 SSH 连到家里服务器

> 需求：你在公司，想 SSH 连到家里的 Linux 服务器（内网 IP 192.168.1.100，SSH 端口 22）。

在 frpc.toml 中添加代理：

```toml
# frpc.toml（客户端，家里服务器上）
serverAddr = "x.x.x.x"
serverPort = 7000
auth.method = "token"
auth.token = "your_secure_token_here_123"

[[proxies]]
name = "home-ssh"
type = "tcp"
localIP = "192.168.1.100"       # 家里服务器的内网 IP（如果是本机可以写 127.0.0.1）
localPort = 22                  # SSH 服务端口
remotePort = 6000               # 公网服务器上暴露的端口
```

**使用方式**：

```bash
# 在公司电脑上：
ssh -p 6000 user@x.x.x.x
# 等价于直接 SSH 到家里服务器的 22 端口
```

**流量走向**：
```
公司电脑 → ssh x.x.x.x:6000 → frps(公网) → 隧道 → frpc(家里) → 192.168.1.100:22
```

---

### 3.2 场景二：HTTP 隧道 —— 把本地 Web 应用暴露到公网

> 需求：你本地跑了个网站 `localhost:8080`，想让朋友通过域名 `demo.yourdomain.com` 访问。

**前提**：你有一个域名，并将 DNS A 记录指向你的公网服务器 IP。

```toml
# frpc.toml
serverAddr = "x.x.x.x"
serverPort = 7000
auth.method = "token"
auth.token = "your_secure_token_here_123"

[[proxies]]
name = "web-demo"
type = "http"
localPort = 8080
customDomains = ["demo.yourdomain.com"]     # 绑定的域名
```

**服务端需要额外配置 vhost**：

```toml
# frps.toml（服务端）
bindPort = 7000
vhostHTTPPort = 80          # HTTP 虚拟主机监听端口
auth.method = "token"
auth.token = "your_secure_token_here_123"
```

**使用方式**：

```
朋友访问 http://demo.yourdomain.com:80 → frps → 隧道 → frpc → localhost:8080
```

**HTTPS 版本**（type 改成 `https`，服务端配置 `vhostHTTPSPort`）：

```toml
# frpc.toml
[[proxies]]
name = "web-demo-https"
type = "https"
localPort = 443
customDomains = ["demo.yourdomain.com"]
```

```toml
# frps.toml
vhostHTTPSPort = 443
```

> **HTTP vs TCP 的区别**：HTTP 类型支持通过域名区分不同的 Web 服务（多个代理共用 80 端口），TCP 类型则一个端口只能对应一个服务。

---

### 3.3 场景三：STCP —— 安全的点对点连接（不暴露公网端口）

> 需求：你想让同事 SSH 到你本地的开发机，但不想在公网服务器上开放端口（安全考虑）。

STCP（Secret TCP）的特点是**不在公网服务器上监听额外端口**，访问方也需要运行一个 frpc 作为"访客"。

**被访问方（你的开发机）—— frpc.toml**：

```toml
serverAddr = "x.x.x.x"
serverPort = 7000
auth.method = "token"
auth.token = "your_secure_token_here_123"

[[proxies]]
name = "dev-ssh"
type = "stcp"
secretKey = "stcp_password_abc"     # 访问方需要知道这个密钥
localIP = "127.0.0.1"
localPort = 22
```

**访问方（同事的电脑）—— frpc.toml**：

```toml
serverAddr = "x.x.x.x"
serverPort = 7000
auth.method = "token"
auth.token = "your_secure_token_here_123"

[[visitors]]
name = "dev-ssh-visitor"
type = "stcp"
serverName = "dev-ssh"              # 对应被访问方的 proxy name
secretKey = "stcp_password_abc"     # 必须匹配！
bindAddr = "127.0.0.1"
bindPort = 6000                     # 本地监听端口
```

**使用方式**：同事在自己电脑上执行 `ssh -p 6000 user@127.0.0.1`，流量会通过 frps 中继，但不暴露任何公网端口。

```
同事 localhost:6000 → 同事的frpc → frps(中继，不监听额外端口) → 你的frpc → localhost:22
```

---

### 3.4 场景四：UDP 转发

> 需求：转发 DNS 查询或者其他 UDP 流量。

```toml
# frpc.toml
[[proxies]]
name = "dns-forward"
type = "udp"
localIP = "127.0.0.1"
localPort = 53               # 本地 DNS 服务
remotePort = 6053             # 公网暴露的 UDP 端口
```

---

## 四、将 frpc 配置为系统服务（开机自启 + 自动重启）

### 4.1 Linux：使用 systemd

创建服务文件：

```bash
sudo vim /etc/systemd/system/frpc.service
```

```ini
[Unit]
Description=FRP Client Service
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/frpc -c /etc/frp/frpc.toml
ExecReload=/bin/kill -HUP $MAINPID

[Install]
WantedBy=multi-user.target
```

```bash
# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable frpc
sudo systemctl start frpc

# 查看状态
sudo systemctl status frpc

# 查看日志
journalctl -u frpc -f
```

> **关键点**：`Restart=on-failure` + `RestartSec=5s` 确保 frpc 异常退出后自动重启，网络波动时非常有用。

### 4.2 Windows：使用 nssm 注册为服务

```powershell
# 下载 nssm：https://nssm.cc/download
# 以管理员身份运行：

nssm install frpc "C:\frp\frpc.exe" "-c" "C:\frp\frpc.toml"
nssm set frpc AppDirectory "C:\frp"
nssm set frpc AppStdout "C:\frp\frpc.log"
nssm set frpc AppStderr "C:\frp\frpc_err.log"
nssm start frpc
```

**或者使用 Windows 计划任务（无需额外工具）**：

```powershell
# 创建开机自启的计划任务
schtasks /create /tn "frpc" /tr "C:\frp\frpc.exe -c C:\frp\frpc.toml" /sc onlogon /rl highest /f
```

---

## 五、Dashboard 监控面板

在 frps.toml 中开启 Dashboard：

```toml
# frps.toml
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "your_dashboard_password"

# 可选：开启 TLS 访问 Dashboard
# webServer.tls = true
```

访问 `http://x.x.x.x:7500`，可以看到：
- 当前连接的代理列表
- 每个代理的流量统计（上传/下载）
- 连接状态（在线/离线）

> **安全提示**：生产环境建议通过 Nginx 反向代理 Dashboard，并加上 HTTPS 和 IP 白名单。

---

## 六、安全最佳实践

### 6.1 Token 认证（必做）

```toml
# frps.toml 和 frpc.toml 都要配
auth.method = "token"
auth.token = "一个足够长的随机字符串_比如用pwgen生成32位"
```

> 没有 token 认证的 frps 相当于在公网上裸奔，任何人都能连上来开代理。

### 6.2 TLS 加密通信（推荐）

```toml
# frpc.toml
transport.tls.enable = true
```

```toml
# frps.toml（强制所有客户端使用 TLS）
transport.tls.force = true
```

> 防止隧道流量被中间人窃听，特别是在公共网络环境下。

### 6.3 限制允许的端口范围（服务端）

```toml
# frps.toml
allowPorts = [
  { start = 6000, end = 6100 },
  { start = 8000, end = 8010 },
]
```

> 防止客户端随意绑定端口，比如绑到 22（SSH）或 3306（MySQL）这种敏感端口。

### 6.4 不要暴露敏感服务

- 不要把数据库端口（3306、5432）直接用 TCP 代理暴露到公网
- 如果必须暴露 SSH，建议改用密钥认证 + 禁用密码登录
- STCP 比 TCP 更安全，因为它不暴露公网端口

### 6.5 安全配置检查清单

```
[ ] Token 认证已开启，且 token 足够复杂
[ ] TLS 加密已启用
[ ] allowPorts 限制了端口范围
[ ] Dashboard 密码已修改（非默认 admin/admin）
[ ] 敏感服务未直接暴露到公网
[ ] 云服务器安全组只开放了必要端口
```

---

## 七、常见问题排查

### 7.1 `connect to server error: dial tcp x.x.x.x:7000: connect: connection refused`

**原因**：frpc 连不上 frps。

**排查步骤**：
1. frps 是否在运行？ → `ps aux | grep frps` 或 `systemctl status frps`
2. 云服务器安全组是否放行了 7000 端口？
3. 服务器防火墙是否放行？ → `sudo ufw status` 或 `firewall-cmd --list-ports`
4. serverAddr 和 serverPort 是否写对了？

### 7.2 `port already in use`

**原因**：remotePort 被其他程序占用了。

```bash
# 在公网服务器上检查端口占用
ss -tlnp | grep 6000
# 或
netstat -tlnp | grep 6000
```

**解决**：换一个 remotePort，或者 kill 掉占用端口的进程。

### 7.3 `login to server failed, token is incorrect`

**原因**：frpc 和 frps 的 auth.token 不一致。

**排查**：
- 仔细对比两边的 token，注意多余的空格或换行
- 如果用的是旧版 INI，确认 key 是 `token` 而不是 `privilege_token`（更早的版本）

### 7.4 `proxy [xxx] start error`

**原因**：代理配置有问题，常见于：
1. `remotePort` 与 `allowPorts` 范围不匹配
2. 同名代理已存在（name 重复）
3. HTTP 代理没配 `customDomains`

**排查**：查看 frps 日志，通常会有更详细的错误信息。

### 7.5 连接不稳定，经常断开

**解决**：

```toml
# frpc.toml - 开启心跳和自动重连
transport.heartbeatTimeout = 90      # 心跳超时（秒）
transport.heartbeatInterval = 30     # 心跳间隔（秒）
```

同时确保 systemd 服务配了 `Restart=on-failure`。

---

## 八、面试回答

### Q1：什么是内网穿透？请举例说明实现方式。

> **参考回答**：
>
> 内网穿透是指将内网中的服务暴露到公网，使外部用户可以访问内网资源。典型场景是：开发者在本地跑了一个 Web 应用（localhost:8080），希望外网用户能访问，但本地没有公网 IP，也无法配置路由器端口映射。
>
> 实现原理是：在内网机器上部署一个客户端（如 frpc），它主动连接到公网上的服务端（frps），建立长连接隧道。外部用户的请求先到达 frps，frps 通过隧道转发给 frpc，frpc 再把请求发给本地服务，响应沿原路返回。因为是内网主动发起连接，所以不受 NAT 限制。
>
> 常见工具有 frp、ngrok、zerotier 等。frp 是开源的、可自建服务端的方案，支持 TCP/UDP/HTTP/HTTPS 等多种代理类型，适合生产环境使用。

### Q2：frp 和 ngrok 有什么区别？

> **参考回答**：
>
> 主要区别在四个方面：
>
> 1. **部署方式**：frp 需要自建服务端（frps 部署在自己的云服务器），ngrok 官方提供托管服务，开箱即用。
> 2. **成本**：frp 完全开源免费，只需要一台云服务器的成本；ngrok 免费版有限制（随机域名、连接数限制），付费版按月收费。
> 3. **可控性**：frp 自建方案完全可控，数据不经过第三方；ngrok 托管版流量经过 ngrok 服务器，有数据隐私风险。
> 4. **功能**：frp 支持 STCP（点对点安全隧道）、UDP 转发、端口范围限制等高级功能；ngrok 在内网调试、临时分享场景更方便。
>
> 总结：临时调试用 ngrok，长期稳定使用或生产环境用 frp。

---

## 九、深入追问

### Q1：STCP 和 TCP 代理有什么区别？什么时候用 STCP？

TCP 代理会在 frps 上监听一个公网端口（remotePort），任何人都能访问这个端口（知道地址就行）。

STCP（Secret TCP）不会在 frps 上监听额外端口，访问方也必须运行一个 frpc 作为 visitor，通过 `secretKey` 进行双向认证。流量仍然经过 frps 中继，但不暴露公网端口。

**选择原则**：
- TCP：需要给不特定的外部用户访问（如公开的 Web 服务）
- STCP：只给特定的几个人访问（如团队内部的 SSH、开发环境），安全性更高

### Q2：frp 的安全加固还有哪些手段？

除了 Token + TLS 之外：
- **OIDC 认证**：Dashboard 支持 OIDC（OpenID Connect）单点登录
- **多用户隔离**：使用 `multi_user` 插件，不同客户端用不同的 user/key，互相隔离
- **自定义 TLS 证书**：不使用自签名，而是用 CA 签发的证书，防中间人攻击
- **带宽限制**：在 proxy 配置中设 `transport.bandwidthLimit`，防止单个代理占满带宽
- **审计日志**：记录所有代理的创建、连接、断开事件

### Q3：frp 的性能和并发能力怎么样？

frp 用 Go 编写，性能很好：
- 单 frps 实例可以处理上千个并发代理连接
- 流量转发延迟主要取决于网络条件（frpc → frps 的链路质量）
- 如果需要更高吞吐，可以部署多个 frps 实例做负载均衡
- HTTP/HTTPS 代理支持 `useCompression = true`，压缩传输减少带宽消耗

---

## 十、易混淆点

### 10.1 frpc vs frps

| | frpc（Client） | frps（Server） |
|--|----------------|----------------|
| 部署位置 | 内网机器 | 公网服务器 |
| 角色 | 主动发起连接 | 被动等待连接 |
| 配置文件 | frpc.toml | frps.toml |
| 核心配置 | serverAddr, proxies | bindPort, auth |

> 记法：**c 在你这边（client），s 在服务器那边（server）**。

### 10.2 TCP 代理 vs HTTP 代理

| | TCP 代理 | HTTP 代理 |
|--|----------|-----------|
| type | `"tcp"` | `"http"` |
| 端口映射 | 一个 remotePort 对应一个服务 | 多个服务可共用 vhostHTTPPort（通过域名区分） |
| 需要域名 | 不需要 | 需要 customDomains |
| 适用场景 | SSH、RDP、数据库、游戏 | Web 应用、API 服务 |
| 服务端配置 | 只需 bindPort | 还需配 vhostHTTPPort |

> **选哪个？** 如果是 Web 服务且有域名，用 HTTP（可以多个服务共用 80 端口）；其他一律用 TCP。

### 10.3 frp vs ngrok vs zerotier

| | frp | ngrok | zerotier |
|--|-----|-------|----------|
| 类型 | 反向代理隧道 | 反向代理隧道（SaaS） | 虚拟组网（P2P） |
| 需要公网服务器 | 需要 | 不需要（官方托管） | 不需要（有官方 Planet） |
| 开源 | 完全开源 | 部分开源 | 开源 |
| 原理 | 隧道转发 | 隧道转发 | 虚拟局域网（每台设备像在同一 LAN） |
| 适合场景 | 暴露内网服务到公网 | 临时调试、demo 演示 | 多台设备组网互联（如远程办公） |
| 访问方式 | 通过公网 IP/域名 | ngrok 给的随机域名 | 每台设备有虚拟 IP，直接访问 |

> **简单总结**：
> - 要暴露服务给别人访问 → **frp**（自建可控）或 **ngrok**（快速临时）
> - 要让自己的多台设备互联 → **zerotier**（虚拟局域网）

### 10.4 remotePort vs localPort vs serverPort

```
serverPort = 7000      → frpc 连 frps 的通信端口（控制连接）
remotePort = 6000      → 公网服务器上暴露给外部用户的端口
localPort  = 8080      → 内网本地服务的端口
```

> 一句话：外部用户访问 `serverIP:remotePort` → 流量转到 `localIP:localPort`，而 `serverPort` 是 frpc 和 frps 之间通信用的。

---

## 十一、速查：一个完整的实战配置模板

### frps.toml（服务端，部署在云服务器）

```toml
bindPort = 7000
auth.method = "token"
auth.token = "my_super_secret_token_2026"

# Dashboard
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "dashboard_pwd_change_me"

# HTTP 虚拟主机
vhostHTTPPort = 80
vhostHTTPSPort = 443

# 安全：限制端口范围
allowPorts = [
  { start = 6000, end = 6100 },
  { start = 8000, end = 8010 },
]

# 强制 TLS
transport.tls.force = true
```

### frpc.toml（客户端，部署在内网机器）

```toml
serverAddr = "1.2.3.4"
serverPort = 7000
auth.method = "token"
auth.token = "my_super_secret_token_2026"
transport.tls.enable = true

# 代理 1：SSH
[[proxies]]
name = "ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6000

# 代理 2：Web 应用
[[proxies]]
name = "web"
type = "http"
localPort = 8080
customDomains = ["dev.mydomain.com"]

# 代理 3：安全点对点 SSH（不暴露公网端口）
[[proxies]]
name = "secret-ssh"
type = "stcp"
secretKey = "peer2peer_key"
localIP = "127.0.0.1"
localPort = 22
```

---

## 十二、学习路线建议

```
1. 先搞懂"内网穿透"解决什么问题（本文第一、二节）
        ↓
2. 动手搭一遍：买个最便宜的云服务器，跑通 TCP + HTTP 代理（第三节）
        ↓
3. 配成 systemd 服务，体验开机自启 + 断线重连（第四节）
        ↓
4. 加上 TLS + Token + allowPorts，理解安全加固（第六节）
        ↓
5. 尝试 STCP，理解 P2P 中继模式（第三节 3.3）
        ↓
6. 读 frp 官方文档：https://github.com/fatedier/frp
```

> 最后一个建议：**别光看，动手跑一遍比看十遍笔记有用。** 买台 1 核 1G 的云服务器（学生机很便宜），半小时就能搭完。
