# Linux 动态库调试 Demo 实践（新人入门版）

> 关联：`linux/Linux开发基本功_新人入门版.md` 第八章（动态库与环境）
> 关联：`cpp/编译链接模板与构建系统.md` 第 3 章（静态库与动态库）
> 目标：用一个**可复现的小项目**，把 ldd / readelf / nm / ldconfig / RPATH 每条指令跑一遍，看懂每行输出
> 适用读者：刚学完 Linux 开发基本功第八章，想动手实践的新人
> 更新时间：2026-07-04

---

## 一句话结论

动态库调试的核心套路只有三步：**`ldd` 看缺哪个库 → `find` 定位库在哪 → 用 `LD_LIBRARY_PATH`/`ldconfig`/`RPATH` 告诉系统去哪找**。所有"cannot open shared object file"报错都按这个流程走，不用慌。

---

## 零、为什么单独写这份 Demo？

主文档 `Linux开发基本功_新人入门版.md` 第八章把命令都列出来了，但新人看完常问：
- "这些命令到底在什么场景下敲？"
- "每行输出代表什么？我怎么看懂？"
- "我自己没有 `build/app`，到底用什么文件去试？"

这份 Demo 用一个**从零搭起来**的小项目，把每条指令都跑一遍，并贴出真实输出做逐行解读。你照着敲一遍，第八章就真的"过手"了。

---

## 一、准备一个会用到动态库的项目

> 这个项目复用 `cpp/编译链接模板与构建系统.md` 3.2/3.3 节的 `mylib/`，但这里完整再写一遍，不依赖你看过那篇。

### 1.1 建项目目录

```bash
mkdir -p ~/demo/ldd_demo && cd ~/demo/ldd_demo
# 后面所有命令都在这个目录里执行
```

### 1.2 写三个文件

**`math_lib.h`**（头文件，放声明）：

```cpp
#pragma once
int square(int x);   // 声明：返回 x 的平方
```

**`math_lib.cpp`**（源文件，放实现）：
```cpp
#include "math_lib.h"
int square(int x) { return x * x; }
```

**`main.cpp`**（主程序，调用 square）：
```cpp
#include <iostream>
#include "math_lib.h"
int main() {
    std::cout << "square(5) = " << square(5) << '\n';
    return 0;
}
```

### 1.3 编译成动态库 + 可执行文件

```bash
# ① 编译源文件成位置无关代码（PIC）的目标文件
g++ -c -fPIC math_lib.cpp -o math_lib.o
#   -fPIC 是动态库必须的（见 cpp 笔记 3.3 节）

# ② 打包成动态库 libmymath.so
g++ -shared -o libmymath.so math_lib.o
#   -shared 生成 .so；命名约定：lib 开头，.so 结尾

# ③ 编译 main.cpp 并链接这个动态库
g++ main.cpp -L. -lmymath -o demo_app
#   -L.     在当前目录(.)找库
#   -lmymath 链接 libmymath.so（去掉 lib 前缀和 .so 后缀）
#   -o demo_app 输出可执行文件叫 demo_app（不叫 app，名字随意）

ls -la
# 应该看到：math_lib.h  math_lib.cpp  math_lib.o  libmymath.so  main.cpp  demo_app
```

> **注意**：从这一步起，`demo_app` 就是你要用 `ldd`/`readelf`/`nm` 去检查的那个"可执行文件"。主文档里写的 `build/app` 只是示例名字，你的项目里它叫 `demo_app`——本质一样。

---

## 二、第一条指令：`ldd`（查看动态库依赖）

### 2.1 第一次运行——预期会报错

```bash
./demo_app
# 报错：
# ./demo_app: error while loading shared libraries: libmymath.so:
#   cannot open shared object file: No such file or directory
```

**为什么报错？** 因为 `demo_app` 运行时要去加载 `libmymath.so`，但系统不知道去你当前目录找它。这正是动态库的典型问题，下面用 `ldd` 来诊断。

### 2.2 用 ldd 诊断

```bash
ldd demo_app
# 输出：
#   linux-vdso.so.1 (0x00007ffd2f9fe000)
#   libmymath.so => not found                  ← 罪魁祸首！
#   libstdc++.so.6 => /lib/x86_64-linux-gnu/libstdc++.so.6 (0x...)
#   libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x...)
#   /lib64/ld-linux-x86-64.so.2 (0x...)
```

**逐行解读输出**：
- 每行格式：`库名 => 实际路径 (加载地址)` 或 `库名 => not found`
- `linux-vdso.so.1`：虚拟库，内核提供的，不是真文件，正常现象
- `libmymath.so => not found`：**这就是问题所在**，找不到我们自己编的库
- `libstdc++.so.6 => /lib/...`：C++ 标准库，系统自带，找到了 ✅
- `libc.so.6 => /lib/...`：C 标准库，系统自带，找到了 ✅
- `/lib64/ld-linux-x86-64.so.2`：动态加载器本身，系统自带

**结论**：除了 `libmymath.so`，其他库都正常。问题就在"系统不知道去当前目录找 libmymath.so"。

> **`ldd` 的用法记一句话**：程序运行报"cannot open shared object file"时，第一步永远先 `ldd 程序名`，看哪个库显示 `not found`。

---

## 三、解决方案 A：`LD_LIBRARY_PATH`（临时，最快）

### 3.1 设置环境变量后重试

```bash
export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH
#   把当前目录(.)加到动态库搜索路径前面
#   这是临时方案，只对当前终端有效

ldd demo_app
# 现在 libmymath.so 那行变成：
#   libmymath.so => ./libmymath.so (0x...)      ← 找到了！
./demo_app
# 输出：square(5) = 25                          ← 运行成功！
```

### 3.2 为什么不推荐长期用 LD_LIBRARY_PATH？

```bash
# ① 只对当前终端有效，开新终端就没了
unset LD_LIBRARY_PATH       # 清掉它
./demo_app                  # 又报 not found 了

# ② 如果写进 ~/.bashrc 会影响所有程序：
#    某些程序可能因为你的 LD_LIBRARY_PATH 指向旧版库而出错
#    （系统库和你自己的库冲突）
# 所以 LD_LIBRARY_PATH 只用于"临时调试"，不要当长期方案
```

---

## 四、解决方案 B：`ldconfig`（持久，系统级）

> 适合"这个库要给系统所有用户/所有程序用"的场景。我们这里只是为了演示，实际自定义库放 `/usr/local/lib`。

### 4.1 把库放到标准目录

```bash
sudo cp libmymath.so /usr/local/lib/
# /usr/local/lib 是"本地安装软件"的标准目录
# （区别于 /usr/lib，后者是发行版包管理器用的，别手动往里塞）

sudo ldconfig
# 重建动态库缓存（见主文档 8.2 节详细解释）
# ldconfig 会扫描 /usr/local/lib 等目录，把 libmymath.so 加进缓存
```

### 4.2 验证缓存已更新

```bash
ldconfig -p | grep mymath
# 输出：
#   libmymath.so (libc6,x86-64) => /usr/local/lib/libmymath.so
#   出现这一行 = 缓存里有了 ✅
```

### 4.3 现在不设 LD_LIBRARY_PATH 也能跑了

```bash
unset LD_LIBRARY_PATH       # 确保环境是干净的
ldd demo_app
#   libmymath.so => /usr/local/lib/libmymath.so (0x...)   ← 系统自动找到了
./demo_app
# square(5) = 25            ← 持久生效，重启也行
```

### 4.4 用 ld.so.conf.d 管理自定义目录（更规范）

如果你不想把库拷到 `/usr/local/lib`，而是放在自己的目录比如 `/opt/mylibs`：

```bash
# ① 告诉系统去 /opt/mylibs 找库
echo "/opt/mylibs" | sudo tee /etc/ld.so.conf.d/mylibs.conf
#   （tee 的作用见主文档 8.2 节：因为 > 重定向 sudo 管不到，要用 tee）

# ② 重建缓存
sudo ldconfig

# ③ 验证
ldconfig -p | grep mylibs    # 确认目录被收录

# ④ 不用了就删掉配置文件再 ldconfig
sudo rm /etc/ld.so.conf.d/mylibs.conf
sudo ldconfig
```

---

## 五、解决方案 C：`RPATH`（编译时写入，最推荐生产用）

### 5.1 重新编译，把库路径写进二进制

```bash
# 先清理掉之前的 ldconfig 配置，回到"找不到库"状态
sudo rm /usr/local/lib/libmymath.so
sudo ldconfig

# 重新编译 main.cpp，加 -Wl,-rpath
g++ main.cpp -L. -lmymath -Wl,-rpath,/home/lxy/demo/ldd_demo -o demo_app_rpath
#   -Wl,-rpath,/path  把 /path 写进二进制的 RPATH 字段
#   注意：这里用绝对路径！相对路径 . 在不同 cwd 下会失效
#   （演示用，实际项目里 RPATH 一般写 $ORIGIN 表示"和可执行文件同目录"）

ldd demo_app_rpath
#   libmymath.so => /home/lxy/demo/ldd_demo/libmymath.so (0x...)
#   ← 不用设环境变量，不用 ldconfig，直接找到了！
./demo_app_rpath
# square(5) = 25
```

### 5.2 用 readelf 验证 RPATH 确实写进去了

```bash
readelf -d demo_app_rpath | grep -i path
# 输出：
# 0x000000000000000f (RPATH)  Library rpath: [/home/lxy/demo/ldd_demo]
#   RPATH 字段 = 编译时写死在二进制里的库搜索路径
#   程序无论拷到哪、谁运行，都会去这个路径找库

# 对比：之前没加 -rpath 编译的 demo_app
readelf -d demo_app | grep -i path
# （无输出 = 没设 RPATH）
```

### 5.3 RPATH vs RUNPATH（进阶，了解即可）

```bash
# 现代链接器默认生成 RUNPATH（更灵活但优先级更低）
# 强制生成老的 RPATH：
g++ main.cpp -L. -lmymath -Wl,--disable-new-dtags,-rpath,/path -o demo_app
#   --disable-new-dtags  用老 RPATH（优先级高于 LD_LIBRARY_PATH）
#   默认（--enable-new-dtags）生成 RUNPATH（优先级低于 LD_LIBRARY_PATH）
# 一般项目不用纠结，知道有这么个区别就行
```

---

## 六、第三条指令：`nm`（查看符号，排查链接问题）

### 6.1 看可执行文件里的符号

```bash
nm -C demo_app | grep -i square
# 输出：
# 0000000000001199 T square(int)
#   T = 这个符号在 .text 段，【有定义】（即代码里有实现）
#   -C 把 C++ 修饰名还原成人话（不加 -C 会看到 _Z6squarei 这种乱码）

# 看哪些符号是"未定义"的（要靠外部库提供）：
nm -C demo_app | grep ' U ' | head
#                  U std::cout          ← U = undefined
#                  U __libc_start_main
# U 不是错误！程序总要依赖标准库，运行时由 libstdc++/libc 提供
```

### 6.2 看动态库里有什么符号

```bash
nm -C libmymath.so | grep -i square
# 输出：
# 0000000000001119 T square(int)
#   库里有 square 符号 → 说明库编译对了

# 如果输出为空 → 库里没这个符号 → 链接时就会报 undefined reference
```

### 6.3 实战：故意制造一个"符号缺失"来观察 nm

```bash
# 写一个调用了不存在函数的程序
cat > bug.cpp << 'EOF'
#include <iostream>
int missing_func(int x);   // 声明了，但没定义
int main() { std::cout << missing_func(5) << '\n'; }
EOF

g++ bug.cpp -o bug_app
# 报错：undefined reference to `missing_func(int)'
# 这是【链接错误】（见 cpp 笔记 2.3 节），不是运行时问题

# 但如果把它编成动态库再链接，编译能过，运行时才炸：
g++ -shared -fPIC -o libbug.so bug.cpp   # 假设这样（实际会失败，演示用）
# nm -C libbug.so | grep missing_func → 能看到 U（未定义）
```

> **`nm` 的用法记一句话**：遇到 `undefined reference` 或 `undefined symbol`，用 `nm -C 文件 | grep 符号名` 看这个符号是 T（有定义）还是 U（未定义），定位是"漏了实现"还是"漏了链接库"。

---

## 七、综合实战：一次完整的"找不到库"排查

> 模拟真实场景：你拿到一个同事编的程序，运行报错，怎么一步步排查。

### 7.1 制造"故障现场"

```bash
cd ~/demo/ldd_demo
unset LD_LIBRARY_PATH
sudo rm -f /usr/local/lib/libmymath.so && sudo ldconfig    # 清掉持久化方案
# 现在回到最原始状态：demo_app 找不到 libmymath.so
```

### 7.2 排查流程

```bash
# 第 1 步：复现错误
./demo_app
# error while loading shared libraries: libmymath.so: cannot open shared object file

# 第 2 步：ldd 看缺哪个库
ldd demo_app | grep "not found"
# libmymath.so => not found          ← 确认是缺这个

# 第 3 步：找这个库在系统哪里
find / -name "libmymath.so*" 2>/dev/null
# /home/lxy/demo/ldd_demo/libmymath.so   ← 找到了，在项目目录里
# （2>/dev/null 把 find 的权限错误丢掉，不然满屏 Permission denied）

# 第 4 步：临时验证（用 LD_LIBRARY_PATH 确认这就是对的库）
export LD_LIBRARY_PATH=/home/lxy/demo/ldd_demo:$LD_LIBRARY_PATH
./demo_app
# square(5) = 25                       ← 能跑了，确认库是对的

# 第 5 步：选持久化方案
#   - 只给自己用、临时用 → 保留 LD_LIBRARY_PATH（写进 ~/.bashrc，但不推荐长期）
#   - 给全系统用、要重启生效 → sudo cp 到 /usr/local/lib && sudo ldconfig
#   - 跟着二进制走、部署给别人 → 重新编译加 -Wl,-rpath
```

### 7.3 排查流程图（记在脑子里）

```
程序报 "cannot open shared object file"
   │
   ▼
ldd 程序 | grep "not found"   → 看缺哪个库
   │
   ▼
find / -name "库名*" 2>/dev/null   → 找库在哪
   │
   ├─ 找到了 → 三选一让它被找到：
   │   ├─ 临时：export LD_LIBRARY_PATH=目录:$LD_LIBRARY_PATH
   │   ├─ 持久：sudo cp 库 /usr/local/lib && sudo ldconfig
   │   └─ 编译：-Wl,-rpath,目录 重新编
   │
   └─ 没找到 → 库根本没装，得 apt install / 自己编译安装
```

---

## 八、指令速查表（本 Demo 涉及的）

| 指令 | 作用 | 关键参数 | 典型用法 |
|------|------|---------|---------|
| `ldd 程序` | 看运行时依赖哪些 .so | 无 | `ldd demo_app \| grep "not found"` |
| `readelf -d 程序` | 看二进制动态段 | `-d` dynamic段 | `readelf -d demo_app \| grep NEEDED` |
| `nm -C 文件` | 看符号表 | `-C` 反修饰 | `nm -C libmymath.so \| grep square` |
| `ldconfig` | 重建库缓存 | `-p` 打印缓存 | `sudo ldconfig` / `ldconfig -p \| grep xxx` |
| `find` | 找文件 | `-name` | `find / -name "libxxx.so*" 2>/dev/null` |
| `g++ -Wl,-rpath,目录` | 编译时写 RPATH | `-Wl,` 透传给链接器 | `g++ ... -Wl,-rpath,/path` |
| `LD_LIBRARY_PATH` | 临时库搜索路径 | 环境变量 | `export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH` |

---

## 九、常见坑 & 易混淆点

1. **`ldd` 显示 `linux-vdso.so.1` 不是错误**——它是内核虚拟库，没有对应文件，正常现象。
2. **静态库（.a）不会出现在 `ldd` 输出里**——它在链接时已经"复制进"可执行文件了，运行时不再依赖。
3. **`LD_LIBRARY_PATH` 不要写进 `~/.bashrc` 长期用**——可能让其他程序加载到错误版本的库，引发难以排查的冲突。临时调试用 `export`，长期用 RPATH 或 ldconfig。
4. **RPATH 要用绝对路径或 `$ORIGIN`**——写 `.` 或相对路径在不同工作目录下会失效。`$ORIGIN` 表示"和可执行文件同目录"，是部署时的推荐写法：`-Wl,-rpath,'$ORIGIN'`。
5. **`sudo echo > file` 是错的**——`>` 重定向由当前 shell 执行（非 root），要用 `echo x \| sudo tee file`。
6. **改了 `ld.so.conf.d` 必须跑 `ldconfig`**——光改配置文件不重建缓存，程序还是找不到库。

---

## 十、关联笔记

- `linux/Linux开发基本功_新人入门版.md` 第八章（命令清单与原理）
- `cpp/编译链接模板与构建系统.md` 第 3 章（静态库/动态库的创建）、附录 A.10/A.11（-fPIC/-shared/-Wl,-rpath 参数详解）
- `cpp/编译链接模板与构建系统.md` 2.4 节（运行时装载错误示例）
