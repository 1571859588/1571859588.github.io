# AI Agent 企业级智能体平台（Go 版本）

## 项目简介

基于 Go 1.22 构建的企业级 AI Agent 智能体平台，采用自研 Agent 框架，支持多模型路由、ReAct 推理、RAG 增强检索、工具调用、记忆管理等核心能力。

## 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 语言 | Go 1.22 | 高性能、强类型、原生并发 |
| Web 框架 | Gin | 高性能 HTTP 框架 |
| Agent 框架 | 自研 | ReAct / Planner / Reflection 多模式 |
| 向量数据库 | Milvus | 高性能向量检索 |
| 缓存 | Redis | 会话管理 & 语义缓存 |
| 关系数据库 | PostgreSQL | 持久化存储 |
| 链路追踪 | OpenTelemetry | 全链路可观测 |

## 核心架构

```
┌──────────────────────────────────────────────────────┐
│                    API 网关层 (Gin)                    │
├──────────────────────────────────────────────────────┤
│                   Handler 处理层                      │
│           Chat Handler / Document Handler             │
├──────────────────────────────────────────────────────┤
│                  Agent 编排层                         │
│    ┌──────────┐  ┌──────────┐  ┌───────────────┐    │
│    │  ReAct   │  │ Planner  │  │  Reflection   │    │
│    │  Agent   │  │  Agent   │  │    Agent      │    │
│    └──────────┘  └──────────┘  └───────────────┘    │
├──────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐  │
│  │  RAG   │ │  Tool  │ │ Memory │ │   Intent    │  │
│  │ Engine │ │ System │ │ Manager│ │ Recognizer  │  │
│  └────────┘ └────────┘ └────────┘ └─────────────┘  │
├──────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐  │
│  │  LLM   │ │ Milvus │ │ Redis  │ │ PostgreSQL  │  │
│  │ Router │ │ Client │ │ Cache  │ │   Client    │  │
│  └────────┘ └────────┘ └────────┘ └─────────────┘  │
└──────────────────────────────────────────────────────┘
```

## 目录结构

```
cmd/server/main.go          # 程序入口
internal/
├── config/                  # 配置管理
├── handler/                 # HTTP 处理器
├── router/                  # 路由注册
├── agent/                   # Agent 编排（ReAct/Planner/Reflection）
├── rag/                     # RAG 检索增强生成
├── memory/                  # 记忆管理（短期/长期）
├── tool/                    # 工具系统（注册/路由/内置工具）
├── intent/                  # 意图识别
├── llm/                     # LLM 客户端（多模型路由/熔断）
├── vectordb/                # 向量数据库客户端
├── cache/                   # Redis 缓存
├── trace/                   # 链路追踪
├── etl/                     # 文档 ETL 流水线
└── model/                   # 数据模型定义
pkg/common/                  # 公共工具包
```

## 快速开始

### 环境要求

- Go >= 1.22
- Redis >= 7.0
- Milvus >= 2.3
- PostgreSQL >= 15

### 本地开发

```bash
# 克隆项目
git clone <repo-url>
cd project-go

# 安装依赖
go mod tidy

# 启动依赖服务
docker-compose up -d redis milvus postgres

# 运行项目
make run

# 构建
make build
```

### Docker 部署

```bash
# 构建镜像
make docker-build

# 运行容器
make docker-run
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/chat` | 对话（同步） |
| POST | `/api/v1/chat/stream` | 对话（SSE 流式） |
| POST | `/api/v1/documents` | 上传文档 |
| GET  | `/api/v1/documents/:id` | 查询文档状态 |
| GET  | `/health` | 健康检查 |

## 设计亮点

1. **三态熔断器**：支持 Closed/Open/HalfOpen 三种状态，保护 LLM 调用链路
2. **多模型路由**：根据任务复杂度智能选择模型，兼顾成本和效果
3. **ReAct 推理循环**：Thought → Action → Observation 迭代式推理
4. **混合检索**：向量检索 + 关键词检索 + Rerank 重排序
5. **分层记忆**：短期记忆（Redis）+ 长期记忆（PostgreSQL + Milvus）
6. **工具系统**：基于 Go interface 的插件化工具注册和调度
7. **优雅关停**：信号监听 + Context 取消传播 + 超时等待

## 许可证

MIT License
