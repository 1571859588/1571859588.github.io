# SCP 文件传输到远程服务器

## 一句话结论

用 `scp` 命令把本地文件/文件夹传到远程 Linux 服务器。**注意：`scp` 的端口参数是大写 `-P`，和 `ssh` 的小写 `-p` 不一样**——这是最容易踩的坑。

## 命令

### 传单个文件

```bash
scp -P 25000 xxx.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/
```

- `-P 25000`：指定 SSH 端口（大写 P）。
- `xxx.tar`：本地文件。
- `nieyuntao@js2.blockelite.cn:/home/nieyuntao/`：远程目标路径。

### 传整个文件夹

```bash
scp -P 25000 -r my_folder nieyuntao@js2.blockelite.cn:/home/nieyuntao/
```

- `-r`：递归传输整个目录。

### 传多个文件

**规律**：最后一个参数永远是目标地址，前面所有参数都是要传的源文件。

```bash
# 逐个列出
scp -P 25000 a.tar b.tar c.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 通配符匹配
scp -P 25000 *.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 多个通配符混用
scp -P 25000 *.tar *.log nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 具体文件 + 通配符混合
scp -P 25000 config.yaml *.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/
```

下载时同理，多个远程文件对调顺序即可：

```bash
scp -P 25000 nieyuntao@js2.blockelite.cn:/home/nieyuntao/a.tar \
               nieyuntao@js2.blockelite.cn:/home/nieyuntao/b.tar ./
```

### 指定私钥

```bash
scp -P 25000 -i ~/.ssh/my_key xxx.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/
```

## 参数拆解

```text
scp -P 25000 xxx.tar nieyuntao@js2.blockelite.cn:/目标路径/
│   │         │        │              │
│   │         │        │              └── 远程目标路径（绝对路径最稳）
│   │         │        └── 远程用户名和主机
│   │         └── 本地要传的文件
│   └── 端口（大写 P，容易写错！）
└── 安全复制命令
```

## 最容易踩的坑：端口大小写

| 命令 | 端口参数 | 含义 |
|---|---|---|
| `ssh` | `-p`（小写） | `ssh -p 25000 user@host` |
| `scp` | `-P`（大写） | `scp -P 25000 file user@host:/path` |

如果写 `scp -p 25000`（小写 p），`scp` 不会报端口错，而是把 `-p` 理解为"保留文件属性"，然后把 `25000` 当成一个文件名。**命令会静默失败或行为异常。**

## 从远程下载到本地

把上面的本地和远程对调即可：

```bash
scp -P 25000 nieyuntao@js2.blockelite.cn:/home/nieyuntao/xxx.tar ./
```

- 最后的 `./` 表示当前目录。

下载文件夹：

```bash
scp -P 25000 -r nieyuntao@js2.blockelite.cn:/home/nieyuntao/my_folder ./
```

## Windows CMD / PowerShell 用法

Windows 10+ 自带 OpenSSH 客户端，`scp` 命令可以直接在 CMD 或 PowerShell 中使用，语法和 Linux 完全一样。

```powershell
# PowerShell 或 CMD
scp -P 25000 D:\xxx.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/
```

注意 Windows 路径用反斜杠 `\`，但 `scp` 通常能自动处理。

## 常用扩展参数

```bash
# 限速传输（KB/s），避免占满带宽
scp -P 25000 -l 8192 large_file.tar nieyuntao@js2.blockelite.cn:/path/

# 压缩传输，小文件效果不明显，大文本日志效果好
scp -P 25000 -C xxx.tar nieyuntao@js2.blockelite.cn:/path/

# 显示传输进度
scp -P 25000 -v xxx.tar nieyuntao@js2.blockelite.cn:/path/
```

## rsync 替代方案（更强大）

`scp` 适合一次性传输。如果需要增量同步、断点续传，用 `rsync`：

```bash
# rsync 也用 -e 指定 SSH 端口
rsync -avz -e "ssh -p 25000" xxx.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 同步文件夹（增量，只传差异部分）
rsync -avz -e "ssh -p 25000" my_folder/ nieyuntao@js2.blockelite.cn:/home/nieyuntao/my_folder/
```

注意 `rsync` 的 SSH 端口通过 `-e "ssh -p 端口"` 指定，这里的 `ssh -p` 又是小写 `p`。

## 记忆方式

```text
SCP 大写 P，SSH 小写 p。
这两个东西故意反着来，专门坑人。
传文件用 scp -P 端口，登录用 ssh -p 端口。
```

最常用的四条命令：

```text
# 上传文件
scp -P 25000 xxx.tar nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 上传文件夹
scp -P 25000 -r my_folder nieyuntao@js2.blockelite.cn:/home/nieyuntao/

# 下载文件
scp -P 25000 nieyuntao@js2.blockelite.cn:/home/nieyuntao/xxx.tar ./

# 下载文件夹
scp -P 25000 -r nieyuntao@js2.blockelite.cn:/home/nieyuntao/my_folder ./
```

## 关联笔记

- `SSH 本地端口转发.md`：和本笔记同属 SSH 生态，一个解决"访问远程服务"，一个解决"传输文件"。
- `Linux 端口占用 进程排查和释放.md`

## 更新时间

- 2026-06-13：整理 SCP 文件传输命令、端口大小写坑、Windows 用法和 rsync 替代方案。
