# Vite 学习笔记：从零搞懂现代前端构建工具

> 更新时间：2026-06-28（新增"生产构建产物 dist 与部署"章节）| 适用版本：Vite 5.x

---

## 一、Vite 是什么？为什么需要它？

### 1.1 一句话解释

Vite（法语"快"的意思，读作 /vit/）是一个**前端构建工具**，由 Vue.js 的作者尤雨溪创建。它的核心目标是：**开发时启动极快，生产时打包极优**。

### 1.2 没有 Vite 之前，我们经历了什么痛苦？

想象你搬进一个新家，webpack 就像那种"把所有家具先全部组装好，才让你进屋"的搬家公司：

```
你的项目有 500 个模块
         ↓
webpack 启动时：全部打包成 bundle.js（耗时 30s~几分钟）
         ↓
打包完成，浏览器才能看到页面
```

**痛点：**
- 项目越大，启动越慢（大型项目动辄 30 秒以上）
- 改一行代码，热更新也要等好几秒
- 开发者等启动等到怀疑人生

### 1.3 Vite 怎么解决的？——"按需加载"思路

Vite 就像一个聪明的管家：

```
Vite 启动时：什么都不打包，直接启动服务器（毫秒级）
         ↓
浏览器请求哪个模块，Vite 就实时编译哪个模块
         ↓
页面秒开！
```

**类比理解：**

| | webpack 的做法 | Vite 的做法 |
|--|--|--|
| 比喻 | 食堂一次做好 100 份盒饭再开饭 | 自助餐，你点什么厨师做什么 |
| 启动速度 | 慢（要等全部做完） | 快（秒开） |
| 大项目 | 越来越慢 | 几乎不受影响 |

---

## 二、核心概念（必背）

### 2.1 三大核心机制

```
┌─────────────────────────────────────────────────────┐
│                    Vite 架构                        │
│                                                     │
│  开发环境                生产环境                    │
│  ┌──────────────┐       ┌──────────────────┐        │
│  │ 原生 ESM     │       │ Rollup 打包       │        │
│  │ 按需编译     │       │ 代码压缩/拆分     │        │
│  │ esbuild 预构建│       │ Tree-shaking      │        │
│  └──────────────┘       └──────────────────┘        │
│                                                     │
│  共同能力：HMR（热模块替换）                         │
└─────────────────────────────────────────────────────┘
```

### 2.2 概念一：原生 ESM（ES Modules）

**是什么：** 现代浏览器原生支持 `import/export`，Vite 利用这个特性，不做打包，让浏览器自己去请求模块。

```javascript
// 传统 webpack：先把所有 import 打包成一个文件
// Vite 开发模式：浏览器直接发起请求
// 你在代码里写：
import { createApp } from 'vue'

// 浏览器实际请求的是：
// GET /node_modules/.vite/deps/vue.js?v=d12e8f
```

**关键点：** Vite 会预构建（pre-bundle）第三方依赖（如 vue、react），因为这些库通常不是 ESM 格式，用 **esbuild**（Go 语言写的，比 JS 快 10-100 倍）快速转换。

### 2.3 概念二：Rollup 生产构建

开发环境用 ESM 没问题，但生产环境不能这么玩（太多 HTTP 请求会慢）。所以 Vite 在生产构建时用 **Rollup** 来打包：

```
生产构建流程：
源代码 → Rollup 打包 → Tree-shaking → 代码压缩 → 拆分 chunk → 输出 dist/
```

**为什么开发用 ESM，生产用 Rollup？**

| 阶段 | 目标 | 工具选择 | 原因 |
|--|--|--|--|
| 开发 | 快启动、快更新 | 原生 ESM + esbuild | 按需加载，不打包 |
| 生产 | 小体积、高性能 | Rollup | 成熟的打包优化 |

### 2.4 概念三：HMR（热模块替换）

**是什么：** 改代码后，浏览器不刷新整页，只替换改动的那个模块，页面状态保留。

```javascript
// 你正在调一个按钮的样式
// 改了 color: red → color: blue
// HMR 只替换这个 CSS 模块，不重新加载整个页面
// 你在表单里填的数据还在！
```

**Vite HMR 为什么快？**

webpack 的 HMR：改一个模块 → 重新打包受影响的 chunk → 推给浏览器（链条长）
Vite 的 HMR：改一个模块 → 直接让浏览器重新请求这个模块（链条短，精准更新）

---

## 三、创建你的第一个 Vite 项目

### 3.1 命令行创建

```bash
# 方式一：交互式创建（推荐新手）
npm create vite@latest my-project

# 方式二：直接指定模板
npm create vite@latest my-react-app -- --template react
npm create vite@latest my-vue-app -- --template vue

# 方式三：用 yarn / pnpm
yarn create vite my-project
pnpm create vite my-project
```

### 3.2 可选模板一览

```
vanilla         → 纯 HTML/CSS/JS（学习用）
vanilla-ts      → 纯 TS 版本
vue             → Vue 3
vue-ts          → Vue 3 + TypeScript
react           → React
react-ts        → React + TypeScript
preact          → Preact（轻量 React 替代）
svelte          → Svelte
solid           → Solid.js
```

### 3.3 完整的启动流程

```bash
# 1. 创建项目
npm create vite@latest my-app -- --template react

# 2. 进入目录
cd my-app

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev
# 输出：Local: http://localhost:5173/

# 5. 构建生产版本
npm run build

# 6. 预览生产构建结果
npm run preview
```

---

## 四、项目结构详解

### 4.1 目录结构

```
my-app/
├── node_modules/        # 依赖包（不要提交到 git）
├── public/              # 静态资源（不会被处理，直接复制到 dist）
│   ├── favicon.ico
│   └── robots.txt
├── src/                 # 源代码（会被 Vite 处理）
│   ├── assets/          # 图片、字体等（会被 Vite 处理和优化）
│   ├── components/      # 组件
│   ├── App.jsx          # 根组件
│   ├── main.jsx         # 入口 JS
│   └── index.css        # 全局样式
├── index.html           # ⚡ HTML 入口文件（注意：在根目录！）
├── vite.config.js       # Vite 配置文件
├── package.json         # 项目配置
└── .gitignore
```

### 4.2 重点文件解读

#### `index.html` —— 为什么放在根目录？

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- 这个 script 标签是入口，Vite 从这里开始解析依赖 -->
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**注意 `type="module"`：** 告诉浏览器这个脚本是 ESM 模块，这是 Vite 整个"原生 ESM"思路的起点。

**为什么在根目录而不是 public/ 里？**
webpack 时代 HTML 模板藏在 public/ 或 src/ 里，Vite 认为 HTML 是项目的入口，理应放在根目录，更直观。

#### `public/` vs `src/assets/` 的区别

| | `public/` | `src/assets/` |
|--|--|--|
| 处理方式 | 原封不动复制到 dist | Vite 处理（hash 重命名、压缩等） |
| 引用方式 | 绝对路径 `/xxx.png` | `import` 导入 |
| 适合放什么 | favicon、robots.txt、不需要被 import 的大文件 | 组件里用到的图片、图标 |

```javascript
// ❌ public 里的文件不要 import
import logo from '/public/logo.png' // 错误用法

// ✅ public 里直接用绝对路径引用
<img src="/logo.png" />

// ✅ src/assets 里的文件用 import
import logo from './assets/logo.png'
<img src={logo} />
```

---

## 五、常用命令速查

```bash
# 创建项目
npm create vite@latest

# 启动开发服务器（默认端口 5173）
npm run dev
# 等价于：vite

# 指定端口和自动打开浏览器
npx vite --port 3000 --open

# 生产构建（输出到 dist/）
npm run build
# 等价于：vite build

# 预览生产构建（本地起个静态服务器看 dist/ 的效果）
npm run preview
# 等价于：vite preview

# 构建时指定模式
npx vite build --mode staging
```

**package.json 中默认脚本：**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 六、vite.config.js 配置详解

### 6.1 基础配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 插件
  plugins: [react()],

  // 路径别名（超实用！）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,          // 端口号
    open: true,          // 启动时自动打开浏览器
    host: true,          // 允许外网访问（局域网调试用）

    // 代理配置（解决跨域问题！面试高频）
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // 后端服务地址
        changeOrigin: true,               // 修改请求头 Origin
        rewrite: (path) => path.replace(/^\/api/, ''), // 去掉 /api 前缀
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',      // 输出目录
    assetsDir: 'assets', // 静态资源目录
    sourcemap: false,    // 生产环境关闭 sourcemap
    minify: 'terser',    // 压缩工具（可选 'esbuild' 或 'terser'）
  },
})
```

### 6.2 路径别名示例

配置了别名之后，import 变得超清爽：

```javascript
// 没有别名时（地狱）
import Button from '../../../components/Button'
import { formatDate } from '../../../../utils/date'

// 有别名后（天堂）
import Button from '@components/Button'
import { formatDate } from '@utils/date'
```

### 6.3 代理配置详解（解决跨域）

**问题场景：** 前端在 `localhost:5173`，后端在 `localhost:8080`，直接请求会跨域。

```javascript
// 前端代码这样写
fetch('/api/users')  // 请求 localhost:5173/api/users

// Vite 代理帮你转发
// 实际请求变成了：localhost:8080/users
// 浏览器看不到跨域，完美！
```

**多种代理写法：**

```javascript
proxy: {
  // 简单写法：所有 /api 开头的请求都转发
  '/api': 'http://localhost:8080',

  // 完整写法：带重写
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },

  // 多个后端服务
  '/user-api': {
    target: 'http://localhost:8081',
    changeOrigin: true,
  },
  '/order-api': {
    target: 'http://localhost:8082',
    changeOrigin: true,
  },
}
```

---

## 七、环境变量

### 7.1 .env 文件

Vite 支持多种环境文件，按优先级从低到高：

```
.env                # 所有模式都会加载
.env.local          # 所有模式都会加载，但被 git 忽略
.env.[mode]         # 只在指定模式下加载（如 .env.production）
.env.[mode].local   # 只在指定模式下加载，被 git 忽略
```

### 7.2 定义和使用环境变量

```bash
# .env.production
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=我的应用
DB_PASSWORD=secret123       # ❌ 没有 VITE_ 前缀，不会暴露给前端！
```

```javascript
// 在代码中使用
console.log(import.meta.env.VITE_API_URL)
// 生产环境输出：https://api.example.com

console.log(import.meta.env.VITE_APP_TITLE)
// 输出：我的应用

console.log(import.meta.env.DB_PASSWORD)
// undefined —— 没有 VITE_ 前缀的变量不会暴露（安全！）
```

### 7.3 内置环境变量

```javascript
import.meta.env.MODE    // 当前模式（'development' / 'production' / 自定义）
import.meta.env.DEV     // 是否开发模式（boolean）
import.meta.env.PROD    // 是否生产模式（boolean）
import.meta.env.SSR     // 是否 SSR 模式
import.meta.env.BASE_URL // vite.config.js 中配置的 base 路径
```

### 7.4 给 TypeScript 用户：类型声明

```typescript
// env.d.ts 或 vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**为什么要 `VITE_` 前缀？**

安全考虑！后端数据库密码、API 密钥等敏感信息不应该暴露到前端代码里。Vite 只把 `VITE_` 开头的变量注入到客户端代码，其他变量只在 Node.js 端（如 vite.config.js）可用。

---

## 八、常用插件

### 8.1 插件是什么？

插件就是 Vite 的"扩展包"，给 Vite 加技能点。比如支持 React JSX、支持自动导入 API、支持压缩图片等。

### 8.2 常用插件清单

```bash
# React 项目必备：支持 JSX 和 Fast Refresh
npm install -D @vitejs/plugin-react

# Vue 项目必备：支持 .vue 单文件组件
npm install -D @vitejs/plugin-vue

# 自动导入 Vue/React API（不用手动 import ref、useState 了）
npm install -D unplugin-auto-import

# 自动导入组件（不用手动 import 组件了）
npm install -D unplugin-vue-components

# 图片压缩
npm install -D vite-plugin-imagemin

# PWA 支持（离线缓存、安装到桌面）
npm install -D vite-plugin-pwa

# 生成 gzip/brotli 压缩包
npm install -D vite-plugin-compression

# 支持旧版浏览器（ polyfill ）
npm install -D @vitejs/plugin-legacy
```

### 8.3 插件使用示例

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    react(),

    // 自动导入 ref、computed、watch 等 API
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts',
    }),

    // 自动注册组件
    Components({
      dirs: ['src/components'],
      dts: 'src/components.d.ts',
    }),
  ],
})
```

**使用了 auto-import 之后的代码对比：**

```javascript
// 使用前（手动导入）
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

// 使用后（自动导入，直接写就行！）
const count = ref(0)
const double = computed(() => count.value * 2)
```

---

## 九、构建优化

### 9.1 代码分割（Code Splitting）

Vite 基于 Rollup，自动做代码分割，但你可以手动优化：

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 手动分 chunk
        manualChunks: {
          // 把 React 相关库打包成单独的 chunk
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 把工具库打包成单独的 chunk
          'vendor-utils': ['lodash-es', 'dayjs', 'axios'],
        },
        // 资源分类存放
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name.endsWith('.css')) return 'css/[name]-[hash].css'
          if (/\.(png|jpg|svg|gif)$/.test(info.name)) return 'images/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
```

### 9.2 懒加载路由（React 示例）

```jsx
// ❌ 全部同步导入（首屏加载所有页面）
import Home from './pages/Home'
import About from './pages/About'
import Dashboard from './pages/Dashboard'

// ✅ 懒加载（用到时才加载）
import { lazy, Suspense } from 'react'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

// 使用时配合 Suspense 显示 loading
<Suspense fallback={<div>加载中...</div>}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### 9.3 其他优化手段

```javascript
export default defineConfig({
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 小于 4KB 的资源内联为 base64（减少 HTTP 请求）
    assetsInlineLimit: 4096,

    // 生产环境关闭 sourcemap（减小体积 + 保护代码）
    sourcemap: false,

    // 使用 terser 压缩（比 esbuild 更彻底，但更慢）
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console 和 debugger
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
```

---

## 十、生产构建产物 dist 与部署（重点）

> 这一章回答三个核心问题：`npm run build` 之后生成的包在**哪个路径**、是**什么文件**、能不能**单独拿出来部署**、应该**怎么用**。

### 10.1 构建产物在哪？是什么文件形式？

执行 `npm run build` 后，Vite 会在**项目根目录**下生成一个 `dist/` 文件夹（默认名字，可在 `vite.config.js` 的 `build.outDir` 修改）。这就是生产环境的"包"。

```
my-app/
├── src/              ← 源代码（开发用，部署时不需要）
├── node_modules/     ← 依赖（开发用，部署时不需要）
├── dist/             ← ✅ 生产构建产物，部署的就是这个！
│   ├── index.html
│   ├── assets/
│   │   ├── index-a1b2c3d4.js     ← 打包压缩后的 JS（带 hash）
│   │   ├── index-e5f6a7b8.css    ← 打包压缩后的 CSS
│   │   ├── logo-9c8d7e6f.png     ← 图片等静态资源
│   │   └── vendor-react-1a2b3c.js ← 拆分出的第三方库 chunk
│   ├── favicon.ico                ← 从 public/ 原样复制过来的
│   └── vite.svg
├── index.html
├── package.json
└── vite.config.js
```

**文件形式说明：**

| 文件 | 作用 | 特点 |
|------|------|------|
| `index.html` | 唯一的 HTML 入口 | Vite 自动注入了 `<script>` 和 `<link>` 引用打包后的 JS/CSS |
| `assets/*.js` | 全部业务代码 + 第三方库打包压缩后的 JavaScript | 文件名带 hash（如 `index-a1b2c3d4.js`），用于缓存失效 |
| `assets/*.css` | 全部样式合并压缩后的 CSS | 同样带 hash |
| `assets/*.{png,jpg,svg,font}` | 图片、字体等资源 | 小于 4KB 的会被内联成 base64 |
| `favicon.ico` 等 | `public/` 目录原样复制过来的文件 | 不经过 Vite 处理 |

**关键认知：** `dist/` 里**只有静态文件**（HTML + JS + CSS + 图片），没有任何需要 Node.js 执行的东西。JS 已经是浏览器能直接跑的产物，不是源码。

### 10.2 能直接单独拿出来部署吗？——能，而且必须单独拿

**答案是：能，而且生产环境部署的就是 `dist/` 这一个目录，不需要带着原项目的 `src/`、`node_modules/`、`vite.config.js`。**

对比一下：

```
开发时需要的文件：              部署时需要的文件：
├── src/                ✅      ├── dist/          ← 只要这个
├── node_modules/       ✅      │   ├── index.html
├── index.html          ✅      │   └── assets/
├── vite.config.js      ✅      
├── package.json        ✅      
├── .env                ✅      
└── dist/               ✅      
```

**为什么能单独部署？**

Vite 用 Rollup 把所有 `import` 的模块（包括 `node_modules` 里的 React、Vue 等）**全部打包进了 `dist/assets/*.js`** 里。部署后浏览器加载这几个 JS 文件就够用了，根本不需要再访问 `node_modules`。这就是"打包"的本质——**把分散的依赖收敛成几个独立文件**。

> 类比：开发时像在厨房做菜（食材=源码，调料=node_modules），打包像把菜做好装盒。部署时你只需要送外卖盒（dist），不用把整个厨房搬过去。

### 10.3 怎么使用这个包？三种常见部署方式

#### 方式一：本地快速预览（验证构建是否正确）

```bash
# 在项目目录下，用 Vite 内置的预览服务器跑 dist
npm run preview
# 等价于：vite preview
# 默认地址：http://localhost:4173/

# 指定端口
npx vite preview --port 8080
```

> 注意：`npm run preview` 只是本地预览用，**不能用于生产**。它依赖项目目录（要能找到 dist），且性能、安全都不达标。

#### 方式二：用任意静态文件服务器（最通用）

因为 `dist/` 就是纯静态文件，**任何能托管静态文件的服务器都能部署**。把 `dist/` 整个目录拷过去即可。

**用 Python 起静态服务器（临时测试最快）：**

```bash
# 进入 dist 目录
cd dist

# Python 3
python -m http.server 8080
# 访问 http://localhost:8080
```

**用 Nginx（生产标配）：**

把 `dist/` 里的内容拷到 Nginx 的 html 根目录，例如 `/usr/share/nginx/html/`，然后配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /usr/share/nginx/html;     # 指向 dist 内容所在目录
    index index.html;

    # ⚠️ SPA 路由回退（关键！见 10.4 解释）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源长缓存（因为文件名带 hash，内容变了 hash 就变）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 方式三：上传到静态托管平台（零配置）

`dist/` 可以直接上传到任何静态托管平台：

| 平台 | 做法 |
|------|------|
| **Vercel** | 连接 Git 仓库，自动识别 Vite，构建后自动部署 dist |
| **Netlify** | 同上，构建命令填 `npm run build`，发布目录填 `dist` |
| **GitHub Pages** | 把 dist 内容推到 `gh-pages` 分支 |
| **腾讯云 COS / 阿里云 OSS** | 开启静态网站托管，上传 dist 内全部文件 |
| **Cloudflare Pages** | 连接仓库，指定 `dist` 为输出目录 |

### 10.4 部署时的三个关键坑（必看）

#### 坑1：SPA 路由 404（最常见）

**现象：** 首页 `https://example.com/` 能打开，但刷新 `https://example.com/about` 就 404。

**原因：** 你用了 React Router / Vue Router 的 history 模式，`/about` 是前端路由，但服务器收到这个请求会去找 `/about` 这个文件，找不到就 404。

**解决：** 配置服务器把所有未知路径都回退到 `index.html`，让前端路由接管。

```nginx
# Nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```apache
# Apache (.htaccess 放在 dist 根目录)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

> 如果用 hash 路由（`/#/about`），就不会有这个问题，但 URL 不太好看。

#### 坑2：资源路径 404（base 配置）

**现象：** 部署后页面空白，控制台报 `GET /assets/index-xxx.js 404`。

**原因：** 默认 Vite 假设部署在域名根路径 `/`，所以 `index.html` 里引用的是 `/assets/xxx.js`（绝对路径）。如果你部署在子路径（如 `https://example.com/my-app/`），就会 404。

**解决：** 构建前在 `vite.config.js` 配置 `base`：

```javascript
export default defineConfig({
  base: '/my-app/',    // 末尾斜杠不能少
  // ...
})
```

然后重新 `npm run build`，产出的 `index.html` 引用会变成 `/my-app/assets/xxx.js`。

> 如果部署在根路径，`base` 用默认的 `/` 就行，不用配。

#### 坑3：缓存导致更新不生效

**现象：** 发了新版本，用户看到的还是旧页面。

**原因：** 浏览器缓存了旧的 JS/CSS。

**解决：** Vite 默认就处理好了——打包产物文件名带 hash（`index-a1b2c3d4.js`），内容变 hash 就变，等于自动换文件名。所以**静态资源可以放心长缓存**，但 `index.html` 必须**不缓存**（因为它引用的 JS 文件名会变）。

```nginx
# index.html 不缓存
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# 带 hash 的静态资源长缓存
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 10.5 一句话流程总结

```
开发完代码
    ↓
npm run build           ← 触发 Rollup 打包
    ↓
生成 dist/ 目录          ← 这就是生产包，纯静态文件
    ↓
把 dist/ 内容拷到服务器  ← 不需要 src、node_modules、package.json
    ↓
用 Nginx / 静态托管服务  ← 配好 SPA 回退和缓存策略
    ↓
用户访问 index.html      ← 浏览器加载 assets 里的 JS/CSS，页面跑起来
```

**核心记忆点：**
1. 产物路径：项目根目录下的 `dist/`
2. 文件形式：纯静态文件（HTML + JS + CSS + 资源），JS/CSS 文件名带 hash
3. 能否单独部署：**能，而且必须单独部署**，不依赖原项目的任何其他文件
4. 部署方式：任何能托管静态文件的服务都行（Nginx、Vercel、OSS、GitHub Pages 等）
5. 三个坑：SPA 路由回退、base 路径、缓存策略

---

## 十一、面试回答（面试必背）

### 问题 1：Vite 为什么比 webpack 快？

**回答模板：**

> Vite 快的核心原因是**开发环境和生产环境采用了不同的策略**。
>
> **开发环境**下，Vite 不做打包，而是利用浏览器原生 ESM 支持，按需编译请求到的模块。比如页面只用到 10 个模块，Vite 就只编译这 10 个，而不是像 webpack 那样把所有模块先全部打包再启动。同时对于第三方依赖（如 React、Vue），Vite 使用 esbuild 做预构建，esbuild 用 Go 编写，速度比 JavaScript 写的打包工具快 10~100 倍。
>
> **生产环境**下，Vite 使用 Rollup 打包，Rollup 在 Tree-shaking 和代码优化方面非常成熟，产出的代码体积小、性能好。
>
> 另外 Vite 的 HMR 也更快，因为只需要精确更新改动的模块，不需要重新计算整个依赖图。

### 问题 2：Vite 的开发服务器和生产构建有什么区别？

**回答模板：**

> 这是两个完全不同的机制：
>
> - **开发服务器（vite dev）**：基于原生 ESM，不做打包，按需编译；用 esbuild 预构建第三方库；通过 WebSocket 实现 HMR。目标是快速启动和快速热更新。
>
> - **生产构建（vite build）**：使用 Rollup 进行完整打包，做 Tree-shaking、代码压缩、代码分割等优化。目标是产出体积小、性能好的静态资源。
>
> 之所以分两套，是因为开发和生产的需求不同——开发要速度，生产要优化。webpack 用一套流程同时服务两个场景，导致大项目开发体验差。

### 问题 3：Vite 中怎么配置代理解决跨域？

**回答模板：**

> 在 vite.config.js 的 `server.proxy` 中配置。比如前端请求 `/api/users`，配置代理把 `/api` 前缀的请求转发到 `http://localhost:8080`，并设置 `changeOrigin: true` 修改请求头。这样浏览器发出的请求是同源的，由 Vite 服务端代理转发到真实后端，绕过了跨域限制。如果需要去掉 `/api` 前缀，还可以配置 `rewrite` 函数。

### 问题 4：`npm run build` 之后怎么部署？

**回答模板：**

> `npm run build` 会在项目根目录生成 `dist/` 目录，里面是纯静态文件：一个 `index.html`（被 Vite 注入了打包后 JS/CSS 的引用）和 `assets/` 目录（含带 hash 的 JS、CSS、图片等）。这些文件**完全独立**，不依赖 `src/`、`node_modules/` 或任何 Node 环境，因为 Rollup 已经把所有依赖打包进了 `assets/*.js`。
>
> 部署时只需把 `dist/` 内容拷到任意静态文件服务器（Nginx、Vercel、OSS、GitHub Pages 等）。关键要配三点：一是 SPA 路由回退（`try_files $uri $uri/ /index.html`），避免刷新子路由 404；二是若部署在子路径要配置 `base`；三是 `index.html` 不缓存、带 hash 的静态资源长缓存。

---

## 十二、深入追问（进阶理解）

### 追问 1：Vite 的依赖预构建是什么？为什么要做？

**解答：**

第三方包（如 lodash、react）发布到 npm 时，可能是 CommonJS 或 UMD 格式，不是 ESM。浏览器只认 ESM，所以 Vite 在首次启动时，用 esbuild 把这些依赖转换成 ESM 格式，并合并成单个文件（减少请求数）。

预构建的结果缓存在 `node_modules/.vite/deps/` 目录下：

```
node_modules/.vite/deps/
├── _metadata.json        # 依赖信息
├── react.js              # 预构建后的 react
├── react-dom.js          # 预构建后的 react-dom
└── chunk-XXXXX.js        # 共享 chunk
```

**什么时候需要重新预构建？**
- 新增/删除依赖时
- `package-lock.json` 变化时
- 手动删除 `node_modules/.vite` 后重启

### 追问 2：Vite 的 HMR 具体怎么工作的？

**解答：**

```
开发者修改文件
    ↓
Vite 服务端检测到文件变化
    ↓
确定受影响的模块边界（HMR Boundary）
    ↓
通过 WebSocket 通知浏览器
    ↓
浏览器重新请求该模块（带上时间戳参数避免缓存）
    ↓
执行模块的 import.meta.hot.accept() 回调
    ↓
只更新改动部分，保留应用状态
```

**和 webpack HMR 的核心区别：**
- webpack：修改模块 → 向上冒泡到入口 → 重新打包 chunk → 替换（链条长）
- Vite：修改模块 → 直接让浏览器重新 fetch 该模块（链条短，ESM 天然支持）

### 追问 3：Vite 能支持 CommonJS 的模块吗？

**解答：**
可以。对于依赖包，Vite 在预构建阶段用 esbuild 把 CommonJS 转为 ESM。对于项目源码中的 `.cjs` 文件，Vite 也能处理。但推荐项目源码尽量用 ESM（`import/export`），因为这是未来趋势。

---

## 十三、易混淆点

### 易混淆点 1：Vite vs webpack

| 对比项 | Vite | webpack |
|--|--|--|
| 开发启动 | 毫秒级（不打包） | 秒~分钟（全量打包） |
| HMR 速度 | 快（精准替换） | 慢（链条长） |
| 生产构建 | Rollup | webpack 自身 |
| 配置量 | 少（开箱即用） | 多（需要大量 loader/plugin） |
| 生态成熟度 | 快速增长中 | 非常成熟，插件海量 |
| 学习曲线 | 低 | 高 |
| 适用场景 | 新项目首选 | 老项目维护、特殊需求 |

**一句话总结：** Vite 是"为 ESM 时代设计的"，webpack 是"为打包时代设计的"。

### 易混淆点 2：`vite dev` vs `vite build` 的差异

| 对比项 | `vite dev`（开发） | `vite build`（生产） |
|--|--|--|
| 底层工具 | esbuild + 原生 ESM | Rollup |
| 是否打包 | 不打包 | 打包 |
| 输出目录 | 无（实时编译） | dist/ |
| HMR | 有 | 无 |
| import.meta.env.DEV | true | false |
| import.meta.env.PROD | false | true |
| CSS 处理 | 内联注入 | 提取成独立文件 |

**面试陷阱：** 有人以为 Vite 生产构建也用 ESM 不打包，这是**错误**的！生产环境一定打包，用的是 Rollup。

### 易混淆点 3：`public/` vs `src/assets/`

| 对比项 | `public/` | `src/assets/` |
|--|--|--|
| 是否被 Vite 处理 | 不处理，原样复制 | 处理（hash 命名、压缩） |
| 引用方式 | 绝对路径 `/xxx` | `import xxx from '...'` |
| 构建后位置 | dist/ 根目录 | dist/assets/ |
| 可以做 tree-shaking | 不可以 | 不用就排除 |
| 典型用途 | favicon、robots.txt | 组件图片、图标 |

### 易混淆点 4：部署时需要哪些文件？dist 还是整个项目？

| 文件/目录 | 开发时需要 | 部署时需要 | 说明 |
|--|--|--|--|
| `dist/` | ❌（构建后才生成） | ✅ **只要这个** | 生产构建产物，纯静态文件 |
| `src/` | ✅ | ❌ | 源代码，已打包进 dist |
| `node_modules/` | ✅ | ❌ | 依赖已打包进 dist |
| `index.html`（根目录） | ✅ | ❌ | 模板，构建后 dist 里有处理过的版本 |
| `vite.config.js` | ✅ | ❌ | 构建配置，只在打包时用 |
| `package.json` | ✅ | ❌ | 只在构建时用（除非部署后还要跑 Node 服务） |

**一句话记忆：** 部署 = 把 `dist/` 内容拷到服务器，完事。其他全是开发期的东西。

### 易混淆点 5：`esbuild` vs `Rollup` 在 Vite 中的角色

```
esbuild：
├── 依赖预构建（把第三方包转 ESM）
├── TypeScript 转译（开发时的 .ts → .js）
└── 生产构建中的 CSS 和 JS 压缩（可选）

Rollup：
├── 生产环境的完整打包
├── Tree-shaking
├── 代码分割
└── 产物优化
```

**简单记：** esbuild 管"快"（预构建、转译），Rollup 管"优"（生产打包）。

---

## 附：完整 vite.config.js 参考模板

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 插件
  plugins: [react()],

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  // 开发服务器
  server: {
    port: 3000,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // 构建优化
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['lodash-es', 'axios'],
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name.endsWith('.css')) return 'css/[name]-[hash].css'
          if (/\.(png|jpg|svg|gif|webp)$/.test(info.name)) return 'images/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
```

---

## 附：速记口诀

```
Vite 快在开发不打包，ESM 按需来加载；
esbuild 预构建依赖，Go 写的就是快；
生产 Rollup 来上阵，Tree-shake 加压缩；
开发生产两条路，又快又好两不误。
```

---

> 学习建议：先跟着"创建项目"部分动手跑一遍，再回来看配置和优化。面试重点回答"为什么快"和"开发/生产双引擎"这两个核心点。
