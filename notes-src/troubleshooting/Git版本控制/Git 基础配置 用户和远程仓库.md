# Git 基础配置：用户信息和远程仓库

## 一句话结论

`git config` 配置用户名和邮箱（`--global` 全局生效，不加则只对当前仓库生效）；`git remote add` 关联远程仓库，`git remote -v` 查看已关联的远程地址；`git branch` 查看本地分支，`git branch --show-current` 只看当前分支名。

---

## 背景与场景

第一次使用 Git 或在新机器上使用 Git 时，需要：
1. 告诉 Git "你是谁"——配置用户名和邮箱，这样每次 commit 才知道是谁提交的。
2. 让本地仓库知道"代码推到哪"——配置远程仓库地址（如 GitHub、Gitee、GitLab 等）。

---

## 核心概念

| 概念 | 解释 | 类比 |
|------|------|------|
| `git config` | 修改 Git 的配置项，可以是全局的（`--global`），也可以是只针对当前仓库的 | 相当于给 Git 这个工具填"个人档案" |
| `--global` | 全局生效，对所有仓库都起作用 | 写到 `~/.gitconfig` 里，一次配置，到处生效 |
| `--local` | 只对当前仓库生效（默认行为） | 写到当前仓库的 `.git/config` 里 |
| `git remote` | 管理"远程仓库"的关联关系 | 告诉本地仓库：你的远程"老家"在哪个 URL |
| `origin` | 远程仓库的默认别名（约定俗成） | 相当于给远程地址起个短名字，之后 `git push origin main` 就不用每次写完整 URL |

---

## 动手实践

### 1. 配置用户名和邮箱

#### 全局配置（推荐，一次配置所有仓库生效）

```bash
# 设置全局用户名
git config --global user.name "Your Name"

# 设置全局邮箱
git config --global user.email "your.email@example.com"
```

#### 只对当前仓库配置（不加 --global）

```bash
# 进入某个仓库目录后
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

#### 查看当前配置

```bash
# 查看所有配置
git config --list

# 只查看用户名
git config user.name

# 只查看邮箱
git config user.email

# 查看全局配置
git config --global --list
```

#### 运行结果示例

```
$ git config --global user.name "lenck"
$ git config --global user.email "lenck@example.com"
$ git config user.name
lenck
$ git config user.email
lenck@example.com
```

### 2. 配置远程仓库

#### 关联远程仓库（add）

```bash
# 给本地仓库添加一个远程仓库，别名叫 origin
git remote add origin https://github.com/username/repo.git

# 或者用 SSH 地址（推荐，配置 SSH key 后不用每次输密码）
git remote add origin git@github.com:username/repo.git
```

#### 查看已关联的远程仓库

```bash
# 查看远程仓库名称和地址
git remote -v
```

运行结果示例：

```
origin  git@github.com:username/repo.git (fetch)
origin  git@github.com:username/repo.git (push)
```

#### 修改远程仓库地址

```bash
# 方式一：直接改 URL
git remote set-url origin git@github.com:username/new-repo.git

# 方式二：删了重新加
git remote remove origin
git remote add origin git@github.com:username/new-repo.git
```

#### 删除远程仓库关联

```bash
git remote remove origin
```

#### 查看远程仓库详细信息

```bash
git remote show origin
```

### 3. 查看和管理分支

#### 查看当前所在分支

```bash
# 列出所有本地分支，当前分支前面带 *
git branch

# 只看当前分支名（一行输出）
git branch --show-current

# 查看本地 + 远程所有分支
git branch -a

# 看当前状态，第一行就是 "On branch xxx"
git status
```

#### 运行结果示例

```
$ git branch
  dev
* main
  feature-login

$ git branch --show-current
main

$ git status
On branch main
nothing to commit, working tree clean
```

#### 创建和切换分支

```bash
# 新建分支（但不切换过去）
git branch feature-xxx

# 新建并切换到该分支
git checkout -b feature-xxx

# 或者用新版命令（Git 2.23+）
git switch -c feature-xxx

# 切换已有分支
git checkout dev
git switch dev
```

#### 删除分支

```bash
# 删除已合并的本地分支
git branch -d feature-xxx

# 强制删除（不管有没有合并）
git branch -D feature-xxx
```

---

## 完整工作流示例

从头创建一个项目并关联远程仓库：

```bash
# 1. 初始化本地仓库
git init

# 2. 配置用户信息（如果还没配过全局的）
git config user.name "lenck"
git config user.email "lenck@example.com"

# 3. 添加文件并提交
git add .
git commit -m "first commit"

# 4. 关联远程仓库
git remote add origin git@github.com:username/repo.git

# 5. 推送到远程（首次推送需要 -u 设置上游分支）
git push -u origin main
```

---

## 踩坑记录

### 问题 1：`git push` 报 `fatal: No configured push destination`

**现象**：
```
fatal: No configured push destination.
Either specify the URL from the command-line or configure a remote repository
```

**原因**：当前仓库没有配置 remote，Git 不知道该往哪推。

**解决**：`git remote add origin <仓库地址>`，然后再 push。

### 问题 2：`git push` 报 `Permission denied (publickey)`

**现象**：
```
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

**原因**：用 SSH 地址但没有配置 SSH Key，或者 Key 没加到 GitHub/GitLab 上。

**解决**：
- 检查本机是否有 SSH Key：`ls ~/.ssh/id_rsa.pub`
- 没有就生成：`ssh-keygen -t rsa -b 4096 -C "your.email@example.com"`
- 把公钥 `~/.ssh/id_rsa.pub` 内容加到 GitHub/GitLab 的 SSH Keys 设置里
- 测试连接：`ssh -T git@github.com`

### 问题 3：`git remote add` 报 `fatal: remote origin already exists`

**现象**：
```
fatal: remote origin already exists.
```

**原因**：已经有一个叫 `origin` 的远程仓库了。

**解决**：
```bash
# 要么修改已有的
git remote set-url origin <新地址>

# 要么改名或用别的别名
git remote rename origin old-origin
git remote add origin <新地址>
```

### 问题 4：跨服务器复制项目后 Git 报 `Permission denied`

**现象**：
```
fatal: Unable to create '.git/index.lock': Permission denied
```
任何 Git 命令（`git status` / `git branch` / `git log` 等）都报类似权限拒绝。

**原因**：从另一台服务器直接复制了整个项目（含 `.git/`），文件归属人（owner）还是旧服务器的用户，新服务器上当前用户无权限读写 `.git/` 下的文件。

**解决**：
```bash
# 把 .git 目录的归属权改成当前用户
sudo chown -R $(whoami):$(whoami) .git/

# 顺手把整个项目目录也改过来
sudo chown -R $(whoami):$(whoami) .
```

**更好的做法（避免这个问题）**：迁移项目时不要直接复制 `.git/`，而是在新服务器上 `git clone`，只把工作文件和未跟踪的文件复制过去。

---

## 类似问题判断

下次遇到 Git 配置相关问题时，优先检查：

1. **用户配置**：`git config user.name` / `git config user.email` 有没有输出
2. **远程仓库**：`git remote -v` 是否显示正确的地址
3. **SSH Key**：如果用 SSH 地址，`ssh -T git@github.com` 是否成功
4. **配置文件位置**：全局配置在 `~/.gitconfig`，仓库级配置在 `.git/config`
