# AI Agent Platform（Java 企业级版本）

> 基于 Spring Boot 3.5 + Spring AI 构建的企业级智能 Agent 平台，参考 nageoffer/ragent 架构风格。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 运行环境 | Java | 17 |
| 核心框架 | Spring Boot | 3.5.0 |
| AI 框架 | Spring AI | 1.0.0 |
| ORM | MyBatis Plus | 3.5.7 |
| 缓存 | Redis (Lettuce) | 7.x |
| 向量数据库 | Milvus | 2.4.x |
| 构建工具 | Maven | 3.9+ |

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway / Controller                │
│              (Chat / Document / Health)                       │
├──────────────────────────────────────────────────────────────┤
│                     Agent 编排层                              │
│         ┌──────────┬──────────┬──────────┐                   │
│         │ ReAct    │ Planner  │Reflection│                   │
│         │ Agent    │ Agent    │ Agent    │                   │
│         └──────────┴──────────┴──────────┘                   │
├──────────────────────────────────────────────────────────────┤
│                   核心能力层                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ RAG    │ │ Memory │ │ Tool   │ │ Intent │               │
│  │ Engine │ │ Mgmt   │ │ System │ │ Recog  │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
├──────────────────────────────────────────────────────────────┤
│                   基础设施层                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ Model  │ │ Vector │ │ Redis  │ │ Trace  │               │
│  │ Router │ │ DB     │ │ Cache  │ │ Service│               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
├──────────────────────────────────────────────────────────────┤
│                   ETL 数据管道                                │
│         Document Parser → Chunker → Pipeline                 │
└──────────────────────────────────────────────────────────────┘
```

## 核心特性

- **多 Agent 编排**：支持 ReAct、Planner、Reflection 等多种 Agent 模式
- **RAG 多路检索**：向量检索 + 关键词检索 + 混合排序
- **智能记忆管理**：短期对话记忆 + 长期知识记忆
- **工具注册中心**：可扩展的工具系统，支持运行时动态注册
- **模型路由与熔断**：多模型智能切换 + 三态熔断器
- **SSE 流式对话**：支持 Server-Sent Events 实时推送
- **全链路追踪**：请求级别的 Agent 执行追踪

## 快速开始

### 环境要求

- JDK 17+
- Maven 3.9+
- Redis 7.x
- Milvus 2.4+
- MySQL 8.0+

### 本地启动

```bash
# 克隆项目
git clone <repo-url>
cd project-java

# 编译打包
mvn clean package -DskipTests

# 启动应用
java -jar target/agent-platform-1.0.0.jar --spring.profiles.active=dev
```

### Docker 启动

```bash
# 构建镜像
docker build -t agent-platform:latest .

# 启动容器
docker run -d -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=dev \
  -e OPENAI_API_KEY=your-key \
  agent-platform:latest
```

## 目录结构

```
src/main/java/com/agent/platform/
├── AgentPlatformApplication.java        # 启动类
├── config/                              # 配置类
├── controller/                          # 接口层
├── service/
│   ├── agent/                           # Agent 编排
│   ├── rag/                             # RAG 检索增强生成
│   ├── memory/                          # 记忆管理
│   ├── tool/                            # 工具系统
│   └── intent/                          # 意图识别
├── infrastructure/                      # 基础设施
│   ├── llm/                             # 模型路由 & 熔断
│   ├── vectordb/                        # 向量数据库
│   ├── cache/                           # 缓存
│   └── trace/                           # 链路追踪
├── model/                               # 数据模型
├── etl/                                 # 文档处理管道
└── common/                              # 公共组件
```

## API 文档

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/chat` | POST | 普通对话 |
| `/api/v1/chat/stream` | POST | SSE 流式对话 |
| `/api/v1/documents/upload` | POST | 文档上传 |
| `/api/v1/health` | GET | 健康检查 |

## License

Apache License 2.0
