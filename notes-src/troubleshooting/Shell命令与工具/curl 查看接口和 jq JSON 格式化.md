# curl 查看接口和 jq JSON 格式化

## 一句话结论

用 `curl` 可以在命令行里测试 HTTP 接口是否可访问、查看响应头、响应体、状态码和接口文档；如果返回内容是 JSON，可以用 `jq` 格式化和筛选字段。

访问本机服务时，通常优先用：

```bash
curl http://127.0.0.1:14464
```

而不是优先用：

```bash
curl http://0.0.0.0:14464
```

因为 `0.0.0.0` 更多是服务端“监听所有网卡地址”的绑定写法；作为客户端访问地址时，通常用 `127.0.0.1`、`localhost` 或真实机器 IP。

## 背景与现象

想测试下面这个服务端口的内容：

```text
http://0.0.0.0:14464
```

需求包括：

- 看服务是否通。
- 看接口返回了什么内容。
- 看响应头、状态码。
- 找有哪些接口路径。
- 如果返回 JSON，能格式化查看。

## `0.0.0.0`、`127.0.0.1`、`localhost` 的区别

### `0.0.0.0`

常见于服务启动日志，例如：

```text
Listening on 0.0.0.0:14464
```

意思是这个服务监听所有网卡地址。它通常是服务端绑定地址，不是最推荐的客户端访问地址。

### `127.0.0.1`

表示本机回环地址，也就是“当前这台机器自己”。

如果服务就运行在当前电脑或当前远程服务器上，可以用：

```bash
curl http://127.0.0.1:14464
```

### `localhost`

通常会解析到本机地址，常用写法是：

```bash
curl http://localhost:14464
```

### 真实机器 IP

如果服务跑在远程服务器上，并且端口已经对当前机器可访问，可以用远程服务器 IP：

```bash
curl http://172.21.20.244:14464
```

如果远程端口没有直接开放，可以配合 SSH 本地端口转发，再访问本机端口。

## curl 常用形式

### 1. 查看根路径内容

```bash
curl http://127.0.0.1:14464
```

用途：看服务有没有响应，以及根路径返回什么。

### 2. 显示响应头和响应体

```bash
curl -i http://127.0.0.1:14464
```

用途：同时查看状态码、响应头和正文。

### 3. 只看响应头

```bash
curl -I http://127.0.0.1:14464
```

用途：快速看服务是否存在、状态码是多少、返回类型是什么。

注意：有些接口不支持 `HEAD` 请求，此时 `curl -I` 可能失败，但 `curl -i` 能正常返回。

### 4. 查看详细连接过程

```bash
curl -v http://127.0.0.1:14464
```

用途：排查连接失败、重定向、HTTP 版本、TLS、请求头等问题。

### 5. 只看 HTTP 状态码

Linux/macOS/Git Bash：

```bash
curl -o /dev/null -s -w "%{http_code}\n" http://127.0.0.1:14464
```

Windows PowerShell：

```powershell
curl.exe -o NUL -s -w "%{http_code}`n" http://127.0.0.1:14464
```

### 6. 保存响应到文件

```bash
curl -o response.txt http://127.0.0.1:14464
```

如果是接口文档 JSON：

```bash
curl -o openapi.json http://127.0.0.1:14464/openapi.json
```

## 怎么找有哪些接口

先尝试常见路径：

```bash
curl -i http://127.0.0.1:14464/docs
curl -i http://127.0.0.1:14464/redoc
curl -i http://127.0.0.1:14464/openapi.json
curl -i http://127.0.0.1:14464/swagger
curl -i http://127.0.0.1:14464/swagger.json
curl -i http://127.0.0.1:14464/health
```

如果是 FastAPI，常见接口文档路径是：

```bash
curl http://127.0.0.1:14464/openapi.json
```

如果返回 OpenAPI JSON，可以用 `jq` 只看接口路径：

```bash
curl -s http://127.0.0.1:14464/openapi.json | jq '.paths | keys'
```

## jq 是什么

`jq` 是一个命令行 JSON 查看、格式化和筛选工具。

这条命令：

```bash
curl -s http://127.0.0.1:14464 | jq
```

意思是：

1. `curl -s http://127.0.0.1:14464` 请求接口并输出响应内容。
2. `-s` 表示 silent，安静模式，不显示进度条。
3. `|` 是管道，把前一个命令的输出交给后一个命令。
4. `jq` 把输入当作 JSON 格式化输出。

例如原始 JSON 是一行：

```json
{"name":"test","status":"ok","items":[{"id":1},{"id":2}]}
```

经过 `jq` 后会更易读：

```json
{
  "name": "test",
  "status": "ok",
  "items": [
    {
      "id": 1
    },
    {
      "id": 2
    }
  ]
}
```

## jq 常用筛选

只看 `status` 字段：

```bash
curl -s http://127.0.0.1:14464 | jq '.status'
```

只看 `items`：

```bash
curl -s http://127.0.0.1:14464 | jq '.items'
```

只看数组里每个元素的 `id`：

```bash
curl -s http://127.0.0.1:14464 | jq '.items[].id'
```

只看 OpenAPI 里的所有接口路径：

```bash
curl -s http://127.0.0.1:14464/openapi.json | jq '.paths | keys'
```

## jq 怎么安装

### Windows：winget

```powershell
winget install jqlang.jq
```

安装后重新打开 PowerShell，测试：

```powershell
jq --version
```

### Windows：Chocolatey

```powershell
choco install jq
```

### Windows：Scoop

```powershell
scoop install jq
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install jq
```

### CentOS / RHEL / Rocky Linux

```bash
sudo yum install jq
```

或者：

```bash
sudo dnf install jq
```

### macOS：Homebrew

```bash
brew install jq
```

## 没有 jq 时怎么办

### 直接看原始返回

```bash
curl -s http://127.0.0.1:14464
```

### Python 格式化 JSON

```bash
curl -s http://127.0.0.1:14464 | python -m json.tool
```

### PowerShell 内置 JSON 解析

```powershell
curl.exe -s http://127.0.0.1:14464 | ConvertFrom-Json
```

注意：PowerShell 里建议使用 `curl.exe`，因为 `curl` 可能是 `Invoke-WebRequest` 的别名。

## GET 接口测试

普通 GET：

```bash
curl -i http://127.0.0.1:14464/health
```

带查询参数：

```bash
curl -G http://127.0.0.1:14464/search --data-urlencode "q=hello"
```

等价于：

```bash
curl "http://127.0.0.1:14464/search?q=hello"
```

## POST JSON 接口测试

Linux/macOS/Git Bash：

```bash
curl -X POST http://127.0.0.1:14464/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

Windows PowerShell：

```powershell
curl.exe -X POST "http://127.0.0.1:14464/api/chat" `
  -H "Content-Type: application/json" `
  -d '{"message":"hello"}'
```

## 排查顺序

如果不知道服务是否正常，按这个顺序：

```bash
curl -v http://127.0.0.1:14464
curl -i http://127.0.0.1:14464/docs
curl -i http://127.0.0.1:14464/openapi.json
curl -i http://127.0.0.1:14464/health
```

判断方法：

- 根路径 404 不一定代表服务没启动，可能只是没有定义 `/` 路由。
- `/docs`、`/redoc`、`/openapi.json` 常用于找接口文档。
- `/health` 常用于健康检查，但不是所有服务都有。
- 如果所有路径都连接失败，优先检查服务是否启动、端口是否正确、是否需要 SSH 端口转发。

## 关联笔记

- `D:\面试准备及其笔记\troubleshooting\远程连接与传输\SSH 本地端口转发.md`

## 更新时间

- 2026-06-11：根据 `curl` 测试 `http://0.0.0.0:14464`、`jq` 含义和安装方式整理。
