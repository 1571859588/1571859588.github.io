# 项目进度与文件路径管理 (Project Progress and File Path Management)

## 📌 当前任务进度
- [x] 切换并使用开发分支 `docx/transformer-blog`
- [x] 润色并修正大模型常见面试题：Transformer 连环问 (英文版) 博客 `_posts/2026-06-02-llm-interview-Transformer-en.md` 的英文学术书面语与精准专业术语表达
- [x] 拓展 Transformer 架构的全局架构讲解，加入对论文图示 Figure 1 及其 Caption 的定位锚点与引用
- [x] 深入剖析 Transformer 机制底层原理（引入对 $\sqrt{d_k}$ 分布方差变化推导，以及 Xavier 初始化对 embedding 乘以 $\sqrt{D}$ 的数学证明与论文原文引用）
- [x] 修正 Layer Normalization 归一化维度的数学及 PyTorch 维度解释，纠正其对应的可学习参数维度为 $D$
- [x] 完善 YAML 头部的标题、标签、Permalink 与 References（标明每篇引用论文在此博文中的作用与作用描述）
- [x] 更新 `PROGRESS.md` 进度文件
- [x] 将开发分支 `docx/transformer-blog` 的最新修改提交并推送至 GitHub 远程仓库 (使用 `git commit` & `git push`)

---
*(以下为历史任务备份)*
- [x] 切换并使用开发分支 `docx/repeater-blog`
- [x] 润色并修正大模型常见面试题：复读机问题 (英文版) 博客 `_posts/2026-05-24-llm-interview-repeater-en.md` 的英文学术书面语表达
- [x] 修复复读机英文博客中引用的配图路径，更正目录至 `2026-05-24-llm-interview-repeater-en` 并对文件名中的空格进行 URL 编码
- [x] 移除博客中所有 Markdown 语法渲染冲突的转义双引号反斜杠 `\"` -> `"`
- [x] 在 Git 远程和本地仓库中删除旧教程博客 `_posts/2026-02-26-my-first-markdown-blog.md`
- [x] 润色并修正 HDL 学习体验博客 `_posts/2026-04-06-blog-post-1.md` 的英文书面语表达，使其更具学术与工程专业度
- [x] 根据英文版 `_posts/2026-05-29-llm-interview-SFT-RL-en.md` 完整翻译并撰写本地中文版 `_posts/2026-05-29-llm-interview-SFT-RL-cn.md`（已通过 .gitignore 在 Git 中忽略，仅保留本地）
- [x] 将开发分支 `docx/repeater-blog` 的最新修改（包含删除与修改文件）提交并推送至 GitHub 远程仓库 (使用 `git commit` & `git push`)
- [x] 创建开发分支 `feature/llm-repeater-blog`
- [x] 撰写大模型常见面试题：复读机问题 (中文版) 博客并添加到 `_posts/2026-05-24-llm-interview-repeater-cn.md`
- [x] 撰写大模型常见面试题：复读机问题 (英文版) 博客并添加到 `_posts/2026-05-24-llm-interview-repeater-en.md`
- [x] 润色并修正大模型常见面试题：复读机问题 (英文版) 的语法、语义以及技术细节错误，替换并翻译了所有残留的中文标注
- [x] 在英文版博客的 References 中补充搜索并验证后的精确学术论文引用（包含作者、年份及贡献摘要）
- [x] 实现并优化博客右侧动态智能目录 (Dynamic Table of Contents with ScrollSpy)
- [x] 重构目录系统 (fix/toc-styling)：分离目录和页面内容流，使用 position fixed 固定到侧边栏，支持无重叠的完美视觉，替换了中文标题及过滤大标题。
- [x] 在 `.gitignore` 中配置忽略 `_posts/*-cn.md`，不再将中文博文推送到远程
- [x] 从 Git 缓存中移除已被追踪的中文博文 `_posts/2026-05-24-llm-interview-repeater-cn.md` 的索引
- [x] 根据最新的英文润色版重新完整翻译了中文版备份 `_posts/2026-05-24-llm-interview-repeater-cn.md`，保持本地非追踪状态
- [x] 更新 `PROGRESS.md` 文件
- [x] 提交并推送到 GitHub 仓库 (使用 `git commit` & `git push`)

## 📂 项目关键文件路径
- SFT-RL性能变化英文博客: `_posts/2026-05-29-llm-interview-SFT-RL-en.md`
- 复读机中文博客 (仅限本地): `_posts/2026-05-24-llm-interview-repeater-cn.md` (已在 .gitignore 中忽略)
- 复读机英文博客: `_posts/2026-05-24-llm-interview-repeater-en.md`
- 动态目录模版: `_includes/custom_toc.html`
- 文章布局文件: `_layouts/single.html`
- 配置文件: `_config.yml`
- 进度记录: `PROGRESS.md`

## 📝 历史更新日志
- **2026-05-29 (SFT-RL博文润色)**: 创建分支 `feature/sft-rl-post-training-blog`，逐句润色修正了 `2026-05-29-llm-interview-SFT-RL-en.md` 英文博客中的所有语法、语义和术语细节错误，完全消除了残留中文。补充了华为2026 coupling paper、SVD 奇异向量旋转、以及 RFT reward variance 隐式正则化等学术论文与概念的精准引用，并使用 Python 自动化脚本进行了全方位的内容合规性与格式校验。
- **2026-05-29**: 根据最新的英文润色版重新完整翻译了中文版备份 `_posts/2026-05-24-llm-interview-repeater-cn.md`，保持本地非追踪状态。
- **2026-05-24**: 撰写并添加大语言模型常见面试题之“复读机问题”的中英文博客，创建并更新 `PROGRESS.md`，完成代码提交与推送。
- **2026-05-24 (更新)**: 实现了响应式、高拟真、具微动画的右侧动态目录，支持点击平滑滚动跳转与滚动条高亮跟随 (ScrollSpy)，并过滤大标题。
- **2026-05-24 (重构修复)**: 重构了 `custom_toc.html`，彻底解决目录覆盖重叠问题；移除中文显示标题，更新为带图标的英文标题，重构 JS 树形抓取确保深层标签显示正确。
- **2026-05-24 (忽略中文版)**: 配合 `.gitignore` 规则 `_posts/*-cn.md`，从 Git 远程追踪索引中移除 `_posts/2026-05-24-llm-interview-repeater-cn.md`，保留本地文件，防止中文博文被推送到远程。
- **2026-05-25 (润色英文版)**: 逐句修正了 `2026-05-24-llm-interview-repeater-en.md` 英文博客中的所有语法和语义问题，将残留的中文表述翻译为地道、专业的书面学术英语，并修正了公式、论文引用等技术细节，补充了面试标准问答框架。
- **2026-05-25 (补充参考资料)**: 搜索、检索并校验了文章中引用的 Markov 决策与贪婪搜索缺陷论文以及 ByteDance 后期对齐技术报告，成功补充并完善了 References 中的全称学术引用。


