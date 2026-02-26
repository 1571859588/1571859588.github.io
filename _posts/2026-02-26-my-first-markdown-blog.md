---
title: "我的第一篇使用 Markdown 和 YAML 的博客"
date: 2026-02-26
categories:
  - 学习笔记
tags:
  - Typora
  - Jekyll
  - 博客设置
---

这是我第一次尝试直接使用带有 **YAML 头部的 Markdown** 来写博客！

就像我在 Typora 里平时写笔记一样，我可以随意地使用标题、列表、加粗等格式。

## 插入图片示例

下面这张图片直接引用了仓库 `images` 文件夹下的 `nyu.png` 图片。

我在 Typora 中可能是写相对路径 `![NYU](nyu.png)`，在这里为了让网页正确加载，我只需要改成以斜杠开头的网页绝对路径 `/images/nyu.png`：

![NYU Logo](/images/nyu.png)

## 代码块示例

同样，我也能像 Typora 里一样非常方便地写代码！

```python
def hello_world():
    print("Hello, this is my new blog!")
```

这样，只要我将这个文件按 `YYYY-MM-DD-title.md` 的格式保存到 `_posts` 文件夹并 push 到 GitHub，Jekyll 就会自动将其渲染成带有目录、分类和标签的漂亮博客页面啦！
