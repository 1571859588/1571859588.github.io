# Python 进阶笔记 3：并发、性能分析与优化

> 更新时间：2026-06-30
> 状态：学习笔记（逐句拆解并发与性能分析概念）
> 关联：`python/Python进阶笔记_名字绑定_闭包_类与协议.md`、`python/Python进阶笔记2_迭代器_装饰器_上下文管理器.md`

---

## 一句话结论

本篇拆解 Python 并发三大模型（线程/多进程/asyncio）、基准测试、性能定位和优化优先级。核心认知：**先判断瓶颈是 I/O 还是 CPU，再选并发模型**；**GIL 限制的是纯 Python CPU 计算，不限制 I/O 和原生扩展**；**优化优先改算法和批处理，最后才考虑写 C++/CUDA**。

---

## 一、并发与并行：先分清

### 1.1 概念区分

| 概念 | 含义 | 例子 |
|------|------|------|
| **并发（concurrency）** | 多个任务在同一时间段内**交替推进** | 一个人同时写文档、回邮件、喝咖啡（切换着做） |
| **并行（parallelism）** | 多个任务在同一时刻**真正同时执行** | 两个人分别写文档和回邮件（各干各的） |

```
并发（交替推进）：        并行（同时执行）：
任务A ██  ██  ██          任务A ████████
任务B   ██  ██            任务B ████████
任务C     ██              任务C ████████
（一个 CPU 核心切换）      （三个核心各跑一个）
```

### 1.2 按瓶颈选并发模型

| 任务类型 | 典型例子 | 常见选择 | 原因 |
|----------|----------|----------|------|
| **I/O 密集** | 请求 API、读大量小文件 | 线程或 asyncio | 瓶颈在等 I/O，CPU 空闲，并发即可 |
| **Python CPU 密集** | 纯 Python 解析、复杂循环 | 多进程 | GIL 限制线程，必须多进程才能并行 |
| **原生算子密集** | NumPy/PyTorch/CUDA 运算 | 底层线程池/GPU 并行 | 原生扩展会释放 GIL，Python 只负责调度 |
| **大数据跨进程** | 数据加载、共享缓存 | 多进程 + 共享内存 | 避免重复加载，但要谨慎序列化 |

**选型决策树**：

```
你的代码慢在哪？
│
├─ 等网络/磁盘/数据库响应
│   ├─ 请求数量适中 → 线程（ThreadPoolExecutor）
│   └─ 请求数量很大（上千） → asyncio
│
├─ 纯 Python 计算（循环、解析）
│   └─ 多进程（ProcessPoolExecutor）
│
├─ NumPy/PyTorch 矩阵运算
│   └─ 不用管，底层已并行，Python 调度即可
│
└─ 大数据加载（如 DataLoader）
    └─ 多进程 + 共享内存（遵循框架推荐配置）
```

---

## 二、GIL 到底限制了什么

### 2.1 GIL 是什么

**GIL（Global Interpreter Lock，全局解释器锁）**：CPython 实现中的一个互斥锁，保证**同一进程中只有一个线程能同时执行 Python 字节码**。

```
没有 GIL 的话（假想）：           有 GIL 的现实：
线程1: 执行 Python 代码            线程1: 拿到 GIL，执行 ████████
线程2: 同时执行 Python 代码         线程2: 等 GIL        ........
（两个线程真的并行）                （线程2 要等线程1 释放 GIL）
```

### 2.2 GIL 限制什么、不限制什么

| 场景 | GIL 影响 | 说明 |
|------|----------|------|
| 两个纯 Python CPU 线程 | ❌ 不能并行 | 同一时刻只有一个线程执行字节码 |
| 阻塞 I/O（网络、文件） | ✅ 不影响 | I/O 等待时释放 GIL，其他线程能跑 |
| NumPy/PyTorch 原生运算 | ✅ 不影响 | 原生扩展在计算时释放 GIL |
| 后台日志、预取 | ✅ 不影响 | 轻量任务适合线程 |

**关键认知**：GIL 不是"Python 线程没用"，而是"纯 Python CPU 计算用线程没用"。I/O 和原生运算不受限。

### 2.3 一句话总结

> GIL 是 CPython 实现细节，不应泛化成所有 Python 实现的永恒规则。判断性能时要测量当前解释器和依赖，而不是只背结论。

---

## 三、线程：共享内存，也共享风险

### 3.1 完整代码逐句拆解

```python
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen

def fetch_size(url: str) -> int:
    """获取网页内容大小"""
    with urlopen(url, timeout=10) as response:
        return len(response.read())

urls = ["https://example.com"] * 4    # 4 个相同的 URL
with ThreadPoolExecutor(max_workers=4) as pool:
    sizes = list(pool.map(fetch_size, urls))

print(sizes)    # [1256, 1256, 1256, 1256]（example.com 的页面大小）
```

**逐句解释**：

| 代码 | 含义 |
|------|------|
| `from concurrent.futures import ThreadPoolExecutor` | 导入线程池执行器 |
| `ThreadPoolExecutor(max_workers=4)` | 创建一个有 4 个线程的线程池 |
| `with ... as pool` | 用 with 管理，退出时自动关闭线程池 |
| `pool.map(fetch_size, urls)` | 把 urls 列表的每个元素交给 fetch_size 函数处理，4 个线程并行执行 |
| `list(...)` | pool.map 返回迭代器，转成 list 拿到所有结果 |

**执行流程**：

```
urls = [url, url, url, url]    （4 个任务）

ThreadPoolExecutor(max_workers=4):
  线程1 → fetch_size(url) → 等网络 → 拿到 1256
  线程2 → fetch_size(url) → 等网络 → 拿到 1256    （4 个同时等网络）
  线程3 → fetch_size(url) → 等网络 → 拿到 1256
  线程4 → fetch_size(url) → 等网络 → 拿到 1256

sizes = [1256, 1256, 1256, 1256]
```

**为什么线程适合 I/O 密集**：4 个线程同时等网络，总耗时 ≈ 最慢的一个请求，而不是 4 个请求时间相加。等网络时 GIL 会释放，其他线程能同时等。

### 3.2 竞态条件与锁

```python
from threading import Lock

lock = Lock()         # 创建锁
counter = 0

def increment() -> None:
    global counter
    with lock:         # 获取锁，执行完自动释放
        counter += 1   # 临界区：读取-修改-写回
```

**为什么需要锁**：

```python
# 不加锁的竞态条件：
counter = 0

def increment_bad():
    global counter
    counter += 1       # 这一步不是原子的！
    # 实际等价于：
    # temp = counter    （1. 读取）
    # temp = temp + 1   （2. 修改）
    # counter = temp    （3. 写回）

# 两个线程同时执行：
# 线程1: temp = counter (0)
# 线程2: temp = counter (0)    ← 也读到 0！
# 线程1: counter = 1
# 线程2: counter = 1           ← 应该是 2，但变成了 1！
```

---

### ⚠️ 3.3 重要补充：Python 3.12+ 的 GIL 检查机制变化

> **实测发现**：在 Python 3.12+ 中，`counter += 1` 不加锁时结果**经常是正确的**（即使百万次循环也不出错）。这与"理论上的竞态条件"不一致，原因是 **CPython 3.12 重写了 eval 循环，GIL 检查点发生了变化**。

#### 3.3.1 根本原因：GIL 检查点变了

**Python < 3.12（旧机制）**：GIL 在**每条字节码指令之间**都会检查是否需要切换线程。所以 `LOAD_NAME` 和 `STORE_NAME` 之间可能发生线程切换 → 竞态条件。

**Python 3.12+（新机制）**：GIL 只在**特定检查点**才检查是否需要切换：
1. **循环跳转**（`JUMP_BACKWARD`，即 for/while 每轮迭代结束时）
2. **函数调用**（`CALL` 指令）
3. **其他少数点**（`YIELD_VALUE`、某些 `IMPORT_NAME` 等）

**不再在每条字节码指令之间都检查！**

```
Python < 3.12（每条指令都检查 GIL）：
  LOAD_NAME(counter)     ← 检查 GIL ← 这里可能切换！
  LOAD_CONST(1)          ← 检查 GIL
  BINARY_OP(+=)          ← 检查 GIL ← 这里也可能切换！
  STORE_NAME(counter)    ← 检查 GIL
  JUMP_BACKWARD          ← 检查 GIL

Python 3.12+（只在特定点检查 GIL）：
  LOAD_NAME(counter)     ← 不检查
  LOAD_CONST(1)          ← 不检查
  BINARY_OP(+=)          ← 不检查
  STORE_NAME(counter)    ← 不检查
  JUMP_BACKWARD          ← ✅ 检查 GIL（只有循环跳转才检查）
```

**结论**：`counter += 1` 的 4 条字节码指令在 Python 3.12+ 中**连续执行，中间不会释放 GIL**，因此在这个特定场景下**事实上是原子的**。

#### 3.3.2 实验验证

```python
import sys
import threading

sys.setswitchinterval(1e-9)  # 1 纳秒切换，极端压力测试

# ========== 测试 A: counter += 1（无函数调用） ==========
# 结果：10 轮全部正确，0 丢失！
for trial in range(10):
    counter = 0
    def worker():
        nonlocal counter
        for _ in range(500000):
            counter += 1  # 4 条字节码，中间无 GIL 检查

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    # 期望 2000000, 实际 2000000, 丢失 0 ✅

# ========== 测试 B: counter = add_one(counter)（有函数调用） ==========
# 结果：大量丢失！
def add_one(x):
    return x + 1

for trial in range(10):
    counter = 0
    def worker():
        nonlocal counter
        for _ in range(200000):
            counter = add_one(counter)  # CALL 指令触发 GIL 检查！

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    # 期望 800000, 实际 ~340000, 丢失 ~460000 ❌
```

**字节码对比**（用 `dis` 模块查看）：

```
--- counter += 1 ---（无函数调用，GIL 不检查）
  LOAD_NAME    0 (counter)
  LOAD_CONST   0 (1)
  BINARY_OP    13 (+=)
  STORE_NAME   0 (counter)

--- counter = add_one(counter) ---（有 CALL，GIL 检查！）
  LOAD_NAME    0 (add_one)
  PUSH_NULL
  LOAD_NAME    1 (counter)     ← 读取 counter
  CALL         1               ← ✅ GIL 检查点！可能在这里切换！
  STORE_NAME   1 (counter)     ← 写回 counter（此时 counter 可能已被其他线程改过）
```

#### 3.3.3 这意味着什么

| 场景 | Python 3.12+ 是否有竞态 | 原因 |
|------|------------------------|------|
| `counter += 1` | ❌ 事实上不会出现 | 4 条字节码中间无 GIL 检查点 |
| `counter = counter + 1` | ❌ 事实上不会出现 | 同上，等价字节码 |
| `counter = add_one(counter)` | ✅ 大量竞态 | `CALL` 指令触发 GIL 检查 |
| `dict['k'] = dict['k'] + 1` | ❌ 事实上不会出现 | 无函数调用，无循环跳转 |
| `list[0] = list[0] + 1` | ❌ 事实上不会出现 | 同上 |
| `if key not in d: d[key] = 1` | ✅ 可能有竞态 | 两行语句之间有 GIL 检查 |

#### 3.3.4 正确的态度

> **虽然 `counter += 1` 在 Python 3.12+ 中事实上不会出错，但这只是 CPython 实现的"副作用"，不是语言规范保证的行为。**

1. **不要依赖这个行为**：CPython 实现细节随时可能变化（比如 free-threaded Python / no-GIL 正在开发中）
2. **写代码时仍然要加锁**：`with lock: counter += 1` 是正确的写法
3. **面试时要解释清楚**：理论上有竞态（字节码不是原子的），但在 CPython 3.12+ 中由于 GIL 检查机制变化，简单操作事实上不会出错
4. **真正的竞态**：涉及函数调用、多步操作、或跨多行的 read-modify-write 仍然会出错

**一句话总结**：`counter += 1` 在 Python 3.12+ 中"看起来不出错"是 CPython eval 循环的实现细节，不是线程安全保证。写多线程代码时仍然必须加锁。

---

**`with lock:` 的作用**：

```python
with lock:
    counter += 1

# 等价于：
lock.acquire()        # 获取锁（其他线程要等）
counter += 1          # 只有持锁线程能执行
lock.release()        # 释放锁
# with 的好处：即使 counter += 1 报错，锁也会自动释放
```

**使用示例**：

```python
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

lock = Lock()
counter = 0

def increment():
    global counter
    with lock:
        counter += 1

# 1000 个线程各自 increment 一次
with ThreadPoolExecutor(max_workers=10) as pool:
    list(pool.map(lambda _: increment(), range(1000)))

print(counter)    # 1000（加了锁，结果正确）

# 注意：在 Python 3.12+ 中，即使不加锁，counter 也可能是 1000
# 但这只是 CPython 实现的副作用，不应依赖此行为！
# 在 Python < 3.12 或未来 no-GIL 版本中，不加锁就可能出错
```

> **原则**：不要依赖"某个内置操作看起来是原子的"来设计正确性。解释器版本、对象实现或复合操作都可能破坏这种假设。需要线程安全就用锁。

---

## 四、多进程：绕开 GIL，但数据搬运有成本

### 4.1 完整代码逐句拆解

```python
from concurrent.futures import ProcessPoolExecutor

def count_primes(limit: int) -> int:
    """统计小于 limit 的素数个数"""
    def is_prime(value: int) -> bool:
        if value < 2:
            return False
        return all(value % divisor for divisor in range(2, int(value**0.5) + 1))
    return sum(is_prime(value) for value in range(limit))

if __name__ == "__main__":
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(count_primes, [50_000] * 4))
```

**逐句拆解**：

| 代码 | 含义 |
|------|------|
| `ProcessPoolExecutor()` | 创建进程池（默认进程数 = CPU 核心数） |
| `pool.map(count_primes, [50_000] * 4)` | 把 `[50000, 50000, 50000, 50000]` 的每个元素交给 count_primes，4 个进程并行执行 |
| `list(...)` | 转成 list 拿到结果 |
| `if __name__ == "__main__":` | **关键**：多进程必须加这行 |

**`[50_000] * 4` 是什么**：

```python
[50_000] * 4
# 等于 [50000, 50000, 50000, 50000]
# 4 个相同的参数，分别交给 4 个进程执行
# 每个进程统计 50000 以内的素数
```

**执行流程**：

```
[50000, 50000, 50000, 50000]    （4 个任务）

ProcessPoolExecutor（4 个进程）:
  进程1 → count_primes(50000) → 5133    （各自独立的 Python 解释器）
  进程2 → count_primes(50000) → 5133    （真正并行，不受 GIL 限制）
  进程3 → count_primes(50000) → 5133
  进程4 → count_primes(50000) → 5133

results = [5133, 5133, 5133, 5133]
```

### 4.2 为什么必须加 `if __name__ == "__main__":`

```python
if __name__ == "__main__":
    with ProcessPoolExecutor() as pool:
        ...
```

**原因**：多进程在 Windows 和 macOS 上用 `spawn` 方式启动子进程，子进程会**重新导入当前模块**。如果不加 `if __name__` 保护，子进程导入时会再次执行 `ProcessPoolExecutor()`，导致**无限递归创建子进程**。

```python
# 错误写法（不加保护）：
# myscript.py
from concurrent.futures import ProcessPoolExecutor

with ProcessPoolExecutor() as pool:    # 这行在模块顶层
    results = list(pool.map(count_primes, [50000] * 4))

# 运行 python myscript.py：
# 主进程执行 → 创建 4 个子进程
# 每个子进程导入 myscript.py → 又执行 ProcessPoolExecutor → 又创建子进程
# 无限递归！报错或卡死

# 正确写法：
if __name__ == "__main__":    # 只有主进程才执行
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(count_primes, [50000] * 4))
# 子进程导入时 __name__ 不是 "__main__"，跳过这行
```

### 4.3 多进程的成本

| 成本类型 | 说明 |
|----------|------|
| 创建进程 | 比创建线程慢 10-100 倍 |
| 序列化 | 参数和返回值要 pickle 序列化/反序列化 |
| 内存复制 | 每个进程有独立内存空间 |
| 进程间通信 | 需要队列/管道，比线程共享内存慢 |

**如果每个任务只做几十微秒工作，调度成本可能比计算更高**。应增大任务粒度，避免来回传递大型数组。

### 4.4 GPU 关联警告

> 不要在父进程初始化 CUDA 后随意 fork。

```python
# 错误：父进程初始化了 CUDA，fork 后子进程 CUDA 状态混乱
import torch
model = torch.load("model.pt")    # 父进程初始化 CUDA

from concurrent.futures import ProcessPoolExecutor
with ProcessPoolExecutor() as pool:
    pool.map(infer, data)    # fork 出的子进程 CUDA 状态有问题

# 正确：子进程内部初始化 CUDA
def infer(data):
    import torch              # 子进程内部导入
    model = torch.load("model.pt")
    return model(data)

if __name__ == "__main__":
    with ProcessPoolExecutor() as pool:
        pool.map(infer, data_batches)
```

---

## 五、asyncio：协作式 I/O 并发

### 5.1 什么是协程

**协程 = 可以暂停和恢复的函数**，用 `async def` 定义，用 `await` 暂停。

```python
async def worker(name: str, delay: float) -> str:
    await asyncio.sleep(delay)    # 在这里暂停，把控制权还给事件循环
    return name
```

**协程 vs 普通函数**：

| 普通函数 | 协程 |
|----------|------|
| `def func():` | `async def func():` |
| 调用即执行完 | 调用返回协程对象，需要 await 或调度 |
| 不能暂停 | 在 await 处暂停 |
| `return` 返回结果 | `return` 返回结果（通过 await 接收） |

### 5.2 完整代码逐句拆解

```python
import asyncio

async def worker(name: str, delay: float) -> str:
    await asyncio.sleep(delay)    # 模拟非阻塞 I/O（暂停 delay 秒）
    return name

async def main() -> None:
    results = await asyncio.gather(
        worker("a", 0.2),         # worker a 要 0.2 秒
        worker("b", 0.1),         # worker b 要 0.1 秒
    )
    print(results)

asyncio.run(main())
```

**逐句拆解**：

| 代码 | 含义 |
|------|------|
| `async def worker(...)` | 定义协程函数 |
| `await asyncio.sleep(delay)` | 暂停 delay 秒（非阻塞，期间其他协程能跑） |
| `asyncio.gather(...)` | 并发执行多个协程，等全部完成 |
| `await asyncio.gather(...)` | 等待所有协程完成并收集结果 |
| `asyncio.run(main())` | 启动事件循环，运行 main 协程 |

### 5.3 为什么输出 `['a', 'b']` 而不是 `['b', 'a']`

```python
results = await asyncio.gather(
    worker("a", 0.2),    # 第 1 个参数
    worker("b", 0.1),    # 第 2 个参数
)
```

**`asyncio.gather` 的返回顺序**：按**传入参数的顺序**返回，不管谁先完成。

```
时间轴：
0.0s  worker("a") 开始，sleep 0.2s
0.0s  worker("b") 开始，sleep 0.1s
0.1s  worker("b") 完成，返回 "b"
0.2s  worker("a") 完成，返回 "a"

gather 收集结果，按传入顺序排列：
results = ["a", "b"]    ← 按参数顺序，不是完成顺序
```

**对比**：如果按完成顺序，应该是 `["b", "a"]`（b 先完成）。但 gather 保证按**传入顺序**返回，这样代码行为可预测。

### 5.4 总耗时

```
串行执行：0.2 + 0.1 = 0.3 秒
asyncio 并发：max(0.2, 0.1) = 0.2 秒    ← 等最慢的那个
```

### 5.5 "改成异步库"是什么意思

原文说"在事件循环中直接执行阻塞 I/O 会卡住所有协程，应改用异步库"。

**阻塞 I/O 的问题**：

```python
import asyncio
import requests    # 阻塞库

async def bad_fetch(url):
    # requests.get 是阻塞的，会卡住整个事件循环！
    response = requests.get(url)    # 其他协程全部暂停等待
    return response.text

async def main():
    await asyncio.gather(
        bad_fetch("https://example.com"),
        bad_fetch("https://example.org"),
    )
# 实际上是串行的：第 1 个请求完成后才开始第 2 个
```

**改成异步库**：

```python
import asyncio
import aiohttp    # 异步 HTTP 库

async def good_fetch(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    results = await asyncio.gather(
        good_fetch("https://example.com"),
        good_fetch("https://example.org"),
    )
    print(results)

asyncio.run(main())
# 两个请求真正并发，总耗时 ≈ 最慢的一个
```

**常见阻塞库 vs 异步库对照**：

| 场景 | 阻塞库（会卡住 asyncio） | 异步库（配合 asyncio） |
|------|--------------------------|------------------------|
| HTTP 请求 | `requests` | `aiohttp` / `httpx` |
| 文件 I/O | `open()` | `aiofiles` |
| 数据库 | `pymysql` | `aiomysql` |
| Redis | `redis-py`（同步模式） | `redis.asyncio` |

---

## 六、正确做基准测试

### 6.1 为什么不能只测一次

```python
from time import perf_counter

# 错误：只测一次
start = perf_counter()
my_function()
print(perf_counter() - start)
# 问题：
# 1. 可能受系统波动影响（其他进程占用 CPU）
# 2. 第一次执行可能有初始化开销（导入、JIT 编译、缓存预热）
# 3. GPU 操作是异步的，CPU 计时器量不到真实耗时
```

### 6.2 timeit 命令行用法

```bash
python -m timeit -s 'xs = list(range(1000))' 'sum(xs)'
```

**逐段拆解**：

| 部分 | 含义 |
|------|------|
| `python -m timeit` | 以模块方式运行 timeit（Python 内置的基准测试工具） |
| `-s 'xs = list(range(1000))'` | setup：预先执行的代码（准备测试数据），不计入计时 |
| `'sum(xs)'` | 要计时的代码（真正测的部分） |

**为什么这么写**：

```bash
# -s 后面是"准备阶段"，只执行一次，不计入时间
# 比如造一个 0-999 的列表

# 后面是要测的代码，timeit 会自动跑很多次取平均
# 测的是 sum(xs) 这一行的时间
```

**输出示例**：

```
200000 loops, best of 5: 1.23 usec per loop
```
含义：跑了 5 组，每组 20 万次，取最好的那组的平均值：每次 1.23 微秒。

**为什么不用代码块写**：timeit 命令行适合快速测试单行表达式。如果要测复杂逻辑，用下面的 Python 代码方式。

### 6.3 手工基准测试函数逐句拆解

```python
from statistics import median
from time import perf_counter

def benchmark(fn, warmup: int = 5, repeat: int = 20) -> float:
    """基准测试：预热 + 多次测量取中位数"""

    # 1. 预热：先跑几次，消除初始化开销（缓存、JIT 等）
    for _ in range(warmup):
        fn()

    # 2. 正式测量：跑 repeat 次，记录每次耗时
    samples = []
    for _ in range(repeat):
        start = perf_counter()
        fn()
        samples.append(perf_counter() - start)

    # 3. 返回中位数（比平均值更抗异常值）
    return median(samples)
```

**`median` 的作用**：

```python
from statistics import median

# median = 中位数，把数据排序后取中间值
# 比平均值更抗异常值

samples = [0.010, 0.011, 0.010, 0.500, 0.010]
#                                  ↑ 异常值（可能系统卡了一下）

print(f"平均值: {sum(samples)/len(samples):.3f}")    # 0.108（被异常值拉高）
print(f"中位数: {median(samples):.3f}")               # 0.010（不受异常值影响）
```

**为什么用中位数而不是平均值**：基准测试中可能有异常值（系统调度、GC 等），中位数不受极端值影响，更稳定。

### 6.4 GPU 基准测试的坑

```python
import torch

# 错误：GPU 操作是异步的，CPU 计时器量不到真实耗时
start = perf_counter()
output = model(input)          # 这只是"提交任务"到 GPU，可能还没执行完
elapsed = perf_counter() - start  # 量到的是提交时间，不是执行时间

# 正确：用 torch.cuda.synchronize() 同步，等 GPU 真正执行完
start = perf_counter()
output = model(input)
torch.cuda.synchronize()       # 等 GPU 执行完
elapsed = perf_counter() - start  # 现在量到的是真实耗时

# 更精确：用 CUDA Event
start_event = torch.cuda.Event(enable_timing=True)
end_event = torch.cuda.Event(enable_timing=True)

start_event.record()
output = model(input)
end_event.record()
torch.cuda.synchronize()
elapsed = start_event.elapsed_time(end_event)    # 毫秒
```

---

## 七、从"慢"定位到具体代码

### 7.1 性能定位流程

```
1. 端到端计时 → 确认慢是真的
2. 阶段计时 → 区分数据/计算/通信/保存
3. 函数级 profiling → cProfile 找耗时函数
4. 行级 profiling → 定位热点行
5. 内存 profiling → tracemalloc 找内存增长
6. GPU profiling → PyTorch Profiler / Nsight
```

### 7.2 cProfile + pstats 完整使用示例

**第一步：用 cProfile 运行脚本**

```bash
python -m cProfile -o profile.out train.py
```

| 参数 | 含义 |
|------|------|
| `python -m cProfile` | 以模块方式运行 cProfile（Python 内置性能分析器） |
| `-o profile.out` | 把分析结果输出到 profile.out 文件（二进制格式） |
| `train.py` | 要分析的脚本 |

**第二步：用 pstats 查看结果**

```bash
python -m pstats profile.out
```

进入 pstats 交互界面后：

```
% sort cumulative       ← 按累计耗时排序
% stats 30              ← 显示前 30 条
```

**完整交互示例**：

```bash
$ python -m cProfile -o profile.out train.py
# （train.py 执行完成，生成 profile.out）

$ python -m pstats profile.out
Welcome to the profile statistics browser.
profile.out% sort cumulative
profile.out% stats 10
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
       10    0.001    0.000    5.234    0.523 train.py:15(train_step)
       50    4.100    0.082    4.100    0.082 {built-in method matmul}
        5    0.000    0.000    1.123    0.225 train.py:25(load_data)
      ...
profile.out% quit
```

**列含义**：

| 列 | 含义 | 关注点 |
|----|------|--------|
| `ncalls` | 调用次数 | 被调用最多的函数 |
| `tottime` | 函数自身耗时（不含子调用） | **找热点函数看这个** |
| `cumtime` | 累计耗时（含子调用） | **找瓶颈路径看这个** |
| `percall` | 每次调用平均耗时 | 单次很慢的函数 |
| `filename:lineno(function)` | 函数位置 | 定位代码 |

### 7.3 tracemalloc 完整示例

```python
import tracemalloc

# 开始追踪内存分配
tracemalloc.start()

# === 运行待检查的代码 ===
data = []
for i in range(100000):
    data.append([j for j in range(100)])

# 拍快照
snapshot = tracemalloc.take_snapshot()

# 按行号统计内存分配，显示前 10
for stat in snapshot.statistics("lineno")[:10]:
    print(stat)

# 输出示例：
# test.py:7: size=386 MB, count=999998, average=402 B
# test.py:6: size=128 MB, count=100000, average=1334 B
# ...
# 这说明第 7 行（内层列表推导）分配了最多内存
```

### 7.4 PyTorch Profiler（GPU 场景）

```python
import torch
from torch.profiler import profile, ProfilerActivity

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    record_shapes=True,
) as prof:
    output = model(input)
    loss = criterion(output, target)
    loss.backward()

# 打印 CUDA 耗时前 10
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=10))
```

---

## 八、性能优化的优先级

### 8.1 推荐顺序

```
1. 先改算法复杂度和数据结构        ← 最有效（O(n²) → O(n log n) 远超微优化）
2. 减少不必要的 I/O、复制和序列化   ← 消除无意义开销
3. Python 循环 → 批处理/向量化      ← 用 NumPy/PyTorch 矩阵运算替代 for 循环
4. 减少 Python 与 C++/GPU 边界往返  ← 每次跨边界都有调度开销
5. 最后才写 C++/CUDA/Triton 扩展    ← 确认热点后，用原生代码优化
```

### 8.2 向量化示例（第 3 步）

```python
import numpy as np

# 慢：Python for 循环
def slow_square(values):
    result = []
    for v in values:
        result.append(v * v)
    return result

# 快：NumPy 向量化
def fast_square(values):
    return values * values    # 一次调用，底层 C 并行

values = np.arange(1_000_000)
# slow: ~200ms
# fast: ~2ms    ← 快 100 倍
```

### 8.3 减少边界往返示例（第 4 步）

```python
# 慢：100 万次小算子调用（每次跨 Python→C++→Python）
for i in range(1_000_000):
    tensor[i] = torch.add(tensor[i], 1)    # 每次都是一次跨边界调用

# 快：1 次大算子调用
tensor = torch.add(tensor, 1)    # 一次调用处理全部，1 次跨边界

# 一百万次小算子调用即使每次都很快，也会累积大量调度开销
# 批处理后调用一次大算子，通常比微调 Python 语法有效得多
```

---

## 九、完整测试脚本

```python
"""Python 进阶 3 完整测试脚本
运行：python python_advanced_3_test.py
"""
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from threading import Lock
from statistics import median
from time import perf_counter

# ============ 1. 线程池 ============
print("=== 1. 线程池（I/O 密集）===")

def fake_io_task(n: int) -> int:
    """模拟 I/O 任务"""
    time.sleep(0.1)    # 模拟网络等待
    return n * 2

# 串行：4 × 0.1s = 0.4s
start = perf_counter()
results_serial = [fake_io_task(i) for i in range(4)]
print(f"  串行: {perf_counter()-start:.2f}s, 结果: {results_serial}")

# 并发：max(0.1, 0.1, 0.1, 0.1) = 0.1s
start = perf_counter()
with ThreadPoolExecutor(max_workers=4) as pool:
    results_thread = list(pool.map(fake_io_task, range(4)))
print(f"  线程: {perf_counter()-start:.2f}s, 结果: {results_thread}")

# ============ 2. 锁 ============
print("\n=== 2. 锁（竞态条件）===")

# 不加锁
counter_no_lock = 0
def increment_no_lock():
    global counter_no_lock
    for _ in range(100000):
        counter_no_lock += 1

# 加锁
lock = Lock()
counter_with_lock = 0
def increment_with_lock():
    global counter_with_lock
    for _ in range(100000):
        with lock:
            counter_with_lock += 1

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(lambda _: increment_no_lock(), range(4)))
print(f"  不加锁（期望 400000）: {counter_no_lock}")

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(lambda _: increment_with_lock(), range(4)))
print(f"  加锁（期望 400000）: {counter_with_lock}")

# ============ 3. 多进程 ============
print("\n=== 3. 多进程（CPU 密集）===")

def count_primes(limit: int) -> int:
    def is_prime(value):
        if value < 2:
            return False
        return all(value % d for d in range(2, int(value**0.5) + 1))
    return sum(is_prime(v) for v in range(limit))

if __name__ == "__main__":
    start = perf_counter()
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(count_primes, [50000] * 4))
    print(f"  多进程: {perf_counter()-start:.2f}s, 结果: {results}")

    # 对比串行
    start = perf_counter()
    results_serial = [count_primes(50000) for _ in range(4)]
    print(f"  串行: {perf_counter()-start:.2f}s, 结果: {results_serial}")

# ============ 4. asyncio ============
print("\n=== 4. asyncio ===")
import asyncio

async def worker(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return name

async def main():
    results = await asyncio.gather(
        worker("a", 0.2),
        worker("b", 0.1),
    )
    return results

results = asyncio.run(main())
print(f"  asyncio.gather 结果: {results}")    # ['a', 'b']

# ============ 5. 基准测试 ============
print("\n=== 5. 基准测试 ===")

def benchmark(fn, warmup=5, repeat=20):
    for _ in range(warmup):
        fn()
    samples = []
    for _ in range(repeat):
        start = perf_counter()
        fn()
        samples.append(perf_counter() - start)
    return median(samples)

def test_fn():
    return sum(range(1000))

median_time = benchmark(test_fn)
print(f"  sum(range(1000)) 中位数耗时: {median_time*1000:.3f} ms")

# ============ 6. cProfile 示例 ============
print("\n=== 6. cProfile 示例 ===")
import cProfile
import pstats
import io

def slow_function():
    """模拟慢函数"""
    total = 0
    for i in range(1000000):
        total += i
    return total

def fast_function():
    """模拟快函数"""
    return sum(range(1000000))

# 用 cProfile 分析
pr = cProfile.Profile()
pr.enable()
slow_function()
fast_function()
pr.disable()

# 打印结果
s = io.StringIO()
ps = pstats.Stats(pr, stream=s).sort_stats("cumulative")
ps.print_stats(5)
print(s.getvalue())

print("=== 全部测试完成 ===")
```

---

## 十、概念速查表

| 概念 | 一句话记忆 |
|------|------------|
| 并发 vs 并行 | 并发是交替推进，并行是同时执行 |
| GIL | 同一进程只有一个线程能执行 Python 字节码，但 I/O 和原生扩展不受限 |
| 线程 | 共享内存，适合 I/O 密集，纯 CPU 受 GIL 限制 |
| 多进程 | 独立内存，绕开 GIL，适合 CPU 密集，但数据搬运有成本 |
| asyncio | 协程 + 事件循环，适合大量 I/O 并发，不能跑阻塞代码 |
| 协程 | async def 定义的函数，在 await 处暂停 |
| asyncio.gather | 并发执行多个协程，按传入顺序返回结果 |
| Lock | 保护临界区，with lock 自动获取释放 |
| `if __name__ == "__main__"` | 多进程必须加，防止子进程递归创建 |
| timeit | 命令行基准测试工具，-s 是准备代码，后面是测试代码 |
| median | 中位数，比平均值更抗异常值 |
| cProfile | 函数级性能分析，-o 输出到文件 |
| pstats | 查看 cProfile 结果，sort cumulative 按累计耗时排序 |
| tracemalloc | 内存分配追踪，take_snapshot 拍快照 |
| 优化优先级 | 算法 → I/O → 向量化 → 减少边界往返 → C++/CUDA |

---

## 十一、关联笔记

- `python/Python进阶笔记_名字绑定_闭包_类与协议.md`（第一篇）
- `python/Python进阶笔记2_迭代器_装饰器_上下文管理器.md`（第二篇）
- `pytorch/PyTorch常见操作速查.md`（GPU 基准测试、DataLoader 多进程）
- `pytorch/多机多卡训练与部署笔记.md`（分布式多进程）
- `backend/FastAPI学习笔记.md`（asyncio 异步路由）
- `技术工具学习索引.md`
