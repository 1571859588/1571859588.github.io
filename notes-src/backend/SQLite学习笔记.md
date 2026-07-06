# SQLite 学习笔记：最轻量的数据库，从命令行到 Python 实战

> 更新时间：2026-06-28 | 适用版本：SQLite 3.x / Python 内置 sqlite3

---

## 一、SQLite 是什么？

**一句话概括**：SQLite 是一个**不需要安装、不需要服务器**的数据库，整个数据库就是一个 `.db` 文件。

### 类比理解

| 概念 | 类比 |
|------|------|
| **Excel 文件** | 一个 `.xlsx` 文件，用 Excel 软件打开就能编辑，不需要联网 |
| **SQLite 数据库** | 一个 `.db` 文件，用 SQL 语言操作，不需要数据库服务器 |
| **MySQL/PostgreSQL** | 像企业级 ERP 系统，需要专门安装服务器软件、配置端口、管理用户 |

```
传统数据库架构：
  你的程序 → 网络 → MySQL服务器进程 → 磁盘文件

SQLite 架构：
  你的程序 → SQLite库 → 直接读写 .db 文件
```

就这么简单——SQLite 把"数据库服务器"这层直接干掉了，变成了程序里的一个库（library）。

---

## 二、什么时候用 SQLite？什么时候用 MySQL/PostgreSQL？

### ✅ 适合用 SQLite 的场景

| 场景 | 原因 |
|------|------|
| **小型应用**（个人博客、工具脚本） | 零配置，一个文件搞定 |
| **原型开发 / Demo** | 快速验证想法，不需要搭环境 |
| **嵌入式设备**（手机 App、IoT） | Android/iOS 内置 SQLite |
| **自动化测试** | 每次测试用全新数据库文件，干净隔离 |
| **数据分析**（中等规模数据） | 配合 Pandas 非常方便 |
| **配置文件存储** | 比 JSON/YAML 更结构化，支持查询 |

### ❌ 不适合用 SQLite 的场景

| 场景 | 原因 |
|------|------|
| **高并发写入**（电商、社交） | SQLite 同一时刻只允许一个写操作 |
| **多服务器分布式部署** | 文件无法跨服务器共享 |
| **超大数据量**（TB 级） | 理论上限 281TB，但实际性能会下降 |
| **需要细粒度权限管理** | SQLite 没有用户/权限系统 |

> **记忆口诀**：单机小量用 SQLite，并发大量上 MySQL。

---

## 三、安装与工具

### 3.1 Python 内置（零安装！）

```python
import sqlite3
print(sqlite3.sqlite_version)  # 例如：3.45.1
```

Python 自带 `sqlite3` 模块，不需要 `pip install` 任何东西。

### 3.2 命令行工具

**Windows**：从 https://sqlite.org/download.html 下载 `sqlite-tools-win32` 解压即可。

**macOS / Linux**：通常已预装，终端输入：
```bash
sqlite3 --version
```

### 3.3 图形化工具（强烈推荐）

**DB Browser for SQLite**（免费开源）：https://sqlitebrowser.org/

功能：
- 可视化建表、编辑数据
- 写 SQL 有自动补全
- 可以导入/导出 CSV
- 适合初学者理解表结构

---

## 四、核心 SQL 操作（命令行实战）

### 4.1 创建数据库和表

```bash
# 启动 sqlite3 并创建数据库文件
sqlite3 my_database.db
```

```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

> **注意**：`INTEGER PRIMARY KEY` 在 SQLite 中会自动递增（相当于 MySQL 的 AUTO_INCREMENT），加上 `AUTOINCREMENT` 关键字可以防止 ID 被复用。

### 4.2 INSERT — 插入数据

```sql
-- 插入单条
INSERT INTO users (name, email, age) VALUES ('张三', 'zhangsan@example.com', 28);

-- 插入多条
INSERT INTO users (name, email, age) VALUES
    ('李四', 'lisi@example.com', 25),
    ('王五', 'wangwu@example.com', 32),
    ('赵六', 'zhaoliu@example.com', 22);

-- 插入订单
INSERT INTO orders (user_id, product, amount) VALUES
    (1, 'Python 教程', 59.9),
    (1, '机械键盘', 399.0),
    (2, '显示器', 1299.0),
    (3, 'Python 教程', 59.9);
```

### 4.3 SELECT — 查询数据

```sql
-- 查询所有用户
SELECT * FROM users;

-- 条件查询：年龄大于 25
SELECT name, age FROM users WHERE age > 25;

-- 模糊查询：名字包含"三"
SELECT * FROM users WHERE name LIKE '%三%';

-- 排序：按年龄降序
SELECT name, age FROM users ORDER BY age DESC;

-- 限制结果数量
SELECT * FROM users ORDER BY age DESC LIMIT 3;

-- 分页（OFFSET）
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;  -- 第3页，每页10条
```

### 4.4 UPDATE — 更新数据

```sql
-- 更新单个用户
UPDATE users SET age = 29 WHERE name = '张三';

-- 批量更新（小心！不加 WHERE 会更新全部）
UPDATE users SET age = age + 1;  -- 所有人年龄+1
```

### 4.5 DELETE — 删除数据

```sql
-- 删除指定用户
DELETE FROM users WHERE name = '赵六';

-- ⚠️ 危险操作：删除所有数据（表还在）
DELETE FROM users;

-- ⚠️ 更危险：连表一起删除
DROP TABLE users;
```

### 4.6 JOIN — 多表关联查询

```sql
-- 查询每个用户的订单
SELECT users.name, orders.product, orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- 查询结果示例：
-- 张三 | Python 教程 | 59.9
-- 张三 | 机械键盘    | 399.0
-- 李四 | 显示器      | 1299.0
-- 王五 | Python 教程 | 59.9
```

### 4.7 GROUP BY — 分组统计

```sql
-- 每个用户的订单总金额
SELECT users.name, SUM(orders.amount) AS total_spent, COUNT(orders.id) AS order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.id
HAVING total_spent > 0
ORDER BY total_spent DESC;

-- 结果：
-- 张三 | 458.9 | 2
-- 李四 | 1299.0 | 1
-- 王五 | 59.9 | 1
```

### 4.8 创建索引 — 提升查询速度

```sql
-- 给 email 字段创建唯一索引（加速 WHERE email = ? 查询）
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 给常用查询字段创建索引
CREATE INDEX idx_users_age ON users(age);

-- 复合索引（覆盖多列查询）
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);

-- 查看表的索引
.indexes users
```

> **索引类比**：索引就像书的目录。没有索引时，找内容要一页页翻（全表扫描）；有了索引，直接看目录跳到对应页。但索引也有代价——每次写入都要更新目录，所以不要给每个字段都建索引。

---

## 五、Python sqlite3 模块完整实战

### 5.1 基础连接与操作

```python
import sqlite3

# 1. 连接数据库（文件不存在会自动创建）
conn = sqlite3.connect('example.db')

# 2. 创建游标对象（用来执行 SQL）
cursor = conn.cursor()

# 3. 执行 SQL
cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score REAL
    )
''')

# 4. 提交事务（重要！不提交数据不会保存）
conn.commit()

# 5. 关闭连接
conn.close()
```

### 5.2 使用上下文管理器（推荐写法）

```python
import sqlite3

# with 语句会自动 commit（成功时）或 rollback（出错时）
with sqlite3.connect('example.db') as conn:
    cursor = conn.cursor()
    cursor.execute("INSERT INTO students (name, score) VALUES (?, ?)", ('小明', 95.5))
    # 不需要手动 commit，with 会处理
```

> ⚠️ **注意**：`with sqlite3.connect(...)` 管理的是**事务**，不是连接！连接不会自动关闭。如果要自动关闭连接，用 `contextlib.closing`。

```python
from contextlib import closing

with closing(sqlite3.connect('example.db')) as conn:
    with conn:  # 管理事务
        cursor = conn.cursor()
        cursor.execute("INSERT INTO students (name, score) VALUES (?, ?)", ('小红', 88.0))
    # conn 会自动关闭
```

### 5.3 参数化查询（防止 SQL 注入！）

```python
import sqlite3

# ❌ 错误示范：字符串拼接（SQL 注入风险！）
user_input = "'; DROP TABLE students; --"
cursor.execute(f"SELECT * FROM students WHERE name = '{user_input}'")
# 这会删掉整个表！

# ✅ 正确写法：参数化查询（用 ? 占位符）
cursor.execute("SELECT * FROM students WHERE name = ?", (user_input,))
# SQLite 会自动转义特殊字符，安全！

# ✅ 也可以用命名参数
cursor.execute("SELECT * FROM students WHERE name = :name AND score > :min_score",
               {'name': '小明', 'min_score': 60})
```

### 5.4 完整 CRUD 示例

```python
"""
SQLite 完整 CRUD（增删改查）示例
"""
import sqlite3
from contextlib import closing


def init_db(db_path='crud_demo.db'):
    """初始化数据库，创建表"""
    with closing(sqlite3.connect(db_path)) as conn:
        with conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price REAL NOT NULL,
                    stock INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')


def create_product(conn, name, price, stock=0):
    """C - Create：新增商品"""
    cursor = conn.execute(
        "INSERT INTO products (name, price, stock) VALUES (?, ?, ?)",
        (name, price, stock)
    )
    return cursor.lastrowid  # 返回新插入的 ID


def read_products(conn, min_price=None):
    """R - Read：查询商品"""
    if min_price is not None:
        cursor = conn.execute(
            "SELECT * FROM products WHERE price >= ? ORDER BY price",
            (min_price,)
        )
    else:
        cursor = conn.execute("SELECT * FROM products ORDER BY id")

    # 设置 Row factory，让结果可以用列名访问
    cursor.row_factory = sqlite3.Row
    return cursor.fetchall()


def update_stock(conn, product_id, new_stock):
    """U - Update：更新库存"""
    conn.execute(
        "UPDATE products SET stock = ? WHERE id = ?",
        (new_stock, product_id)
    )


def delete_product(conn, product_id):
    """D - Delete：删除商品"""
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))


# ---- 使用示例 ----
if __name__ == '__main__':
    db = 'crud_demo.db'
    init_db(db)

    with closing(sqlite3.connect(db)) as conn:
        with conn:
            # 新增
            id1 = create_product(conn, 'Python 从入门到放弃', 69.9, 100)
            id2 = create_product(conn, '机械键盘 Cherry 红轴', 599.0, 50)
            id3 = create_product(conn, '降噪耳机', 1299.0, 30)
            print(f"新增商品 ID: {id1}, {id2}, {id3}")

            # 查询
            conn.row_factory = sqlite3.Row
            products = read_products(conn)
            print("\n所有商品：")
            for p in products:
                print(f"  {p['id']} | {p['name']} | ¥{p['price']} | 库存:{p['stock']}")

            # 更新
            update_stock(conn, id1, 80)
            print(f"\n更新商品 {id1} 库存为 80")

            # 删除
            delete_product(conn, id3)
            print(f"删除商品 {id3}")

            # 再次查询（价格 >= 100 的）
            expensive = read_products(conn, min_price=100)
            print(f"\n价格 >= 100 的商品：{len(expensive)} 个")
```

### 5.5 Row Factory（让查询结果更好用）

```python
import sqlite3

conn = sqlite3.connect('example.db')

# 默认：返回 tuple，只能通过索引访问
cursor = conn.execute("SELECT * FROM students")
row = cursor.fetchone()
print(row[0], row[1])  # 不直观

# 设置 row_factory 为 sqlite3.Row：可以用列名访问
conn.row_factory = sqlite3.Row
cursor = conn.execute("SELECT * FROM students")
row = cursor.fetchone()
print(row['name'], row['score'])  # 清晰多了！
```

---

## 六、SQLite 在 Web 框架中的使用

### 6.1 Flask + SQLAlchemy

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# SQLite 数据库文件路径（相对于项目根目录）
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'


# 创建表
with app.app_context():
    db.create_all()
```

### 6.2 FastAPI + SQLAlchemy

```python
from fastapi import FastAPI, Depends
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# 连接 SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 特有参数！
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)


# 创建表
Base.metadata.create_all(bind=engine)

app = FastAPI()


# 依赖注入：获取数据库 session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/users")
def read_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@app.post("/users")
def create_user(name: str, email: str, db: Session = Depends(get_db)):
    user = User(name=name, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

> **重点**：`check_same_thread=False` 是 SQLite 在 Web 框架中必须设置的参数，因为 Web 服务器会在不同线程中处理请求，而 SQLite 默认不允许跨线程使用同一个连接。

---

## 七、进阶：Limitations & 避坑指南

### 7.1 写锁问题（最常被问到的坑）

```
问题：SQLite 在默认模式（Journal Mode = DELETE）下，
      写操作会锁住整个数据库文件！

  进程A: BEGIN; INSERT INTO ... → 拿到写锁
  进程B: SELECT * FROM users    → 被阻塞！等待...
  进程C: INSERT INTO ...        → 被阻塞！等待...
```

**解决方案：开启 WAL 模式**

```sql
-- 在 sqlite3 命令行中
PRAGMA journal_mode=WAL;
```

```python
# 在 Python 中
conn = sqlite3.connect('my.db')
conn.execute('PRAGMA journal_mode=WAL')
```

```
WAL 模式的好处：
  - 读写可以同时进行（读不阻塞写，写不阻塞读）
  - 只有"写和写"之间互斥
  - 性能提升明显（尤其是读多写少的场景）

WAL 模式的代价：
  - 会多出 .db-wal 和 .db-shm 两个辅助文件
  - 不支持 NFS 网络文件系统
```

### 7.2 ALTER TABLE 的限制

```sql
-- SQLite 支持的 ALTER TABLE 操作（很有限）：
ALTER TABLE users ADD COLUMN phone TEXT;        -- ✅ 可以加列
ALTER TABLE users RENAME TO old_users;           -- ✅ 可以重命名表
ALTER TABLE users RENAME COLUMN name TO full_name; -- ✅ 可以重命名列（3.25+）

-- SQLite 不支持的（需要重建表）：
-- ALTER TABLE users DROP COLUMN age;            -- ❌ 不能删列（3.35+ 才支持）
-- ALTER TABLE users ALTER COLUMN age TEXT;      -- ❌ 不能修改列类型
-- ALTER TABLE users ADD CONSTRAINT ...          -- ❌ 不能加约束
```

**变通方案：重建表**

```sql
-- 步骤 1：创建新表
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL
    -- 去掉了 age 列
);

-- 步骤 2：复制数据
INSERT INTO users_new SELECT id, name, email FROM users;

-- 步骤 3：删除旧表
DROP TABLE users;

-- 步骤 4：重命名新表
ALTER TABLE users_new RENAME TO users;
```

### 7.3 文件权限

```bash
# SQLite 需要对 .db 文件及其所在目录有读写权限
# Linux/Mac 下注意：
chmod 664 my_database.db      # 文件权限
chmod 775 /path/to/db_dir/    # 目录也要有权限（SQLite 要创建 journal 文件）

# Docker 容器中常见问题：确保容器内用户对挂载目录有写权限
```

### 7.4 其他常见坑

| 坑 | 说明 | 解决方案 |
|----|------|----------|
| **类型系统宽松** | `age` 列定义为 INTEGER，但 SQLite 允许插入字符串 | 用 `CHECK` 约束或应用层校验 |
| **日期时间** | SQLite 没有 DATETIME 类型，存的是字符串 | 用 ISO 8601 格式：`2026-06-28 10:00:00` |
| **布尔值** | 没有 BOOLEAN 类型 | 用 0/1 表示 False/True |
| **连接不关闭** | 忘记 `conn.close()` 导致文件被锁 | 始终使用 `with closing(...)` |
| **并发写入** | 多线程同时写入报错 | WAL 模式 + 连接池 / 写队列 |

---

## 八、面试回答

### Q1：请介绍一下 SQLite 的特点和适用场景

> **参考回答**：
>
> SQLite 是一个嵌入式关系数据库，它的核心特点是**无需服务器进程**——整个数据库就是一个普通文件，通过 SQLite 库直接读写。
>
> **主要特点**：
> 1. **零配置**：不需要安装、不需要配置端口或用户权限
> 2. **单文件**：一个 `.db` 文件就是完整数据库，便于备份和迁移
> 3. **跨平台**：Windows、Linux、macOS、Android、iOS 全支持
> 4. **标准 SQL**：支持大部分 SQL-92 标准
> 5. **ACID 事务**：保证数据一致性
>
> **适用场景**：移动 App（Android/iOS 内置）、桌面应用（如 Chrome 存书签）、小型 Web 应用（配合 Flask/FastAPI）、原型开发、自动化测试、嵌入式设备。
>
> **不适用场景**：高并发写入（如电商秒杀）、多服务器分布式部署、需要细粒度权限控制的场景。这些情况下应该选择 MySQL 或 PostgreSQL。

### Q2：Python 中如何防止 SQL 注入？

> **参考回答**：
>
> SQL 注入是攻击者通过构造恶意输入，改变 SQL 语句的逻辑。比如：
>
> ```python
> # 危险！
> query = f"SELECT * FROM users WHERE name = '{user_input}'"
> # 如果 user_input = "' OR '1'='1"，查询变成：
> # SELECT * FROM users WHERE name = '' OR '1'='1'
> # 这会返回所有用户！
> ```
>
> **防护方法**是使用**参数化查询**（Parameterized Query）：
>
> ```python
> # 安全！SQLite 驱动会自动转义参数
> cursor.execute("SELECT * FROM users WHERE name = ?", (user_input,))
> ```
>
> 原理是：SQL 语句和参数是分开传递给数据库引擎的，引擎先解析 SQL 结构，再把参数填入，所以恶意输入无法改变 SQL 的语义。这在所有数据库（MySQL、PostgreSQL 等）中都适用，不仅限于 SQLite。

### Q3：SQLite 的写性能瓶颈怎么解决？

> **参考回答**：
>
> SQLite 默认的日志模式（Journal Mode = DELETE）下，写操作会对整个数据库文件加排他锁，导致同一时刻只能有一个写操作，读操作也会被写操作阻塞。
>
> **解决方案**：
> 1. **开启 WAL 模式**（Write-Ahead Logging）：`PRAGMA journal_mode=WAL`。WAL 允许读写并发——读操作不阻塞写操作，写操作不阻塞读操作，只有写和写之间互斥。性能可以提升数倍。
> 2. **合并写入**：把多条 INSERT 放在一个事务里（`BEGIN ... COMMIT`），减少锁竞争次数。一次批量插入 1000 条比 1000 次单独插入快 100 倍。
> 3. **写队列**：用一个单独的线程/进程负责所有写操作，其他线程只读。
> 4. **读写分离**：主库负责写，通过 WAL 或复制到只读副本负责读。
>
> 如果这些方案仍不够，说明已经到达 SQLite 的天花板，应该迁移到 MySQL/PostgreSQL。

---

## 九、深入追问

### 追问 1：WAL 模式的底层原理是什么？

**WAL（Write-Ahead Logging）的核心思想**：

```
传统模式（Rollback Journal）：
  写入时 → 先备份原始数据到 .db-journal → 修改 .db 文件 → 删掉 journal
  读取时 → 如果数据库被锁，等待

WAL 模式：
  写入时 → 新数据追加到 .db-wal 文件（不动原文件）→ checkpoint 时合并回 .db
  读取时 → 同时看 .db 和 .db-wal，WAL 中的数据优先级更高

关键：读操作不需要等写操作完成，因为写的是 WAL 文件，不是原文件。
```

**Checkpoint 机制**：WAL 文件会不断增长，需要定期把 WAL 中的数据合并回主数据库文件（checkpoint）。SQLite 会在 WAL 达到一定大小（默认 1000 页）时自动触发 checkpoint。

```python
# 手动触发 checkpoint
conn.execute("PRAGMA wal_checkpoint")       # PASSIVE（默认）
conn.execute("PRAGMA wal_checkpoint(FULL)")  # 等待所有读写完成
conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")  # 截断 WAL 文件
```

### 追问 2：SQL 注入有哪些高级形式？

除了经典的 `' OR '1'='1`，还有：

```python
# 1. 联合查询注入（UNION 注入）
# 输入：' UNION SELECT username, password FROM admin_users --
# 拼接后：SELECT name, email FROM users WHERE name = '' UNION SELECT username, password FROM admin_users --'

# 2. 时间盲注（Time-based Blind）
# 输入：' ; SELECT CASE WHEN (SELECT password FROM admin WHERE id=1) LIKE 'a%' THEN sqlite3_sleep(5000) ELSE 1 END --
# 通过响应时间判断密码首字母

# 3. 二次注入（Stored）
# 第一步：注册时用户名为 admin'--（存入数据库）
# 第二步：修改密码时 UPDATE users SET password='new' WHERE name='admin'--'
# -- 后面的内容被注释掉，变成了修改 admin 的密码
```

**终极防护**：永远用参数化查询，永远不拼接 SQL 字符串。ORM（如 SQLAlchemy）内部自动使用参数化，也能有效防护。

### 追问 3：SQLite 需要连接池吗？

```python
# SQLite 不像 MySQL 那样需要传统连接池，原因：
# 1. SQLite 连接本质上就是打开一个文件，开销极小
# 2. SQLite 的连接是进程级别的，不支持跨进程共享

# 但在多线程 Web 应用中，仍然建议：
import sqlite3
from queue import Queue

class SQLiteConnectionPool:
    """简单的 SQLite 连接池"""
    def __init__(self, db_path, pool_size=5):
        self.pool = Queue(maxsize=pool_size)
        for _ in range(pool_size):
            conn = sqlite3.connect(db_path, check_same_thread=False)
            conn.execute('PRAGMA journal_mode=WAL')
            self.pool.put(conn)

    def get_connection(self):
        return self.pool.get()

    def return_connection(self, conn):
        self.pool.put(conn)

# 使用
pool = SQLiteConnectionPool('app.db', pool_size=5)
conn = pool.get_connection()
try:
    cursor = conn.execute("SELECT * FROM users")
    results = cursor.fetchall()
finally:
    pool.return_connection(conn)
```

> **实际建议**：对于 FastAPI/Flask 项目，用 SQLAlchemy 的连接池即可（它会自动管理 SQLite 连接）。不需要手写连接池。

---

## 十、易混淆点

### 10.1 SQLite vs MySQL 核心区别

| 对比项 | SQLite | MySQL |
|--------|--------|-------|
| **架构** | 库（Library），嵌入程序中 | 服务器（Server），独立进程 |
| **安装** | 不需要安装 | 需要安装 MySQL Server |
| **数据存储** | 单个 `.db` 文件 | 数据目录，多文件管理 |
| **并发写入** | 默认只允许一个写者 | 支持多写者（行级锁） |
| **用户权限** | 无（文件权限控制） | 完善的用户/权限系统 |
| **数据类型** | 动态类型（弱类型） | 静态类型（强类型） |
| **ALTER TABLE** | 功能有限 | 功能完整 |
| **网络访问** | 不支持（本地文件） | 支持 TCP/IP 远程连接 |
| **存储过程** | 不支持 | 支持 |
| **全文搜索** | FTS5 扩展（很好用！） | FULLTEXT 索引 |

### 10.2 ORM vs 原生 SQL

```python
# ORM 方式（SQLAlchemy）
user = session.query(User).filter(User.name == '张三').first()

# 原生 SQL
cursor = conn.execute("SELECT * FROM users WHERE name = ?", ('张三',))
user = cursor.fetchone()
```

| 对比 | ORM | 原生 SQL |
|------|-----|----------|
| **开发速度** | 快（Python 对象操作） | 慢（手写 SQL） |
| **性能** | 有额外开销 | 直接执行，更快 |
| **学习成本** | 需要学 ORM 框架 | 需要学 SQL |
| **复杂查询** | ORM 表达力有限 | SQL 可以写任意复杂 |
| **可维护性** | 高（代码即文档） | 低（SQL 散落在各处） |

> **建议**：简单操作用 ORM，复杂查询/性能敏感场景用原生 SQL。两者可以混用。

### 10.3 同步 vs 异步

```python
# 同步（sqlite3 标准库）
import sqlite3
conn = sqlite3.connect('app.db')
result = conn.execute("SELECT * FROM users").fetchall()

# 异步（aiosqlite，用于 FastAPI 等异步框架）
import aiosqlite
async with aiosqlite.connect('app.db') as db:
    async with db.execute("SELECT * FROM users") as cursor:
        result = await cursor.fetchall()
```

> **关键点**：`sqlite3` 标准库是同步的，在 `async def` 中使用会阻塞事件循环！异步场景要用 `aiosqlite`（底层是用线程池包装的同步调用）。

---

## 十一、实用技巧汇总

### 11.1 内存数据库（测试神器）

```python
import sqlite3

# 使用 :memory: 创建内存数据库——速度极快，程序结束自动消失
conn = sqlite3.connect(':memory:')
conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)")
conn.execute("INSERT INTO test VALUES (1, 'hello')")
result = conn.execute("SELECT * FROM test").fetchall()
print(result)  # [(1, 'hello')]
# 关闭连接后数据消失
```

### 11.2 批量插入优化

```python
import sqlite3

conn = sqlite3.connect('demo.db')

# ❌ 慢：逐条插入（每条都是一个事务）
for i in range(10000):
    conn.execute("INSERT INTO data (value) VALUES (?)", (i,))
conn.commit()  # 约 30 秒

# ✅ 快：一个事务批量插入
conn.execute("BEGIN")
for i in range(10000):
    conn.execute("INSERT INTO data (value) VALUES (?)", (i,))
conn.execute("COMMIT")  # 约 0.1 秒

# ✅✅ 最快：使用 executemany
data = [(i,) for i in range(10000)]
conn.executemany("INSERT INTO data (value) VALUES (?)", data)
conn.commit()  # 约 0.05 秒
```

### 11.3 常用 PRAGMA 设置

```python
conn = sqlite3.connect('app.db')

# 开启 WAL 模式（读写并发）
conn.execute('PRAGMA journal_mode=WAL')

# 设置缓存大小（单位：页数，默认 2000，增大可提升性能）
conn.execute('PRAGMA cache_size=-64000')  # 64MB 缓存

# 开启外键约束（默认关闭！）
conn.execute('PRAGMA foreign_keys=ON')

# 设置同步模式（NORMAL 比 FULL 快，配合 WAL 足够安全）
conn.execute('PRAGMA synchronous=NORMAL')

# 查看当前设置
print(conn.execute('PRAGMA journal_mode').fetchone())
print(conn.execute('PRAGMA cache_size').fetchone())
```

### 11.4 SQLite 全文搜索（FTS5）

```python
import sqlite3

conn = sqlite3.connect('search_demo.db')

# 创建全文搜索虚拟表
conn.execute('''
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts
    USING fts5(title, content)
''')

# 插入数据
conn.execute("INSERT INTO articles_fts (title, content) VALUES (?, ?)",
             ('Python 入门', 'Python 是一种简洁的编程语言'))
conn.execute("INSERT INTO articles_fts (title, content) VALUES (?, ?)",
             ('Java 入门', 'Java 是企业级开发的首选语言'))

# 全文搜索
results = conn.execute(
    "SELECT * FROM articles_fts WHERE articles_fts MATCH 'Python'"
).fetchall()
# 返回包含 "Python" 的所有文章
```

---

## 十二、快速参考卡片

```
┌──────────────────────────────────────────────────┐
│               SQLite 速查手册                      │
├──────────────────────────────────────────────────┤
│ 连接：  sqlite3.connect('file.db')               │
│ 内存：  sqlite3.connect(':memory:')              │
│ 游标：  conn.cursor()                            │
│ 执行：  cursor.execute(sql, params)              │
│ 提交：  conn.commit()                            │
│ 关闭：  conn.close()                             │
├──────────────────────────────────────────────────┤
│ 占位符：  ? 或 :name                             │
│ 插入ID： cursor.lastrowid                       │
│ 行工厂： conn.row_factory = sqlite3.Row          │
│ WAL：   PRAGMA journal_mode=WAL                  │
│ 外键：  PRAGMA foreign_keys=ON                   │
├──────────────────────────────────────────────────┤
│ CLI：   sqlite3 my.db                           │
│ 导出：  .dump > backup.sql                      │
│ 导入：  .read backup.sql                        │
│ CSV：  .mode csv && .import data.csv mytable    │
└──────────────────────────────────────────────────┘
```

---

> **学习路线建议**：先用 DB Browser 可视化操作理解表结构 → 在命令行练习 SQL 语句 → 用 Python 写 CRUD → 尝试在 Flask/FastAPI 项目中使用 → 学习 WAL、FTS5 等进阶功能。
