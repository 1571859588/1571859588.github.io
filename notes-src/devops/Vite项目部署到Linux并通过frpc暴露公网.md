# Vite 项目部署到 Linux 并通过 frpc 暴露公网：完整链路实战

> 更新时间：2026-06-29（新增 frpc 安装步骤 + screen 后台运行方式）| 适用：Vite 5.x / Node 18+ / frp 0.52+ / pm2 5+
> 状态：综合部署实战笔记，跨 Vite / Node / pm2 / frpc / Linux 多个工具
> 关联笔记：`frontend/Vite学习笔记.md`、`devops/frpc学习笔记.md`、`troubleshooting/Node生态/Node npm pnpm corepack 和 pm2 进程管理.md`

---

## 一句话结论

**Windows 开发的 Vite 项目，`npm run build` 后把 `dist/` 整个目录传到 Linux 服务器，用静态服务器（`serve` 或 `vite preview`）+ pm2 托管跑起来，再通过 frpc 隧道把本地端口映射到阿里云公网端口，外部用户即可通过 `阿里云IP:端口` 访问。** 阿里云那边**不一定需要 Nginx**——纯端口转发场景 frps 直接搞定；要域名/HTTPS/多服务复用 80 端口才需要 Nginx。

---

## 二、整体架构图（先看清全貌）

```
┌─────────────────────────────────────────────────────────────────┐
│  外部用户浏览器                                                   │
│  访问 http://阿里云IP:8080                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 公网
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  阿里云服务器（公网，别人负责）                                    │
│  ┌──────────────┐                                                │
│  │   frps       │  监听 8080 端口（remotePort）                  │
│  │   服务端      │  监听 7000 端口（bindPort，frpc 连接用）       │
│  └──────────────┘                                                │
│  需要做：                                                        │
│  1. 安全组放行 8080 和 7000 端口                                 │
│  2. 防火墙放行（如果开了）                                       │
│  3. 跑 frps                                                     │
│  不一定需要 Nginx（见第六章）                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ frp 隧道（frpc 主动连 frps）
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  本地 Linux 开发服务器（你负责）                                  │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │   frpc       │    │  pm2 托管的   │                           │
│  │   客户端      │───→│  静态服务     │                           │
│  │  连接 frps    │    │  serve dist  │                           │
│  └──────────────┘    │  端口 4173    │                           │
│                      └──────────────┘                           │
│  ┌──────────────┐                                                │
│  │   dist/      │  ← 从 Windows 传过来的构建产物                 │
│  │  静态文件     │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ 开发阶段在 Windows
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Windows 开发机                                                  │
│  1. 写代码                                                       │
│  2. npm run build → 生成 dist/                                   │
│  3. scp / rsync 把 dist 传到 Linux 服务器                        │
└─────────────────────────────────────────────────────────────────┘
```

**数据流向**：用户请求 → 阿里云 frps → 隧道 → 本地 frpc → 本地静态服务 → 返回 dist 里的文件。

---

## 三、Windows 开发 → build → 传到 Linux

### 3.1 Windows 上 build 产物能直接给 Linux 用吗？——能

**核心结论**：`dist/` 是**纯静态文件**（HTML + JS + CSS + 图片），与操作系统无关，Windows build 出来的 dist 在 Linux 上能直接用，**不需要在 Linux 上重新 build**。

**为什么能跨平台**：

- HTML/CSS/JS 是文本文件，浏览器解析，跟服务器 OS 无关
- 文件内容不包含任何 Windows 特定的东西（路径、换行符等不影响浏览器解析）
- Vite/Rollup 打包时已经处理好了所有依赖

**唯一要注意的小点**：

| 注意点 | 说明 | 处理 |
|--------|------|------|
| 换行符 | Windows 是 CRLF，Linux 是 LF | 静态文件不影响（浏览器都认），不用担心 |
| 文件名大小写 | Windows 不敏感，Linux 敏感 | Vite 打包产物都是小写带 hash，不会出问题 |
| 文件编码 | 都用 UTF-8 | 默认就是 |
| base 路径 | 如果部署在子路径要配 | 见 Vite 笔记第十章坑2 |

### 3.2 在 Windows 上 build

```bash
# 进入项目目录
cd D:\projects\my-vite-app

# 安装依赖（首次或依赖变化时）
pnpm install

# 生产构建
pnpm build
# 或 npm run build
```

构建完成后，`dist/` 目录就是你要的产物。

### 3.3 把 dist 传到 Linux 服务器

**方式一：scp（最简单）**

```bash
# Windows PowerShell / Git Bash 都能用 scp
# 把整个 dist 目录传到 Linux 服务器的 /home/user/docqa 目录
scp -r D:\projects\my-vite-app\dist user@linux-server-ip:/home/user/docqa/

# 如果用 SSH 密钥免密，更顺滑（见 troubleshooting/远程连接与传输/SSH 免密登录）
```

**方式二：rsync（推荐，增量传输）**

```bash
# rsync 只传变化的文件，大项目更新很快
# Windows 上用 Git Bash 或 WSL 跑
rsync -avz --delete D:/projects/my-vite-app/dist/ user@linux-server-ip:/home/user/docqa/dist/
```

> `--delete` 会删除目标端多余文件，保持和源端完全一致。第一次传用 scp，后续更新用 rsync。

**方式三：打包再传（适合慢网络）**

```bash
# Windows 上先打包
cd D:\projects\my-vite-app
tar -czf dist.tar.gz dist/

# 传过去
scp dist.tar.gz user@linux-server-ip:/home/user/docqa/

# Linux 上解压
ssh user@linux-server-ip
cd /home/user/docqa
tar -xzf dist.tar.gz
```

### 3.4 Linux 上的目录结构

传完后，Linux 服务器上大概长这样：

```
/home/user/docqa/
├── dist/                    ← 你传过来的构建产物
│   ├── index.html
│   └── assets/
│       ├── index-a1b2c3.js
│       ├── index-d4e5f6.css
│       └── logo-g7h8i9.png
├── package.json             ← 可选，如果用 vite preview 需要
├── /etc/frp/
│   ├── frpc                 ← frpc 二进制（下载解压复制过来）
│   └── config.toml          ← frpc 配置
└── start.sh                 ← 启动脚本（可选）
```

---

## 四、在 Linux 上启动 dist（pm2 托管）

### 4.1 关键认知：pm2 不能"直接启动 dist"

`pm2` 是进程管理器，它启动的是**命令**（进程），不是文件。`dist/` 是一堆静态文件，pm2 本身不能"运行"它们。

你需要一个**静态文件服务器**来托管 dist，然后用 pm2 把这个服务器进程托管起来（后台跑、自动重启、查日志）。

```
pm2 启动的是"静态服务器进程"
        ↓
静态服务器监听某端口（如 4173）
        ↓
浏览器访问 端口 → 静态服务器读 dist 里的文件返回
```

### 4.2 `pm2 start "pnpm start"` 是什么意思

你提到的 `pm2 start "pnpm start" --name docqa20260505`，意思是：

1. `pnpm start` 执行的是项目 `package.json` 里的 `start` 脚本
2. 这个 `start` 脚本的内容**决定了实际跑什么**
3. 如果 `start` 是 `"vite preview"`，那 pm2 实际跑的是 vite preview
4. 如果 `start` 是 `"serve dist"`，那 pm2 实际跑的是 serve dist

**所以能不能用 `pm2 start "pnpm start"`，取决于 package.json 里 start 脚本写的啥。**

### 4.3 三种启动 dist 的方式（任选其一）

#### 方式 A：用 `serve`（最简单，推荐）

`serve` 是一个超轻量的静态文件服务器，专为托管 dist 这类静态文件设计。

```bash
# 全局安装 serve
pnpm add -g serve
# 或 npm install -g serve

# 测试一下能不能跑
cd /home/user/docqa
serve dist -l 4173
# 访问 http://linux-server-ip:4173 看看

# 用 pm2 托管
pm2 start "serve dist -l 4173" --name docqa20260505

# 查看状态
pm2 status
pm2 logs docqa20260505
```

#### 方式 B：用 `vite preview`（如果项目源码也在）

如果你把整个项目（含 package.json 和 node_modules）都传过去了，可以用 vite 自带的预览服务器：

```bash
# package.json 的 scripts 里
{
  "scripts": {
    "start": "vite preview --port 4173 --host"
  }
}

# 启动
pm2 start "pnpm start" --name docqa20260505
# 或更稳妥的写法
pm2 start pnpm --name docqa20260505 -- start
```

> `--host` 让服务监听所有网卡（默认只监听 localhost，外部访问不到）。

#### 方式 C：用 Nginx（生产最推荐，但不用 pm2 托管）

如果 Linux 服务器装了 Nginx，直接让 Nginx 托管 dist，**不需要 pm2**（Nginx 自己就是 systemd 管理的常驻服务）。

```nginx
# /etc/nginx/conf.d/docqa.conf
server {
    listen 4173;
    server_name _;
    root /home/user/docqa/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;     # SPA 路由回退
    }
}
```

```bash
sudo nginx -t              # 测试配置
sudo systemctl reload nginx
```

> 方式 C 不用 pm2，因为 Nginx 本身就是常驻服务。pm2 主要用于托管 Node 进程。

### 4.4 推荐方案：serve + pm2

对于你的场景（前端静态 + frpc 暴露），**方式 A（serve + pm2）最合适**：

```bash
# 一次性配置
pnpm add -g serve
cd /home/user/docqa

# 启动并托管
pm2 start "serve dist -l 4173" --name docqa20260505

# 保存进程列表（开机自启）
pm2 save
pm2 startup        # 按提示执行生成的命令

# 日常操作
pm2 logs docqa20260505          # 看日志
pm2 restart docqa20260505       # 重启（更新 dist 后）
pm2 stop docqa20260505          # 停止
pm2 delete docqa20260505        # 删除托管
```

**更新前端代码后的流程**：

```bash
# 1. Windows 上重新 build
pnpm build

# 2. 传到 Linux（rsync 增量）
rsync -avz --delete D:/projects/my-vite-app/dist/ user@linux-ip:/home/user/docqa/dist/

# 3. Linux 上重启 pm2 进程（serve 会重新读 dist）
ssh user@linux-ip
pm2 restart docqa20260505
```

---

## 五、frpc 配置：把本地端口映射到阿里云

### 5.1 你的角色：配置 frpc（客户端）

你不负责阿里云，所以你只需要：
1. 知道阿里云 frps 的连接地址和端口（问负责阿里云的同事）
2. 知道阿里云那边给你分配的 remotePort（外部访问用的端口）
3. 在本地 Linux 配置 frpc，把本地 4173 映射到阿里云的 remotePort

### 5.2 安装 frpc

frpc 是开源项目 [fatedier/frp](https://github.com/fatedier/frp) 的客户端二进制，**不需要编译，下载解压即用**。安装就是把 `frpc` 这个可执行文件放到 Linux 服务器上。

#### 方式一：下载官方二进制（推荐，最简单）

```bash
# 1. 下载（以 v0.61.0 为例，去 https://github.com/fatedier/frp/releases 看最新版）
wget https://github.com/fatedier/frp/releases/download/v0.61.0/frp_0.61.0_linux_amd64.tar.gz

# 2. 解压
tar -zxvf frp_0.61.0_linux_amd64.tar.gz
cd frp_0.61.0_linux_amd64
# 目录里有两个关键文件：frpc（客户端，你要的） 和 frps（服务端，阿里云上用）

# 3. 放到固定目录（惯例用 /etc/frp）
sudo mkdir -p /etc/frp
sudo cp frpc /etc/frp/
# frps 用不到可以不复制（那是阿里云上跑的）

# 4. 验证
/etc/frp/frpc --version
# 输出类似：0.61.0

# 5. 清理下载的压缩包
cd ..
rm -rf frp_0.61.0_linux_amd64 frp_0.61.0_linux_amd64.tar.gz
```

安装完成后，`/etc/frp/` 目录下只有 `frpc` 一个文件，配置文件等会儿也放这里。

#### 方式二：用包管理器（部分发行版有，但版本可能旧）

```bash
# Ubuntu/Debian（版本可能较旧，不推荐）
sudo apt install frpc

# 或用 snap
sudo snap install frp
```

> **推荐方式一**：GitHub Releases 的二进制是官方最新版，且不依赖包管理器，跨发行版一致。

#### 关于版本和格式的重要说明

| FRP 版本 | 配置格式 | 配置文件名 |
|----------|----------|------------|
| < 0.52 | INI | `frpc.ini` |
| ≥ 0.52 | **TOML** | `frpc.toml` 或 `config.toml`（名字随意） |

你用的命令是 `./frpc -c config.toml`，说明是 **≥ 0.52 的新版**，配置文件叫 `config.toml`（名字可以自定义，`-c` 参数指定哪个都行）。本文档统一用 `config.toml` 这个名字，与你的实际用法一致。

> 如果在网上看到教程用 `[common]` 段落和 `frpc.ini`，那是旧版 INI 格式，**别照抄**。新版 TOML 用 `[[proxies]]` 数组定义代理。

### 5.3 config.toml 配置

> 配置文件放在 `/etc/frp/config.toml`（你的实际路径）。下面内容与 `frpc.toml` 完全等价，只是文件名不同。

```toml
# /etc/frp/config.toml

# 阿里云 frps 的连接信息（问同事要）
serverAddr = "阿里云公网IP"
serverPort = 7000                    # frps 的 bindPort
# 如果有 token 认证
# auth.token = "xxx"

# 你的前端服务代理
[[proxies]]
name = "docqa-web"
type = "tcp"                         # TCP 转发
localIP = "127.0.0.1"
localPort = 4173                     # 本地 serve 监听的端口
remotePort = 8080                    # 阿里云上暴露的端口（外部访问用）
```

**关键参数解释**：

| 参数 | 含义 |
|------|------|
| `serverAddr` | 阿里云公网 IP |
| `serverPort` | frps 的 bindPort，frpc 用这个端口连 frps（不是用户访问的端口） |
| `type = "tcp"` | TCP 转发，最简单 |
| `localPort` | 你本地服务的端口（serve 跑的 4173） |
| `remotePort` | 阿里云上暴露给外部的端口（用户访问 `阿里IP:remotePort`） |

### 5.4 启动 frpc（两种后台方式：pm2 或 screen）

启动 frpc 有两种常见做法：用 **pm2 托管**（推荐，自动重启+开机自启）或用 **screen 后台运行**（简单直接，你的命令用的就是这个）。两种选其一即可。

#### 方式 A：用 pm2 托管（推荐，生产用）

```bash
# 测试配置（前台跑，Ctrl+C 退出）
/etc/frp/frpc -c /etc/frp/config.toml

# 确认能连上后，用 pm2 托管
pm2 start /etc/frp/frpc --name frpc -- -c /etc/frp/config.toml

pm2 save
pm2 startup        # 开机自启
```

#### 方式 B：用 screen 后台运行（你的命令用的方式）

**screen 是什么**：Linux 终端复用工具，能创建一个"虚拟终端窗口"，在里面跑的程序即使你 SSH 断开也不会被杀掉。适合临时跑一个需要持续运行的进程。相比 pm2，screen 更轻量但**没有自动重启**功能（进程崩了就没了），适合开发/测试阶段。

**先装 screen**（大部分 Linux 自带，没有就装）：

```bash
# Ubuntu/Debian
sudo apt install screen

# CentOS/RHEL
sudo yum install screen
# 或 sudo dnf install screen

# 验证
screen --version
```

**用 screen 跑 frpc（你的命令）**：

```bash
# 1. 新建一个名为 frpc 的 screen 会话
screen -S frpc
# 此时进入一个新的终端窗口

# 2. 在这个窗口里运行 frpc
cd /etc/frp && ./frpc -c config.toml
# frpc 开始前台运行，显示连接日志

# 3. 让 frpc 继续在后台跑，自己退出 screen 窗口
#    按 Ctrl+A，松开，再按 D（detach 分离）
#    会提示 [detached from ...frpc]

# 此时你回到了原来的终端，frpc 还在 screen 里跑着
# 即使你关闭 SSH，frpc 也不会停
```

**screen 常用命令速查**：

| 命令 | 作用 |
|------|------|
| `screen -S frpc` | 新建名为 frpc 的会话并进入 |
| `screen -r frpc` | 重新进入（attach）名为 frpc 的会话 |
| `screen -ls` | 查看所有会话（带 * 的是当前所在的） |
| `screen -d frpc` | 强制分离（detach）某个会话（在外面执行） |
| `screen -X -S frpc quit` | 杀掉整个 frpc 会话（停止 frpc） |
| `Ctrl+A` 然后 `D` | 在会话内分离（保留运行） |
| `Ctrl+A` 然后 `K` | 在会话内杀掉当前窗口（会终止 frpc） |
| `exit` | 在会话内输入，结束当前会话（会终止 frpc） |

**screen vs pm2 对比**：

| 维度 | screen | pm2 |
|------|--------|-----|
| 自动重启 | ❌ 崩了就没了 | ✅ 崩了自动拉起 |
| 开机自启 | ❌ 需额外配 systemd | ✅ `pm2 startup` 一键 |
| 查日志 | `screen -r` 进去看 | `pm2 logs frpc` |
| 资源占用 | 极低 | 略高（Node 进程） |
| 适合场景 | 临时/开发/测试 | 生产长期运行 |
| 学习成本 | 低 | 中 |

> **建议**：开发阶段用 screen 快速验证；上线后改用 pm2 或 systemd 托管，保证崩溃自愈。

### 5.5 验证链路

```bash
# 1. 本地服务是否起来
curl http://127.0.0.1:4173
# 应该返回 HTML

# 2. frpc 是否连上 frps
# pm2 方式：
pm2 logs frpc
# screen 方式：
screen -r frpc        # 进去看日志
# 看到 "login to server success" 就连上了（Ctrl+A D 退出）

# 3. 外部访问测试
# 在任意联网设备上访问 http://阿里云IP:8080
# 应该能看到你的前端页面
```

### 5.6 完整启动顺序

**用 pm2 方式**：

```bash
# 1. 启动静态服务
pm2 start "serve dist -l 4173" --name docqa20260505

# 2. 启动 frpc
pm2 start /etc/frp/frpc --name frpc -- -c /etc/frp/config.toml

# 3. 保存
pm2 save

# 4. 查看
pm2 status
# 应该看到 docqa20260505 和 frpc 都是 online
```

**用 screen 方式**（你的命令）：

```bash
# 1. 启动静态服务（还是用 pm2 托管，静态服务不适合 screen）
pm2 start "serve dist -l 4173" --name docqa20260505

# 2. 启动 frpc（用 screen）
screen -S frpc
cd /etc/frp && ./frpc -c config.toml
# Ctrl+A D 分离退出

# 3. 验证 screen 在跑
screen -ls
# 应该看到 frpc 会话
```

---

## 六、阿里云那边需要做什么？（你了解即可）

你不负责阿里云，但需要理解那边的工作，方便联调。

### 6.1 纯端口转发场景：不需要 Nginx

如果只是 `阿里IP:端口` 直接访问，**不需要 Nginx**，frps 直接搞定：

```
用户访问 http://阿里IP:8080
         ↓
阿里云 frps 监听 8080（remotePort）
         ↓ 通过隧道转发给 frpc
本地 frpc 收到流量
         ↓ 转给本地 4173
本地 serve 返回 dist 内容
```

阿里云需要做的：

1. **安全组放行端口**（阿里云控制台 → ECS → 安全组 → 添加入方向规则）：
   - 放行 7000 端口（frpc 连接用，建议限制源 IP 为你的 Linux 服务器 IP）
   - 放行 8080 端口（外部访问用，源 IP 填 0.0.0.0/0 表示所有人可访问）

2. **服务器防火墙放行**（如果开了 ufw/firewalld）：
   ```bash
   # Ubuntu ufw
   sudo ufw allow 7000/tcp
   sudo ufw allow 8080/tcp
   
   # CentOS firewalld
   sudo firewall-cmd --permanent --add-port=7000/tcp
   sudo firewall-cmd --permanent --add-port=8080/tcp
   sudo firewall-cmd --reload
   ```

3. **跑 frps**（参考 `devops/frpc学习笔记.md` 第二章）：
   ```toml
   # frps.toml（阿里云上）
   bindPort = 7000
   # auth.token = "xxx"   # 如果加认证
   ```
   ```bash
   ./frps -c frps.toml
   # 或用 systemd 托管
   ```

### 6.2 什么时候阿里云需要 Nginx

如果需求升级到以下任一，阿里云就需要 Nginx 做反向代理：

| 需求 | 为什么需要 Nginx |
|------|------------------|
| 用域名访问（如 `docqa.example.com`） | Nginx 按域名分发到不同 frp 端口 |
| 用 80/443 端口 | 80 端口只能一个进程监听，Nginx 统一接管再分发 |
| HTTPS | Nginx 装 SSL 证书，frp 走内网 HTTP |
| 多个服务复用端口 | Nginx 按路径/域名分发 |

**带 Nginx 的架构**：

```
用户访问 https://docqa.example.com
         ↓
阿里云 Nginx (443, 装了 SSL 证书)
         ↓ 反向代理到本地端口
阿里云 frps (监听某端口)
         ↓ 隧道
本地 frpc
         ↓
本地 serve
```

这种场景阿里云的 Nginx 配置大致：

```nginx
server {
    listen 443 ssl;
    server_name docqa.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;     # 指向 frps 暴露的端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6.3 你需要跟阿里云负责人确认的信息

联调前问清楚这几条：

1. frps 的连接地址和 bindPort（`serverAddr` 和 `serverPort`）
2. 是否有 auth.token 认证
3. 给你分配的 remotePort 是多少（外部访问端口）
4. remotePort 是否已在安全组放行
5. 是否走了 Nginx（如果走了，问 Nginx 转发到哪个端口，你的 remotePort 要对应）

---

## 七、Linux 开发 vs Windows 开发的区别

你说"会在 Linux 上进行开发"，以下是关键区别。

### 7.1 核心差异对照

| 维度 | Windows | Linux |
|------|---------|-------|
| 路径分隔符 | `\`（`D:\projects\app`） | `/`（`/home/user/app`） |
| 换行符 | CRLF（`\r\n`） | LF（`\n`） |
| 文件名大小写 | 不敏感（`App.js` = `app.js`） | **敏感**（`App.js` ≠ `app.js`） |
| Shell | cmd / PowerShell / Git Bash | bash / zsh |
| 包管理 | 装安装包 | apt / yum / dnf |
| Node 安装 | 官方安装包 | nvm / n / apt |
| 进程管理 | 任务管理器 / pm2 | systemctl / pm2 |
| 权限模型 | 简单 | 严格的 user/group/other |

### 7.2 在 Linux 上开发 Vite 项目的差异

**基本没差异**——Vite/Node/pnpm 是跨平台的，写代码体验一样。要注意的：

1. **文件名大小写**：Windows 上 `import Button from './button'` 能引用 `Button.jsx`，Linux 上会报错。**习惯用精确大小写**。

2. **换行符**：用 Git 时配 `.gitattributes` 统一成 LF：
   ```
   * text=auto eol=lf
   ```

3. **Node 版本管理**：Linux 用 nvm：
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   nvm install 22
   nvm use 22
   ```

4. **pnpm 启用**：Linux 用 corepack：
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

5. **开发服务器访问**：`pnpm dev` 默认只监听 localhost，局域网访问要加 `--host`：
   ```bash
   vite --host    # 或在 vite.config.js 配 server.host: true
   ```

### 7.3 Ubuntu vs CentOS 区别

两者都是 Linux，**对你开发 Vite 项目几乎无差异**，区别在系统管理：

| 维度 | Ubuntu / Debian | CentOS / RHEL |
|------|-----------------|---------------|
| 包管理 | `apt` / `apt-get` | `yum` / `dnf`（CentOS 8+） |
| 安装命令 | `sudo apt install nginx` | `sudo dnf install nginx` |
| 默认防火墙 | `ufw` | `firewalld` |
| 放行端口 | `sudo ufw allow 8080/tcp` | `sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload` |
| 服务管理 | `systemctl`（相同） | `systemctl`（相同） |
| 默认用户 | ubuntu / 普通用户 | root / centos |
| SELinux | 无 | 有（可能拦服务，新手坑） |
| 适合场景 | 个人/创业/云原生 | 企业/传统运维 |

**对你写 Vite 代码、跑 pm2、配 frpc 完全没影响**——这些工具跨发行版一致。唯一可能踩的是 CentOS 的 SELinux（如果服务起不来但日志没报错，试试 `setenforce 0` 临时关闭排查）。

---

## 八、常见问题速查

### Q1: pm2 启动了但访问不了？

按顺序排查：

```bash
# 1. pm2 进程是否 online
pm2 status

# 2. 看日志有没有报错
pm2 logs docqa20260505

# 3. 本地能不能访问
curl http://127.0.0.1:4173

# 4. 端口是否在监听
ss -tlnp | grep 4173
# 应该看到 LISTEN

# 5. 防火墙是否放行（如果外部要直接访问）
sudo ufw allow 4173/tcp       # Ubuntu
```

### Q2: frpc 连不上 frps？

```bash
pm2 logs frpc
# 常见报错：
# - "connection refused"：frps 没起或端口不对
# - "auth token mismatch"：token 不一致
# - "i/o timeout"：阿里云安全组没放行 7000 端口
```

### Q3: 外部访问阿里云端口 404 或拒绝连接？

```bash
# 1. frps 是否在跑（阿里云上）
ssh 阿里云
ps aux | grep frps

# 2. remotePort 是否监听
ss -tlnp | grep 8080

# 3. 阿里云安全组是否放行 8080（控制台查）

# 4. 服务器防火墙是否放行
sudo ufw status        # Ubuntu
sudo firewall-cmd --list-ports    # CentOS
```

### Q4: 更新了 dist 但页面没变？

```bash
# serve 会缓存，重启一下
pm2 restart docqa20260505

# 浏览器也可能缓存，强制刷新 Ctrl+F5
```

### Q5: pm2 重启后进程没了？

```bash
# 没执行 pm2 save 和 startup
pm2 save                          # 保存当前进程列表
pm2 startup                       # 生成开机自启命令，按提示执行
```

---

## 九、完整操作清单（一图流）

```
【Windows 开发机】
1. cd D:\projects\my-vite-app
2. pnpm install
3. pnpm build                          → 生成 dist/
4. scp -r dist user@linux-ip:/home/user/docqa/

【Linux 服务器】
5. cd /home/user/docqa
6. pnpm add -g serve                   → 装静态服务器
7. pm2 start "serve dist -l 4173" --name docqa20260505
8. curl http://127.0.0.1:4173          → 验证本地服务

9. 安装 frpc：
   wget https://github.com/fatedier/frp/releases/download/v0.61.0/frp_0.61.0_linux_amd64.tar.gz
   tar -zxvf frp_0.61.0_linux_amd64.tar.gz
   sudo mkdir -p /etc/frp && sudo cp frp_0.61.0_linux_amd64/frpc /etc/frp/
10. 写 /etc/frp/config.toml（serverAddr=阿里云IP, localPort=4173, remotePort=8080）

11a.（pm2 方式）pm2 start /etc/frp/frpc --name frpc -- -c /etc/frp/config.toml
     pm2 save && pm2 startup
11b.（screen 方式）screen -S frpc → cd /etc/frp && ./frpc -c config.toml → Ctrl+A D

12. 验证：pm2 logs frpc 或 screen -r frpc → 看到 "login to server success"

【阿里云服务器（别人负责）】
13. 安全组放行 7000 和 8080 端口
14. 跑 frps（bindPort=7000）

【验证】
15. 任意设备访问 http://阿里云IP:8080  → 看到前端页面 ✓
```

---

## 十、踩坑记录

> 待实际使用后补充。预留常见坑方向：

- **坑1（预期）**：serve 默认只监听 localhost，外部访问不到 → 加 `--host` 或 `-l tcp://0.0.0.0:4173`。
- **坑2（预期）**：frpc 连不上 frps → 检查阿里云安全组是否放行 7000 端口。
- **坑3（预期）**：外部访问 8080 超时 → 阿里云安全组没放行 8080。
- **坑4（预期）**：pm2 restart 后进程没了 → 没执行 `pm2 save` + `pm2 startup`。
- **坑5（预期）**：更新 dist 后页面没变 → serve 缓存，`pm2 restart` 一下。
- **坑6（预期）**：SPA 路由刷新 404 → serve 默认不回退 index.html，用 `serve dist -l 4173 --single` 或换 Nginx 配 try_files。
- **坑7（预期）**：CentOS 上 frpc 起不来 → SELinux 拦截，`setenforce 0` 排查。
- **坑8（预期）**：Windows 传文件到 Linux 权限不对 → `chmod -R 755 dist/`。

---

## 十一、相关链接

- `frontend/Vite学习笔记.md`（Vite 构建、dist 结构、第十章部署基础）
- `devops/frpc学习笔记.md`（frpc 详细配置、frps 服务端搭建）
- `troubleshooting/Node生态/Node npm pnpm corepack 和 pm2 进程管理.md`（pm2 命令详解）
- `troubleshooting/远程连接与传输/SCP 文件传输到远程服务器.md`（scp 传文件）
- `troubleshooting/远程连接与传输/SSH 免密登录 (Windows 公钥配置).md`（免密传输配置）
- `troubleshooting/Linux系统管理/Linux 端口占用 进程排查和释放.md`（端口排查）
- `技术工具学习索引.md`
