# 阶段一：Linux + 网络 + Shell 脚本

> 来源：《完整 AI-Infra 转行落地教程》阶段一 | 周期：2 周
> 笔记类型：学习笔记 + 实操记录
> 关联：本阶段是整个 AI-Infra 的底层地基，AI-Infra 本质是传统运维 + GPU 生态的升级，80% 的线上报错排查都依赖本阶段知识。

---

## 一、阶段定位与目标

### 1.1 为什么 Linux 是 AI-Infra 的"重中之重"

- **所有 GPU 服务器都跑在 Linux 上**（NVIDIA 数据中心 GPU 驱动主要面向 Linux）
- **大模型部署工具链原生支持 Linux**（vLLM、TGI、Docker 等在 Linux 上体验最好）
- **80% 的线上故障排查依赖 Linux 命令行**：进程崩溃、端口占用、显存溢出、日志分析
- **跳过 Linux 直接学 K8s = 85% 转行人员栽倒的坑**（PDF 附录避坑清单第 1 条）

### 1.2 阶段验收标准

> 能够独立排查程序崩溃、端口占用、日志报错、实现服务 7×24 小时保活。

### 1.3 实验环境基准

- **操作系统**：固定 Ubuntu 22.04 LTS
- **云服务器**：阿里云 2 核 4G 普通云服务器（无 GPU，用来练 Linux 基础）
- **本地替代**：VMware 虚拟机安装 Ubuntu 22.04

> 注意：阶段一不需要 GPU，用普通云服务器或虚拟机练 Linux 即可。GPU 实例到阶段三才需要。

---

## 二、必学理论清单（8 大模块）

### 2.1 Linux 基础命令：文件管理、权限、用户组

#### 文件管理核心命令

```bash
# 目录操作
pwd                      # 显示当前路径
cd /home/user            # 切换目录
ls -la                   # 列出所有文件（含隐藏），显示权限和属主
mkdir -p a/b/c           # 递归创建目录
cp -r src dst            # 递归复制
mv old new               # 移动/重命名
rm -rf dir               # 递归强制删除（⚠️ 危险，生产环境慎用）

# 文件查看
cat file                 # 全部输出
head -n 20 file          # 前 20 行
tail -n 50 file          # 后 50 行
tail -f app.log          # 实时跟踪日志（排查大模型服务日志最常用）
less file                # 分页查看（q 退出，/ 搜索）
wc -l file               # 统计行数
```

#### 权限系统（AI-Infra 高频场景）

```bash
# 查看权限
ls -l file
# -rw-r--r-- 1 root root 1234 Jun 30 file
#  前 3 位：属主(user)权限
#  中 3 位：属组(group)权限
#  后 3 位：其他(other)权限

# 修改权限
chmod 755 script.sh      # rwxr-xr-x（脚本常用）
chmod +x script.sh       # 给所有用户加执行权限
chown user:group file    # 改属主和属组

# 数字权限对照
# 7 = rwx  6 = rw-  5 = r-x  4 = r--  0 = ---
# 常用组合：755（目录/脚本）、644（普通文件）、600（密钥文件）
```

> **AI-Infra 常见场景**：模型权重文件权限不对导致 vLLM 读取失败、SSH 密钥权限不是 600 报错、Docker 挂载卷权限冲突。

#### 用户组管理

```bash
# 添加用户
useradd -m -s /bin/bash newuser    # 创建用户并建家目录，指定 bash
passwd newuser                      # 设密码

# 用户组（GPU 相关场景）
usermod -aG docker newuser          # 加入 docker 组（免 sudo 跑 docker）
usermod -aG render newuser          # 加入 render 组（GPU 渲染权限）
groups newuser                      # 查看用户所属组
```

### 2.2 进程/内存/磁盘监控（大模型高频故障）

#### CPU 和内存监控

```bash
# 实时进程监控（AI-Infra 最常用）
htop                      # 彩色版 top，可交互（按 F6 排序，F5 树形）
top                       # 基础版

# GPU 监控（阶段三详讲，这里先记）
nvidia-smi                # 查看 GPU 显存、利用率
watch -n 1 nvidia-smi     # 每秒刷新一次

# 内存排查（OOM 高频）
free -h                   # 查看总内存/已用/可用
vmstat 1 5                # 每秒一次共 5 次，看 swap 和 IO

# 查找占内存最高的进程
ps aux --sort=-%mem | head -10
```

#### 磁盘监控（大模型权重文件动辄几十 GB）

```bash
# 磁盘空间
df -h                     # 各分区使用情况
du -sh /home/user/*       # 各目录占用大小
du -sh * | sort -rh       # 按大小排序

# 查找大文件（大模型权重误存场景）
find / -type f -size +10G 2>/dev/null

# inode 耗尽（小文件太多导致"No space left"但 df 显示有空间）
df -i
```

#### 大模型高频故障对照表

| 故障现象 | 排查命令 | 可能原因 |
|----------|----------|----------|
| 程序突然消失 | `dmesg \| grep -i killed` | OOM Killer 杀了进程 |
| "CUDA out of memory" | `nvidia-smi` | 显存不足，有残留进程 |
| "No space left on device" | `df -h` | 磁盘满（模型权重太大） |
| 端口被占用 | `ss -tlnp \| grep 8000` | 旧进程没杀干净 |
| 服务起不来 | `systemctl status xxx` / `journalctl -u xxx` | 配置错或依赖未启动 |

### 2.3 文本三剑客：grep、sed、awk（面试必考）

这三个是 AI-Infra 最高频的日志分析工具，**面试必考点**。

#### grep：文本过滤

```bash
# 基础过滤
grep "ERROR" app.log               # 找含 ERROR 的行
grep -i "error" app.log            # 忽略大小写
grep -n "ERROR" app.log            # 显示行号
grep -c "ERROR" app.log            # 统计匹配行数
grep -v "DEBUG" app.log            # 反向：不含 DEBUG 的行

# 正则
grep -E "ERROR|WARN" app.log       # 找 ERROR 或 WARN
grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" app.log   # 找日期格式

# 递归搜代码
grep -rn "def forward" /project/src/           # 在项目里找函数定义
```

#### grep vs pgrep（易混淆，面试常考）

两个命令名字里都有 "grep"，但用途完全不同：

| 维度 | `grep` | `pgrep` |
|------|--------|---------|
| 全称 | global reprint（全局正则打印） | process grep（进程 grep） |
| 搜索对象 | **文件内容**或输入流 | **进程列表** |
| 输出 | 匹配的**行内容** | 匹配进程的 **PID** |
| 本质 | 文本搜索工具 | 进程查找工具 |

```bash
# grep：在文件里搜文本
grep "ERROR" app.log
# 输出：2026-06-30 10:00:01 ERROR something failed（输出整行内容）

# pgrep：在进程列表里搜进程名
pgrep python
# 输出：12345（只输出 PID）

# pgrep 常用参数
pgrep -f "train.py"       # -f 匹配完整命令行（不只是进程名）
pgrep -l python           # -l 同时显示进程名（PID + 名称）

# pgrep 相比 ps | grep 的优势
# 传统写法（繁琐，且 grep 自己会被匹配出来）
ps aux | grep "python" | grep -v grep | awk '{print $2}'
# pgrep 写法（简洁，不会匹配自己）
pgrep python

# 配合 kill 用
kill $(pgrep -f vllm)     # 杀掉所有 vllm 进程

# 在保活脚本里判断进程是否存活
if pgrep -f "vllm serve" > /dev/null; then
    echo "vLLM 在运行"
else
    echo "vLLM 挂了，需要重启"
fi
```

> **记忆**：grep = 在**文件内容**里找文本；pgrep = 在**进程列表**里找 PID，是 `ps aux | grep | awk` 的快捷方式。本笔记 5.9 节保活脚本里用的 `pgrep -f "$PROCESS_NAME"` 就是判断进程是否存活。

#### sed：流编辑器（批量替换）

```bash
# 替换（最常用）
sed 's/old/new/' file              # 替换每行第一个 old
sed 's/old/new/g' file             # 替换所有 old（g = global）
sed -i 's/old/new/g' file          # 直接改原文件（-i = in-place）

# 删除
sed '/^$/d' file                   # 删除空行
sed '/DEBUG/d' app.log             # 删除含 DEBUG 的行

# 提取指定行
sed -n '10,20p' file               # 显示 10-20 行
```

#### awk：列处理（日志分析神器）

```bash
# 基础用法：按空格分列
awk '{print $1}' file              # 打印第 1 列
awk '{print $1, $3}' file          # 打印第 1、3 列
awk '{print $NF}' file             # 打印最后一列（NF = 列数）

# 指定分隔符
awk -F',' '{print $2}' csv.txt     # 按逗号分列
awk -F'\t' '{print $1}' tsv.txt    # 按 tab 分列

# PDF 中的经典命令：筛选报错日志
cat app.log | grep ERROR | awk '{print $5, $7}'
# 含义：先找 ERROR 行，再打印第 5 和第 7 列

# 条件过滤
awk '$3 > 100' file                # 第 3 列大于 100 的行
awk 'NR>=10 && NR<=20' file        # 第 10-20 行（NR = 行号）

# 统计
awk '{sum+=$1} END{print sum}' file   # 求第 1 列的和
```

#### 三剑客组合实战

```bash
# 统计 vLLM 服务日志里各状态码出现次数
grep "HTTP" vllm.log | awk '{print $NF}' | sort | uniq -c | sort -rn

# 提取报错时间戳和错误信息
grep "ERROR" app.log | awk '{print $1, $2, $5}' > errors.txt

# 批量改配置文件里的模型路径
sed -i 's|/old/path/model|/new/path/model|g' config.yaml
```

### 2.4 systemd 服务管理（推理服务保活核心）

systemd 是 Linux 的 init 系统，用来管理后台服务。**AI-Infra 用它实现推理服务开机自启、异常重启。**

#### PDF 中的 systemd 模板（托管大模型服务）

```bash
# 创建服务文件
sudo vim /etc/systemd/system/demo.service
```

写入以下内容：

```ini
[Unit]
Description=demo-service
After=network.target

[Service]
User=root
ExecStart=/bin/bash /root/demo.sh
Restart=always                # 程序崩溃自动重启

[Install]
WantedBy=multi-user.target
```

**字段解释**：

| 字段 | 含义 |
|------|------|
| `Description` | 服务描述 |
| `After=network.target` | 在网络服务后启动（大模型服务依赖网络） |
| `User=root` | 以 root 运行（GPU 权限需要，生产建议用专用用户） |
| `ExecStart` | 启动命令（实际会换成 vLLM 启动命令） |
| `Restart=always` | **核心**：崩溃自动重启 |
| `WantedBy` | 启动目标（多用户模式） |

#### 常用管理命令

```bash
# 生效并设置开机自启
sudo systemctl daemon-reload          # 重新加载配置（改了 service 文件必须执行）
sudo systemctl start demo             # 启动服务
sudo systemctl enable demo            # 设置开机自启

# 日常管理
sudo systemctl status demo            # 查看状态
sudo systemctl restart demo           # 重启
sudo systemctl stop demo              # 停止
sudo systemctl disable demo           # 取消开机自启

# 查日志（见 2.5）
journalctl -u demo -f                 # 实时跟踪服务日志
```

> **AI-Infra 实际用法**：阶段五用 vLLM 部署大模型时，把 `ExecStart` 换成 `vllm serve --model Qwen/Qwen2-7B ...`，配合 `Restart=always` 实现服务崩溃自愈。

### 2.5 日志系统：journalctl

```bash
# 查看某服务日志
journalctl -u demo                    # demo 服务的全部日志
journalctl -u demo -f                 # 实时跟踪（类似 tail -f）
journalctl -u demo --since "1 hour ago"   # 最近 1 小时
journalctl -u demo --since today      # 今天的

# 按优先级过滤
journalctl -p err                     # 只看 error 级别以上
journalctl -p err -u demo             # demo 服务的错误日志

# 查看系统启动日志
journalctl -b                         # 本次启动的所有日志
journalctl -b -1                      # 上一次启动的日志

# 应用日志排查（vLLM/Ollama 的日志）
journalctl -u vllm -f                 # 实时看 vLLM 日志
```

### 2.6 防火墙：ufw 放行端口

```bash
# Ubuntu 默认防火墙工具
sudo ufw status                       # 查看状态
sudo ufw enable                       # 开启防火墙
sudo ufw allow 22/tcp                 # 放行 SSH
sudo ufw allow 8000/tcp               # 放行大模型 API 端口
sudo ufw allow 80,443/tcp             # 放行 HTTP/HTTPS

# 限制来源 IP（生产推荐）
sudo ufw allow from 192.168.1.0/24 to any port 8000   # 只允许内网访问

# 删除规则
sudo ufw delete allow 8000/tcp
```

> **AI-Infra 场景**：vLLM 跑在 8000 端口，要么用 Nginx 代理到 80/443，要么直接放行 8000（生产不推荐直接暴露）。

### 2.7 网络知识：TCP/IP、Nginx、负载均衡、SSL

#### TCP/IP 基础

| 概念 | 说明 |
|------|------|
| IP 地址 | 服务器在网络中的地址（如 192.168.1.100） |
| 端口 | 服务在服务器上的门牌号（如 8000 是 vLLM API） |
| TCP | 可靠传输协议（大模型 API 用 HTTP/TCP） |
| 常见端口 | 22(SSH)、80(HTTP)、443(HTTPS)、8000(vLLM)、6379(Redis) |

#### Nginx 反向代理（PDF 任务 3）

**为什么要反向代理**：大模型服务（vLLM）跑在 8000 端口，但用户访问要用 80/443 端口（标准 HTTP/HTTPS）。Nginx 做中间人，把 80 端口的请求转发到 8000。

```bash
# 安装
sudo apt install nginx -y

# 配置反向代理
sudo vim /etc/nginx/conf.d/vllm.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;    # 转发到 vLLM
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 大模型流式响应需要（SSE）
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

```bash
# 测试配置 + 重载
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL/HTTPS 域名配置

```bash
# 用 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
# 自动修改 Nginx 配置，加上 SSL 证书
# 证书自动续期（certbot 会加 systemd timer）
```

#### 负载均衡（多实例场景）

```nginx
upstream vllm_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}

server {
    listen 80;
    location / {
        proxy_pass http://vllm_backend;
    }
}
```

### 2.8 Shell 脚本：一键部署

#### 基础语法

```bash
#!/bin/bash
# 一键安装 CUDA 脚本示例

# 变量
MODEL_NAME="Qwen-14B"
GPU_COUNT=2

# 条件判断
if [ $GPU_COUNT -gt 1 ]; then
    echo "多卡部署模式"
else
    echo "单卡部署模式"
fi

# 循环
for i in 1 2 3; do
    echo "尝试第 $i 次启动..."
done

# 函数
deploy_model() {
    echo "部署 $1..."
    vllm serve --model $1
}

# 调用函数
deploy_model $MODEL_NAME
```

#### PDF 中的一键部署脚本思路

```bash
#!/bin/bash
# install_cuda.sh - 一键安装 CUDA

set -e                          # 任何命令失败立即退出

echo "=== 1. 安装 NVIDIA 驱动 ==="
sudo apt update
sudo apt install nvidia-driver-535 -y

echo "=== 2. 下载 CUDA 12.1 ==="
wget https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_530.30.02_linux.run

echo "=== 3. 安装 CUDA ==="
sudo sh cuda_12.1.0_530.30.02_linux.run --silent --toolkit

echo "=== 4. 配置环境变量 ==="
echo 'export PATH=$PATH:/usr/local/cuda/bin' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda/lib64' >> ~/.bashrc
source ~/.bashrc

echo "=== 5. 验证 ==="
nvidia-smi
nvcc -V
echo "=== 安装完成 ==="
```

---

## 三、实操任务（必须完整复刻）

### 任务 1：搭建 Ubuntu 22.04 实操环境

二选一：

**线上版**：阿里云 2 核 4G 普通云服务器（无 GPU，用来练 Linux 基础）

**本地版**：VMware 虚拟机安装 Ubuntu 22.04

### 任务 2：可直接复制执行的实操命令

```bash
# 1. 更新软件源，安装进程监控工具 htop
sudo apt update && sudo apt install htop -y

# 2. 使用 awk+grep 过滤程序报错日志（AI-Infra 最高频命令）
cat app.log | grep ERROR | awk '{print $5, $7}'

# 3. 编写 systemd 自启服务模板（后续用来托管 vLLM 大模型服务）
sudo vim /etc/systemd/system/demo.service
# 写入内容见 2.4 节

# 生效并设置开机自启
sudo systemctl daemon-reload
sudo systemctl start demo
sudo systemctl enable demo
```

### 任务 3：Nginx 反向代理实操

部署 Nginx，将本机 8000 端口（后续大模型 API 端口）代理至公网 80 端口，实现外部访问。配置见 2.7 节。

---

## 五、逐行详解与实操补充（新手必读）

> 本节针对前面 2.x 节里每个命令和配置的参数做逐行拆解，并补充"无 sudo 权限场景"的替代方案。如果你用的是组里/公司的共享服务器（没有 root），重点看 5.8 节。

### 5.1 权限系统：用户组管理每个参数的含义

#### `useradd -m -s /bin/bash newuser` 拆解

```bash
useradd -m -s /bin/bash newuser
```

| 参数 | 含义 | 不加会怎样 |
|------|------|------------|
| `useradd` | 创建用户的命令 | - |
| `-m` | 创建用户的同时建家目录（`/home/newuser`） | 不加 `-m` 不会建家目录，用户登录后会报 "No home directory" |
| `-s /bin/bash` | 指定用户的默认 shell 为 bash | 不加会用系统默认（可能是 `/bin/sh`，功能弱、没有自动补全和历史） |
| `newuser` | 用户名 | - |

**实操验证**：

```bash
# 创建后查看
cat /etc/passwd | grep newuser
# 输出：newuser:x:1001:1001::/home/newuser:/bin/bash
#        用户名  :  UID :GID:: 家目录    : shell
```

#### `usermod -aG docker newuser` 拆解

```bash
usermod -aG docker newuser
```

| 参数 | 含义 | ⚠️ 关键 |
|------|------|---------|
| `usermod` | 修改用户属性的命令 | - |
| `-a` | append，追加到组（不离开其他组） | **必须和 -G 一起用**，否则会把用户从其他附加组踢出 |
| `-G` | 指定附加组（supplementary group） | 区别于 `-g`（主组，只能一个） |
| `docker` | 要加入的组名 | 加入 docker 组后，该用户跑 docker 不需要 sudo |
| `newuser` | 要修改的用户名 | - |

**为什么加入 docker 组就不用 sudo 了**：

```bash
# Docker 的 socket 文件权限
ls -l /var/run/docker.sock
# srw-rw---- 1 root docker /var/run/docker.sock
#                ↑ 属组是 docker，组权限是 rw
# 所以只要用户在 docker 组里，就能读写这个 socket，等于能控制 docker
```

> **⚠️ 安全提示**：加入 docker 组等同于给了 root 权限（因为可以用 docker 挂载宿主机根目录）。生产环境慎用，只给需要的人。

#### `groups newuser` 拆解

```bash
groups newuser
# 输出：newuser : newuser docker render
# 含义：newuser 这个用户属于 3 个组：newuser(主组) docker render(附加组)
```

### 5.2 htop / top 怎么看

#### `htop` 界面解读

执行 `htop` 后，你会看到这样的界面：

```
  0  [|||||||||||||||||||||||||||||||     67.5%]     ← CPU 0 核使用率 67.5%
  1  [|||||||||||||                        35.2%]     ← CPU 1 核使用率 35.2%
  2  [||||||||||||||||||||||||||||||||||  88.1%]     ← CPU 2 核使用率 88.1%
  3  [|||||||                              18.7%]     ← CPU 3 核使用率 18.7%
  Mem[|||||||||||||||||||||       3.2G/7.7G]          ← 内存：已用 3.2G / 总共 7.7G
  Swp[                              0B/2.0G]          ← Swap 交换分区：未使用

  PID  USER   PRI  NI  VIRT   RES   SHR  S  CPU%  MEM%   TIME+  Command
  1234 root    20   0  2.5G  800M  120M  S 45.2  10.3  12:34.5 python train.py
  5678 user    20   0  1.2G  300M   50M  R 23.1   3.9   5:12.3 nginx
  ...
```

**关键列含义**：

| 列 | 含义 | AI-Infra 关注点 |
|----|------|-----------------|
| `PID` | 进程 ID | 用 `kill -9 PID` 杀进程 |
| `USER` | 进程属主 | 确认是不是自己的进程 |
| `VIRT` | 虚拟内存（申请了多少） | 大模型进程可能几十 GB |
| `RES` | 物理内存（实际用了多少） | **这个才是真实占用**，看这个判断 OOM |
| `CPU%` | CPU 使用率 | 找 CPU 打满的元凶 |
| `MEM%` | 内存占用百分比 | 找内存占用最高的进程 |
| `S` | 进程状态（R=运行 S=睡眠 Z=僵尸） | Z 是僵尸进程需要清理 |
| `Command` | 启动命令 | 确认是哪个程序 |

**htop 交互操作**：

| 按键 | 作用 |
|------|------|
| `F5` | 树形视图（看进程父子关系） |
| `F6` | 按某列排序（常用：按 CPU% 或 MEM% 排序） |
| `F9` | 杀进程（选中后选信号） |
| `F10` | 退出 |
| `/` | 搜索进程名 |
| `H` | 隐藏/显示线程 |

#### `top` 界面解读

`top` 是 `htop` 的基础版，界面类似但无彩色、交互弱。关键操作：

| 按键 | 作用 |
|------|------|
| `P` | 按 CPU 使用率排序 |
| `M` | 按内存使用率排序 |
| `k` | 杀进程（输入 PID） |
| `q` | 退出 |
| `1` | 展开每个 CPU 核心的使用率 |

> **日常推荐用 htop**（更直观），服务器没装 htop 时用 top。

### 5.3 free -h 是看整个机子的

```bash
free -h
```

输出示例：

```
               total   used   free   shared  buff/cache  available
Mem:           7.7G    3.2G   1.5G   120M    3.0G        4.0G
Swap:          2.0G    0B     2.0G
```

**这是整个物理机的内存，不是某个路径或某个用户的。** 你在共享服务器上看到的也是整台机器的总内存。

| 列 | 含义 | 你需要关注的 |
|----|------|-------------|
| `total` | 物理内存总量 | 这是机器总内存，所有用户共享 |
| `used` | 已使用 | 如果这个数字接近 total，说明内存快满了 |
| `free` | 完全空闲 | 这个数字经常很小（Linux 会把空闲内存拿来做缓存） |
| `buff/cache` | 系统缓存 | 可被回收，不算"真正用掉" |
| `available` | **实际可用** | **看这个数字！** = free + 可回收的缓存 |
| `Swap` | 交换分区 | 如果 Swap used 在涨，说明物理内存不够了 |

**判断内存是否够用**：
- `available` > 1GB → 正常
- `available` < 500MB → 内存紧张，可能要 OOM
- `Swap used` 持续增长 → 内存严重不足，系统在用硬盘当内存（很慢）

**参数含义**：
- `-h` = human-readable，自动转成 G/M 显示（不加 `-h` 显示字节数）

### 5.4 vmstat 1 5 详解

```bash
vmstat 1 5
```

| 参数 | 含义 |
|------|------|
| `vmstat` | 报告虚拟内存统计 |
| `1` | 每 1 秒采样一次 |
| `5` | 共采样 5 次后停止 |

输出示例：

```
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 1500000 300000 3000000    0    0    20    15  500  800 30  5 65  0  0
```

**关键列**：

| 列 | 含义 | AI-Infra 关注 |
|----|------|---------------|
| `r` | 正在运行/等待 CPU 的进程数 | 持续 > CPU 核心数 → CPU 不够 |
| `b` | 阻塞在 IO 上的进程数 | 持续 > 0 → IO 瓶颈（磁盘慢） |
| `si`/`so` | swap in/out（KB/s） | 持续 > 0 → 内存不足，在用 swap |
| `bi`/`bo` | 块设备读写（KB/s） | 大模型加载时 bi 会飙高（读权重文件） |
| `us` | 用户态 CPU 占比 | 大模型推理时这个会高 |
| `id` | 空闲 CPU | 持续 < 10 → CPU 打满 |

> **看 5 次采样的趋势**，单次没意义。如果 si/so 从 0 变成几百，说明内存开始紧张了。

### 5.5 sed 的 s 是什么意思

```bash
sed 's/old/new/' file
```

**逐字符拆解**：

| 部分 | 含义 |
|------|------|
| `sed` | stream editor，流编辑器 |
| `s` | **substitute，替换命令**（最常用） |
| `/` | 分隔符（分隔"找什么"和"替换成什么"） |
| `old` | 要找的文本（支持正则） |
| `new` | 替换成的文本 |
| 第二个 `/` | 分隔符 |
| 第三个 `/` | 命令结束 |

**三种写法对比**：

```bash
sed 's/old/new/' file        # s=替换，只替换每行第一个 old
sed 's/old/new/g' file       # g=global，替换每行所有 old
sed -i 's/old/new/g' file    # -i=in-place，直接改原文件（不加 -i 只输出不改文件）
```

**实操示例**：

```bash
# 准备测试文件
echo "hello world hello world" > test.txt
# 文件内容：hello world hello world

# 不加 g：只替换第一个
sed 's/hello/你好/' test.txt
# 输出：你好 world hello world

# 加 g：替换所有
sed 's/hello/你好/g' test.txt
# 输出：你好 world 你好 world

# 加 -i：直接改原文件
sed -i 's/hello/你好/g' test.txt
cat test.txt
# 输出：你好 world 你好 world（原文件已改）

# 分隔符可以换（当路径里有 / 时有用）
sed 's|/old/path|/new/path|g' config.yaml
# 用 | 代替 /，避免路径里的 / 冲突
```

### 5.6 三剑客组合实战逐段拆解

```bash
grep "HTTP" vllm.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

**这段命令的目的**：统计 vLLM 日志里各 HTTP 状态码出现次数，按出现次数从多到少排序。

**逐段拆解**（假设 vllm.log 内容是）：

```
2026-06-30 10:00:01 INFO HTTP 200 OK response in 120ms
2026-06-30 10:00:02 INFO HTTP 500 ERROR timeout
2026-06-30 10:00:03 INFO HTTP 200 OK response in 130ms
2026-06-30 10:00:04 INFO HTTP 200 OK response in 110ms
2026-06-30 10:00:05 INFO HTTP 404 NOT FOUND
```

**第 1 段：`grep "HTTP" vllm.log`**
```
作用：从 vllm.log 里找出含 "HTTP" 的行
输出：
2026-06-30 10:00:01 INFO HTTP 200 OK response in 120ms
2026-06-30 10:00:02 INFO HTTP 500 ERROR timeout
...
```

**第 2 段：`awk '{print $NF}'`**
```
作用：$NF = 最后一个字段（NF = Number of Fields）
      print $NF 就是打印每行的最后一列
```

等一下，日志最后一列是 `120ms`/`timeout`/`110ms`，不是状态码。实际上我们要的是第 5 列（状态码 200/500/404）。修正一下，PDF 原文的 `$NF` 可能假设状态码在最后。更准确的写法应该是 `$5`：

```bash
# 假设状态码在第 5 列
grep "HTTP" vllm.log | awk '{print $5}' | sort | uniq -c | sort -rn
```

```
awk '{print $5}' 的输出：
200
500
200
200
404
```

**第 3 段：`sort`**
```
作用：把状态码排序（升序）
输出：
200
200
200
404
500
```

**为什么要先 sort？** 因为 `uniq` 只能合并**相邻的**重复行。如果不排序直接 uniq，相同的不会合并。

**第 4 段：`uniq -c`**
```
作用：合并相邻重复行，-c = count 统计每行出现次数
输出：
      3 200
      1 404
      1 500
```

**第 5 段：`sort -rn`**
```
作用：按数字从大到小排序
      -r = reverse（降序）
      -n = numeric（按数字排序，不是按字符）
输出：
      3 200
      1 500
      1 404
```

#### 为什么先 sort 然后又 sort -rn？两个 sort 的区别

| 第一次 sort | 第二次 sort -rn |
|-------------|-----------------|
| 给 `uniq` 做准备 | 给最终结果排序 |
| 把相同值排到一起 | 按出现次数从大到小排 |
| 升序（默认） | 降序（-r）+ 按数字（-n） |
| 排序对象：状态码本身 | 排序对象：uniq -c 输出的次数 |

**如果没有 `-n` 会怎样**：

```bash
# 不加 -n，按字符排序
sort -r
# 输出（错误！按字符排序，"1" 排在 "3" 前面）：
#     1 404
#     3 200
#     1 500

# 加 -n，按数字排序
sort -rn
# 输出（正确！按数字大小）：
#     3 200
#     1 500
#     1 404
```

> **记忆**：`sort` 按字符排，`sort -n` 按数字排，`sort -r` 降序，`sort -rn` 数字降序。

### 5.7 ufw 防火墙参数详解

#### `/tcp` 的含义

```bash
sudo ufw allow 22/tcp
```

| 部分 | 含义 |
|------|------|
| `22` | 端口号 |
| `/tcp` | 协议类型（TCP） |

**为什么指定协议**：一个端口可以用两种协议通信（TCP 和 UDP），大多数服务用 TCP。指定 `/tcp` 只放行 TCP 流量。

| 协议 | 常见服务 |
|------|----------|
| `tcp` | SSH(22)、HTTP(80)、HTTPS(443)、vLLM(8000) ← **绝大多数用这个** |
| `udp` | DNS(53)、视频通话、游戏 |
| 不指定 | `ufw allow 22` = 同时放行 TCP 和 UDP |

**实操验证**：

```bash
# 放行 SSH
sudo ufw allow 22/tcp       # 只放 TCP
sudo ufw allow 22           # TCP 和 UDP 都放

# 放行多个端口
sudo ufw allow 80,443/tcp   # HTTP 和 HTTPS

# 放行端口范围
sudo ufw allow 8000:8100/tcp
```

#### 限制来源 IP 详解

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8000
```

逐段拆解：

| 部分 | 含义 |
|------|------|
| `allow from 192.168.1.0/24` | 允许来自 192.168.1.0/24 网段的请求 |
| `to any` | 到本机任意网卡 |
| `port 8000` | 目标端口 8000 |

**`192.168.1.0/24` 是什么**：

- `192.168.1.0` 是网段起始地址
- `/24` 是子网掩码，表示前 24 位固定，后 8 位可变
- 相当于 `192.168.1.0` ~ `192.168.1.255`，共 256 个 IP
- 也就是整个 `192.168.1.x` 内网都能访问

**为什么生产要限制来源 IP**：

```
不限制：任何公网 IP 都能访问 8000 端口 → 被扫描爆破
限制内网：只有 192.168.1.x 内网机器能访问 → 安全得多
```

**实操示例**：

```bash
# 只允许内网访问 vLLM API
sudo ufw allow from 192.168.1.0/24 to any port 8000

# 只允许特定 IP 访问
sudo ufw allow from 10.0.0.5 to any port 22    # 只让 10.0.0.5 SSH

# 查看当前规则（带编号）
sudo ufw status numbered
# 输出：
#  [1] 22/tcp                     ALLOW IN    Anywhere
#  [2] 8000/tcp                   ALLOW IN    192.168.1.0/24

# 按编号删除
sudo ufw delete 2
# 或按规则删除
sudo ufw delete allow 8000/tcp
```

#### `sudo ufw delete allow 8000/tcp` 含义

```bash
sudo ufw delete allow 8000/tcp
```

| 部分 | 含义 |
|------|------|
| `delete` | 删除规则 |
| `allow 8000/tcp` | 要删除的那条规则原文（必须和添加时写的一模一样） |

> 删除规则就是把 `allow` 换成 `delete allow`，其余不变。

### 5.8 Nginx 反向代理配置逐行详解

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

**逐行解释**：

| 行 | 代码 | 含义 |
|----|------|------|
| 1 | `server {` | 定义一个虚拟服务器（一个 server 块 = 一个站点） |
| 2 | `listen 80;` | 监听 80 端口（HTTP 默认端口），用户访问 `http://域名` 时到这里 |
| 3 | `server_name your-domain.com;` | 匹配域名，用户访问 `your-domain.com` 时用这个 server |
| 4 | `location / {` | 匹配所有路径（`/` = 根路径，所有请求都走这里） |
| 5 | `proxy_pass http://127.0.0.1:8000;` | **核心**：把请求转发到本机 8000 端口（vLLM 在这里跑） |
| 6 | `proxy_set_header Host $host;` | 把原始请求的 Host 头传给后端（让 vLLM 知道用户访问的域名） |
| 7 | `proxy_set_header X-Real-IP $remote_addr;` | 把用户真实 IP 传给后端（不加的话 vLLM 看到的 IP 永远是 127.0.0.1） |
| 8 | `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` | 代理链 IP 记录（多层代理时用，保留完整转发链） |
| 9 | `proxy_buffering off;` | 关闭缓冲——大模型流式输出（SSE）必须关，否则会等全部生成完才返回 |
| 10 | `proxy_read_timeout 300s;` | 等待后端响应超时 300 秒（大模型生成慢，默认 60 秒会超时） |
| 11 | `}` | location 块结束 |
| 12 | `}` | server 块结束 |

**为什么要设 300 秒超时**：大模型生成一个长回答可能要 1-2 分钟，Nginx 默认 60 秒就超时断开，用户会收到 504 错误。设 300 秒给足时间。

**Nginx 变量含义**：

| 变量 | 含义 |
|------|------|
| `$host` | 用户请求的域名 |
| `$remote_addr` | 用户的真实 IP |
| `$proxy_add_x_forwarded_for` | 在已有 X-Forwarded-For 后追加用户 IP |

**数据流**：

```
用户请求 http://your-domain.com/chat
    ↓
Nginx 收到（80 端口）
    ↓ proxy_pass
vLLM（127.0.0.1:8000）收到请求
    ↓ Nginx 通过 proxy_set_header 告诉 vLLM：
    ↓   - 用户真实 IP 是 $remote_addr
    ↓   - 用户访问的域名是 $host
vLLM 处理并返回响应
    ↓
Nginx 转发给用户
```

### 5.9 无 sudo 权限的替代方案（组里共享服务器场景）

> 如果你在组里/公司的共享服务器上没有 sudo 权限，以下功能做不了。可以用 **Windows WSL** 或 **自己买云服务器** 替代练习。

#### 需要 sudo 的操作清单

| 操作 | 命令 | 为什么需要 sudo | 无 sudo 能否做 |
|------|------|-----------------|----------------|
| 安装软件 | `sudo apt install xxx` | 写 /usr/bin 等系统目录 | ❌ 用 conda/pip 装用户级替代 |
| 改系统配置 | `sudo vim /etc/xxx` | /etc 是 root 所有 | ❌ |
| 改端口 < 1024 | `nginx` 监听 80 | 低端口需要特权 | ❌ 用 > 1024 端口 |
| systemd 服务 | `sudo systemctl xxx` | 系统级服务管理 | ❌ 用用户级 systemd 或 nohup |
| ufw 防火墙 | `sudo ufw xxx` | 防火墙是系统级 | ❌ |
| nvidia 驱动安装 | `sudo apt install nvidia-driver` | 写 /usr/lib | ❌ 让管理员装 |
| docker 服务 | `sudo systemctl restart docker` | docker 守护进程 | ⚠️ 在 docker 组里可以跑 docker |
| 改文件属主 | `sudo chown xxx` | 只有 root 能改属主 | ❌ 但能改自己文件的权限 |

#### 无 sudo 也能做的操作清单

| 操作 | 命令 | 说明 |
|------|------|------|
| 查看进程 | `htop`/`top`/`ps` | 看所有进程，只是不能杀别人的 |
| 杀自己的进程 | `kill -9 <自己的PID>` | 只能杀自己启动的进程 |
| 查看内存/磁盘 | `free -h`/`df -h` | 看整个机器的状态 |
| 查看 GPU | `nvidia-smi` | 只要驱动装了就能看 |
| grep/sed/awk | 文本处理 | 纯用户操作 |
| 跑 Python/PyTorch | `python train.py` | 只要环境配好 |
| 跑 Docker（在 docker 组里） | `docker run xxx` | 需要管理员把你加入 docker 组 |
| 改自己文件的权限 | `chmod 755 自己的文件` | 只能改自己拥有的文件 |
| Nginx（非 80 端口） | 编译版 nginx 监听 8080 | 不用 sudo，但只能用高端口 |
| 用 conda 装包 | `conda install xxx` | 装在用户目录，不需要 sudo |
| 用 pip 装包 | `pip install xxx --user` | 装在 ~/.local/ |
| nohup 后台运行 | `nohup python xxx &` | 替代 systemd 的后台保活 |

#### 无 sudo 的替代方案

| 需要做的事 | 有 sudo | 无 sudo 的替代 |
|------------|---------|----------------|
| 装系统软件 | `sudo apt install` | `conda install` 或 `pip install --user` |
| 服务保活 | `systemd` | `nohup` 或 `screen`/`tmux` |
| 监听 80 端口 | Nginx 监听 80 | Nginx 监听 8080，或用 `setcap`（如果有权限） |
| 防火墙 | `ufw` | 没法配防火墙，靠云服务商安全组 |
| Docker | `sudo docker` | 让管理员把你加入 `docker` 组 |
| CUDA 安装 | `sudo sh cuda.run` | 让管理员装，或用 conda 装 CUDA：`conda install cudatoolkit` |

#### 实操：无 sudo 的"伪 systemd"替代

```bash
# 用 nohup 替代 systemd 实现服务保活
# 缺点：崩溃不会自动重启（需要自己写监控脚本）

# 启动 vLLM 并放后台
nohup vllm serve --model /models/Qwen-14B --port 8000 > vllm.log 2>&1 &
echo $! > vllm.pid          # 记录 PID

# 查看日志
tail -f vllm.log

# 停止
kill $(cat vllm.pid)

# 用 screen 替代（更适合交互式）
screen -S vllm
vllm serve --model /models/Qwen-14B --port 8000
# Ctrl+A D 分离
```

#### 用 screen 实现简易保活脚本

```bash
#!/bin/bash
# keep_alive.sh - 无 sudo 的简易保活
# 放在 crontab 里每分钟检查一次

PROCESS_NAME="vllm"
if ! pgrep -f "$PROCESS_NAME" > /dev/null; then
    echo "$(date): $PROCESS_NAME 未运行，重新启动" >> ~/keep_alive.log
    cd ~/project
    nohup vllm serve --model /models/Qwen-14B --port 8000 > vllm.log 2>&1 &
fi

# 加入 crontab（crontab 不需要 sudo）
crontab -e
# 写入：
* * * * * /home/user/keep_alive.sh
```

### 5.10 Windows WSL 能否替代

**能用 WSL 练什么**：

| 功能 | WSL2 支持 | 说明 |
|------|-----------|------|
| Linux 命令练习 | ✅ | 完整 Ubuntu，grep/sed/awk 全部能用 |
| Shell 脚本 | ✅ | 完整 bash |
| Docker | ✅ | WSL2 原生支持 Docker Desktop |
| Python/PyTorch | ✅ | 能装能跑 |
| GPU 调用 | ✅ | WSL2 支持 CUDA（需 Win11 + NVIDIA 驱动） |
| systemd | ⚠️ | WSL2 较新版本支持，默认可能没开 |
| Nginx | ✅ | 能装，监听 80 需要 sudo（WSL 里你是 root） |
| ufw 防火墙 | ❌ | WSL 没有独立防火墙（靠 Windows 防火墙） |
| nvidia-docker | ✅ | 可用 |
| K8s | ⚠️ | 能装但资源有限，适合单节点学习 |

**WSL 的优势**：
- **你在 WSL 里默认就是 root**，所有 sudo 操作都能做
- 不花钱买云服务器
- Windows 和 Linux 文件互通（`/mnt/c/` 访问 C 盘）

**WSL 的局限**：
- 没有真实公网 IP（不能做 frpc/Nginx 域名实验）
- 没有 GPU 集群（只能用本机一张卡）
- 不适合练 K8s 多节点

**推荐组合**：

```
学习场景                        推荐环境
──────────────────────────────────────────
阶段一 Linux 基础             → WSL2（免费，你是 root）
阶段二 Docker                 → WSL2 + Docker Desktop
阶段三 CUDA/GPU              → WSL2（有 N 卡）或 AutoDL（无卡）
阶段四 K8s                    → Play with K8s（免费在线）或云服务器
阶段五 vLLM 部署              → AutoDL（按小时租）
阶段六 项目                   → AutoDL + 阿里云（域名+SSL）
```

**WSL2 开启 systemd（用于练习 systemd 章节）**：

```bash
# 编辑 WSL 配置
sudo vim /etc/wsl.conf

# 写入
[boot]
systemd=true

# 重启 WSL（在 Windows PowerShell 里）
wsl --shutdown
# 重新打开 WSL 终端

# 验证
systemctl list-units    # 能列出服务就说明 systemd 已启用
```

---

## 六、验收标准

> 能够独立排查程序崩溃、端口占用、日志报错、实现服务 7×24 小时保活。

**自测清单**：

- [ ] 能用 htop 定位 CPU 打满的进程
- [ ] 能用 `dmesg | grep killed` 排查 OOM
- [ ] 能用 `grep + awk` 从日志提取报错信息
- [ ] 能写 systemd service 文件让服务崩溃自愈
- [ ] 能用 journalctl 查服务日志
- [ ] 能配 Nginx 反向代理把 8000 转到 80
- [ ] 能写 Shell 脚本一键部署环境
- [ ] 能用 ufw 放行/限制端口

---

## 七、关联笔记

- `troubleshooting/Linux系统管理/Linux 端口占用 进程排查和释放.md`
- `troubleshooting/Linux系统管理/Linux 目录权限与属主查看.md`
- `troubleshooting/Linux系统管理/Linux 安装和配置 Zsh 终端.md`
- `troubleshooting/Shell命令与工具/grep 和 find 查内容与文件名.md`
- `troubleshooting/Shell命令与工具/curl 查看接口和 jq JSON 格式化.md`
- `troubleshooting/Shell命令与工具/vim 和 nano 终端编辑器速查.md`
- `troubleshooting/远程连接与传输/SSH 本地端口转发.md`
- `devops/Docker学习笔记.md`（阶段二前置）
- 本目录 `阶段二_Docker与Nvidia-Docker2.md`
