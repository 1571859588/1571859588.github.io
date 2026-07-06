# Python 进阶笔记：名字绑定、可变性、闭包、类与协议

> 更新时间：2026-06-30
> 状态：学习笔记（针对进阶概念逐一拆解）
> 读者背景：已掌握 Python 基础语法，对"名字绑定、闭包、装饰器、特殊方法"等概念有疑惑
> 关联：`pytorch/PyTorch常见操作速查.md`（PyTorch 中大量用到这些概念）

---

## 一句话结论

Python 变量不是"盒子"，是"标签"——**赋值是贴标签，不是复制对象**。这个核心认知解释了 mutate/rebind 区别、默认参数陷阱、浅拷贝共享内部对象、闭包延迟绑定等所有"反直觉"现象。本文逐一拆解这些概念，每个都配可运行代码。

---

## 一、名字绑定：Python 变量的本质

### 1.1 核心认知：变量是标签，不是盒子

很多语言里变量是"盒子"（装值的容器），赋值是把值放进盒子。**Python 不是这样**。

Python 变量是"标签"——**名字绑定到对象**。赋值 = 在对象上贴一个名字标签。

```python
a = [1, 2]       # 创建列表对象 [1,2]，贴上标签 a
b = a            # 把标签 b 也贴到同一个列表对象上（不是复制！）
b.append(3)      # 通过标签 b 修改了这个对象

print(a)         # [1, 2, 3]    ← a 看到了变化，因为 a 和 b 指向同一个对象
print(a is b)    # True         ← is 比较身份：是同一个对象吗？
print(a == b)    # True         ← == 比较值：值相等吗？
```

**图解**：

```
传统"盒子"模型（错误理解）：        Python"标签"模型（正确理解）：
┌─────┐    ┌─────┐               [1, 2, 3]  ← 对象（在堆内存里）
│  a  │    │  b  │                ↑    ↑
│[1,2]│    │[1,2]│               a    b     ← 两个名字标签都贴在同一个对象上
└─────┘    └─────┘               （赋值不复制，只多贴一个标签）
（两个独立盒子，各装各的）
```

### 1.2 函数参数同样是名字绑定

函数收到的是**对象引用**，既不是"按引用传递"也不是"按值传递"——是"按对象引用传递"。

```python
def mutate(xs: list[int]) -> None:
    xs.append(1)          # 通过 xs 这个标签修改了对象本身

def rebind(xs: list[int]) -> None:
    xs = [1]              # 只让局部名字 xs 指向新列表（原对象没动）

data: list[int] = []
mutate(data)
print(data)               # [1]        ← mutate 改了原对象

rebind(data)
print(data)               # 仍然是 [1] ← rebind 只改了局部名字，原对象没变

data2: list[int] = [2, 3]
mutate(data2)
print(data2)              # [2, 3, 1]  ← mutate 改了原对象

rebind(data2)
print(data2)              # 仍然是 [2, 3, 1] ← rebind 没影响原对象
```

**为什么 mutate 能改、rebind 不能改**：

```
调用 mutate(data) 时：
  函数内 xs 和外层 data 贴在同一个对象上
  xs.append(1) 修改了这个对象 → data 看到了变化

调用 rebind(data) 时：
  函数内 xs 和外层 data 贴在同一个对象上
  xs = [1] 让 xs 贴到一个新对象上 → data 还贴在原对象上，没变化
  
  ┌── 调用前 ──┐        ┌── xs = [1] 之后 ──┐
  │            │        │                   │
  [2,3,1] ← data, xs    [2,3,1] ← data      [1] ← xs（新对象）
                        （原对象没变）        （xs 指向新对象了）
```

> **记忆**：函数参数是"把外层名字贴的对象再贴一个局部名字"。在函数内**修改对象**（append/sort）调用方能看到，**重新绑定名字**（=）调用方看不到。

---

## 二、可变对象、不可变对象与拷贝

### 2.1 可变 vs 不可变

| 类型 | 可变？ | 例子 | 说明 |
|------|--------|------|------|
| `int`/`float`/`bool` | 不可变 | `x = 1; x += 1` 其实是创建了新对象 | 数字"修改"其实是重新绑定 |
| `str`/`bytes` | 不可变 | `s = "ab"; s += "c"` 创建新字符串 | 字符串拼接产生新对象 |
| `tuple` | 不可变（如果元素都不可变） | `(1, 2, 3)` | 不能增删元素 |
| `list` | **可变** | `[1,2].append(3)` 改原对象 | 常见陷阱来源 |
| `dict` | **可变** | `d["k"]=v` 改原对象 | |
| `set` | **可变** | `s.add(x)` 改原对象 | |
| 自定义实例 | **通常可变** | `obj.attr = x` 改原对象 | |

**不可变对象的"修改"其实是重新绑定**：

```python
x = 1
print(id(x))    # 比如打印 140730123456
x = x + 1       # 这不是"修改 1 变成 2"，是创建新对象 2，把 x 贴过去
print(id(x))    # 地址变了，说明是新对象

s = "hello"
print(id(s))
s = s + " world"   # 创建新字符串，不是修改原字符串
print(id(s))    # 地址变了
```

### 2.2 默认参数陷阱（新手必踩）

```python
# 错误：同一个列表会被多次调用共享
def collect_bad(x: int, result: list[int] = []) -> list[int]:
    result.append(x)
    return result

print(collect_bad(1))   # [1]
print(collect_bad(2))   # [1, 2]    ← 不是 [2]！上次调用的列表还在！
print(collect_bad(3))   # [1, 2, 3] ← 越积越多

# 正确：用 None 表示"未提供"
def collect(x: int, result: list[int] | None = None) -> list[int]:
    if result is None:
        result = []
    result.append(x)
    return result

print(collect(1))   # [1]
print(collect(2))   # [2]    ← 每次都是新列表
print(collect(3))   # [3]
```

**为什么 `collect_bad` 会共享**：

> 默认参数在**函数定义时求值**（只创建一次），而不是每次调用时求值。

```python
def collect_bad(x, result=[]):
    ...

# 等价于这样理解：
_default_result = []          # 函数定义时就创建了这一个列表对象
def collect_bad(x, result=_default_result):
    result.append(x)
    return result
# 每次 collect_bad(1) 调用，result 都指向同一个 _default_result
# 所以 append 的值会累积
```

**逐句拆解正确写法**：

```python
def collect(x: int, result: list[int] | None = None) -> list[int]:
```

| 部分 | 含义 |
|------|------|
| `result: list[int] \| None` | 类型注解：result 可以是 `list[int]` 或 `None` |
| `\|` | 联合类型，表示"或"（Python 3.10+ 语法，等价于旧版 `Union[list[int], None]`） |
| `= None` | 默认值是 None（每次调用都是 None，不是共享对象） |

```python
    if result is None:
        result = []
```

| 部分 | 含义 |
|------|------|
| `if result is None:` | 如果调用时没传 result（默认 None），就进这个分支 |
| `result = []` | 在函数内部创建一个新列表（每次调用都是新的） |

**为什么用 `is None` 而不是 `== None`**：`is` 比较身份（是不是同一个 None 对象），`==` 比较值。对于 None 用 `is` 是惯例，更快更安全（避免某些对象重写 `__eq__` 导致误判）。

**为什么需要这个模式**：因为默认参数在定义时只创建一次（共享），而 `None` 是不可变的单例（每次都是同一个 None，但不会"累积"），所以用 None 当哨兵，在函数内部判断后创建新列表。

### 2.3 浅拷贝 vs 深拷贝

```python
import copy

src = [[1], [2]]
shallow = src.copy()           # 只复制最外层列表，内部对象还是共享的
deep = copy.deepcopy(src)      # 递归复制所有层级，完全独立

shallow[0].append(9)
print(shallow)                 # [[1, 9], [2]]
print(src)                     # [[1, 9], [2]]    ← src 也变了！内部对象共享
print(deep)                    # [[1], [2]]        ← deep 不受影响

src[1].append(3)
print(shallow)                 # [[1, 9], [2, 3]]  ← shallow 的内部对象也变了（共享）
print(src)                     # [[1, 9], [2, 3]]
print(deep)                    # [[1], [2]]        ← deep 完全独立
```

**图解浅拷贝**：

```
src = [[1], [2]]

浅拷贝 shallow = src.copy()：

src     ──→ [  ↓     ↓  ]      ← 外层列表是新的（复制了）
shallow ──→ [  ↓     ↓  ]         但内部 [1] 和 [2] 是共享的
                │     │
                ↓     ↓
              [1]   [2]          ← 同一个内部对象

所以 shallow[0].append(9) 改的是共享的 [1]，src 也能看到
```

**图解深拷贝**：

```
src  ──→ [ ptr → [1], ptr → [2] ]          ← 外层
                                        ↓
deep ──→ [ ptr → [1]', ptr → [2]' ]       ← 外层是新的，内部 [1]' [2]' 也是新的副本

deep 和 src 没有任何共享对象，互不影响
```

**深拷贝的代价**（重要提醒）：

> 深拷贝并非默认答案。对大型张量或模型状态做无意复制可能产生巨大的内存和时间开销。更好的做法是先明确：**哪些数据需要独占，哪些可以只读共享**。

```python
# PyTorch 场景：不要随便 deepcopy 模型
import copy
model = BigModel()
model_copy = copy.deepcopy(model)  # 可能复制几 GB 参数，很慢很耗内存

# 更好的做法：用 PyTorch 自己的机制
model.load_state_dict(model.state_dict())  # 只复制参数
```

---

## 三、作用域、闭包与 LEGB

### 3.1 LEGB 查找规则

Python 查找名字时按 **LEGB** 顺序：

| 层级 | 名称 | 说明 | 例子 |
|------|------|------|------|
| **L** | Local | 当前函数内部 | 函数体里定义的变量 |
| **E** | Enclosing | 外层函数（嵌套函数时） | 外层函数的局部变量 |
| **G** | Global | 模块级 | 模块顶层定义的变量 |
| **B** | Builtins | 内置 | `len`、`print`、`int` 等 |

```python
x = "global"          # G 层

def outer():
    x = "enclosing"   # E 层
    
    def inner():
        x = "local"   # L 层
        print(x)      # 先找 L，找到 "local"
    
    inner()

outer()               # 输出 "local"
```

### 3.2 闭包是什么

**闭包 = 函数 + 它记住的外层变量**。

```python
from collections.abc import Callable

def make_multiplier(scale: float) -> Callable[[float], float]:
    def multiply(x: float) -> float:
        return x * scale      # multiply 记住了外层的 scale
    return multiply           # 返回 multiply 函数本身（不是调用结果）

double = make_multiplier(2.0)   # double 现在是一个函数
print(double(3.0))              # 6.0
```

**逐句解释**：

```python
def make_multiplier(scale: float) -> Callable[[float], float]:
```

| 部分 | 含义 |
|------|------|
| `make_multiplier(scale: float)` | 函数名，接收一个 float 参数 scale |
| `-> Callable[[float], float]` | 返回值类型注解：返回一个"可调用对象"（函数），它接收 float 返回 float |
| `Callable` | 来自 `collections.abc`，表示"可调用的东西"（函数、实现了 `__call__` 的对象等） |
| `Callable[[float], float]` | `[float]` 是参数类型列表，后面的 `float` 是返回类型 |

**闭包的工作原理**：

```python
def make_multiplier(scale):       # 外层函数
    def multiply(x):              # 内层函数
        return x * scale          # 引用了外层的 scale
    return multiply

double = make_multiplier(2.0)
# 此时 double 是 multiply 函数，但它"记住"了 scale=2.0
# 即使 make_multiplier 已经返回了，scale 依然存活

triple = make_multiplier(3.0)
# triple 是另一个 multiply 函数，记住的是 scale=3.0
# double 和 triple 各自记住了不同的 scale，互不干扰

print(double(5.0))    # 10.0  (5 * 2.0)
print(triple(5.0))    # 15.0  (5 * 3.0)
```

**为什么叫"闭包"**：内层函数"封闭"了外层函数的变量，即使外层函数已经执行完毕返回了，这些变量依然被内层函数记住，不会被垃圾回收。

**闭包的常见用途**：
- 工厂函数（如 make_multiplier 生成不同倍数的函数）
- 装饰器（装饰器本质就是闭包）
- 回调函数（记住创建时的上下文）

### 3.3 循环中闭包的延迟绑定（经典陷阱）

```python
# 错误：三个函数最终都读取同一个 i，结果都是 2
bad = [lambda: i for i in range(3)]
print([fn() for fn in bad])  # [2, 2, 2]

# 正确：用默认参数在每轮定义时保存当前值
good = [lambda i=i: i for i in range(3)]
print([fn() for fn in good])  # [0, 1, 2]
```

**为什么 bad 是 [2, 2, 2]**：

```python
bad = [lambda: i for i in range(3)]
# 等价于：
bad = []
for i in range(3):
    bad.append(lambda: i)    # 创建了 3 个函数，但函数体里的 i 不是"当前值"，是"名字 i"

# 循环结束后，i 的值是 2（最后一次循环的值）
# 此时调用 bad[0]()，函数去找 i，找到的是循环结束后的 i=2

print([fn() for fn in bad])
# 调用 bad[0]()：找 i → 2
# 调用 bad[1]()：找 i → 2
# 调用 bad[2]()：找 i → 2
# 所以输出 [2, 2, 2]
```

**关键认知**：闭包在**调用时**才读取外层名字，不是在**定义时**。定义时只是记住了"有个叫 i 的名字"，调用时才去查 i 的当前值。

**为什么 good 是 [0, 1, 2]**：

```python
good = [lambda i=i: i for i in range(3)]
# lambda i=i: i 的意思是：
#   定义一个函数，它有一个参数 i，默认值是"当前循环的 i 值"
#   函数体返回这个参数 i

# 等价于：
good = []
for i in range(3):
    good.append(lambda i=i: i)
    #               ↑ 这个 i=i 把当前 i 的值"快照"到默认参数里
    # 第一轮：lambda i=0: i   默认参数 i=0
    # 第二轮：lambda i=1: i   默认参数 i=1
    # 第三轮：lambda i=2: i   默认参数 i=2

print([fn() for fn in good])
# 调用 good[0]()：没传参，用默认值 i=0 → 返回 0
# 调用 good[1]()：没传参，用默认值 i=1 → 返回 1
# 调用 good[2]()：没传参，用默认值 i=2 → 返回 2
# 所以输出 [0, 1, 2]
```

**`lambda i=i: i` 拆解**：

| 部分 | 含义 |
|------|------|
| `lambda` | 匿名函数关键字 |
| `i=i` | 参数名 i，默认值是"当前外层 i 的值"（等号右边在定义时求值） |
| `: i` | 函数体：返回参数 i |

**本质**：利用"默认参数在定义时求值"的特性，把每轮循环的 i 值"冻结"到各自的函数里。

### 3.4 nonlocal 和 global

```python
# 重新绑定外层函数的名字 → 用 nonlocal
def make_counter():
    count = 0
    def increment():
        nonlocal count      # 告诉 Python：count 是外层函数的，不是新建局部变量
        count += 1          # 重新绑定外层的 count
        return count
    return increment

counter = make_counter()
print(counter())  # 1
print(counter())  # 2
print(counter())  # 3
```

**如果不用 nonlocal 会怎样**：

```python
def make_counter_bad():
    count = 0
    def increment():
        count += 1     # 报错！Python 认为 count 是局部变量（因为有赋值），但还没定义就用了
        return count
    return increment
# UnboundLocalError: local variable 'count' referenced before assignment
```

**global 的用法**（重新绑定模块全局变量）：

```python
x = 0

def set_global():
    global x           # 告诉 Python：x 是模块全局的
    x = 100            # 重新绑定全局 x

set_global()
print(x)   # 100
```

**原话解释**：

> "如果需要在内层函数中重新绑定外层函数的名字，使用 nonlocal；重新绑定模块全局名字则使用 global。优先通过参数和返回值传递状态，通常更易测试。"

翻译：

- "重新绑定外层函数的名字" = 在内层函数里给外层函数的变量**赋新值**（不是修改对象，是 `=` 赋值）→ 用 `nonlocal`
- "重新绑定模块全局名字" = 在函数里给全局变量赋新值 → 用 `global`
- "优先通过参数和返回值传递状态" = 能用参数传进来、用 return 传出去，就别用 nonlocal/global，因为纯函数更好测试

```python
# 不推荐：用 nonlocal 传递状态
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

# 推荐：用参数和返回值（更易测试）
def increment(count: int) -> int:
    return count + 1

count = 0
count = increment(count)   # 1
count = increment(count)   # 2
```

---

## 四、类、数据模型与协议

### 4.1 @dataclass 装饰器

```python
from dataclasses import dataclass

@dataclass
class Batch:
    samples: list[list[float]]
```

**`@` 是什么**：`@dataclass` 是**装饰器**，作用是"在类定义完成后自动给它加功能"。

**`@dataclass` 帮你自动生成了什么**：

```python
# 加了 @dataclass 后，等价于自动生成了这些方法：
class Batch:
    samples: list[list[float]]
    
    def __init__(self, samples: list[list[float]]):   # 自动生成
        self.samples = samples
    
    def __repr__(self):                               # 自动生成
        return f"Batch(samples={self.samples})"
    
    def __eq__(self, other):                          # 自动生成
        return self.samples == other.samples
```

**不加 @dataclass 要手写多少**：

```python
# 不用 @dataclass，要手写
class Batch:
    def __init__(self, samples: list[list[float]]):
        self.samples = samples
    
    def __repr__(self):
        return f"Batch(samples={self.samples})"
    
    def __eq__(self, other):
        if not isinstance(other, Batch):
            return False
        return self.samples == other.samples

# 用 @dataclass，一行搞定
@dataclass
class Batch:
    samples: list[list[float]]
```

**装饰器的使用方式**：在 `class` 或 `def` 上面一行写 `@装饰器名`，Python 会在定义完成后自动调用装饰器函数处理这个类/函数。

### 4.2 特殊方法（魔法方法）

Python 的特殊方法（双下划线开头结尾）让对象接入语言协议：

```python
from dataclasses import dataclass
from collections.abc import Iterator

@dataclass
class Batch:
    samples: list[list[float]]

    def __len__(self) -> int:
        return len(self.samples)          # 让 len(batch) 能用

    def __iter__(self) -> Iterator[list[float]]:
        return iter(self.samples)         # 让 for sample in batch 能用

batch = Batch([[1.0, 2.0], [3.0, 4.0]])
print(len(batch))    # 2          ← 触发 __len__
for sample in batch:              # 触发 __iter__
    print(sample)
# [1.0, 2.0]
# [3.0, 4.0]
```

**常见特殊方法**：

| 方法 | 触发方式 | 典型用途 |
|------|----------|----------|
| `__init__` | 创建实例后 | 初始化实例状态 |
| `__repr__` | `repr(obj)`、调试器 | 无歧义的调试表示 |
| `__call__` | `obj(...)` | 让实例表现得像函数 |
| `__enter__` / `__exit__` | `with` | 管理资源生命周期 |
| `__iter__` / `__next__` | `for`、`next` | 定义迭代协议 |
| `__getitem__` | `obj[key]` | 索引、切片或映射访问 |
| `__len__` | `len(obj)` | 长度 |
| `__eq__` | `obj1 == obj2` | 相等比较 |

> **核心思想**：Python 不看你"是什么类型"，看你"实现了什么方法"——这叫**协议**（protocol）。实现了 `__iter__` 就能被 `for` 遍历，不管你是 list、dict 还是自定义类。

### 4.3 实例方法、类方法、静态方法

```python
@dataclass
class Device:
    kind: str
    index: int

    # 实例方法：第一个参数是 self，操作具体对象
    def __str__(self) -> str:
        return f"{self.kind}:{self.index}"

    # 类方法：第一个参数是 cls（类本身），常用于备选构造器
    @classmethod
    def parse(cls, value: str) -> "Device":
        kind, index = value.split(":")
        return cls(kind=kind, index=int(index))
        #      ↑ cls 是类本身，等价于 Device(kind=..., index=...)

    # 静态方法：不接收 self 也不接收 cls，只是放在类命名空间里的工具函数
    @staticmethod
    def is_valid_kind(kind: str) -> bool:
        return kind in ("cpu", "cuda", "mps")
```

**完整可测试代码**：

```python
from dataclasses import dataclass

@dataclass
class Device:
    kind: str
    index: int

    def __str__(self) -> str:
        return f"{self.kind}:{self.index}"

    @classmethod
    def parse(cls, value: str) -> "Device":
        kind, index = value.split(":")
        return cls(kind=kind, index=int(index))

    @staticmethod
    def is_valid_kind(kind: str) -> bool:
        return kind in ("cpu", "cuda", "mps")


# === 测试 ===

# 1. 实例方法：通过实例调用
d1 = Device(kind="cuda", index=0)
print(d1)                    # cuda:0（触发 __str__）
print(str(d1))               # cuda:0

# 2. 类方法：通过类调用，用于备选构造器
d2 = Device.parse("cuda:1")
print(d2)                    # cuda:1
print(d2.kind, d2.index)     # cuda 1

d3 = Device.parse("cpu:0")
print(d3)                    # cpu:0

# 3. 静态方法：通过类调用，工具函数
print(Device.is_valid_kind("cuda"))   # True
print(Device.is_valid_kind("tpu"))    # False
```

**三种方法的区别**：

| 方法类型 | 装饰器 | 第一个参数 | 能访问什么 | 用途 |
|----------|--------|------------|------------|------|
| 实例方法 | 无 | `self`（实例） | 实例属性、类属性 | 操作具体对象 |
| 类方法 | `@classmethod` | `cls`（类） | 类属性、创建实例 | 备选构造器 |
| 静态方法 | `@staticmethod` | 无 | 什么都不隐式接收 | 组织在类里的工具函数 |

**`cls` 是什么**：

```python
@classmethod
def parse(cls, value: str) -> "Device":
    return cls(kind=kind, index=int(index))
```

- `cls` 是**类本身**（不是实例），就像 `self` 是实例本身
- `cls(kind=kind, index=int(index))` 等价于 `Device(kind=kind, index=int(index))`
- 为什么用 `cls` 而不是写死 `Device`：如果有人继承 `class MyDevice(Device)`，调用 `MyDevice.parse("cuda:0")` 时，`cls` 会是 `MyDevice`，返回的是 `MyDevice` 实例而不是 `Device` 实例——这就是多态

```python
# 继承场景：cls 的价值
class GpuDevice(Device):
    pass

g = GpuDevice.parse("cuda:0")
print(type(g))    # <class 'GpuDevice'>  ← 返回的是子类实例，不是 Device
# 如果 parse 里写死 Device(...)，这里返回的就是 Device 实例，丢失了子类信息
```

**`-> "Device"` 为什么要引号**：因为 `Device` 在定义 `parse` 方法时还没定义完（类体还在执行中），直接写 `Device` 会报 `NameError`。用字符串 `"Device"` 是**前向引用**，告诉 Python"这是个类型注解，先别急着解析"。Python 3.10+ 可以用 `from __future__ import annotations` 让所有注解都自动变成字符串。

---

## 五、完整测试脚本

把以上所有概念放在一个文件里，可直接运行验证：

```python
"""python 进阶概念完整测试脚本
运行：python python_concepts_test.py
"""

# ============ 1. 名字绑定 ============
print("=== 1. 名字绑定 ===")
a = [1, 2]
b = a
b.append(3)
print(f"a = {a}")              # [1, 2, 3]
print(f"a is b = {a is b}")    # True
print(f"a == b = {a == b}")    # True

# ============ 2. 函数参数：mutate vs rebind ============
print("\n=== 2. 函数参数 ===")

def mutate(xs):
    xs.append(1)

def rebind(xs):
    xs = [1]

data = []
mutate(data)
print(f"mutate 后 data = {data}")     # [1]

rebind(data)
print(f"rebind 后 data = {data}")     # [1]（没变）

# ============ 3. 默认参数陷阱 ============
print("\n=== 3. 默认参数陷阱 ===")

def collect_bad(x, result=[]):
    result.append(x)
    return result

def collect(x, result=None):
    if result is None:
        result = []
    result.append(x)
    return result

print(f"collect_bad(1) = {collect_bad(1)}")   # [1]
print(f"collect_bad(2) = {collect_bad(2)}")   # [1, 2]（累积了！）
print(f"collect(1) = {collect(1)}")           # [1]
print(f"collect(2) = {collect(2)}")           # [2]（每次新的）

# ============ 4. 浅拷贝 vs 深拷贝 ============
print("\n=== 4. 浅拷贝 vs 深拷贝 ===")
import copy

src = [[1], [2]]
shallow = src.copy()
deep = copy.deepcopy(src)

shallow[0].append(9)
print(f"shallow = {shallow}")    # [[1, 9], [2]]
print(f"src = {src}")            # [[1, 9], [2]]（共享内部对象）
print(f"deep = {deep}")          # [[1], [2]]（完全独立）

# ============ 5. 闭包 ============
print("\n=== 5. 闭包 ===")

def make_multiplier(scale):
    def multiply(x):
        return x * scale
    return multiply

double = make_multiplier(2.0)
triple = make_multiplier(3.0)
print(f"double(3.0) = {double(3.0)}")    # 6.0
print(f"triple(3.0) = {triple(3.0)}")    # 9.0

# ============ 6. 循环中闭包延迟绑定 ============
print("\n=== 6. 循环中闭包 ===")

bad = [lambda: i for i in range(3)]
print(f"bad = {[fn() for fn in bad]}")   # [2, 2, 2]

good = [lambda i=i: i for i in range(3)]
print(f"good = {[fn() for fn in good]}") # [0, 1, 2]

# ============ 7. nonlocal ============
print("\n=== 7. nonlocal ===")

def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

counter = make_counter()
print(f"counter() = {counter()}")    # 1
print(f"counter() = {counter()}")    # 2
print(f"counter() = {counter()}")    # 3

# ============ 8. dataclass + 特殊方法 ============
print("\n=== 8. dataclass + 特殊方法 ===")
from dataclasses import dataclass
from collections.abc import Iterator

@dataclass
class Batch:
    samples: list[list[float]]

    def __len__(self) -> int:
        return len(self.samples)

    def __iter__(self) -> Iterator[list[float]]:
        return iter(self.samples)

batch = Batch([[1.0, 2.0], [3.0, 4.0]])
print(f"len(batch) = {len(batch)}")    # 2
print("遍历 batch:")
for sample in batch:
    print(f"  {sample}")

# ============ 9. classmethod / staticmethod ============
print("\n=== 9. classmethod / staticmethod ===")

@dataclass
class Device:
    kind: str
    index: int

    def __str__(self) -> str:
        return f"{self.kind}:{self.index}"

    @classmethod
    def parse(cls, value: str) -> "Device":
        kind, index = value.split(":")
        return cls(kind=kind, index=int(index))

    @staticmethod
    def is_valid_kind(kind: str) -> bool:
        return kind in ("cpu", "cuda", "mps")

d1 = Device(kind="cuda", index=0)
print(f"d1 = {d1}")                              # cuda:0

d2 = Device.parse("cuda:1")
print(f"d2 = {d2}, kind={d2.kind}, index={d2.index}")  # cuda:1

print(f"is_valid_kind('cuda') = {Device.is_valid_kind('cuda')}")   # True
print(f"is_valid_kind('tpu') = {Device.is_valid_kind('tpu')}")     # False

print("\n=== 全部测试通过 ===")
```

---

## 六、概念速查表

| 概念 | 一句话记忆 |
|------|------------|
| 名字绑定 | 变量是标签不是盒子，赋值是贴标签不是复制 |
| mutate vs rebind | 修改对象（append）调用方可见，重新绑定（=）不可见 |
| 默认参数陷阱 | 默认参数在定义时创建一次，用 None 哨兵规避 |
| `x \| None` | 联合类型，x 可以是指定类型或 None（3.10+ 语法） |
| 浅拷贝 | 只复制最外层，内部对象共享 |
| 深拷贝 | 递归复制所有层级，完全独立（但有性能代价） |
| 闭包 | 函数 + 它记住的外层变量 |
| Callable[[A], B] | 类型注解：接收 A 返回 B 的可调用对象 |
| 延迟绑定 | 闭包在调用时才读外层名字，不是定义时 |
| `lambda i=i: i` | 用默认参数冻结当前值，规避延迟绑定 |
| nonlocal | 在内层函数重新绑定外层函数的变量 |
| global | 在函数内重新绑定全局变量 |
| @dataclass | 自动生成 __init__/__repr__/__eq__ |
| @classmethod | 第一个参数是 cls（类本身），用于备选构造器 |
| @staticmethod | 不接收 self/cls，类命名空间里的工具函数 |
| 特殊方法 | __len__/__iter__ 等让对象接入 Python 协议 |

---

## 七、关联笔记

- `pytorch/PyTorch常见操作速查.md`（PyTorch 中大量用到这些概念）
- `backend/FastAPI学习笔记.md`（Pydantic 模型、依赖注入用到类和闭包）
- `typescript/TypeScript学习笔记.md`（类型注解对比）
- `技术工具学习索引.md`
