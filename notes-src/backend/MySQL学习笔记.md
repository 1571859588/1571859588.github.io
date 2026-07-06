# MySQL 学习笔记：从零搞懂最流行的关系型数据库

> 更新时间：2026-06-28 | 适用版本：MySQL 8.0+
> 状态：学习笔记（零基础入门版），踩坑记录待实际使用后补充
> 关联笔记：`backend/SQLite学习笔记.md`（同为关系型数据库，常做对比）

---

## 一、MySQL 是什么？

### 1.1 一句话解释

**MySQL** 是一个**客户端/服务器架构**的关系型数据库管理系统（RDBMS），数据以表格形式存储，用 SQL 语言操作。它是全球最流行的开源数据库，几乎所有 Web 项目的"标配"。

### 1.2 和 SQLite 的核心区别（你已学过 SQLite）

| 对比项 | SQLite | MySQL |
|--------|--------|-------|
| 架构 | 单文件 `.db`，无服务器 | **C/S 架构**：服务器进程 + 客户端连接 |
| 部署 | 装个库就能用 | 要装服务、配端口、建用户 |
| 并发 | 单写者锁全库 | **多用户并发读写**，行级锁 |
| 数据量 | 几 GB 内最佳 | 几 TB 都能扛 |
| 适用 | 单机、原型、嵌入式 | **Web 后端、生产系统** |
| 多人协作 | 不适合 | **天生为多人设计** |

```
SQLite 架构（单机）：           MySQL 架构（C/S）：
  程序 → SQLite库 → .db文件      程序 ─┐
                                      │ 网络（端口 3306）
                                      ▼
                                  ┌──────────┐    ┌──────────┐
                                  │ MySQL    │ →  │ 数据文件  │
                                  │ 服务器   │    │ (磁盘)    │
                                  └──────────┘    └──────────┘
                                       ▲
                                       │ 多个程序同时连
                                  另一个程序
```

**一句话记忆**：SQLite 像本地 Excel 文件，MySQL 像一个数据库服务，大家通过网络连进去用。

### 1.3 关键术语

| 术语 | 解释 |
|------|------|
| **数据库（Database/Schema）** | 一个 MySQL 实例下可以有多个库，库里有表 |
| **表（Table）** | 二维表格，由行（记录）和列（字段）组成 |
| **行（Row/Record）** | 一条数据 |
| **列（Column/Field）** | 一个字段，每列有固定数据类型 |
| **主键（Primary Key）** | 唯一标识一行的列，不重复、不为空 |
| **外键（Foreign Key）** | 引用别的表的主键，建立表间关系 |
| **索引（Index）** | 给某列建目录，加速查询 |
| **事务（Transaction）** | 一组操作要么全成功、要么全回滚 |

---

## 二、安装与连接

### 2.1 安装 MySQL 服务

**方式一：Docker（推荐，跨平台干净）**

```bash
docker run -d --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=your_password \
  mysql:8
```

**方式二：Windows 安装包**

下载 MySQL Installer（https://dev.mysql.com/downloads/installer/），选 Server only，一路下一步，记住 root 密码。

### 2.2 连接 MySQL

**命令行客户端：**

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p
# 输入密码后进入 mysql> 交互界面
```

参数说明：
- `-h` 主机（默认 127.0.0.1）
- `-P` 端口（默认 3306，注意大写 P）
- `-u` 用户名
- `-p` 密码（密码不要直接写在 -p 后面，会被历史记录看到）

**图形化客户端（更推荐日常用）：**
- **DBeaver**（免费、跨平台、支持多种数据库）
- **Navicat**（收费，功能强）
- **MySQL Workbench**（官方，免费）

### 2.3 Python 连接

```bash
uv pip install pymysql      # 或 pip install pymysql
```

```python
import pymysql

conn = pymysql.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="your_password",
    database="mydb",
    charset="utf8mb4",          # 必须用 utf8mb4，支持 emoji
    cursorclass=pymysql.cursors.DictCursor,   # 返回字典而非元组
)

with conn.cursor() as cur:
    cur.execute("SELECT id, name FROM users WHERE id = %s", (1,))
    row = cur.fetchone()
    print(row)        # {'id': 1, 'name': 'tom'}

conn.close()
```

> **注意 `%s` 占位符**：这是 pymysql 的参数化查询写法，**不是** Python 的 format，也不是 SQL 的 `?`。永远用这种方式传参，防 SQL 注入。

---

## 三、数据类型（最常用）

### 3.1 数值类型

| 类型 | 范围 | 用途 |
|------|------|------|
| `TINYINT` | -128~127（或 0~255 UNSIGNED） | 布尔值、状态码 |
| `INT` | ±21 亿 | 普通整数（主键常用 `INT UNSIGNED AUTO_INCREMENT`） |
| `BIGINT` | ±9.2×10¹⁸ | 大整数（雪花算法 ID、自增主键超大表） |
| `DECIMAL(10,2)` | 精确小数 | **金额必须用这个**，不能用 FLOAT |
| `FLOAT` / `DOUBLE` | 浮点数 | 科学计算，不用于金额 |

> **金额坑**：`FLOAT`/`DOUBLE` 是二进制浮点，有精度损失（`0.1+0.2 != 0.3`）。存钱一律用 `DECIMAL(10,2)` 表示总共 10 位、小数 2 位。

### 3.2 字符串类型

| 类型 | 说明 | 用途 |
|------|------|------|
| `CHAR(n)` | 定长 n 字符 | 固定长度编码（如 `CHAR(2)` 国家代码） |
| `VARCHAR(n)` | 变长，最多 n 字符 | **最常用**，姓名、标题、URL |
| `TEXT` | 大文本（最多 64KB） | 文章正文 |
| `LONGTEXT` | 超大文本（最多 4GB） | 长文档 |
| `ENUM('a','b')` | 枚举 | 固定几个值（状态） |

> **CHAR vs VARCHAR**：`CHAR(10)` 存 "tom" 也占 10 字符空间；`VARCHAR(10)` 只占 3+长度字节。绝大多数场景用 VARCHAR。

### 3.3 时间类型

| 类型 | 格式 | 用途 |
|------|------|------|
| `DATE` | `2026-06-28` | 只存日期 |
| `TIME` | `14:30:00` | 只存时间 |
| `DATETIME` | `2026-06-28 14:30:00` | **最常用**，存完整时间 |
| `TIMESTAMP` | 时间戳 | 自动更新（`ON UPDATE CURRENT_TIMESTAMP`） |

### 3.4 一张对照表：选型建议

| 要存什么 | 推荐类型 |
|----------|----------|
| 主键 ID | `BIGINT UNSIGNED AUTO_INCREMENT` |
| 用户名 | `VARCHAR(50)` |
| 邮箱 | `VARCHAR(100)` |
| 文章标题 | `VARCHAR(200)` |
| 文章正文 | `LONGTEXT` |
| 金额 | `DECIMAL(10,2)` |
| 创建时间 | `DATETIME DEFAULT CURRENT_TIMESTAMP` |
| 是否删除 | `TINYINT(1)`（0/1） |
| 状态枚举 | `TINYINT` 或 `ENUM` |

---

## 四、建表与约束

### 4.1 完整建表示例

```sql
CREATE TABLE users (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名',
    email       VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
    password    VARCHAR(100) NOT NULL COMMENT '加密后密码',
    age         TINYINT UNSIGNED,
    balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '余额',
    status      TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

**关键约束**：
- `PRIMARY KEY`：主键
- `NOT NULL`：非空
- `UNIQUE`：唯一
- `DEFAULT`：默认值
- `AUTO_INCREMENT`：自增
- `COMMENT`：字段注释（生产必加）

### 4.2 外键关联（表关系）

```sql
CREATE TABLE orders (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`ON DELETE CASCADE` 表示删用户时自动删其订单。其他选项：`RESTRICT`（禁止删，默认）、`SET NULL`（置空）。

### 4.3 存储引擎：InnoDB vs MyISAM

| | InnoDB（默认、推荐） | MyISAM（已淘汰） |
|--|--|--|
| 事务 | ✅ 支持 | ❌ 不支持 |
| 行级锁 | ✅ | ❌ 表级锁 |
| 外键 | ✅ | ❌ |
| 崩溃恢复 | ✅ | ❌ |

**永远用 InnoDB**，没有理由选 MyISAM。

---

## 五、CRUD 基本操作

### 5.1 增（INSERT）

```sql
-- 单条
INSERT INTO users (username, email, password) VALUES ('tom', 'tom@x.com', 'pwd123');

-- 多条
INSERT INTO users (username, email, password) VALUES
('tom', 'tom@x.com', 'pwd123'),
('jerry', 'jerry@x.com', 'pwd456'),
('alice', 'alice@x.com', 'pwd789');

-- 插入并返回自增 ID
INSERT INTO users (username, email, password) VALUES ('bob', 'bob@x.com', 'pwd');
-- LAST_INSERT_ID() 返回这条的 ID
```

### 5.2 查（SELECT）

```sql
-- 全部
SELECT * FROM users;

-- 指定列
SELECT id, username, email FROM users;

-- 条件
SELECT * FROM users WHERE age >= 18 AND status = 1;
SELECT * FROM users WHERE username IN ('tom', 'jerry');
SELECT * FROM users WHERE email LIKE '%@gmail.com';     -- 模糊匹配
SELECT * FROM users WHERE created_at >= '2026-01-01';

-- 排序 + 分页
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;   -- 第 3 页（每页 10）
-- 简写：LIMIT 20, 10（偏移, 数量）
```

### 5.3 改（UPDATE）

```sql
UPDATE users SET age = 25, balance = 100.50 WHERE id = 1;
```

> **⚠️ 永远带 WHERE**：不带 `WHERE` 会更新全表！删改前先 SELECT 确认范围。

### 5.4 删（DELETE）

```sql
DELETE FROM users WHERE id = 1;

-- 软删除（推荐，不真删）
UPDATE users SET status = 0 WHERE id = 1;
```

> 生产环境**别用 DELETE 硬删**，用软删除（加 `deleted_at` 字段或改 status）。硬删丢数据且难恢复。

### 5.5 聚合与分组

```sql
-- 总数
SELECT COUNT(*) FROM users WHERE status = 1;

-- 按状态分组统计
SELECT status, COUNT(*) AS cnt FROM users GROUP BY status;

-- 平均年龄
SELECT AVG(age) FROM users;

-- 余额前 3
SELECT username, balance FROM users ORDER BY balance DESC LIMIT 3;
```

---

## 六、JOIN：多表关联（重点）

### 6.1 四种 JOIN

```
users 表            orders 表
┌────┬────────┐    ┌────┬─────────┬────────┐
│ id │ name   │    │ id │ user_id │ amount │
├────┼────────┤    ├────┼─────────┼────────┤
│  1 │ tom    │    │ 10 │    1    │  100   │
│  2 │ jerry  │    │ 11 │    1    │  200   │
│  3 │ alice  │    │ 12 │    2    │  50    │
└────┴────────┘    └────┴─────────┴────────┘
                       （alice 没有订单）
```

| JOIN 类型 | 结果 | 示例结果 |
|-----------|------|----------|
| **INNER JOIN** | 只取两边都有的 | tom、jerry |
| **LEFT JOIN** | 左表全要，右表没就 NULL | tom、jerry、alice(NULL) |
| **RIGHT JOIN** | 右表全要 | 同 LEFT 但方向反 |
| **FULL JOIN** | 两边全要 | MySQL 不支持，用 UNION 模拟 |

### 6.2 实战写法

```sql
-- 查每个用户的订单总额
SELECT u.username, SUM(o.amount) AS total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY total DESC;

-- 查有下过单的用户（INNER）
SELECT DISTINCT u.username
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**JOIN 记忆口诀**：`ON` 是连接条件，`WHERE` 是过滤结果。LEFT JOIN 想过滤右表用 `WHERE`，想过滤左表用 `AND`（写在 ON 后）。

---

## 七、索引（性能关键）

### 7.1 为什么需要索引

没索引时，`WHERE username = 'tom'` 要**全表扫描**（一行行比对），表大就慢。加了索引就像字典有拼音目录，能直接定位。

### 7.2 创建索引

```sql
-- 建表时
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(100),
    INDEX idx_email (email)            -- 普通索引
);

-- 已有表加索引
CREATE INDEX idx_email ON users(email);
CREATE UNIQUE INDEX uk_email ON users(email);    -- 唯一索引

-- 复合索引（最常用，注意顺序）
CREATE INDEX idx_status_created ON users(status, created_at);
```

### 7.3 索引使用原则

| 原则 | 说明 |
|------|------|
| **查询条件字段加索引** | WHERE、JOIN ON、ORDER BY 涉及的列 |
| **复合索引最左前缀** | `INDEX(a,b,c)` 能用于 `WHERE a=?`、`WHERE a=? AND b=?`，不能用于 `WHERE b=?` |
| **索引不是越多越好** | 写入要更新索引，变慢 |
| **小表不用索引** | 全表扫比走索引还快 |
| **EXPLAIN 看执行计划** | `EXPLAIN SELECT ...` 看是否走索引 |

```sql
EXPLAIN SELECT * FROM users WHERE email = 'tom@x.com';
-- 看 type 列：const/ref > range > index > ALL（全表扫，最差）
```

### 7.4 索引失效的常见场景

- `LIKE '%xxx'`（左模糊）→ 索引失效
- 函数包裹列：`WHERE YEAR(created_at) = 2026` → 改 `WHERE created_at >= '2026-01-01'`
- 隐式类型转换：列是字符串但传了数字
- `OR` 两边不全有索引

---

## 八、事务（ACID）

### 8.1 事务是什么

**事务**是一组操作，要么全成功提交，要么全回滚撤销。经典例子：转账，A 扣钱和 B 加钱必须同时成功。

**ACID 特性**：
- **A**tomicity 原子性：全成功或全回滚
- **C**onsistency 一致性：数据始终合法
- **I**solation 隔离性：并发事务互不干扰
- **D**urability 持久性：提交后落盘不丢

### 8.2 手动事务

```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

-- 检查没问题
COMMIT;
-- 出问题
-- ROLLBACK;
```

### 8.3 Python 中用事务

```python
conn = pymysql.connect(...)
try:
    with conn.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = balance - 100 WHERE user_id = 1")
        cur.execute("UPDATE accounts SET balance = balance + 100 WHERE user_id = 2")
    conn.commit()           # 提交
except Exception as e:
    conn.rollback()         # 回滚
    raise
finally:
    conn.close()
```

### 8.4 四种隔离级别

| 级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|------|------|------------|------|------|
| READ UNCOMMITTED | ✅ | ✅ | ✅ | 最高 |
| READ COMMITTED（Oracle 默认） | ❌ | ✅ | ✅ | 高 |
| **REPEATABLE READ（MySQL 默认）** | ❌ | ❌ | ❌* | 中 |
| SERIALIZABLE | ❌ | ❌ | ❌ | 低 |

MySQL 的 RR 级别用 MVCC + 间隙锁基本解决了幻读。绝大多数业务用默认 RR 即可。

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

---

## 九、用户与权限

```sql
-- 创建用户
CREATE USER 'appuser'@'%' IDENTIFIED BY 'password123';
-- 'appuser'@'%' 表示从任意主机连；@'localhost' 只能本机

-- 授权
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'%';
GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'%';      -- 全部权限
FLUSH PRIVILEGES;                                      -- 刷新

-- 查看权限
SHOW GRANTS FOR 'appuser'@'%';

-- 撤销
REVOKE DELETE ON mydb.* FROM 'appuser'@'%';

-- 删用户
DROP USER 'appuser'@'%';
```

> **生产原则**：root 只用于管理，应用用一个权限受限的账号（只给 CRUD，不给 DROP/ALTER）。

---

## 十、备份与恢复

```bash
# 备份整个库
mysqldump -u root -p mydb > backup.sql

# 备份所有库
mysqldump -u root -p --all-databases > all.sql

# 恢复
mysql -u root -p mydb < backup.sql

# 只备份结构（不要数据）
mysqldump -u root -p --no-data mydb > schema.sql
```

---

## 十一、常用命令速查表

```sql
-- 库操作
SHOW DATABASES;
CREATE DATABASE mydb CHARACTER SET utf8mb4;
USE mydb;
DROP DATABASE mydb;

-- 表操作
SHOW TABLES;
DESC users;                          -- 查看表结构
SHOW CREATE TABLE users;             -- 查看建表语句
DROP TABLE users;
ALTER TABLE users ADD COLUMN phone VARCHAR(20);   -- 加列
ALTER TABLE users DROP COLUMN phone;              -- 删列
ALTER TABLE users MODIFY age INT;                 -- 改类型

-- 数据
SELECT * FROM users LIMIT 10;
SELECT COUNT(*) FROM users;
SELECT DISTINCT status FROM users;

-- 索引
SHOW INDEX FROM users;
DROP INDEX idx_email ON users;

-- 事务
START TRANSACTION;
COMMIT;
ROLLBACK;

-- 执行计划
EXPLAIN SELECT * FROM users WHERE id = 1;
```

---

## 十二、踩坑记录

> 待实际使用后补充。预留常见坑方向：

- **坑1（预期）**：乱码 → 库/表/连接都要 `utf8mb4`（不是 `utf8`，MySQL 的 `utf8` 是阉割版只支持 3 字节，存 emoji 会报错）。
- **坑2（预期）**：金额用 FLOAT 导致精度丢失 → 一律 DECIMAL。
- **坑3（预期）**：UPDATE/DELETE 忘带 WHERE → 全表被改/被删。生产环境养成"先 SELECT 再改"的习惯。
- **坑4（预期）**：索引失效 → 用 EXPLAIN 检查，注意最左前缀和隐式转换。
- **坑5（预期）**：时区问题 → 连接串设 `serverTimezone` 或用 UTC 存储。
- **坑6（预期）**：慢查询 → 开慢查询日志 `slow_query_log = ON`，`long_query_time = 1`。

---

## 十三、与 SQLite 选型决策

```
你的场景？
│
├─ 单机、原型、嵌入式、测试 ──→ SQLite
├─ 多人并发、Web 后端、生产 ──→ MySQL
├─ 复杂查询、JSON 操作、扩展性 ──→ PostgreSQL
└─ 缓存、排行榜、消息队列 ──→ Redis（不是关系型）
```

---

## 十四、相关链接

- 官方文档：https://dev.mysql.com/doc/
- 本项目 `backend/SQLite学习笔记.md`（对比参考）
- 本项目 `backend/Redis学习笔记.md`（缓存层）
- 本项目 `backend/FastAPI学习笔记.md`（后端联动）
- 本项目 `技术工具学习索引.md`
