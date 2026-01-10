# Academic Pages - 完整配置教程

**Academic Pages 是一个专为学术网站设计的 GitHub Pages 模板。**

本教程将详细介绍如何从零开始配置和自定义您的学术主页模板，包括项目初始化、图标设置、目录结构、导航系统和排版规范等核心内容。

---

## 📋 目录

1. [项目初始化与环境搭建](#1-项目初始化与环境搭建)
2. [网页标签小图标设置指南](#2-网页标签小图标设置指南)
3. [项目目录结构详解](#3-项目目录结构详解)
4. [页面导航系统设计教程](#4-页面导航系统设计教程)
5. [排版规范与内容管理](#5-排版规范与内容管理)
6. [本地开发环境配置](#6-本地开发环境配置)
7. [部署与维护](#7-部署与维护)

---

## 1. 项目初始化与环境搭建

### 1.1 从零开始创建项目

#### 步骤 1: GitHub 仓库创建

```bash
# 1. 点击 GitHub 上的 "Use this template" 按钮
# 2. 命名您的仓库: [your-username].github.io
# 3. 选择公开或私有仓库
# 4. 点击 "Create repository from template"
```

#### 步骤 2: 克隆项目到本地

```bash
git clone https://github.com/[your-username]/[your-username].github.io.git
cd [your-username].github.io
```

#### 步骤 3: 基础环境配置

```bash
# 安装 Ruby 依赖
bundle install

# 安装 Node.js 依赖
npm install

# 验证 Jekyll 安装
jekyll -v
```

### 1.2 核心配置文件

#### `_config.yml` - 站点配置文件

```yaml
# Site Settings
title: "您的姓名 - 学术主页"
description: "个人学术主页"
url: "https://[your-username].github.io"
baseurl: ""

# Author Settings
author:
  name: "您的姓名"
  avatar: "/images/profile.png"
  bio: "您的职位和研究方向"
  location: "所在机构"
  email: "your.email@example.com"

# Build Settings
markdown: kramdown
highlighter: rouge
theme: minimal-mistakes
```

#### `Gemfile` - Ruby 依赖管理

```ruby
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll", "~> 3.9"
gem "minimal-mistakes-jekyll"

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-sitemap"
  gem "jekyll-seo-tag"
end
```

---

## 2. 网页标签小图标设置指南

### 2.1 图标文件格式要求

#### 推荐格式与尺寸

```
├── favicon.ico (16x16, 32x32, 48x48 - ICO格式)
├── favicon-16x16.png (16x16 - PNG格式)
├── favicon-32x32.png (32x32 - PNG格式)
├── apple-touch-icon.png (180x180 - Apple设备)
├── android-chrome-192x192.png (192x192 - Android)
└── android-chrome-512x512.png (512x512 - Android)
```

#### 图标生成工具推荐

- [Real Favicon Generator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
- [Canva](https://www.canva.com/)

### 2.2 图标文件存放位置

#### 标准目录结构

```
images/
├── favicon/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
└── profile.png
```

### 2.3 HTML 头部配置

#### 在 `_includes/head/custom.html` 中添加:

```html
<!-- Standard favicon -->
<link rel="icon" type="image/x-icon" href="{{ '/images/favicon/favicon.ico' | relative_url }}">

<!-- PNG favicons for modern browsers -->
<link rel="icon" type="image/png" sizes="32x32" href="{{ '/images/favicon/favicon-32x32.png' | relative_url }}">
<link rel="icon" type="image/png" sizes="16x16" href="{{ '/images/favicon/favicon-16x16.png' | relative_url }}">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="{{ '/images/favicon/apple-touch-icon.png' | relative_url }}">

<!-- Android Chrome Icons -->
<link rel="icon" type="image/png" sizes="192x192" href="{{ '/images/favicon/android-chrome-192x192.png' | relative_url }}">
<link rel="icon" type="image/png" sizes="512x512" href="{{ '/images/favicon/android-chrome-512x512.png' | relative_url }}">

<!-- Web App Manifest -->
<link rel="manifest" href="{{ '/images/favicon/site.webmanifest' | relative_url }}">

<!-- Theme Color -->
<meta name="theme-color" content="#ffffff">
```

### 2.4 多平台兼容性处理

#### Web App Manifest 文件 (`site.webmanifest`)

```json
{
  "name": "您的学术主页",
  "short_name": "学术主页",
  "icons": [
    {
      "src": "/images/favicon/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/favicon/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

#### Safari 固定标签页图标 (`safari-pinned-tab.svg`)

```html
<link rel="mask-icon" href="{{ '/images/favicon/safari-pinned-tab.svg' | relative_url }}" color="#5bbad5">
```

---

## 3. 项目目录结构详解

### 3.1 核心目录功能说明

```
[your-username].github.io/
├── _config.yml              # 站点配置文件
├── _data/                   # 数据文件目录
│   ├── navigation.yml       # 导航菜单配置
│   ├── authors.yml          # 作者信息
│   └── ui-text.yml          # UI文本配置
├── _includes/               # 可复用组件
│   ├── head.html            # HTML头部
│   ├── masthead.html        # 顶部导航栏
│   ├── footer.html          # 页脚
│   └── sidebar.html         # 侧边栏
├── _layouts/                # 页面模板
│   ├── default.html         # 默认布局
│   ├── single.html          # 单页布局
│   └── archive.html         # 归档布局
├── _pages/                  # 页面内容
│   ├── about.md             # 关于页面
│   ├── publications.md      # 出版物页面
│   ├── teaching.md          # 教学页面
│   └── cv.md                # 简历页面
├── _posts/                  # 博客文章
├── _publications/           # 出版物条目
├── _teaching/              # 教学经历
├── _talks/                 # 演讲记录
├── _sass/                   # 样式文件
│   ├── _variables.scss      # 变量定义
│   ├── _base.scss           # 基础样式
│   ├── _navigation.scss     # 导航样式
│   └── _page.scss           # 页面样式
├── assets/                  # 静态资源
│   ├── css/                 # CSS文件
│   ├── js/                  # JavaScript文件
│   └── images/              # 图片资源
├── files/                   # 上传文件（PDF等）
└── images/                  # 图片资源
```

### 3.2 文件命名规范

#### Markdown 文件命名

```
# 页面文件
about.md                    # 关于页面
publications.md            # 出版物页面
contact.md                 # 联系页面

# 文章文件
YYYY-MM-DD-title.md        # 博客文章
2024-01-15-research-update.md

# 集合条目
publications/
├── 2024-zhang-paper1.md   # 年份-作者-标题
└── 2023-li-study.md
```

#### 图片文件命名

```
images/
├── profile.jpg             # 个人头像
├── research-project-1/     # 研究项目图片
│   ├── overview.png
│   ├── methodology.jpg
│   └── results.png
└── teaching/
    ├── course1-syllabus.pdf
    └── lecture-slides.pdf
```

### 3.3 最佳实践目录布局

#### 研究型学者推荐结构

```
├── _pages/
│   ├── about.md            # 个人简介
│   ├── research.md         # 研究方向
│   ├── publications.md     # 发表论文
│   ├── projects.md         # 研究项目
│   ├── teaching.md         # 教学经历
│   ├── talks.md            # 学术演讲
│   └── contact.md          # 联系方式
├── _publications/
│   ├── journals/           # 期刊论文
│   ├── conferences/        # 会议论文
│   └── preprints/          # 预印本
├── _projects/
│   ├── current/            # 当前项目
│   └── completed/          # 已完成项目
└── files/
    ├── cv.pdf              # 简历
    ├── research_statement.pdf
    └── teaching_statement.pdf
```

---

## 4. 页面导航系统设计教程

### 4.1 导航菜单实现方案

#### 顶部导航栏配置 (`_data/navigation.yml`)

```yaml
# Main navigation links
main:
  - title: "关于我"
    url: /about/
  
  - title: "研究方向"
    url: /research/
  
  - title: "发表论文"
    url: /publications/
  
  - title: "教学经历"
    url: /teaching/
  
  - title: "学术演讲"
    url: /talks/
  
  - title: "联系方式"
    url: /contact/

# Dropdown menu example
  - title: "更多"
    url: #
    children:
      - title: "项目展示"
        url: /portfolio/
      - title: "博客文章"
        url: /blog/
      - title: "简历下载"
        url: /files/cv.pdf
```

#### 响应式导航实现 (`_includes/masthead.html`)

```html
<nav class="greedy-nav">
  <button class="nav-toggle">
    <div class="navicon"></div>
  </button>
  <ul class="visible-links">
    <li class="masthead__menu-item masthead__menu-item--lg">
      <a href="{{ '/' | relative_url }}">{{ site.title }}</a>
    </li>
    {% for link in site.data.navigation.main %}
      <li class="masthead__menu-item">
        <a href="{{ link.url | relative_url }}">{{ link.title }}</a>
      </li>
    {% endfor %}
  </ul>
  <ul class="hidden-links hidden"></ul>
</nav>
```

### 4.2 侧边栏导航设计

#### 页面内导航 (`_includes/sidebar.html`)

```html
<aside class="sidebar__right">
  <nav class="toc">
    <header><h4 class="nav__title">页面导航</h4></header>
    <ul class="toc__menu">
      <li><a href="#education">教育背景</a></li>
      <li><a href="#experience">工作经历</a></li>
      <li><a href="#skills">专业技能</a></li>
      <li><a href="#contact">联系方式</a></li>
    </ul>
  </nav>
</aside>
```

#### 自动生成目录 (使用 Jekyll 插件)

```yaml
# _config.yml 配置
plugins:
  - jekyll-toc

# 在页面 front matter 中启用
toc: true
toc_label: "目录"
toc_icon: "list"
```

### 4.3 活动状态指示

#### CSS 高亮样式 (`_sass/_navigation.scss`)

```scss
.nav__list {
  .active {
    margin-left: -0.5em;
    padding-left: 0.5em;
    padding-right: 0.5em;
    color: #fff;
    font-weight: bold;
    background: $primary-color;
    border-radius: $border-radius;
  
    &:hover {
      color: #fff;
      background: darken($primary-color, 10%);
    }
  }
}

.masthead__menu-item {
  a {
    position: relative;
  
    &.current {
      color: $masthead-link-color-hover;
    
      &:before {
        content: "";
        position: absolute;
        left: 0;
        bottom: -2px;
        height: 2px;
        background: $primary-color;
        width: 100%;
      }
    }
  }
}
```

#### JavaScript 当前页面检测

```javascript
// assets/js/navigation.js
$(document).ready(function() {
  // 获取当前页面路径
  var currentPath = window.location.pathname;
  
  // 为匹配的导航链接添加 active 类
  $('.masthead__menu-item a').each(function() {
    var linkPath = $(this).attr('href');
    if (currentPath === linkPath) {
      $(this).addClass('current');
    }
  });
});
```

### 4.4 移动端适配方案

#### 响应式导航菜单 (`_sass/_navigation.scss`)

```scss
// 移动端导航样式
@include breakpoint($small) {
  .greedy-nav {
    .visible-links {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    
      &.is-visible {
        display: block;
      }
    }
  
    .nav-toggle {
      display: block;
    
      @include breakpoint($medium) {
        display: none;
      }
    }
  }
}
```

---

## 5. 排版规范与内容管理

### 5.1 全局样式定义

#### 主题变量配置 (`_sass/_variables.scss`)

```scss
/* Typography */
$global-font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", "Helvetica Neue", "Lucida Grande", Arial, sans-serif;
$header-font-family: $global-font-family;
$caption-font-family: $global-font-family;

/* Type Scale */
$type-size-1: 2.441em;   // ~39px
$type-size-2: 1.953em;   // ~31px
$type-size-3: 1.563em;   // ~25px
$type-size-4: 1.25em;    // ~20px
$type-size-5: 1em;       // ~16px
$type-size-6: 0.75em;     // ~12px
$type-size-7: 0.6875em;   // ~11px
$type-size-8: 0.625em;    // ~10px

/* Colors */
$primary-color: #3b7097;
$success-color: #3fa63f;
$warning-color: #d67f05;
$danger-color: #ee5f5b;
$info-color: #3b9cba;

/* Text Colors */
$text-color: #3d4144;
$muted-text-color: mix(#fff, $text-color, 40%);
$light-text-color: mix(#fff, $text-color, 70%);
```

#### 基础样式重置 (`_sass/_base.scss`)

```scss
/* Base element styles */
body {
  margin: 0;
  padding: $masthead-height 0 0;
  padding-bottom: 9em;
  color: $text-color;
  font-family: $global-font-family;
  line-height: 1.5;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin: 2em 0 0.5em;
  line-height: 1.2;
  font-family: $header-font-family;
  font-weight: bold;
}

h1 { font-size: $type-size-3; }
h2 { font-size: $type-size-4; }
h3 { font-size: $type-size-5; }
h4 { font-size: $type-size-6; }

/* Paragraphs */
p {
  margin-bottom: 1.3em;
}
```

### 5.2 内容区块划分

#### 页面布局结构 (`_layouts/default.html`)

```html
<!DOCTYPE html>
<html lang="{{ page.lang | default: site.lang | default: 'en' }}">
  {% include head.html %}
  <body>
    {% include masthead.html %}
  
    <div class="initial-content">
      {{ content }}
    </div>
  
    {% if site.search == true %}
      <div class="search-content">
        {% include search/search_form.html %}
      </div>
    {% endif %}
  
    <div class="page__footer">
      <footer>
        {% include footer.html %}
      </footer>
    </div>
  
    {% include scripts.html %}
  </body>
</html>
```

#### 内容区域样式 (`_sass/_page.scss`)

```scss
/* Page wrapper */
.page {
  @include breakpoint($large) {
    @include span(10 of 12 last);
    @include prefix(0.5 of 12);
    @include suffix(2 of 12);
  }
}

/* Page content */
.page__content {
  h2 {
    padding-bottom: 0.5em;
    border-bottom: 1px solid $border-color;
  }
  
  p, li, dl {
    font-size: 1em;
  }
  
  /* Links */
  a {
    text-decoration: underline;
  
    &:hover {
      text-decoration: underline;
    
      img {
        box-shadow: 0 0 10px rgba(#000, 0.25);
      }
    }
  }
}
```

### 5.3 响应式布局实现

#### 断点定义 (`_sass/_variables.scss`)

```scss
/* Breakpoint variables */
$small: 480px;
$medium: 768px;
$large: 1024px;
$x-large: 1280px;

/* Media query mixins */
@mixin breakpoint($break) {
  @if $break == small {
    @media screen and (min-width: $small) { @content; }
  }
  @else if $break == medium {
    @media screen and (min-width: $medium) { @content; }
  }
  @else if $break == large {
    @media screen and (min-width: $large) { @content; }
  }
  @else if $break == x-large {
    @media screen and (min-width: $x-large) { @content; }
  }
}
```

#### 响应式网格系统

```scss
/* Grid system */
.container {
  max-width: $x-large;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1em;
  padding-right: 1em;
  
  @include breakpoint($x-large) {
    max-width: $x-large;
  }
}

/* Responsive columns */
.sidebar {
  @include breakpoint($large) {
    @include span(2 of 12);
    opacity: 1;
  }
  
  @include breakpoint($x-large) {
    max-width: $sidebar-link-max-width;
  }
}
```

### 5.4 标准化配置

#### 间距系统 (`_sass/_utilities.scss`)

```scss
/* Spacing utilities */
.margin-top-0 { margin-top: 0; }
.margin-top-1 { margin-top: 1em; }
.margin-top-2 { margin-top: 2em; }
.margin-bottom-0 { margin-bottom: 0; }
.margin-bottom-1 { margin-bottom: 1em; }
.margin-bottom-2 { margin-bottom: 2em; }

.padding-top-0 { padding-top: 0; }
.padding-top-1 { padding-top: 1em; }
.padding-top-2 { padding-top: 2em; }
.padding-bottom-0 { padding-bottom: 0; }
.padding-bottom-1 { padding-bottom: 1em; }
.padding-bottom-2 { padding-bottom: 2em; }
```

#### 颜色主题配置

```scss
/* Color utilities */
.text-primary { color: $primary-color; }
.text-success { color: $success-color; }
.text-warning { color: $warning-color; }
.text-danger { color: $danger-color; }
.text-info { color: $info-color; }

.bg-primary { background-color: $primary-color; }
.bg-success { background-color: $success-color; }
.bg-warning { background-color: $warning-color; }
.bg-danger { background-color: $danger-color; }
.bg-info { background-color: $info-color; }
```

---

## 6. 本地开发环境配置

### 6.1 环境要求

#### 系统依赖

- **Ruby**: 2.7 或更高版本
- **Node.js**: 14.0 或更高版本
- **Bundler**: Ruby 包管理器
- **Git**: 版本控制

#### 安装命令

```bash
# Ubuntu/Debian
sudo apt install ruby-dev ruby-bundler nodejs git build-essential

# macOS
brew install ruby node git

# Windows (使用 WSL)
wsl --install
sudo apt install ruby-dev ruby-bundler nodejs git build-essential
```

### 6.2 本地服务器启动

#### 基本启动命令

```bash
# 安装依赖
bundle install

# 启动本地服务器
bundle exec jekyll serve

# 带选项的启动
bundle exec jekyll serve --host 0.0.0.0 --port 4000 --livereload
```

#### 开发模式配置

```yaml
# _config.yml 开发配置
url: "http://localhost:4000"
baseurl: ""

plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag
  - jekyll-admin  # 可选：Web管理界面
```

---

## 7. 部署与维护

### 7.1 GitHub Pages 部署

#### 自动部署配置

1. 推送代码到 `main` 分支
2. GitHub Actions 自动构建
3. 访问 `https://[username].github.io`

#### 部署状态检查

- 绿色勾选: 构建成功
- 橙色圆圈: 构建中
- 红色叉号: 构建失败

### 7.2 常见问题解决

#### 构建失败排查

```bash
# 本地构建测试
bundle exec jekyll build --verbose

# 检查配置文件语法
ruby -c _config.yml

# 清理缓存
bundle exec jekyll clean
```

#### 性能优化建议

1. **图片优化**: 压缩图片，使用 WebP 格式
2. **缓存配置**: 启用浏览器缓存
3. **CDN 使用**: 使用 jsDelivr 等 CDN
4. **代码压缩**: 启用 HTML/CSS/JS 压缩


## 8. paper具体贡献

实现概述

1. 创建数据文件 _data/papers.yml

这是维护论文信息的核心文件，包含以下字段：

- id: 唯一标识符
- authors: 作者列表（用 <u> 标记你的贡献）
- title: 论文标题
- venue: 期刊/会议名称
- date: 发布日期
- contribution: 详细贡献描述
- pdf_url: PDF 下载链接
- github_url: GitHub 代码仓库链接
- doi: DOI 链接



支持的链接格式

1. 本地文件（使用 files/ 目录）：
   pdf_url: "files/DATE26_RAG_EVALUATION.pdf"
2. 外部链接（任意 URL）：
   pdf_url: "https://arxiv.org/pdf/xxxx.xxxxx.pdf"
   pdf_url: "https://ieeexplore.ieee.org/document/xxxxx"
   pdf_url: "https://github.com/username/repo/raw/main/paper.pdf"

已配置的论文

- MAEDA (DATE 2026): files/DATE26_RAG_EVALUATION.pdf
- SAM-DRA-UNet (ICIC 2025): files/SAM-DRA-UNet.pdf

使用示例

如果需要添加外部链接，只需填写完整 URL：

pdf_url: "https://arxiv.org/pdf/2301.00000.pdf"
github_url: "https://github.com/your-username/your-repo"
doi: "https://doi.org/10.xxxx/xxxxx"

模板会自动检测链接类型并正确处理，本地链接会相对于网站根路径解析，外部链接会直接跳转。

2. 创建 JavaScript assets/js/paper-details.js

- 实现复选框切换功能
- 使用 localStorage 保存用户偏好设置
- 默认隐藏详细信息，勾选后显示

3. 创建样式文件 _sass/_paper-details.scss

- 复选框样式
- 详细信息区域样式
- 链接按钮样式（PDF、Code、DOI）

4. 更新 _pages/publications.md

- 添加复选框控件
- 从 YAML 数据文件读取论文信息
- 按年份分组显示
- 仅当复选框被勾选时显示详细信息

5. 更新配置文件

- assets/css/main.scss: 导入新样式
- _includes/scripts.html: 加载 JavaScript

使用方法

1. 添加新论文: 编辑 _data/papers.yml，添加新的论文条目
2. 更新贡献: 在 YAML 文件中修改 contribution 字段
3. 添加链接: 填写 pdf_url 和 github_url 字段

效果

- 默认状态: 只显示论文标题、作者和会议信息（与原来一样）
- 勾选后: 显示每个论文的详细贡献、PDF 下载链接、GitHub 代码链接和 DOI 链接
- 记忆功能: 用户的选择会被保存，刷新页面后保持设置

要测试效果，请运行：
bundle install
bundle exec jekyll serve

然后访问 http://localhost:4000/publications/


---

## 📚 相关资源

- [官方文档](https://academicpages.github.io/)
- [Jekyll 文档](https://jekyllrb.com/docs/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [主题 GitHub 仓库](https://github.com/academicpages/academicpages.github.io)

---

<div align="center">

![pages-build-deployment](https://github.com/academicpages/academicpages.github.io/actions/workflows/pages/pages-build-deployment/badge.svg)
[![GitHub contributors](https://img.shields.io/github/contributors/academicpages/academicpages.github.io.svg)](https://github.com/academicpages/academicpages.github.io/graphs/contributors)
[![GitHub release](https://img.shields.io/github/v/release/academicpages/academicpages.github.io)](https://github.com/academicpages/academicpages.github.io/releases/latest)
[![GitHub license](https://img.shields.io/github/license/academicpages/academicpages.github.io?color=blue)](https://github.com/academicpages/academicpages.github.io/blob/master/LICENSE)

[![GitHub stars](https://img.shields.io/github/stars/academicpages/academicpages.github.io)](https://github.com/academicpages/academicpages.github.io)
[![GitHub forks](https://img.shields.io/github/forks/academicpages/academicpages.github.io)](https://github.com/academicpages/academicpages.github.io/fork)

</div>
