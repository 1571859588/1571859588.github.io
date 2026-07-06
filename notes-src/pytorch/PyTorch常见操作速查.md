# PyTorch 常见操作速查：张量、训练、模型全流程

> 更新时间：2026-06-28 | 适用版本：PyTorch 2.x / Python 3.10+
> 状态：学习笔记（速查手册版），踩坑记录待实际使用后补充
> 关联笔记：`pytorch/自定义 Linear 层.md`（自定义层细节不重复）

---

## 一、这份笔记是什么

本文是 PyTorch **日常高频 API 速查**，覆盖"张量操作 → 自动求导 → 数据加载 → 训练循环 → 模型保存"全流程。不是入门教程，是写代码时随时翻的速查表。

### 1.1 PyTorch 心智模型

```
 numpy 的 ndarray  →  能跑 GPU  →  能自动求导  →  能搭神经网络
       ↑                ↑              ↑              ↑
    torch.Tensor    .to('cuda')    backward()    nn.Module
```

PyTorch 本质就是"带自动求导和 GPU 加速的 numpy"。

---

## 二、张量创建与属性

### 2.1 创建张量

```python
import torch

# 从 Python 列表
a = torch.tensor([[1, 2], [3, 4]])

# 特殊张量
torch.zeros(2, 3)              # 全 0
torch.ones(2, 3)               # 全 1
torch.rand(2, 3)               # 均匀分布 [0,1)
torch.randn(2, 3)              # 标准正态
torch.arange(0, 10, 2)         # [0,2,4,6,8]
torch.linspace(0, 1, 5)        # [0, 0.25, 0.5, 0.75, 1]
torch.eye(3)                   # 单位矩阵

# 从 numpy 互转
import numpy as np
arr = np.array([1, 2, 3])
t = torch.from_numpy(arr)      # 共享内存，改一个另一个变
arr2 = t.numpy()
```

### 2.2 张量三大属性

```python
x = torch.randn(2, 3, 4)
x.shape        # torch.Size([2, 3, 4])   形状
x.dtype        # torch.float32           数据类型
x.device       # device(type='cpu')      所在设备
```

**常用 dtype**：

| dtype | 说明 |
|-------|------|
| `torch.float32` | 默认，训练最常用 |
| `torch.float16` / `torch.bfloat16` | 半精度，省显存 |
| `torch.int64` | 整数标签（CrossEntropy 要求） |

### 2.3 类型与设备转换

```python
x = torch.randn(3)
x = x.float()                  # 转 float32
x = x.long()                   # 转 int64
x = x.to(torch.float16)        # 指定 dtype

x = x.to('cuda')               # 移到 GPU
x = x.cpu()                    # 移回 CPU
x = x.cuda()                   # 等价 .to('cuda')
```

---

## 三、张量操作（形状与计算）

### 3.1 形状变换

```python
x = torch.arange(12)           # shape: [12]

x.view(3, 4)                   # 改形状，要求内存连续
x.reshape(3, 4)                # 改形状，不连续也能用（必要时拷贝）
x.unsqueeze(0)                 # shape [1, 12]，加一维
x.squeeze()                    # 去掉所有为 1 的维度

x = torch.randn(2, 3, 4)
x.permute(2, 0, 1)             # 维度重排 → [4, 2, 3]
x.transpose(0, 1)              # 交换两个维度 → [3, 2, 4]
```

> **`view` vs `reshape`**：`view` 要求张量内存连续（`x.is_contiguous()` 为 True），否则报错；`reshape` 任何情况都能用。不确定就用 `reshape`。

### 3.2 拼接与拆分

```python
a = torch.randn(2, 3)
b = torch.randn(2, 3)

torch.cat([a, b], dim=0)       # 沿行拼 → [4, 3]
torch.cat([a, b], dim=1)       # 沿列拼 → [2, 6]
torch.stack([a, b], dim=0)     # 新增维度堆叠 → [2, 2, 3]

x = torch.randn(4, 6)
torch.chunk(x, 3, dim=1)       # 沿列分 3 份
torch.split(x, 2, dim=0)       # 沿行每 2 行一份
```

### 3.3 索引与广播

```python
x = torch.randn(3, 4)
x[0]                           # 第 0 行
x[:, 0]                        # 第 0 列
x[1:3, :]                      # 第 1~2 行
x[x > 0]                       # 布尔索引，返回一维
x[0, 0] = 5                    # 原地修改

# 广播规则同 numpy
a = torch.randn(3, 1)
b = torch.randn(1, 4)
(a + b).shape                  # [3, 4]
```

### 3.4 常用计算

```python
x = torch.randn(2, 3)
x.sum()                        # 所有元素求和
x.sum(dim=0)                   # 沿行求和 → [3]
x.mean(dim=1)                  # 沿列求均值 → [2]
x.max()                        # 最大值
x.max(dim=1)                   # 返回 (values, indices)

# 矩阵乘法
a @ b                          # 等价 torch.matmul(a, b)
torch.mm(a, b)                 # 仅 2D
a * b                          # 逐元素乘（Hadamard）
```

---

## 四、自动求导（autograd）

### 4.1 基本机制

```python
x = torch.tensor(2.0, requires_grad=True)   # 开启求导
y = x ** 2 + 3 * x + 1                       # y = x² + 3x + 1
y.backward()                                 # 反向传播
x.grad                                       # dy/dx = 2x + 3 = 7.0
```

### 4.2 训练中的标准用法

```python
model = MyModel()
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

for inputs, labels in dataloader:
    optimizer.zero_grad()          # 1. 清空旧梯度（重要！）
    outputs = model(inputs)        # 2. 前向
    loss = criterion(outputs, labels)
    loss.backward()                # 3. 反向，计算梯度
    optimizer.step()               # 4. 更新参数
```

> **必须 `zero_grad()`**：PyTorch 梯度默认累加，不清零会把上次梯度加进来。

### 4.3 不需要求导的场景

```python
# 推理/评估时，关闭求导省内存
with torch.no_grad():
    outputs = model(inputs)

# 从计算图剥离张量
x_detached = x.detach()           # 返回不追踪梯度的副本
```

---

## 五、数据加载（Dataset / DataLoader）

### 5.1 自定义 Dataset

```python
from torch.utils.data import Dataset, DataLoader

class MyDataset(Dataset):
    def __init__(self, data, labels):
        self.data = data
        self.labels = labels

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]

dataset = MyDataset(data_tensor, label_tensor)
dataloader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,          # 训练时打乱
    num_workers=4,         # 多进程加载（Windows 下设 0 更稳）
)
```

### 5.2 迭代 DataLoader

```python
for batch_x, batch_y in dataloader:
    # batch_x shape: [32, ...]
    # batch_y shape: [32]
    ...
```

> **Windows 坑**：`num_workers > 0` 时要把训练代码放进 `if __name__ == "__main__":`，否则多进程报错。

---

## 六、模型定义（nn.Module）

### 6.1 标准写法

```python
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_dim, hidden_dim, out_dim):
        super().__init__()
        self.fc1 = nn.Linear(in_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, out_dim)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)
        return x

model = MLP(784, 128, 10)
```

### 6.2 常用层

| 层 | 用途 |
|----|------|
| `nn.Linear(in, out)` | 全连接 |
| `nn.Conv2d(in, out, kernel)` | 2D 卷积 |
| `nn.LSTM(in, hidden)` | LSTM |
| `nn.Embedding(num, dim)` | 词嵌入 |
| `nn.Dropout(0.5)` | 随机失活 |

### 6.3 常用激活与损失

```python
# 激活
nn.ReLU()
nn.Sigmoid()
nn.Tanh()
nn.Softmax(dim=1)

# 损失
nn.CrossEntropyLoss()           # 多分类（内含 softmax， logits 直接进）
nn.BCELoss()                    # 二分类
nn.MSELoss()                    # 回归
nn.BCEWithLogitsLoss()          # 二分类（更数值稳定）
```

> **坑**：`CrossEntropyLoss` 要求输入是 **未过 softmax 的 logits**，标签是 **int64**。别在外面再 softmax 一次。

---

## 七、完整训练流程（模板）

```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

# 1. 准备数据
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# 2. 模型、损失、优化器
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = MLP(784, 128, 10).to(device)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

# 3. 训练循环
num_epochs = 10
for epoch in range(num_epochs):
    model.train()                              # 训练模式（开启 Dropout/BatchNorm）
    total_loss = 0
    for batch_x, batch_y in dataloader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    print(f"Epoch {epoch+1}, Loss: {total_loss/len(dataloader):.4f}")

    # 4. 评估
    model.eval()                               # 评估模式（关闭 Dropout）
    correct = 0
    total = 0
    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            outputs = model(batch_x.to(device))
            preds = outputs.argmax(dim=1)
            correct += (preds == batch_y.to(device)).sum().item()
            total += batch_y.size(0)
    print(f"Acc: {correct/total:.4f}")
```

> **`model.train()` vs `model.eval()`**：影响 Dropout 和 BatchNorm。忘了切换是新手最常见 bug。

---

## 八、模型保存与加载

### 8.1 推荐方式：只存参数（state_dict）

```python
# 保存
torch.save(model.state_dict(), 'model.pth')

# 加载
model = MLP(784, 128, 10)              # 先实例化相同结构
model.load_state_dict(torch.load('model.pth'))
model.eval()
```

### 8.2 存整个模型（不推荐，依赖类定义）

```python
torch.save(model, 'model_full.pth')
model = torch.load('model_full.pth')   # 加载时类定义必须在作用域内
```

### 8.3 存训练检查点（断点续训）

```python
# 保存
checkpoint = {
    'epoch': epoch,
    'model_state': model.state_dict(),
    'optimizer_state': optimizer.state_dict(),
    'loss': loss,
}
torch.save(checkpoint, 'ckpt.pth')

# 恢复
ckpt = torch.load('ckpt.pth')
model.load_state_dict(ckpt['model_state'])
optimizer.load_state_dict(ckpt['optimizer_state'])
epoch = ckpt['epoch']
```

---

## 九、设备迁移与多卡

### 9.1 单卡

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
data = data.to(device)
```

### 9.2 多卡（DataParallel，简单）

```python
if torch.cuda.device_count() > 1:
    model = nn.DataParallel(model)
model = model.to(device)
```

> DataParallel 是单进程多卡，效率一般。生产推荐 `DistributedDataParallel`（DDP），但配置复杂。

### 9.3 查看显存

```python
torch.cuda.memory_allocated()      # 当前已分配
torch.cuda.memory_reserved()       # 当前预留
torch.cuda.empty_cache()           # 释放未用显存（不释放已用的）
```

---

## 十、常见报错速查

| 报错 | 原因 | 解决 |
|------|------|------|
| `RuntimeError: expected scalar type Long but found Float` | 标签应该是 int64 | `labels = labels.long()` |
| `RuntimeError: Input type (torch.cuda) and weight type (torch.cpu) must be the same` | 模型和数据不在同一设备 | 都 `.to(device)` |
| `CUDA out of memory` | 显存不够 | 减小 batch / 用 `float16` / `torch.cuda.empty_cache()` |
| `RuntimeError: shape 'xxx' is invalid for input of size yyy` | view/reshape 维度算错 | 检查 `x.numel()` 是否等于目标 shape 乘积 |
| `one of the variables needed for gradient computation has been modified by an inplace operation` | inplace 操作破坏计算图 | 找到 `x += ...` 改成 `x = x + ...` |
| `grad can be implicitly created only for scalar outputs` | `backward()` 对非标量调用 | `loss.sum().backward()` 或传 `gradient` |

---

## 十一、高频代码片段

### 11.1 获取模型参数量

```python
sum(p.numel() for p in model.parameters() if p.requires_grad)
```

### 11.2 冻结某些层

```python
for param in model.features.parameters():
    param.requires_grad = False
```

### 11.3 学习率调度

```python
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)
# 每 5 个 epoch lr *= 0.1
for epoch in range(num_epochs):
    train(...)
    scheduler.step()
```

### 11.4 梯度裁剪（防爆炸）

```python
loss.backward()
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
optimizer.step()
```

---

## 十二、踩坑记录

> 待实际使用后补充。预留常见坑方向：
- **坑1（预期）**：Windows + `num_workers>0` 报错 → 训练代码包进 `if __name__ == "__main__":`，或 `num_workers=0`。
- **坑2（预期）**：`CrossEntropyLoss` 重复 softmax → 输出概率全错。
- **坑3（预期）**：忘了 `model.eval()` → 评估准确率异常低（Dropout 还在生效）。
- **坑4（预期）**：`optimizer.zero_grad()` 漏写 → 梯度累加，loss 不降反升。

---

## 十三、相关链接

- 官方文档：https://pytorch.org/docs/stable/
- 本项目 `pytorch/自定义 Linear 层.md`（自定义层细节）
- 本项目 `技术工具学习索引.md`
