# Git 协作与问题定位方法

> 来源：AI Infra 前置基础 → 第 9 章 Git 协作与问题定位方法
> 笔记类型：学习笔记
> 目标：从零开始，用完整示例讲清楚"贡献流程怎么走干净、工作区三层怎么看、merge/rebase 怎么选、问题怎么定位"
> 更新时间：2026-07-02
> 关联：`linux/Linux开发基本功_新人入门版.md`（命令行基础）、`ai-infra/环境隔离与GPU环境诊断.md`（问题定位链路）

---

## 一句话结论

Git 协作的核心是**原子提交**（一个 commit 只做一件事）和**提交前看清 diff**（同时看 `git diff` 和 `git diff --staged`）。问题定位的核心是**把"偶尔 OOM"变成"提交 abc123、batch 8、seq 4096、第 23 step 分配 1.2GiB 时 OOM"**——可复现的最小描述才是可执行的问题。

---

## 一、一条干净的贡献流程

### 1.1 完整端到端示例

从 clone 到提 PR，每一步都验证，不跳步：

```bash
# ========== 1. 克隆仓库 ==========
git clone https://github.com/owner/project.git
cd project
# clone 后默认在 main/master 分支，这是公共分支，不要直接在上面改

# ========== 2. 拉取最新代码（如果 clone 是几天前的事） ==========
git switch main            # 先切到主分支（git 2.23+ 用 switch，旧版用 checkout）
git pull --ff-only         # 拉取远程更新，--ff-only 禁止生成合并提交
# 如果报 "non-fast-forward"，说明本地 main 和远程分叉了，
# 本地 main 没有自己改的东西，直接 git reset --hard origin/main 重置

# ========== 3. 创建功能分支 ==========
git switch -c docs/improve-foundations
# -c = create，创建并切换到新分支
# 分支命名规范（团队约定俗成）：
#   docs/xxx    文档改动
#   feat/xxx    新功能
#   fix/xxx     bug 修复
#   refactor/xxx 重构
#   test/xxx    测试相关

# ========== 4. 修改文件 ==========
# ...用编辑器改代码...

# ========== 5. 验证：看清自己改了什么 ==========
git status --short
# 输出示例：
#  M README.md              ← M 在第二列 = 工作区改了，还没 add
#  M docs/foundations.md    ← 同上
# ?? notes.tmp.md           ← ?? = 未跟踪的新文件

git diff --check
# 检查有没有行尾空白、冲突标记残留，有问题会报出来
# 干净的话什么都不输出

git diff
# 看工作区相对暂存区的改动（还没 add 的改动）
# 逐行显示 +/-，提交前一定要过一遍

# ========== 6. 暂存（add） ==========
git add path/to/changed-file
# 只 add 目标文件，不要 git add .（会把无关的改动也带进去）

# add 后再看一次暂存区 vs HEAD 的 diff
git diff --staged
# 这是即将进入 commit 的内容，最后确认一次

# ========== 7. 提交 ==========
git commit -m "docs: expand programming foundations"
# commit message 规范（Conventional Commits）：
#   docs:     文档改动
#   feat:     新功能
#   fix:      bug 修复
#   refactor: 重构（不改功能）
#   test:     测试
#   chore:    杂项（构建配置、依赖升级等）
# 一行写不清就用多行：
git commit -m "feat: add AWQ quantization support" \
           -m "Add autoawq integration for 4-bit weight quantization. Reduces Qwen-14B memory from 28G to 10G."

# ========== 8. 推送到远程 ==========
git push -u origin docs/improve-foundations
# -u = --set-upstream，建立本地分支和远程分支的关联
# 之后直接 git push 就行，不用再写分支名

# ========== 9. 在 GitHub 上开 PR ==========
# 推送后终端会显示一个创建 PR 的链接，点击或用 gh 命令：
gh pr create --title "docs: expand programming foundations" \
             --body "Expand the programming foundations section with more examples."
```

### 1.2 原子提交：一个 commit 只做一件事

**反例（一个 commit 混了三件事）**：

```bash
git add -A
git commit -m "fix bug + format code + update deps"
# ❌ 问题：
#   1. review 时无法聚焦，不知道主要改了什么
#   2. 出问题想 revert 这个 commit，会把 deps 升级也一起回滚
#   3. git log 看不出这次提交的目的
```

**正例（拆成三个 commit）**：

```bash
# 第 1 个 commit：只改 bug
git add src/model.py
git commit -m "fix: handle empty batch in forward pass"

# 第 2 个 commit：只格式化
git add src/utils.py src/data.py
git commit -m "style: apply black formatting to utils and data"

# 第 3 个 commit：只升级依赖
git add requirements.txt
git commit -m "chore: bump torch to 2.3.1"
```

**判断标准**：如果 commit message 里出现了"和"、"同时"、"加号"，大概率该拆分。`git add -p`（交互式分块暂存）可以把一个文件的不同改动分到不同 commit。

### 1.3 `git add -p`：一个文件拆成多个 commit

```bash
git add -p model.py
# Git 会把 model.py 的改动分成多个 hunk（代码块），逐个问你：
#   y - 暂存这个 hunk
#   n - 不暂存
#   s - 把这个 hunk 拆得更小
#   q - 退出
#   e - 手动编辑这个 hunk
#
# 场景：你在 model.py 里同时改了 bug 和加了新功能，
#       用 git add -p 把 bug 修复的 hunk 选 y，新功能的选 n，
#       先 commit bug 修复，再 add 剩下的，commit 新功能
```

---

## 二、读懂工作区状态：三层模型

### 2.1 Git 的三层结构

```
┌─────────────────────────────────────────────────┐
│  HEAD（当前分支的最新提交）                       │
│  ┌───────────────────────────────────────┐      │
│  │ 提交 abc123：feat: add training        │      │
│  └───────────────────────────────────────┘      │
│           ↑ git commit                          │
│  ┌───────────────────────────────────────┐      │
│  │ 暂存区（Index）                         │      │
│  │  (git add 进来的内容)                  │      │
│  └───────────────────────────────────────┘      │
│           ↑ git add                             │
│  ┌───────────────────────────────────────┐      │
│  │ 工作区（Working Directory）            │      │
│  │  (你用编辑器实际改的文件)              │      │
│  └───────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

**核心记忆**：
- `git add` 把改动从**工作区**搬到**暂存区**
- `git commit` 把**暂存区**的内容固化成一个新提交，HEAD 前进一格
- 工作区和暂存区可以不一致，暂存区和 HEAD 也可以不一致——这就是为什么提交前要两个 diff 都看

### 2.2 两个 diff 命令对比的是哪两层

| 命令 | 对比的层 | 回答什么问题 |
|------|---------|-------------|
| `git diff` | 工作区 vs 暂存区 | "我改了但还没 add 的是什么？" |
| `git diff --staged`（或 `--cached`） | 暂存区 vs HEAD | "我 add 了但还没 commit 的是什么？" |
| `git diff HEAD` | 工作区 vs HEAD | "我所有改动（add 的和没 add 的）是什么？" |

### 2.3 完整示例：一个文件在三层之间的流转

```bash
# 初始状态：工作区、暂存区、HEAD 都是 "Hello"
echo "Hello" > greet.txt
git add greet.txt
git commit -m "add greet.txt"

# 第 1 步：改工作区，不 add
echo "Hello world" > greet.txt
git status --short
#  M greet.txt          ← M 在第二列：工作区改了，暂存区没变

git diff               # 工作区 vs 暂存区
# diff --git a/greet.txt b/greet.txt
# -Hello
# +Hello world

git diff --staged      # 暂存区 vs HEAD
# （空）← 暂存区和 HEAD 一致，没东西

# 第 2 步：add
git add greet.txt
git status --short
# M  greet.txt          ← M 在第一列：暂存区改了，工作区和暂存区一致

git diff               # 工作区 vs 暂存区
# （空）← 工作区和暂存区一致

git diff --staged      # 暂存区 vs HEAD
# -Hello
# +Hello world

# 第 3 步：再改工作区（add 之后又改了）
echo "Hello world!" > greet.txt    # 注意末尾加了感叹号
git status --short
# MM greet.txt          ← 两列都有 M：暂存区改了(第一列)，工作区又改了(第二列)

git diff               # 工作区 vs 暂存区
# -Hello world
# +Hello world!        ← 工作区比暂存区多了个感叹号

git diff --staged      # 暂存区 vs HEAD
# -Hello
# +Hello world         ← 暂存区是 "Hello world"（没感叹号）

# 提交前要把最新的改动也 add 进去，否则 commit 的是 "Hello world" 不是 "Hello world!"
git add greet.txt
git diff --staged      # 确认即将 commit 的是最终版本
# -Hello
# +Hello world!
git commit -m "update greet.txt"
```

**关键习惯**：提交前同时跑 `git diff` 和 `git diff --staged`。前者防止"改了忘了 add"，后者防止"add 的是旧版本"。

### 2.4 查看历史

```bash
git log --oneline --decorate -10
# --oneline     每个提交一行（短 hash + message）
# --decorate    显示分支/标签指向哪个提交
# -10           只看最近 10 条
# 输出：
# abc1234 (HEAD -> docs/improve, origin/docs/improve) docs: expand foundations
# def5678 (origin/main, main) feat: add training loop
# ghi9012 fix: handle empty batch
# ...

# 看某个文件的修改历史
git log --oneline -- README.md

# 看某次提交改了什么
git show abc1234

# 图形化看分支结构
git log --oneline --graph --all -20
# * abc1234 (HEAD) docs: expand foundations
# * def5678 feat: add training loop
# *   9012def Merge branch 'feat/x'
# |\
# | * 345678 feat: x
# * | 789abc feat: y
# |/
# * 111111 initial
```

---

## 三、合并、变基与冲突

### 3.1 merge vs rebase：两种整合方式

**场景**：功能分支 `feat/x` 从 `main` 分出来后，`main` 又有了新提交，现在要把 `feat/x` 的改动整合进 `main`。

```
初始状态：
          A---B---C feat/x
         /
    D---E---F---G main
```

**方式一：merge（保留两条历史，创建合并提交）**

```bash
git switch main
git merge feat/x
```

```
结果：
          A---B---C feat/x
         /         \
    D---E---F---G---H main
                   ↑
              合并提交 H（有两个父提交 C 和 G）
```

**方式二：rebase（把 feat/x 的提交重新播放到 main 顶端，历史线性）**

```bash
git switch feat/x
git rebase main          # 把 feat/x 的提交重新放到 main 顶端
git switch main
git merge --ff-only feat/x   # fast-forward 合并，不产生合并提交
```

```
结果：
    D---E---F---G---A'---B'---C' main
                   ↑
              A'B'C' 是 A B C 的"副本"（提交 ID 变了）
```

### 3.2 两种方式的对比

| 维度 | merge | rebase |
|------|-------|--------|
| 历史 | 保留分叉，有合并提交 | 线性，无合并提交 |
| 提交 ID | 不变 | **改变**（重新生成） |
| 冲突 | 一次性解决（合并提交时） | 可能在每个提交都冲突 |
| 适用 | 公共分支、想保留"何时合入"信息 | 个人功能分支、想要干净线性历史 |
| 风险 | 低（不改写历史） | 高（改写已推送的历史会搞乱别人） |

### 3.3 黄金法则：什么时候能 rebase

```
这个分支已经 push 到远程、有别人在用吗？
│
├─ 没有（个人功能分支，本地还没 push）
│  └─ → 可以 rebase（安全）
│
├─ 没有（push 了但是只有自己在用）
│  └─ → 可以 rebase，但要 force push（git push --force-with-lease）
│
└─ 有（公共分支，main/develop/团队共用的 feature 分支）
   └─ → 不要 rebase，用 merge
       rebase 会改写提交 ID，别人的本地分支会错乱
```

**`--force-with-lease` vs `--force`**：前者会检查远程分支有没有被别人更新过，更安全；后者无脑覆盖，可能冲掉别人的提交。

### 3.4 冲突解决：不是机械删标记

冲突时 Git 会在文件里留标记：

```
<<<<<<< HEAD
当前分支（你正在 rebase/merge 到的目标）的内容
=======
另一个分支的内容
>>>>>>> feat/x
```

**错误做法**：随便选一边删掉，或者两边都保留，不看语义。

**正确做法**：

```bash
# 1. 先看哪些文件冲突了
git status
# both modified:   src/model.py

# 2. 打开冲突文件，理解双方意图
# 比如 HEAD 改了函数签名加了个参数，feat/x 改了函数体加了个 if
# 正确解决 = 保留签名改动 + 保留函数体改动（两者不冲突的组合）

# 3. 手动编辑，删掉 <<<<<<< ======= >>>>>>> 标记，保留正确组合

# 4. 验证能跑通
python -m pytest tests/test_model.py

# 5. 标记冲突已解决
git add src/model.py

# 6. 继续
git rebase --continue   # 如果是 rebase
# 或
git commit              # 如果是 merge（会自动生成合并提交）
```

**冲突解决后必须跑测试**，因为你手动合并的代码可能有语法错误或逻辑不一致。不要 `--no-verify` 跳过 pre-commit hook。

### 3.5 中途想退出 rebase/merge

```bash
git rebase --abort      # rebase 冲突了不想继续，回到 rebase 前的状态
git merge --abort       # merge 同理
```

---

## 四、一个可复用的问题定位框架

### 4.1 六要素模板

原稿给的框架，展开成可填写的模板：

| 要素 | 说明 | 好例子 | 坏例子 |
|------|------|--------|--------|
| **期望行为** | 应该发生什么 | "batch=8 时训练应该正常跑完一个 epoch" | "应该不崩" |
| **实际行为** | 完整报错、退出码、错误输出 | "第 23 step 报 `CUDA out of memory. Tried to allocate 1.20GiB`，退出码 137" | "偶尔 OOM" |
| **最小复现** | 最短命令、最小输入 | `python train.py --batch-size 8 --seq-len 4096`，数据集用 wikitext-2 的前 1000 行 | "跑训练就崩" |
| **环境** | 代码提交、依赖版本、系统、硬件 | 提交 abc123、PyTorch 2.3.0+cu121、Python 3.11、Ubuntu 22.04、A10 24G、驱动 535.129 | "我的环境" |
| **边界定位** | 数据/Python/C++/CUDA/驱动/网络哪一层 | "显存够（nvidia-smi 显示 4G 空闲），PyTorch 层 OOM，怀疑是 attention 计算的中间张量没释放" | "不知道哪的问题" |
| **单变量实验** | 每次只改一项并记录结果 | "batch 8 → OOM；batch 4 → 不复现；batch 8 + seq 2048 → 不复现；batch 8 + seq 4096 + `torch.cuda.empty_cache()` → 仍 OOM" | "我改了好多东西还是不行" |

### 4.2 坏描述 vs 好描述

**坏描述（不可执行）**：

> 训练偶尔会 OOM，重启就好了，不知道为什么。

问题：没有提交、没有参数、没有报错原文、没有环境信息。别人无法复现，也无法判断方向。

**好描述（可执行）**：

> **期望**：batch=8、seq_len=4096 时训练应该能跑完一个 epoch（约 500 step）。
>
> **实际**：第 23 step 报 `torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.20GiB`，进程退出码 137（被 OOM Killer 杀）。
>
> **最小复现**：
> ```bash
> git checkout abc123
> python train.py --batch-size 8 --seq-len 4096 --dataset wikitext-2 --limit 1000
> # 第 23 step 必现
> ```
>
> **环境**：
> - 提交：abc1234（分支 feat/flash-attn）
> - PyTorch 2.3.0+cu121，Python 3.11，Ubuntu 22.04
> - GPU：单卡 A10 24G，驱动 535.129.03
> - nvidia-smi 训练前显存：22G 空闲
>
> **边界定位**：
> - 数据层：已排除（换成随机数据仍复现）
> - Python 层：怀疑是 attention 的中间张量没释放（`forward` 里有个 `attn_weights` 没 detach）
> - CUDA 层：显存确实不够，但是 22G 空闲应该够 batch=8
>
> **单变量实验记录**：
> | 实验 | 结果 |
> |------|------|
> | batch=8, seq=4096（原始） | 第 23 step OOM |
> | batch=4, seq=4096 | 跑完，不复现 |
> | batch=8, seq=2048 | 跑完，不复现 |
> | batch=8, seq=4096 + `torch.cuda.empty_cache()` 每个 step | 仍第 23 step OOM |
> | batch=8, seq=4096 + 注释掉 `return attn_weights` | 跑完，不复现 ← 定位到 |

最后一条实验直接定位到问题：`attn_weights` 被返回后保存在计算图里，导致显存不释放。这个描述让任何人都能复现、能验证、能判断修复是否有效。

### 4.3 定位框架的实际用法

**遇到问题时的固定动作**：

1. **先别改代码**，先记录上面六要素
2. **保留原始报错**，截图或复制完整 stderr，不要只记"大概报了个 OOM"
3. **找最小复现**：减少数据量、减少 batch、关掉分布式，直到找到"刚好能复现"的最小配置
4. **边界定位**：按 `数据 → Python → C++ → CUDA → 驱动 → 网络` 的顺序，逐层排除
5. **单变量实验**：一次只改一项，记录"改了什么 → 结果是什么"。不要同时改 batch、seq_len、优化器、学习率——出问题了不知道是哪个的锅

**为什么"偶尔"是最差的描述**：偶发性问题往往和"某个未记录的变量"有关（磁盘满、别的进程占 GPU、网络抖动、数据里有脏样本）。如果只记"偶尔"，这个隐藏变量永远找不到。按六要素记录，下一次复现时就能对比"这次和上次哪里不同"。

---

## 五、面试回答（可直接口述）

**问：git merge 和 git rebase 有什么区别？什么时候用哪个？**

答：merge 保留两条分支历史，创建一个合并提交，提交 ID 不变；rebase 把当前分支的提交"摘下来"重新放到目标分支顶端，历史变成线性，但提交 ID 会改变。选择标准是**黄金法则**：已经 push 到远程、有别人在用的公共分支不要 rebase（改写历史会让别人的本地分支错乱），用 merge；个人的、还没共享的功能分支可以 rebase，保持历史干净。rebase 后 push 需要 `--force-with-lease`（比 `--force` 安全，会检查远程有没有被别人更新过）。

**问：git diff 和 git diff --staged 有什么区别？**

答：它们对比的层不同。`git diff` 对比工作区和暂存区，显示"我改了但还没 add 的内容"；`git diff --staged` 对比暂存区和 HEAD，显示"我 add 了但还没 commit 的内容"。提交前应该两个都看：前者防止"改了忘了 add"，后者确认"即将 commit 的是最终版本"。

**问：怎么写一个好的 bug 报告？**

答：要包含六个要素：期望行为、实际行为（完整报错+退出码）、最小复现（最短命令+最小输入）、环境（代码提交+依赖版本+系统+硬件）、边界定位（哪一层的问题）、单变量实验记录。核心是把"偶尔 OOM"这种不可执行的描述，变成"提交 abc123、batch 8、seq 4096、第 23 step 分配 1.2GiB 时 OOM"这种可复现的描述。别人能复现，问题才能被解决。

---

## 六、深入追问

1. **`git pull` 和 `git pull --rebase` 有什么区别？**
   `git pull` 默认是 `git fetch` + `git merge`，会生成合并提交；`git pull --rebase` 是 `git fetch` + `git rebase`，历史线性。个人功能分支同步远程时用 `--rebase` 更干净；公共分支用默认 merge。

2. **`git reset` 的三个模式（--soft / --mixed / --hard）有什么区别？**
   - `--soft`：只移动 HEAD，暂存区和工作区不变（相当于"撤销 commit，改动还在暂存区"）
   - `--mixed`（默认）：移动 HEAD + 重置暂存区，工作区不变（"撤销 commit + add"）
   - `--hard`：移动 HEAD + 重置暂存区 + 重置工作区（彻底丢弃所有改动，不可恢复，危险）

3. **`git cherry-pick` 什么时候用？**
   当你只想把某个分支的**某一个提交**搬到当前分支，而不是整个分支合并时。比如 `feat/x` 分支上有 5 个提交，你只想要第 3 个 bug 修复，就 `git cherry-pick <那个提交的 hash>`。它会把这个提交的改动重新应用到当前分支，生成一个新提交。

4. **冲突标记里的 `|||||||` 是什么？**
   默认的冲突标记只有 `<<<<<<<` `=======` `>>>>>>>`。如果配置了 `merge.conflictStyle = diff3`，会多出 `|||||||` 段，显示**共同祖先**的内容，让你同时看到"原来的样子、我这边的改法、他那边的改法"，更容易判断正确组合。`git config --global merge.conflictStyle diff3` 开启。

5. **为什么说"提交原子性"很重要？**
   因为 commit 是 Git 里最小的可回滚/可 revert/可 cherry-pick/可 review 单位。一个 commit 混了三件事，想用 `git revert` 回滚 bug 修复时，会把 deps 升级和格式化也一起回滚；review 时也无法聚焦"这个 commit 到底想解决什么"。原子提交让历史可读、可回滚、可追溯。

---

## 七、易混淆点

| 易混淆 | 正解 |
|--------|------|
| `git switch` 和 `git checkout` | `switch` 是 Git 2.23+ 专门切分支的命令，`checkout` 历史更老还能恢复文件。新项目推荐用 `switch`/`restore` 替代 `checkout` 的分支和文件功能 |
| `git diff --staged` 和 `git diff --cached` | 完全等价，`--cached` 是旧名 |
| `git pull` 和 `git fetch` | `fetch` 只下载远程更新不合并，`pull` = `fetch` + `merge`（或 rebase）。想先看看远程有什么再决定怎么合并，用 `fetch` |
| `git merge --no-ff` 和 `git merge --ff-only` | `--no-ff` 强制生成合并提交（即使能 fast-forward）；`--ff-only` 只允许 fast-forward，不能就报错 |
| `--force` 和 `--force-with-lease` | `--force` 无脑覆盖远程；`--force-with-lease` 会检查远程分支有没有被别人更新过，更安全 |
| 暂存区和工作区"都改了"的 `MM` | `git status --short` 两列：第一列是暂存区 vs HEAD，第二列是工作区 vs 暂存区。`MM` = 暂存区改了，工作区又改了 |

---

## 八、复用判断（下次如何快速定位）

- **"我应该用 merge 还是 rebase"** → 分支已 push 且有别人在用？merge。个人分支？rebase。
- **"我改了代码但 commit 后没包含进去"** → 提交前没看 `git diff --staged`，add 的是旧版本，重新 add 再 commit
- **"冲突解决后跑不过测试"** → 解决冲突时没跑测试就 `--continue` 了，或者用了 `--no-verify` 跳过 hook
- **"rebase 后 push 被拒绝"** → rebase 改写了历史，需要 `git push --force-with-lease`
- **"bug 没法复现"** → 检查六要素里是不是漏了"隐藏变量"（磁盘空间、其他进程、数据脏样本、网络状态）
- **"偶尔出问题"** → 偶发性问题一定有未记录的变量，下次复现时按六要素记录，对比两次的差异

---

## 九、常用命令速查

| 场景 | 命令 |
|------|------|
| 看工作区改了什么 | `git diff` |
| 看暂存区改了什么 | `git diff --staged` |
| 看所有改动 | `git diff HEAD` |
| 看状态（简洁） | `git status --short` |
| 看最近 10 条提交 | `git log --oneline --decorate -10` |
| 看分支图 | `git log --oneline --graph --all -20` |
| 看某次提交改了什么 | `git show <hash>` |
| 交互式分块暂存 | `git add -p <file>` |
| 撤销工作区改动 | `git restore <file>`（旧版 `git checkout -- <file>`） |
| 撤销暂存（unstage） | `git restore --staged <file>` |
| 合并分支 | `git merge <branch>` |
| 变基 | `git rebase <branch>` |
| 继续 rebase | `git rebase --continue` |
| 放弃 rebase | `git rebase --abort` |
| cherry-pick | `git cherry-pick <hash>` |
| 强制推送（安全） | `git push --force-with-lease` |

---

## 十、关联笔记

- `linux/Linux开发基本功_新人入门版.md`（命令行基础、`set -euo pipefail`、退出码）
- `ai-infra/环境隔离与GPU环境诊断.md`（GPU 问题定位的固定链路，与本笔记的问题定位框架互补）
- `troubleshooting/`（具体排错案例）
- `技术工具学习索引.md`
