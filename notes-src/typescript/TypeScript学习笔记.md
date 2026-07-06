# TypeScript 学习笔记：给 JavaScript 加上类型

> 更新时间：2026-06-28 | 适用版本：TypeScript 5.x
> 状态：学习笔记（零基础入门版），踩坑记录待实际使用后补充
> 读者背景：没接触过 TS，建议先了解一点 JS 基础概念（变量、函数）

---

## 一、TypeScript 是什么？

### 1.1 一句话解释

**TypeScript（TS）** 是 JavaScript 的**超集**，给 JS 加上了**静态类型系统**。所有合法的 JS 代码都是合法的 TS 代码，TS 额外允许你写类型注解，编译后变成普通 JS 运行。

```
TypeScript = JavaScript + 静态类型 + 一些语法糖（接口、泛型、枚举等）
```

### 1.2 为什么需要 TS？—— JS 的痛点

JavaScript 是**动态弱类型**语言，变量类型运行时才确定：

```javascript
// JS：这段代码能跑，但运行时才报错
function add(a, b) {
    return a + b;
}
add(1, 2);          // 3
add("1", 2);        // "12"（字符串拼接，不是数学加法！）
add(1, "2", 3);     // "12"，第三个参数被忽略
```

**痛点**：
- 函数参数没类型，传错也不报错，运行时才崩
- 重构时不知道改了某个字段会影响哪里
- IDE 智能提示弱，只能猜
- 大型项目维护困难

### 1.3 TS 怎么解决的——编译期类型检查

```typescript
// TS：写代码时就报错
function add(a: number, b: number): number {
    return a + b;
}
add(1, 2);          // ✅
add("1", 2);        // ❌ 编译报错：string 不能赋给 number
add(1, "2", 3);     // ❌ 报错：参数数量不对
```

**核心价值**：**把运行时才暴露的 bug，提前到写代码（编译）时发现**。

### 1.4 TS ≠ 新语言，是 JS 的"类型外挂"

```
写 .ts 代码 → tsc 编译器 → 去掉类型注解 → 生成 .js → 浏览器/Node 运行
```

**关键认知**：
- 浏览器和 Node **不认识 TS**，只认 JS
- TS 代码必须先编译成 JS 才能跑
- 编译过程会做**类型检查**，类型错误编译失败（或警告）
- 编译产物是**纯 JS**，类型信息全部被擦除

### 1.5 TS 在生态中的位置

| 语言 | 类型 | 运行环境 | 用途 |
|------|------|----------|------|
| JavaScript | 动态弱类型 | 浏览器 / Node | Web 前端、Node 后端 |
| **TypeScript** | 静态强类型（编译期） | 编译成 JS 后运行 | 大型 Web 项目首选 |
| Flow | 静态类型（JS 检查器） | 浏览器 / Node | 已基本被 TS 取代 |
| Dart | 静态类型 | 编译成 JS / 原生 | Flutter |

**主流前端框架对 TS 的支持**：
- React：官方支持，create-react-app 可选 TS 模板
- Vue 3：源码用 TS 重写，TS 支持一流
- Angular：强制使用 TS
- Vite：开箱即用支持 TS（见 `frontend/Vite学习笔记.md`）

---

## 二、安装与第一个程序

### 2.1 安装

```bash
# 全局装（学习用）
npm install -g typescript

# 或项目内装（推荐）
npm install -D typescript

# 检查版本
tsc --version       # Version 5.x.x
```

### 2.2 第一个 TS 程序

新建 `hello.ts`：

```typescript
function greet(name: string): string {
    return `Hello, ${name}`;
}
console.log(greet("World"));
```

**编译并运行**：

```bash
# 编译成 JS
tsc hello.ts
# 生成 hello.js

# 运行
node hello.js

# 或一步到位（用 ts-node，开发用）
npx ts-node hello.ts
```

**生成的 `hello.js`**（注意类型注解被擦掉了）：

```javascript
function greet(name) {
    return `Hello, ${name}`;
}
console.log(greet("World"));
```

### 2.3 tsconfig.json（项目配置）

```bash
# 生成配置文件
tsc --init
```

`tsconfig.json` 关键配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",              // 编译成哪个 JS 版本
    "module": "ESNext",              // 模块系统
    "strict": true,                  // 严格模式（推荐开）
    "esModuleInterop": true,         // 兼容 CommonJS import
    "skipLibCheck": true,            // 跳过依赖库类型检查（加速）
    "outDir": "./dist",              // 编译输出目录
    "rootDir": "./src",              // 源码目录
    "jsx": "react-jsx",              // React 项目用
    "baseUrl": ".",                  // 路径解析基准
    "paths": {
      "@/*": ["src/*"]               // 路径别名
    }
  },
  "include": ["src"]
}
```

> **Vite 项目不用手动配 tsc**：Vite 用 esbuild 直接处理 TS，开箱即用。tsconfig.json 主要给 IDE 和类型检查用。

---

## 三、基础类型（必背）

### 3.1 原始类型

```typescript
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let n: null = null;
let u: undefined = undefined;
let big: bigint = 100n;
let sym: symbol = Symbol();
```

### 3.2 数组

```typescript
// 两种写法等价
let arr1: number[] = [1, 2, 3];
let arr2: Array<number> = [1, 2, 3];

// 混合类型（不推荐，用元组替代）
let mixed: (number | string)[] = [1, "a", 2];
```

### 3.3 元组（Tuple）

固定长度、固定类型的数组：

```typescript
let tuple: [string, number] = ["tom", 25];
tuple[0];    // string
tuple[1];    // number
```

### 3.4 any / unknown / never

| 类型 | 含义 | 使用建议 |
|------|------|----------|
| `any` | 任意类型，**跳过类型检查** | ❌ 尽量别用，等于回到 JS |
| `unknown` | 任意类型，但**用前必须类型收窄** | ✅ 替代 any 的安全版 |
| `never` | 永不出现的值（抛错、死循环） | 用于穷举检查 |

```typescript
let a: any = 1;
a = "x";          // 不报错（危险）
a.foo();          // 不报错（运行时崩）

let b: unknown = getData();
b.foo();          // ❌ 报错：unknown 不能直接用
if (typeof b === "string") {
    b.toUpperCase();   // ✅ 收窄后能用
}
```

### 3.5 联合类型与字面量类型

```typescript
// 联合类型：可以是多种类型之一
let id: number | string;
id = 1;
id = "abc";

// 字面量类型：只能是特定值
let status: "open" | "close";
status = "open";    // ✅
status = "pending"; // ❌

// 数字字面量
let dice: 1 | 2 | 3 | 4 | 5 | 6;
```

### 3.6 枚举（enum）

```typescript
enum Color {
    Red,
    Green,
    Blue,
}
let c: Color = Color.Green;     // 1

enum Status {
    Pending = "PENDING",
    Success = "SUCCESS",
    Failed = "FAILED",
}
let s: Status = Status.Success;  // "SUCCESS"
```

> 枚举会编译成真实 JS 代码（有运行时开销）。替代方案是用**联合字面量类型**（更轻量）：
> ```typescript
> type Status = "PENDING" | "SUCCESS" | "FAILED";
> ```

---

## 四、对象类型：interface vs type

### 4.1 描述对象形状

```typescript
// interface 写法
interface User {
    id: number;
    name: string;
    age?: number;            // ? 表示可选
    readonly email: string;  // readonly 表示只读
}

// type 写法（等价）
type User = {
    id: number;
    name: string;
    age?: number;
    readonly email: string;
};

const u: User = {
    id: 1,
    name: "tom",
    email: "tom@x.com",
    // age 可不写
};
u.email = "new@x.com";    // ❌ readonly 不能改
```

### 4.2 interface vs type 怎么选

| | interface | type |
|--|--|--|
| 描述对象 | ✅ 推荐 | 可以 |
| 描述联合/交叉类型 | ❌ 不行 | ✅ |
| 扩展（继承） | `extends` | `&` 交叉 |
| 重复定义 | 自动合并 | 报错 |

**经验法则**：描述对象/类用 `interface`，描述联合、交叉、工具类型用 `type`。两者大部分场景可互换。

### 4.3 继承与组合

```typescript
interface Animal {
    name: string;
}

interface Dog extends Animal {
    bark(): void;
}

// 交叉类型（type 用 &）
type Pet = Animal & { owner: string };
```

---

## 五、函数类型

### 5.1 函数声明

```typescript
// 参数类型 + 返回类型
function add(a: number, b: number): number {
    return a + b;
}

// 箭头函数
const add = (a: number, b: number): number => a + b;

// 可选参数与默认值
function greet(name: string, greeting?: string): string {
    return `${greeting || "Hello"}, ${name}`;
}

function greet(name: string, greeting: string = "Hello"): string {
    return `${greeting}, ${name}`;
}
```

> **可选参数必须在必填参数后面**。`greeting?: string` 等价于 `greeting: string | undefined`。

### 5.2 函数类型表达式

```typescript
// 定义函数类型
type AddFn = (a: number, b: number) => number;

const add: AddFn = (a, b) => a + b;   // 参数类型可省略，自动推导
```

### 5.3 剩余参数

```typescript
function sum(...nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3);    // 6
```

---

## 六、泛型（Generics）

### 6.1 为什么需要泛型

```typescript
// 不用泛型：要么丢类型，要么写一堆重载
function identity(value: any): any {
    return value;       // 类型信息丢了
}

// 用泛型：保留类型关系
function identity<T>(value: T): T {
    return value;
}
identity<string>("hello");    // 返回 string
identity(42);                  // 自动推导 T = number，返回 number
```

**泛型 = 类型的"参数"**。把类型当变量传进去，让函数/接口能适配多种类型且保留类型信息。

### 6.2 泛型接口与类

```typescript
// 泛型接口
interface Box<T> {
    value: T;
}
const box1: Box<string> = { value: "hello" };
const box2: Box<number> = { value: 42 };

// 泛型函数
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}
first([1, 2, 3]);          // number
first(["a", "b"]);         // string

// 多个泛型参数
function pair<K, V>(key: K, value: V): [K, V] {
    return [key, value];
}
pair("name", 25);          // [string, number]
```

### 6.3 泛型约束（extends）

```typescript
// 约束 T 必须有 length 属性
function logLength<T extends { length: number }>(arg: T): void {
    console.log(arg.length);
}
logLength("hello");        // 5
logLength([1, 2, 3]);      // 3
logLength(123);            // ❌ number 没有 length
```

---

## 七、类型断言与收窄

### 7.1 类型断言（告诉编译器"我知道这是什么类型"）

```typescript
// 两种写法
let val: unknown = "hello";
let len1: number = (val as string).length;     // as 写法（推荐）
let len2: number = (<string>val).length;       // 尖括号写法（JSX 中不能用）
```

> **断言是双刃剑**：能用但滥用会绕过类型检查，引入 bug。优先用类型收窄（下面）。

### 7.2 类型收窄（typeof / instanceof / in）

```typescript
function process(val: string | number) {
    if (typeof val === "string") {
        val.toUpperCase();      // TS 知道这里是 string
    } else {
        val.toFixed(2);         // TS 知道这里是 number
    }
}

class Dog { bark() {} }
class Cat { meow() {} }
function speak(animal: Dog | Cat) {
    if (animal instanceof Dog) {
        animal.bark();
    }
}

interface User { name: string }
interface Admin { name: string; permissions: string[] }
function check(u: User | Admin) {
    if ("permissions" in u) {
        u.permissions;          // Admin
    }
}
```

### 7.3 可辨识联合（推荐模式）

```typescript
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "square"; size: number }
    | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
    switch (s.kind) {
        case "circle": return Math.PI * s.radius ** 2;
        case "square": return s.size ** 2;
        case "rect":   return s.w * s.h;
    }
}
```

`kind` 是辨识字段，switch 后 TS 自动收窄对应类型。

---

## 八、类型别名与工具类型

### 8.1 type 别名

```typescript
type ID = number | string;
type Callback = (data: any) => void;
type Point = { x: number; y: number };
```

### 8.2 内置工具类型（高频）

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
}

// Partial：所有字段可选
type UserPartial = Partial<User>;
// 等价 { id?: number; name?: string; ... }

// Required：所有字段必填（与 Partial 相反）
type UserRequired = Required<User>;

// Pick：挑选部分字段
type UserBasic = Pick<User, "id" | "name">;
// { id: number; name: string }

// Omit：排除部分字段
type UserPublic = Omit<User, "email" | "age">;
// { id: number; name: string }

// Readonly：全只读
type UserFrozen = Readonly<User>;

// Record：键值对
type UserMap = Record<string, User>;

// ReturnType：取函数返回类型
type R = ReturnType<typeof JSON.parse>;   // any
```

> 这套工具类型是 TS 工程化的精髓，写库和复杂业务时极常用。

---

## 九、类（class）

```typescript
class Animal {
    // 字段（默认 public）
    public name: string;
    private id: number;          // 只能类内访问
    protected species: string;   // 类内和子类可访问
    readonly birth: Date;        // 只读
    static count = 0;            // 静态属性

    constructor(name: string, species: string) {
        this.name = name;
        this.species = species;
        this.id = Math.random();
        this.birth = new Date();
        Animal.count++;
    }

    // 方法
    speak(): string {
        return `${this.name} makes a sound`;
    }

    // 静态方法
    static create(name: string): Animal {
        return new Animal(name, "unknown");
    }
}

class Dog extends Animal {
    constructor(name: string) {
        super(name, "dog");      // 必须先调 super
    }

    speak(): string {            // 重写
        return `${this.name}: Woof`;
    }
}

const d = new Dog("Rex");
d.speak();                       // "Rex: Woof"
// d.id;                         // ❌ private
```

### 构造函数简写（参数属性）

```typescript
class User {
    constructor(
        public name: string,        // 自动创建字段并赋值
        private age: number,
        readonly email: string,
    ) {}
}
const u = new User("tom", 25, "tom@x.com");
u.name;     // "tom"
```

---

## 十、与 Vite / React 联动

### 10.1 Vite 项目用 TS（开箱即用）

```bash
# 创建 TS 版 Vite 项目
npm create vite@latest my-app -- --template react-ts
```

项目结构会多一个 `tsconfig.json` 和 `src/vite-env.d.ts`。

### 10.2 类型声明文件（.d.ts）

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

// 声明环境变量类型
interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_APP_TITLE: string
}
interface ImportMeta {
    readonly env: ImportMetaEnv
}
```

### 10.3 React + TS 组件示例

```tsx
import { useState } from 'react'

interface Props {
    title: string
    count?: number
}

export function Card({ title, count = 0 }: Props) {
    const [n, setN] = useState<number>(count)
    return (
        <div>
            <h1>{title}</h1>
            <button onClick={() => setN(n + 1)}>点击 {n}</button>
        </div>
    )
}
```

---

## 十一、TS vs JS 速查表

| 维度 | JavaScript | TypeScript |
|------|------------|------------|
| 类型系统 | 动态弱类型 | 静态强类型（编译期） |
| 文件后缀 | `.js` | `.ts` / `.tsx` |
| 运行 | 浏览器/Node 直接跑 | 需编译成 JS |
| 错误发现 | 运行时 | 编译时（写代码时） |
| IDE 提示 | 弱 | 强（重构、跳转、补全） |
| 学习曲线 | 低 | 中 |
| 适合项目 | 小脚本、原型 | 中大型项目、团队协作 |
| 主流框架 | 都支持 | React/Vue/Angular 主流 |

---

## 十二、常见报错速查

| 报错 | 原因 | 解决 |
|------|------|------|
| `Type 'X' is not assignable to type 'Y'` | 类型不兼容 | 检查赋值/传参类型 |
| `Property 'x' does not exist on type 'Y'` | 访问了不存在的属性 | 检查拼写或扩展类型 |
| `Cannot find module 'xxx'` | 找不到模块声明 | `npm install @types/xxx`（如 `@types/node`、`@types/react`） |
| `Object is possibly 'null'` | 可能是 null | 用 `if (x !== null)` 收窄或 `x!.foo`（非空断言） |
| `Element implicitly has an 'any' type` | 隐式 any | 加类型注解或开 `noImplicitAny` |
| `Type 'string | undefined' is not assignable to 'string'` | 可能 undefined | 用默认值或收窄 |

---

## 十三、学习路径建议

1. **第一周**：过一遍 [TS 官方 Handbook](https://www.typescriptlang.org/docs/handbook/)，写几个 `.ts` 文件用 `tsc` 编译跑通
2. **第二周**：理解 `interface` / `type` / 泛型，写一个泛型函数
3. **第三周**：用 Vite + React-TS 模板建项目，体验真实开发
4. **第四周**：学工具类型（Partial/Pick/Omit），理解类型体操
5. **进阶**：看 `@types/react` 源码，理解声明文件的写法

**避坑提示**：
- 别滥用 `any`，遇到类型不通先想"是不是设计有问题"
- 别滥用 `as` 断言，优先用类型收窄
- `strict: true` 一定要开，能避免大量坑

---

## 十四、踩坑记录

> 待实际使用后补充。预留常见坑方向：

- **坑1（预期）**：`@types/xxx` 没装 → 报 "Cannot find module"。常见需装 `@types/node`、`@types/react`。
- **坑2（预期）**：`tsconfig.json` 的 `strict` 没开 → 隐式 any 横行，等于白用 TS。
- **坑3（预期）**：JSX 中用 `<string>val` 断言报错 → 改用 `val as string`。
- **坑4（预期）**：Vite 项目改了 `tsconfig.json` 不生效 → Vite 用 esbuild 转译不管类型检查，类型检查要靠 IDE 或 `tsc --noEmit`。
- **坑5（预期）**：导入 `.png`/`.svg` 报错 → 需在 `vite-env.d.ts` 加模块声明。
- **坑6（预期）**：第三方库没类型 → 装 `@types/xxx`，或自己写 `.d.ts`。

---

## 十五、相关链接

- 官方文档：https://www.typescriptlang.org/docs/
- TS Playground（在线试）：https://www.typescriptlang.org/play
- 本项目 `frontend/Vite学习笔记.md`（Vite + TS 联动）
- 本项目 `技术工具学习索引.md`
