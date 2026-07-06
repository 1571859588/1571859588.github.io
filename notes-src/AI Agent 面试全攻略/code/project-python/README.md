# 企业级 AI Agent 服务

## 项目简介

本项目是一个面向生产环境的企业级 AI Agent 基础骨架，采用 **FastAPI** 提供 HTTP API，在 `app/core` 中预留 **Agent 编排**（ReAct、规划、反思）、**RAG**（检索、重排、生成）、**记忆系统**（短/长期）、**工具与意图识别** 等扩展点；在 `app/infrastructure` 中对接 **LLM 路由与熔断**、**Milvus**、**Redis**、**PostgreSQL** 与 **链路追踪**；在 `app/etl` 中承载文档解析、分块与入库流水线。

当前仓库为**可运行的最小骨架**：`main.py` 挂载健康检查与占位对话/文档接口，业务逻辑可在对应模块中逐步实现。

## 架构说明

- **接入层**：`app/main.py` 创建 FastAPI 应用，`app/api/routes/` 按领域拆分路由（对话、文档、健康检查）。
- **领域核心**：`app/core/` 放置与框架无关的业务能力——Agent 图编排、RAG 管道、记忆策略、工具注册与意图识别。
- **基础设施**：`app/infrastructure/` 封装对外部系统的访问（模型网关、向量库、缓存、关系库、可观测性），便于单测与替换实现。
- **数据与 ETL**：`app/models` 定义 API/领域模型；`app/etl` 负责非结构化文档到向量索引的数据流。

部署上可通过 **Dockerfile** 构建应用镜像，**docker-compose** 一键拉起应用与依赖中间件（详见下文 Compose 说明）。

## 技术栈

| 类别 | 技术 |
|------|------|
| Web 框架 | FastAPI、Uvicorn |
| Agent / LLM | LangChain、LangGraph、OpenAI 兼容 API |
| 向量库 | Milvus（pymilvus） |
| 缓存 | Redis |
| 关系库 | PostgreSQL、SQLAlchemy |
| 配置与校验 | Pydantic v2、pydantic-settings |
| 文档处理 | unstructured、pypdf、sentence-transformers |
| 日志与韧性 | loguru、tenacity、httpx |

## 快速开始

### 本地开发

1. Python 3.11+，创建虚拟环境并安装依赖：

```bash
cd project-python
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -e .
```

2. 复制环境变量并编辑（至少填写 `OPENAI_API_KEY` 等）：

```bash
cp .env.example .env
```

3. 启动 API（需本机或 Compose 中已启动 Postgres / Redis / Milvus 若你要联调全栈）：

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. 访问健康检查：<http://127.0.0.1:8000/api/v1/health>

### Docker Compose

在项目根目录准备 `.env`（可由 `.env.example` 复制），然后：

```bash
docker compose up -d --build
```

Compose 包含 **app、postgres、redis、milvus**，以及 Milvus 官方 Standalone 模式所需的 **etcd、minio**（向量与元数据存储依赖，非业务微服务）。应用默认映射 `8000` 端口。

首次启动 Milvus 可能需要数十秒就绪；若应用启动过快导致连不上 Milvus，可在生产环境中为 app 增加重试或 `depends_on` 健康检查策略。

## 目录结构说明

```
project-python/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置（pydantic-settings）
│   ├── api/routes/             # 路由：chat、document、health
│   ├── core/                   # Agent、RAG、记忆、工具、意图
│   ├── infrastructure/         # LLM、向量库、缓存、DB、追踪
│   ├── etl/                    # 解析、分块、流水线
│   └── models/                 # schemas、enums
├── requirements.txt
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 许可证

MIT（可按团队需要修改）。
