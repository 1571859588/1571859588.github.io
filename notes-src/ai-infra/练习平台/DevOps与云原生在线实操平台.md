# DevOps 与云原生在线实操平台

> 更新时间：2026-06-30
> 状态：工具收集笔记
> 用途：Linux / Docker / Kubernetes / 运维技能在线实操平台，配合 AI-Infra 阶段一/二/四
> 关联：本目录 `1. Linux网络与Shell脚本.md`、`2. Docker与Nvidia-Docker2.md`、`4. Kubernetes与AI集群.md`

---

## 一句话结论

**练 Linux 基础用 Killercoda**（浏览器内真实环境，免费交互式场景）；**练 K8s 用 Play with K8s + KodeKloud**；**练 Docker 用 Play with Docker**。这些平台不用自己装虚拟机，打开浏览器直接练。

---

## 一、平台对比总览

| 平台 | 网址 | 核心功能 | 免费 | 国内访问 | 推荐度 |
|------|------|----------|------|----------|--------|
| **Killercoda** | killercoda.com | Linux/K8s/Shell 交互场景 | ✅ | 可访问 | ⭐⭐⭐⭐⭐ |
| **Play with K8s** | labs.play-with-k8s.com | 真实 K8s 集群实验 | ✅ | 可访问 | ⭐⭐⭐⭐ |
| **Play with Docker** | labs.play-with-docker.com | Docker 在线实验 | ✅ | 可访问 | ⭐⭐⭐⭐ |
| **KodeKloud** | kodekloud.com | DevOps 系统课程+实操 | 部分 | 可访问 | ⭐⭐⭐⭐ |
| **Katacoda（已归档）** | katacoda.com | 原老牌交互学习 | 已停 | - | - |

---

## 二、Killercoda（首选，强烈推荐）

**网址**：https://killercoda.com/

### 2.1 为什么是首选

- **Katacoda 的继任者**（Katacoda 已停服，Killercoda 接棒）
- **浏览器内直接开真实 Linux 终端**，不用装虚拟机
- **大量交互式场景**：Linux 基础、Shell 脚本、Docker、K8s、网络
- **完全免费**，注册即用
- 每个场景有步骤引导，边学边操作

### 2.2 核心场景

| 场景分类 | 具体内容 | 对应阶段 |
|----------|----------|----------|
| **Linux 基础** | 文件操作、权限、进程管理 | 阶段一 |
| **Shell 脚本** | bash 变量/循环/函数 | 阶段一 |
| **文本处理** | grep/sed/awk 实操 | 阶段一 |
| **systemd** | 服务管理实操 | 阶段一 |
| **网络** | TCP/IP、Nginx 反向代理 | 阶段一 |
| **Docker** | 容器/镜像/Dockerfile | 阶段二 |
| **Kubernetes** | Pod/Deployment/Service | 阶段四 |
| **K8s 进阶** | GPU-Operator、监控 | 阶段四 |

### 2.3 使用方式

```
1. 打开 killercoda.com
2. 选场景（如 "Linux Basics"）
3. 点击 Start → 浏览器内出现真实 Linux 终端
4. 按引导步骤操作，每步有验证
5. 场景结束，环境自动销毁
```

**每个场景特点**：
- 有明确的学习目标
- 步骤式引导，不会迷路
- 每步操作后自动验证
- 环境是真实的 Ubuntu/CentOS，不是模拟

### 2.4 适合的 AI-Infra 阶段

| 阶段 | Killercoda 场景 |
|------|-----------------|
| 一 | Linux Basics、Shell Scripting、grep/sed/awk、systemd |
| 二 | Docker Beginner、Dockerfile、docker-compose |
| 四 | Kubernetes Basics、K8s Networking、Helm |

---

## 三、Play with K8s（K8s 专用）

**网址**：https://labs.play-with-k8s.com/

### 3.1 特点

- **官方 K8s 在线实验环境**（CNCF 维护）
- 每次提供 3-5 台虚拟机，可搭建多节点 K8s 集群
- 免费，用 GitHub/Docker 账号登录
- 每次会话 4 小时

### 3.2 使用流程

```bash
# 1. 登录后点击 "Start"
# 2. 获得 3-5 个节点（node1, node2, node3...）
# 3. 在 node1 初始化 master
kubeadm init --apiserver-advertise-address $(hostname -i)

# 4. 加入 worker 节点（在 node2, node3 执行 kubeadm join）
# 5. 部署网络插件
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# 6. 开始练习 K8s 操作
kubectl get nodes
kubectl run nginx --image=nginx
```

### 3.3 适合

- 阶段四：搭建 K8s 集群实操
- 没有云服务器预算时练 K8s
- 体验多节点集群（不用自己买 3 台服务器）

### 3.4 限制

- 每次 4 小时，超时销毁
- 不带 GPU（纯 K8s 调度练习）
- 网络不稳定时可能掉线

---

## 四、Play with Docker（Docker 专用）

**网址**：https://labs.play-with-docker.com/

### 4.1 特点

- Docker 官方在线实验环境
- 提供 5 台 Docker 节点
- 免费，Docker Hub 账号登录
- 每次会话 4 小时

### 4.2 适合

- 阶段二：Docker 基础练习
- 练 Docker Swarm（多节点编排）
- 不想本地装 Docker 时快速实验

### 4.3 使用

```bash
# 登录后点击 "Add New Instance" 添加节点
# 在节点上直接操作 Docker
docker run hello-world
docker pull nginx
docker build -t myapp .
docker swarm init  # 初始化 Swarm 集群
```

---

## 五、KodeKloud（DevOps 系统课程）

**网址**：https://kodekloud.com/

### 5.1 特点

- DevOps 系统学习平台（课程+实操）
- 有免费和付费内容
- 课程涵盖：Linux、Docker、K8s、CI/CD、Terraform
- 每节课后有交互式实验
- 有 K8s CKA 认证备考课程

### 5.2 免费内容

| 课程 | 内容 |
|------|------|
| Linux Basics | 免费入门 |
| Docker for Beginners | 部分免费 |
| Kubernetes for Beginners | 部分免费 |

### 5.3 付费内容（参考）

| 课程 | 价格 | 说明 |
|------|------|------|
| CKA 备考 | ~$99 | K8s 管理员认证 |
| DevOps 工程师路径 | ~$299 | 全套 DevOps |

### 5.4 适合

- 想系统学 DevOps（不只是零散操作）
- 准备 CKA/CKS 认证
- 喜欢课程+实验结合的学习方式

---

## 六、其他实用在线工具

### 6.1 Regex101（正则表达式在线测试）

**网址**：https://regex101.com/

- 在线测试正则表达式
- 有详细匹配解释
- 支持 Python/Go/JavaScript 等多种引擎
- 练 grep/sed 时配合使用

### 6.2 shellcheck（Shell 脚本检查）

**网址**：https://www.shellcheck.net/

- 在线检查 Shell 脚本语法和最佳实践
- 写完脚本粘贴进去，自动指出问题

### 6.3 nginxconfig.io（Nginx 配置生成）

**网址**：https://www.digitalocean.com/community/tools/nginx

- 可视化生成 Nginx 配置
- 选场景（反向代理/负载均衡/SSL）自动生成配置
- 阶段一 Nginx 配置实操时用

### 6.4 cmpexplorer（Docker/K8s Explorer）

**网址**：https://labs.play-with-k8s.com/

- 可视化查看 K8s 资源关系
- 辅助理解 Pod/Service/Deployment 关系

---

## 七、各阶段实操平台推荐

| 阶段 | 实操内容 | 推荐平台 | 预算 |
|------|----------|----------|------|
| 一 | Linux 命令 | Killercoda（免费） | 0 |
| 一 | Shell 脚本 | Killercoda + shellcheck | 0 |
| 一 | Nginx 反代 | Killercoda + nginxconfig.io | 0 |
| 二 | Docker 基础 | Play with Docker（免费） | 0 |
| 二 | nvidia-docker | AutoDL（需 GPU） | ~2 元 |
| 四 | K8s 集群 | Play with K8s（免费） | 0 |
| 四 | GPU-Operator | AutoDL 多节点 | ~50 元 |
| 四 | 监控/告警 | Killercoda + 云服务器 | ~50 元/月 |

> **省钱策略**：阶段一/二/四的纯 Linux/Docker/K8s 操作都能用免费平台练，只有需要 GPU 的部分（阶段二 nvidia-docker、阶段四 GPU-Operator）才付费。

---

## 八、学习路径建议

```
1. Killercoda 过一遍 Linux 基础场景     → 阶段一基础
2. Play with Docker 练 Docker 操作       → 阶段二基础
3. Killercoda 过 K8s 基础场景            → 阶段四入门
4. Play with K8s 搭建多节点集群          → 阶段四实战
5. 买 AutoDL GPU 实例练 nvidia-docker    → 阶段二/三 GPU 部分
6. KodeKloud 课程系统补 DevOps 知识      → 查漏补缺
```

---

## 九、踩坑记录

> 待实际使用后补充。预留常见坑方向：

- **坑1（预期）**：Play with K8s 4 小时超时销毁 → 重要数据及时保存
- **坑2（预期）**：Killercoda 场景环境有时加载慢 → 换个时段重试
- **坑3（预期）**：Play with Docker 不支持 GPU → GPU 实验用 AutoDL
- **坑4（预期）**：免费平台网络不稳定 → 做好断线重连准备

---

## 十、相关链接

- 本目录 `1. Linux网络与Shell脚本.md`
- 本目录 `2. Docker与Nvidia-Docker2.md`
- 本目录 `4. Kubernetes与AI集群.md`
- 本目录 `在线GPU练习平台汇总.md`
- 本目录 `算法刷题在线练习平台.md`
- 本目录 `AI竞赛与数据科学练习平台.md`
- `技术工具学习索引.md`
