# 项目进度与文件路径管理 (Project Progress and File Path Management)

## 📌 当前任务进度
- [x] 创建开发分支 `feature/llm-repeater-blog`
- [x] 撰写大模型常见面试题：复读机问题 (中文版) 博客并添加到 `_posts/2026-05-24-llm-interview-repeater-cn.md`
- [x] 撰写大模型常见面试题：复读机问题 (英文版) 博客并添加到 `_posts/2026-05-24-llm-interview-repeater-en.md`
- [x] 实现并优化博客右侧动态智能目录 (Dynamic Table of Contents with ScrollSpy)
- [x] 重构目录系统 (fix/toc-styling)：分离目录和页面内容流，使用 position fixed 固定到侧边栏，支持无重叠的完美视觉，替换了中文标题及过滤大标题。
- [x] 更新 `PROGRESS.md` 文件
- [x] 提交并推送到 GitHub 仓库 (使用 `git commit` & `git push`)

## 📂 项目关键文件路径
- 中文博客: `_posts/2026-05-24-llm-interview-repeater-cn.md`
- 英文博客: `_posts/2026-05-24-llm-interview-repeater-en.md`
- 动态目录模版: `_includes/custom_toc.html`
- 文章布局文件: `_layouts/single.html`
- 配置文件: `_config.yml`
- 进度记录: `PROGRESS.md`

## 📝 历史更新日志
- **2026-05-24**: 撰写并添加大语言模型常见面试题之“复读机问题”的中英文博客，创建并更新 `PROGRESS.md`，完成代码提交与推送。
- **2026-05-24 (更新)**: 实现了响应式、高拟真、具微动画的右侧动态目录，支持点击平滑滚动跳转与滚动条高亮跟随 (ScrollSpy)，并过滤大标题。
- **2026-05-24 (重构修复)**: 重构了 `custom_toc.html`，彻底解决目录覆盖重叠问题；移除中文显示标题，更新为带图标的英文标题，重构 JS 树形抓取确保深层标签显示正确。
