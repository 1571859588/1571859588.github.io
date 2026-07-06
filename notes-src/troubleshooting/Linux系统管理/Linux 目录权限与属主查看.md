# Linux 目录权限与属主查看：怎么知道一个目录我能不能写

> 更新时间：2026-06-28

## 一句话结论

用 `ls -ld 目录路径` 一眼看清目录的权限、属主、属组；用 `stat 目录路径` 看更详细的信息；用 `[ -w 目录路径 ] && echo "可写"` 快速判断当前用户有没有写权限。

## 背景与现象

- 当时想做什么：在 Linux 服务器上操作某个目录（写入文件、创建子目录、修改配置），不确定自己有没有权限。
- 出现了什么现象：执行 `mkdir` 或 `touch` 时报 `Permission denied`，或者根本不知道这个目录归谁管。
- 相关环境：任何 Linux / macOS / WSL 终端。

## 原因分析

Linux 的每个文件和目录都有三个维度的权限控制：

```
属主（owner）  —— 这个文件/目录"属于谁"
属组（group）  —— 这个文件/目录"属于哪个组"
其他人（others）—— 除上面两类以外的所有人
```

每个维度各有三个权限位：`r`（读）、`w`（写）、`x`（执行）。对于目录来说：

| 权限 | 对目录的含义 |
|------|-------------|
| `r` | 能 `ls` 看到目录里有什么文件 |
| `w` | 能在目录里创建、删除、重命名文件（必须同时有 `x`） |
| `x` | 能 `cd` 进入这个目录 |

## 最终解决方法

### 方法一：`ls -ld` —— 最常用，一眼看清

```bash
ls -ld /var/log
# 输出示例：
# drwxr-xr-x 12 root syslog 4096 Jun 28 10:00 /var/log
```

逐个拆解这行输出：

```
d  rwx  r-x  r-x   12  root  syslog  4096  Jun 28 10:00  /var/log
│  ───  ───  ───        ────  ──────
│   │    │    │          │      │
│   │    │    │          │      └── 属组：syslog 组
│   │    │    │          └── 属主：root 用户
│   │    │    └── 其他人（others）权限：r-x（可读可进入，不可写）
│   │    └── 属组（group）权限：r-x
│   └── 属主（owner）权限：rwx（可读可写可进入）
└── d 表示目录（如果是 - 表示普通文件，l 表示软链接）
```

**怎么判断"我"能不能写？**

1. 先看自己是谁：`whoami` → 比如输出 `lenck`
2. 看自己属于哪些组：`groups` → 比如输出 `lenck sudo docker`
3. 对照权限位：
   - 如果 `whoami` 的结果 == 属主（root）→ 看第一组权限（`rwx`）
   - 如果 `groups` 的结果包含属组（syslog）→ 看第二组权限（`r-x`）
   - 都不是 → 看第三组权限（`r-x`）

在上面的例子中，如果你的用户不是 root、也不在 syslog 组，那你看到的权限是 `r-x`——**不能写**。

### 方法二：`stat` —— 看更详细的信息

```bash
stat /var/log
# 输出示例：
#   File: /var/log
#   Size: 4096       Blocks: 8         IO Block: 4096   directory
# Device: 8,1    Inode: 524289      Links: 12
# Access: (0755/drwxr-xr-x)  Uid: (    0/    root)   Gid: (  106/  syslog)
# Access: 2026-06-28 10:00:00.000000000 +0800
# Modify: 2026-06-28 10:00:00.000000000 +0800
# Change: 2026-06-28 10:00:00.000000000 +0800
```

关键看 `Access: (0755/drwxr-xr-x)` 和 `Uid/Gid` 这几行。`0755` 是权限的八进制表示：

| 数字 | 权限 | 含义 |
|------|------|------|
| 7 | rwx | 读+写+执行（4+2+1） |
| 6 | rw- | 读+写 |
| 5 | r-x | 读+执行 |
| 4 | r-- | 只读 |
| 0 | --- | 无权限 |

所以 `0755` = 属主 7(rwx) + 属组 5(r-x) + 其他人 5(r-x)。

### 方法三：直接测试——最快判断能不能写

不想分析权限位的话，直接测：

```bash
# 方式一：用 test 命令
[ -w /var/log ] && echo "可写" || echo "不可写"

# 方式二：用 touch 试试
touch /var/log/testfile 2>/dev/null && echo "可写" && rm /var/log/testfile || echo "不可写"
```

### 发现不可写之后怎么办？

```bash
# 改属主（把目录给你自己）
sudo chown $USER:$USER /path/to/dir

# 改权限（给属主加写权限）
sudo chmod u+w /path/to/dir

# 改属组（加到你的组里）
sudo chgrp $USER /path/to/dir

# 递归修改（对整个目录及其子文件生效）
sudo chown -R $USER:$USER /path/to/dir
sudo chmod -R 755 /path/to/dir
```

## 排查过程/踩坑记录

- **常见坑 1**：目录权限有 `w` 但还是不能写入 → 检查父目录是否有 `x` 权限。Linux 要求从根目录到目标目录的整条路径都有 `x` 权限才能访问。可以用 `namei -l /path/to/dir` 查看路径上每一层的权限。

- **常见坑 2**：`ls -l` 看到的是 `rwxrwxrwx`（777）但还是 Permission denied → 可能是 SELinux（CentOS/RHEL）或 AppArmor（Ubuntu）的强制访问控制在拦截。用 `getenforce` 检查 SELinux 状态，或 `aa-status` 检查 AppArmor。

- **常见坑 3**：通过 NFS / SMB 挂载的网络目录，权限看的是服务端的设置，本地 `ls -l` 显示的权限可能不准确。

## 类似问题如何判断

- 共同点：所有"Permission denied"问题都可以用 `ls -ld` + `whoami` + `groups` 三板斧定位。
- 区别点：如果是单个文件报权限错误，用 `ls -l`（不加 d）；如果是目录，用 `ls -ld`；如果是操作路径中的某个中间目录，用 `namei -l`。
- 下次优先检查：先 `whoami` 确认身份，再 `ls -ld` 看权限位，最后 `namei -l` 查整条路径。

## 相关链接或关联笔记

- [Linux 安装和配置 Zsh 终端](./Linux%20安装和配置%20Zsh%20终端.md)
- [grep 和 find 查内容与文件名](./grep%20和%20find%20查内容与文件名.md)
