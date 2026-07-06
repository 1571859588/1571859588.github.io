# 阶段四：Kubernetes (K8s) 云原生 + AI 集群插件

> 来源：《完整 AI-Infra 转行落地教程》阶段四 | 周期：3 周
> 笔记类型：学习笔记 + 实操记录
> 关联：企业级集群调度核心。当企业有几十上百张 GPU 显卡时，就需要 K8s 做算力调度。

---

## 一、阶段定位与目标

### 1.1 为什么 AI-Infra 要学 K8s

当企业有几十上百张 GPU 显卡时，手动管理不现实：
- 多个团队争抢 GPU 资源 → 需要 K8s 调度分配
- 大模型服务要弹性伸缩 → 流量涨自动扩容，流量降自动缩容
- 模型版本更新要灰度发布 → 新版本先跑 10% 流量，没问题再全量
- GPU 宕机要自动迁移 → K8s 自动把 Pod 迁到健康节点

### 1.2 阶段验收标准

> 可以在 K8s 集群里调度 GPU 资源，监控集群所有显卡运行状态。

---

## 二、必学基础 K8s 概念

### 2.1 核心 API 对象

| 对象 | 作用 | AI-Infra 场景 |
|------|------|---------------|
| **Pod** | 最小调度单元，跑容器 | 跑 vLLM 推理服务的容器 |
| **Deployment** | 管理 Pod 副本数，保证 desired = ready | 控制跑几个 vLLM 实例 |
| **Service** | 给一组 Pod 提供固定访问入口 | vLLM 集群的统一 API 入口 |
| **Namespace** | 资源隔离 | dev / staging / prod 隔离 |
| **Ingress** | HTTP 路由（域名 → Service） | `api.example.com` → vLLM Service |
| **ConfigMap** | 配置文件管理 | 存模型路径、API 配置 |
| **PV/PVC** | 持久化存储 | 模型权重存共享存储，Pod 重建不丢 |

### 2.2 Pod 示例（带 GPU）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-pod
spec:
  containers:
  - name: vllm
    image: vllm/vllm:latest
    args: ["--model", "/models/Qwen-14B-AWQ", "--port", "8000"]
    ports:
    - containerPort: 8000
    resources:
      limits:
        nvidia.com/gpu: 1          # 申请 1 张 GPU（关键）
      requests:
        nvidia.com/gpu: 1
    volumeMounts:
    - name: models
      mountPath: /models
  volumes:
  - name: models
    persistentVolumeClaim:
      claimName: models-pvc
```

> `nvidia.com/gpu: 1` 是 K8s 调度 GPU 的关键字段，需要 GPU-Operator 提供。

### 2.3 Deployment 示例（弹性伸缩）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-deployment
spec:
  replicas: 3                      # 跑 3 个副本
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
      - name: vllm
        image: vllm/vllm:latest
        args: ["--model", "/models/Qwen-14B-AWQ"]
        resources:
          limits:
            nvidia.com/gpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-service
spec:
  selector:
    app: vllm
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP                  # 集群内访问
```

```bash
# 部署
kubectl apply -f vllm-deployment.yaml

# 扩缩容
kubectl scale deployment vllm-deployment --replicas=5    # 扩到 5 个
kubectl autoscale deployment vllm-deployment --min=2 --max=10 --cpu-percent=70  # HPA 自动扩缩

# 查看
kubectl get pods
kubectl get deployment
kubectl get svc
```

---

## 三、AI-Infra 专属 K8s 组件（必学）

### 3.1 NVIDIA GPU-Operator（面试必考）

**作用**：让 K8s 集群识别 GPU 硬件，给 Pod 分配指定显存、显卡资源。

**没有 GPU-Operator 时**：
- K8s 不知道节点上有 GPU
- 无法在 YAML 里写 `nvidia.com/gpu: 1`
- Pod 调度时不会考虑 GPU 资源

**装了 GPU-Operator 后**：
- 自动在 GPU 节点上安装驱动、CUDA、container runtime
- K8s 能识别每个节点的 GPU 数量和显存
- Pod 声明 `nvidia.com/gpu: 1` 后，K8s 自动调度到有 GPU 的节点

**安装**：

```bash
# 添加 NVIDIA Helm 源
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm repo update

# 安装 GPU-Operator
helm install --wait gpu-operator \
  nvidia/gpu-operator \
  -n gpu-operator --create-namespace

# 验证
kubectl get pods -n gpu-operator
# 所有 pod 应该是 Running

kubectl get nodes -o custom-columns="NAME:.metadata.name,GPU:.status.capacity.nvidia\.com/gpu"
# 应该看到每个 GPU 节点的 GPU 数量
```

### 3.2 Prometheus + Grafana（GPU 监控）

**作用**：监控 GPU 利用率、显存、CPU、模型接口 QPS。

**架构**：
```
GPU 节点                    监控服务器
┌──────────────┐           ┌──────────────┐
│ DCGM Exporter│ → scraped │ Prometheus   │ → 查询/存储
│ (GPU 指标)   │           └──────┬───────┘
└──────────────┘                  │
                                  ▼
                          ┌──────────────┐
                          │ Grafana      │ → 可视化看板
                          │ (GPU 仪表盘) │
                          └──────────────┘
```

**部署**：

```bash
# 用 Helm 安装 kube-prometheus-stack（含 Prometheus + Grafana）
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# 安装 DCGM Exporter（GPU 指标采集）
helm repo add nvidia https://nvidia.github.io/dcgm-exporter
helm install dcgm-exporter nvidia/dcgm-exporter -n monitoring

# 访问 Grafana
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
# 浏览器打开 localhost:3000，默认账号 admin/admin
# 导入 NVIDIA 官方仪表盘 ID: 12239
```

**关键 GPU 监控指标**：

| 指标 | 含义 | 告警阈值 |
|------|------|----------|
| `DCGM_FI_DEV_GPU_UTIL` | GPU 利用率 (%) | > 95% 持续 5 分钟 |
| `DCGM_FI_DEV_FB_USED` | 已用显存 (MB) | > 90% |
| `DCGM_FI_DEV_GPU_TEMP` | GPU 温度 (°C) | > 85°C |
| `DCGM_FI_DEV_POWER_USAGE` | 功耗 (W) | > 额定 90% |

### 3.3 Alertmanager（告警通知）

**作用**：配置邮件告警，GPU 宕机、显存打满后自动通知运维人员。

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'smtp.example.com:587'
      smtp_from: 'alert@example.com'
    route:
      receiver: 'ai-team'
      group_by: ['alertname']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 1h
    receivers:
    - name: 'ai-team'
      email_configs:
      - to: 'ai-team@example.com'
        send_resolved: true
```

**告警规则示例**：

```yaml
groups:
- name: gpu-alerts
  rules:
  - alert: GPUDown
    expr: up{job="dcgm-exporter"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "GPU 节点离线"

  - alert: GPUMemoryHigh
    expr: DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_TOTAL > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "GPU 显存使用超过 90%"

  - alert: GPUTempHigh
    expr: DCGM_FI_DEV_GPU_TEMP > 85
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "GPU 温度过高"
```

### 3.4 ArgoCD（LLMOps 流水线）

**作用**：实现 LLMOps 流水线，自动化更新模型版本、灰度发布。

**工作原理**：
```
开发人员推新模型到 Git → ArgoCD 检测到变化 → 自动部署到 K8s → 灰度发布
```

**安装**：

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 访问 UI
kubectl port-forward svc/argocd-server 8080:443 -n argocd
# 默认账号 admin，密码用下面命令获取
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**灰度发布示例**：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: vllm-rollout
spec:
  replicas: 5
  strategy:
    canary:                      # 金丝雀发布
      steps:
      - setWeight: 10            # 先发 10% 流量到新版本
      - pause: {duration: 10m}   # 观察 10 分钟
      - setWeight: 50            # 没问题再发 50%
      - pause: {duration: 10m}
      - setWeight: 100           # 全量切换
  template:
    spec:
      containers:
      - name: vllm
        image: vllm/vllm:v0.5.0    # 新版本镜像
```

---

## 四、实操步骤

### 4.1 用 kubeadm 搭建单节点 K8s 集群

```bash
# 1. 关闭 swap（K8s 要求）
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# 2. 安装 containerd
sudo apt install -y containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo systemctl restart containerd

# 3. 安装 kubeadm/kubelet/kubectl
sudo apt install -y apt-transport-https ca-certificates curl
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# 4. 初始化集群
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# 5. 配置 kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 6. 安装网络插件（Calico）
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# 7. 允许 master 节点跑 Pod（单节点集群需要）
kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# 8. 验证
kubectl get nodes
# STATUS 应该是 Ready
```

### 4.2 部署 GPU-Operator

见 3.1 节。

### 4.3 部署 Prometheus + Grafana

见 3.2 节。

### 4.4 在 K8s 中启动带 GPU 的 Pod

```bash
# 创建命名空间
kubectl create namespace ai

# 部署 vLLM（用 2.2 节的 YAML）
kubectl apply -f vllm-pod.yaml -n ai

# 验证 Pod 状态
kubectl get pods -n ai
kubectl describe pod vllm-pod -n ai    # 看是否分配到 GPU

# 进入 Pod 验证
kubectl exec -it vllm-pod -n ai -- nvidia-smi
```

---

## 五、K8s 常用命令速查

```bash
# 集群信息
kubectl get nodes                    # 查看节点
kubectl get pods -A                  # 查看所有命名空间的 Pod
kubectl top nodes                    # 节点资源使用
kubectl top pods                     # Pod 资源使用

# Pod 管理
kubectl apply -f xxx.yaml            # 部署
kubectl delete -f xxx.yaml           # 删除
kubectl logs -f <pod>                # 查日志
kubectl exec -it <pod> -- bash       # 进入 Pod
kubectl describe pod <pod>           # 详情（排查调度失败）

# GPU 相关
kubectl get nodes -o custom-columns="NAME:.metadata.name,GPU:.status.capacity.nvidia\.com/gpu"
kubectl describe node <node> | grep -A 5 Allocated

# 扩缩容
kubectl scale deployment <name> --replicas=5
kubectl autoscale deployment <name> --min=2 --max=10 --cpu-percent=70
```

---

## 六、验收标准

> 可以在 K8s 集群里调度 GPU 资源，监控集群所有显卡运行状态。

**自测清单**：

- [ ] 能用 kubeadm 搭建 K8s 集群
- [ ] 能部署 GPU-Operator 让 K8s 识别 GPU
- [ ] 能写 Deployment YAML 声明 GPU 资源
- [ ] 能部署 Prometheus + Grafana 看 GPU 监控
- [ ] 能配置 Alertmanager 邮件告警
- [ ] 能用 ArgoCD 做模型版本灰度发布
- [ ] 能用 `kubectl` 排查 Pod 调度失败

---

## 七、关联笔记

- `devops/Docker学习笔记.md`（K8s 前置）
- 本目录 `阶段三_GPU_CUDA与cuDNN软件栈.md`（GPU 前置）
- 本目录 `阶段五_大模型推理部署技术栈.md`（K8s 上跑 vLLM）
- 本目录 `阶段六_简历级实战项目.md`（项目二就是 3 节点 K8s 集群）
- `技术工具学习索引.md`
