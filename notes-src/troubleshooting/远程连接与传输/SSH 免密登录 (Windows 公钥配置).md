# SSH 免密登录 — Windows 公钥配置到远程 Linux

> 更新：2026-06-20 | 触发：配置 Windows → Linux SSH 免密登录

## 一句话结论

在 Windows 上用 `ssh-keygen` 生成密钥对，把公钥追加到远程 Linux 的 `~/.ssh/authorized_keys`，之后 SSH 连接不再需要输入密码。

## 背景与现象

- 当时想做什么：从 Windows 终端 SSH 连接远程 Linux 服务器，不想每次都输密码。
- 出现了什么现象：每次 `ssh user@host` 都弹出密码提示。
- 相关环境：Windows 10/11（Git Bash 或 PowerShell），远程 Linux 已开启 SSH 服务。

## 原因分析

SSH 默认使用密码认证，每次连接都需要交互式输入。配置密钥认证后，客户端用私钥签名，服务端用公钥验证，无需密码。核心原理：私钥在你手上（不传输），公钥放在服务器上（可以公开），两者是一对匹配的密钥。

## 最终解决方法

### 步骤 1：Windows 上生成密钥对

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

一路回车，默认保存在 `C:\Users\你的用户名\.ssh\id_ed25519`（私钥）和 `id_ed25519.pub`（公钥）。

> 如果已有密钥（`~/.ssh/id_rsa` 或 `id_ed25519` 已存在），跳过此步。

### 步骤 2：把公钥复制到远程 Linux

**推荐方法（Git Bash）：**

```bash
ssh-copy-id username@linux_ip
```

输入一次密码即完成。

> **非标端口**（如 25500）：`ssh-copy-id -p 25500 username@host`，否则默认走 22 端口会失败。

**备选方法（PowerShell 也适用）：**

```bash
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh username@linux_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**纯手动方法（任何终端）：**

1. 查看公钥内容：`cat ~/.ssh/id_ed25519.pub`
2. SSH 登录 Linux：`ssh username@linux_ip`
3. 在 Linux 上执行：
   ```bash
   mkdir -p ~/.ssh
   echo "粘贴完整公钥内容" >> ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### 步骤 3：验证

```bash
ssh username@linux_ip
```

不再提示密码即为成功。

### 附加技巧：多端口主机用 SSH Config 简化

同一主机开多个 SSH 端口时，写 `~/.ssh/config` 避免每次记端口号：

```
Host myserver-25000
    HostName js2.blockelite.cn
    Port 25000
    User nieyuntao

Host myserver-25500
    HostName js2.blockelite.cn
    Port 25500
    User nieyuntao
```

之后直接 `ssh myserver-25000` / `ssh myserver-25500`，免密也一并生效。

## 排查过程/踩坑记录

- **仍要求密码**：最常原因是权限问题。Linux 端必须：
  - `~/.ssh` 目录权限为 `700`（`chmod 700 ~/.ssh`）
  - `~/.ssh/authorized_keys` 权限为 `600`（`chmod 600 ~/.ssh/authorized_keys`）
- **`ssh-copy-id` 不可用**：Windows CMD 和 PowerShell 默认不带这个命令，使用 Git Bash 或上述备选方法。
- **公钥格式不对**：确保复制的是完整一行（以 `ssh-ed25519` 开头），不要有换行。
- **SELinux 阻断**：某些 Linux 发行版如果开启了 SELinux，需执行 `restorecon -R ~/.ssh`。

## 类似问题如何判断

- 共同点：任何需要 SSH 免密登录的场景（Git、SCP、rsync、Ansible 等）都适用。
- 区别点：如果是从 Linux → Linux 配置，命令完全一样，只是密钥路径在 `~/.ssh/`。
- 下次优先检查：密钥是否已生成 → 公钥是否正确拷贝到服务器 → 服务器端权限是否正确。

## 相关链接或关联笔记

- [SSH 本地端口转发](./SSH%20本地端口转发.md)
- [SCP 文件传输到远程服务器](./SCP%20文件传输到远程服务器.md)
