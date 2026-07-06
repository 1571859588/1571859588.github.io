# Node npm pnpm corepack 和 pm2 进程管理

## 一句话结论

`npm` 和 `pnpm` 是 Node.js 项目的包管理器，负责安装依赖和运行 `package.json` 里的脚本；`corepack` 是 Node.js 配套的包管理器代理工具，用来启用和管理 `pnpm`、`yarn` 等包管理器版本；`pm2` 是进程管理器，用来把项目命令放到后台运行、查看日志、自动重启和管理服务。

这条命令：

```bash
pm2 start "pnpm start" --name docqa20260611
```

意思是：用 `pm2` 启动并托管 `pnpm start`，并把这个后台进程命名为 `docqa20260611`。

更推荐的稳妥写法是：

```bash
pm2 start pnpm --name docqa20260611 -- start
```

## 命令拆解

```bash
pm2 start "pnpm start" --name docqa20260611
```

拆开看：

```text
pm2
```

Node.js 生态常用的进程管理工具，也可以托管普通命令。

```text
start
```

让 pm2 启动一个进程。

```text
"pnpm start"
```

真正要执行的命令。它通常会读取当前项目 `package.json` 里的：

```json
{
  "scripts": {
    "start": "..."
  }
}
```

也就是说，`pnpm start` 实际执行的是 `scripts.start` 对应的命令。

```text
--name docqa20260611
```

给这个 pm2 进程起名。之后可以用名字管理：

```bash
pm2 logs docqa20260611
pm2 restart docqa20260611
pm2 stop docqa20260611
pm2 delete docqa20260611
```

## npm 和 pnpm 是什么

`npm` 和 `pnpm` 都是 JavaScript / Node.js 项目的包管理器，主要负责：

- 安装依赖。
- 管理 `package.json`。
- 执行脚本。
- 生成 lock 文件。
- 管理项目依赖版本。

常见 npm 命令：

```bash
npm install
npm run dev
npm run build
npm start
```

常见 pnpm 命令：

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

`pnpm dev` 等价于：

```bash
pnpm run dev
```

## npm 和 pnpm 的区别

| 项目 | npm | pnpm |
|---|---|---|
| 是否 Node 自带 | 通常自带 | 通常需要通过 corepack 启用或单独安装 |
| 安装速度 | 常规 | 通常更快 |
| 磁盘占用 | 每个项目容易重复存依赖 | 依赖可复用，通常更省空间 |
| node_modules 结构 | 较扁平 | 更严格，更接近真实依赖关系 |
| 兼容性 | 最通用 | 大多数项目兼容，老项目偶尔需要适配 |
| lock 文件 | `package-lock.json` | `pnpm-lock.yaml` |

选择规则：

- 项目里有 `pnpm-lock.yaml`：优先用 `pnpm`。
- 项目里有 `package-lock.json`：优先用 `npm`。
- 不要在同一个项目里混用 `npm install` 和 `pnpm install`，容易让 lock 文件和依赖状态混乱。

## corepack 是什么

`corepack` 是 Node.js 配套的包管理器代理工具。

它不是 `npm`、`pnpm`、`yarn` 本身，而是用来帮你启用和管理 `pnpm`、`yarn` 等包管理器版本。

它的典型作用是：项目可以在 `package.json` 里声明需要哪个包管理器版本，例如：

```json
{
  "packageManager": "pnpm@9.15.0"
}
```

然后执行：

```bash
corepack enable
pnpm -v
```

corepack 会帮你准备对应版本的 `pnpm`，避免每台机器手动安装出来的 pnpm 版本不一致。

## corepack 怎么安装或启用

### 先检查是否已有 corepack

```bash
node -v
corepack --version
```

如果能输出版本号，说明已有 corepack。

### 推荐方式：使用较新的 Node LTS

很多较新的 Node.js 版本会自带 corepack。Linux 服务器上推荐用 `nvm` 管理 Node：

```bash
nvm install --lts
nvm use --lts
node -v
corepack --version
```

启用 corepack：

```bash
corepack enable
```

准备并激活最新版 pnpm：

```bash
corepack prepare pnpm@latest --activate
pnpm -v
```

如果要指定 pnpm 版本：

```bash
corepack prepare pnpm@9.15.0 --activate
```

### 如果没有 corepack 怎么办

如果 `corepack: command not found`，常见原因是 Node 版本太老，或者当前 Node 安装方式没有带 corepack。

优先方案：升级或切换到较新的 Node LTS：

```bash
nvm install --lts
nvm use --lts
corepack enable
```

替代方案：直接用 npm 全局安装 pnpm：

```bash
npm install -g pnpm
pnpm -v
```

这个方式能用，但没有 corepack 按项目声明版本自动管理那么规整。

## Node / npm / pnpm 环境配置流程

### 1. 安装或切换 Node

推荐用 nvm：

```bash
nvm install --lts
nvm use --lts
node -v
npm -v
```

### 2. 启用 pnpm

优先用 corepack：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

如果没有 corepack：

```bash
npm install -g pnpm
pnpm -v
```

### 3. 进入项目目录安装依赖

```bash
cd /path/to/project
pnpm install
```

如果项目使用 npm：

```bash
npm install
```

### 4. 前台测试项目能否启动

```bash
pnpm start
```

或者：

```bash
npm start
```

确认前台能正常跑后，再交给 pm2 托管。

## npm 常用命令

查看版本：

```bash
node -v
npm -v
```

安装依赖：

```bash
npm install
```

安装某个包：

```bash
npm install axios
```

安装开发依赖：

```bash
npm install -D typescript
```

运行脚本：

```bash
npm run dev
npm run build
npm start
```

查看项目脚本：

```bash
npm run
```

## pnpm 常用命令

查看版本：

```bash
pnpm -v
```

安装依赖：

```bash
pnpm install
```

安装某个包：

```bash
pnpm add axios
```

安装开发依赖：

```bash
pnpm add -D typescript
```

运行脚本：

```bash
pnpm dev
pnpm build
pnpm start
```

等价于：

```bash
pnpm run dev
pnpm run build
pnpm run start
```

查看项目脚本：

```bash
pnpm run
```

## pm2 是什么

`pm2` 是 Node.js 生态常用的进程管理器，也可以托管普通命令。

它常用于服务器上让服务：

- 后台运行。
- 崩溃后自动重启。
- 查看日志。
- 管理多个服务。
- 设置开机自启。
- 方便 stop / restart / delete。
- 查看 CPU 和内存占用。

手动运行：

```bash
pnpm start
```

终端关闭后，服务可能会停。

用 pm2 托管：

```bash
pm2 start pnpm --name docqa20260611 -- start
```

服务会由 pm2 管理，终端关闭后通常仍在后台运行。

## 安装 pm2

```bash
npm install -g pm2
pm2 -v
```

## pm2 启动项目

### 推荐写法

```bash
cd /path/to/project
pm2 start pnpm --name docqa20260611 -- start
```

含义是：用 pm2 启动 `pnpm`，并把 `start` 作为参数传给 `pnpm`。

### 引号写法

```bash
pm2 start "pnpm start" --name docqa20260611
```

有些情况下能用，但在不同 shell 或 pm2 解析规则下可能不如下面这个稳定：

```bash
pm2 start pnpm --name docqa20260611 -- start
```

### 指定工作目录

`pnpm start` 必须在项目目录下运行，因为它需要读取当前目录的 `package.json`。

如果不想先 `cd`，可以写：

```bash
pm2 start pnpm --name docqa20260611 --cwd /path/to/project -- start
```

## pm2 常用命令

查看进程列表：

```bash
pm2 list
```

查看详细信息：

```bash
pm2 show docqa20260611
```

查看实时日志：

```bash
pm2 logs docqa20260611
```

只看最近 100 行：

```bash
pm2 logs docqa20260611 --lines 100
```

重启：

```bash
pm2 restart docqa20260611
```

停止：

```bash
pm2 stop docqa20260611
```

删除：

```bash
pm2 delete docqa20260611
```

实时监控：

```bash
pm2 monit
```

保存当前进程列表：

```bash
pm2 save
```

配置开机自启：

```bash
pm2 startup
```

执行 `pm2 startup` 后，终端通常会输出一条需要复制执行的 `sudo` 命令。执行完后再：

```bash
pm2 save
```

## pm2 怎么 debug

### 1. 看进程状态

```bash
pm2 list
```

如果状态是 `errored`、`stopped`，或者 restart 次数一直增加，需要看日志。

### 2. 看日志

```bash
pm2 logs docqa20260611 --lines 200
```

### 3. 看详细配置

```bash
pm2 show docqa20260611
```

重点看：

- `script path`
- `args`
- `cwd`
- `interpreter`
- `env`
- `restart count`
- `error log path`
- `out log path`

很多 pm2 问题来自启动目录不对。`pnpm start` 如果不在项目目录运行，就可能找不到 `package.json`。

### 4. 先前台跑通，再交给 pm2

推荐排查顺序：

```bash
cd /path/to/project
pnpm install
pnpm start
```

如果前台都跑不起来，先修项目本身，不要急着交给 pm2。

前台正常后，按 `Ctrl + C` 停掉，再：

```bash
pm2 start pnpm --name docqa20260611 -- start
pm2 logs docqa20260611 --lines 100
```

## 看 pm2 日志文件

查看日志路径：

```bash
pm2 show docqa20260611
```

里面通常会有：

```text
error log path
out log path
```

也可以直接看默认日志目录：

```bash
tail -f ~/.pm2/logs/docqa20260611-error.log
tail -f ~/.pm2/logs/docqa20260611-out.log
```

清空某个进程日志：

```bash
pm2 flush docqa20260611
```

清空所有 pm2 日志：

```bash
pm2 flush
```

## 端口被占用时怎么排查

如果 `pnpm start` 或 pm2 日志里出现：

```text
EADDRINUSE: address already in use :::14464
```

说明端口被占用。

查端口：

```bash
sudo ss -ltnp | grep ':14464'
```

或者：

```bash
sudo lsof -nP -iTCP:14464 -sTCP:LISTEN
```

如果发现是旧的 pm2 进程占用：

```bash
pm2 list
pm2 stop docqa20260611
pm2 delete docqa20260611
```

然后重新启动：

```bash
cd /path/to/project
pm2 start pnpm --name docqa20260611 -- start
```

## 推荐启动流程

假设项目使用 pnpm：

```bash
cd /path/to/project
node -v
pnpm -v
pnpm install
pnpm start
```

确认前台能正常跑后，按 `Ctrl + C` 停掉，再交给 pm2：

```bash
pm2 start pnpm --name docqa20260611 -- start
pm2 logs docqa20260611 --lines 100
pm2 list
```

如果需要开机自启：

```bash
pm2 save
pm2 startup
```

按输出提示执行那条命令后，再：

```bash
pm2 save
```

## 最小速查

启用 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

没有 corepack 时安装 pnpm：

```bash
npm install -g pnpm
```

安装 pm2：

```bash
npm install -g pm2
```

安装项目依赖：

```bash
pnpm install
```

前台测试：

```bash
pnpm start
```

pm2 启动：

```bash
pm2 start pnpm --name docqa20260611 -- start
```

查看状态：

```bash
pm2 list
```

看日志：

```bash
pm2 logs docqa20260611 --lines 100
```

重启：

```bash
pm2 restart docqa20260611
```

停止：

```bash
pm2 stop docqa20260611
```

删除：

```bash
pm2 delete docqa20260611
```

查端口：

```bash
sudo ss -ltnp | grep ':14464'
```

## 关联笔记

- `D:\面试准备及其笔记\troubleshooting\Linux系统管理\Linux 端口占用 进程排查和释放.md`
- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\curl 查看接口和 jq JSON 格式化.md`
- `D:\面试准备及其笔记\troubleshooting\远程连接与传输\SSH 本地端口转发.md`

## 更新时间

- 2026-06-11：整理 `pm2 start "pnpm start" --name docqa20260611`、npm/pnpm/corepack 区别、环境配置、pm2 日志和 debug。
