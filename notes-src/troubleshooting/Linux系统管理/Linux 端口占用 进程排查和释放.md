# Linux 端口占用、进程排查和释放

## 一句话结论

端口是被进程占用的。要释放某个监听端口，通常需要找到占用端口的进程 PID，并让这个进程退出；进程退出后监听端口才会释放。

例如端口 `14464` 被占用，推荐先查：

```bash
sudo ss -ltnp | grep ':14464'
```

或者：

```bash
sudo lsof -nP -iTCP:14464 -sTCP:LISTEN
```

拿到 PID 后，再查完整命令、程序路径、运行目录，确认无误后再 `kill`。

## 背景与现象

典型问题：

- 需要使用 `14464` 端口，但启动服务时提示端口已被占用。
- 不知道具体是哪个应用、哪个命令、哪个路径启动的服务占用了端口。
- 想知道近期后台运行了哪些命令，以及它们对应的端口号和进程号。
- 想知道怎么 kill 进程、释放端口。
- 有时 kill 后端口或 GPU 资源看起来还没释放，例如 `nvidia-smi` 里 PID 仍然存在。

## 查某个端口被谁占用

### 方法一：ss

查 `14464` 端口：

```bash
sudo ss -ltnp | grep ':14464'
```

参数含义：

- `-l`：只看监听中的端口。
- `-t`：TCP。
- `-n`：不解析域名或服务名，直接显示数字端口。
- `-p`：显示进程信息，通常需要 `sudo` 才完整。

可能输出：

```text
LISTEN 0 4096 0.0.0.0:14464 0.0.0.0:* users:(("python",pid=12345,fd=7))
```

可以读出：

```text
端口：14464
进程名：python
PID：12345
监听地址：0.0.0.0
```

更精确地查某个本地监听端口：

```bash
sudo ss -ltnp 'sport = :14464'
```

### 方法二：lsof

```bash
sudo lsof -nP -iTCP:14464 -sTCP:LISTEN
```

参数含义：

- `-nP`：不解析主机名和端口名，速度更快，端口显示为数字。
- `-iTCP:14464`：查 TCP 14464 端口。
- `-sTCP:LISTEN`：只看监听状态。

可能输出：

```text
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python  12345 user    7u  IPv4 123456      0t0  TCP *:14464 (LISTEN)
```

### 方法三：fuser

如果系统有 `fuser`：

```bash
sudo fuser -v 14464/tcp
```

## 查 PID 对应的完整命令和路径

假设查到 PID 是 `12345`。

### 查完整启动命令

```bash
ps -p 12345 -o pid,ppid,user,stat,lstart,etime,cmd
```

字段含义：

- `pid`：进程号。
- `ppid`：父进程号。
- `user`：运行用户。
- `stat`：进程状态。
- `lstart`：启动时间。
- `etime`：已经运行多久。
- `cmd`：启动命令。

### 查可执行文件路径

```bash
readlink -f /proc/12345/exe
```

### 查进程当前工作目录

```bash
readlink -f /proc/12345/cwd
```

### 查完整命令行

适合命令很长时：

```bash
tr '\0' ' ' < /proc/12345/cmdline
echo
```

如果权限不够，前面加 `sudo`。

### 常用组合

```bash
PID=12345
ps -p $PID -o pid,ppid,user,stat,lstart,etime,cmd
readlink -f /proc/$PID/exe
readlink -f /proc/$PID/cwd
tr '\0' ' ' < /proc/$PID/cmdline; echo
```

## 查所有监听端口及对应进程

只看 TCP 监听端口：

```bash
sudo ss -ltnp
```

看 TCP 和 UDP：

```bash
sudo ss -tunlp
```

用 `lsof` 看所有 TCP 监听端口：

```bash
sudo lsof -nP -iTCP -sTCP:LISTEN
```

筛常见开发服务：

```bash
sudo lsof -nP -iTCP -sTCP:LISTEN | grep -E 'python|node|uvicorn|gradio|streamlit'
```

## 查近期后台运行的命令

### 当前 shell 的后台任务

如果是在当前终端里用 `&` 挂到后台：

```bash
jobs -l
```

例如之前运行过：

```bash
python app.py &
```

可能看到：

```text
[1]+ 12345 Running python app.py &
```

注意：`jobs -l` 只能看到当前 shell 会话里的后台任务，看不到其他终端、nohup、tmux、systemd、docker 里的进程。

### 最近启动的进程

```bash
ps -eo pid,ppid,user,stat,lstart,etime,cmd --sort=-lstart | head -50
```

### 筛常见服务命令

```bash
ps -eo pid,ppid,user,stat,lstart,etime,cmd | grep -E 'python|uvicorn|gunicorn|node|npm|gradio|streamlit' | grep -v grep
```

### 查 nohup

```bash
ps -eo pid,ppid,user,stat,lstart,etime,cmd | grep nohup | grep -v grep
```

### 查 tmux 和 screen

```bash
tmux ls
screen -ls
```

进入 tmux 查看里面运行了什么：

```bash
tmux attach -t 会话名
```

## kill 进程和释放端口

### 是否必须 kill 进程才能解绑端口

通常是的。

监听端口是由进程打开的。进程正常退出后，它监听的端口会释放。没有一个独立的“解绑端口”命令可以在不结束或不改变进程状态的情况下强行把监听端口拿走。

### 推荐 kill 顺序

先温和结束：

```bash
kill 12345
```

等几秒再查：

```bash
sleep 2
sudo ss -ltnp | grep ':14464'
```

如果还在，可以显式发送 TERM：

```bash
kill -TERM 12345
```

仍然不退出，再强制：

```bash
kill -9 12345
```

`kill -9` 是强制杀，不给程序清理资源的机会，不建议一上来就用。

### 通过端口直接杀进程

先查端口对应 PID：

```bash
sudo lsof -tiTCP:14464 -sTCP:LISTEN
```

确认后杀掉：

```bash
kill $(sudo lsof -tiTCP:14464 -sTCP:LISTEN)
```

强杀：

```bash
kill -9 $(sudo lsof -tiTCP:14464 -sTCP:LISTEN)
```

这类命令要谨慎，最好先单独执行 `lsof` 确认 PID 是目标服务。

## kill 后端口还被占用的原因

### 1. 杀错 PID

可能杀的是父进程，但真正监听端口的是子进程。重新查：

```bash
sudo ss -ltnp | grep ':14464'
```

### 2. 进程被自动拉起

可能被这些机制重新启动：

- `systemd`
- `supervisor`
- `docker`
- `tmux` / `screen`
- `nohup` 脚本
- 自己写的守护脚本

检查 systemd：

```bash
systemctl --type=service --state=running | grep -i 关键词
```

看 PID 属于哪个 systemd 服务：

```bash
systemctl status 12345
```

用户级 systemd：

```bash
systemctl --user status 12345
```

检查 Docker：

```bash
docker ps
```

看容器端口：

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Command}}"
```

### 3. 端口处于 TIME_WAIT

查看所有连接状态：

```bash
ss -tan | grep ':14464'
```

如果是 `TIME-WAIT`，通常不是监听端口被占用，而是连接残留，等一会儿会消失。真正阻止服务启动的一般是 `LISTEN` 状态。

### 4. 进程状态异常

查看状态：

```bash
ps -p 12345 -o pid,ppid,stat,cmd
```

常见状态：

```text
Z  zombie，僵尸进程
D  uninterruptible sleep，不可中断睡眠，常见于 IO/NFS/驱动等待
```

`D` 状态有时 `kill -9` 也杀不掉，只能等内核调用返回；严重时需要处理挂载、驱动或重启机器。

## 端口占用和 nvidia-smi 的关系

`nvidia-smi` 显示的是占用 GPU 的进程，不是端口。

```text
端口占用：用 ss / lsof 看
GPU 占用：用 nvidia-smi 看
```

如果 kill 了某个端口进程，但 `nvidia-smi` 里 PID 还在，可能原因：

- 杀的不是 GPU 进程。
- 同一个程序有多个子进程，GPU 在子进程里。
- 进程被自动重启。
- 进程卡在 `D` 状态或 CUDA 清理较慢。
- Jupyter、Ray、torchrun、multiprocessing 启动了多个 worker。
- Docker 容器里的进程还在。

## 查 GPU PID 是谁

先看 GPU 占用：

```bash
nvidia-smi
```

假设 GPU PID 是 `23456`，查它的命令和路径：

```bash
ps -p 23456 -o pid,ppid,user,stat,lstart,etime,cmd
readlink -f /proc/23456/cwd
tr '\0' ' ' < /proc/23456/cmdline; echo
```

看父子关系：

```bash
pstree -ps 23456
```

如果没有 `pstree`：

```bash
ps -o pid,ppid,cmd -p 23456
```

确认要释放 GPU 后：

```bash
kill 23456
sleep 2
nvidia-smi
```

还在再：

```bash
kill -9 23456
```

## 查父子进程，避免只杀一个子进程

假设 PID 是 `12345`：

```bash
pstree -ap 12345
```

看父进程：

```bash
ps -p 12345 -o pid,ppid,cmd
```

看子进程：

```bash
pgrep -P 12345 -a
```

查看进程组：

```bash
ps -o pid,ppid,pgid,sid,cmd -p 12345
```

如果确认整个进程组都是目标服务，可以杀进程组。假设 PGID 是 `12345`：

```bash
kill -- -12345
```

强杀进程组：

```bash
kill -9 -- -12345
```

注意：杀进程组的影响范围更大，必须先确认 PGID。

## 推荐排查流程

假设端口是 `14464`。

### 1. 查端口对应 PID

```bash
sudo ss -ltnp | grep ':14464'
```

或者：

```bash
sudo lsof -nP -iTCP:14464 -sTCP:LISTEN
```

### 2. 查 PID 的命令、路径、运行目录

```bash
PID=12345
ps -p $PID -o pid,ppid,user,stat,lstart,etime,cmd
readlink -f /proc/$PID/exe
readlink -f /proc/$PID/cwd
tr '\0' ' ' < /proc/$PID/cmdline; echo
```

### 3. 确认后温和 kill

```bash
kill $PID
sleep 2
sudo ss -ltnp | grep ':14464'
```

### 4. 还在则重新查 PID

```bash
sudo ss -ltnp | grep ':14464'
```

如果 PID 变了，说明进程可能被自动重启，需要查 `systemd`、`docker`、`tmux/screen/nohup` 或启动脚本。

### 5. 确认不是自动重启后再强杀

```bash
kill -9 $PID
```

## 最小速查

查端口：

```bash
sudo lsof -nP -iTCP:14464 -sTCP:LISTEN
```

查所有监听端口：

```bash
sudo ss -tunlp
```

查 PID 完整命令：

```bash
ps -p PID -o pid,ppid,user,stat,lstart,etime,cmd
```

查程序路径：

```bash
readlink -f /proc/PID/exe
```

查运行目录：

```bash
readlink -f /proc/PID/cwd
```

杀进程：

```bash
kill PID
```

强杀：

```bash
kill -9 PID
```

查 GPU 进程：

```bash
nvidia-smi
```

查 GPU PID 是谁：

```bash
ps -p GPU_PID -o pid,ppid,user,stat,lstart,etime,cmd
```

## 关联笔记

- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\curl 查看接口和 jq JSON 格式化.md`
- `D:\面试准备及其笔记\troubleshooting\远程连接与传输\SSH 本地端口转发.md`
- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\grep 和 find 查内容与文件名.md`

## 更新时间

- 2026-06-11：整理 Linux 端口占用、后台进程、kill 释放端口，以及 `nvidia-smi` GPU PID 残留排查。
