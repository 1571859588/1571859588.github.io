---
layout: notes
title: "Git 常用命令速查"
series: misc
series_order: 1
date: 2025-07-03
---

## 1. 基础操作

```bash
# 克隆仓库
git clone <url>

# 查看状态
git status

# 添加文件
git add <file>
git add .

# 提交
git commit -m "message"

# 推送
git push origin main
```

## 2. 分支管理

```bash
# 创建分支
git branch <name>

# 切换分支
git checkout <name>
git switch <name>

# 创建并切换
git checkout -b <name>

# 合并分支
git merge <branch>
```

> 待补充更多内容。本文为占位笔记。
