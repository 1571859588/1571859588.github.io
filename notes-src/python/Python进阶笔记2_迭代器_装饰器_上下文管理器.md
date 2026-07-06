# Python 进阶笔记 2：迭代器、装饰器、上下文管理器、异常与类型

> 更新时间：2026-06-30
> 状态：学习笔记（逐句拆解进阶概念）
> 关联：`python/Python进阶笔记_名字绑定_闭包_类与协议.md`（第一篇，前置知识）

---

## 一句话结论

本篇拆解 5 个进阶概念：生成器（按需产数据省内存）、装饰器（给函数套外壳）、上下文管理器（with 保证资源释放）、异常处理（只捕获能处理的）、类型标注（给 IDE 和读者看，不运行时验证）。每个都配完整可运行代码。

---

## 一、迭代器与生成器：按需生产数据

### 1.1 核心概念

| 概念 | 含义 | 例子 |
|------|------|------|
| **可迭代对象** | 能被 for 遍历的对象 | list、dict、str、文件对象 |
| **迭代器** | 保存遍历状态，通过 `__next__` 逐个返回 | `iter([1,2,3])` 的返回值 |
| **生成器** | 编写迭代器的简洁方式，用 `yield` | 见下方代码 |

### 1.2 完整代码示例

```python
from collections.abc import Iterator

def read_batches(path: str, batch_size: int) -> Iterator[list[str]]:
    """逐批读取文件，每批 batch_size 行"""
    batch: list[str] = []
    with open(path, encoding="utf-8") as file:
        for line in file:
            batch.append(line.rstrip("\n"))
            if len(batch) == batch_size:
                yield batch          # 返回这一批，暂停在这里
                batch = []           # 下次从这里继续执行
    if batch:                        # 处理最后不足一批的剩余行
        yield batch

# === 测试 ===
# 先造一个测试文件
with open("test_data.txt", "w", encoding="utf-8") as f:
    for i in range(7):               # 写 7 行
        f.write(f"line_{i}\n")

# 用生成器按批读取
for batch in read_batches("test_data.txt", batch_size=3):
    print(f"一批: {batch}")

# 输出：
# 一批: ['line_0', 'line_1', 'line_2']
# 一批: ['line_3', 'line_4', 'line_5']
# 一批: ['line_6']              ← 最后不足 3 行也输出
```

### 1.3 yield 的执行原理

```python
def simple_gen():
    print("第一句")
    yield 1
    print("第二句")
    yield 2
    print("第三句")

gen = simple_gen()    # 此时函数体还没执行！只是创建了生成器对象
print("--- 创建完成 ---")

result = next(gen)    # 执行到第一个 yield，返回 1，暂停
# 输出：第一句
print(f"拿到: {result}")

result = next(gen)    # 从暂停处继续，执行到第二个 yield，返回 2
# 输出：第二句
print(f"拿到: {result}")

result = next(gen)    # 从暂停处继续，执行到函数结束
# 输出：第三句
# 然后 raise StopIteration（表示迭代结束）
```

**执行流程图**：

```
创建 gen = simple_gen()
    ↓ （函数体不执行）
next(gen) → 执行到 yield 1，返回 1，暂停
    ↓ （等你下一次调用）
next(gen) → 从 yield 1 后继续，执行到 yield 2，返回 2，暂停
    ↓
next(gen) → 从 yield 2 后继续，执行到函数末尾，抛 StopIteration
```

### 1.4 三个需要记住的点（逐条解释）

#### ① 生成器通常只能消费一次

```python
def count():
    yield 1
    yield 2
    yield 3

gen = count()

# 第一次消费
print(list(gen))    # [1, 2, 3]

# 第二次消费——没了！
print(list(gen))    # []    ← 生成器已经耗尽，不会重新开始

# 如果需要多次遍历，要么转成 list（但失去省内存优势），要么重新创建生成器
gen2 = count()      # 重新创建
print(list(gen2))   # [1, 2, 3]
```

**原因**：生成器是"有状态的迭代器"，遍历到末尾就结束了，不会回到起点。

#### ② 惰性求值会把异常推迟到迭代时

```python
def risky_gen():
    yield 1
    raise ValueError("出错了")    # 这个异常在 yield 1 时不会触发
    yield 2                       # 这行永远执行不到

gen = risky_gen()
print("创建生成器，没报错")       # 这里确实没报错

print(next(gen))                  # 1，还没报错

try:
    print(next(gen))              # 这里才报错！
except ValueError as e:
    print(f"迭代时报错: {e}")     # 迭代时报错: 出错了
```

**含义**：生成器是"惰性"的——创建时不执行函数体，每次 `next()` 才执行到下一个 `yield`。所以函数体里的异常不会在创建时暴露，而是在迭代时才触发。**调试时要注意**：生成器函数的报错可能不是在"调用时"，而是在"遍历时"。

#### ③ 把生成器转成 list 会重新物化所有元素

```python
import sys

def big_range(n):
    """模拟 range，但用生成器实现"""
    i = 0
    while i < n:
        yield i
        i += 1

# 生成器：内存只存当前值
gen = big_range(1_000_000)
print(f"生成器内存: {sys.getsizeof(gen)} 字节")    # ~200 字节（固定）

# 转 list：所有值都放进内存
big_list = list(big_range(1_000_000))
print(f"list 内存: {sys.getsizeof(big_list)} 字节")  # ~8MB

# 生成器的优势：处理 100 万行文件时，内存只存一个批次
# 如果 list(read_batches(path, 100))，等于把所有批次都放内存，生成器就白用了
```

**什么时候用生成器**：
- 读大文件（一行行/一批批读，不一次性全加载）
- 流式数据处理管线（ETL）
- 无限序列（`while True: yield ...`）

**什么时候不用**：
- 需要多次遍历同一份数据
- 需要随机访问（`gen[5]` 不支持，list 支持）
- 数据量小（生成器的开销反而比 list 大）

---

## 二、装饰器：在调用边界附加行为

### 2.1 装饰器本质

**装饰器 = 接收函数，返回新函数**。`@timed` 等价于 `preprocess = timed(preprocess)`。

### 2.2 逐句拆解高级装饰器

```python
from collections.abc import Callable
from functools import wraps
from time import perf_counter
from typing import ParamSpec, TypeVar

P = ParamSpec("P")        # ① 捕获原函数的参数签名
R = TypeVar("R")          # ② 捕获原函数的返回类型

def timed(fn: Callable[P, R]) -> Callable[P, R]:    # ③
    @wraps(fn)                                           # ④
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:   # ⑤
        start = perf_counter()
        try:
            return fn(*args, **kwargs)                  # ⑥
        finally:
            elapsed_ms = (perf_counter() - start) * 1_000
            print(f"{fn.__name__}: {elapsed_ms:.3f} ms")
    return wrapper

@timed
def preprocess(values: list[float]) -> list[float]:
    return [value * 2 for value in values]

print(preprocess([1.0, 2.0, 3.0]))
# 输出：preprocess: 0.001 ms
#       [2.0, 4.0, 6.0]
```

**逐句解释**：

#### ① `P = ParamSpec("P")`

`ParamSpec` 捕获函数的**完整参数签名**（参数个数、类型、关键字参数等）。

```python
# 假设原函数是：
def preprocess(values: list[float]) -> list[float]:
    ...

# ParamSpec("P") 会捕获 (values: list[float]) 这部分签名
# 这样装饰后的 wrapper 能保持和原函数一样的参数类型
```

**为什么需要它**：没有 ParamSpec 的话，wrapper 的参数类型会丢失，IDE 不会提示参数类型。有了它，装饰后的函数和原函数的类型签名完全一致。

#### ② `R = TypeVar("R")`

`TypeVar` 捕获函数的**返回类型**，让装饰器不改变返回类型。

```python
# 原函数返回 list[float]，R 就是 list[float]
# wrapper 也返回 list[float]，类型一致
```

#### ③ `fn: Callable[P, R] -> Callable[P, R]`

```python
def timed(fn: Callable[P, R]) -> Callable[P, R]:
```

| 部分 | 含义 |
|------|------|
| `fn: Callable[P, R]` | 参数 fn 是一个可调用对象，参数签名是 P，返回类型是 R |
| `-> Callable[P, R]` | 返回的也是一个可调用对象，签名和返回类型与原函数一致 |

**含义**：装饰器接收一个函数，返回一个**类型签名完全相同**的新函数。

#### ④ `@wraps(fn)`

```python
@wraps(fn)
def wrapper(...):
    ...
```

**作用**：保留原函数的元信息（函数名 `__name__`、文档字符串 `__doc__` 等）。

```python
# 不加 @wraps：
@timed
def preprocess(values):
    """预处理数据"""
    ...

print(preprocess.__name__)    # "wrapper"    ← 名字变了！
print(preprocess.__doc__)     # None         ← 文档丢了！

# 加了 @wraps：
print(preprocess.__name__)    # "preprocess" ← 名字保留
print(preprocess.__doc__)     # "预处理数据"  ← 文档保留
```

**为什么重要**：日志、测试框架、调试器会读 `__name__`，如果不加 `@wraps`，所有被装饰的函数都叫 "wrapper"，调试时无法区分。

#### ⑤ `*args: P.args, **kwargs: P.kwargs`

```python
def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
```

| 部分 | 含义 |
|------|------|
| `*args` | 接收所有**位置参数**（打包成元组） |
| `P.args` | 类型注解：这些位置参数的类型与原函数一致 |
| `**kwargs` | 接收所有**关键字参数**（打包成字典） |
| `P.kwargs` | 类型注解：这些关键字参数的类型与原函数一致 |

**为什么有 `*args` 和 `**kwargs` 两种**：

```python
def example(a, b, c=3):
    ...

# 调用方式：
example(1, 2)              # 1 和 2 是位置参数 → 进 *args
example(1, 2, c=5)         # 1 和 2 是位置参数，c=5 是关键字参数 → c=5 进 **kwargs
example(a=1, b=2, c=5)     # 全是关键字参数 → 全进 **kwargs

# wrapper 用 *args, **kwargs 接收所有参数，再原样传给原函数
# 这样不管原函数有几个参数、怎么调用，wrapper 都能正确转发
```

| 场景 | `*args` | `**kwargs` |
|------|---------|------------|
| `func(1, 2)` | `(1, 2)` | `{}` |
| `func(1, b=2)` | `(1,)` | `{'b': 2}` |
| `func(a=1, b=2)` | `()` | `{'a': 1, 'b': 2}` |

#### ⑥ `fn(*args, **kwargs)`

```python
return fn(*args, **kwargs)
```

`*args` 在这里是**解包**——把元组展开成位置参数；`**kwargs` 把字典展开成关键字参数。

```python
# 假设 args = (1, 2)，kwargs = {'c': 5}
fn(*args, **kwargs)
# 等价于
fn(1, 2, c=5)
```

### 2.3 简化版装饰器（不用 ParamSpec）

如果觉得 ParamSpec 太复杂，先理解这个简化版：

```python
from functools import wraps
from time import perf_counter

def timed_simple(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            elapsed_ms = (perf_counter() - start) * 1_000
            print(f"{fn.__name__}: {elapsed_ms:.3f} ms")
    return wrapper

@timed_simple
def preprocess(values: list[float]) -> list[float]:
    return [value * 2 for value in values]

print(preprocess([1.0, 2.0, 3.0]))
# preprocess: 0.010 ms
# [2.0, 4.0, 6.0]
```

简化版功能一样，只是丢失了类型信息（IDE 不提示参数类型）。高级版用 ParamSpec 是为了保留类型信息，让静态检查工具能验证。

### 2.4 `with timer():` 是什么

原文说"如果只是单个调用点需要计时，一个普通的 `with timer():` 往往更直白"——这指的是下一节的上下文管理器，先看代码：

```python
from contextlib import contextmanager
from time import perf_counter

@contextmanager
def timer(name: str):
    start = perf_counter()
    try:
        yield    # 这里是 with 块内的代码执行位置
    finally:
        elapsed_ms = (perf_counter() - start) * 1_000
        print(f"{name}: {elapsed_ms:.3f} ms")

# 用 with 计时（不用装饰器）
with timer("load data"):
    data = [value for value in range(100_000)]
# 输出：load data: 5.234 ms

with timer("process"):
    result = [x * 2 for x in data]
# 输出：process: 8.123 ms
```

**装饰器 vs with timer 的选择**：
- 装饰器 `@timed`：适合**每次调用都要计时**的函数
- `with timer()`：适合**偶尔计一次**的场景，不用永久装饰

---

## 三、上下文管理器：让资源必定释放

### 3.1 with 的本质

`with` 把资源的获取和释放放在同一个词法范围内，**即使发生异常，也会执行清理逻辑**。

```python
# 文件操作（最常见的 with 用法）
with open("file.txt") as f:    # __enter__：打开文件
    content = f.read()
                                # __exit__：自动关闭文件（即使 read 报错也会关）
```

### 3.2 逐句拆解 @contextmanager

```python
from contextlib import contextmanager
from collections.abc import Iterator
from time import perf_counter

@contextmanager                           # ①
def timer(name: str) -> Iterator[None]:   # ②
    start = perf_counter()                # ③ 进入 with 前执行
    try:
        yield                             # ④ with 块内的代码在这里执行
    finally:
        elapsed_ms = (perf_counter() - start) * 1_000    # ⑤ 退出 with 时执行
        print(f"{name}: {elapsed_ms:.3f} ms")

with timer("load data"):                  # ⑥
    data = [value for value in range(100_000)]
```

**逐句解释**：

#### ① `@contextmanager` 是什么

`@contextmanager` 是一个装饰器，把一个**生成器函数**转成**上下文管理器**。

**不用 @contextmanager 的原始写法**（实现 `__enter__` 和 `__exit__`）：

```python
class Timer:
    def __init__(self, name: str):
        self.name = name

    def __enter__(self):
        self.start = perf_counter()
        return self              # with ... as xxx 的 xxx

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed_ms = (perf_counter() - self.start) * 1_000
        print(f"{self.name}: {elapsed_ms:.3f} ms")
        return False             # 不吞异常

# 用法
with Timer("load data"):
    data = list(range(100_000))
```

**用 @contextmanager 的简化写法**（不用写类）：

```python
@contextmanager
def timer(name: str):
    start = perf_counter()    # 相当于 __enter__ 的内容
    try:
        yield                  # with 块的代码在这里执行
    finally:
        # 相当于 __exit__ 的内容
        print(f"{name}: {(perf_counter()-start)*1000:.3f} ms")
```

**`@contextmanager` 的作用**：让你不用写一个完整的类（定义 `__enter__`/`__exit__`），用生成器函数更简洁地实现上下文管理器。

#### ② `-> Iterator[None]`

函数返回一个迭代器（生成器就是迭代器），`None` 表示 yield 不产出有意义的值（yield 只是标记 with 块的执行点）。

#### ③ `start = perf_counter()`

`perf_counter()` 是 Python 的高精度计时器，返回当前时间（秒），精度比 `time.time()` 高。适合测量代码执行时间。

```python
from time import perf_counter, time

# perf_counter：高精度，适合计时（但返回值没有实际时间含义）
start = perf_counter()
# ... 执行代码 ...
elapsed = perf_counter() - start    # 秒

# time：返回 Unix 时间戳（从 1970 年起），精度较低
now = time()    # 比如 1719700000.123
```

#### ④ `yield`

**这是 with 块代码执行的分界线**：
- yield 之前的代码 = `__enter__`（进入 with 时执行）
- yield 之后的代码 = `__exit__`（退出 with 时执行）
- yield 本身 = with 块内的代码执行点

```
with timer("load data"):     ← 执行 yield 之前：start = perf_counter()
    data = list(range(...))   ← 执行 with 块内代码（yield 处暂停）
                              ← 执行 yield 之后：计算耗时并打印
```

#### ⑤ `finally` 的作用

即使 with 块内代码报错，`finally` 也会执行——这是上下文管理器的核心价值。

```python
with timer("risky"):
    raise ValueError("出错了")
# 即使报错，finally 也会执行，打印耗时
# 输出：risky: 0.123 ms
# 然后异常继续向上传播
```

#### ⑥ `with timer("load data"):`

```python
with timer("load data"):
```

| 部分 | 含义 |
|------|------|
| `with` | 关键字，进入上下文管理器 |
| `timer("load data")` | 调用 timer 函数，创建上下文管理器 |
| `"load data"` | **只是你自己起的名字**，用于打印时识别是哪段代码。可以改成任何字符串 |

```python
# 名字随你起，只是打印时用来区分
with timer("加载数据"):
    data = load_data()
# 输出：加载数据: 123.456 ms

with timer("模型推理"):
    result = model(data)
# 输出：模型推理: 4567.890 ms

with timer("随便写"):
    x = 1 + 1
# 输出：随便写: 0.001 ms
```

### 3.3 with 的常见用途

```python
# 1. 文件操作（自动关闭）
with open("file.txt") as f:
    content = f.read()
# 离开 with 块，f 自动关闭

# 2. 线程锁（自动释放）
import threading
lock = threading.Lock()
with lock:
    # 临界区代码
    pass
# 离开 with 块，锁自动释放

# 3. 数据库连接（自动提交/回滚）
with db_connection:
    cursor.execute("INSERT ...")
    cursor.execute("UPDATE ...")
# 离开 with 块，自动 commit（或异常时 rollback）

# 4. PyTorch 自动混合精度
with torch.autocast("cuda"):
    output = model(input)
    loss = criterion(output, target)
# 离开 with 块，恢复默认精度

# 5. PyTorch 不计算梯度（推理时）
with torch.no_grad():
    output = model(input)
# 离开 with 块，恢复梯度计算

# 6. 临时切换目录
import os
@contextmanager
def cd(path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)

with cd("/tmp"):
    # 在 /tmp 目录下操作
    pass
# 离开 with 块，恢复原目录
```

---

## 四、异常处理：只捕获能够处理的错误

### 4.1 完整代码

```python
def parse_world_size(raw: str) -> int:
    try:
        world_size = int(raw)
    except ValueError as exc:
        raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}") from exc

    if world_size <= 0:
        raise ValueError("WORLD_SIZE 必须大于 0")
    return world_size

# 测试
print(parse_world_size("4"))       # 4
print(parse_world_size("8"))       # 8

try:
    parse_world_size("abc")
except ValueError as e:
    print(e)
    # WORLD_SIZE 必须是整数，实际为 'abc'

try:
    parse_world_size("-1")
except ValueError as e:
    print(e)
    # WORLD_SIZE 必须大于 0
```

### 4.2 `raise ... from exc` 是什么意思

```python
except ValueError as exc:
    raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}") from exc
```

**`from exc` 的作用**：保留异常的**因果链**，让 traceback 同时显示原始异常和新异常。

```python
# 不用 from exc：
except ValueError as exc:
    raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}")
# traceback 只显示新异常，看不到根因（int("abc") 的原始报错）

# 用 from exc：
except ValueError as exc:
    raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}") from exc
#  如果没有用try-except包裹直接运行的话：parse_world_size("abc")
#  traceback 显示：
#   ValueError: invalid literal for int() with base 10: 'abc'    ← 原始异常
#   The above exception was the direct cause of the following exception:
#   ValueError: WORLD_SIZE 必须是整数，实际为 'abc'              ← 新异常
```

**`{raw!r}` 里的 `!r`**：用 `repr()` 格式化而不是 `str()`，字符串会带引号。比如 `raw = "abc"`，`{raw}` 显示 `abc`，`{raw!r}` 显示 `'abc'`，更清晰。

### 4.3 三条原则解释

#### ① 捕获具体异常，不要用空的 `except:`

```python
# 错误：空 except 吞掉所有异常（包括 Ctrl+C）
try:
    do_something()
except:                    # ← 键盘中断 KeyboardInterrupt 也会被吞！
    pass                   # 程序无法被 Ctrl+C 终止

# 正确：捕获具体异常
try:
    do_something()
except ValueError as e:    # 只捕获 ValueError
    print(f"值错误: {e}")
except FileNotFoundError as e:    # 只捕获文件不存在
    print(f"文件不存在: {e}")
```

#### ② 只有在能恢复、补充上下文或转换抽象层时才捕获

```python
# ✅ 能恢复：文件不存在就用默认值
try:
    with open("config.json") as f:
        config = json.load(f)
except FileNotFoundError:
    config = {"default": True}    # 恢复：用默认配置

# ✅ 补充上下文：在错误信息里加入更多线索
try:
    world_size = int(raw)
except ValueError as exc:
    raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}") from exc
    # 补充了"WORLD_SIZE"这个上下文，比单纯报"invalid literal"更易懂

# ❌ 捕获了但啥也不做（吞异常，bug 温床）
try:
    risky_operation()
except Exception:
    pass    # 错了也不报，后面代码用错误数据继续跑，更危险
```

#### ③ 不要把异常用于正常的高频控制流

```python
# ❌ 错误：用异常做控制流（慢）
def find_item(items, target):
    for i, item in enumerate(items):
        if item == target:
            return i
    raise IndexError("not found")

# 调用 100 万次
for _ in range(1_000_000):
    try:
        find_item(data, -1)    # 每次都抛异常
    except IndexError:
        pass
# 异常抛出和捕获有性能开销，100 万次会慢很多

# ✅ 正确：用返回值（None 或 -1）表示"没找到"
def find_item(items, target):
    for i, item in enumerate(items):
        if item == target:
            return i
    return -1    # 不抛异常，返回特殊值

for _ in range(1_000_000):
    result = find_item(data, -1)
    if result == -1:
        pass
# 没有异常开销，快得多
```

**"高频控制流"的含义**：如果某条代码路径在正常情况下（不是错误情况）频繁触发异常，就不该用异常。异常是给"意外情况"用的，不是给"正常分支"用的。

---

## 五、类型标注与数据类

### 5.1 `@dataclass(frozen=True)` 是什么

```python
from dataclasses import dataclass

@dataclass(frozen=True)       # frozen=True 让实例不可变
class ShardSpec:
    rank: int
    world_size: int

spec = ShardSpec(rank=0, world_size=4)

# 正常使用
print(spec.rank)              # 0
print(spec.world_size)        # 4

# frozen=True 的效果：不能修改属性
spec.rank = 1                 # ❌ FrozenInstanceError!
# dataclasses.FrozenInstanceError: cannot assign field 'rank'

# 但可以创建新实例
spec2 = ShardSpec(rank=1, world_size=4)
```

**`frozen=True` 的作用**：

| 特性 | 不加 frozen | frozen=True |
|------|-------------|-------------|
| 修改属性 | `spec.rank = 1` ✅ | ❌ 报错 |
| 可哈希 | 通常 ❌（可变对象不可哈希） | ✅ 可做 dict key / 放 set |
| 线程安全 | 否（可被改） | 是（不可变） |
| 适合场景 | 需要修改的对象 | 配置、常量、函数参数 |

**什么时候用 frozen**：
- 配置对象（启动后不改）
- 函数参数（防止被意外修改）
- 需要做 dict key 或放 set（不可变才能哈希）
- 多线程共享的数据（不可变天然线程安全）

### 5.2 类型标注常用选择（完整示例）

#### ① `Iterable[T]`：参数只要能遍历就行

```python
from collections.abc import Iterable

def sum_all(numbers: Iterable[int]) -> int:
    """接收任何可迭代对象：list、tuple、set、生成器都行"""
    return sum(numbers)

print(sum_all([1, 2, 3]))           # list → 6
print(sum_all((1, 2, 3)))           # tuple → 6
print(sum_all({1, 2, 3}))           # set → 6
print(sum_all(x for x in range(4))) # 生成器 → 6
```

**为什么用 Iterable 而不是 list**：函数只需要遍历，不关心具体类型。用 Iterable 接口更灵活，调用方可以传任何可迭代对象。

#### ② `Sequence[T]`：参数要能按下标访问

```python
from collections.abc import Sequence

def get_first(items: Sequence[int]) -> int:
    """接收任何序列：list、tuple、str 都行（要支持 len 和下标）"""
    if len(items) == 0:
        raise ValueError("空序列")
    return items[0]              # 按下标访问，需要 Sequence

print(get_first([1, 2, 3]))     # list → 1
print(get_first((1, 2, 3)))     # tuple → 1
# get_first(x for x in range(3))  # ❌ 生成器不支持 [0]
```

**Iterable vs Sequence 的区别**：

| 接口 | 能做什么 | 支持的类型 |
|------|----------|------------|
| `Iterable[T]` | for 遍历 | list、tuple、set、dict、生成器、文件 |
| `Sequence[T]` | for 遍历 + `len()` + `[i]` 下标 | list、tuple、str（set 和生成器不行） |

#### ③ 返回具体容器标注 `list[T]`、`dict[K, V]`

```python
def make_pairs(keys: list[str], values: list[int]) -> dict[str, int]:
    """返回具体类型 dict，调用方能明确知道返回什么"""
    return dict(zip(keys, values))

def split_even_odd(numbers: list[int]) -> tuple[list[int], list[int]]:
    """返回 tuple，明确知道里面是两个 list"""
    even = [n for n in numbers if n % 2 == 0]
    odd = [n for n in numbers if n % 2 != 0]
    return even, odd

even, odd = split_even_odd([1, 2, 3, 4, 5, 6])
print(even)    # [2, 4, 6]
print(odd)     # [1, 3, 5]
```

#### ④ `T | None`：值可能缺失

```python
def find_user(user_id: int) -> dict | None:
    """可能找到用户（返回 dict），也可能找不到（返回 None）"""
    users = {1: {"name": "Alice"}, 2: {"name": "Bob"}}
    return users.get(user_id)    # get 找不到返回 None

result = find_user(1)
if result is not None:           # 用前要判断 None
    print(result["name"])        # Alice

result = find_user(999)
print(result)                    # None
```

#### ⑤ `Protocol`：结构化接口，不用继承

```python
from typing import Protocol

# 定义协议：任何有 read 方法的对象都满足
class Readable(Protocol):
    def read(self, n: int) -> bytes:
        ...

def read_header(source: Readable) -> bytes:
    """接收任何有 read 方法的对象，不要求继承 Readable"""
    return source.read(1024)

# 文件对象满足 Readable 协议（有 read 方法）
with open("test.txt", "wb") as f:
    f.write(b"hello world")

with open("test.txt", "rb") as f:
    header = read_header(f)       # ✅ 文件有 read 方法，满足协议
    print(header)                 # b'hello world'

# 自定义类也满足（只要有 read 方法）
class MyReader:
    def read(self, n: int) -> bytes:
        return b"x" * n

reader = MyReader()
header = read_header(reader)      # ✅ 不用继承 Readable，只要有 read 方法
print(header)                     # b'xxxx...'
```

**Protocol vs 继承**：
- 继承：必须 `class MyClass(BaseClass)` 显式继承
- Protocol：只要有对应方法就自动满足（鸭子类型 + 静态检查）

##### 补充：什么是鸭子类型

**鸭子类型（Duck Typing）** 来自一句俗语：

> "如果它走起来像鸭子，叫起来像鸭子，那它就是鸭子。"

翻译成 Python：**不关心对象是什么类型，只关心它有没有需要的方法/属性**。能用的就用，不要求继承特定基类。

**对比传统静态类型 vs 鸭子类型**：

```python
# 传统静态类型思维（Java/C++ 风格）：
#   要传给函数的对象必须是某个类的子类
#   class Dog extends Animal { ... }
#   void feed(Animal a) { ... }    ← 必须是 Animal 或其子类

# Python 鸭子类型思维：
#   不关心你是什么类，只要有需要的方法就行
def feed(animal):
    animal.eat()          # 只要有 eat 方法就行，不管你是 Dog、Cat 还是 Robot
```

**完整示例**：

```python
# === 鸭子类型示例 ===

class Duck:
    def speak(self):
        return "嘎嘎"
    def walk(self):
        return "摇摇摆摆走"

class Dog:
    def speak(self):
        return "汪汪"
    def walk(self):
        return "四条腿跑"

class Robot:
    def speak(self):
        return "嘀嘀"
    def walk(self):
        return "轮子滚动"

# 鸭子类型：不关心对象是什么类型，只要有 speak 和 walk 方法
def describe(obj):
    """只要 obj 有 speak() 和 walk() 方法就能用"""
    print(f"  叫声: {obj.speak()}")
    print(f"  行走: {obj.walk()}")

# 三个完全不同的类，没有继承关系，但都能用
print("--- 鸭子 ---")
describe(Duck())       # 嘎嘎 / 摇摇摆摆走

print("--- 狗 ---")
describe(Dog())        # 汪汪 / 四条腿跑

print("--- 机器人 ---")
describe(Robot())      # 嘀嘀 / 轮子滚动

# Robot 没有继承任何"动物"基类，但有 speak 和 walk 方法，所以能用
# 这就是鸭子类型："走起来像、叫起来像，就是"
```

**Python 内置的鸭子类型例子**：

```python
# 1. for 循环：只要有 __iter__ 方法就能遍历
class Countdown:
    def __init__(self, start):
        self.start = start
    def __iter__(self):
        n = self.start
        while n > 0:
            yield n
            n -= 1

for i in Countdown(3):
    print(i)    # 3, 2, 1
# Countdown 没继承 list/tuple，但有 __iter__ 就能被 for 遍历

# 2. len()：只要有 __len__ 方法就能用
class MyContainer:
    def __init__(self, items):
        self.items = items
    def __len__(self):
        return len(self.items)

container = MyContainer([1, 2, 3])
print(len(container))    # 3
# MyContainer 没继承任何"容器"基类，但有 __len__ 就能用 len()

# 3. 字符串格式化：只要有 __str__ 方法就能 print
class Person:
    def __init__(self, name):
        self.name = name
    def __str__(self):
        return f"Person({self.name})"

print(Person("Alice"))    # Person(Alice)
# 没继承任何类，但有 __str__ 就能被 print 正确显示
```

**鸭子类型 vs Protocol 的关系**：

| | 鸭子类型（运行时） | Protocol（静态检查） |
|--|-----|------|
| 检查时机 | 运行时（调用时） | 编写时（IDE/mypy 检查） |
| 需要继承吗 | 不需要 | 不需要 |
| 报错时机 | 运行时没方法才报 `AttributeError` | 编写时 IDE 就标红 |
| 本质 | "调用时看有没有方法" | "编写时声明需要什么方法" |

```python
from typing import Protocol

# Protocol = 鸭子类型 + 静态检查
class Speaker(Protocol):
    def speak(self) -> str:
        ...

def make_sound(obj: Speaker) -> str:
    return obj.speak()

# 鸭子类型：运行时只要有 speak 方法就行
# Protocol：编写时 IDE 就能检查你传的对象有没有 speak 方法
# 两者都不要求继承，但 Protocol 多了静态检查的保护
```

> **一句话记忆**：鸭子类型 = "不看你是什么类型，看你有什么方法"。Protocol 是鸭子类型的静态检查版，编写时就能发现错误，不用等到运行时。

#### ⑥ `@dataclass` 适合承载数据的对象

```python
from dataclasses import dataclass

@dataclass
class TrainingConfig:
    """主要承载数据，规则简单"""
    lr: float = 1e-3
    batch_size: int = 32
    epochs: int = 10

config = TrainingConfig(lr=5e-4, batch_size=64)
print(config)
# TrainingConfig(lr=0.0005, batch_size=64, epochs=10)
```

### 5.3 类型标注的核心认知

> "类型系统的目标是尽早暴露接口误用，不是把动态语言硬写成 Java。公共边界优先标清，局部显而易见的变量不必逐个标注。"

翻译：
- 类型标注给 **IDE 补全、静态检查工具（mypy/pyright）、读者** 看，运行时不验证
- **公共 API（函数签名、类属性）要标清**，让调用方知道传什么
- **局部变量（`i = 0`、`result = []`）不用标**，类型显而易见

```python
# 公共边界：要标清
def train(model: nn.Module, dataloader: DataLoader, epochs: int) -> None:
    ...

# 局部变量：不用标
def train(model, dataloader, epochs):
    total_loss = 0.0          # 不用写 total_loss: float = 0.0
    for batch in dataloader:  # 不用标 batch 的类型
        loss = model(batch)   # 不用标 loss 的类型
        total_loss += loss
```

---

## 六、完整测试脚本

```python
"""Python 进阶 2 完整测试脚本
运行：python python_advanced_2_test.py
"""

# ============ 1. 生成器 ============
print("=== 1. 生成器 ===")
from collections.abc import Iterator

def read_batches(path: str, batch_size: int) -> Iterator[list[str]]:
    batch: list[str] = []
    with open(path, encoding="utf-8") as file:
        for line in file:
            batch.append(line.rstrip("\n"))
            if len(batch) == batch_size:
                yield batch
                batch = []
    if batch:
        yield batch

# 造测试文件
with open("test_data.txt", "w", encoding="utf-8") as f:
    for i in range(7):
        f.write(f"line_{i}\n")

for batch in read_batches("test_data.txt", batch_size=3):
    print(f"  一批: {batch}")

# 生成器只能消费一次
gen = read_batches("test_data.txt", 3)
print(f"  第一次: {list(gen)}")
print(f"  第二次: {list(gen)}")    # []，耗尽了

# ============ 2. 装饰器 ============
print("\n=== 2. 装饰器 ===")
from functools import wraps
from time import perf_counter

def timed_simple(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            elapsed_ms = (perf_counter() - start) * 1_000
            print(f"  {fn.__name__}: {elapsed_ms:.3f} ms")
    return wrapper

@timed_simple
def preprocess(values: list[float]) -> list[float]:
    return [v * 2 for v in values]

result = preprocess([1.0, 2.0, 3.0])
print(f"  结果: {result}")

# ============ 3. 上下文管理器 ============
print("\n=== 3. 上下文管理器 ===")
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    start = perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (perf_counter() - start) * 1_000
        print(f"  {name}: {elapsed_ms:.3f} ms")

with timer("生成数据"):
    data = list(range(100_000))

with timer("处理数据"):
    result = [x * 2 for x in data]

# ============ 4. 异常处理 ============
print("\n=== 4. 异常处理 ===")

def parse_world_size(raw: str) -> int:
    try:
        world_size = int(raw)
    except ValueError as exc:
        raise ValueError(f"WORLD_SIZE 必须是整数，实际为 {raw!r}") from exc
    if world_size <= 0:
        raise ValueError("WORLD_SIZE 必须大于 0")
    return world_size

print(f"  parse('4') = {parse_world_size('4')}")

try:
    parse_world_size("abc")
except ValueError as e:
    print(f"  错误: {e}")

try:
    parse_world_size("-1")
except ValueError as e:
    print(f"  错误: {e}")

# ============ 5. 类型标注与 dataclass ============
print("\n=== 5. 类型标注与 dataclass ===")
from dataclasses import dataclass
from collections.abc import Sequence, Iterable

@dataclass(frozen=True)
class ShardSpec:
    rank: int
    world_size: int

spec = ShardSpec(rank=0, world_size=4)
print(f"  ShardSpec: {spec}")
print(f"  可哈希: {hash(spec)}")    # frozen=True 才能哈希

# Iterable 示例
def sum_all(numbers: Iterable[int]) -> int:
    return sum(numbers)

print(f"  sum_all([1,2,3]) = {sum_all([1,2,3])}")
print(f"  sum_all({{1,2,3}}) = {sum_all({1,2,3})}")

# Sequence 示例
def get_first(items: Sequence[int]) -> int:
    return items[0]

print(f"  get_first([1,2,3]) = {get_first([1,2,3])}")
print(f"  get_first((1,2,3)) = {get_first((1,2,3))}")

# T | None 示例
def find_user(user_id: int) -> dict | None:
    users = {1: {"name": "Alice"}}
    return users.get(user_id)

print(f"  find_user(1) = {find_user(1)}")
print(f"  find_user(999) = {find_user(999)}")

print("\n=== 全部测试通过 ===")
```

---

## 七、概念速查表

| 概念 | 一句话记忆 |
|------|------------|
| 生成器 | 用 yield 按需产数据，省内存，但只能消费一次 |
| yield | 返回值后暂停，下次 next() 从暂停处继续 |
| 装饰器 | 接收函数返回新函数，@timed = preprocess = timed(preprocess) |
| @wraps | 保留原函数名/文档，否则装饰后都叫 wrapper |
| ParamSpec | 捕获原函数参数签名，让装饰器保留类型信息 |
| TypeVar | 捕获返回类型，让装饰器不改变返回类型 |
| *args/**kwargs | 接收所有位置参数/关键字参数，*args 是元组，**kwargs 是字典 |
| @contextmanager | 把生成器函数转成上下文管理器，不用写 __enter__/__exit__ |
| with | 保证资源释放，即使异常也执行清理 |
| perf_counter | 高精度计时器，适合测代码耗时 |
| raise ... from exc | 保留异常因果链，traceback 同时显示原异常和新异常 |
| !r | 用 repr 格式化，字符串带引号 |
| @dataclass(frozen=True) | 不可变数据类，不能改属性，可哈希 |
| Iterable[T] | 只要能 for 遍历就行的参数 |
| Sequence[T] | 要支持 len + 下标访问的参数 |
| T \| None | 值可能缺失（联合类型） |
| Protocol | 结构化接口，有方法就满足，不用继承 |
| 类型标注 | 给 IDE/检查工具/读者看，运行时不验证 |

---

## 八、关联笔记

- `python/Python进阶笔记_名字绑定_闭包_类与协议.md`（第一篇，前置）
- `pytorch/PyTorch常见操作速查.md`（with torch.no_grad() 等用到上下文管理器）
- `backend/FastAPI学习笔记.md`（Pydantic 用到类型标注）
- `技术工具学习索引.md`
