# Redis 学习笔记：内存型键值数据库，从缓存到实战

> 更新时间：2026-06-28 | 适用版本：Redis 7.x / redis-py 5.x
> 状态：学习笔记（快速上手版），踩坑记录待实际使用后补充

---

## 一、Redis 是什么？

### 1.1 一句话解释

**Redis**（Remote Dictionary Server）是一个**把数据全部放在内存里**的键值数据库。因为内存比磁盘快几个数量级，所以读写都是微秒级，常用来做**缓存、会话、消息队列、排行榜**。

### 1.2 类比理解

| 数据库 | 类比 | 速度 | 断电后 |
|--------|------|------|--------|
| **MySQL** | 仓库（东西存硬盘，找起来慢但要翻架） | 毫秒级 | 数据还在 |
| **Redis** | 办公桌（东西摊在桌上，伸手就拿） | 微秒级 | 默认会丢，可配置持久化 |
| **Python dict** | 你手里的便签纸 | 纳秒级 | 程序退出就没 |

```
传统架构：
  用户 → API → MySQL（每次都查磁盘，慢）

加缓存后：
  用户 → API → Redis（先查内存，命中直接返回）→ 没命中才查 MySQL
```

### 1.3 什么时候用 Redis

| 场景 | 为什么用 Redis |
|------|----------------|
| **接口缓存** | 同样的查询结果缓存 60 秒，避免反复打 DB |
| **会话存储** | 分布式系统共享 session，比 cookie 安全 |
| **限流** | 用 `INCR` + `EXPIRE` 实现每分钟 N 次限制 |
| **排行榜** | Sorted Set 天然按分数排序，O(log N) |
| **消息队列** | List 的 `LPUSH`/`BRPOP` 做轻量队列 |
| **分布式锁** | `SET key value NX EX` 原子加锁 |

> **不适合**：要持久化且不能丢的金融数据、复杂关联查询（Redis 没有 JOIN）。

---

## 二、安装与连接

### 2.1 启动 Redis 服务

**方式一：直接装（Windows 较麻烦，建议用 Docker）**

```bash
# Linux/Mac
redis-server                    # 默认 6379 端口
redis-cli                       # 进入交互命令行
```

**方式二：Docker（推荐，跨平台）**

```bash
docker run -d --name redis -p 6379:6379 redis:7
docker exec -it redis redis-cli
```

### 2.2 Python 客户端（redis-py）

```bash
uv pip install redis        # 或 pip install redis
```

```python
import redis

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
# decode_responses=True: 返回 str 而不是 bytes
r.set("name", "tom")
print(r.get("name"))        # "tom"
```

> 生产环境推荐用连接池：
> ```python
> pool = redis.ConnectionPool(host="localhost", port=6379, max_connections=10)
> r = redis.Redis(connection_pool=pool)
> ```

---

## 三、五大数据结构（核心）

### 3.1 总览

| 类型 | 存什么 | 典型场景 | Python API |
|------|--------|----------|------------|
| **String** | 单个值 | 缓存、计数器 | `r.set` / `r.get` / `r.incr` |
| **List** | 有序列表 | 消息队列、最新动态 | `r.lpush` / `r.rpop` |
| **Hash** | 字段-值映射 | 对象存储 | `r.hset` / `r.hget` |
| **Set** | 无序唯一集合 | 标签、去重 | `r.sadd` / `r.smembers` |
| **Sorted Set** | 带分数的有序集合 | 排行榜、延时队列 | `r.zadd` / `r.zrange` |

### 3.2 String（字符串）

```python
r.set("user:1:name", "tom", ex=60)   # ex=60 表示 60 秒后过期
r.get("user:1:name")                  # "tom"
r.incr("counter")                     # 自增 1，不存在则从 0 开始
r.incrby("counter", 5)                # 自增 5
r.decr("counter")                     # 自减 1
```

**典型场景**：缓存接口结果、计数器（点赞数、PV）。

### 3.3 List（列表）

```python
r.lpush("queue", "task1", "task2")    # 左侧（头部）插入
r.rpush("queue", "task3")             # 右侧（尾部）插入
r.lpop("queue")                       # 从左侧弹出
r.lrange("queue", 0, -1)              # 查看全部
r.llen("queue")                       # 长度
```

**典型场景**：
- 消息队列：生产者 `LPUSH`，消费者 `BRPOP`（阻塞式弹出）
- 最新 N 条动态：`LPUSH` + `LTRIM` 保留前 100 条

### 3.4 Hash（哈希）

```python
r.hset("user:1", mapping={"name": "tom", "age": 20, "city": "beijing"})
r.hget("user:1", "name")              # "tom"
r.hgetall("user:1")                   # {"name":"tom","age":"20","city":"beijing"}
r.hincrby("user:1", "age", 1)         # age 字段自增 1
r.hdel("user:1", "city")              # 删除字段
```

**典型场景**：存对象（比 String 拆开存更省 key、改单字段更高效）。

### 3.5 Set（集合）

```python
r.sadd("tags:post:1", "python", "redis", "web")
r.sadd("tags:post:2", "python", "fastapi")
r.smembers("tags:post:1")             # 所有元素
r.sismember("tags:post:1", "python")  # 是否存在
r.sinter("tags:post:1", "tags:post:2")# 交集：{"python"}
r.sunion("tags:post:1", "tags:post:2")# 并集
r.sdiff("tags:post:1", "tags:post:2") # 差集
```

**典型场景**：标签、共同好友、去重（如统计 UV）。

### 3.6 Sorted Set（有序集合，ZSet）

```python
r.zadd("leaderboard", {"alice": 100, "bob": 85, "carol": 92})
r.zrange("leaderboard", 0, -1, withscores=True)   # 升序：[('bob',85.0),('carol',92.0),('alice',100.0)]
r.zrevrange("leaderboard", 0, 2, withscores=True) # 降序前 3 名
r.zscore("leaderboard", "alice")                   # 100.0
r.zincrby("leaderboard", 5, "bob")                 # bob 加 5 分
```

**典型场景**：排行榜（游戏积分、热搜）、延时队列（score 存时间戳，按时间取出）。

---

## 四、过期与淘汰策略

### 4.1 给 key 设过期时间

```python
r.set("token", "xxx", ex=3600)         # 3600 秒后过期
r.expire("token", 60)                  # 给已存在的 key 设过期
r.ttl("token")                         # 剩余秒数（-1 永久，-2 不存在）
r.persist("token")                     # 移除过期，变成永久
```

### 4.2 内存满了怎么办——淘汰策略

Redis 内存有限，满了要按策略删旧 key。配置项 `maxmemory-policy`：

| 策略 | 行为 |
|------|------|
| `noeviction` | 不删，写入直接报错（默认） |
| `allkeys-lru` | 删最久没用的（推荐做缓存） |
| `volatile-lru` | 只在设了过期的 key 里删 LRU |
| `allkeys-lfu` | 删使用频率最低的 |
| `volatile-ttl` | 删快要过期的 |

**做缓存推荐 `allkeys-lru`**：内存满自动淘汰最久未访问的 key，对调用方透明。

---

## 五、持久化（断电不丢数据）

### 5.1 两种方式对比

| 方式 | 原理 | 速度 | 数据丢失风险 | 文件 |
|------|------|------|--------------|------|
| **RDB** | 定时全量快照 | 快 | 丢最近几分钟 | `dump.rdb` |
| **AOF** | 记录每条写命令 | 慢 | 最多丢 1 秒 | `appendonly.aof` |

### 5.2 配置

```
# redis.conf
save 900 1          # 900 秒内至少 1 个改动 → 触发 RDB
appendonly yes      # 开启 AOF
appendfsync everysec # 每秒刷盘（折中方案）
```

**生产建议**：两个都开，RDB 用于快速恢复，AOF 用于少丢数据。

---

## 六、与 FastAPI 联动（缓存实战）

### 6.1 经典缓存模式：Cache-Aside

```python
import redis
from fastapi import FastAPI

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
app = FastAPI()

def get_user_from_db(user_id: int):
    # 假装查数据库，很慢
    return {"id": user_id, "name": f"user_{user_id}"}

@app.get("/users/{user_id}")
def get_user(user_id: int):
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return {"source": "cache", "data": cached}
    # 缓存未命中，查 DB
    data = get_user_from_db(user_id)
    r.set(cache_key, str(data), ex=60)    # 缓存 60 秒
    return {"source": "db", "data": data}
```

### 6.2 限流示例（每分钟最多 100 次）

```python
import time

@app.get("/api/expensive")
def rate_limited_api(client_id: str = "default"):
    key = f"rate:{client_id}:{int(time.time() // 60)}"   # 按分钟分桶
    count = r.incr(key)
    if count == 1:
        r.expire(key, 60)     # 第一访问时设过期
    if count > 100:
        from fastapi import HTTPException
        raise HTTPException(status_code=429, detail="请求太频繁")
    return {"count": count}
```

---

## 七、缓存三大问题及对策

| 问题 | 现象 | 对策 |
|------|------|------|
| **缓存穿透** | 查不存在的 key，每次都打 DB | 缓存空值（`null` 短过期）/ 布隆过滤器 |
| **缓存击穿** | 热点 key 过期瞬间，大量请求打 DB | 加互斥锁（`SET NX`）/ 热点 key 永不过期 |
| **缓存雪崩** | 大量 key 同时过期 | 过期时间加随机值 / 多级缓存 |

---

## 八、常用命令速查表

```
# 通用
KEYS *              # 列出所有 key（生产慎用，会阻塞）
DEL key             # 删除
EXISTS key          # 是否存在
TYPE key            # 查看类型
EXPIRE key 60       # 设过期
TTL key             # 剩余时间
FLUSHDB             # 清空当前库（小心！）

# String
SET key value
GET key
INCR key
INCRBY key 5

# List
LPUSH key v1 v2
RPUSH key v1
LPOP key
LRANGE key 0 -1

# Hash
HSET key field value
HGET key field
HGETALL key

# Set
SADD key v1 v2
SMEMBERS key
SINTER k1 k2

# Sorted Set
ZADD key score member
ZRANGE key 0 -1 WITHSCORES
ZREVRANGE key 0 9   # 前 10 名
```

---

## 九、踩坑记录

> 待实际使用后补充。预留几条常见坑方向：

- **坑1（预期）**：`KEYS *` 在生产阻塞 → 用 `SCAN` 替代。
- **坑2（预期）**：缓存与 DB 不一致 → 写 DB 后删缓存（而非更新缓存），或用延迟双删。
- **坑3（预期）**：大 key（如一个 Hash 存百万字段）→ 拆分或用 `HSCAN`。
- **坑4（预期）**：`decode_responses=False`（默认）导致返回 bytes，字符串拼接报错。

---

## 十、相关链接

- 官方文档：https://redis.io/docs/
- redis-py 文档：https://redis-py.readthedocs.io/
- 本项目 `backend/FastAPI学习笔记.md`（联动示例）
- 本项目 `技术工具学习索引.md`
