# Linux 开发基本功（新人入门版）

> 来源：AI Infra 前置基础 → 第 7 章 Linux 开发基本功
> 目标：从零开始，用完整示例讲清楚每个命令"能干什么、怎么用、为什么这么用"
> 更新时间：2026-07-01

---

## 一句话结论

Linux 开发的核心不是背命令，而是建立**"问题 → 命令 → 输出 → 判断"**的诊断习惯。先看输出再行动，不要盲目重装。

---

## 一、文件与目录操作

### 1.1 最基本的导航命令

```bash
# ========== 1. 我在哪？==========
pwd
# 输出：/home/lxy/projects/train
# pwd = Print Working Directory，打印当前所在目录的绝对路径

# ========== 2. 这个目录里有什么？==========
ls
# 只列出文件名

ls -l
# -l = long format，显示详细信息：
# -rw-r--r--  1 lxy staff  1234 Jun 28 14:00 config.yaml
# │└──┘└──┘ │  │   │      │    │            │
# │ 权限  │  │   │      │    │          文件名
# │      所有者 所属组  │    │         修改时间
# 类型              大小  修改时间

ls -la
# -a = all，包括隐藏文件（以 . 开头的文件）
# 常见隐藏文件：.bashrc、.gitignore、.env

ls -lah
# -h = human-readable，文件大小用 KB/MB/GB 显示
# 不加 -h：12345678（字节），加了 -h：12M

ls -lah /tmp/
# 也可以指定目录：查看 /tmp/ 下有什么

# ========== 3. 切换目录 ==========
cd /home/lxy/projects    # 切到绝对路径
cd ..                    # 切到上一级目录
cd ~                     # 切到用户主目录（~ = /home/lxy）
cd -                     # 切回上一次所在的目录
cd projects/train        # 相对路径：从当前目录进入 projects/train

# ========== 4. 创建目录 ==========
mkdir logs               # 创建一个目录
mkdir -p runs/exp01/logs  # -p = parents，递归创建多层目录
# 如果 runs/ 不存在，先创建 runs/，再创建 runs/exp01/，再创建 runs/exp01/logs/
# 不加 -p 且父目录不存在会报错

# ========== 5. 复制文件/目录 ==========
cp config.yaml config_backup.yaml     # 复制文件
cp -a configs/ configs_backup/        # -a = archive，递归复制目录并保留属性
# 不加 -a 或 -r 复制目录会报错

# ========== 6. 移动/重命名 ==========
mv old_name.yaml new_name.yaml        # 重命名
mv config.yaml configs/               # 移动到另一个目录

# ========== 7. 删除 ==========
rm config.yaml                        # 删除文件（不可恢复！）
rm -i config.yaml                     # -i = interactive，删除前确认
rm -r logs/                           # -r = recursive，删除目录及其内容
# ⚠️ rm -rf / 是最危险的命令之一，绝对不要执行！
```

### 1.2 查找文件

```bash
# ========== find：按条件查找文件 ==========
find . -name "*.py"                    # 在当前目录下找所有 .py 文件
find /home/lxy -name "train*.py"       # 在指定目录下查找
find . -name "*.log" -type f           # 只找普通文件（不包括目录）
find . -name "__pycache__" -type d     # 只找目录
find . -name "*.py" -mtime -1          # 最近 1 天内修改过的 .py 文件
find . -name "*.py" -size +1M          # 大于 1MB 的 .py 文件

# ========== rg (ripgrep)：在文件内容中搜索 ==========
# rg 比 grep 快得多，默认递归搜索
rg "CUDA error" logs/                  # 在 logs/ 目录搜索包含 "CUDA error" 的行
rg "loss=" train.log                   # 在单个文件中搜索
rg -i "error" logs/                    # -i 忽略大小写
rg "import torch" --type py            # 只搜索 .py 文件
rg "def train" -n src/                 # -n 显示行号
rg "TODO|FIXME" src/                   # 搜索多个关键词（正则表达式）

# ========== 实际场景：找到出错的训练日志 ==========
# 场景：训练崩了，想找到哪个日志文件有错误信息
rg -l "CUDA error|out of memory|RuntimeError" runs/
# -l = files with matches，只显示文件名，不显示匹配内容
# 找到文件后再用 rg 看具体内容
rg "CUDA error" runs/exp01/train.log -C 3
# -C 3 = context，显示匹配行的前后各 3 行
```

### 1.3 文本流与管道

```bash
# ========== 标准输入/输出/错误 ==========
# 每个进程有三个标准流：
#   stdin  (标准输入，文件描述符 0)  → 默认来自键盘
#   stdout (标准输出，文件描述符 1)  → 默认输出到屏幕
#   stderr (标准错误，文件描述符 2)  → 默认输出到屏幕

# ========== 重定向 ==========
python train.py > train.log
# > 把 stdout 写入 train.log（覆盖已有内容）

python train.py >> train.log
# >> 追加到 train.log 末尾

python train.py > train.log 2> train.err
# stdout → train.log, stderr → train.err（分别重定向）

python train.py > train.all.log 2>&1
# 2>&1 = 把 stderr 重定向到 stdout 所指的地方
# 即 stdout 和 stderr 都写入 train.all.log

python train.py 2>/dev/null
# /dev/null = "黑洞"，把 stderr 丢弃（不想看到错误信息时用）

# ========== 管道：把前一个命令的输出作为后一个命令的输入 ==========
cat train.log | grep "loss="          # cat 输出文件内容，grep 过滤含 "loss=" 的行
rg "loss=" train.log | tail -n 20     # 显示最后 20 行含 "loss=" 的行
rg "loss=" train.log | head -n 10     # 显示前 10 行

# 管道的工作原理：
# cat train.log 的 stdout → 管道 → grep "loss=" 的 stdin
# 两个命令同时运行，grep 实时处理 cat 的输出

# ========== 常用组合 ==========
# 统计训练日志中有多少行包含 "epoch"
rg "epoch" train.log | wc -l          # wc -l = 统计行数

# 找出 loss 最小的几行（假设格式 "epoch=5, loss=0.123"）
rg "loss=" train.log | sort -t= -k3 -n | head -5
# sort -t= : 用 = 作为分隔符
# -k3      : 按第 3 个字段排序（loss 的值）
# -n       : 按数值排序（不是字典序）

# 查看训练进度（实时跟踪日志）
tail -f train.log                     # -f = follow，持续输出新追加的内容
# 按 Ctrl+C 退出

# ========== 工程实践：什么时候该写成脚本 ==========
# 管道适合"一次性、临时"的数据处理：
rg "loss=" train.log | sort -t= -k3 -n | head -5     # 临时看看，OK

# 但只要满足下面任一条，就别再拼管道了，写成 .sh 脚本并 git 纳管：
# 1. 同一段命令你会跑第二次以上（比如每次训练后都要统计）
# 2. 超过 3 段管道，或者用了 awk/sed 这种容易写错的工具
# 3. 涉及条件分支、循环、错误处理
# 4. 别人也要用（同事、未来的你）
#
# 脚本化好处：可复现、可 diff、可 review、出问题能 git blame
# 管道拼得再巧，下次自己都忘了当时怎么拼的

# 把上面那段"找 loss 最小的 5 行"固化成脚本：
cat > best_loss.sh << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
LOG="${1:?用法: ./best_loss.sh <train.log>}"
rg "loss=" "$LOG" | sort -t= -k3 -n | head -5
EOF
chmod +x best_loss.sh
./best_loss.sh train.log
# 之后任何人一行命令就能复现，还能 git 跟踪改动

# ========== 这段脚本里很多新写法，逐行拆解 ==========

# ① cat > best_loss.sh << 'EOF'  ...  EOF   —— 叫 "heredoc"（Here Document）
#    作用：把两个 EOF 之间的所有内容原样写入 best_loss.sh 文件
#    cat > best_loss.sh : 把内容重定向写入 best_loss.sh（> 覆盖，>> 追加）
#    << 'EOF'           : 开始一个 heredoc，遇到单独一行 EOF 就结束
#    'EOF' 加单引号     : 里面的 $ 变量不会被展开，原样写入文件
#                         （如果写成 << EOF 不加引号，$LOG 会被当时 Shell 展开）
#    EOF 只是一个约定标记，写成 << 'END' ... END 也行，只要首尾一致

# ② #!/usr/bin/env bash   —— 这叫 "shebang"（详见 2.4 节详细解释）
#    告诉系统：执行这个文件时，用 env 找到的 bash 来运行
#    没有这行，./best_loss.sh 可能会用 sh（功能更弱的 Shell），set -euo pipefail 可能报错

# ③ set -euo pipefail     —— 脚本安全三件套（2.4 节有详细解释）
#    -e         任何命令失败就立即退出
#    -u         用未定义变量报错
#    -o pipefail 管道中任一命令失败，整条管道算失败

# ④ LOG="${1:?用法: ./best_loss.sh <train.log>}"   —— 这就是"接收 train.log"的地方！
#    $1         脚本的第一个参数。运行 ./best_loss.sh train.log 时，$1 就是 "train.log"
#    ${1:?...}  参数扩展语法：如果 $1 为空（没传参数），就打印 ? 后面的提示并退出
#               这样能防止用户忘记传参数，比直接用 $1 友好
#    整行含义：把第一个参数赋值给变量 LOG；如果没传，提示用法并退出
#
#    所以 "为什么传入 train.log 在哪里有接收" 的答案是：
#    命令行传入的 train.log → 被 $1 接住 → 赋值给 LOG → 后面用 "$LOG" 引用

# ⑤ rg "loss=" "$LOG"     —— 用双引号包住 $LOG，防止文件名带空格时出错（见 2.1 节）

# ⑥ chmod +x best_loss.sh —— 给脚本加可执行权限（见 3.2 节）
#    没有这一步，./best_loss.sh 会报 "Permission denied"
#    也可以用 chmod 755 best_loss.sh

# ⑦ ./best_loss.sh train.log  —— ./ 表示"当前目录下"，必须加
#    如果只写 best_loss.sh，Shell 只会在 PATH 里找，不会找当前目录
#
#    完整执行流程：
#    ./best_loss.sh train.log
#       ↓
#    系统读到第一行 #!/usr/bin/env bash → 用 bash 解释执行
#       ↓
#    bash 执行 set -euo pipefail
#       ↓
#    bash 执行 LOG="${1:?...}" → $1 接住 "train.log" → LOG=train.log
#       ↓
#    bash 执行 rg "loss=" "train.log" | sort ... | head -5
#       ↓
#    输出 loss 最小的 5 行

# ========== 参数扩展语法速查（${...} 家族） ==========
# ${1:-默认值}     参数为空时用默认值（2.4 节的 DATA_DIR="${1:-./data}" 用的就是这个）
# ${1:?提示}       参数为空时报错并退出（本脚本用的）
# ${1:+替代值}     参数非空时用替代值
# ${var:-默认值}   变量为空时用默认值
# ${var:=默认值}   变量为空时赋默认值并使用
# ${var%后缀}      去掉最短后缀  ${var%%后缀} 去掉最长后缀
# ${var#前缀}      去掉最短前缀  ${var##前缀} 去掉最长前缀
# 记不住没关系，遇到 ${1:?...} 和 ${1:-...} 知道是"参数检查/默认值"即可

# ========== ${var:-默认值} 和 ${var:=默认值} 的区别（新手高频疑问）==========
# 两者"取值结果"一样：变量为空时都用默认值
# 区别在于"是否把默认值【写回】变量"：
#
# ${var:-默认值}   只【用】默认值，不改 var 本身
#   var=""                # var 是空
#   echo ${var:-hello}    # 输出 hello（用了默认值）
#   echo $var             # 输出空（var 还是空，没被改）
#
# ${var:=默认值}   用默认值，并且【把默认值赋给 var】
#   var=""                # var 是空
#   echo ${var:=hello}    # 输出 hello（用了默认值）
#   echo $var             # 输出 hello（var 被改成 hello 了！）
#
# 什么时候用 := ？
#   后面还要多次用这个变量，不想每次都写 ${var:-默认值}，就一次性赋上：
#   : ${CONFIG:=${1:-./default.yaml}}   # 一行搞定：CONFIG 为空就用 $1，$1 也空就用 ./default.yaml
#   （开头的 : 是空命令，配合 := 实现"只为赋值，不输出"）
#
# 速记：
#   :-   只借不还（用一下默认值，变量不变）
#   :=   借了就还（用默认值，还顺手把变量改了）

# ========== 前缀/后缀删除的用途和用法（新手高频疑问）==========
# ${var%后缀}  和 ${var#前缀} 是"字符串裁剪"工具，处理文件名/路径时极常用
# 记忆窍门：
#   # 在键盘 $ 右边（前）→ 删【前缀】
#   % 在 # 右边（后）   → 删【后缀】
#   一个符号 = 删最短   两个符号 = 删最长

# 示例 1：去掉文件扩展名
file="model_v1.pth"
echo ${file%.pth}          # 输出 model_v1（删后缀 .pth，最短匹配）
echo ${file%.*}            # 输出 model_v1（%.* 删最后一个点和后面的，最短）
echo ${file%%.*}           # 输出 model_v1（%%.* 删第一个点和后面的，最长 → 这里结果一样）

# 示例 2：区别最短 vs 最长（文件名带多个点时才看得出区别）
file="train.2024.06.28.log"
echo ${file%.*}            # 输出 train.2024.06.28（删最后的 .log，最短后缀）
echo ${file%%.*}           # 输出 train（删第一个点之后的所有，最长后缀）

# 示例 3：去掉路径前缀，只留文件名
path="/data/exp/run.sh"
echo ${path##*/}           # 输出 run.sh（##*/ 删最后一个 / 前的所有，最长前缀）
echo ${path#*/}            # 输出 data/exp/run.sh（#*/ 删第一个 / 前(空)的所有，最短前缀 → 几乎没删）

# 示例 4：去掉文件名，只留目录
path="/data/exp/run.sh"
echo ${path%/*}            # 输出 /data/exp（删最后的 /run.sh，最短后缀）
dirname "$path"            # 等价写法，输出 /data/exp

# 示例 5：批量改文件名（实际场景）
for f in *.txt; do
    mv "$f" "${f%.txt}.md"   # 把所有 .txt 改成 .md
done

# 速记表：
#   ${var#pattern}   删最短前缀   ${var##pattern}  删最长前缀
#   ${var%pattern}    删最短后缀   ${var%%pattern}  删最长后缀
#   pattern 支持 * 通配（* 表示"任意字符"），不是正则

# ========== 多个传入参数怎么写？==========
# 脚本可以有多个参数，按位置引用：$1 $2 $3 ... ${10} ${11}
# 注意：第 10 个及以后必须用花括号 ${10}，否则 $10 会被当成 $1 后面跟 0
#
# 示例脚本 demo_args.sh：
#   #!/usr/bin/env bash
#   set -euo pipefail
#   DATA_DIR="${1:?用法: $0 <data_dir> <epochs> <batch_size>}"
#   EPOCHS="${2:-10}"          # 第 2 个参数，默认 10
#   BATCH="${3:-32}"           # 第 3 个参数，默认 32
#   echo "data=$DATA_DIR epochs=$EPOCHS batch=$BATCH"
#
# 运行方式：
#   ./demo_args.sh /data 50 64    → data=/data epochs=50 batch=64
#   ./demo_args.sh /data          → data=/data epochs=10 batch=32（后两个用默认）
#   ./demo_args.sh                → 报错退出（$1 必填，没传就退出）
#
# 其他参数相关变量：
#   $0       脚本名本身（如 ./demo_args.sh）
#   $#       参数个数
#   $@       所有参数（每个独立，循环用 for x in "$@"）
#   $*       所有参数（拼成一个字符串）
#   shift    把 $2 变成 $1，$3 变成 $2...（处理可选参数时常用）
#
# 处理"带名字的可选参数"（如 --epochs 50 --batch 64）用 while + case：
#   while [ $# -gt 0 ]; do
#       case "$1" in
#           --epochs) EPOCHS="$2"; shift 2;;
#           --batch)  BATCH="$2";  shift 2;;
#           *) DATA_DIR="$1"; shift;;
#       esac
#   done
#
# ========== shift 是什么？shift 2 和 shift 有什么区别？（新手高频疑问）==========
# shift 命令：把所有参数【向左移位】，丢弃最左边的若干个
#   shift   等同 shift 1，丢弃 1 个：$1 没了，原 $2 变成新 $1，原 $3 变成新 $2...
#   shift 2 丢弃 2 个：原 $1、$2 都没了，原 $3 变成新 $1，原 $4 变成新 $2...
#   shift N 丢弃 N 个：依此类推
# 同时 $#（参数个数）也相应减少（shift 后 $# - 1，shift 2 后 $# - 2）
#
# 为什么要 shift？
#   处理带名参数时，case 只能看 $1（当前第一个）。
#   匹配到 --epochs 后，要把 "--epochs" 和它的值 "50" 一起吃掉，
#   否则下一轮循环 $1 还是 --epochs → 死循环。
#
# 逐步演示（假设运行 ./script.sh --epochs 50 --batch 64 /data）：
#
# 初始状态：
#   $1=--epochs  $2=50  $3=--batch  $4=64  $5=/data   $#=5
#
# 第 1 轮循环：case 匹配 $1=--epochs
#   EPOCHS="$2"     → EPOCHS=50（取了 $2 的值）
#   shift 2         → 丢弃 $1、$2，剩下的左移
#   移位后：
#   $1=--batch  $2=64  $3=/data   $#=3
#
# 第 2 轮循环：case 匹配 $1=--batch
#   BATCH="$2"      → BATCH=64
#   shift 2         → 再丢两个
#   移位后：
#   $1=/data   $#=1
#
# 第 3 轮循环：case 匹配 *)（通配，剩下的都是位置参数）
#   DATA_DIR="$1"   → DATA_DIR=/data
#   shift           → 只丢 1 个（因为位置参数只占一个位置）
#   移位后：
#   $#=0
#
# 第 4 轮循环：while [ $# -gt 0 ] 不成立（$#=0），退出循环
#
# 最终：EPOCHS=50  BATCH=64  DATA_DIR=/data
#
# ========== shift 2 vs shift 一句话区分 ==========
#   shift 2  → 一次吃掉【两个】参数（参数名 + 参数值，成对出现的）
#              用于 --epochs 50 这种"键值对"参数
#   shift    → 一次吃掉【一个】参数（单独的位置参数）
#              用于 *) 分支的裸参数（如 /data 这种不带 --xxx 的）
#
# ========== 不用 shift 会怎样？（反面教材）==========
# 如果上面写成：
#   --epochs) EPOCHS="$2";;     # ← 漏了 shift 2
#   --batch)  BATCH="$2";;      # ← 漏了 shift 2
#   *) DATA_DIR="$1"; shift;;
# 运行 ./script.sh --epochs 50 --batch 64 /data：
#   第 1 轮：$1=--epochs，EPOCHS=50，没 shift → $1 还是 --epochs
#   第 2 轮：$1=--epochs（又匹配！）→ 死循环
# 所以带值参数必须 shift 2，把"键+值"一起吃掉
#
# ========== shift 的其他用途 ==========
# 1. 跳过脚本名：脚本里想"丢掉 $0 后的所有参数从头处理"
#    shift   # 但通常不需要，$1 本来就从第一个参数开始（不含 $0）
#
# 2. 只处理前 N 个参数，剩下的原样保留：
#    shift 3   # 丢前 3 个，第 4 个变成新的 $1
#
# 3. 遍历所有参数（替代 for x in "$@"）：
#    while [ $# -gt 0 ]; do
#        echo "处理: $1"
#        shift
#    done
#    这种写法在"某些参数要吃两个、某些吃一个"的混合场景比 for 更灵活
#
# ========== 完整可运行示例 ==========
# 存成 args_demo.sh，chmod +x 后跑：
#   #!/usr/bin/env bash
#   set -euo pipefail
#   EPOCHS=10; BATCH=32; DATA_DIR=""
#   while [ $# -gt 0 ]; do
#       case "$1" in
#           --epochs) EPOCHS="$2"; shift 2;;
#           --batch)  BATCH="$2";  shift 2;;
#           -h|--help) echo "用法: $0 [--epochs N] [--batch N] <data_dir>"; exit 0;;
#           *) DATA_DIR="$1"; shift;;
#       esac
#   done
#   [ -z "$DATA_DIR" ] && { echo "错误：缺少 data_dir"; exit 1; }
#   echo "data=$DATA_DIR epochs=$EPOCHS batch=$BATCH"
#
# 测试：
#   ./args_demo.sh /data                       → data=/data epochs=10 batch=32
#   ./args_demo.sh --epochs 50 /data            → data=/data epochs=50 batch=32
#   ./args_demo.sh --epochs 50 --batch 64 /data → data=/data epochs=50 batch=64
#   ./args_demo.sh --batch 64 --epochs 50 /data → 顺序无关，结果一样
#   ./args_demo.sh                              → 报错"缺少 data_dir"
```

---

## 二、Shell 变量、引号与退出码

### 2.1 变量与引号

```bash
# ========== 变量赋值（注意：等号两边不能有空格！） ==========
name="experiment 01"    # ✅ 正确
name = "experiment 01"  # ❌ 错误！Shell 会把 name 当命令执行

# ========== 使用变量 ==========
echo $name              # 输出：experiment 01
echo "$name"            # 输出：experiment 01（双引号保留变量展开）
echo '$name'            # 输出：$name（单引号不展开变量！）

# ========== 单引号 vs 双引号 ==========
name="world"

# 双引号：变量会被展开，但特殊字符大部分保持原义
echo "Hello, $name"     # 输出：Hello, world
echo "Hello, \$name"    # 输出：Hello, $name（\ 转义 $）

# 单引号：所有内容都是字面量，不展开任何东西
echo 'Hello, $name'     # 输出：Hello, $name

# ========== 不加引号的危险：单词分割 ==========
name="experiment 01"
echo $name              # 输出：experiment 01（看起来没问题）
ls $name                # ❌ 实际执行了 ls experiment 01
#   Shell 把 "experiment 01" 拆成两个词：experiment 和 01
#   等价于 ls experiment 01 → 找两个文件/目录

ls "$name"              # ✅ 正确：双引号保持为一个参数
#   等价于 ls "experiment 01" → 找一个文件/目录

# ========== 最佳实践 ==========
# 几乎总是用双引号包裹变量："$variable"
# 只有在需要通配符展开时才不加引号：*.py
```

### 2.2 命令替换

```bash
# ========== 把命令的输出赋值给变量 ==========
current_date=$(date +%Y%m%d)        # $() 语法（推荐）
echo $current_date                   # 输出：20260701

# 旧语法（反引号，不推荐，不方便嵌套）
current_date=`date +%Y%m%d`

# 实际场景：用日期创建目录名
mkdir -p runs/exp_$(date +%Y%m%d_%H%M%S)
# 创建：runs/exp_20260701_143000/

# ========== 获取命令输出并处理 ==========
gpu_count=$(nvidia-smi -L | wc -l)   # 统计 GPU 数量
echo "检测到 $gpu_count 个 GPU"
```

### 2.3 退出码

```bash
# ========== 每个命令执行后都有一个退出码 ==========
# 0 = 成功
# 非 0 = 失败（不同数字代表不同错误类型）

python train.py
echo $?
# 输出 0：训练成功
# 输出 1：一般错误
# 输出 2：语法错误或误用
# 输出 137：被 SIGKILL（通常是 OOM Killer 杀掉）

# ========== 保存退出码 ==========
python check_data.py
status=$?
if [ $status -eq 0 ]; then
    echo "数据检查通过"
else
    echo "数据检查失败，退出码: $status"
fi

# ========== 常见退出码 ==========
# 0     成功
# 1     一般错误（Python 异常、逻辑错误）
# 2     Shell 语法错误
# 126   命令不可执行（没有执行权限）
# 127   命令未找到
# 128+N 被信号 N 杀死（如 137 = 128+9 = SIGKILL）
# 130   被 Ctrl+C 中断（128+2 = SIGINT）
```

### 2.4 健壮的 Bash 脚本开头

```bash
#!/usr/bin/env bash
# shebang 行：告诉系统用 bash 执行这个脚本
#
# ========== shebang 是什么？详细解释 ==========
# shebang（#!）是脚本第一行的特殊标记，格式：#!<解释器路径>
# 作用：当用 ./script.sh 执行脚本时，系统内核读到这一行，
#       就知道要用哪个解释器来运行这个文件
#
# 两种常见写法：
#   #!/usr/bin/env bash   ← 推荐：让 env 在 PATH 里自动找 bash
#   #!/bin/bash           ← 写死路径：如果 bash 装在别处（如 /usr/local/bin/bash）会失效
#
# 为什么推荐 #!/usr/bin/env bash 而不是 #!/bin/bash？
#   - 跨平台：macOS 的 bash 在 /bin/bash，但某些 Linux/容器可能在 /usr/bin/bash
#   - 用 env 会自动在 PATH 里搜索，更通用
#
# 其他常见 shebang：
#   #!/usr/bin/env python3      → Python 脚本（这样就能 ./train.py 直接运行）
#   #!/usr/bin/env sh           → POSIX shell 脚本
#   #!/usr/bin/env node         → Node.js 脚本
#
# 注意：
#   1. shebang 必须是文件第一行（前面不能有空行、空格），否则无效
#   2. 3.2 节里 "./train.py  # 需要 shebang 行 #!/usr/bin/env python3"
#      的意思就是：想用 ./train.py 直接运行，必须满足两件事：
#      ① 文件第一行有 #!/usr/bin/env python3
#      ② 文件有可执行权限（chmod +x train.py）
#      这样系统才知道"这个文件用 python3 来跑"

# ========== 用 uv 环境时 shebang 怎么写？（新手高频疑问）==========
# uv 是现代 Python 包管理器（替代 pip/venv/conda），它有自己的虚拟环境。
# shebang 的关键是"让系统找到正确的 python 解释器"，所以取决于你怎么用 uv：
#
# 情况 A：用 uv 建了虚拟环境（uv venv），想用这个环境的 python
#   方式 1（推荐，跨平台通用）：
#     #!/usr/bin/env python3
#     然后运行前先激活环境：source .venv/bin/activate && ./train.py
#     激活后 PATH 里 .venv/bin 在最前，env python3 会找到 .venv/bin/python3
#
#   方式 2（写死路径，只在本机有效，换机器就失效）：
#     #!/path/to/project/.venv/bin/python3
#     直接指向虚拟环境的 python，不用激活就能 ./train.py
#     缺点：路径写死，git clone 到别处或换目录就失效
#
# 情况 B：用 uv run（uv 的推荐用法，不用手动激活）
#   这时候【不要用 shebang 直接运行】，而是：
#     uv run train.py
#   uv run 会自动用项目的 .venv 解释器，不需要 shebang 也不用 chmod +x
#   shebang 方式和 uv run 是两种思路，二选一即可
#
# 情况 C：用 uv 管理的独立脚本（PEP 723 内联依赖，uv 0.4+ 支持）
#   脚本第一行用普通 shebang，然后用注释声明依赖：
#     #!/usr/bin/env -S uv run --script
#     # /// script
#     # dependencies = ["requests", "rich"]
#     # ///
#     import requests, rich
#     ...
#   -S 选项让 env 支持多参数（env 默认只接受一个参数，加 -S 才能传 "uv run --script"）
#   这样 ./script.py 能直接跑，uv 会自动创建临时环境装依赖
#   适合"分发单文件脚本给别人用"的场景
#
# 速记：
#   - 老办法（激活环境）：shebang 写 #!/usr/bin/env python3，运行前 source .venv/bin/activate
#   - uv 推荐：不写 shebang，直接 uv run train.py（最省心）
#   - 单文件分发：shebang 写 #!/usr/bin/env -S uv run --script + 内联依赖注释
#
# 怎么确认"./train.py 用的是哪个 python"？
#   在脚本里加一行：import sys; print(sys.executable)
#   或运行前用 which python3 看看 PATH 找到的是不是 .venv 里的那个

set -euo pipefail
# 这三个选项让脚本更安全：
#
# set -e: 任何命令失败（退出码非 0）就立即退出脚本
#   不加：命令失败后继续执行下一行（危险！）
#   加了：命令失败就停，不会带着错误继续往下跑
#
# set -u: 使用未定义的变量时报错
#   不加：$UNDEFINED_VAR 会变成空字符串
#   加了：直接报错 "UNDEFINED_VAR: unbound variable"
#
# set -o pipefail: 管道中任一命令失败，整个管道的退出码为失败
#   不加：cmd1 | cmd2 | cmd3，即使 cmd1 失了，只要 cmd3 成功就返回 0
#   加了：cmd1 失败 → 整个管道返回失败

# 完整示例脚本
#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${1:-./data}"    # 第一个参数，默认 ./data
# 这里的 ${1:-./data} 是"参数默认值"语法（和 1.3 节的 ${1:?...} 是同一家族）：
#   $1            脚本第一个参数
#   ${1:-./data}  如果 $1 为空（没传），就用 ./data 作为默认值
#   ${1:?提示}    如果 $1 为空，报错退出（1.3 节 best_loss.sh 用的）
# 区别：
#   ${1:-默认值}  → 没传就用默认值，继续执行（"温和"）
#   ${1:?提示}    → 没传就直接退出报错（"严格"，必填参数用它）
# 实际效果：
#   ./train.sh /data/mydata   → DATA_DIR=/data/mydata
#   ./train.sh                → DATA_DIR=./data（用了默认值）
OUTPUT_DIR="runs/$(date +%Y%m%d)"

echo "数据目录: $DATA_DIR"
echo "输出目录: $OUTPUT_DIR"

# 检查数据目录是否存在
if [ ! -d "$DATA_DIR" ]; then
    echo "错误：数据目录 $DATA_DIR 不存在" >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
python train.py --data "$DATA_DIR" --output "$OUTPUT_DIR"

echo "训练完成，结果保存在 $OUTPUT_DIR"
```

---

## 三、权限模型

### 3.1 理解 ls -l 的权限部分

```bash
ls -l train.py
# 输出：-rwxr-x---  1 lxy staff  1234 Jun 28 14:00 train.py
#       └┘└─┘└─┘
#       │  │   │
#       │  │   └── other（其他人）的权限：r-- = 只读
#       │  └────── group（所属组）的权限：r-x = 读和执行
#       └────────── owner（所有者）的权限：rwx = 读、写、执行
#
# 第一个字符表示类型：
#   - = 普通文件
#   d = 目录
#   l = 符号链接（软链接）

# ========== rwx 的含义 ==========
# 对文件：         r = 可读取内容    w = 可修改内容    x = 可执行
# 对目录：         r = 可列出目录内容 w = 可在目录中创建/删除文件  x = 可进入目录（cd）
#
# 注意：目录的 x 权限很特殊，没有 x 就不能 cd 进去，也不能访问里面的文件
```

### 3.2 修改权限

```bash
# ========== chmod：修改权限 ==========
# 方法一：符号法
chmod u+x train.py          # u=user, +x=增加执行权限
chmod g-w config.yaml       # g=group, -w=去掉写权限
chmod o=r config.yaml       # o=other, =r=设为只读
chmod u+x,g+x train.py      # 同时给 user 和 group 加执行权限
chmod a+x train.py          # a=all，给所有人加执行权限

# 方法二：数字法（更常用）
# r=4, w=2, x=1，加起来就是权限值
# 7 = rwx (4+2+1)
# 6 = rw- (4+2)
# 5 = r-x (4+1)
# 4 = r-- (4)
# 0 = --- (0)

chmod 755 train.py          # rwxr-xr-x：所有者可读写执行，其他人可读和执行
chmod 644 config.yaml       # rw-r--r--：所有者可读写，其他人只读
chmod 600 secret.key        # rw-------：只有所有者可读写（用于密钥文件）
chmod 700 ~/.ssh            # rwx------：只有自己能进入 .ssh 目录

# ========== 实际场景 ==========
# 脚本写好了想直接运行（不用 python xxx.py）
chmod +x train.py           # 加执行权限
./train.py                  # 直接运行（需要 shebang 行 #!/usr/bin/env python3）
# ↑ "shebang 是什么意思？为什么直接运行需要它？" —— 详见 2.4 节详细解释
# 一句话：shebang 是脚本第一行的 #!标记，告诉系统用什么解释器运行这个文件
# 没有它，./train.py 系统不知道该用 python 还是 bash 来跑 → 报 exec format error
# 加了 #!/usr/bin/env python3 → 系统会用 env 找到的 python3 来执行
# 注意：直接运行(./xxx)还必须有执行权限（chmod +x），两个条件缺一不可

# 配置文件不想被别人看到
chmod 600 .env              # 只有自己能读写

# ⚠️ 不要习惯性 chmod 777！
# 777 = 所有人都能读写执行，是安全漏洞
# 先用 ls -l 看清楚当前权限，再针对性修改
```

### 3.3 修改所有者

```bash
# ========== chown：修改文件所有者 ==========
sudo chown lxy:staff train.py    # 所有者:lxy, 所属组:staff
sudo chown lxy train.py          # 只改所有者
sudo chown :staff train.py       # 只改所属组

# 实际场景：从 root 拷贝文件后改回自己的
sudo cp /root/data.zip ./
sudo chown lxy:lxy data.zip
```

### 3.3.1 查看用户和组（新手补充）

```bash
# ========== 我是谁？==========
whoami                       # 输出当前用户名，如 lxy
id                           # 输出 uid/gid/groups（3.4 节详细解释这些数字）

# ========== 看系统里有哪些用户 ==========
cat /etc/passwd | head -5
# root:x:0:0:root:/root:/bin/bash
# daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
# lxy:x:1000:1000:lxy,,,:/home/lxy:/bin/bash
#  字段含义（用 : 分隔，共 7 段）：
#  ① 用户名  ② 密码占位(x 表示密码在 /etc/shadow)
#  ③ uid     ④ gid(主组)  ⑤ 备注
#  ⑥ 家目录   ⑦ 登录后用的 shell(/usr/sbin/nologin 表示禁止登录)

# 更推荐：用 getent 查单个用户（不用翻整个文件）
getent passwd lxy            # 只看 lxy 这一行

# ========== 看系统里有哪些组 ==========
cat /etc/group | head -5
# root:x:0:
# sudo:x:27:lxy              ← sudo 组里有 lxy
# docker:x:999:lxy           ← docker 组里有 lxy
#  字段：① 组名 ② 密码占位 ③ gid  ④ 组成员(逗号分隔)

getent group docker          # 只看 docker 组

# ========== 某个用户在哪些组里？==========
groups lxy                   # 输出：lxy sudo docker
groups                       # 不加参数 = 当前用户
```

### 3.3.2 添加用户和组（新手补充）

```bash
# ========== 创建新用户 ==========
# 场景：来了个新同事 alice，要在 GPU 服务器上跑实验
sudo useradd -m -s /bin/bash alice
#   -m         创建家目录 /home/alice
#   -s /bin/bash  登录后用 bash
# 注意：useradd 创建后默认没密码、账号是锁定的，必须设密码才能登录
sudo passwd alice            # 交互式输入两次密码

# 更友好的 adduser（Debian/Ubuntu 有，会交互式问密码、家目录等）
sudo adduser alice

# ========== 创建新组 ==========
sudo groupadd mlteam         # 创建一个叫 mlteam 的组

# ========== 把用户加到组里 ==========
sudo usermod -aG mlteam alice
#   -a   append，追加（不加 -a 会把用户从其他组移除！）
#   -G   指定附加组（不是主组）
# 注意：加组后，alice 需要【重新登录】才生效（当前会话还是旧组）

# 一次性加多个组
sudo usermod -aG mlteam,docker,sudo bob

# ========== 这条命令逐词拆解（新手高频疑问）==========
# sudo      以 root 权限执行（usermod 会改 /etc/group，只有 root 能改）
# usermod   修改用户属性的命令
# -aG       两个参数合写：
#             -a   append，追加到组（不加 -a 会把用户从其他附加组移除！）
#             -G   指定【附加组】（区别于 -g 主组，一个人只能有一个主组）
# mlteam,docker,sudo   要加入的组列表，用逗号分隔（不能有空格）
# bob       要操作的用户名 —— 即"把 bob 加进这三个组"
#
# 为什么需要 sudo？
#   /etc/group 文件只有 root 能写。普通用户执行 usermod 会报：
#   "usermod: Permission denied. usermod: cannot lock /etc/passwd"
#   所以必须 sudo 提权。
#
# bob 是谁？
#   就是要被操作的目标用户名。换成 alice 就是操作 alice。
#   这条命令的"动作发出者"是你（你用 sudo 提权），
#   "动作承受者"是 bob（bob 被加进组里）。
#
# 常见误区：
#   ❌ 以为 "sudo bob" 是一个整体 → 不是，sudo 和 bob 是两个独立单词
#   ❌ 以为这是"切到 bob 用户操作" → 不是，切用户用 su - bob
#   ✅ 正确理解：我(root权限) 执行 usermod，把 bob 加到这三个组
#
# 验证加组是否成功：
groups bob                  # 看 bob 在哪些组（需要 bob 重新登录才生效）
getent group docker         # 看 docker 组里有没有 bob

# ========== 删除用户/组 ==========
sudo userdel -r alice        # -r 连带删除家目录
sudo groupdel mlteam

# ========== 完整流程：给新人 alice 开账号并让她能跑实验 ==========
sudo useradd -m -s /bin/bash alice && sudo passwd alice
sudo usermod -aG mlteam alice          # 加入团队共享组
sudo usermod -aG docker alice          # 能用 docker
# 如果需要她能用 sudo
sudo usermod -aG sudo alice
# 然后告诉她用 ssh alice@服务器IP 登录
# 她的家目录 /home/alice 默认权限 755，别人能看不能改
```

### 3.3.3 共享目录设置：/mnt/public 场景（新手补充）

> 需求：在一台多人共享的 GPU 服务器上，建一个 `/mnt/public` 目录，让所有用户都能：
> ① 进去访问；② 在里面新建自己的文件/文件夹；③ 读别人放进去的内容；
> 但 **不能修改或删除别人放的东西**。

```bash
# ========== 方案：共享组 + SGID + sticky bit ==========

# 第 1 步：创建一个共享组，把所有需要用的用户加进去
sudo groupadd shared
sudo usermod -aG shared alice
sudo usermod -aG shared bob
# 提醒：加组后用户要重新登录才生效

# 第 2 步：创建共享目录，把所有者设为共享组
sudo mkdir -p /mnt/public
sudo chown :shared /mnt/public      # 所属组 = shared（所有者保持 root）

# 第 3 步：设置权限 2775
sudo chmod 2775 /mnt/public
#   2 = SGID（Set Group ID）位，作用见下方解释
#   775 = rwxrwxr-x：所有者 rwx、组(shared 成员) rwx、其他人 r-x
# 含义：shared 组成员能读写执行，其他人只能读和进入（不能写）

# 第 4 步（如果要让"非 shared 组的所有用户"也能在里面建文件）：
sudo chmod 2777 /mnt/public         # 改成 rwxrwsrwx
# 这样所有人都能建文件，但要配合 sticky bit 才安全，见第 5 步

# 第 5 步：加 sticky bit，防止删别人的文件
sudo chmod +t /mnt/public           # 或写完整：sudo chmod 3777 /mnt/public
#   t = sticky bit，作用：在加了 sticky 的目录里，
#        只有文件所有者（和 root）能删除/重命名自己的文件，
#        别人即使对目录有写权限，也不能删你的文件
# /tmp 就是典型例子：chmod 1777，大家都能建文件，但只能删自己的

# ========== 这三个特殊位是什么？==========
# 1. SGID（数字 2，作用于目录）：目录里新建的文件/子目录，会自动继承父目录的"组"
#    不加 SGID：alice 建的文件所属组是 alice 的主组，bob 看不到（如果组权限没给）
#    加了 SGID：alice 建的文件所属组自动变成 shared，shared 组成员都能按组权限访问
#
# 2. sticky bit（数字 1，或 +t，作用于目录）：限制删除权限
#    不加：对目录有 w 权限的人能删目录里任何文件（包括别人的）
#    加了：只能删自己的文件（即使对目录有 w）
#
# 3. SUID（数字 4，作用于可执行文件）：执行时临时获得文件所有者权限
#    典型例子：/usr/bin/passwd 是 SUID root，普通用户能用它改自己的密码
#    共享目录场景用不到，知道有这回事即可

# ========== 权限数字怎么看（4 位时）==========
# chmod 2775 = SGID(2) + rwx(7) rwx(7) r-x(5)
# chmod 1777 = sticky(1) + rwx(7) rwx(7) rwx(7)
# chmod 4755 = SUID(4) + rwx(7) r-x(5) r-x(5)
# 第 1 位是特殊位（4=SUID, 2=SGID, 1=sticky，可叠加如 6=4+2）
# 后 3 位是普通的 owner/group/other

# ========== 验证设置 ==========
ls -ld /mnt/public
# drwxrwsrwt  2 root shared 4096 ... /mnt/public
#  │└┘└─┘└─┘
#  │ │  │  └── other: rwt（t 表示 sticky 生效）
#  │ │  └───── group: rws（s 表示 SGID 生效，代替了 x）
#  │ └──────── owner: rwx
#  └────────── d 是目录

# ========== 实际效果验证 ==========
# alice 登录后：
cd /mnt/public
mkdir alice_data            # ✅ 能建
echo hello > alice_data/note.txt
# bob 登录后：
cat /mnt/public/alice_data/note.txt   # ✅ 能读
echo x >> /mnt/public/alice_data/note.txt   # ❌ 改不了（文件是 alice 的，bob 没有 w）
rm /mnt/public/alice_data/note.txt    # ❌ 删不了（sticky bit 保护，只有 alice/root 能删）

# ========== 怎么在终端切换用户来验证？（新手高频疑问）==========
# 用 su 命令。但 "su 用户" 和 "su - 用户" 有重要区别：
#
# su alice         切到 alice，但【不切换环境】（non-login shell）
#   - 保留当前用户的环境变量（HOME、PATH 还是你的）
#   - 不执行 alice 的 .bash_profile / .bashrc
#   - cwd（当前目录）还是你原来的目录
#   - 适合"临时用 alice 身份跑一两条命令"
#
# su - alice       切到 alice，【完整切换环境】（login shell）
#   - HOME 变成 /home/alice，cd 到那
#   - PATH 重置成 alice 的（会执行 .bash_profile / .profile）
#   - 就像 alice 真的 SSH 登录一样
#   - 适合"我要完整模拟 alice 的使用场景"
#
# 区别演示：
#   你(lxy) 在 /mnt/public 目录，执行 su alice（不带 -）：
#     whoami       → alice（身份切了）
#     pwd          → /mnt/public（目录没变，环境没切）
#     echo $HOME   → /home/lxy（HOME 还是你的！）
#   执行 su - alice（带 -）：
#     whoami       → alice
#     pwd          → /home/alice（切到 alice 家目录）
#     echo $HOME   → /home/alice（HOME 也切了）
#
# 推荐：验证权限场景用 su - alice（环境干净，结果才准确）
#       因为 su alice 不切环境，alice 的组可能没"刷新"，权限验证会不准
#
# 验证完切回来：
exit                         # 退出 alice 身份，回到原来的 lxy
#
# 补充：加组后为什么要"重新登录"才生效？
#   groups 是登录时从 /etc/group 读进来的，存在当前 shell 进程里。
#   你 usermod -aG docker alice 后，alice 当前已开的终端里 groups 还是旧的。
#   必须 exit 后重新 su - alice（或重新 SSH 登录），新 shell 才会读到新组。
#   验证：su - alice 后执行 id，看 groups 里有没有 docker
#
# 其他切用户方式：
sudo -u alice whoami        # 不进交互式 shell，只以 alice 身份跑一条命令
sudo -iu alice              # = sudo su - alice（以 root 权限切到 alice，需要 sudo 权限）

# ========== 进阶：如果想让"组内成员能互相改但不能删"怎么办 ==========
# 上面的 sticky bit 只防删除，不防修改。要精确控制"能读不能改别人的"：
# 方案：让用户建文件时默认权限不带组写权限
# 编辑 /etc/profile 或 ~/.bashrc 设置 umask：
umask 022                   # 新建文件 644（rw-r--r--），目录 755
# 这样 alice 建的 note.txt 默认是 644，组内成员只能读不能改
# 如果某些文件确实要共享编辑，alice 手动 chmod g+w 即可

# ========== umask 022 到底是什么意思？（新手高频疑问）==========
# umask = "user mask"，新建文件/目录时的"权限掩码"
# 它是一个【反向】计算：新建权限 = 默认最大权限 - umask
#
# 新建文件的默认最大权限是 666（rw-rw-rw-，文件默认不给执行位）
# 新建目录的默认最大权限是 777（rwxrwxrwx，目录需要执行位才能进入）
#
# umask 022 的计算（用减法，按位算）：
#   文件：666 - 022 = 644  →  rw-r--r--（所有者读写，其他人只读）
#   目录：777 - 022 = 755  →  rwxr-xr-x（所有者全权，其他人读+进入）
#
# 常见 umask 值对照：
#   umask 022 → 文件 644，目录 755（Linux 默认，最常用）
#   umask 077 → 文件 600，目录 700（最严格，只有自己能访问）
#   umask 002 → 文件 664，目录 775（组可写，团队协作用）
#   umask 000 → 文件 666，目录 777（完全开放，不安全，别用）
#
# 注意：umask 是"屏蔽位"，不是直接赋值
#   严格说不是减法，是"按位取反再相与"：new_perm = max_perm & ~umask
#   但对 022/077/002 这些常见值，用减法算结果一样，新手先用减法理解
#
# 想看当前 umask：
umask                       # 输出 022（或 0022）
umask -S                    # -S 符号形式输出 u=rwx,g=rx,o=rx
#
# 临时改（只对当前终端生效）：
umask 022                   # 改成 022
# 永久改：写进配置文件（见下方说明）

# ========== /etc/profile 里没看到 umask，应该写在哪？（新手高频疑问）==========
# 你贴的 /etc/profile 内容里确实没有 umask 设置——这很正常！
# 因为 /etc/profile 主要做两件事：设 PS1（提示符）+ source /etc/profile.d/*.sh
# umask 通常由【其他文件】设置，不同发行版位置不同：
#
# Ubuntu/Debian 系统：
#   /etc/profile 里不设 umask
#   实际由 /etc/bash.bashrc 或 PAM 模块设置默认值 022
#
# CentOS/RHEL 系统：
#   /etc/profile 末尾或 /etc/profile.d/ 里有 umask 设置
#   /etc/bashrc 里也有
#
# 你想自定义 umask，推荐写在这几个地方（按生效范围）：
#
# ① 只给自己用 → 写进 ~/.bashrc（最推荐，不影响别人）：
#    echo "umask 022" >> ~/.bashrc
#    生效范围：你自己的所有交互式 shell
#
# ② 给某个项目的所有用户用 → 写进项目脚本开头：
#    #!/usr/bin/env bash
#    umask 022    # 脚本开头设一下
#    ...
#    生效范围：这个脚本创建的文件
#
# ③ 给全系统所有用户用 → 写进 /etc/profile.d/（比直接改 /etc/profile 规范）：
#    echo "umask 022" | sudo tee /etc/profile.d/umask.sh
#    sudo chmod 644 /etc/profile.d/umask.sh
#    生效范围：所有登录用户（/etc/profile 会自动 source /etc/profile.d/*.sh）
#
# ④ 给特定用户（如 alice）用 → 写进 /home/alice/.bashrc
#
# 验证是否生效：重新登录后执行 umask，看输出是不是你要的值

# ========== 想让 /mnt/public 下别人"只读"（不能改、不能删、不能加文件）怎么设？==========
# 上面的 SGID+sticky 方案是"能建文件、能读别人的、不能改删别人的"
# 如果你想要更严格："别人连文件都【不能新建】，只能读"——
# 即：每个用户建的目录，别人只能 ls 和 cat，不能在里面写任何东西
#
# 这要分两层控制：
#
# 第 1 层：/mnt/public 本身还是要让大家能进去建子目录（777 或 2775）
#   不然大家连自己的目录都建不了
#
# 第 2 层：每个用户建的【子目录】，设成 755（别人只读，不能写）
#   mkdir alice_data
#   chmod 755 alice_data       # 别人能 cd 进来、能 ls/cat，不能 mkdir/touch
#
# 这样效果：
#   bob 能 cd /mnt/public/alice_data，能 ls，能 cat note.txt  ✅
#   bob 不能在 alice_data 里 mkdir new_dir                    ❌（目录 755，组/其他无 w）
#   bob 不能在 alice_data 里 touch new_file                   ❌
#   bob 不能改 note.txt                                        ❌（文件 644）
#   bob 不能删 note.txt                                        ❌（需要目录 w，没有）
#
# 配合 umask 让新建文件默认就是 644、目录 755：
#   alice 在 ~/.bashrc 设 umask 022
#   之后 alice 建的文件/目录就自动是 644/755，不用每次手动 chmod
#
# 如果想更彻底——"别人连 ls 都不能 ls，只知道有这个目录"：
#   chmod 711 alice_data       # 别人能 cd（有 x），不能 ls（无 r），能 cat 已知文件名
#   这样 bob 不知道 alice_data 里有什么文件，但如果有确切的文件名能 cat
#
# 权限对照表（目录权限的 r/w/x 含义和文件不同！）：
# ┌──────┬─────────────────┬──────────────────────────────────┐
# │ 权限 │ 目录上的含义     │ 文件上的含义                      │
# ├──────┼─────────────────┼──────────────────────────────────┤
# │ r    │ 能 ls 列出内容   │ 能 cat/读内容                     │
# │ w    │ 能新建/删除里面文件│ 能改文件内容                    │
# │ x    │ 能 cd 进入       │ 能执行（运行）                    │
# └──────┴─────────────────┴──────────────────────────────────┘
# 关键：能不能"删/建目录里的文件"看的是【目录】的 w，不是文件本身！
#   所以 sticky bit 加在目录上才能防止"删别人的文件"
```

### 3.4 权限问题的排查思路（别一上来就 chmod 777）

```bash
# ========== 经典场景：报错 "Permission denied"，怎么排查 ==========
# 错误反应：chmod 777 搞定 → 留下安全漏洞，而且没找到根因
# 正确反应：按顺序问 4 个问题

# 问题 1：这个文件/目录的权限和所有者是什么？
ls -l /data/train.log
# -rw------- 1 root root ... /data/train.log
# → 所有者是 root，且只有 root 能读写，你当然没权限

# 问题 2：我是谁？我在哪些组里？
id
# uid=1000(lxy) gid=1000(lxy) groups=1000(lxy),27(sudo),999(docker)
# → 确认当前身份，看是否在文件所属组里

# ========== 这些数字和名字分别是什么？逐段拆解 ==========
# uid=1000(lxy)              → 用户 ID = 1000，用户名 = lxy
#   uid 是系统给每个用户的唯一数字编号：
#     0        = root（超级管理员）
#     1~999    = 系统账号（daemon、www-data、sshd 等服务账号）
#     1000+    = 普通用户（你用 useradd 创建的用户一般从 1000 开始）
#   系统实际认的是数字 uid，用户名只是给人看的（存在 /etc/passwd 里）

# gid=1000(lxy)              → 主组 ID = 1000，组名 = lxy
#   每个用户必须有一个"主组"（primary group），通常和用户名同名（叫"用户私有组"）
#   你新建文件时，默认所属组就是你的主组
#   gid 也是数字，含义同 uid

# groups=1000(lxy),27(sudo),999(docker)
#   → 你所在的"所有组"列表（主组 + 附加组），用逗号分隔
#     1000(lxy)   = 你的主组
#     27(sudo)    = sudo 组，组成员可以用 sudo 提权
#     999(docker) = docker 组，组成员能免 sudo 使用 docker 命令
#
# 为什么 docker 要单独建组？
#   docker 守护进程默认只有 root 能直接访问，每次 docker 都要 sudo 很烦
#   把用户加进 docker 组，就能直接 docker run ...（不用 sudo）
#   ⚠️ 但 docker 组等同 root 权限（能挂载宿主文件系统），慎用

# ========== uid / gid / groups 三者区别一句话记忆 ==========
#   uid  = "你是谁"（唯一身份）
#   gid  = "你新建文件默认归哪个组"（主组，只有一个）
#   groups = "你还在哪些组里"（影响你能不能访问组所属的文件，可多个）

# ========== 权限判断时怎么用这些信息 ==========
# 看 ls -l 的输出，对照自己的 id：
#   文件所有者是你(uid)   → 用 owner 那段权限
#   否则，文件所属组在你 groups 里 → 用 group 那段权限
#   都不是                → 用 other 那段权限
# 这就是为什么 id 输出要对照 ls -l 看——判断自己落在哪个权限段

# 问题 3：我要访问的路径，每一级目录我有没有 x（穿越）权限？
# 这是新手最容易忽略的：即使你有文件本身的 r 权限，
# 但父目录没 x，照样访问不了
namei -l /data/train.log
# 逐级打印路径上每个分量的权限：
# drwxr-xr-x root root /
# drwxr-xr-x root root /data
# -rw------- root root /data/train.log
# → 这里 /data 有 x（其他人能穿越），但文件本身 other 无任何权限

# 问题 4：根因找到后，用最小权限修复，而不是 777
# 场景 A：文件应该属于你 → 改所有者
sudo chown lxy:lxy /data/train.log
# 场景 B：同组要用 → 给组加权限
sudo chmod g+r /data/train.log
# 场景 C：确实要给所有人读 → 644 足矣，绝不用 777
sudo chmod 644 /data/train.log

# ========== 为什么 chmod 777 是坏习惯 ==========
# 1. 安全漏洞：任何用户（包括被攻破的账号）都能读写执行
# 2. 掩盖问题：你没搞清楚为什么没权限，下次还会踩坑
# 3. 污染 Git：提交进去后，CI/部署环境继承错误权限
# 4. 影响协作：同事 clone 下来权限是 777，无法用权限区分角色
#
# 记忆口诀：权限问题三步走 —— ls -l 看自己、id 看身份、namei 看路径
```

---

## 四、进程、作业与信号

### 4.1 查看进程

```bash
# ========== ps：查看进程快照 ==========
ps -ef | grep train.py
# -e = 所有进程
# -f = full format，显示详细信息
# 输出：
# UID  PID  PPID  C  STIME  TTY  TIME  CMD
# lxy  1234  1    0  14:00  ?    00:05 python train.py
#         │    │                    │
#       进程ID 父进程ID              命令

ps aux | grep python
# aux 是另一种常用格式（BSD 风格）
# a = 所有用户的进程
# u = 显示用户
# x = 包括没有终端的进程（后台进程）

# ========== pgrep：按名字找进程 ==========
pgrep -af train.py
# -a = 显示完整命令行
# -f = 匹配完整命令行（不只是进程名）
# 输出：1234 python train.py --lr 0.001

# ========== top / htop：实时查看 ==========
top
# 实时显示系统资源使用情况
# 按 q 退出
# 按 P 按 CPU 排序
# 按 M 按内存排序
# 
# 关键指标：
# load average: 1.5, 1.2, 0.8
#              ↑     ↑     ↑
#           1分钟  5分钟  15分钟的平均负载
#           （单核 CPU 上 >1.0 表示过载）

# htop 是 top 的增强版（需要安装）
# 更友好的界面，支持鼠标操作，可以树状显示进程
```

### 4.2 后台运行

```bash
# ========== &：后台运行 ==========
python train.py &
# [1] 12345
#  [1] = 作业号
#  12345 = 进程 PID
# 终端关闭后进程会被杀掉！

# ========== nohup：不挂断地运行 ==========
nohup python train.py > train.log 2>&1 &
# nohup = no hangup，忽略 SIGHUP 信号
# 终端关闭后进程继续运行
# 默认输出到 nohup.out，这里重定向到 train.log

# ========== jobs：查看当前终端的后台作业 ==========
jobs
# [1]+  Running    python train.py &

fg %1                        # 把作业 1 拉回前台
bg %1                        # 让作业 1 在后台继续运行（Ctrl+Z 暂停后用）

# ========== "Ctrl+Z 暂停后用"是什么意思？完整演示 ==========
# Ctrl+Z 不是"结束"程序，而是"暂停"（挂起，Suspend）程序：
#   程序还在内存里，但不再运行（状态变成 Stopped），
#   你可以随时把它拉回前台继续，或放后台继续
#
# 典型场景：你在前台跑 python train.py，突然想敲别的命令，
#           但又不想终止训练
#
# 操作流程：
python train.py              # 前台运行训练
# （训练在跑，终端被占用，没法输别的命令）
# 按 Ctrl+Z                  # 屏幕显示：
# [1]+  Stopped                 python train.py
#   ↑ 程序被"暂停"了（Stopped），没死，终端回到你手里

ls                           # 现在可以敲别的命令了
nvidia-smi                   # 看看显卡

fg %1                        # 把作业 1 拉回前台继续（训练恢复，终端又被占用）
#   注意：fg 是 "foreground"，把作业调回前台
#   %1 是作业号（jobs 命令看到的 [1]）

# 另一个场景：你希望它"暂停后不回前台，而是在后台继续跑"
# 按 Ctrl+Z 暂停后：
bg %1                        # 让作业 1 在后台继续运行（状态从 Stopped → Running）
#   bg = "background"，作业在后台跑，终端还能用
#   但它的输出还是会打到当前终端（建议配合重定向 > log）

# 一句话区分：
#   fg %1  → 拉到前台（终端被它占用，看它的输出）
#   bg %1  → 放后台跑（终端能用，但它的输出还会冒出来）
#   Ctrl+Z → 只是暂停，不跑也不退出，等你 fg 或 bg

# ========== bg %1 之后怎么知道它的 PID？（新手高频疑问）==========
# bg %1 启动后台后，Shell 会打印一行告诉你 PID：
bg %1
# 输出：[1]+  python train.py &
#           ↑ 这一行的 & 表示它在后台，但默认不显示 PID
#
# 方法 1：bg 后立即用 $! 拿到"最近一个后台进程的 PID"
bg %1
echo $!                     # 输出 PID，如 12345
#   $! 是 Shell 内置变量，永远存"最后一个放到后台的进程 PID"
#   可以记下来：PID=$!，之后用 ps -p $PID 查状态

# 方法 2：用 jobs -l 直接看作业号 + PID
jobs -l
# 输出：[1]+  12345 Running    python train.py &
#            ↑ 这个 12345 就是 PID（-l = list with PID）
#   Running = 还在跑；Done = 跑完了；Stopped = 暂停中

# 方法 3：按命令名查 PID（不知道作业号时用）
pgrep -f "python train.py"  # 输出所有匹配的 PID
ps aux | grep "train.py"    # 更详细，能看到启动时间、CPU 占用
#   pgrep -f 的 -f 表示"匹配完整命令行"（不加 -f 只匹配进程名）

# ========== 怎么知道它跑完了？==========
# 方法 1：jobs -l 看状态变化
jobs -l                     # Running 时还在跑
# （过一会儿）
jobs -l                     # 变成 Done 就跑完了（Done 行很快消失）

# 方法 2：wait 命令阻塞等待（脚本里常用）
wait %1                     # 等作业 1 结束再继续（交互式里会卡住）
wait 12345                  # 等指定 PID 结束
echo $?                     # wait 后看退出码，0=成功，非0=失败

# 方法 3：周期性查 PID 是否还在
ps -p 12345                 # 有输出=还在跑；无输出（只有表头）=已结束
pgrep -f "train.py"         # 有输出=还在；无输出=已结束

# 方法 4：进程结束时通知你（推荐，不用反复查）
# 让进程结束时发通知：
wait %1 && echo "训练成功完成" || echo "训练失败"
# 或用 notify-send（桌面环境）：
#   wait %1 && notify-send "训练" "完成"

# ========== 推荐做法：启动时就记录 PID ==========
python train.py > train.log 2>&1 &
PID=$!                      # 立即抓 PID 存起来
echo "训练已启动，PID=$PID"
echo $PID > train.pid       # 存到文件，方便别的终端/脚本查
# 之后任何地方都能：
ps -p $(cat train.pid)      # 查状态
kill $(cat train.pid)       # 杀进程
# 训练完检查：
wait $PID && echo "成功" || echo "失败"
rm train.pid                # 清理

# ========== 推荐方案：用 tmux ==========
# tmux = terminal multiplexer，终端复用器
# 比 nohup 更好用，可以随时重新连接

tmux new -s train            # 创建名为 train 的会话
# 在 tmux 中运行训练...
# Ctrl+b 然后按 d：脱离会话（训练继续跑）
# 可以安全关闭终端

tmux ls                      # 列出所有会话
tmux attach -t train         # 重新连接到 train 会话

# tmux 内部常用快捷键（先按 Ctrl+b，再按）：
# d     脱离会话
# c     创建新窗口
# n/p   下一个/上一个窗口
# %     左右分屏
# "     上下分屏

# ========== tmux 怎么删除不需要的窗口/会话？==========
# 删除【窗口】（window）：在 tmux 内部，先按 Ctrl+b，再按 &
#   会提示 "kill-window window_name? (y/n)"，按 y 确认删除当前窗口
#   如果只有一个窗口，删掉后会话也会结束
#
# 删除【窗格】（pane，分屏出来的小格子）：先按 Ctrl+b，再按 x
#   会提示确认，按 y 删除当前光标所在的窗格
#
# tmux 内部更多快捷键（先按 Ctrl+b）：
# &     删除当前窗口（会问确认）
# x     删除当前窗格（会问确认）
# w     列出所有窗口，可用方向键切换/选择
# s     列出所有会话，可切换
# 数字键 0/1/2...  切换到对应编号的窗口
# ,     给当前窗口改名
# o     在多个窗格间循环切换

# 删除【会话】（session）—— 在 tmux 外面用命令行：
tmux kill-session -t train    # 删除名为 train 的会话
tmux kill-session -a          # 删除除当前外的所有会话
tmux kill-server              # 杀掉 tmux 服务（所有会话全没，慎用）

# 离开会话但想保留它继续跑：用 Ctrl+b d（脱离），而不是关闭窗口
# 直接关闭终端窗口会话也不会死（这就是 tmux 的意义），但下次要 tmux attach 回来
```

### 4.3 信号

```bash
# ========== kill：发送信号 ==========
kill <PID>                   # 默认发送 SIGTERM（15），请求进程优雅退出
kill -TERM <PID>             # 同上，明确指定
kill -INT <PID>              # 发送 SIGINT（2），等同 Ctrl+C
kill -KILL <PID>             # 发送 SIGKILL（9），强制杀死，不可被捕获！

# ========== 信号的优先级 ==========
# 1. 先用 kill <PID>（SIGTERM）
#    → 进程有机会保存 checkpoint、释放资源、刷新日志
# 2. 等 10 秒还没退出，用 kill -INT <PID>（SIGINT）
#    → 相当于 Ctrl+C，Python 会抛出 KeyboardInterrupt
# 3. 最后才用 kill -KILL <PID>（SIGKILL）
#    → 内核直接终止进程，进程无法清理，可能导致：
#      - checkpoint 损坏（写到一半被杀）
#      - 共享内存泄漏
#      - 临时文件残留
#      - GPU 显存不释放（需要 nvidia-smi 手动清理）

# ========== 常用信号 ==========
# SIGHUP  (1)  挂起（终端关闭时发送）→ nohup 忽略这个
# SIGINT  (2)  中断（Ctrl+C）→ Python 抛出 KeyboardInterrupt
# SIGTERM (15) 终止 → 请求进程退出（默认 kill 发的）
# SIGKILL (9)  强制杀死 → 不可被捕获或忽略，最后手段
# SIGSTOP (19) 暂停 → 不可被捕获
# SIGCONT (18) 继续 → 让暂停的进程继续运行

# ========== kill 怎么用？完整流程示例 ==========
# 先澄清一个常见误解：kill 命令本身"没有返回输出"。
#   - 成功发送信号：什么都不显示（沉默就是成功）
#   - 失败：报错（如 "kill: (12345) - No such process"）
#   - "信号"不是 kill 返回给你的，而是 kill 发给进程的
#   进程收到信号后的反应（退出/暂停/继续）取决于信号类型和进程代码

# 第 1 步：找到要操作的进程 PID
ps -ef | grep train.py
# lxy  12345  1  0 14:00 ?  00:05 python train.py
#         ↑ 这个 12345 就是 PID

# 第 2 步：根据需要发信号
kill 12345                  # 等同 kill -15 / kill -TERM，请求优雅退出
#   （无输出 = 信号已发出。进程通常会自己退出）

# 怎么确认进程退出了？
ps -p 12345                 # 查这个 PID 还在不在
# 若已退出：报 "PID TTY TIME CMD" 但无该进程行（或 PID 变了）
# 更直接：
pgrep -f train.py           # 还能找到 → 没退出；无输出 → 已退出

# 第 3 步：如果 10 秒后还没退出，升级手段
kill -INT 12345             # 等同 Ctrl+C，Python 会抛 KeyboardInterrupt
# 仍无输出。再等几秒看进程：

# 第 4 步：还不退？最后手段
kill -KILL 12345            # 或 kill -9 12345，内核直接杀
#   不可被进程捕获/忽略，一定死

# ========== 用 SIGSTOP/SIGCONT 暂停和恢复进程（演示）==========
# 这两个信号就是 4.2 节 Ctrl+Z/bg 的底层机制，但可以手动发给任意进程
kill -STOP 12345            # 暂停进程（不杀，状态变 T/stopped）
ps -p 12345 -o pid,stat,cmd
# 12345 T python train.py   ← T 表示 stopped（暂停）
kill -CONT 12345            # 让暂停的进程继续运行
ps -p 12345 -o pid,stat,cmd
# 12345 R python train.py   ← R 表示 running（运行中）

# ========== kill -TERM / -INT / -KILL 的区别（一张表记住）==========
# 命令          信号     能被进程捕获？   Python 反应            用途
# kill PID      TERM(15) 能              默认退出，可自定义      首选，优雅退出
# kill -INT PID INT(2)   能              抛 KeyboardInterrupt    等同 Ctrl+C
# kill -KILL PID KILL(9) 不能            立即死，没机会反应      最后手段
#
# "能被捕获"的含义：进程可以用 signal 模块注册处理函数，
#   收到 TERM/INT 时自己决定怎么处理（比如保存 checkpoint 再退）
#   KILL 不可捕获 = 进程代码拦不住，内核直接动手

# ========== Python 程序捕获信号的例子（理解"为什么优先 TERM"）==========
# train.py 里可以这么写：
#   import signal
#   def save_and_exit(signum, frame):
#       torch.save(model.state_dict(), 'ckpt.pth')
#       sys.exit(0)
#   signal.signal(signal.SIGTERM, save_and_exit)   # 收到 TERM 就保存退出
#   signal.signal(signal.SIGINT, save_and_exit)    # 收到 INT(Ctrl+C) 也保存退出
#
# 这样 kill PID（发 TERM）时，程序能优雅保存；但 kill -9 直接杀，没机会保存

# ========== 批量杀进程 ==========
# 杀掉所有 python 进程（危险！确认后再执行）
pkill -f "python train.py"   # 按命令行匹配
kill $(pgrep -f train.py)    # 先找 PID 再杀

```

---

## 五、系统资源监控

### 5.1 CPU 与负载

```bash
# ========== top / uptime ==========
uptime
# 14:30:00 up 7 days,  2:15,  3 users,  load average: 0.5, 0.3, 0.2
#                                ↑     ↑     ↑     ↑
#                             1分钟  5分钟  15分钟  当前登录用户数

# load average 含义：
# 单核 CPU：1.0 = 满载，>1.0 = 过载，<1.0 = 空闲
# 8核 CPU：8.0 = 满载，4.0 = 半载
# 看 15 分钟的值最稳定

# ========== mpstat：多核 CPU 状态 ==========
mpstat -P ALL 1             # 每秒刷新一次，显示所有 CPU 核心
# %usr   = 用户态 CPU（你的程序）
# %sys   = 内核态 CPU（系统调用）
# %iowait = 等 I/O（磁盘/网络）
# %idle  = 空闲
```

### 5.2 内存

```bash
# ========== free：系统内存 ==========
free -h
#               total   used   free   shared  buff/cache  available
# Mem:           62G    12G    20G     2.0G     30G         48G
# Swap:          8G     0B     8G
#
# 关键看 available（可用内存），不是 free
# Linux 会把空闲内存用作缓存（buff/cache），需要时会自动释放
# available = free + 可回收的缓存

# ========== ps：进程内存 ==========
ps aux --sort=-%mem | head -10    # 按内存使用排序，显示前 10

# ========== pmap：进程的内存映射 ==========
pmap -x 12345 | tail -5    # 查看 PID 12345 的内存使用详情

# ========== ps aux --sort=-%mem 逐参数拆解 ==========
# ps aux     ：列出所有进程（a=所有用户, u=显示用户, x=含无终端进程）
# --sort=-%mem：按 %MEM 列降序排（- 表示降序，不加-是升序）
#   %mem 是"进程占用物理内存的百分比"
# | head -10 ：只取前 10 行
#
# 完整输出长这样（列含义）：
# USER  PID  %CPU %MEM    VSZ   RSS   TTY  STAT START  TIME COMMAND
# lxy   12345 150  45.2  20g    28g   ?    Rl   14:00  5:30  python train.py
#  │     │    │    │      │     │     │    │    │      │     │
# 用户  PID  CPU% 内存%  虚拟  物理  终端 状态 启动   CPU  命令
#                  ↑      ↑     ↑
#              关键看这个 RSS = 实际占用的物理内存
#              VSZ = 申请的虚拟内存（通常很大，不一定是真用）
#
# 各列含义：
#   %CPU  CPU 占用率（一个 8 核机器，单进程满载可能显示 100%，多线程可能 >100%）
#   %MEM  物理内存占用百分比（45.2 表示占了总内存的 45.2%）
#   VSZ   Virtual Memory Size，虚拟内存大小（KB），通常很大
#   RSS   Resident Set Size，常驻物理内存（KB），这是"真正占用内存"，最该关注
#   STAT  进程状态：R=运行 S=睡眠 D=不可中断睡眠 T=停止 Z=僵尸
#         带 l=多线程，带 + = 前台进程
#
# 常用变体：
ps aux --sort=-%mem | head -10       # 按内存降序，找最吃内存的进程
ps aux --sort=-%cpu | head -10       # 按 CPU 降序，找最吃 CPU 的进程
ps aux | grep python                  # 只看 python 进程
ps -o pid,rss,vsz,cmd -p 12345        # 只看指定 PID 的内存列（更简洁）

# ========== pmap -x 12345 | tail -5 逐参数拆解 ==========
# pmap     ：Process Map，显示一个进程的内存映射（每段内存是什么）
# -x       ：extended，显示详细信息（含 RSS、Dirty 等）
# 12345    ：目标进程的 PID
# | tail -5：只看最后 5 行（最后有汇总行）
#
# 完整输出长这样：
# Address           Kbytes     RSS   Dirty  Mode  Mapping
# 00007f8c2c000000  1048576   50000       0 rw---   [anon]
# 00007f8c3a000000     1024    1024       0 r-x--   libtorch.so
# ...
# total KB          2097152  512000   12345          ← 汇总行
#
# 列含义：
#   Address  这段内存的起始地址
#   Kbytes   这段内存总大小（KB）
#   RSS      实际占用的物理内存（KB）—— 最该关注
#   Dirty    脏页（被改过还没写回的大小）
#   Mode     权限（r=读 w=写 x=执行）
#   Mapping  这段内存是什么（.so 库名 / [anon] 匿名 / [stack] 栈 / [heap] 堆）
#
# 看最后一行 total 就知道这个进程总共吃了多少内存：
pmap -x 12345 | tail -1
# total KB         2097152  512000   12345
#                   ↑申请2G  ↑实际512M
#
# 什么时候用 pmap？
#   - ps 看到某进程 RSS 很高，想知道内存被什么占了 → 用 pmap -x 看每段
#   - 怀疑某个 .so 库占内存太大 → pmap -x PID | grep libtorch
#   - 排查内存泄漏（RSS 持续增长）→ 定期 pmap 对比
```

### 5.3 磁盘

```bash
# ========== df：文件系统容量 ==========
df -h
# Filesystem  Size  Used  Avail  Use%  Mounted on
# /dev/sda1   500G  300G  200G   60%   /
# /dev/sdb1   2T    1.2T  800G   60%   /data
# 关键看 Use%，超过 90% 需要清理

# ========== du：目录占用 ==========
du -sh /data/logs/           # -s = summary，只显示总计
du -h --max-depth=1 /data/   # 显示 /data/ 下每个子目录的大小

# ========== 找大文件 ==========
find /data -type f -size +1G -exec ls -lh {} \;    # 找大于 1G 的文件
du -ah /data | sort -rh | head -20                 # 按大小排序，显示前 20

# ========== iostat：磁盘 I/O ==========
iostat -x 1                   # 每秒刷新，显示详细 I/O 统计
# %util > 80% 说明磁盘很忙

# ========== 这些指令逐参数拆解 ==========

# ----- find /data -type f -size +1G -exec ls -lh {} \; -----
# find          查找命令
# /data         从 /data 目录开始找
# -type f       只找普通文件（f=file），-type d 是只找目录
# -size +1G     文件大小大于 1G（+ 大于，- 小于，无符号=等于）
#               单位：c=字节 k=KB M=MB G=GB
# -exec ls -lh {} \;   对找到的每个文件执行 ls -lh
#   -exec ... \;       固定语法：-exec 命令 \;
#   {}                 占位符，代表 find 找到的每个文件
#   ls -lh {}          对每个文件执行 ls -lh（显示大小，人类可读）
#
# 输出示例：
# -rw-r--r-- 1 lxy staff 2.3G Jun 28 14:00 /data/model_v1.bin
# -rw-r--r-- 1 lxy staff 1.1G Jun 28 15:00 /data/train_2023.parquet
#
# 常用变体：
find /data -type f -size +1G -mtime -7             # 7天内修改过的大文件
find /data -type f -name "*.pt" -size +1G          # .pt 后缀的大文件
find /data -type f -size +1G -delete               # ⚠️ 删除所有大文件（慎用！先不加 -delete 看一遍）

# ----- du -ah /data | sort -rh | head -20 -----
# du          Disk Usage，统计目录/文件占用的磁盘空间
# -a          all，显示文件和目录（不加 -a 只显示目录）
# -h          human-readable，用 K/M/G 显示
# /data       统计 /data 目录
# | sort -rh  按行排序：-r 降序(reverse)，-h 人类可读数值排序(理解 K<M<G)
# | head -20  取前 20 行
#
# 输出示例：
# 50G   /data/                          ← 第一行通常是总大小
# 30G   /data/models/model_v1.bin
# 15G   /data/train/
# 12G   /data/train/2023.parquet
# ...
#
# 常用变体：
du -sh /data/*               # 看 /data 下每个子项的大小（-s 只显示汇总）
du -h --max-depth=1 /data    # 只看第一层子目录大小
du -ah /data | sort -rh | head -5   # 找最大的 5 个

# ----- iostat -x 1 -----
# iostat        I/O Statistics，磁盘 I/O 统计（sysstat 包，可能要 apt install sysstat）
# -x            extended，显示详细字段
# 1             每隔 1 秒刷新一次（按 Ctrl+C 停止）
#
# 输出示例：
# Device   r/s    w/s   rkB/s   wkB/s  rrqm/s  wrqm/s  %util
# sda      0.00   5.00  0.00    40.00  0.00    0.00    85.0
# sdb      0.00   0.00  0.00    0.00   0.00    0.00    0.0
#
# 关键列：
#   r/s w/s       每秒读/写次数
#   rkB/s wkB/s   每秒读/写的数据量（KB）
#   %util         磁盘繁忙度（0~100%），>80% 说明磁盘成瓶颈了
#
# 排查场景：
#   - 训练 DataLoader 卡顿，怀疑磁盘读不动 → 看 %util 和 rkB/s
#   - 写 checkpoint 很慢 → 看 w/s、wkB/s、%util
#   - 没装 iostat？用 apt install sysstat（Ubuntu）/ yum install sysstat（CentOS）
```

### 5.4 网络

```bash
# ========== ss：查看端口和连接（替代旧版 netstat） ==========
ss -lntp                     # 监听中的 TCP 端口
# -l = listening
# -n = 不解析端口名（显示数字）
# -t = TCP
# -p = 显示进程

ss -ant                      # 所有 TCP 连接
# State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
# LISTEN 0       128     0.0.0.0:8000        0.0.0.0:*

# ========== curl：测试 HTTP ==========
curl -v http://localhost:8000/health    # -v = verbose，显示详细请求/响应
curl -X POST http://api.example.com/predict -d '{"text":"hello"}' -H "Content-Type: application/json"

# ========== nc：测试端口连通性 ==========
nc -vz 192.168.1.100 22       # 测试 192.168.1.100 的 22 端口是否可达
nc -vz gpu-server 29500       # 测试分布式训练端口

# ========== 这三个命令逐参数拆解 + 常用用途 ==========

# ============ ss：查看网络连接和端口（替代 netstat）============
# 用途：① 看哪些端口被占用/被谁占用  ② 看当前有哪些连接
#
# ss -lntp  逐参数：
#   -l   listening，只看正在监听（等待连接）的端口
#   -n   numeric，不把端口解析成名字（显示 8000 而不是 http-alt）
#   -t   TCP，只看 TCP（-u 看 UDP）
#   -p   processes，显示占用端口的进程（需要 sudo 才能看到别人的进程）
#
# 输出示例：
# State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
# LISTEN 0       128     0.0.0.0:8000        0.0.0.0:*          users:(("python",pid=1234,fd=3))
#  ↑状态  ↑接收   ↑发送    ↑本地地址:端口      ↑对方地址          ↑占用进程
#  LISTEN=监听中  队列长度   0.0.0.0=所有网卡                      python 进程 PID 1234 占着 8000
#
# 常用场景：
#   "端口被占用了，谁占的？" → sudo ss -lntp | grep :8000
#   "我的服务到底监听没？" → ss -lntp | grep python
#   "当前有哪些外部连接？"  → ss -ant（看所有 TCP 连接的 State）
#
# ss -ant 逐参数：-a 所有状态(all)、-n 数字、-t TCP
# 输出的 State 列含义：
#   LISTEN     监听中（等服务端连进来）
#   ESTAB      已建立连接（ Established，正在通信）
#   TIME-WAIT  主动关闭后等待（正常，过多才需关注）
#   CLOSE-WAIT 对方关了，你还没关（代码没 close，是 bug）

# ============ curl：测试 HTTP 接口 ============
# 用途：① 调试 API  ② 下载文件  ③ 测试服务是否正常
#
# curl -v http://localhost:8000/health
#   -v   verbose，显示完整的请求和响应过程（握手、请求头、响应头）
#   适合排查"服务起来了但访问不了"
#   输出示例：
#   *   Trying 127.0.0.1:8000...        ← 在连接
#   * Connected to localhost            ← 连上了
#   > GET /health HTTP/1.1              ← 发出的请求行
#   > Host: localhost:8000
#   < HTTP/1.1 200 OK                   ← 收到的响应状态码
#   < Content-Type: application/json
#   {"status":"ok"}                     ← 响应体
#
# curl -X POST http://api.example.com/predict -d '{"text":"hello"}' -H "Content-Type: application/json"
#   -X POST        指定请求方法（默认 GET，POST/PUT/DELETE 要指定）
#   -d '...'       请求体数据（data），发了 -d 会自动变成 POST
#   -H "..."       加请求头（Header），这里指定 JSON 格式
#   完整含义：向 /predict 发一个 POST 请求，body 是 JSON
#
# 常用参数速查：
curl -s http://...           # -s silent，不显示进度（脚本里用）
curl -o file.json http://... # -o 输出到文件（下载）
curl -O http://x/a.tar.gz    # -O 用原文件名保存
curl -i http://...           # -i 显示响应头
curl -w "%{http_code}\n" ... # -w 只输出状态码（脚本判断用）
# 常用场景：
#   测试健康检查：curl http://localhost:8000/health
#   下载模型：    curl -O https://example.com/model.bin
#   调 API：      curl -X POST http://api/predict -d '{"x":1}' -H "Content-Type: application/json"

# ============ nc：测试端口连通性（不关心 HTTP，只看通不通）============
# 用途：① 测端口能不能连  ② 简单的端口扫描  ③ 两台机器间传数据
# nc = netcat，网络"瑞士军刀"
#
# nc -vz 192.168.1.100 22
#   -v   verbose，显示详细信息
#   -z   zero-I/O，只测连通性不发数据（扫描模式）
#   192.168.1.100  目标 IP（也可以用主机名）
#   22   目标端口
#   输出：
#   Connection to 192.168.1.100 22 port [tcp/ssh] succeeded!  ← 通了
#   或
#   nc: connect to 192.168.1.100 port 22 (tcp) failed: Connection refused  ← 端口没服务
#   或
#   nc: connect to ... failed: Connection timed out  ← 被防火墙挡了/机器不可达
#
# 常用场景：
#   "ssh 连不上服务器" → 先 nc -vz 服务器IP 22 看 22 端口通不通
#   "分布式训练连不上" → nc -vz gpu-server 29500（DDP 默认端口）
#   "服务起没起"      → nc -vz localhost 8000
#
# 三者关系（排查"服务访问不了"的顺序）：
#   1. nc -vz host port      → 网络层通不通（最快）
#   2. ss -lntp | grep port  → 端口到底有没有被监听
#   3. curl -v http://host:port/path → 应用层 HTTP 通不通
```

### 5.5 "内存不够"的排查思路

```bash
# "内存不够"至少可能指 5 种情况：
# 1. 主机 RAM 不够        → free -h 看 available
# 2. GPU 显存不够         → nvidia-smi 看 memory
# 3. 共享内存 /dev/shm 不够 → df -h /dev/shm（PyTorch DataLoader 常见）
# 4. 进程地址空间限制      → ulimit -v
# 5. 磁盘满了（不是内存但报错类似） → df -h

# 排查步骤：
free -h                      # 先看主机内存
nvidia-smi                   # 再看 GPU 显存
df -h /dev/shm               # 看共享内存
df -h                        # 看磁盘
ulimit -a                    # 看用户资源限制

# ========== ulimit -a 怎么看？输出逐行解读 ==========
# ulimit 是 shell 内置命令，查看/修改"当前用户能用的资源上限"
# -a = all，显示所有资源限制
#
# 典型输出（每行一个限制项）：
# core file size          (blocks, -c) 0          ← core dump 大小上限，0=不生成
# data seg size           (kbytes, -d) unlimited  ← 数据段
# scheduling priority             (-e) 0
# file size               (blocks, -f) unlimited  ← 单个文件最大多大
# pending signals                 (-i) 63340      ← 待处理信号数
# max locked memory       (kbytes, -l) 65536      ← 锁定内存上限
# max memory size         (kbytes, -m) unlimited
# open files                      (-n) 1024       ← ⚠️ 最多打开文件数（高频坑）
# pipe size            (512 bytes, -p) 8
# POSIX message queues     (bytes, -q) 819200
# real-time priority              (-r) 0
# stack size              (kbytes, -s) 8192       ← 栈大小（8MB）
# cpu time               (seconds, -t) unlimited  ← CPU 时间
# max user processes              (-u) 63340      ← ⚠️ 每用户最多进程数
# virtual memory          (kbytes, -v) unlimited  ← 虚拟内存
# file locks                      (-x) unlimited
#
# 重点关注这两项：
#   open files (-n)   —— "Too many open files" 报错的元凶
#     默认 1024，跑大量文件/数据库/训练时经常不够
#     临时调大：ulimit -n 65535  （只对当前终端有效）
#     永久调大：改 /etc/security/limits.conf 加 * soft nofile 65535
#
#   max user processes (-u) —— "fork: retry: Resource temporarily unavailable"
#     进程/线程数超限，多线程训练时可能撞上
#
# 使用方法：
ulimit -a                    # 查看所有限制
ulimit -n                    # 只看 open files
ulimit -n 65535              # 临时改 open files 到 65535
# 注意：改的限制只对当前 shell 及其子进程生效，重启终端就恢复默认
#       永久生效要改 /etc/security/limits.conf 和 systemd 服务的 LimitNOFILE
```

---

## 六、环境变量

### 6.1 基本操作

```bash
# ========== 设置环境变量 ==========
export CUDA_HOME=/usr/local/cuda
export PATH="$CUDA_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$CUDA_HOME/lib64:${LD_LIBRARY_PATH:-}"

# export 的含义：
# 把变量标记为"环境变量"，子进程能继承
# 不加 export 的变量只在当前 Shell 可见，子进程看不到

# ========== 查看 ==========
env | sort                   # 列出所有环境变量（排序后）
echo $CUDA_HOME              # 查看特定变量
echo $PATH                   # 查看 PATH（命令搜索路径）

# ========== which / type：命令来自哪里 ==========
which python                 # /home/lxy/miniconda3/bin/python
which -a python              # 显示所有同名的 python（PATH 中有多个时）
type -a python               # 更详细：包括 alias、function、builtin

# ========== env | sort 按什么排序？==========
# env        列出所有环境变量，每行一个，格式 "KEY=value"
# | sort     按每行【整行】做字典序排序（ASCII 码顺序），从小到大（A→Z）
#            排序的是【行首字符】，所以是按【变量名(KEY)】排序的
#
# 字典序规则（ASCII 顺序，从小到大）：
#   数字 0-9 (48-57) < 大写 A-Z (65-90) < 小写 a-z (97-122)
#   所以排序后：CUDA_HOME、HOME、LANG、LD_LIBRARY_PATH、PATH...
#   （大写字母开头的在前，按字母顺序）
#
# 常见变体：
env | sort                   # 默认按整行字典序升序（最常用）
env | sort -r                # -r 降序（Z→A）
env | sort -t= -k1           # -t= 用=分隔，-k1 按第1字段(变量名)排序（和默认差不多）
env | grep -i cuda           # 只看含 cuda 的环境变量（不区分大小写）
env | wc -l                  # 数一下有多少个环境变量

# ========== which vs which -a vs type -a 区别 ==========
# 先理解 PATH：它是一组目录（用 : 分隔），Shell 执行命令时按顺序在这些目录里找
# echo $PATH
# /home/lxy/miniconda3/bin:/usr/local/cuda/bin:/usr/bin:/bin
#
# which python
#   只显示【第一个】找到的 python（按 PATH 顺序，找到就停）
#   输出：/home/lxy/miniconda3/bin/python
#   用途：确认"我现在敲 python 用的是哪个"（conda? 系统?）
#
# which -a python
#   -a = all，显示【所有】PATH 里能找到的同名 python
#   输出可能是：
#   /home/lxy/miniconda3/bin/python
#   /usr/bin/python
#   用途：排查"为什么用的不是我想要的 python"——看 PATH 里到底有几个
#
# type -a python
#   type 是 shell 内置命令（which 是外部程序），能看到【所有类型】的命令来源：
#     - alias（别名）
#     - function（函数）
#     - builtin（shell 内置，如 cd、echo）
#     - file（可执行文件，相当于 which 的结果）
#   输出示例：
#   python is /home/lxy/miniconda3/bin/python
#   python is /usr/bin/python
#   （如果设了别名还会显示：python is aliased to `python3'）
#
# 什么时候用哪个？
#   which xxx    → 只想知道可执行文件在哪（够用）
#   which -a xxx → 怀疑 PATH 里有多个同名命令，想全列出来
#   type -a xxx  → 命令"行为不对"，想看是不是被 alias/function 拦截了
#
# 例子：为什么 `ls` 有颜色？type -a ls 会告诉你 ls 是个 alias
#   type ls
#   ls is aliased to `ls --color=auto'   ← 真相：ls 被 alias 加了 --color

# ========== 只在当前命令有效的环境变量 ==========
CUDA_VISIBLE_DEVICES=0 python train.py    # 只对这条命令设置
# 等价于：
# export CUDA_VISIBLE_DEVICES=0
# python train.py
# 但前者不污染后续命令的环境
```

### 6.2 持久化环境变量

```bash
# ========== 写入 ~/.bashrc（推荐） ==========
# ~/.bashrc 在每次启动新的交互式 Shell 时执行
echo 'export CUDA_HOME=/usr/local/cuda' >> ~/.bashrc
echo 'export PATH="$CUDA_HOME/bin:$PATH"' >> ~/.bashrc

# 修改 ~/.bashrc 后需要重新加载：
source ~/.bashrc             # 或：. ~/.bashrc（. 是 source 的简写）

# ⚠️ 重要：修改 ~/.bashrc 不会影响已经运行的终端、IDE 或服务
# 需要重新打开终端，或在该终端中 source ~/.bashrc
# IDE（如 VSCode）需要重启才能继承新的环境变量

# ========== ~/.bashrc vs ~/.bash_profile vs ~/.profile ==========
# ~/.bash_profile : 登录 Shell 执行（SSH 登录时）
# ~/.bashrc       : 交互式非登录 Shell 执行（打开新终端时）
# ~/.profile      : 所有 Shell 都可能执行
# 通常在 ~/.bash_profile 中 source ~/.bashrc

# ========== 详细解释：Shell 的四种分类（决定加载哪个文件）==========
# Shell 有两个维度，组合出四种场景：
#
# 维度一：登录(login) vs 非登录(non-login)
#   登录 Shell   ：需要输用户名/密码才进入的（或带 -l/--login 参数）
#     - ssh user@host              ← SSH 登录 ✅ 登录 Shell
#     - su - user / su -l user     ← 带 - 的 su ✅ 登录 Shell
#     - 本机 tty 控制台登录         ← ✅ 登录 Shell
#   非登录 Shell  ：在已经登录后再开的
#     - 在桌面环境里打开终端窗口      ← 非登录 Shell（多数情况）
#     - bash 子进程                 ← 非登录 Shell
#
# 维度二：交互(interactive) vs 非交互(non-interactive)
#   交互 Shell   ：能跟你互动，有提示符，你敲命令它执行
#     - SSH 登录后的终端             ← 交互 Shell
#     - IDE(VSCode) 里新开终端       ← 交互 Shell
#     - 桌面终端窗口                 ← 交互 Shell
#   非交互 Shell  ：没有提示符，通常用来跑脚本
#     - bash script.sh              ← 非交互 Shell
#     - ssh user@host "nvidia-smi"  ← 非交互（执行完就退出）
#     - cron 定时任务                ← 非交互
#
# ========== 四种组合分别加载哪些文件（以 bash 为例）==========
#
# ┌─────────────┬──────────────┬──────────────────────────────────┐
# │             │  交互        │  非交互                          │
# ├─────────────┼──────────────┼──────────────────────────────────┤
# │ 登录 Shell  │ /etc/profile │ （罕见，基本不出现）              │
# │             │ ~/.bash_profile (或 ~/.profile)│               │
# │             │ → 然后 ~/.bashrc（如果 profile 里 source 了） │
# ├─────────────┼──────────────┼──────────────────────────────────┤
# │ 非登录 Shell│ ~/.bashrc    │ $BASH_ENV 指向的文件（默认不加载）│
# └─────────────┴──────────────┴──────────────────────────────────┘
#
# 关键结论（回答你的疑问）：
#
# Q: bash_profile 是只有 SSH 登录才执行吗？
# A: 准确说是"登录 Shell"才执行。SSH 登录是登录 Shell，所以会执行。
#    本机 tty 登录、su - 也是登录 Shell，也会执行。
#    但桌面/IDE 里"新开终端"通常是【非登录交互 Shell】，只加载 ~/.bashrc，
#    不加载 ~/.bash_profile。
#
# Q: IDE 已登录后新增终端会执行哪个？
# A: 看 IDE 终端的启动方式：
#    - VSCode/PyCharm 默认开的是【非登录交互 Shell】→ 只执行 ~/.bashrc
#    - 如果 IDE 设置里勾了 "Run as login shell" → 才执行 ~/.bash_profile
#    （VSCode: 在 settings.json 加 "terminal.integrated.profiles.linux.args": ["-l"]）
#    所以如果你在 ~/.bash_profile 里设的环境变量，IDE 终端没生效，
#    八成是因为 IDE 开的是非登录 Shell，根本没读 ~/.bash_profile。
#
# ========== 为什么推荐"在 ~/.bash_profile 里 source ~/.bashrc" ==========
# 因为登录 Shell 只读 ~/.bash_profile 不读 ~/.bashrc，
# 如果你的配置都写在 ~/.bashrc，SSH 登录(登录 Shell)就拿不到。
# 在 ~/.bash_profile 里加一行 source ~/.bashrc，两边就都覆盖了：
#
#   ~/.bash_profile 内容：
#   if [ -f ~/.bashrc ]; then
#       source ~/.bashrc
#   fi
#
# 这样无论登录/非登录，~/.bashrc 都会被执行，配置就统一了。

# ========== 常见场景速查表 ==========
# ┌──────────────────────────┬─────────────┬────────────┐
# │ 场景                     │ 执行的文件  │ Shell 类型 │
# ├──────────────────────────┼─────────────┼────────────┤
# │ ssh user@host            │ .bash_profile(+.bashrc)│ 登录交互  │
# │ ssh user@host "cmd"      │ $BASH_ENV   │ 非登录非交互│
# │ 桌面终端开窗口           │ .bashrc     │ 非登录交互 │
# │ VSCode 新终端(默认)      │ .bashrc     │ 非登录交互 │
# │ VSCode 新终端(开login)   │ .bash_profile(+.bashrc)│ 登录交互 │
# │ bash script.sh           │ 无(只读$BASH_ENV)      │ 非登录非交互│
# │ crontab 定时任务         │ 无(环境很简陋)         │ 非登录非交互│
# │ su - user                │ .bash_profile(+.bashrc)│ 登录交互  │
# │ su user(不带-)           │ 无(只读.bashrc?)       │ 非登录交互│
# └──────────────────────────┴─────────────┴────────────┘
#
# 实践建议：
#   1. 把环境变量、alias、PATH 都写在 ~/.bashrc（最常被加载）
#   2. ~/.bash_profile 里写一行 source ~/.bashrc 兜底登录场景
#   3. 服务/脚本/cron 需要的环境变量，别依赖这些文件，要在脚本里自己 export
```

### 6.3 常见 AI 开发环境变量

```bash
# ========== CUDA 相关 ==========
export CUDA_HOME=/usr/local/cuda
export PATH="$CUDA_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$CUDA_HOME/lib64:${LD_LIBRARY_PATH:-}"
export CUDA_VISIBLE_DEVICES=0,1    # 只使用 0 号和 1 号 GPU

# ========== Python 相关 ==========
export PYTHONPATH=/home/lxy/projects:$PYTHONPATH  # 自定义模块搜索路径
export PYTHONDONTWRITEBYTECODE=1    # 不生成 .pyc 文件

# ========== 分布式训练 ==========
export MASTER_ADDR=192.168.1.100    # 主节点地址
export MASTER_PORT=29500            # 主节点端口
export WORLD_SIZE=4                 # 总进程数
export RANK=0                       # 当前进程的 rank

# ========== 用 env -i 在干净环境中复现问题 ==========
env -i HOME="$HOME" PATH=/usr/bin:/bin bash --noprofile --norc
# -i = 忽略所有环境变量，从空白开始
# 然后手动添加需要的变量
# 用于排查"在我的环境能跑但在你那里不行"的问题

# ========== 这条命令逐参数拆解 ==========
# env          环境变量管理命令，"env 命令 [参数]" 表示【在指定环境变量下运行命令】
# -i           ignore，忽略继承的所有环境变量，从一个【空白环境】开始
# HOME="$HOME" 这是给新环境的变量：HOME = 当前 Shell 的 $HOME（保留家目录）
# PATH=/usr/bin:/bin  新环境的 PATH，只含系统基础目录（没有 conda/cuda）
# bash         在上面构造的环境里启动一个 bash
# --noprofile  启动 bash 时【不读】 ~/.bash_profile / ~/.profile
# --norc       启动 bash 时【不读】 ~/.bashrc
#
# 整条命令的含义：
#   开一个"最干净"的 bash —— 没有继承环境变量、不加载任何配置文件，
#   只有 HOME 和最基础的 PATH，用来排除"我环境里某配置捣乱"的干扰
#
# ========== 为什么需要"干净环境"？典型场景 ==========
# 场景：你 pip install 的包能跑，同事的机器报错。怀疑是环境变量/配置文件捣乱。
#   用 env -i 进入干净环境，手动逐步添加变量，看加到哪个就出问题 → 定位元凶
#
# ========== 实操演示：怎么用 ==========
# 第 1 步：进入干净环境
env -i HOME="$HOME" PATH=/usr/bin:/bin bash --noprofile --norc
# 现在提示符可能变成 bash-5.1$ （因为 PS1 也没了），这是正常的

# 第 2 步：看看环境有多"干净"
env                          # 只有 HOME 和 PATH 两个变量
echo $CUDA_HOME              # 空（被 -i 清掉了）
which python                 # /usr/bin/python 或报错（conda 没了）

# 第 3 步：手动添加怀疑有问题的变量，逐个测试
export PATH="/home/lxy/miniconda3/bin:$PATH"
python -c "import torch; print(torch.__version__)"
# 如果现在能跑了 → 说明问题在 PATH
# 如果还报错 → 继续加其他变量（CUDA_HOME、LD_LIBRARY_PATH...）

# 第 4 步：排查完，exit 退出干净环境，回到正常 Shell
exit

# ========== 进阶用法 ==========
# 只测一条命令，不进入交互式 Shell：
env -i PATH=/usr/bin:/bin python -c "import torch"
# 含义：在干净环境(只有PATH)下跑这一句 python，看报不报错

# 带上 BASH_ENV 给非交互 bash 脚本指定配置：
env -i BASH_ENV=./test_env.sh bash script.sh

# 小结：env -i 是"排除变量法"——把环境清空，逐个加回来，
#       哪一步出问题，哪个变量就是元凶。比在 .bashrc 里注释来注释去高效得多。
```

---

## 七、SSH 与远程操作

### 7.1 SSH 基本配置

```bash
# ========== 生成密钥对 ==========
ssh-keygen -t ed25519 -C "your-email@example.com"
# -t ed25519: 使用 Ed25519 算法（比 RSA 更安全更快）
# -C: 注释（通常写邮箱）
# 生成两个文件：
#   ~/.ssh/id_ed25519     私钥（绝对不能泄露！）
#   ~/.ssh/id_ed25519.pub 公钥（可以给别人）

# ========== 把公钥拷贝到服务器 ==========
ssh-copy-id user@gpu-server
# 把公钥追加到服务器的 ~/.ssh/authorized_keys
# 之后 SSH 登录不再需要输密码

# ========== 基本登录 ==========
ssh user@192.168.1.100
ssh user@gpu-server          # 用 /etc/hosts 或 ~/.ssh/config 中的别名

# ========== 执行远程命令后立即返回 ==========
ssh gpu-server "nvidia-smi"
ssh gpu-server "df -h /data"
```

### 7.2 SSH Config（强烈推荐）

```bash
# ~/.ssh/config 文件，简化日常使用

Host gpu-dev
    HostName 192.168.1.100
    User lxy
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60        # 每 60 秒发心跳包，防止连接断开
    ServerAliveCountMax 3         # 3 次心跳无响应才认为断开

Host gpu-prod
    HostName 10.0.0.50
    User deploy
    IdentityFile ~/.ssh/deploy_key
    Port 2222                     # 非默认端口

# 配置好后直接用别名：
ssh gpu-dev                      # 等价于 ssh -i ~/.ssh/id_ed25519 lxy@192.168.1.100
scp file.tar.gz gpu-dev:~/        # 拷贝文件
rsync -av ./project/ gpu-dev:~/project/  # 同步目录
```

### 7.3 文件传输

```bash
# ========== scp：简单拷贝 ==========
scp train.py gpu-dev:~/projects/          # 本地 → 远程
scp gpu-dev:~/results/metrics.json ./     # 远程 → 本地
scp -r configs/ gpu-dev:~/projects/       # -r 递归拷贝目录

# ========== rsync：增量同步（推荐） ==========
rsync -av --progress ./project/ gpu-dev:~/project/
# -a = archive 模式（递归 + 保留权限/时间/软链接等）
# -v = verbose
# --progress = 显示传输进度

# ⚠️ 源路径末尾的 / 很重要！
rsync -av ./data/ gpu-dev:~/data/     # 把 data/ 里的内容拷到远程的 data/
rsync -av ./data gpu-dev:~/           # 把 data 目录本身拷到远程的 home

# rsync 的优势：
# 1. 增量传输：只传有变化的部分（scp 每次全量传输）
# 2. 断点续传：中断后重新运行会跳过已传完的文件
# 3. 可排除文件：--exclude='*.pyc' --exclude='__pycache__/'

# ========== --exclude 怎么用？从单个到多个 ==========
#
# 排除单个文件类型：
rsync -av --exclude='*.pyc' ./project/ gpu-dev:~/project/
#   --exclude='*.pyc'  不传所有 .pyc 文件（模式匹配，不是完整路径）

# 排除单个文件夹：
rsync -av --exclude='__pycache__/' ./project/ gpu-dev:~/project/
#   末尾加 / 表示"只排除目录"，不加 / 则目录和同名文件都排除

# 排除多个（写多个 --exclude）：
rsync -av \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  --exclude='.git/' \
  --exclude='*.log' \
  --exclude='node_modules/' \
  ./project/ gpu-dev:~/project/
#   每行一个 --exclude，可读性好，适合 3~5 个

# 排除很多个？用 --exclude-from 从文件读：
# 先建一个排除清单文件 exclude.txt：
#   *.pyc
#   __pycache__/
#   .git/
#   *.log
#   node_modules/
#   .venv/
#   *.egg-info/
rsync -av --exclude-from='exclude.txt' ./project/ gpu-dev:~/project/
#   --exclude-from='文件'  每行一个模式，方便维护（可加入 git 跟踪）

# ========== exclude 模式书写规则（容易踩坑） ==========
# 模式是相对于【源路径】的，不是绝对路径：
rsync -av --exclude='logs/' ./project/ gpu-dev:~/project/
#   排除 ./project/logs/，但不会排除 ./project/sub/logs/

# 想排除所有层级的 logs/：
rsync -av --exclude='logs' ./project/ gpu-dev:~/project/
#   不带 / 的模式会匹配任意层级的同名文件/目录

# 以 / 开头表示"锚定到源根目录"：
rsync -av --exclude='/logs' ./project/ gpu-dev:~/project/
#   只排除 ./project/logs/（根层），不排除 ./project/sub/logs/

# 通配符：
#   *     匹配任意字符（不含 /）
#   **    匹配任意层级（rsync 3.x 需要额外参数，实际 * 配合无 / 已够用）
#   ?     匹配单个字符
#   [abc] 匹配 a/b/c 中任一个

# ========== 常用 exclude 清单（Python/ML 项目模板） ==========
# 建议在项目根放一个 .rsync-exclude 文件，内容：
#   __pycache__/
#   *.pyc
#   *.pyo
#   .git/
#   .venv/
#   venv/
#   *.egg-info/
#   .pytest_cache/
#   .mypy_cache/
#   runs/
#   wandb/
#   *.log
#   *.ckpt
#   checkpoints/
# 每次同步：
rsync -av --exclude-from='.rsync-exclude' ./project/ gpu-dev:~/project/

# ========== 同时排除和包含（--include 优先级更高） ==========
# 想传 .git/ 但排除 .git/objects（太大）：
rsync -av --include='.git/' --exclude='.git/objects/' ./project/ gpu-dev:~/project/
#   规则：rsync 按顺序匹配，先 include 优先；include 必须写在对应 exclude 之前

# ========== 共享机器上的安全红线 ==========
# 学校/公司 GPU 服务器是多人共用，最容易出安全事故：
#
# 1. 私钥永远只在本地，绝不传到服务器
#    ❌ scp ~/.ssh/id_ed25519 gpu-dev:~/.ssh/      # 千万别这么做
#    ✅ 只把 ~/.ssh/id_ed25519.pub 放到服务器的 authorized_keys
#
# 2. 敏感数据（数据集、模型权重、内部代码）不要留在共享机器的 /tmp
#    /tmp 任何用户都能读，用完及时清理或放自己的家目录并 chmod 700
#
# 3. .env / 配置文件里的 token、API key
#    chmod 600 .env          # 只有自己能读
#    不要 git add .env       # 加进 .gitignore
#
# 4. 离开时确认没有把私钥权限设成 644（应该是 600）
ls -l ~/.ssh/id_ed25519
# -rw------- ...   ← 正确，600
# -rw-r--r-- ...   ← 危险，别人能读，立刻 chmod 600
```

---

## 八、动态库与环境

> 📺 **动手实践**：本章命令的可复现 Demo 见 [`Linux动态库调试_Demo实践.md`](./Linux动态库调试_Demo实践.md)（用一个小项目跑通 ldd / readelf / nm / ldconfig / RPATH 的完整输入输出）

### 8.1 动态库搜索路径

```bash
# ========== 程序运行时需要找到动态库（.so 文件） ==========
# 搜索顺序：
# 1. 编译时写入的 RPATH/RUNPATH
# 2. LD_LIBRARY_PATH 环境变量
# 3. /etc/ld.so.cache 缓存（由 ldconfig 更新）
# 4. 默认目录：/lib, /usr/lib

# ========== 临时设置（诊断用） ==========
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
python train.py

# ⚠️ 不要把 LD_LIBRARY_PATH 写进 ~/.bashrc 作为长期方案
# 它可能影响其他程序的库加载，造成难以排查的冲突
# 正确做法：用 RPATH 或把库安装到标准目录

# ========== 查看程序依赖的动态库 ==========
ldd build/app
# linux-vdso.so.1 (0x...)
# libtorch.so => /usr/local/lib/libtorch.so (0x...)
# libcudart.so.12 => /usr/local/cuda/lib64/libcudart.so.12 (0x...)
# not found  ← 这个库找不到！需要排查

# ========== readelf：查看二进制的动态段 ==========
readelf -d build/app | grep NEEDED    # 查看需要的动态库
readelf -d build/app | grep RUNPATH   # 查看编译时设置的搜索路径

# ========== nm：查看符号 ==========
nm -C libmymath.so | grep add    # 查看库中是否有 add 符号（-C 反修饰 C++ 名称）
# T = 在 .text 段（有定义）
# U = 未定义（需要从其他库链接）

# ========== 先回答一个新人高频疑问：app 是什么？ ==========
# 这里的 "app" 不是什么特殊东西，就是【可执行文件的名字】。
# 它来自编译命令的 -o 参数：
#   g++ main.cpp -o app    ← -o app 表示输出文件叫 app
#   g++ main.o add.o -o app
# 你完全可以叫别的名字：g++ main.cpp -o mytrain → 产物叫 mytrain
# 之后 ldd mytrain、readelf -d mytrain 都行，名字只是个标签。
#
# 为什么你之前在 `cpp/编译链接模板与构建系统.md` 的 CMake 项目里
# 没看到 "app" 这个东西？
# 因为那个 CMake 项目(7.5 节)的可执行文件叫 `vector_ops_app`，不叫 app：
#   add_executable(vector_ops_app src/main.cpp)
# 产物在 build/vector_ops_app（不是 build/app）。
# 所以在那篇笔记里，对应的命令应该写成：
#   ldd build/vector_ops_app
#   readelf -d build/vector_ops_app
# 本质完全一样——ldd/readelf/nm 后面跟的就是【可执行文件或库的路径】。

# ========== 用 cpp 笔记的 vector_ops 项目做完整演示 ==========
# 引用 `cpp/编译链接模板与构建系统.md` 7.5 节的项目（vector_ops/），
# 假设你已经按那篇笔记 cmake --build build 编译出了 build/vector_ops_app。
#
# 项目结构（见 cpp 笔记 7.2 节）：
# vector_ops/
# ├── CMakeLists.txt
# ├── include/vector_ops.h
# └── src/{vector_ops.cpp, main.cpp}
# 编译产物：build/vector_ops_app（可执行文件）+ build/libvector_ops.a（静态库）

cd vector_ops                # 进项目目录

# ----- ldd：看可执行文件依赖哪些动态库 -----
ldd build/vector_ops_app
# 输出示例：
#   linux-vdso.so.1 (0x00007ffd2f9fe000)
#   libstdc++.so.6 => /lib/x86_64-linux-gnu/libstdc++.so.6 (0x...)
#   libm.so.6 => /lib/x86_64-linux-gnu/libm.so.6 (0x...)
#   libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x...)
#   /lib64/ld-linux-x86-64.so.2 (0x...)
# 每行含义：
#   库名 => 它在系统里的实际路径 (加载地址)
#   出现 "=> not found" 就是找不到这个库（运行会报错）
#   linux-vdso 是虚拟库（内核提供的，不是真文件，正常现象）
# 怎么用：程序运行报 "cannot open shared object file" 时，先 ldd 看哪个 not found

# ----- readelf -d：看二进制的"动态段"（NEEDED/RPATH/RUNPATH）-----
readelf -d build/vector_ops_app | grep NEEDED
# 输出：
# 0x0000000000000001 (NEEDED)  Shared library: [libstdc++.so.6]
# 0x0000000000000001 (NEEDED)  Shared library: [libc.so.6]
#   NEEDED = 这个程序运行时需要的动态库清单（编译时由链接器写入）
#   注意：只列出动态库依赖；静态库(.a)在链接时已经"复制进去"了，不出现在这里
#         （vector_ops 用的是 libvector_ops.a 静态库，所以这里看不到它——正常）

readelf -d build/vector_ops_app | grep -i path
# 输出：（可能为空，表示没设 RPATH/RUNPATH）
# 0x000000000000001d (RUNPATH)  Library runpath: [/some/path]
#   RPATH/RUNPATH = 编译时写进二进制的"库搜索路径"
#   没设就是空。要设的话在 g++ 加 -Wl,-rpath,/path（见 cpp 笔记 A.11 节）

# ----- nm：看二进制里的符号（函数/变量）-----
nm -C build/vector_ops_app | grep -i sum
# 输出：
# 0000000000001199 T sum(std::vector<float, std::allocator<float> > const&)
#   T = 这个符号在 .text 段（有定义，即这个程序的代码里有 sum 的实现）
# nm -C 的 -C = demangle，把 C++ 修饰名还原成人话
#   不加 -C 会看到：_Z3sumRSt6vectorIfSaIfEE （这串乱码就是 name mangling）

# 看哪些符号是"未定义的"（要靠外部库提供）：
nm -C build/vector_ops_app | grep ' U '
#                  U std::cout          ← U = undefined，运行时要靠 libstdc++ 提供
#                  U __libc_start_main   ← 要靠 libc 提供
# U 不是错误，是正常的——程序总要依赖标准库

# ----- 对静态库也能用 nm -----
nm -C build/libvector_ops.a
# 输出：
# vector_ops.cpp.o:
# 0000000000000000 T sum(std::vector<float, ...> const&)
#   能看到库里有 sum 符号 → 确认库编译对了

# ========== 三个命令一句话区分 ==========
# ldd       看"运行时依赖哪些 .so"           → 排查 "找不到库"
# readelf   看"二进制里写了什么（NEEDED/RPATH）" → 排查"为什么去那个路径找库"
# nm        看"符号表（有哪些函数，定义了没）"   → 排查"undefined reference / 链接问题"
```

### 8.2 常见的"找不到库"排查

```bash
# 场景：运行程序报错 "error while loading shared libraries: libxxx.so: cannot open shared object file"

# 步骤 1：确认程序需要哪些库
ldd app | grep "not found"
# libxxx.so => not found

# 步骤 2：找这个库在系统哪里
find / -name "libxxx.so*" 2>/dev/null
# /usr/local/custom/lib/libxxx.so

# 步骤 3：把目录加到搜索路径
export LD_LIBRARY_PATH=/usr/local/custom/lib:$LD_LIBRARY_PATH

# 步骤 4：再试一次
ldd app | grep libxxx
# libxxx.so => /usr/local/custom/lib/libxxx.so ✅

# 步骤 5：如果需要持久化，写入 /etc/ld.so.conf.d/xxx.conf
echo "/usr/local/custom/lib" | sudo tee /etc/ld.so.conf.d/custom.conf
sudo ldconfig    # 更新缓存

# ========== tee 是什么？为什么这里要用它？==========
# tee 命令：从 stdin 读数据，同时写到【文件】和【stdout】（像三通管，分流）
# 名字来自水管"T 型接头"——水流进来，分两路出去
#
# 为什么不能直接 sudo echo "..." > /file？
#   因为 shell 解析重定向 > 时是用【当前用户】身份打开文件，
#   sudo 只作用于 echo 命令，不作用于 > 重定向！
#   当前用户没权限写 /etc/...，所以会报 "Permission denied"
#   ❌ sudo echo "x" > /etc/file        → 重定向失败（sudo 管不到 >）
#
# 用 tee 解决：tee 以 sudo 身份运行，由它来打开文件写入
#   ✅ echo "x" | sudo tee /etc/file    → echo 的输出经管道给 sudo tee，tee 写文件
#
# tee 的基本用法：
echo "hello" | tee a.txt      # 写到 a.txt，同时屏幕也显示 hello
echo "hello" | tee a.txt b.txt # 同时写到 a.txt 和 b.txt
echo "hello" | tee -a log.txt  # -a = append 追加（不加 -a 是覆盖）
# 屏幕输出：hello
# cat log.txt: hello（已追加）

# 本例拆解：
# echo "/usr/local/custom/lib"   → 输出一行路径
# |                              → 管道把输出交给后面的 tee
# sudo tee /etc/ld.so.conf.d/custom.conf
#   → tee 以 root 身份把这行写到 custom.conf 文件
#   （同时屏幕也会回显这行，因为 tee 默认也输出到 stdout）

# ========== ldconfig 是什么？为什么能直接 sudo ldconfig ==========
# ldconfig = dynamic linker configuration，动态链接器配置工具
# 作用：扫描 /etc/ld.so.conf、/etc/ld.so.conf.d/*.conf 里列出的目录，
#       以及默认目录(/lib /usr/lib)，把里面所有 .so 库建立一份"索引缓存"
#       缓存文件在 /etc/ld.so.cache，程序运行时动态加载器靠它快速找库
#
# 为什么需要它？
#   程序运行时找 .so 的顺序（见 8.1 节）里有一步是查 /etc/ld.so.cache
#   你往 /usr/local/lib 放了新库，或者改了 ld.so.conf.d 的配置，
#   不跑 ldconfig，缓存还是旧的 → 程序还是找不到新库
#   跑了 ldconfig，缓存更新 → 程序下次运行就能找到了
#
# 为什么直接 sudo ldconfig 不带任何参数也能用？
#   ldconfig 不带参数时，默认行为就是"重新扫描所有配置目录、重建缓存"
#   这正是我们想要的——刚加了 custom.conf，让它重新扫描一遍
#   所以 sudo ldconfig = 用 root 权限重建动态库缓存（最常用形式）
#
# ldconfig 常用变体：
sudo ldconfig               # 重建缓存（最常用，装新库后跑一下）
sudo ldconfig -v            # -v verbose，显示扫描过程（看它扫了哪些目录、加了哪些库）
ldconfig -p | grep libxxx   # -p print，查缓存里有没有某个库（不用 sudo，只读缓存）
#   ldconfig -p 输出当前缓存内容，grep 用来确认"库是否已进缓存"

# ========== 完整的"装自定义库"流程（回顾） ==========
# 1. 把库放到 /usr/local/custom/lib/libxxx.so
# 2. echo "目录路径" | sudo tee /etc/ld.so.conf.d/custom.conf   （告诉系统去哪找）
# 3. sudo ldconfig                                              （重建缓存）
# 4. ldconfig -p | grep libxxx                                  （验证已进缓存）
# 5. ldd 你的程序 | grep libxxx                                  （验证程序能找到了）
# 这样比 LD_LIBRARY_PATH 更持久，重启后也生效，是生产环境的推荐做法
```

---

## 九、调试原生程序

> 📺 **动手实践**：本章命令的可复现 Demo 见 [`Linux原生程序调试_Demo实践.md`](./Linux原生程序调试_Demo实践.md)（用 4 个会崩的小程序跑通 GDB / core dump / ASan / strace 的完整输入输出）

### 9.1 编译带调试信息

```bash
# ========== 编译时加 -g ==========
g++ -g -O0 main.cpp -o app_debug    # -g 加调试信息, -O0 不优化
g++ -g -O2 main.cpp -o app          # -O2 优化但保留调试信息（用于 release 排查）

# ========== AddressSanitizer：检测内存错误 ==========
g++ -fsanitize=address,undefined -g -O0 main.cpp -o app_asan
./app_asan
# ASAN 能检测：
# - 越界访问（数组越界、堆越界）
# - use-after-free（释放后使用）
# - 内存泄漏
# - 整数溢出（UBSan 部分）

# ========== ThreadSanitizer：检测数据竞争 ==========
g++ -fsanitize=thread -g -O0 main.cpp -o app_tsan
./app_tsan
# ⚠️ ASAN 和 TSAN 不能同时使用

# ========== GDB vs Sanitizer：什么时候用哪个 ==========
# 这是新人最常混淆的，先记住分工：
#
#   GDB       回答 "在哪里崩"     → 崩溃后看调用栈，定位到某行
#   ASan      回答 "哪次非法内存操作造成的它" → 在出错的那条指令当场停下
#   UBSan     回答 "哪行触发了未定义行为"    → 即使没崩也报出来
#   TSan      回答 "哪两个线程发生了数据竞争" → 报告两个线程的调用栈
#   MSan      回答 "哪个未初始化的值被用了"   → 只 Clang 支持
#
# 典型流程：
#   1. 程序崩了 → 先 gdb + core dump 看 bt，知道大概在哪
#   2. 用 ASan/UBSan 重编再跑一次 → 它会在"第一次出错"时停下来，
#      而不是等到崩溃（崩溃点往往离真正的 bug 很远）
#   3. 调数据竞争 → 单独用 TSan（不能和 ASan 同用）
#
# 关键区别：GDB 是"事后分析"，Sanitizer 是"当场抓获"。
# 很多内存错误用 GDB 只能看到崩溃现场（已经晚了），
# 而 ASan 能在越界访问发生的那一条指令就停下来。

# ========== 优化版（Release）崩溃了怎么办 ==========
# 别用 -O0 重编去复现，可能因为优化级别不同就复现不了了
# 正确做法：保留优化，只加调试信息
g++ -O2 -g main.cpp -o app_release    # 优化 + 调试信息
# 这样产生的 core dump 有可读的调用栈（带文件名行号），
# 既复现了 release 的崩溃，又能用 gdb 看到源码位置
# ⚠️ 注意：-O2 下变量可能被优化掉，print 某些变量会显示 <optimized out>
#         这是正常的，配合 ASan 通常能补上这块信息
```

### 9.2 GDB 基本操作

```bash
# ========== 启动 GDB ==========
gdb ./app
gdb ./app core_dump_file    # 分析 core dump

# ========== 基本命令 ==========
(gdb) break main            # 在 main 函数设断点
(gdb) break file.cpp:42     # 在 file.cpp 第 42 行设断点
(gdb) break func if x > 10  # 条件断点

(gdb) run                   # 开始运行
(gdb) run arg1 arg2         # 带参数运行

(gdb) next                  # 单步（不进入函数）
(gdb) step                  # 单步（进入函数）
(gdb) continue              # 继续运行到下一个断点

(gdb) print variable        # 查看变量值
(gdb) print *ptr            # 查看指针指向的值
(gdb) print arr@10          # 查看数组前 10 个元素

(gdb) backtrace             # 查看调用栈（崩溃时最重要！）
(gdb) bt full              # 查看调用栈 + 所有局部变量

(gdb) info locals           # 查看当前函数的所有局部变量
(gdb) info args             # 查看函数参数

(gdb) list                  # 查看当前位置周围的源码
(gdb) frame 2               # 切换到调用栈的第 2 帧

(gdb) quit                  # 退出

# ========== 实际调试流程 ==========
# 1. 程序崩溃了，有 core dump
gdb ./app core
(gdb) bt                    # 看调用栈，确定在哪里崩的
(gdb) frame 3               # 切到出错的函数
(gdb) print *this           # 查看关键变量
(gdb) list                  # 看源码
```

### 9.3 strace：追踪系统调用

```bash
# ========== strace：看程序在系统层面做了什么 ==========
strace -f -o trace.log ./app
# -f = 跟踪子进程
# -o = 输出到文件

# 常用过滤：
strace -f -e trace=open,openat ./app    # 只看文件打开操作
strace -f -e trace=network ./app        # 只看网络操作

# 排查"找不到文件/库"：
strace -f ./app 2>&1 | grep -i "enoent\|eacces"
# ENOENT = 文件不存在
# EACCES = 权限不足

# 实际场景：Python 导入模块失败
strace -f python -c "import torch" 2>&1 | grep "torch" | head -20
# 能看到 Python 在哪些路径找 torch，最后在哪个路径找到了
```

---

## 十、概念速查表

| 概念 | 一句话记忆 |
|------|------------|
| `ls -lah` | 查看目录（含隐藏、详细信息、人类可读大小） |
| `find -name` | 按文件名查找 |
| `rg` | 在文件内容中搜索（比 grep 快） |
| 管道 `|` | 前一个命令的输出 → 后一个命令的输入 |
| `2>&1` | stderr 重定向到 stdout |
| `2>/dev/null` | 丢弃错误信息 |
| `set -euo pipefail` | Bash 脚本三件套：失败退出、未定义报错、管道传递失败 |
| `chmod 755` | rwxr-xr-x（所有者读写执行，其他人读和执行） |
| `chmod 600` | rw-------（仅所有者可读写，用于密钥） |
| `kill -TERM` | 请求进程优雅退出（默认） |
| `kill -KILL` | 强制杀死（最后手段，进程无法清理） |
| `tmux` | 终端复用器，断开后进程继续运行 |
| `free -h` | 看内存（看 available 不是 free） |
| `df -h` | 看磁盘容量 |
| `du -sh` | 看目录大小 |
| `ldd` | 查看程序依赖的动态库 |
| `LD_LIBRARY_PATH` | 动态库搜索路径（临时诊断用，别长期设） |
| `source ~/.bashrc` | 重新加载环境变量配置 |
| `ssh-copy-id` | 把公钥拷到服务器，免密登录 |
| `rsync -av` | 增量同步目录（比 scp 好） |
| `gdb bt` | 查看调用栈（崩溃排查第一步） |
| `strace` | 追踪系统调用（排查"找不到文件/库"） |
| `nvidia-smi` | 查看 GPU 状态和显存 |

---

## 十一、关联笔记

- `python/Python进阶笔记3_并发与性能分析.md`（Python 线程/进程/asyncio）
- `devops/` 目录（部署相关）
- `技术工具学习索引.md`
- `linux/Linux动态库调试_Demo实践.md`（第八章动手实践：ldd/readelf/nm/ldconfig/RPATH）
- `linux/Linux原生程序调试_Demo实践.md`（第九章动手实践：GDB/core dump/ASan/strace）
- `cpp/编译链接模板与构建系统.md`（C++ 编译链接、动态库创建、g++ 参数详解，与第八章动态库、第九章调试紧密关联）
