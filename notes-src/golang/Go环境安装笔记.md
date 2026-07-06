# Go 环境安装笔记：Ubuntu + Windows

> 更新时间：2026-06-29 | 适用版本：Go 1.21+（含 1.22 / 1.23）
> 状态：环境搭建笔记，踩坑记录待实际遇到补充
> 关联笔记：`golang/Go语言入门与Java对比.md`（语言本身的对比学习）

---

## 一句话结论

**Ubuntu 推荐 `wget` 下载官方二进制包解压到 `/usr/local`**（不用 apt，因为 apt 的版本太旧）；**Windows 推荐下载官方 `msi` 安装包一路下一步**（自动配 PATH）。装完用 `go version` 验证，再配 `GOPROXY=https://goproxy.cn` 加速国内下载。两套系统的 Go 命令完全一致，写好的代码可跨平台编译。

---

## 二、安装前：先确认有没有装过

两套系统都先跑一下，确认是否已装、装了什么版本：

```bash
# 任意系统
go version
# 没装：command not found / 不是内部或外部命令
# 装了：go version go1.22.0 linux/amd64
```

如果已装旧版想升级，先卸载：
- Ubuntu：`sudo rm -rf /usr/local/go`
- Windows：控制面板 → 程序 → 卸载 Go

---

## 三、Ubuntu 安装（推荐 wget 方式）

### 3.1 为什么不用 `apt install`

```bash
sudo apt install golang-go
```

**不推荐**。Ubuntu 官方源里的 Go 版本通常落后 1-2 个大版本（比如 Ubuntu 22.04 源里是 1.18，而官方已到 1.22+）。Go 的官方二进制是绿色版（解压即用），版本可控、卸载干净，**优先用 wget 方式**。

### 3.2 方式一：官方二进制包（推荐）

#### 第 1 步：下载

先去 https://go.dev/dl/ 看最新版本号，或直接用命令查：

```bash
# 查看最新稳定版（可选）
curl -s https://go.dev/VERSION?m=text | head -1
# 假设输出 go1.22.5
```

下载（以 `go1.22.5.linux-amd64.tar.gz` 为例，按实际版本替换）：

```bash
cd /tmp
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
```

> 如果是 ARM 架构（如树莓派、ARM 云服务器），把 `amd64` 换成 `arm64`。

#### 第 2 步：解压到 `/usr/local`

```bash
# 先删除旧版（如果有）
sudo rm -rf /usr/local/go

# 解压到 /usr/local（会生成 /usr/local/go 目录）
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
```

> **为什么放 `/usr/local/go`**：这是 Go 官方推荐的路径，符合 Linux FHS（文件系统层级标准），不需要改权限。

#### 第 3 步：配置 PATH 环境变量

```bash
# 编辑 ~/.profile（或 ~/.bashrc / ~/.zshrc，看你的 shell）
nano ~/.profile
```

在文件末尾追加：

```bash
# Go 环境变量
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

**三个变量说明**：

| 变量 | 含义 | 默认值 |
|------|------|--------|
| `PATH` 加入 `/usr/local/go/bin` | 让系统能找到 `go` 命令 | - |
| `GOPATH` | Go 工作区，下载的依赖和编译产物放这 | `$HOME/go` |
| `PATH` 加入 `$GOPATH/bin` | 让 `go install` 装的工具能直接跑 | - |

让配置生效：

```bash
source ~/.profile
# 或重新登录 shell
```

#### 第 4 步：验证

```bash
go version
# 输出：go version go1.22.5 linux/amd64

go env GOROOT GOPATH
# GOROOT=/usr/local/go
# GOPATH=/home/你的用户名/go
```

#### 第 5 步：清理下载包

```bash
rm /tmp/go1.22.5.linux-amd64.tar.gz
```

### 3.3 方式二：用 Snap（备选，自动更新）

```bash
sudo snap install go --classic
```

**优点**：自动更新版本。
**缺点**：snap 在某些服务器环境（如 Docker 容器）不可用，且 snap 的权限隔离偶尔会导致工具链找不到。

### 3.4 方式三：用 apt（不推荐，版本旧）

```bash
# Ubuntu 官方源（版本旧）
sudo apt update
sudo apt install golang-go

# 或加 Go 官方 PPA（版本较新）
sudo add-apt-repository ppa:longsleep/golang-backports
sudo apt update
sudo apt install golang-go
```

> 仅在你没有 root 权限解压 `/usr/local`、或必须用包管理器统一管理时考虑。

---

## 四、Windows 安装（推荐 MSI 方式）

### 4.1 方式一：官方 MSI 安装包（推荐）

#### 第 1 步：下载

去 https://go.dev/dl/ 下载 `go1.22.5.windows-amd64.msi`（按实际版本替换）。

或用命令下载（PowerShell）：

```powershell
Invoke-WebRequest -Uri "https://go.dev/dl/go1.22.5.windows-amd64.msi" -OutFile "$env:TEMP\go.msi"
```

> $env:TEMP 为 `C:\Users\你的用户名\AppData\Local\Temp`



#### 第 2 步：安装

双击 `go1.22.5.windows-amd64.msi`，一路 Next：

- 安装路径默认 `C:\Program Files\Go`（**GOROOT**，别改）
- 安装程序**会自动把 `C:\Program Files\Go\bin` 加入系统 PATH**，不用手动配
- 用户级的 `GOPATH` 默认是 `C:\Users\你的用户名\go`，也不用配

> 如果用命令行静默安装：
> ```powershell
> msiexec /i go.msi /quiet
> ```

#### 第 3 步：验证

**重新打开一个新的 PowerShell / CMD 窗口**（让 PATH 生效），然后：

```powershell
go version
# go version go1.22.5 windows/amd64

go env GOROOT GOPATH
# GOROOT=C:\Program Files\Go
# GOPATH=C:\Users\你的用户名\go
```

> 如果提示 "go 不是内部或外部命令"：检查环境变量 PATH 里有没有 `C:\Program Files\Go\bin`，没有就手动加（系统属性 → 高级 → 环境变量 → Path → 新建）。

### 4.2 方式二：官方 ZIP 包（免安装版）

适合没有管理员权限的机器，或想多版本共存。

#### 第 1 步：下载并解压

去 https://go.dev/dl/ 下载 `go1.22.5.windows-amd64.zip`，解压到比如 `D:\go`（解压后会得到 `D:\go\bin\go.exe`）。

#### 第 2 步：手动配 PATH

PowerShell（管理员）：

```powershell
# 加系统 PATH（永久）
[Environment]::SetEnvironmentVariable(
    "Path",
    $env:Path + ";D:\go\bin",
    "User"
)

# 配 GOPATH（可选，默认就是 C:\Users\你\go）
[Environment]::SetEnvironmentVariable("GOPATH", "D:\gopath", "User")
```

重开终端后 `go version` 验证。

### 4.3 方式三：用 Scoop / Chocolatey（包管理器）

```powershell
# Scoop
scoop install go

# Chocolatey
choco install golang
```

**优点**：一条命令装、好升级（`scoop update go` / `choco upgrade golang`）。
**缺点**：装的版本可能略滞后官方几天。

---

## 五、装完后的通用配置（两套系统都做）

### 5.1 配置国内代理（必做，否则下载依赖超慢）

Go 默认从 `proxy.golang.org` 拉依赖，国内访问慢/失败。配国内镜像：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
go env -w GOSUMDB=sum.golang.google.cn
```

| 配置 | 作用 |
|------|------|
| `GOPROXY=https://goproxy.cn,direct` | 拉模块时走七牛云镜像，`direct` 表示镜像没有时回源 |
| `GOSUMDB=sum.golang.google.cn` | 校验和数据库用国内镜像 |

> 备选镜像：`https://goproxy.io,direct`、`https://mirrors.aliyun.com/goproxy/,direct`

### 5.2 关闭自动更新检查（可选）

```bash
go env -w GOFLAGS=-mod=mod
```

### 5.3 开启 Go Modules（默认已开，1.16+ 默认）

```bash
go env GO111MODULE
# 输出 on 或空（空=默认开）就是开了
```

### 5.4 验证配置

```bash
go env GOPROXY
# https://goproxy.cn,direct
```

---

## 六、写第一个 Go 程序验证环境

### 6.1 创建项目

```bash
# 任意目录
mkdir hello
cd hello

# 初始化模块（生成 go.mod）
go mod init hello
```

### 6.2 写代码

创建 `main.go`：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
```

### 6.3 运行

```bash
# 直接运行（不生成二进制）
go run main.go
# Hello, Go!

# 编译成可执行文件
go build
# 生成 hello（Linux）/ hello.exe（Windows）
./hello        # Linux
hello.exe      # Windows
```

### 6.4 验证依赖下载（测试 GOPROXY）

```bash
# 拉一个第三方包
go get github.com/gin-gonic/gin

# 检查下载是否成功
go mod tidy
```

如果几秒内完成，说明 GOPROXY 配置正确；如果卡住或超时，检查代理配置。

---

## 七、IDE / 编辑器推荐

| 工具 | 平台 | 特点 |
|------|------|------|
| **VS Code + Go 扩展** | 全平台 | 免费、轻量、官方推荐，装 `Go` 扩展即可 |
| **GoLand**（JetBrains） | 全平台 | 功能最强、智能补全好，收费（学生可免费） |
| **Vim/Neovim + vim-go** | Linux | 终端党首选 |
| **Cursor** | 全平台 | VS Code 套壳 + AI 辅助 |

**VS Code 装 Go 扩展后第一次打开 .go 文件，会提示安装 Go 工具链**（gopls、dlv 等），点 "Install All" 一键装好。如果下载慢，先配好 GOPROXY 再装。

---

## 八、常见命令速查

```bash
# 项目管理
go mod init <module-name>    # 初始化模块
go mod tidy                  # 整理依赖（加缺失、删多余）
go get <package>             # 下载依赖
go get -u <package>          # 升级依赖

# 编译运行
go run main.go               # 直接运行
go build                     # 编译当前包
go build -o myapp            # 指定输出名
go install                   # 编译并装到 $GOPATH/bin

# 测试
go test                      # 跑测试
go test -v                   # 详细输出
go test -cover               # 覆盖率

# 环境
go env                       # 查看所有环境变量
go env -w KEY=VALUE          # 设置环境变量（持久化）
go version                   # 版本
go fmt ./...                 # 格式化代码
go vet ./...                 # 静态检查
```

---

## 九、跨平台编译（Go 的杀手锏）

Go 编译可以指定目标 OS 和架构，在 Windows 上编译 Linux 可执行文件，反之亦然：

```bash
# 在 Windows 上编译 Linux 版本
$env:GOOS="linux"; $env:GOARCH="amd64"; go build -o myapp
# 生成可在 Linux 上跑的 myapp（无依赖）

# 在 Linux 上编译 Windows 版本
GOOS=windows GOARCH=amd64 go build -o myapp.exe

# 在任意平台编译 ARM64（如树莓派、M1 Mac）
GOOS=linux GOARCH=arm64 go build -o myapp
```

| 环境变量 | 常用值 |
|----------|--------|
| `GOOS` | `linux` / `windows` / `darwin`（macOS） |
| `GOARCH` | `amd64` / `arm64` |

> 这是 Go 相比 Java 的部署优势之一：交叉编译零配置，编译出来就是一个原生二进制，目标机器不用装 Go。

---

## 十、多版本管理（可选，进阶）

### 10.1 用 `go install golang.org/dl/<version>`

```bash
# 装 1.22.5 和 1.21.12 两个版本
go install golang.org/dl/go1.22.5@latest
go install golang.org/dl/go1.21.12@latest

# 下载对应版本的 SDK
go1.22.5 download
go1.21.12 download

# 用指定版本编译
go1.22.5 build
go1.21.12 build
```

### 10.2 用 gvm（Go Version Manager，类似 nvm）

```bash
# Ubuntu
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
source ~/.gvm/scripts/gvm

gvm install go1.22.5
gvm use go1.22.5 --default
```

> 日常开发用不到多版本管理，除非要给不同项目用不同 Go 版本。

---

## 十一、踩坑记录

> 待实际使用后补充。预留常见坑方向：

- **坑1（预期）**：Windows 装完 `go version` 不识别 → 没重开终端，或 PATH 没加成功，手动加 `C:\Program Files\Go\bin`。
- **坑2（预期）**：Ubuntu `source ~/.profile` 后新开终端又失效 → 配到了 `~/.profile` 但用 zsh，改配 `~/.zshrc`。
- **坑3（预期）**：`go get` 卡住/超时 → 没配 GOPROXY，或代理地址写错。
- **坑4（预期）**：VS Code Go 扩展工具装不上 → 先在终端 `go env -w GOPROXY=https://goproxy.cn,direct` 再装。
- **坑5（预期）**：apt 装的 Go 版本太旧，编译报语法错误 → 卸载 apt 版，用 wget 装官方版。
- **坑6（预期）**：`GOOS=windows go build` 在 Linux 上生成 .exe 报错 → 检查 `GOARCH` 是否匹配目标架构。

---

## 十二、安装方式选择总结

| 系统 | 推荐方式 | 适合场景 |
|------|----------|----------|
| **Ubuntu** | `wget` 下载 + 解压 `/usr/local` | 服务器、生产、版本可控 |
| Ubuntu | Snap | 个人开发、想自动更新 |
| Ubuntu | apt | 不推荐（版本旧） |
| **Windows** | 官方 MSI 一路下一步 | 日常开发，最省心 |
| Windows | ZIP 免安装版 | 无管理员权限、多版本共存 |
| Windows | Scoop / Chocolatey | 喜欢用包管理器统一管理 |

---

## 十三、相关链接

- Go 官方下载：https://go.dev/dl/
- Go 官方安装文档：https://go.dev/doc/install
- 国内镜像 goproxy.cn：https://goproxy.cn/
- 本项目 `golang/Go语言入门与Java对比.md`（语言学习）
- 本项目 `技术工具学习索引.md`
