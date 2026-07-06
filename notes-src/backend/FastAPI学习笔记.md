# FastAPI 学习笔记：现代 Python Web API 框架速通

> 更新时间：2026-06-28 | 适用版本：FastAPI 0.110+ / Python 3.10+
> 状态：学习笔记（快速上手版），踩坑记录待实际使用后补充

---

## 一、FastAPI 是什么？

### 1.1 一句话解释

**FastAPI** 是一个现代 Python Web 框架，用来快速构建 HTTP API。它的核心特点是：**基于 Python 类型注解自动校验参数、自动生成文档、原生支持异步**。

### 1.2 没有 FastAPI 之前，用 Flask 写接口长这样

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    name = request.args.get("name")        # 没有类型检查，传啥都行
    if not name:
        return jsonify({"error": "name 必填"}), 400   # 手动校验
    return jsonify({"id": user_id, "name": name})
```

**痛点**：
- 参数类型要手动校验，写一堆 `if not xxx: return error`
- 没有自动文档，接口多了要手写 Swagger / Markdown
- Flask 默认是同步（WSGI），高并发要额外上 gevent / gunicorn worker

### 1.3 FastAPI 怎么解决的——"类型注解即契约"

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int, name: str):     # 类型注解 = 自动校验
    return {"id": user_id, "name": name}    # 直接返回 dict，自动转 JSON
```

访问 `/users/abc?name=tom` → FastAPI 自动返回 422 错误，告诉你 `user_id` 必须是整数。**校验、文档、JSON 序列化全部自动完成**。

### 1.4 FastAPI 在生态中的位置

| 框架 | 类型 | 异步 | 自动文档 | 适合场景 |
|------|------|------|----------|----------|
| **Flask** | WSGI 同步 | 需扩展 | 无 | 传统中小项目 |
| **Django** | WSGI/ASGI | 部分 | 需 DRF | 全栈（含 ORM/Admin） |
| **FastAPI** | ASGI 异步 | 原生 | 内置 | 纯 API、微服务、AI 接口 |

**底层三件套**：
- **Starlette**：提供 ASGI 异步 Web 能力（路由、中间件、WebSocket）
- **Pydantic**：提供数据校验和序列化（基于类型注解）
- **uvicorn**：ASGI 服务器，负责真正监听端口跑起来

---

## 二、环境准备与第一个应用

### 2.1 安装（用户环境：Windows + uv）

```bash
# 用 uv（推荐，速度快）
uv pip install fastapi uvicorn[standard]

# 或用 pip
pip install fastapi "uvicorn[standard]"
```

> `[standard]` 会装上 `httptools`、`websockets` 等，性能更好。

### 2.2 最小应用

新建 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello, FastAPI"}
```

启动开发服务器（带热重载）：

```bash
uvicorn main:app --reload
```

- `main:app` = `文件名:FastAPI实例名`
- `--reload` = 代码改动自动重启（仅开发用）

访问 `http://127.0.0.1:8000/` → `{"message":"Hello, FastAPI"}`
访问 `http://127.0.0.1:8000/docs` → **自动生成的 Swagger UI**
访问 `http://127.0.0.1:8000/redoc` → **另一种风格的文档**

---

## 三、参数与请求体（最核心）

### 3.1 三种参数位置

| 类型 | 写法 | 位置 | 示例 |
|------|------|------|------|
| 路径参数 | `def f(user_id: int)` | URL 路径 | `/users/42` |
| 查询参数 | `def f(name: str)` | URL `?` 后 | `/users?name=tom` |
| 请求体 | `def f(user: User)` | Body JSON | `{"name":"tom"}` |

### 3.2 路径参数 + 查询参数

```python
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    # item_id 必填且必须整数；q 可选，默认 None
    return {"item_id": item_id, "q": q}
```

- `/items/5` → `{"item_id":5,"q":null}`
- `/items/5?q=hello` → `{"item_id":5,"q":"hello"}`
- `/items/abc` → 422 自动报错

### 3.3 请求体（Pydantic Model）

```python
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    age: int
    email: str | None = None    # 可选字段

@app.post("/users")
def create_user(user: UserCreate):
    return {"created": user}
```

请求：
```bash
curl -X POST http://127.0.0.1:8000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"tom","age":20}'
```

响应：
```json
{"created":{"name":"tom","age":20,"email":null}}
```

**Pydantic 自动做了**：类型校验、缺失字段报错、多余字段忽略、JSON ↔ Python 对象转换。

### 3.4 参数校验（Query / Path / Field）

```python
from fastapi import Query, Path
from pydantic import Field

@app.get("/search")
def search(q: str = Query(min_length=2, max_length=50)):
    return {"q": q}

@app.get("/items/{item_id}")
def get_item(item_id: int = Path(ge=1, le=1000)):   # 1~1000
    return {"item_id": item_id}

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    age: int = Field(ge=0, le=150)
```

---

## 四、依赖注入（Depends）

### 4.1 为什么需要依赖注入

很多接口都要做"前置工作"：查数据库连接、校验 token、读配置。重复写很烦。`Depends` 让你把前置逻辑抽成函数，FastAPI 自动调用并注入结果。

### 4.2 基本用法

```python
from fastapi import Depends

def common_params(q: str | None = None, skip: int = 0, limit: int = 10):
    return {"q": q, "skip": skip, "limit": limit}

@app.get("/items")
def list_items(params: dict = Depends(common_params)):
    return params

@app.get("/users")
def list_users(params: dict = Depends(common_params)):
    return params
```

### 4.3 典型场景：数据库连接

```python
def get_db():
    db = SessionLocal()      # 创建连接
    try:
        yield db             # 注入给路由
    finally:
        db.close()           # 请求结束自动关闭

@app.get("/users")
def list_users(db = Depends(get_db)):
    return db.query(User).all()
```

---

## 五、异步路由（async / await）

### 5.1 同步 vs 异步

```python
# 同步：跑在线程池，适合 CPU 密集或阻塞库
@app.get("/sync")
def sync_route():
    return {"msg": "ok"}

# 异步：跑在事件循环，适合 IO 密集（HTTP 请求、数据库异步驱动）
@app.get("/async")
async def async_route():
    await asyncio.sleep(1)        # 模拟异步 IO
    return {"msg": "ok"}
```

### 5.2 选择原则

| 场景 | 用 `def` | 用 `async def` |
|------|----------|----------------|
| 用同步库（如 `requests`、`sqlite3`） | ✅ | ❌ 会阻塞事件循环 |
| 用异步库（如 `httpx`、`aiosqlite`） | ❌ | ✅ |
| CPU 密集计算 | ✅（线程池） | ❌ |

> **坑**：在 `async def` 里调用同步阻塞函数（如 `requests.get`），会卡住整个事件循环。要么改用 `httpx.AsyncClient`，要么用 `run_in_threadpool`。

---

## 六、与 SQLite / Redis 联动（完整示例）

### 6.1 FastAPI + SQLite（SQLAlchemy）

```python
from fastapi import FastAPI, Depends
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/users")
def create_user(name: str, db: Session = Depends(get_db)):
    user = User(name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

> `connect_args={"check_same_thread": False}` 是 SQLite 在 FastAPI 多线程下的必加项，否则会报 `SQLite objects created in a thread can only be used in that same thread`。

### 6.2 FastAPI + Redis 缓存

```python
import redis
from fastapi import FastAPI

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int):
    cache_key = f"user:{user_id}"
    cached = r.get(cache_key)
    if cached:
        return {"source": "cache", "data": cached}
    # 假装查数据库
    data = f"用户{user_id}的信息"
    r.set(cache_key, data, ex=60)    # 缓存 60 秒
    return {"source": "db", "data": data}
```

---

## 七、启动与部署

### 7.1 开发环境

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 7.2 生产环境（多 worker）

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# 或用 gunicorn + uvicorn worker（Linux）
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

> `--workers N` 启动 N 个进程，`--reload` 生产环境**不要**用。

### 7.3 常用启动参数

| 参数 | 作用 |
|------|------|
| `--reload` | 代码改动自动重启（仅开发） |
| `--host 0.0.0.0` | 允许外部访问（默认 127.0.0.1） |
| `--port 8000` | 端口 |
| `--workers 4` | 进程数（生产） |
| `--log-level debug` | 日志级别 |

---

## 八、核心 API 速查表

| 功能 | 写法 |
|------|------|
| GET 路由 | `@app.get("/path")` |
| POST 路由 | `@app.post("/path")` |
| 路径参数 | `def f(item_id: int)` |
| 查询参数 | `def f(q: str = None)` |
| 请求体 | `def f(user: UserCreate)` |
| 依赖注入 | `Depends(func)` |
| 响应模型 | `@app.get("/", response_model=UserOut)` |
| 状态码 | `@app.post("/", status_code=201)` |
| 异常 | `raise HTTPException(status_code=404, detail="not found")` |
| 路由分组 | `APIRouter()` |
| CORS | `app.add_middleware(CORSMiddleware, ...)` |
| 启动事件 | `@app.on_event("startup")`（新写法 `lifespan`） |

---

## 九、踩坑记录

> 待实际使用后补充。预留几条常见坑方向：

- **坑1（预期）**：`async def` 里用同步阻塞库 → 事件循环卡死。改用异步库或 `run_in_threadpool`。
- **坑2（预期）**：SQLite 多线程报错 → 加 `check_same_thread: False`。
- **坑3（预期）**：`--reload` 不生效 → 检查是否装了 `watchfiles`，或用 `--reload-dir` 指定目录。
- **坑4（预期）**：Pydantic v2 vs v1 API 差异（`.dict()` → `.model_dump()`）。

---

## 十、相关链接

- 官方文档：https://fastapi.tiangolo.com/
- 本项目 `backend/SQLite学习笔记.md`（数据库部分）
- 本项目 `backend/Redis学习笔记.md`（缓存部分）
- 本项目 `技术工具学习索引.md`
