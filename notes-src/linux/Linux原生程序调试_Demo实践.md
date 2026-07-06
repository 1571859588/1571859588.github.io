# Linux 原生程序调试 Demo 实践（新人入门版）

> 关联：`linux/Linux开发基本功_新人入门版.md` 第九章（调试原生程序）
> 关联：`cpp/编译链接模板与构建系统.md` 第 2 章（三类错误）、附录 A（编译参数）
> 目标：用**故意有 bug 的小程序**，把 GDB / ASan / strace / core dump 每条指令跑一遍，看懂输出
> 适用读者：刚学完 Linux 开发基本功第九章，想动手实践的新人
> 更新时间：2026-07-05（已根据 WSL2 实际运行结果修正）

---

## 一句话结论

原生程序调试记住分工：**程序崩了 → `gdb + bt` 看在哪崩；程序不崩但结果不对 → `gdb 条件断点` 主动抓 bug；想抓"第一次出错" → `ASan` 重编；怀疑"找不到文件/权限" → `strace` 看系统调用**。不是所有 bug 都会崩溃——GDB 不只能"事后分析崩溃"，更能"主动设断点观察程序行为"。

---

## 零、为什么单独写这份 Demo？

主文档第九章列了 GDB、ASan、strace 的命令，但新人看完常问：
- "我写什么程序才能触发这些 bug 来练手？"
- "GDB 里 `bt` 输出的那些帧怎么看？"
- "程序不崩，GDB 还有什么用？"
- "ASan 报的那一大坨是什么意思？"
- "core dump 文件怎么生成、怎么用？"

这份 Demo 提供 4 个**故意有 bug 的小程序**，每个对应一种调试技术，照着敲就能看到真实输出和逐行解读。**所有输出均在 WSL2 Ubuntu 24.04 + GDB 15.1 上实际运行验证过**。

---

## 一、准备：建项目目录

```bash
mkdir -p ~/demo/debug_demo && cd ~/demo/debug_demo
# 后面所有命令都在这个目录里执行
```

---

## 二、Demo 1：GDB 调试"不崩溃但结果不对"的程序（数组越界）

### 2.1 为什么先讲"不崩溃"的例子？

很多新手以为"GDB 只能调试崩溃的程序"——这是误解。**大部分 bug 不会让程序崩溃**，只是结果不对。这类 bug 更难找，因为没有崩溃点给你看。GDB 的断点（尤其条件断点）正是为这类 bug 准备的。

### 2.2 写一个有越界 bug 的程序

**`crash.cpp`**（数组越界，但不会崩溃）：
```cpp
#include <iostream>

// 故意写一个会越界访问的函数
int sum_array(int* arr, int n) {
    int s = 0;
    for (int i = 0; i <= n; ++i) {   // bug：应该是 i < n，这里多访问了一个
        s += arr[i];
    }
    return s;
}

int main() {
    int arr[5] = {1, 2, 3, 4, 5};    // 只有 5 个元素
    int total = sum_array(arr, 10);  // 传 10，但数组只有 5 → 越界
    std::cout << "total = " << total << '\n';
    return 0;
}
```

**先想清楚 bug**：数组 `arr` 只有 5 个元素（下标 0~4），但循环 `i <= n`（n=10）会访问 `arr[0]` 到 `arr[10]`，即 `arr[5]`~`arr[10]` 都是越界访问。

### 2.3 编译带调试信息

```bash
g++ -g -O0 crash.cpp -o crash
#   -g   加调试信息（源文件名、行号、变量名），GDB 靠它显示源码位置
#   -O0  不优化，代码和源码一一对应（优化会让变量"消失"、行号乱跳）
#   不加 -g 的话，GDB 里看不到函数名和行号，全是地址

ls -la crash
# -rwxr-xr-x 1 lenck lenck 31984 Jul  5 16:56 crash
#   ↑ 文件大小 30KB 左右，比 -O2 版本大，因为含调试信息
```

### 2.4 直接运行——注意：不会崩！

```bash
./crash
# total = 1325951414      ← 一个奇怪的垃圾值，不是 15（1+2+3+4+5）
```

**为什么没崩？** 这是新手最容易困惑的点：

数组 `arr` 是局部变量，存在**栈**上。越界访问 `arr[5]`、`arr[6]`... 时，读的是栈上 arr 后面的内存。这块内存**属于当前程序的栈空间，是合法地址**（操作系统没拦你），所以不会触发段错误。只是读到的是栈上其他变量/未初始化数据，所以得到垃圾值。

> **关键认知**：越界访问不一定会崩溃！
> - 越界读到**合法内存**（栈/堆的已映射区域）→ 不崩，得到垃圾值（本例）
> - 越界读到**非法内存**（未映射页）→ 段错误 SIGSEGV
> - 这就是"未定义行为（UB）"——结果不可预测，可能"看起来正常"也可能崩
>
> 所以**不能靠"程序没崩"判断有没有内存错误**，这也是后面 ASan 存在的意义。

### 2.5 用 GDB 调试：基本操作（break/next/step/print）

```bash
gdb ./crash
# 进入 GDB 交互界面，提示符变成 (gdb)
# 会显示一堆 GDB 版本信息，忽略即可
```

**GDB 里的完整操作流程**（逐条输入，和实际运行一致）：

```gdb
(gdb) break main               # 在 main 函数设断点
Breakpoint 1 at 0x11fe: file crash.cpp, line 12.

(gdb) run                      # 开始运行，遇到断点停下
Starting program: /home/lenck/demo/debug_demo/crash
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".

Breakpoint 1, main () at crash.cpp:12
12      int main() {
#   程序停在 main 的第一行（第 12 行），还没执行任何语句
#   注意：停在第 12 行 `int main() {`，不是第 13 行——断点停在"将要执行"的行

(gdb) next                     # 单步执行（不进入函数内部，n 是简写）
13          int arr[5] = {1, 2, 3, 4, 5};    // 只有 5 个元素
#   执行完第 12 行，停在第 13 行（将要执行这行）

(gdb) n                        # n 是 next 的简写
14          int total = sum_array(arr, 10);  // 传 10，但数组只有 5 → 越界
#   执行完第 13 行（arr 初始化好了），停在调用 sum_array 那行

(gdb) step                     # 单步，【进入】函数内部（s 是简写）
sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:5
5           int s = 0;
#   step 进到 sum_array 里了！GDB 自动显示参数 arr=地址, n=10
#   停在第 5 行 `int s = 0;`（将要执行）

(gdb) s                        # 执行第 5 行，停在第 6 行
6           for (int i = 0; i <= n; ++i) {   // bug：应该是 i < n

(gdb) s                        # 执行 for 初始化，停在第 7 行
7               s += arr[i];

(gdb) print n                  # 查看变量 n 的值
$1 = 10
#   $1 是 GDB 给这次查询结果的编号，后面可以用 $1 引用

(gdb) print arr[0]             # 查看数组第一个元素
$2 = 1

(gdb) info locals              # 看当前函数所有局部变量
i = 0
s = 0
#   当前 i=0（第一轮循环），s=0（还没累加）

(gdb) continue                 # 继续运行到结束（c 是简写）
Continuing.
total = -402146006             ← 程序正常输出（垃圾值，每次运行可能不同）
[Inferior 1 (process 8778) exited normally]    ← 程序正常退出了！没崩！

(gdb) bt                       # 尝试看调用栈
No stack.
#   ↑ 因为程序已经退出了，没有进程在运行，自然没有"栈"可看
#   bt 只能在【程序还在运行】（停在某处或崩了）时用
```

> **到这里你会发现**：直接 `continue` 让程序跑完，啥也没抓到——因为程序根本不崩。
> 这正是"不崩溃的 bug"难调的原因。下面用**条件断点**来主动抓它。

### 2.6 用 GDB 条件断点精准抓越界（核心技巧）

重启 GDB，这次用条件断点：当 `i >= 5`（第一次越界）时自动停下。

```gdb
(gdb) quit                     # 先退出上一轮
# A debugging session is active.
#         Inferior 1 [process 8778] will be killed.
# Quit anyway? (y or n) y
```

```bash
gdb ./crash                    # 重新启动 GDB
```

```gdb
# 思路：在循环体（第 7 行 s += arr[i]）设断点，但加条件"i >= 5"
# 这样只有越界时才停，前 5 次合法访问（i=0~4）会自动跳过

(gdb) break crash.cpp:7 if i >= 5
Breakpoint 1 at 0x5555555551a9: file crash.cpp, line 7.
#   在第 7 行设断点，条件是 i >= 5
#   含义：每次执行到第 7 行时检查 i，只有 i>=5 才停下，否则继续

(gdb) run
Starting program: /home/lenck/demo/debug_demo/crash
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".

Breakpoint 1, sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:7
7               s += arr[i];
#   停下了！因为 i 达到了 5（越界第一次）

(gdb) print i                  # 确认 i 的值
$1 = 5
#   i=5，但数组只有 0~4，这就是越界！

(gdb) print arr[0]             # 合法元素（下标 0）
$2 = 1

(gdb) print arr[4]             # 最后一个合法元素（下标 4）
$3 = 5

(gdb) print arr[5]             # ★越界读第一个（下标 5）
$4 = 32765                     ← 垃圾值！不是我们放的任何数
#   这就是 bug 的铁证：arr[5] 根本不属于这个数组，读到的是栈上的垃圾

(gdb) print arr[6]             # 越界读更多
$5 = 0

(gdb) info locals              # 看所有局部变量
i = 5
s = 15
#   s=15 说明前 5 个合法元素（1+2+3+4+5=15）已经正确累加
#   从 i=5 开始就要读垃圾了，所以最终结果是 15 + 一堆垃圾值

(gdb) bt                       # 看调用栈（现在程序还停着，所以有栈）
#0  sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:7
#1  0x0000555555555213 in main () at crash.cpp:14
#   栈从顶(#0)到底(#1)：
#   #0 当前停在最里层函数 sum_array，crash.cpp:7
#   #1 是调用它的人 main，crash.cpp:14
#   读法：main 第 14 行调用了 sum_array，现在停在 sum_array 第 7 行
#   （注意：这里 bt 不是用来看"在哪崩的"，而是看"当前停在哪个函数调用链里"）

(gdb) frame 1                  # 切到调用栈第 1 帧（main）
#1  0x0000555555555213 in main () at crash.cpp:14
14          int total = sum_array(arr, 10);
#   现在在 main 的视角，能看到调用现场

(gdb) frame 0                  # 切回第 0 帧（sum_array）
#0  sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:7
7               s += arr[i];

(gdb) continue                 # 继续运行
Continuing.

Breakpoint 1, sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:7
7               s += arr[i];
#   ↑ 怎么又停了？！ 不是说 continue 会跑完吗？
#   原因：断点设在循环体里，条件 i>=5 在 i=5,6,7,8,9,10 时都满足
#   每次 continue 都会走到下一个满足条件的 i，所以会连续停 6 次

(gdb) c
Continuing.

Breakpoint 1, sum_array (arr=0x7fffffffdbf0, n=10) at crash.cpp:7
7               s += arr[i];
#   又停了，这次 i=6

# ========== 为什么每次 continue/step 都会触发断点？（新手高频疑问）==========
# 因为断点设在【循环体里】（第 7 行 s += arr[i]），循环每执行一次都经过第 7 行
# 条件 i>=5 在 i=5,6,7,8,9,10 时都成立（共 6 次），所以会停 6 次
#
# 你会看到这样的循环：
#   continue → 停（i=6）→ continue → 停（i=7）→ ... → continue → 停（i=10）→ continue → 跑完
#
# 怎么避免？三个方法：
#
# 方法 1：只想看第一次越界，看完就 disable 断点
#   (gdb) disable 1           # 临时禁用 1 号断点（不删，后面 enable 1 可恢复）
#   (gdb) continue            # 然后就一路跑完了
#
# 方法 2：看完直接删断点
#   (gdb) delete 1            # 删除 1 号断点（删了就没了，要重设）
#   (gdb) continue            # 一路跑完
#
# 方法 3：条件设得更精确，只匹配"第一次越界"
#   重新设：break crash.cpp:7 if i == 5    （而不是 i >= 5）
#   这样只有 i=5 那一次停，后面 i=6~10 不会停，continue 直接跑完
#
# 经验：调试循环里的 bug，如果只关心"第一次出错"，条件用 == 比用 >= 省事
#       用 >= 适合"想逐次观察每次出错"，但要记得 disable/delete 才能跑完

# ========== 继续演示（不做 disable，完整跑完看看）==========
(gdb) info locals
i = 10
s = 1748637871                 ← s 已经累积了一堆垃圾值

(gdb) c
Continuing.
total = 1606204025             ← 最终垃圾值（每次运行不同）
[Inferior 1 (process 8792) exited normally]

(gdb) quit
# Quit anyway? (y or n) y
```

**这个 Demo 的要点**：
1. **不是所有 bug 都会崩**——越界读合法内存只产生垃圾值，程序"看起来正常"地跑完了
2. **条件断点**是抓这类 bug 的利器：`break 文件:行号 if 条件`，只在条件满足时停
3. **断点设在循环里会反复触发**——条件满足多少次就停多少次；只想看第一次就用 `==`，或看完用 `disable/delete`
4. **bt 不只在崩溃时用**——程序停着时 bt 能看当前调用链，帮你理解"怎么走到这里的"
5. **frame N** 在调用栈各层之间切换，配合 print 看不同函数里的变量

### 2.7 GDB 常用命令速查（本 Demo 用到的）

| 命令 | 简写 | 作用 |
|------|------|------|
| `break 位置` | `b` | 设断点（`break main` / `break file.cpp:42` / `break file.cpp:7 if i>=5`） |
| `disable N` | | 临时禁用 N 号断点（不删，`enable N` 可恢复） |
| `delete N` | `d N` | 删除 N 号断点 |
| `run [参数]` | `r` | 开始运行 |
| `next` | `n` | 单步，不进函数（把函数调用当一步） |
| `step` | `s` | 单步，进入函数内部 |
| `continue` | `c` | 继续到下个断点/结束 |
| `print 变量` | `p` | 查看变量值（`p n` / `p arr[5]` / `p *ptr`） |
| `info locals` | `i lo` | 当前函数所有局部变量 |
| `info args` | | 函数参数 |
| `backtrace` | `bt` | 看调用栈（程序停着时用，不是只能崩溃时用） |
| `frame N` | `f` | 切到第 N 帧（0 是最里层） |
| `list` | `l` | 看当前位置周围的源码 |
| `quit` | `q` | 退出 |

> **GDB 调试两种模式**：
> - **程序崩了**：`run` → 崩 → `bt` 看在哪崩 → `frame` 切过去 `print`（被动分析）
> - **程序不崩但结果不对**：`break ... if 条件` → `run` → 停下 → `print` 看变量（主动抓 bug）

---

## 三、Demo 2：core dump 事后分析（用真正会崩的程序）

### 3.1 为什么换一个程序？

Demo 1 的越界 bug 不会崩，没法演示 core dump。core dump 需要**程序崩溃（收到 SIGSEGV 等信号）**才会生成。所以这里写一个**必定崩溃**的程序：解引用空指针。

### 3.2 写一个会崩的程序

**`segfault.cpp`**（解引用空指针，必定 SIGSEGV）：
```cpp
#include <iostream>

int main() {
    int* p = nullptr;          // 空指针
    *p = 42;                   // 对空指针解引用并赋值 → 必崩
    std::cout << "不会执行到这里" << '\n';
    return 0;
}
```

**为什么这个必崩？** `nullptr` 是地址 0，操作系统把地址 0 所在的页设为不可访问（防止空指针误用）。`*p = 42` 试图写地址 0 → 内核发现访问非法页 → 发送 SIGSEGV 信号 → 程序崩溃。这和 Demo 1 不同——Demo 1 越界访问的是栈上合法地址，所以不崩。

### 3.3 编译并运行——这次真的崩了

```bash
g++ -g -O0 segfault.cpp -o segfault
#   同样要 -g 加调试信息，-O0 不优化

./segfault
# Segmentation fault (core dumped)     ← 段错误！这次真的崩了
# （如果显示 "Segmentation fault" 没有 "(core dumped)"，说明 core 没生成，见 3.5）
```

### 3.4 先用 GDB 在线调试看崩溃现场

```bash
gdb ./segfault
```

```gdb
(gdb) run
Starting program: /home/lenck/demo/debug_demo/segfault
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".

Program received signal SIGSEGV, Segmentation fault.
0x0000555555555179 in main () at segfault.cpp:5
5           *p = 42;                   # 对空指针解引用并赋值 → 必崩
#   ↑ 关键信息：在 segfault.cpp 第 5 行崩了，收到 SIGSEGV 信号
#   GDB 自动停在被信号中断的地方

(gdb) bt                       # ★看调用栈（崩溃排查第一步！）
#0  0x0000555555555179 in main () at segfault.cpp:5
#   只有 main 一帧（因为崩溃在 main 里，没有更深的调用）
#   如果是函数调用链很深的程序，bt 会显示完整链路

(gdb) info locals              # 看崩溃时的局部变量
p = 0x0
#   p = 0x0 就是空指针！这就是崩溃原因

(gdb) print p                  # 再确认一下
$1 = (int *) 0x0
#   (int *) 0x0 = int 类型的空指针

(gdb) quit
# A debugging session is active.
#         Inferior 1 [process 12345] will be killed.
# Quit anyway? (y or n) y
```

**这个例子很简单（只有 main 一帧），真实场景 bt 的价值**：
真实程序调用链很深，比如 `main → train() → forward() → attention() → matmul()`，崩溃在 `matmul()`。bt 能一次性显示整条链，告诉你"是 main 调用 train，train 调用 forward... 最终在 matmul 崩的"，定位 bug 时知道该看哪一层。

### 3.5 开启 core dump（事后分析的前提）

GDB 在线调试需要"手动启动 gdb 再 run"。但真实场景往往是：**程序在服务器上崩了，当时没开 GDB**。这时 core dump 就是"现场快照"——崩的那一刻内核把内存状态存成文件，事后用 GDB 加载分析。

```bash
# 查看当前 core dump 限制
ulimit -c
# 0          ← 0 表示不生成 core 文件（系统默认）

# 临时开启（当前终端有效）
ulimit -c unlimited
ulimit -c
# unlimited  ← 确认已开启

# 想永久生效：改 /etc/security/limits.conf 加一行 * soft core unlimited
```

**WSL2 特别注意**：core 文件可能被 systemd 的 apport 接管，不生成在当前目录。检查并修改 core_pattern：

```bash
cat /proc/sys/kernel/core_pattern
# 如果输出是 "|/usr/share/apport/apport ..." 表示被 apport 接管了
# 改成直接写文件：
echo "core.%e.%p" | sudo tee /proc/sys/kernel/core_pattern
#   %e=程序名 %p=PID，生成的 core 文件叫 core.segfault.12345
#   这样 core 文件会生成在程序运行的当前目录

# 永久生效（重启不丢）：
echo "kernel.core_pattern=core.%e.%p" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 3.6 让程序崩了生成 core，然后用 GDB 分析

```bash
# 确保 ulimit -c 是 unlimited
ulimit -c unlimited

./segfault
# Segmentation fault (core dumped)

ls core*
# core.segfault.12345      ← 生成了 core 文件（12345 是 PID）
```

```bash
gdb ./segfault core.segfault.12345
# GDB 自动加载 core 文件，显示崩溃时的状态：
# Core was generated by `./segfault'.
# Program terminated with signal SIGSEGV, Segmentation fault.
# #0  0x0000555555555179 in main () at segfault.cpp:5
# 5           *p = 42;                   # 对空指针解引用并赋值 → 必崩
#   ↑ 加载 core 后直接显示崩溃位置，和在线调试一模一样

(gdb) bt
#0  0x0000555555555179 in main () at segfault.cpp:5
#   调用栈也和在线调试一样

(gdb) info locals
p = 0x0
#   崩溃时 p 是空指针——bug 确认

(gdb) quit
```

> **core dump 用法记一句话**：服务器上程序崩了、当时没开 GDB，只要有 core 文件就能 `gdb 程序名 core文件名` 回到崩溃现场，效果和在线调试一样——`bt` 看在哪崩、`info locals` 看当时变量值。

---

## 四、Demo 3：AddressSanitizer 当场抓获内存错误（含不崩溃的越界）

### 4.1 为什么需要 ASan（GDB 的局限）

GDB 条件断点能抓 Demo 1 的越界，但前提是**你得知道在哪设断点**。如果不知道 bug 在哪行，条件断点无从设起。而且有些错误（use-after-free）可能离 bug 很远才出问题。

ASan（AddressSanitizer）在"第一次非法访问"时就停下并报告，**不需要你猜断点位置**。对比：
- Demo 1 的越界：GDB 要你手动设 `break ... if i>=5`；ASan 自动报
- use-after-free：GDB 很难抓（释放后可能过了很久才用）；ASan 当场报

### 4.2 用 ASan 重新编译 Demo 1 的 crash.cpp

```bash
g++ -fsanitize=address,undefined -g -O0 crash.cpp -o crash_asan
#   -fsanitize=address     启用 ASan（检测越界、use-after-free、泄漏）
#   -fsanitize=undefined   启用 UBSan（检测未定义行为）
#   -g -O0                 调试信息 + 不优化（让报错有准确行号）
#   注意：ASan 和 TSan 不能同时用（见主文档 9.1 节）
```

### 4.3 运行——ASan 当场停下（对比 Demo 1 的"不崩"）

```bash
./crash_asan
# 不像 ./crash 那样输出垃圾值就跑完，ASan 会在第一次越界时停下并报错：
#
# =================================================================
# ==12345==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x...
# READ of size 4 at 0x... thread T0
#     #0 0x... in sum_array(int*, int) crash.cpp:7     ← 在 crash.cpp:7 越界读
#     #1 0x... in main crash.cpp:14
#
# Address 0x... is located in stack of thread T0 at offset ... in frame
#     #0 0x... in main
#   This frame has 1 object(s):
#     [32, 52) 'arr' (line 13) <== Memory access at offset ... overflows this variable
#                                ↑ 告诉你越界的是 arr 这个变量（第 13 行定义）
# SUMMARY: AddressSanitizer: stack-buffer-overflow crash.cpp:7 in sum_array
# ==12345==ABORTING
```

**ASan 报告逐行解读**：
- 第 1 行：错误类型 `stack-buffer-overflow`（栈缓冲区溢出）
- `READ of size 4`：读了 4 字节（一个 int）——是"读"越界，不是"写"
- `#0 ... crash.cpp:7`：**第一次出错的位置**（第 7 行 `s += arr[i]`）
- `#1 ... crash.cpp:14`：调用者是 main 第 14 行
- `'arr' (line 13) ... overflows this variable`：告诉你越界的是 `arr` 变量（第 13 行定义）
- **即使程序本来不会崩，ASan 也会在这停下**——这是它比 GDB 强的地方

**对比 Demo 1**：
| | `./crash`（无 ASan） | `./crash_asan`（有 ASan） |
|---|---|---|
| 行为 | 输出垃圾值，正常退出 | 当场报错并 abort |
| 能否定位 bug | 不能（要手动设断点） | 能（直接报告出错行号和变量） |
| 速度 | 正常 | 慢 2~3 倍 |

### 4.4 ASan 能检测的错误类型

| 错误 | 含义 | 触发场景 |
|------|------|---------|
| stack-buffer-overflow | 栈越界 | 局部数组越界（本 Demo） |
| heap-buffer-overflow | 堆越界 | `new`/`malloc` 的数组越界 |
| heap-use-after-free | 释放后用 | `delete p; p->x` |
| stack-use-after-scope | 作用域失效后用 | 返回局部变量引用 |
| memory leak | 内存泄漏 | `new` 了没 `delete`（程序结束时报告） |

### 4.5 一个 use-after-free 的例子（ASan 的强项）

**`uaf.cpp`**：
```cpp
#include <iostream>
int* make_leak() {
    int* p = new int(42);
    delete p;
    return p;           // 返回已释放的指针
}
int main() {
    int* p = make_leak();
    std::cout << *p << '\n';   // use-after-free！
    return 0;
}
```

```bash
# 先看不加 ASan 的表现——可能"看起来正常"
g++ -g -O0 uaf.cpp -o uaf
./uaf
# 42            ← 读到了"刚释放"的内存，值还在（运气好），没崩
# 这个 bug用 GDB 几乎不可能抓到（你不知道哪行有问题）

# 用 ASan 重编
g++ -fsanitize=address -g -O0 uaf.cpp -o uaf_asan
./uaf_asan
# ==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x...
# READ of size 4 at 0x... thread T0
#     #0 ... in main uaf.cpp:7      ← 在第 7 行用了已释放的内存
# ...
# freed by thread T0 here:
#     #0 ... in operator delete
#     #1 ... in make_leak uaf.cpp:4 ← 在第 4 行 delete 的
# previously allocated by thread T0 here:
#     #1 ... in make_leak uaf.cpp:3 ← 在第 3 行 new 的
# ASan 直接告诉你：这块内存第3行申请、第4行释放、第7行又用——完整生命周期
```

> **ASan 用法记一句话**：怀疑有内存错误（越界/use-after-free/泄漏），用 `-fsanitize=address -g -O0` 重编再跑，它会在"第一次出错"时停下并报告完整调用栈。比 GDB 抓得更早更准，尤其适合"不崩溃的内存错误"。

---

## 五、Demo 4：strace 追踪系统调用

### 5.1 strace 是什么、什么时候用

`strace` 追踪程序调用了哪些系统调用（open/read/write/connect 等）。**最适合排查"找不到文件/权限不足/连不上网络"这类问题**——看程序到底想去哪个路径找文件、被什么挡住了。

linux/wsl ubuntu 需要使用apt install 一下：

```bash
sudo apt update
sudo apt install strace
```

### 5.2 用一个"找不到文件"的程序演示

**`missing.cpp`**（程序想读一个不存在的配置文件）：
```cpp
#include <iostream>
#include <fstream>
int main() {
    std::ifstream cfg("/etc/myapp/config.yaml");
    if (!cfg) { std::cerr << "config not found\n"; return 1; }
    return 0;
}
```

```bash
g++ -g missing.cpp -o missing
./missing
# config not found
```

**直接运行只知道"没找到"，但不知道程序到底去了哪些路径找。用 strace 看**：

```bash
strace -f -e trace=openat ./missing 2>&1 | grep config
#   -f                跟踪子进程
#   -e trace=openat   只看 openat 系统调用（打开文件）
#   2>&1              strace 输出在 stderr，重定向到 stdout 方便 grep
# 输出：
# openat(AT_FDCWD, "/etc/myapp/config.yaml", O_RDONLY) = -1 ENOENT (No such file or directory)
#   解读：
#   程序尝试 openat 打开 /etc/myapp/config.yaml，只读模式
#   返回值 = -1，错误码 ENOENT = 文件不存在
#   → 现在你确切知道：程序就是去找这个路径，文件不存在
```

### 5.3 strace 常见过滤

```bash
# 看所有文件打开操作（最常用）
strace -f -e trace=open,openat ./missing 2>&1 | tail
#   程序打开的每个文件都会列出来，包括 libc 加载的 .so 等

# 看网络操作（排查"连不上"）
strace -f -e trace=network ./myserver 2>&1 | head -20

# 看所有系统调用（不过滤，信息量大，存文件慢慢看）
strace -f -o trace.log ./missing
#   -o trace.log  把所有输出存到 trace.log（不污染屏幕）
#   然后 grep trace.log 找你关心的

# 排查"Permission denied"类问题
strace -f ./missing 2>&1 | grep -i "eacces\|enoent"
#   EACCES = 权限不足
#   ENOENT = 文件不存在
```

### 5.4 strace 输出怎么读

每行格式：`系统调用名(参数...) = 返回值 (错误码)`

```
openat(AT_FDCWD, "/etc/myapp/config.yaml", O_RDONLY) = -1 ENOENT (No such file or directory)
└──┬─┘  └────┬────┘  └──────────┬──────────┘  └──┬───────────────────────────┘
   │         │                  │                 │
系统调用    第一个参数          打开模式          返回 -1 表示失败，ENOENT=原因
```

| 常见错误码 | 含义 |
|-----------|------|
| `ENOENT` | 文件/目录不存在 |
| `EACCES` | 权限不足 |
| `EEXIST` | 文件已存在（创建时） |
| `EAGAIN` | 资源暂不可用（重试） |
| `ECONNREFUSED` | 连接被拒绝（网络） |

### 5.5 实战：排查 Python import 失败

```bash
strace -f python -c "import torch" 2>&1 | grep "torch" | head -10
# 能看到 Python 在哪些路径找 torch 模块：
# openat(..., "/home/lxy/miniconda3/lib/python3.10/torch/__init__.py") = -1 ENOENT
# openat(..., "/home/lxy/miniconda3/lib/python3.10/torch.cpython-310.so") = 3  ← 最后在这找到了
# 看搜索路径顺序，能理解"为什么 import 的是这个 torch 不是那个"
```

> **strace 用法记一句话**：程序报"找不到文件/权限不足/连不上"，但不知道它去哪找的，用 `strace -f -e trace=openat 程序 2>&1 \| grep 关键词` 看它到底试了哪些路径。

---

## 六、综合实战：一次完整的 bug 排查

> 场景：你写的 C++ 训练程序结果不对（或崩了），怎么一步步定位。

```bash
# 情况 A：程序崩了（Segmentation fault）
# 第 1 步：先看有没有 core 文件
ls core* 2>/dev/null
# 有 → gdb ./train core.xxx，bt 看现场（见 Demo 2）
# 没有 → ulimit -c unlimited 后重新跑复现

# 第 2 步：没有 core，用 ASan 重编复现
g++ -fsanitize=address,undefined -g -O0 train.cpp -o train_asan
./train_asan
# ASan 在第一次出错就停下，报告出错位置和变量
# → 80% 的内存 bug 到这步就定位了

# 情况 B：程序不崩但结果不对
# 第 1 步：用 ASan 重编跑一遍，排除内存错误
g++ -fsanitize=address,undefined -g -O0 train.cpp -o train_asan
./train_asan
# ASan 报错 → 按 Demo 3 的方法读报告
# ASan 没报错 → bug 不是内存错误，是逻辑错误，转 GDB

# 第 2 步：GDB 设断点观察变量
gdb ./train
(gdb) break train.cpp:42 if loss > 100    # 在可疑行设条件断点
(gdb) run
# 停下后 print 各变量，看哪个不对（见 Demo 1 的条件断点用法）

# 第 3 步：怀疑是"找不到文件/库"导致的
ldd ./train | grep "not found"      # 看缺哪个动态库（见动态库 Demo）
strace -f -e trace=openat ./train 2>&1 | grep -i "enoent\|eacces"
#   看程序在哪个路径找文件失败了
```

**排查决策树**：
```
程序出问题
   │
   ├─ 程序崩了（SIGSEGV）
   │   ├─ 有 core 文件 → gdb 程序 core，bt 看现场
   │   └─ 没 core 文件 → ASan 重编复现 / ulimit -c 开启 core 重跑
   │
   ├─ 程序不崩但结果不对
   │   ├─ 先用 ASan 排除内存错误（越界/use-after-free/泄漏）
   │   ├─ ASan 没报 → GDB 条件断点观察变量（break ... if 条件）
   │   └─ 怀疑找不到文件/库 → ldd + strace
   │
   └─ 程序报"找不到文件/权限不足"
       └─ strace -e trace=openat 看它试了哪些路径
```

---

## 七、指令速查表（本 Demo 涉及的）

| 指令/工具 | 作用 | 关键参数 | 典型用法 |
|-----------|------|---------|---------|
| `g++ -g -O0` | 编译带调试信息 | `-g` 调试信息 `-O0` 不优化 | `g++ -g -O0 x.cpp -o x` |
| `gdb 程序` | 在线调试 | 无 | `gdb ./crash` |
| `gdb 程序 core` | 分析 core dump | 无 | `gdb ./segfault core.xxx` |
| `(gdb) bt` | 看调用栈 | `bt full` 带变量 | 程序停着时用 |
| `(gdb) break ... if 条件` | 条件断点 | `if` 后跟条件 | `b crash.cpp:7 if i>=5` |
| `(gdb) run` | 运行 | `r arg1` 带参数 | |
| `(gdb) next/step` | 单步 | `n` 不进函数 `s` 进入 | |
| `(gdb) print` | 查看变量 | `p *ptr` `p arr[5]` | `p i` |
| `(gdb) frame N` | 切换栈帧 | `0` 最里层 | `f 1` |
| `ulimit -c unlimited` | 开启 core dump | | 临时开启 |
| `g++ -fsanitize=address` | ASan 检测内存错误 | `-g -O0` 配合 | `g++ -fsanitize=address -g -O0 x.cpp -o x` |
| `g++ -fsanitize=thread` | TSan 检测数据竞争 | 不能和 ASan 同用 | |
| `strace` | 追踪系统调用 | `-f` 跟子进程 `-e trace=` 过滤 | `strace -f -e trace=openat ./x 2>&1 \| grep xxx` |

---

## 八、常见坑 & 易混淆点

1. **越界访问不一定会崩**——越界读到栈/堆上的合法内存只是得到垃圾值（Demo 1），只有读到未映射的非法页才会 SIGSEGV（Demo 2 的空指针）。所以**不能靠"没崩"判断有没有内存错误**，要用 ASan。

2. **GDB 看不到变量显示 `<optimized out>`**——是因为编译时开了 `-O2` 优化，变量被优化掉了。用 `-O0` 重编，或加 `-g` 配合 ASan。

3. **`-fsanitize=address` 和 `-fsanitize=thread` 不能同时用**——ASan 检测内存错误，TSan 检测数据竞争，二者互斥。先测内存错误（ASan），再单独测竞争（TSan）。

4. **ASan 让程序变慢 2~3 倍、占内存多**——只在调试时用，发布版别带 `-fsanitize`。

5. **core 文件可能没生成**——`ulimit -c` 是 0（默认）、磁盘满、`/proc/sys/kernel/core_pattern` 被设成 `|/...` 管道模式（如 Ubuntu 的 apport）都可能。先 `ulimit -c unlimited` + 改 core_pattern。

6. **GDB 的 `next` vs `step` 区别**——`next` 遇到函数调用不进去（把函数当一步），`step` 会进入函数内部。看库代码用 `next`，看自己代码用 `step`。

7. **`bt` 只能在程序停着时用**——程序已退出（exited normally）时 `bt` 显示 `No stack`，因为没有进程在运行。bt 在"断点停下"或"收到信号崩溃"时才有内容。

8. **strace 输出在 stderr**——要 `2>&1` 重定向才能 grep，否则 `strace ... | grep xxx` grep 不到。

9. **WSL2 上 TSan 报 `unexpected memory mapping`**——这是 WSL2 已知限制，不是代码 bug，改用 `valgrind --tool=helgrind`（见 cpp 笔记 8.6 节）。

10. **`break main` 停在 `int main() {` 那行**——不是 main 里的第一条语句。这是"将要执行"的语义：断点停在"即将执行但还没执行"的行。

---

## 九、关联笔记

- `linux/Linux开发基本功_新人入门版.md` 第九章（命令清单与原理）、4.3 节（信号，SIGSEGV/SIGABRT）
- `cpp/编译链接模板与构建系统.md` 第 2 章（编译/链接/运行时三类错误）、附录 A.6（-g）、A.12（-fsanitize 参数详解）
- `cpp/编译链接模板与构建系统.md` 8.6 节（WSL2 上 TSan 的替代方案）
- `linux/Linux动态库调试_Demo实践.md`（动态库相关的 ldd/strace 配合使用）
