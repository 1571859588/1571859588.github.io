# Python 与 C++ 互操作

> 更新时间：2026-07-01
> 状态：学习笔记（从零开始，逐句拆解）
> 适用读者：有 Python 基础，刚接触 C++ 互操作的人
> 关联：`cpp/内存生命周期与资源管理.md`、`cpp/编译链接模板与构建系统.md`

---

## 一句话结论

Python 和 C++ 互操作的核心是**跨语言边界**——要么用 `ctypes` 调用 C 接口（简单但手动），要么用 `pybind11` 绑定 C++ 接口（自然但要编译扩展）。关键认知：**跨语言不自动变快**，理想接口是"传一个批次/缓冲区，而不是每个元素跨一次边界"。零拷贝不是"没条件"，而是双方对"地址+类型+形状+步长+设备+生命周期+可变性"七项契约达成一致。

---

## 零、为什么 Python 要调 C++？

先建立直觉——Python 慢在哪，C++ 快在哪：

| 场景 | Python | C++ |
|------|--------|-----|
| for 循环 100 万次 | ~200ms | ~2ms（快 100 倍） |
| 调用系统 API（GPU 驱动） | 不支持 | 原生支持 |
| 复用已有 C++ 库 | 不支持 | 原生支持 |
| 开发速度 | 快 | 慢 |

**互操作的目的**：取两者之长——用 Python 写逻辑（快开发），用 C++ 写热点（快执行）。

```
Python（上层逻辑）
  │
  │  跨语言边界（调用）
  ▼
C++（底层性能）
```

### 四个常见目的

| 目的 | 例子 |
|------|------|
| 复用已有 C/C++ 库 | 调用 OpenCV、FFmpeg |
| 热点循环下沉到原生代码 | 把 Python for 循环改成 C++ 批处理 |
| 接入驱动/通信库/硬件接口 | CUDA 驱动、串口通信 |
| 为 PyTorch 添加自定义算子 | `torch.utils.cpp_extension` |

---

## 一、跨语言边界的成本

### 1.1 为什么"跨语言不自动变快"

一次跨语言调用要做的事情：

```
Python 侧
  │
  ▼ ① 参数检查：类型对不对？
  │
  ▼ ② 类型/布局转换：Python 对象 → C 数据结构
  │
  ▼ ③ 数据复制：可能要把 Python 内存复制到 C 缓冲区
  │
  ▼ ④ 释放 GIL：让其他 Python 线程能跑
  │
  ▼ ⑤ 调用 C/C++ 函数
  │
  ▼ ⑥ 异常翻译：C++ 异常 → Python 异常
  │
  ▼ ⑦ 结果转换：C 返回值 → Python 对象
  │
Python 侧
```

**最坏情况**：每个元素都跨一次边界

> 这个例子需要先编译一个 `libscale.so` 动态库（见第二章 2.2）。新人可以先跳过代码，理解概念后再回来跑。

```python
# ❌ 灾难：每个元素跨一次边界
import ctypes
lib = ctypes.CDLL("./libscale.so")   # 加载动态库（第二章会讲怎么编译它）

values = [1.0, 2.0, 3.0, 4.0, 5.0]
for i in range(len(values)):
    lib.scale_one(ctypes.byref(ctypes.c_float(values[i])), 2.0)
    # 每次调用都有：类型检查 + 转换 + GIL + ...
    # 100 万元素 = 100 万次开销，比纯 Python 还慢！
```

**正确做法**：传一个批次/缓冲区

```python
# ✅ 正确：一次调用处理整个数组
import ctypes
from array import array               # Python 标准库的 array（不是 list！）

lib = ctypes.CDLL("./libscale.so")
values = array("f", [1.0, 2.0, 3.0, 4.0, 5.0])  # "f" 表示 float32，连续内存
# 注意：array 和 list 的区别——array 是连续内存的数值数组，list 是指针数组

pointer = (ctypes.c_float * len(values)).from_buffer(values)
# 这行的意思：从 values 的底层内存创建一个 ctypes 指针，共享同一块内存（零拷贝）
lib.scale(pointer, len(values), 2.0)  # 一次调用，内部循环
```

### 1.2 成本对比

| 调用方式 | 100 万元素 | 说明 |
|---------|-----------|------|
| 纯 Python for | ~200ms | 慢但无跨语言开销 |
| 每元素跨边界 | ~2000ms | **更慢**！跨边界开销吞噬收益 |
| 一次批处理 | ~5ms | 快 40 倍，跨边界开销摊薄 |

> **核心原则**：跨语言调用的粒度要大——传一个数组/缓冲区，而不是一个个元素。

---

## 二、ctypes：调用稳定的 C ABI

### 2.1 什么是 ctypes

`ctypes` 是 Python 标准库，可以直接调用 C 函数（注意是 **C 接口**，不是 C++ 接口）。

**为什么只能调 C 接口**：C++ 的函数名会被 name mangling（名称修饰），`add(int,int)` 变成 `_Z3addii`，找不到。用 `extern "C"` 告诉编译器"按 C 方式导出，不要修饰"。

### 2.2 完整示例

> **完整可复现项目**——建一个文件夹 `ctypes_demo/`，放两个文件：
>
> ```
> ctypes_demo/         ← 建一个新文件夹
> ├── scale.cpp        ← C++ 代码（导出 C 接口）
> └── use_scale.py     ← Python 代码（调用 C++ 编译的库）
> ```
>
> 下面所有命令都在 `ctypes_demo/` 文件夹里执行（先 `cd ctypes_demo`）。

**第一步：写 C++ 代码，导出 C 接口**

```cpp
// scale.cpp
#include <cstddef>   // std::size_t

// extern "C" 告诉编译器：按 C 的方式导出，不要 name mangling
// 为什么需要？C++ 会把函数名修饰成 _Z5scalePfif 这种乱码，
// Python 的 ctypes 找不到。extern "C" 让函数名保持原样 "scale"。
extern "C" {

// 缩放：把 data 数组的每个元素乘以 factor（原地修改）
void scale(float* data, int size, float factor) {
    for (int i = 0; i < size; ++i) {
        data[i] *= factor;
    }
}

// 求和：返回 data 数组所有元素的和
float sum(const float* data, int size) {
    float result = 0.0f;
    for (int i = 0; i < size; ++i) {
        result += data[i];
    }
    return result;
}

}  // extern "C" 结束
```

**第二步：编译成动态库**

```bash
# Linux（在 ctypes_demo/ 目录下执行）
g++ -O3 -shared -fPIC scale.cpp -o libscale.so
#   逐字解释：
#   g++         调用 C++ 编译器
#   -O3         优化级别 3（最快，生产环境用）
#   -shared     生成动态库（.so）而不是可执行文件
#   -fPIC       位置无关代码（动态库必须，详见 cpp/编译链接模板与构建系统.md）
#   scale.cpp   输入源文件
#   -o libscale.so  输出文件名（Linux 动态库以 lib 开头、.so 结尾）

# macOS（用 .dylib 后缀）
# g++ -O3 -shared -fPIC scale.cpp -o libscale.dylib

# Windows（用 MSVC，用 .dll 后缀）
# cl /O2 /LD scale.cpp /Fe:scale.dll
```

**第三步：Python 侧调用**

```python
# use_scale.py
import ctypes
from array import array

# ① 加载动态库
library = ctypes.CDLL("./libscale.so")  # Linux
# library = ctypes.CDLL("./libscale.dylib")  # macOS
# library = ctypes.CDLL("./scale.dll")       # Windows
# CDLL = C Dynamic Link Library，加载动态库

# ② 声明函数签名（重要！不声明会用默认类型，可能出错）
# 告诉 ctypes：scale 函数的参数类型是 [float*, int, float]
library.scale.argtypes = [
    ctypes.POINTER(ctypes.c_float),  # 第 1 个参数：float* data（指向 float 的指针）
    ctypes.c_int,                    # 第 2 个参数：int size
    ctypes.c_float,                  # 第 3 个参数：float factor
]
library.scale.restype = None  # 返回类型：void（无返回值）

library.sum.argtypes = [
    ctypes.POINTER(ctypes.c_float),  # float* data
    ctypes.c_int,                    # int size
]
library.sum.restype = ctypes.c_float  # 返回类型：float

# ③ 准备数据（必须是连续内存）
values = array("f", [1.0, 2.0, 3.0, 4.0, 5.0])
# array("f", ...) 创建一个 float32 数组，内存是连续的
# 不能用 list！list 的元素分散在内存各处，不能直接传给 C

# ④ 把 array 转成 ctypes 指针（零拷贝！共享同一块内存）
pointer = (ctypes.c_float * len(values)).from_buffer(values)
# 逐字解释：
#   ctypes.c_float * len(values)  创建一个"5 个 float 的数组"类型
#   .from_buffer(values)          从 values 的内存创建，共享同一块内存
#   pointer                       是一个指向 values 底层内存的指针

# ⑤ 调用 C 函数
library.scale(pointer, len(values), 2.0)
print(list(values))  # [2.0, 4.0, 6.0, 8.0, 10.0]  ← 原地修改了 values

# ⑥ 调用有返回值的函数
total = library.sum(pointer, len(values))
print(f"sum = {total}")  # sum = 30.0
```

```bash
# 运行（在 ctypes_demo/ 目录下）
python use_scale.py
# 输出：
# [2.0, 4.0, 6.0, 8.0, 10.0]
# sum = 30.0
```

### 2.3 ctypes 的类型映射

| C 类型 | ctypes 类型 | Python 对应 |
|--------|------------|------------|
| `int` | `ctypes.c_int` | int |
| `float` | `ctypes.c_float` | float |
| `double` | `ctypes.c_double` | float |
| `char*` | `ctypes.c_char_p` | bytes |
| `int*` | `ctypes.POINTER(ctypes.c_int)` | — |
| `void*` | `ctypes.c_void_p` | — |
| `struct` | `ctypes.Structure` | 自定义类 |

### 2.4 ctypes 的风险

```python
# ❌ 危险：签名写错可能导致段错误，不是普通异常
library.scale.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
# 实际函数期望 float*，但传了 int → 程序崩溃（Segmentation Fault）

library.scale(42, 5, 2)  # 把 42 当地址访问 → 崩溃
```

> **ctypes 的特点**：简单直接，标准库自带，但类型、长度和生命周期主要靠调用者保证。签名写错可能导致崩溃，而不只是普通 Python 异常。

### 2.5 用 NumPy 数组配合 ctypes

```python
import ctypes
import numpy as np

library = ctypes.CDLL("./libscale.so")
library.scale.argtypes = [
    ctypes.POINTER(ctypes.c_float),
    ctypes.c_int,
    ctypes.c_float,
]
library.scale.restype = None

# NumPy 数组本身就是连续内存
arr = np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float32)

# 获取数组的底层指针
pointer = arr.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
# 逐字解释：
#   arr.ctypes              NumPy 数组的 ctypes 接口（每个 ndarray 都有这个属性）
#   .data_as(类型)          把数组底层内存地址转成指定的 ctypes 指针类型
#   ctypes.POINTER(ctypes.c_float)  → "指向 float 的指针"类型（等价于 C 的 float*）
#   整行：把 NumPy 数组的底层内存地址，转成 C 语言能用的 float* 指针
#   这是零拷贝——pointer 和 arr 共享同一块内存

library.scale(pointer, len(arr), 3.0)
print(arr)  # [ 3.  6.  9. 12. 15.]  ← arr 被原地修改了
```

---

## 三、pybind11：自然地绑定 C++ 接口

### 3.1 为什么用 pybind11

| 维度 | ctypes | pybind11 |
|------|--------|---------|
| 调用什么 | C 接口 | C++ 接口 |
| 类型安全 | 手动声明，错了会崩 | 编译时检查 |
| 支持 C++ 类 | ❌ | ✅ |
| 支持异常 | ❌ | ✅ 自动转换 |
| 支持 NumPy | 需手动 | `py::array_t` 原生支持 |
| 安装 | 标准库自带 | `pip install pybind11` |

### 3.1 pybind11 语法速查（新人必看，后面代码会用到）

> 后面的代码里会出现很多 `py::xxx`、`PYBIND11_MODULE`、`static_cast` 等没见过的写法。先在这里统一解释，后面看到就不会懵。

#### `namespace py = pybind11;` —— 给命名空间起别名

```cpp
namespace py = pybind11;
// 意思：把 pybind11 这个命名空间取个别名叫 py
// 之后写 py::array_t 就等价于 pybind11::array_t，少打字
// 类比 Python：import pybind11 as py
```

#### 什么时候写 `py::` 什么时候写纯 C++

| 情况 | 写法 | 说明 |
|------|------|------|
| 用 pybind11 提供的类型 | `py::array_t<float>` | pybind11 的 NumPy 数组包装类，加 `py::` 前缀 |
| 用 pybind11 提供的函数/宏 | `py::arg("x")` | pybind11 的参数标记，加 `py::` 前缀 |
| 用 pybind11 的类绑定工具 | `py::class_<Point>(...)` | pybind11 的类绑定模板，加 `py::` 前缀 |
| 纯 C++ 标准库 | `std::vector<float>` | 不加 `py::`，用 `std::` |
| 纯 C++ 基本类型 | `float`、`int`、`size_t` | 什么都不加 |
| 纯 C++ 函数 | `std::sqrt(x)` | 不加 `py::`，用 `std::` |

> **记忆规则**：`py::` 前缀 = "这是 pybind11 提供的东西，用来在 C++ 和 Python 之间搭桥"。纯 C++ 的东西该写什么就写什么，和 pybind11 无关。

#### `PYBIND11_MODULE(name, m)` —— 定义 Python 模块的宏

```cpp
PYBIND11_MODULE(vector_ops, m) {
    // 这里面写的代码在模块被 import 时执行
    // 作用：告诉 Python "这个模块里有哪些函数/类"
}
```

| 参数 | 含义 | 例子 |
|------|------|------|
| 第 1 个 | 模块名（Python 里 `import` 的名字，必须和 .so 文件名一致） | `vector_ops` |
| 第 2 个 | 模块对象的变量名（随便起，通常写 `m` 或 `module`） | `m` |

> `m` 是一个 pybind11 的模块对象，你往里面 `.def(...)` 添加函数、`.def_class(...)` 添加类。Python 里 `import vector_ops` 后，这些函数和类就能用了。

#### `m.def("name", &func, args...)` —— 往模块里添加函数

```cpp
int add(int lhs, int rhs) { return lhs + rhs; }  // 纯 C++ 函数

PYBIND11_MODULE(vector_ops, m) {
    m.def("add", &add, py::arg("lhs"), py::arg("rhs"));
    //   ↑          ↑      ↑
    //   方法       C++函数  参数名标记（让 Python 支持关键字参数）
    //   名字       的地址
}
```

| 参数位置 | 含义 | 类型 |
|---------|------|------|
| 第 1 个 | Python 里的函数名 | 字符串 `"add"` |
| 第 2 个 | C++ 函数的地址 | `&add`（取地址符 `&` 不能省） |
| 第 3 个起 | 参数说明 / 文档字符串 | `py::arg("x")` 或 `"说明文字"` |

> `&add` 里的 `&` 是 C++ 的"取地址"操作符——拿到函数的内存地址，pybind11 据此知道要调用哪个 C++ 函数。

#### `py::arg("name")` —— 标记参数名

```cpp
m.def("add", &add, py::arg("lhs"), py::arg("rhs"));
// Python 里可以：vector_ops.add(1, 2)        ← 位置参数
//          也可以：vector_ops.add(lhs=1, rhs=2)  ← 关键字参数
```

如果不写 `py::arg`，Python 侧只能用位置参数，不能用关键字参数。

#### `py::array_t<float>` —— pybind11 的 NumPy 数组类型

```cpp
py::array_t<float> vector_square(py::array_t<float> input) {
//  ↑ 返回类型                ↑ 参数类型
```

| 写法 | 含义 |
|------|------|
| `py::array_t<float>` | 接收 NumPy 的 **float32** 数组 |
| `py::array_t<double>` | 接收 NumPy 的 **float64** 数组 |
| `py::array_t<int>` | 接收 NumPy 的 **int32** 数组 |
| `py::array` | 接收任意 dtype 的数组（要手动检查） |

> `py::array_t<float>` 是模板类（类似 `std::vector<float>`），尖括号里指定元素类型。pybind11 自动检查传入的 NumPy 数组 dtype 是否匹配，不匹配会报 Python 的 `TypeError`。

#### `.request()` —— 获取数组的底层信息

```cpp
auto buf = input.request();
// buf 包含：
//   buf.ptr      → void*      数据的原始指针（要 cast 成 float* 才能用）
//   buf.size     → size_t     元素总数
//   buf.ndim     → int        维度数（1D=1, 2D=2）
//   buf.shape    → ssize_t*   每维大小（shape[0]=行数, shape[1]=列数）
//   buf.strides  → ssize_t*   每维步长（字节数）
```

> `request()` 返回一个 `py::buffer_info` 对象，里面是 NumPy 数组的底层内存信息。拿到 `buf.ptr` 就能像普通 C++ 指针一样操作数据了。

#### `static_cast<T>(expr)` —— C++ 的类型转换

```cpp
float* ptr = static_cast<float*>(buf.ptr);
//   ↑目标类型    ↑要转换的表达式
```

| 写法 | 含义 | 类比 |
|------|------|------|
| `static_cast<float*>(buf.ptr)` | 把 `void*` 转成 `float*` | 告诉编译器"这个指针指向的是 float" |
| `static_cast<char*>(buf.ptr)` | 把 `void*` 转成 `char*` | 告诉编译器"按字节算地址"（stride 计算用） |

> `buf.ptr` 的类型是 `void*`（无类型指针），C++ 不允许直接 `*buf.ptr` 因为不知道每个元素多大。`static_cast<float*>` 告诉编译器"这是指向 float 的指针"，之后 `ptr[0]`、`ptr[1]` 就能正常用了。
>
> **为什么用 `static_cast` 而不是 C 风格的 `(float*)buf.ptr`**：`static_cast` 会在编译时检查类型是否合理（比如不能把 `int*` 转成 `float*`），更安全。C 风格的强制转换 `(float*)` 不做任何检查，容易出错。

#### `py::class_<T>(m, "Name")` —— 绑定 C++ 类到 Python

```cpp
py::class_<Point>(m, "Point")
//  ↑模板参数  ↑模块 ↑Python里的类名
    .def(py::init<float, float>())     // 绑定构造函数
    .def("x", &Point::x)               // 绑定方法
    .def("__repr__", [](const Point& p) { ... });  // 绑定特殊方法
```

| `.def(...)` 调用 | 含义 |
|------------------|------|
| `py::init<float, float>()` | 绑定构造函数 `Point(float, float)` |
| `"x", &Point::x` | 绑定方法，Python 里 `p.x()` 调用 C++ 的 `Point::x()` |
| `"__repr__", [](const Point& p) { ... }` | 绑定 Python 的 `__repr__`（print 时显示），用 lambda |

> `.def()` 可以链式调用（像 Python 的链式调用 `list.append(1).append(2)`），每个 `.def()` 绑定一个方法。

#### Lambda 表达式 `[](参数) { 函数体 }` —— 匿名函数

```cpp
m.def("__repr__", [](const Point& p) {
    return "<Point x=" + std::to_string(p.x()) + ">";
});
// 等价于先定义一个函数再绑定：
// std::string repr_func(const Point& p) { return "<Point x=...>"; }
// m.def("__repr__", &repr_func);
```

> Lambda 是 C++11 引入的"匿名函数"，类似 Python 的 `lambda`。在 pybind11 里常用来**在绑定处直接写转换逻辑**，不用单独定义函数。

---

### 3.2 完整示例：绑定函数

> **完整可复现项目**——建一个文件夹 `pybind_demo/`，放两个文件：
>
> ```
> pybind_demo/         ← 建一个新文件夹
> ├── vector_ops.cpp   ← C++ 代码（含 pybind11 绑定）
> └── test.py          ← Python 测试代码
> ```
>
> 前置条件：`pip install pybind11`（在 venv 或 conda 环境里装）
> 下面所有命令都在 `pybind_demo/` 文件夹里执行。

**第一步：写 C++ 代码**

```cpp
// vector_ops.cpp
#include <pybind11/pybind11.h>  // pybind11 的主头文件

namespace py = pybind11;  // 简写，之后用 py:: 代替 pybind11::

int add(int lhs, int rhs) {
    return lhs + rhs;
}

// PYBIND11_MODULE 定义 Python 模块
// 第一个参数 vector_ops：模块名，必须和编译出来的 .so 名字一致
//   编译出来的文件叫 vector_ops.cpython-3xx-xxx.so，Python 里 import vector_ops
// 第二个参数 module：模块对象（Python 里的 import 名字），名字随意（通常写 m 或 module）
PYBIND11_MODULE(vector_ops, module) {
    module.doc() = "minimal vector ops extension";  // 模块的 __doc__

    // 绑定函数：Python 里可以 vector_ops.add(1, 2)
    module.def("add", &add, py::arg("lhs"), py::arg("rhs"));
    //  module.def("函数名", &C++函数指针, 参数说明...)
    //  py::arg 让 Python 侧支持关键字参数：add(lhs=1, rhs=2)
}
```

**第二步：编译**

```bash
# 方法一：直接用 g++（简单项目用这个）
g++ -O3 -shared -fPIC \
    $(python -m pybind11 --includes) \
    vector_ops.cpp \
    -o vector_ops$(python3-config --extension-suffix)
# 逐字解释：
#   -O3 -shared -fPIC     和 ctypes 章节一样：优化 + 动态库 + 位置无关
#   $(python -m pybind11 --includes)  命令替换：运行 python -m pybind11 --includes
#       输出类似 -I/usr/include/python3.11 -I.../pybind11/include
#       让 g++ 能找到 Python.h 和 pybind11 的头文件
#   vector_ops.cpp         源文件
#   -o vector_ops$(python3-config --extension-suffix)
#       $(python3-config --extension-suffix) 输出 .cpython-311-x86_64-linux-gnu.so
#       所以最终文件名是 vector_ops.cpython-311-x86_64-linux-gnu.so
#       这个名字让 Python 能正确识别为扩展模块

# 方法二：用 CMake（推荐，见第五章）

# 验证编译是否成功
ls vector_ops*.so
# 应该看到 vector_ops.cpython-3xx-xxx.so 文件
```

#### 用 uv 管理 Python 时的编译命令（uv 用户必看）

> 如果你用 `uv`（Astral 出的 Python 包管理器）启动 Python，上面命令里的 `python` 和 `python3-config` 都要换成 uv 版本，否则会报 `Command 'python3-config' not found`。

**为什么标准命令会报错**：

`python3-config` 是 `python3-dev`（Debian/Ubuntu）或 `python3-devel`（Fedora）包提供的命令，不是 Python 本身自带的。uv 安装的 Python 是独立版本（不在系统包管理里），所以 `python3-config` 不在 PATH 里，报：

```
Command 'python3-config' not found, but can be installed with:
sudo apt install python3-dev
```

**解法一：全部用 `uv run` 前缀（推荐，不用装 python3-dev）**

```bash
# uv 版本：把 python 和 python3-config 都换成 uv run python 的等价命令
g++ -O3 -shared -fPIC \
    $(uv run python -m pybind11 --includes) \
    vector_ops.cpp \
    -o vector_ops$(uv run python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))")
```

**逐段解释——原命令和 uv 版本的对照**：

| 原命令 | uv 版本 | 作用 |
|--------|---------|------|
| `python -m pybind11 --includes` | `uv run python -m pybind11 --includes` | 输出头文件路径（加 `uv run` 前缀） |
| `python3-config --extension-suffix` | `uv run python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))"` | 输出 `.cpython-3xx-xxx.so` 后缀 |

> `python3-config --extension-suffix` 本质就是查 `sysconfig` 的 `EXT_SUFFIX` 变量。uv 没有独立的 `python3-config` 命令，但可以直接用 Python 代码查到一样的值，结果完全等价。

**解法二：装 python3-dev（如果系统也用 Python）**

```bash
# 让 python3-config 可用（但注意：这是系统的 Python，不是 uv 的 Python）
sudo apt install python3-dev
# 装完后原命令就能跑了，但要确认 python3-config 对应的 Python 版本
# 和你 uv 用的 Python 版本一致，否则 .so 后缀对不上
python3-config --extension-suffix   # 看输出版本对不对
```

> ⚠️ 解法二的风险：`python3-config` 查的是**系统 Python** 的后缀（比如 3.10），但你 uv 用的可能是 3.12，后缀不一致会导致 `import` 失败（Python 找不到对应版本的 .so）。**推荐用解法一**，确保查的是同一个 Python。

**解法三：用 CMake（一劳永逸，见第五章）**

CMake + pybind11 会自动找到正确的 Python 和头文件，不用手动写 `python3-config`。uv 用户也能用，只要 `uv run cmake` 时 `find_package(Python)` 能找到 uv 的 Python 即可。这是**最推荐的方式**，不用纠结各种命令替换。

> **速查**：uv 环境下 `python3-config --extension-suffix` 的等价写法
>
> ```bash
> uv run python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))"
> ```
> 输出示例：`.cpython-313-x86_64-linux-gnu.so`

**第三步：Python 侧使用**

```python
# test.py
import vector_ops   # 导入编译好的扩展（.so 文件要在当前目录或 PYTHONPATH 里）

result = vector_ops.add(1, 2)
print(result)  # 3

# 支持关键字参数（因为 C++ 里用了 py::arg）
result = vector_ops.add(lhs=10, rhs=20)
print(result)  # 30
```

```bash
# 运行（在 pybind_demo/ 目录下）
python test.py
# 输出：
# 3
# 30
```

### 3.3 绑定 C++ 类

> 这个示例和 3.2 一样的项目结构，只是 C++ 代码更复杂（绑定一个类）。建一个文件夹 `pybind_class/`，放 `point.cpp` 和 `test.py`。

```cpp
// point.cpp
#include <pybind11/pybind11.h>
#include <cmath>   // std::sqrt

namespace py = pybind11;

class Point {
public:
    Point(float x, float y) : x_(x), y_(y) {}  // 构造函数

    float x() const { return x_; }   // getter
    float y() const { return y_; }

    float distance_to(const Point& other) const {  // 计算两点距离
        float dx = x_ - other.x_;
        float dy = y_ - other.y_;
        return std::sqrt(dx * dx + dy * dy);
    }

private:
    float x_, y_;
};

PYBIND11_MODULE(point, m) {        // 模块名叫 point
    // py::class_<类名>(模块, "Python里的类名")
    py::class_<Point>(m, "Point")
        .def(py::init<float, float>())           // 绑定构造函数 Point(x, y)
        .def("x", &Point::x)                     // 绑定方法 .x()
        .def("y", &Point::y)
        .def("distance_to", &Point::distance_to)
        .def("__repr__", [](const Point& p) {    // 自定义 Python 的 repr（print 时显示）
            return "<Point x=" + std::to_string(p.x())
                 + ", y=" + std::to_string(p.y()) + ">";
        });
    // 注意：.def() 可以链式调用，每个 .def 绑定一个方法
}
```

```bash
# 编译（和 3.2 一样的命令，只是文件名和模块名变了）
g++ -O3 -shared -fPIC \
    $(python -m pybind11 --includes) \
    point.cpp \
    -o point$(python3-config --extension-suffix)

# uv 用户用这个版本（见 3.2 节的 uv 说明）：(需要先使用 uv init 以及 uv add pybind11 才能运行)
g++ -O3 -shared -fPIC \
    $(uv run python -m pybind11 --includes) \
    point.cpp \
    -o point$(uv run python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))")
```

```python
# test.py
import point

p1 = point.Point(0.0, 0.0)        # 构造函数
p2 = point.Point(3.0, 4.0)

print(p1)                          # <Point x=0.000000, y=0.000000>
print(p1.x(), p1.y())              # 0.0 0.0
print(p1.distance_to(p2))          # 5.0（勾股定理 3-4-5）
```

然后使用`uv run python test.py` 即可，结果如下：

```bash
lenck@DESKTOP-1EV6QJM:~/ai-infra/cpp_projects/pybind_class$ uv run python test.py
<Point x=0.000000, y=0.000000>
0.0 0.0
5.0
```



### 3.4 绑定 NumPy 数组

> 建文件夹 `pybind_numpy/`，放 `vector_math.cpp` 和 `test.py`。这个示例展示 pybind11 怎么接收 NumPy 数组（比 ctypes 的指针方式更自然）。

```cpp
// vector_math.cpp
#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>   // pybind11 的 NumPy 支持
#include <cmath>

namespace py = pybind11;

// py::array_t<float> 接收 NumPy float32 数组
// 和 ctypes 不同，pybind11 自动处理类型检查和内存映射
py::array_t<float> vector_square(py::array_t<float> input) {
    // 获取数组信息（类似 ctypes 的指针，但更安全）
    auto buf = input.request();  // 请求数组缓冲区，返回一个包含指针/shape/stride 的对象

    // 检查是否是一维数组
    if (buf.ndim != 1) {
        throw std::runtime_error("输入必须是一维数组");
        // pybind11 会自动把这个 C++ 异常转成 Python 的 RuntimeError
    }

    // 创建输出数组（同形状）
    auto result = py::array_t<float>(buf.size);
    auto result_buf = result.request();

    // 获取数据指针（从这里开始和普通 C++ 代码一样）
    float* in_ptr = static_cast<float*>(buf.ptr);
    float* out_ptr = static_cast<float*>(result_buf.ptr);

    // 计算
    for (size_t i = 0; i < buf.size; ++i) {
        out_ptr[i] = in_ptr[i] * in_ptr[i];
    }

    return result;  // pybind11 自动把 C++ 的 array_t 转回 Python 的 NumPy 数组
}

// 原地修改版本（零拷贝：直接改输入数组的内存，不创建新数组）
void vector_scale_inplace(py::array_t<float> arr, float factor) {
    auto buf = arr.request();
    float* ptr = static_cast<float*>(buf.ptr);
    for (size_t i = 0; i < buf.size; ++i) {
        ptr[i] *= factor;
    }
}

PYBIND11_MODULE(vector_math, m) {
    m.def("square", &vector_square, "对数组每个元素求平方");
    m.def("scale_inplace", &vector_scale_inplace,
          py::arg("arr"), py::arg("factor"));
}
```

```bash
# 编译（和前面一样的命令）
g++ -O3 -shared -fPIC \
    $(python -m pybind11 --includes) \
    vector_math.cpp \
    -o vector_math$(python3-config --extension-suffix)

# uv 用户用这个版本（见 3.2 节的 uv 说明）：
g++ -O3 -shared -fPIC \
    $(uv run python -m pybind11 --includes) \
    vector_math.cpp \
    -o vector_math$(uv run python -c "import sysconfig; print(sysconfig.get_config_var('EXT_SUFFIX'))")
```

```python
# test.py
import numpy as np
import vector_math

arr = np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float32)

# 返回新数组（不修改原数组）
result = vector_math.square(arr)
print(result)  # [ 1.  4.  9. 16.]

# 原地修改（零拷贝，直接改 arr 的内存）
vector_math.scale_inplace(arr, 2.0)
print(arr)  # [2. 4. 6. 8.]  ← arr 被修改了
```

### 3.5 释放 GIL（让 C++ 计算时其他 Python 线程能跑）

> **先说 GIL 是什么**：GIL（Global Interpreter Lock）是 Python 的全局锁——同一时刻只有一个线程能执行 Python 代码。调用 C++ 扩展时，默认也持有 GIL，导致其他 Python 线程被阻塞。如果 C++ 代码是纯计算（不碰 Python 对象），可以临时释放 GIL，让其他 Python 线程能同时跑。

> 这个示例建文件夹 `pybind_gil/`，放 `mylib.cpp`。

```cpp
// mylib.cpp
#include <pybind11/pybind11.h>
#include <cmath>

namespace py = pybind11;

// 这是不涉及 Python 的纯 C++ 计算
void heavy_computation(float* data, int size) {
    for (int i = 0; i < size; ++i) {
        data[i] = std::sqrt(data[i]);
    }
}

PYBIND11_MODULE(mylib, m) {
    m.def("compute", [](py::array_t<float> arr) {
        auto buf = arr.request();
        float* ptr = static_cast<float*>(buf.ptr);

        // py::gil_scoped_release 释放 GIL
        // 期间不能调用任何 Python API！（不能碰 Python 对象）
        {
            py::gil_scoped_release release;   // 进入：释放 GIL
            heavy_computation(ptr, buf.size); // 这时其他 Python 线程能跑
        }  // 离开花括号，GIL 自动重新获取
    });
}
```

> **关键规则**：`gil_scoped_release` 的大括号里**只能操作纯 C/C++ 数据**（裸指针、`std::vector` 等），不能碰任何 Python 对象（`py::list`、`py::str`、甚至 `py::print`）。因为 GIL 释放后，其他 Python 线程可能同时在改这些对象，碰了会崩溃。

### 3.6 绑定大型数组时的检查清单

```cpp
py::array_t<float> process(py::array_t<float> input) {
    auto buf = input.request();

    // ① dtype 是否匹配？（py::array_t<float> 已强制 float32）
    // 如果想接受多种类型，用 py::array（不模板化）+ 手动检查

    // ② shape 是否符合算法假设？
    if (buf.ndim != 2) {
        throw std::runtime_error("需要二维数组");
    }

    // ③ 数据是否连续？
    // py::array_t 默认要求连续，但可以加 py::array::c_style
    if (!(input.flags() & py::array::c_style)) {
        throw std::runtime_error("数组必须是 C 连续的");
    }

    // ④ 内存位于 CPU 还是 GPU？
    // py::array_t 只能处理 CPU 内存
    // GPU 要用 torch::Tensor + CUDA 扩展

    // ⑤ 谁拥有底层存储？
    // 如果返回新数组（如 py::array_t<float>(...)），新数组拥有自己的内存 ✅
    // 如果返回对输入的引用，要确保输入的生命周期

    // ⑥ 计算期间是否应该释放 GIL？
    // 纯 C++ 计算 → 释放 GIL（py::gil_scoped_release）
    // 需要调 Python API → 不释放

    // ⑦ 原生异常如何转换为 Python 异常？
    // throw std::runtime_error("...") → 自动变成 Python RuntimeError
    // throw std::invalid_argument("...") → 自动变成 Python ValueError
}
```

---

## 四、零拷贝不是"没有条件"

### 4.1 什么是零拷贝（先用 Python 类比）

**先看"有拷贝"的场景**（Python 里的例子）：

```python
# 有拷贝：Python 把数据复制一份给 C++
data = [1.0, 2.0, 3.0]
# 调用 C++ 函数时，Python 把 data 的内容复制到一块新的 C++ 内存里
# C++ 函数处理完后，结果再复制回 Python
# 问题：大数据（比如 1GB 的数组）复制一次就要几十毫秒，白白浪费时间
```

**零拷贝**：Python 和 C++ 共享同一块底层内存，不复制数据。

```python
# 零拷贝：Python 和 C++ 用同一块内存
import numpy as np
arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
# arr 的底层是一块连续的 float32 内存
# 把这块内存的地址传给 C++，C++ 直接在这块内存上读写
# 不复制任何数据！
```

**图解**：

```
有拷贝：                         零拷贝：
Python 对象                      Python 对象（NumPy 数组）
  │                                │
  ▼ 复制数据（慢）                   ▼ 只传指针（快）
C++ 缓冲区（新内存）              C++ 指针（指向同一块内存）
（两块内存，内容一样）            （只有一块内存，双方共享）
```

**什么时候零拷贝有价值**：数据量大的时候（比如 1M 个 float 的数组，复制要几毫秒，零拷贝瞬间完成）。数据量小的时候（比如 3 个 float），复制开销可以忽略，零拷贝的复杂度反而不值得。

### 4.2 零拷贝的七项契约

零拷贝要求双方对以下**七项契约**达成一致：

```
地址 + 元素类型 + 形状 + 步长 + 设备 + 生命周期 + 可变性
```

| 契约 | 不一致的后果 |
|------|------------|
| **地址** | 访问非法内存 → 崩溃 |
| **元素类型** | float32 当 float64 读 → 数据错误 |
| **形状** | (3,4) 当 (4,3) 读 → 数据错位 |
| **步长** | 转置数组当连续读 → 数据错误 |
| **设备** | GPU 指针当 CPU 读 → 崩溃 |
| **生命周期** | Python 释放了，C++ 还在用 → use-after-free |
| **可变性** | 只读数据当可变写 → 数据损坏 |

### 4.3 步长（stride）陷阱

```python
import numpy as np

# 创建一个 2x3 数组
a = np.array([[1, 2, 3],
              [4, 5, 6]], dtype=np.float32)

# 转置
b = a.T  # b 是 3x2，但不连续！

print(b)
# [[1. 4.]
#  [2. 5.]
#  [3. 6.]]

print(a.flags['C_CONTIGUOUS'])  # True ← 连续！
print(b.flags['C_CONTIGUOUS'])  # False ← 不连续！

# 如果 C++ 假设连续，按 C 顺序读 b 的底层内存：
# 实际内存：[1,2,3,4,5,6]       ← 这是 a 的内存布局，b 只是 a 的"视角"
# C++ 读成：[[1,2],[3,4],[5,6]]  ← 错了！
# 应该是：  [[1,4],[2,5],[3,6]]  ← b 看到的形状是 3x2
```

**逐行解释这段在说什么**：

1. `a = np.array([[1,2,3],[4,5,6]])` 创建 2 行 3 列数组，内存里存的是 `[1,2,3,4,5,6]`（按行存储）
2. `b = a.T` 转置成 3 行 2 列，但**没有复制数据**——b 和 a 共享同一块内存 `[1,2,3,4,5,6]`
3. b 的形状是 `(3,2)`，但底层内存还是 a 的 `[1,2,3,4,5,6]`
4. 如果 C++ 代码假设"3x2 = 前 6 个数按行排列"，会读成 `[[1,2],[3,4],[5,6]]`
5. 但 b 的实际语义是"a 的转置"，应该是 `[[1,4],[2,5],[3,6]]`
6. **问题根源**：b 的数据不是按 C 顺序（行优先）排列的，它用了 stride 来表达"怎么从底层内存取出正确的数据"

> **stride 是什么**：NumPy 数组除了 shape（每维大小）还有 strides（每维的步长，单位是字节）。它告诉 NumPy"要取第 i 行第 j 列的元素，在底层内存里偏移多少字节"。连续数组的 stride 就是"一行多少字节"，不连续数组（如转置）的 stride 不同。

**解决方法**：

```python
# 方法一：强制连续化（会复制）
b_contiguous = np.ascontiguousarray(b)

# 方法二：在 C++ 侧用 strides 信息
```

```cpp
// C++ 侧正确处理 strides
py::array_t<float> process_with_strides(py::array_t<float> input) {
    auto buf = input.request();

    // buf.shape[i]  → 第 i 维大小
    // buf.strides[i] → 第 i 维步长（字节）

    // 用 strides 访问元素
    for (ssize_t i = 0; i < buf.shape[0]; ++i) {
        for (ssize_t j = 0; j < buf.shape[1]; ++j) {
            // 注意：strides 是字节数，要除以 sizeof(float)
            float* ptr = static_cast<float*>(
                static_cast<char*>(buf.ptr) + i * buf.strides[0] + j * buf.strides[1]
            );
            *ptr *= 2.0f;
        }
    }
    return input;
}
```

**逐行解释这个 `static_cast` 嵌套怎么读**：

```cpp
float* ptr = static_cast<float*>(
    static_cast<char*>(buf.ptr) + i * buf.strides[0] + j * buf.strides[1]
);
```

从内到外拆：

```
① buf.ptr                         类型是 void*（无类型指针，指向数组开头）
② static_cast<char*>(buf.ptr)     转成 char*（字节指针）
                                   为什么用 char*？因为 strides 是字节数，
                                   char* + n 就是"往后移 n 个字节"
③ ... + i * buf.strides[0]        第 i 行偏移 strides[0] 字节
④ ... + j * buf.strides[1]        再偏移 strides[1] 字节（第 j 列）
⑤ static_cast<float*>(...)        把算好的字节地址转回 float*（按 float 读写）
```

> **为什么不能直接 `float* + offset`**：`float* + 1` 是"往后移一个 float（4 字节）"，但 strides 给的是字节数。所以要先转成 `char*`（字节指针）按字节计算偏移，再转回 `float*`。这是 C++ 里处理 stride 的标准套路。

### 4.4 生命周期陷阱

```python
import ctypes
import numpy as np

lib = ctypes.CDLL("./libscale.so")

# ❌ 危险：临时数组的指针可能在 C++ 使用前被回收
def bad_example():
    arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    ptr = arr.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
    return ptr  # arr 离开作用域可能被回收，ptr 悬空！

ptr = bad_example()
lib.scale(ptr, 3, 2.0)  # 可能 use-after-free！

# ✅ 正确：保持数组引用
def good_example():
    arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    ptr = arr.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
    return arr, ptr  # 返回数组本身，保持引用

arr, ptr = good_example()
lib.scale(ptr, 3, 2.0)  # 安全，arr 还活着
print(arr)  # [2. 4. 6.]
```

### 4.5 核心原则

> **把数据布局和所有权当作接口的一部分，而不是实现细节。**

```cpp
// ❌ 坏接口：隐藏了布局假设
void process(float* data, int size);  // 调用者不知道要不要连续

// ✅ 好接口：明确要求
void process(py::array_t<float, py::array::c_style> data);
// 明确要求 C 连续，调用者必须保证
```

**为什么 `py::array_t<float, py::array::c_style>` 有两个尖括号参数**：

`py::array_t` 是一个模板类，可以接受两个模板参数：

| 写法 | 含义 |
|------|------|
| `py::array_t<float>` | 只指定元素类型是 float，不强制要求连续 |
| `py::array_t<float, py::array::c_style>` | 元素是 float，**且必须 C 连续**（行优先） |
| `py::array_t<float, py::array::f_style>` | 元素是 float，且必须 Fortran 连续（列优先） |

> `py::array::c_style` 是一个编译期标记，传进来的 NumPy 数组如果不是 C 连续的，pybind11 会自动复制一份连续的版本。这样 C++ 代码里就不用检查 stride 了，可以放心按行优先顺序访问。
>
> 类比 Python：相当于 `np.ascontiguousarray(arr)` 但在 C++ 侧自动完成。

---

## 五、CMake 构建扩展（推荐）

> 手动用 g++ 编译（3.2 的方法二）在项目大了以后很麻烦。CMake 能自动找到 pybind11、管理编译参数，是正式项目的推荐方式。

### 5.1 用 CMake 编译 pybind11 扩展

> **完整可复现项目**——建一个文件夹 `cmake_pybind/`，放两个文件：
>
> ```
> cmake_pybind/          ← 建一个新文件夹
> ├── CMakeLists.txt     ← CMake 构建配置
> └── vector_ops.cpp     ← C++ 代码（用 3.2 的那个）
> ```
>
> 前置：`pip install pybind11`，并且系统装了 cmake（`cpp/环境配置教程.md` 有安装方法）。
> 下面所有命令在 `cmake_pybind/` 目录下执行。
>
> **uv 用户注意**：CMake 默认找系统 Python，可能找不到 uv 装的 pybind11。看本节末尾的"uv 环境配置"补充。

```cpp
// vector_ops.cpp（和 3.2 一样的代码）
#include <pybind11/pybind11.h>
namespace py = pybind11;

int add(int lhs, int rhs) { return lhs + rhs; }

PYBIND11_MODULE(vector_ops, m) {
    m.def("add", &add, py::arg("lhs"), py::arg("rhs"));
}
```

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(vector_ops LANGUAGES CXX)

# 找 pybind11（它会自动找到 Python 和头文件）
find_package(pybind11 REQUIRED)

# 创建 Python 扩展模块
# pybind11_add_module 是 pybind11 提供的宏，专门用来编译 Python 扩展
# 第一个参数：模块名（要和 PYBIND11_MODULE 宏的第一个参数一致）
# 第二个参数：源文件
pybind11_add_module(vector_ops vector_ops.cpp)

# 启用优化和警告
target_compile_options(vector_ops PRIVATE -O3 -Wall -Wextra)
```

```bash
# 编译（在 cmake_pybind/ 目录下）
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
#   -S .            源码目录是当前目录
#   -B build        构建目录是 build/（自动创建）
#   -DCMAKE_BUILD_TYPE=Release  Release 模式（启用优化）

cmake --build build --parallel
#   --build build   在 build/ 里构建
#   --parallel      并行编译

# 产物在 build/ 目录下
ls build/vector_ops*.so
# build/vector_ops.cpython-3xx-xxx.so

# 测试（进 build 目录让 Python 能找到 .so）
cd build && python -c "import vector_ops; print(vector_ops.add(1,2))"
# 输出：3
cd ..  # 回到 cmake_pybind/
```

#### uv 环境：CMake 编译 pybind11 完整解决方案（实测有效）

> uv 环境下 CMake + pybind11 会遇到**两个连环问题**，必须一起解决。之前只解决了第一个，所以还是会报第二个错。

**问题链路（两个连环坑）**：

```
问题 1：find_package(pybind11) 找不到
         → 解法：-Dpybind11_DIR=$(uv run python -m pybind11 --cmakedir)
         → ✅ 解决了

问题 2（解决 1 之后才暴露）：
         Imported target "pybind11::module" includes non-existent path
         "/usr/include/python3.12"
         → 原因：pybind11 的旧版 Python 查找逻辑（FindPythonLibsNew）
           找到了系统 Python 3.12，但系统没装 python3-dev 头文件
           而且你 uv 用的是 Python 3.13，版本对不上
         → 解法：改 CMakeLists.txt，强制用新版 Python 查找逻辑
```

**根本原因**：pybind11 内部默认用旧的 `FindPythonLibsNew` 查找 Python，它找到系统 Python 3.12 而不是 uv 的 Python 3.13，然后去找 `/usr/include/python3.12`（不存在）。`-DPython_EXECUTABLE` 对这个旧逻辑**无效**（CMake 会提示"Manually-specified variables were not used"）。

**正确解法：改 CMakeLists.txt + cmake 命令（一起改才能解决）**

把 CMakeLists.txt 改成这个版本（标准版保留在上方，uv 版在下方注释）：

```cmake
# CMakeLists.txt（uv 环境正确版本）
cmake_minimum_required(VERSION 3.20)
project(vector_ops LANGUAGES CXX)

# ========== 关键改动：先找 Python，再让 pybind11 复用 ==========
# 第 1 步：用 CMake 现代的 find_package(Python) 找到 uv 的 Python
#   Development.Module = 只需要头文件（编译扩展用），不需要 libpython
find_package(Python COMPONENTS Interpreter Development.Module REQUIRED)

# 第 2 步：告诉 pybind11"用上面找到的 Python，别自己再找一次系统的"
set(PYBIND11_FINDPYTHON ON)

# 第 3 步：找 pybind11（这时它会复用第 1 步找到的 Python）
find_package(pybind11 REQUIRED)

pybind11_add_module(vector_ops vector_ops.cpp)
target_compile_options(vector_ops PRIVATE -O3 -Wall -Wextra)
```

然后编译命令**必须同时传两个参数**：

```bash
# 先删掉旧的 build 目录（CMake 会缓存旧的配置，不删可能还是报错）
rm -rf build

# 编译
cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DPython_EXECUTABLE=$(uv run python -c "import sys; print(sys.executable)") \
    -Dpybind11_DIR=$(uv run python -m pybind11 --cmakedir)

cmake --build build --parallel

# 测试
cd build && uv run python -c "import vector_ops; print(vector_ops.add(1,2))"
# 输出：3
cd ..
```

**逐行解释为什么这样改**：

| 改动 | 作用 |
|------|------|
| `find_package(Python COMPONENTS Interpreter Development.Module REQUIRED)` | 用 CMake 现代方式找 Python，通过 `-DPython_EXECUTABLE=...` 指定 uv 的 Python 3.13 |
| `set(PYBIND11_FINDPYTHON ON)` | 告诉 pybind11 用现代 `find_package(Python)` 而不是旧的 `FindPythonLibsNew`，这样它会复用第 1 步的结果 |
| `find_package(pybind11 REQUIRED)` | 现在找到的 pybind11 会正确关联 uv 的 Python 3.13，不再去找系统的 3.12 |
| `rm -rf build` | **必须删**！CMake 会缓存上次的配置结果，不删的话旧配置还在，改了 CMakeLists.txt 也不生效 |
| `-DPython_EXECUTABLE=$(uv run python -c "...")` | 告诉第 1 步的 `find_package(Python)` 用 uv 的 Python |
| `-Dpybind11_DIR=$(uv run python -m pybind11 --cmakedir)` | 告诉第 3 步的 `find_package(pybind11)` 去哪找 pybind11 的 CMake 配置 |

> **关键**：`find_package(Python)` 必须在 `find_package(pybind11)` **之前**调用。pybind11 看到已经有 `Python::Python` target 就会复用，不会再自己找系统的。

**为什么之前的三个解法不够**：

| 之前的解法 | 为什么不够 |
|-----------|-----------|
| 只传 `-Dpybind11_DIR=...` | 解决了"找不到 pybind11"，但 pybind11 还是去找系统 Python 3.12 |
| 只传 `-DPython_EXECUTABLE=...` | 旧版 `FindPythonLibsNew` 忽略这个变量（CMake 提示"not used"） |
| CMakeLists.txt 里写死 `pybind11_DIR` | 同上，只是换了传参方式，没解决 Python 版本问题 |

> **速查命令**（uv 环境下编译 pybind11 扩展的两条命令）：
> ```bash
> # 1. 查 pybind11 的 CMake 目录
> uv run python -m pybind11 --cmakedir
>
> # 2. 查 uv 的 Python 可执行文件路径
> uv run python -c "import sys; print(sys.executable)"
> ```

### 5.2 用 setup.py 安装（更规范）

```python
# setup.py
from setuptools import setup
from pybind11.setup_helpers import Pybind11Extension

ext_modules = [
    Pybind11Extension(
        "vector_ops",
        sources=["vector_ops.cpp"],
        extra_compile_args=["-O3"],
    ),
]

setup(
    name="vector_ops",
    version="0.1.0",
    ext_modules=ext_modules,
)
```

```bash
pip install .  # 编译并安装
# 然后在任何地方都能 import vector_ops
```

#### uv 环境：setup.py 安装怎么装

> uv 默认不安装独立的 `pip` 命令（`uv run pip` 会报 `Failed to spawn: pip`），而且 `uv run python pip` 语法也错了。正确写法如下：

```bash
# 方法一：用 uv 自带的 pip 接口（推荐，最简单）
uv pip install .
# uv pip 是 uv 内置的 pip 兼容命令，不需要环境里真的装了 pip
# 它会读取当前目录的 setup.py，编译并安装扩展

# 方法二：通过 python -m pip 调用（需要环境里有 pip）
uv run python -m pip install .
# python -m pip = "用当前 Python 对应的 pip"，比直接 pip 更安全
# 但 uv 默认环境可能没有 pip，需要先装：
#   uv pip install pip   # 先装 pip，再 uv run python -m pip install .
```

**为什么你之前的命令报错**：

| 你试的命令 | 报错 | 原因 |
|-----------|------|------|
| `uv run pip install .` | `Failed to spawn: pip` | uv 环境里没有独立的 `pip` 可执行文件 |
| `uv run python pip install .` | `can't open file 'pip'` | 语法错了：`python` 后面要么跟脚本文件名（`python script.py`），要么跟 `-m` 模块名（`python -m pip`）。直接写 `python pip` 它把 `pip` 当成脚本文件去找了 |

> **记忆规则**：uv 环境下调用 pip 有两种正确方式：
> - `uv pip install xxx` —— uv 内置的 pip（推荐，不用装 pip）
> - `uv run python -m pip install xxx` —— 通过 Python 调用（需要先装 pip）
>
> **绝对不要**写 `uv run pip` 或 `uv run python pip`。

**安装后验证**：

```bash
# 安装完后，在任何目录都能 import（因为装到了 venv 的 site-packages）
uv run python -c "import vector_ops; print(vector_ops.add(1, 2))"
# 输出：3

# 看装在哪
uv run python -c "import vector_ops; print(vector_ops.__file__)"
# 输出类似：.venv/lib/python3.13/site-packages/vector_ops.cpython-313-xxx.so
```

#### uv 环境：setup.py 安装的连环坑（build isolation 问题）

> **报错现象**：`uv pip install .` 报 `ModuleNotFoundError: No module named 'pybind11'`
>
> **原因**：uv 默认用 **build isolation（构建隔离）**——它在一个干净的临时环境里跑 setup.py，这个临时环境只有 setup.py 里声明的依赖。你的 setup.py 里 `from pybind11.setup_helpers import Pybind11Extension` 需要 pybind11，但 uv 的构建隔离环境里没装它，所以报 `No module named 'pybind11'`。

**解法一：加 pyproject.toml 声明构建依赖（推荐，最规范）**

在项目根目录创建 `pyproject.toml`（和 setup.py 放一起）：

```toml
# pyproject.toml
[build-system]
requires = ["setuptools", "pybind11"]
build-backend = "setuptools.build_meta"
```

**逐行解释**：
- `requires` = 构建这个包时需要的依赖（构建隔离环境里会装这些）
- `build-backend` = 用哪个构建后端（setuptools 是最通用的）

这样 uv 在构建隔离环境里会自动装 setuptools + pybind11，setup.py 就能 `import pybind11` 了。

```bash
# 加了 pyproject.toml 后重新安装
uv pip install .
# 现在能正常编译安装了 ✅
```

**解法二：禁用构建隔离（快速，但需要环境里有 pybind11）**

```bash
# 先确保环境里有 pybind11
uv pip install pybind11

# 禁用构建隔离，直接用当前环境的依赖来构建
uv pip install . --no-build-isolation
#   --no-build-isolation  不创建隔离环境，用当前 venv 里已装的包
# 前提：当前 venv 里必须装了 setuptools 和 pybind11
```

**解法三：在 pyproject.toml 里用 uv 的扩展语法（uv 专有）**

```toml
# pyproject.toml
[build-system]
requires = ["setuptools", "pybind11"]
build-backend = "setuptools.build_meta"

# uv 专有：为特定包额外加构建依赖
[tool.uv.extra-build-dependencies]
cmake-pybind = ["pybind11"]
```

> **推荐用解法一**：加一个 3 行的 pyproject.toml 最省事，任何 PEP 517 兼容的工具（uv、pip、build）都能正确构建。

**为什么 `uv run python -m pip install .` 也不行**：

报 `No module named pip`——因为 uv 环境默认连 pip 都没装。即使装了 pip，也会遇到和 `uv pip install .` 一样的构建隔离问题（pybind11 不在隔离环境里）。所以核心解法还是加 `pyproject.toml` 声明构建依赖。

**完整的 uv 环境 setup.py 安装流程**（从零开始）：

```bash
# 1. 确保项目结构（setup.py + pyproject.toml + 源文件都在）
ls
# CMakeLists.txt  pyproject.toml  setup.py  vector_ops.cpp

# 2. 用 uv 安装
uv pip install .
# uv 会：创建隔离环境 → 装 setuptools + pybind11（pyproject.toml 声明的）
#      → 跑 setup.py 编译 → 安装到 venv

# 3. 验证
uv run python -c "import vector_ops; print(vector_ops.add(1, 2))"
# 输出：3 ✅
```

---

## 六、方法选择决策树

```
你要从 Python 调用 C/C++
│
├─ 调用已有的 C 库（稳定 ABI）→ ctypes
│   ├─ 简单函数，少量调用
│   └─ 不想编译扩展
│
├─ 绑定 C++ 类/复杂接口 → pybind11
│   ├─ 需要 C++ 类、异常、STL 支持
│   ├─ 需要 NumPy 数组互操作
│   └─ 愿意写 CMake/setup.py
│
├─ PyTorch 自定义算子 → torch.utils.cpp_extension
│   ├─ 需要 autograd 支持
│   └─ 需要 GPU (CUDA) 支持
│
└─ 极致性能 + 复杂类型 → nanobind（pybind11 的现代替代）
    ├─ 更快的编译速度
    └─ 更小的二进制体积
```

---

## 七、完整实战：从零写一个向量运算库

> 这是把前面学的 ctypes、pybind11、CMake、零拷贝、释放 GIL 综合起来做一个完整项目。
> **新人建议**：先把第二~五章的简单示例跑通，再来做这个综合项目。

### 7.1 项目结构

> 建一个文件夹 `myvec/`，按下面结构创建子目录和文件：
>
> ```
> myvec/                           ← 项目根目录
> ├── CMakeLists.txt               ← CMake 构建配置
> ├── include/
> │   └── myvec.h                  ← 库的头文件（声明）
> ├── src/
> │   └── myvec.cpp                ← 库的实现（定义）
> ├── bindings/
> │   └── myvec_bindings.cpp       ← pybind11 绑定（让 Python 能调）
> └── test.py                      ← Python 测试代码
> ```

**这个项目分三层**（理解这个结构对后面学 CUDA 项目很有帮助）：

```
┌─────────────────────────────────┐
│  Python 层（test.py）            │  ← 用户调用 myvec.dot(a, b)
├─────────────────────────────────┤
│  绑定层（myvec_bindings.cpp）     │  ← pybind11 桥接 Python 和 C++
│  把 NumPy 数组转成 C++ 指针       │
├─────────────────────────────────┤
│  C++ 库（myvec.h + myvec.cpp）    │  ← 纯 C++ 实现，不知道 Python 存在
└─────────────────────────────────┘
```

**为什么要分三层**：C++ 库可以被其他 C++ 项目复用（不用通过 Python）；绑定层只负责 Python ↔ C++ 的桥接；实现和接口分离是 C++ 的好习惯（见 `cpp/编译链接模板与构建系统.md` 的头文件/源文件分离）。

### 7.2 完整代码

**第一层：C++ 库的头文件（声明）**

```cpp
// include/myvec.h
#pragma once
#include <vector>
#include <cstddef>   // std::size_t

namespace myvec {    // 命名空间，防止和其他库的函数重名

// 点积：a·b = a[0]*b[0] + a[1]*b[1] + ...
float dot(const float* a, const float* b, std::size_t n);

// 向量加法：返回 [a[0]+b[0], a[1]+b[1], ...]
std::vector<float> add(const std::vector<float>& a,
                       const std::vector<float>& b);

// 原地缩放：data 的每个元素乘以 factor（直接改 data，不返回新数组）
void scale_inplace(float* data, std::size_t n, float factor);

// L2 范数：sqrt(data[0]² + data[1]² + ...)
float norm(const float* data, std::size_t n);

}  // namespace myvec
```

**第一层：C++ 库的实现（定义）**

```cpp
// src/myvec.cpp
#include "myvec.h"
#include <cmath>   // std::sqrt

namespace myvec {

float dot(const float* a, const float* b, std::size_t n) {
    float result = 0.0f;
    for (std::size_t i = 0; i < n; ++i) {
        result += a[i] * b[i];
    }
    return result;
}

std::vector<float> add(const std::vector<float>& a,
                       const std::vector<float>& b) {
    std::vector<float> result(a.size());
    for (std::size_t i = 0; i < a.size(); ++i) {
        result[i] = a[i] + b[i];
    }
    return result;
}

void scale_inplace(float* data, std::size_t n, float factor) {
    for (std::size_t i = 0; i < n; ++i) {
        data[i] *= factor;
    }
}

float norm(const float* data, std::size_t n) {
    float sum = 0.0f;
    for (std::size_t i = 0; i < n; ++i) {
        sum += data[i] * data[i];
    }
    return std::sqrt(sum);
}

}  // namespace myvec
```

**第二层：pybind11 绑定（桥接 Python 和 C++）**

```cpp
// bindings/myvec_bindings.cpp
#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
#include <pybind11/stl.h>  // 自动转换 std::vector ↔ Python list
#include "myvec.h"         // 引入 C++ 库的头文件

namespace py = pybind11;

PYBIND11_MODULE(myvec, m) {
    m.doc() = "vector operations in C++";

    // 绑定 dot：接收两个 NumPy 数组，返回 float
    m.def("dot", [](py::array_t<float> a, py::array_t<float> b) {
        auto buf_a = a.request();   // 获取数组 a 的底层信息（指针、大小等）
        auto buf_b = b.request();
        if (buf_a.size != buf_b.size) {
            throw std::runtime_error("数组长度不一致");
        }
        float* pa = static_cast<float*>(buf_a.ptr);  // 拿到原始指针
        float* pb = static_cast<float*>(buf_b.ptr);

        float result;
        {
            py::gil_scoped_release release;  // 释放 GIL（纯 C++ 计算，不碰 Python）
            result = myvec::dot(pa, pb, buf_a.size);
        }
        return result;
    }, py::arg("a"), py::arg("b"));

    // 绑定 add：接收两个 NumPy 数组，返回新数组
    m.def("add", [](py::array_t<float> a, py::array_t<float> b) {
        auto buf_a = a.request();
        auto buf_b = b.request();
        if (buf_a.size != buf_b.size) {
            throw std::runtime_error("数组长度不一致");
        }

        // 把 NumPy 数据复制到 std::vector（因为 C++ 库的 add 接收 vector）
        std::vector<float> va(buf_a.size);
        std::vector<float> vb(buf_b.size);
        std::copy(static_cast<float*>(buf_a.ptr),
                  static_cast<float*>(buf_a.ptr) + buf_a.size, va.begin());
        std::copy(static_cast<float*>(buf_b.ptr),
                  static_cast<float*>(buf_b.ptr) + buf_b.size, vb.begin());

        std::vector<float> result;
        {
            py::gil_scoped_release release;
            result = myvec::add(va, vb);
        }

        // 转回 NumPy 数组返回给 Python
        return py::array_t<float>(result.size(), result.data());
    });

    // 绑定 scale_inplace：原地修改（零拷贝）
    m.def("scale_inplace", [](py::array_t<float> arr, float factor) {
        auto buf = arr.request();
        float* ptr = static_cast<float*>(buf.ptr);
        {
            py::gil_scoped_release release;
            myvec::scale_inplace(ptr, buf.size, factor);
        }
    }, py::arg("arr"), py::arg("factor"));

    // 绑定 norm
    m.def("norm", [](py::array_t<float> arr) {
        auto buf = arr.request();
        float* ptr = static_cast<float*>(buf.ptr);
        float result;
        {
            py::gil_scoped_release release;
            result = myvec::norm(ptr, buf.size);
        }
        return result;
    });
}
```

**构建配置**

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.20)
project(myvec LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)

# 第一层：编译 C++ 库（纯 C++，不知道 Python 存在）
add_library(myvec_lib STATIC src/myvec.cpp)
#   STATIC  静态库（.a 文件），编译时复制进扩展
target_include_directories(myvec_lib PUBLIC include)
#   PUBLIC  绑定层也能用 include/myvec.h

# 第二层：编译 pybind11 扩展
find_package(pybind11 REQUIRED)
pybind11_add_module(myvec bindings/myvec_bindings.cpp)
target_link_libraries(myvec PRIVATE myvec_lib)
#   链接第一层的库，让绑定层能调用 myvec::dot 等函数
target_compile_options(myvec PRIVATE -O3 -Wall -Wextra)
```

**第三层：Python 测试**

```python
# test.py
import numpy as np
import myvec   # 导入编译好的扩展

a = np.array([1.0, 2.0, 3.0], dtype=np.float32)
b = np.array([4.0, 5.0, 6.0], dtype=np.float32)

print("dot:", myvec.dot(a, b))          # 1*4 + 2*5 + 3*6 = 32.0
print("norm(a):", myvec.norm(a))        # sqrt(1+4+9) = 3.7416575

c = myvec.add(a, b)
print("add:", c)                         # [5. 7. 9.]

myvec.scale_inplace(a, 2.0)
print("scaled a:", a)                    # [2. 4. 6.]  ← a 被原地修改
```

### 7.3 编译和运行

```bash
# 在 myvec/ 目录下执行

# 第一步：编译
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
# 产物：build/myvec.cpython-3xx-xxx.so

# 第二步：运行测试
# 方法一：进 build 目录跑（.so 在那里）
cd build && python ../test.py && cd ..
#   ../test.py  因为 test.py 在上一级目录（myvec/）

# 方法二：设 PYTHONPATH 让 Python 能找到 .so
export PYTHONPATH=build:$PYTHONPATH
python test.py

# 输出：
# dot: 32.0
# norm(a): 3.7416575
# add: [5. 7. 9.]
# scaled a: [2. 4. 6.]
```

#### uv方法一：CMake

需要改CMakeLists.txt：

```cmake
# CMakeLists.txt（uv 环境正确版本）
cmake_minimum_required(VERSION 3.20)
project(myvec LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)

add_library(myvec_lib STATIC src/myvec.cpp)
target_include_directories(myvec_lib PUBLIC include)

# ========== 关键改动：先找 Python，再让 pybind11 复用 ==========
# 第 1 步：用 CMake 现代的 find_package(Python) 找到 uv 的 Python
#   Development.Module = 只需要头文件（编译扩展用），不需要 libpython
find_package(Python COMPONENTS Interpreter Development.Module REQUIRED)

# 第 2 步：告诉 pybind11"用上面找到的 Python，别自己再找一次系统的"
set(PYBIND11_FINDPYTHON ON)

# 第 3 步：找 pybind11（这时它会复用第 1 步找到的 Python）
find_package(pybind11 REQUIRED)

pybind11_add_module(myvec bindings/myvec_bindings.cpp)
target_link_libraries(myvec PRIVATE myvec_lib)
target_compile_options(vector_ops PRIVATE -O3 -Wall -Wextra)
```

编译运行：

```bash
# 先删掉旧的 build 目录（CMake 会缓存旧的配置，不删可能还是报错）
rm -rf build

# 编译
cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DPython_EXECUTABLE=$(uv run python -c "import sys; print(sys.executable)") \
    -Dpybind11_DIR=$(uv run python -m pybind11 --cmakedir)

cmake --build build --parallel
# 产物：build/myvec.cpython-3xx-xxx.so

# 第二步：运行测试
# 方法一：进 build 目录跑（.so 在那里）
cd build && uv run python ../test.py && cd ..
#   ../test.py  因为 test.py 在上一级目录（myvec/）

# 方法二：设 PYTHONPATH 让 Python 能找到 .so
export PYTHONPATH=build:$PYTHONPATH
uv run python test.py

# 输出：
# dot: 32.0
# norm(a): 3.7416575
# add: [5. 7. 9.]
# scaled a: [2. 4. 6.]
```





#### uv方法二：setup.py

```python
# setup.py
from setuptools import setup
from pybind11.setup_helpers import Pybind11Extension

ext_modules = [
    Pybind11Extension(
        "myvec",
        sources=["bindings/myvec_bindings.cpp"],
        extra_compile_args=["-O3"],
    ),
]

setup(
    name="myvec",
    version="0.1.0",
    ext_modules=ext_modules,
)
```



```toml
# pyproject.toml
[build-system]
requires = ["setuptools", "pybind11"]
build-backend = "setuptools.build_meta"
```





```bash
# 加了 pyproject.toml 后重新安装
uv pip install .
# 现在能正常编译安装了 ✅

uv run python test.py
```

**如果 `uv pip install .` 成功但 `uv run python test.py` 报 `ModuleNotFoundError: No module named 'myvec'`**：

> 这是 setup.py 版本的**第三个连环坑**：setup.py 只编译了绑定层，漏了 C++ 库的实现，导致链接失败，.so 没生成，Python 自然找不到模块。

**根因**：setup.py 的 `Pybind11Extension` 只列了 `sources=["bindings/myvec_bindings.cpp"]`，但这个文件需要：
1. `#include "myvec.h"` —— 头文件在 `include/` 目录，但没告诉编译器去那找（缺 `include_dirs`）
2. 调用 `myvec::dot` 等 —— 实现在 `src/myvec.cpp`，但没加到 sources 里，链接器找不到定义

CMake 版用 `target_link_libraries(myvec PRIVATE myvec_lib)` 解决了这个，但 setup.py 没有等价的配置。

**修复后的 setup.py（必须改这两处）**：

```python
# setup.py（修复版）
from setuptools import setup
from pybind11.setup_helpers import Pybind11Extension

ext_modules = [
    Pybind11Extension(
        "myvec",
        sources=[
            "bindings/myvec_bindings.cpp",   # 绑定层
            "src/myvec.cpp",                  # ← 关键！C++ 库的实现也要一起编译
        ],
        include_dirs=["include"],             # ← 关键！告诉编译器去 include/ 找头文件
        extra_compile_args=["-O3"],
    ),
]

setup(
    name="myvec",
    version="0.1.0",
    ext_modules=ext_modules,
)
```

**两处改动对比**：

| 原来的 | 修复后 | 为什么 |
|--------|--------|--------|
| `sources=["bindings/myvec_bindings.cpp"]` | `sources=["bindings/myvec_bindings.cpp", "src/myvec.cpp"]` | 绑定层调用了 `myvec::dot` 等函数，但定义在 `src/myvec.cpp`，不一起编译就链接不过去 |
| （没有 include_dirs） | `include_dirs=["include"]` | `myvec_bindings.cpp` 里 `#include "myvec.h"` 在 `include/` 目录，不告诉编译器去那找就报 `fatal error: myvec.h: No such file` |

**完整修复流程**：

```bash
# 1. 确认文件都在
ls
# CMakeLists.txt  include/  src/  bindings/  test.py  setup.py  pyproject.toml

# 2. 改 setup.py（加上 src/myvec.cpp 和 include_dirs，见上面修复版）

# 3. 重新安装（先卸载旧的）
uv pip uninstall myvec
uv pip install .

# 4. 这次看 uv pip install 的输出有没有 "myvec.cpython-3xx-xxx.so"
# 如果看到类似 "building 'myvec' extension" + 编译输出，说明在编译 .so

# 5. 验证安装
uv run python -c "import myvec; print(myvec.__file__)"
# 应该输出：.venv/lib/python3.13/site-packages/myvec.cpython-313-xxx.so

# 6. 跑测试
uv run python test.py
# 输出：
# dot: 32.0
# norm(a): 3.7416575
# add: [5. 7. 9.]
# scaled a: [2. 4. 6.]
```

> **怎么判断 `uv pip install .` 到底有没有真正编译成功**：
> ```bash
> # 看安装后有没有 .so 文件
> uv run python -c "import myvec; print(myvec.__file__)"
> # 如果报 ModuleNotFoundError → 没装上（编译失败了但 setuptools 没报错）
> # 如果输出路径 → 装上了
> ```
>
> setuptools 有个坑：即使 C++ 编译失败，它也可能"成功"安装 Python 包（只是没有 .so）。所以 `uv pip install .` 不报错 ≠ 编译成功。**一定要用 `import` 验证**。

> **setup.py vs CMake 对比（为什么 CMake 版没这个问题）**：
>
> | 维度 | CMake 版 | setup.py 版 |
> |------|---------|-------------|
> | C++ 库的实现 | `add_library(myvec_lib STATIC src/myvec.cpp)` 单独编译成静态库 | 要手动加到 `sources` 列表里 |
> | 头文件路径 | `target_include_directories(myvec_lib PUBLIC include)` | 要手动写 `include_dirs=["include"]` |
> | 绑定层链接库 | `target_link_libraries(myvec PRIVATE myvec_lib)` | 不需要（因为直接把源文件编译进来了） |
>
> CMake 的 target 依赖管理更清晰，setup.py 要手动把所有源文件和路径都写进去。





---

## 八、概念速查表

| 概念 | 一句话记忆 |
|------|------------|
| 跨语言边界 | Python ↔ C++ 的调用，有参数转换/复制/GIL 开销 |
| 批处理原则 | 传一个数组，不要每个元素跨一次边界 |
| `extern "C"` | 让 C++ 函数按 C 方式导出，避免 name mangling |
| ctypes | Python 标准库，调用 C 接口，手动声明签名 |
| pybind11 | 绑定 C++ 接口到 Python，支持类/异常/NumPy |
| `py::array_t<T>` | pybind11 的 NumPy 数组类型 |
| GIL | Python 全局锁，C++ 计算时可 `gil_scoped_release` 释放 |
| 零拷贝 | 共享同一块内存，不复制数据 |
| 七项契约 | 地址+类型+形状+步长+设备+生命周期+可变性 |
| stride 陷阱 | 转置数组不连续，按连续读会出错 |
| `np.ascontiguousarray` | 强制数组变成连续（可能复制） |
| CMake + pybind11 | `pybind11_add_module` 创建扩展 |
| setup.py | `Pybind11Extension` 规范化安装 |

---

## 九、常见错误与排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `ImportError: undefined symbol` | ABI 不匹配 / 漏链接库 | 检查编译器版本、链接 |
| `Segmentation Fault` | ctypes 签名写错 / 悬空指针 | 用 ASan 排查 |
| 数据错误但不崩溃 | stride 不匹配 / dtype 不匹配 | 检查 `flags['C_CONTIGUOUS']` |
| `fatal error: pybind11/pybind11.h` | 没装 pybind11 | `pip install pybind11` |
| 编译慢 | pybind11 模板展开多 | 用 ccache / 预编译头 |

---

## 十、关联笔记

- `cpp/内存生命周期与资源管理.md`（RAII、所有权——零拷贝时的生命周期问题）
- `cpp/编译链接模板与构建系统.md`（动态库编译、ABI、CMake 基础）
- `python/Python进阶笔记3_并发与性能分析.md`（GIL 的本质）
- `pytorch/PyTorch常见操作速查.md`（PyTorch 自定义算子扩展）
