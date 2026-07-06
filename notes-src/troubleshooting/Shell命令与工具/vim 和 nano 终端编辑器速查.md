# vim 和 nano 终端编辑器速查

## 一句话结论

`nano` 更适合临时、简单、低风险地编辑配置文件；`vim` 更适合熟练后高效编辑、远程服务器排错、复杂修改和几乎所有 Unix/Linux 环境下的通用场景。

如果 `vim` 和 `nano` 同时存在：

- 不熟悉 Vim、只是改一两行配置：优先用 `nano`。
- 服务器环境很简陋、需要最大兼容性、或已经熟悉 Vim：优先用 `vim` 或 `vi`。
- 正在看教程/运维文档，命令明确写了 `vim`：跟着用 `vim`，但要先知道怎么保存退出。

## 使用环境

### Unix / Linux 通用环境

`vi` 几乎是 Unix/Linux 系统里的基础编辑器，很多最小化系统也会有。`vim` 是 `vi` 的增强版，功能更多、体验更好。

常见系统：

- Ubuntu
- Debian
- CentOS
- RHEL
- Rocky Linux
- AlmaLinux
- Fedora
- macOS
- 各类 Unix-like 系统

### Ubuntu / Debian

Ubuntu/Debian 通常比较容易安装 `nano` 和 `vim`。

安装命令：

```bash
sudo apt update
sudo apt install nano vim
```

Ubuntu 上 `nano` 经常默认可用，适合新手快速修改配置。

### CentOS / RHEL / Rocky Linux

CentOS/RHEL 系常见的是 `vi` 或 `vim-minimal`，`nano` 不一定默认安装。

安装命令：

```bash
sudo yum install nano vim
```

较新的系统也可能使用：

```bash
sudo dnf install nano vim
```

如果没有 `vim`，可以先试：

```bash
vi 文件名
```

### macOS

macOS 通常自带 `vim` 或 `vi`，也可能有 `nano`。

可以检查：

```bash
vim --version
nano --version
```

如果用 Homebrew 安装新版：

```bash
brew install vim nano
```

## nano 基础用法

### 打开或新建文件

```bash
nano 文件名
```

例如：

```bash
nano config.yaml
```

### 编辑方式

`nano` 打开后可以直接输入文字，不需要切换模式。

底部会显示快捷键提示，例如：

```text
^O Write Out    ^X Exit
```

这里的 `^` 表示 Ctrl。

### 保存文件

```text
Ctrl + O
Enter
```

含义：

1. `Ctrl + O`：写出/保存。
2. `Enter`：确认文件名。

### 退出 nano

```text
Ctrl + X
```

如果文件修改过但没保存，nano 会询问是否保存。

### 搜索内容

```text
Ctrl + W
```

输入关键词后回车。

### nano 适合什么时候用

- 临时改一两行配置。
- 新手在服务器上快速编辑文件。
- 不想记 Vim 模式和命令。
- 修改 `.env`、`yaml`、`conf`、`service` 等小文件。

## vim 基础用法

### 打开或新建文件

```bash
vim 文件名
```

如果没有 `vim`，可以用：

```bash
vi 文件名
```

### Vim 的核心概念：模式

Vim 最重要的是“模式”。刚打开文件时通常在普通模式，不能像 nano 一样直接输入。

常用模式：

- 普通模式：移动光标、删除、复制、保存退出等。
- 插入模式：真正输入文字。
- 命令模式：输入 `:wq`、`:q!` 这类命令。

### 进入编辑状态

在普通模式下按：

```text
i
```

进入插入模式，然后就可以输入文字。

### 回到普通模式

```text
Esc
```

### 保存并退出

先按 `Esc`，然后输入：

```vim
:wq
```

再回车。

含义：

- `w`：write，保存。
- `q`：quit，退出。

### 只保存不退出

```vim
:w
```

### 不保存强制退出

```vim
:q!
```

### 只退出

```vim
:q
```

如果文件已经修改但没保存，`:q` 会失败，这时要么 `:wq` 保存退出，要么 `:q!` 放弃修改退出。

### 搜索内容

在普通模式输入：

```vim
/关键词
```

然后回车。

继续查找下一个：

```text
n
```

反向查找：

```text
N
```

### 删除一行

普通模式下：

```text
dd
```

### 撤销

普通模式下：

```text
u
```

### 复制/粘贴一行

普通模式下：

```text
yy
p
```

- `yy`：复制当前行。
- `p`：粘贴到下一行。

### 显示行号

```vim
:set number
```

简写：

```vim
:set nu
```

### 查看文件绝对路径

普通模式下，直接用命令输出：

```vim
:echo expand('%:p')
```

含义：

- `%`：当前文件。
- `:p`：扩展为完整绝对路径。

复制到系统剪贴板：

```vim
:let @+ = expand('%:p')
```

快捷键方式：

```text
Ctrl + G
```

显示相对路径；再按 `1 Ctrl+G`（先按 `1` 再按 `Ctrl+G`）显示完整绝对路径。

如果想永久在状态栏显示绝对路径，在 `.vimrc` 里加一行：

```vim
set statusline+=%F
```

`%F` 代表当前文件的绝对路径。

常用记忆：

```text
:echo expand('%:p')  快速查看绝对路径
Ctrl+G                相对路径
1 Ctrl+G              绝对路径
```

### 跳到指定行

```vim
:行号
```

例如跳到第 100 行：

```vim
:100
```

### 快速到行首和行尾

普通模式下：

```text
0
```

跳到当前行的最开头，也就是第 1 列。

```text
^
```

跳到当前行第一个非空白字符。写代码时更常用，因为很多行前面有缩进。

```text
$
```

跳到当前行行尾。

常用记忆：

```text
0  到绝对行首
^  到第一个非空字符
$  到行尾
```

### 快速到第一行和最后一行

普通模式下：

```text
gg
```

跳到文件第一行。

```text
G
```

跳到文件最后一行。

跳到指定行：

```text
100G
```

或者：

```vim
:100
```

### 翻页和半页滚动

普通模式下：

```text
Ctrl + f
```

向下翻一页，f 可以理解为 forward。

```text
Ctrl + b
```

向上翻一页，b 可以理解为 backward。

```text
Ctrl + d
```

向下翻半页，d 可以理解为 down。

```text
Ctrl + u
```

向上翻半页，u 可以理解为 up。

### 批量替换

Vim 替换命令常用格式：

```vim
:%s/旧内容/新内容/g
```

含义：

- `%`：整个文件。
- `s`：substitute，替换。
- `旧内容`：要查找的内容。
- `新内容`：要替换成的内容。
- `g`：global，替换一行里的所有匹配项。如果不加 `g`，每行只替换第一个。

例子：

```vim
:%s/foo/bar/g
```

把整个文件里的 `foo` 替换成 `bar`。

### 批量替换前逐个确认

如果担心误替换，可以加 `c`：

```vim
:%s/foo/bar/gc
```

Vim 会逐个询问是否替换。常用选择：

```text
y  替换当前这个
n  跳过当前这个
a  替换所有剩下的
q  退出替换
```

### 部分范围替换

只替换第 10 到第 20 行：

```vim
:10,20s/foo/bar/g
```

只替换当前行：

```vim
:s/foo/bar/g
```

从当前行替换到文件末尾：

```vim
:.,$s/foo/bar/g
```

含义：

- `.`：当前行。
- `$`：最后一行。

从第 10 行替换到文件末尾：

```vim
:10,$s/foo/bar/g
```

### 只替换选中的部分

1. 普通模式下按 `v` 进入可视化模式。
2. 移动光标选中一段内容。
3. 输入 `:`，Vim 通常会自动出现：

```vim
:'<,'>
```

4. 接着输入替换命令：

```vim
:'<,'>s/foo/bar/g
```

含义是：只在刚才可视化选中的范围内，把 `foo` 替换成 `bar`。

### 可视化模式

Vim 的可视化模式用于“先选中一块内容，再操作”。

普通模式下：

```text
v
```

进入字符级选择，适合选中几个字、半行内容。

```text
V
```

进入行级选择，适合选中整行或多行。

```text
Ctrl + v
```

进入块选择，适合选中矩形区域，比如多行前面同一列。

选中后常用操作：

```text
y  复制
d  删除
>  向右缩进
<  向左缩进
```

### Tab、大空格和缩进

你说的“tab 效果的大空格”一般叫：

```text
Tab、制表符、缩进、indent
```

在代码里，按 `Tab` 可能插入真正的制表符，也可能插入若干个空格，取决于编辑器配置。

Vim 里和 Tab/缩进相关的常用设置：

```vim
:set tabstop=4
```

显示一个 Tab 时按 4 个空格宽度展示。

```vim
:set shiftwidth=4
```

使用 `>`、`<` 自动缩进时，每次缩进 4 个空格宽度。

```vim
:set expandtab
```

按 Tab 时插入空格，而不是真正的 Tab 字符。

Python 项目里通常推荐的是 `expandtab`，也就是“用空格缩进”。常见搭配是：

```vim
:set tabstop=4
:set shiftwidth=4
:set expandtab
```

含义是：显示宽度按 4 个空格、自动缩进按 4 个空格、按 Tab 实际插入空格。

```vim
:set noexpandtab
```

按 Tab 时插入真正的 Tab 字符。这个适合明确要求使用 Tab 字符缩进的项目，例如某些 Go、Makefile 或团队已有约定的代码库。

如果只是写 Python，又没有项目特殊约定，优先用 `expandtab`。

### 全选并删除全部内容

Vim 里最直接的“全选删除”通常不是像图形编辑器一样先按 Ctrl+A，而是用命令一次性删除整个文件内容。

普通模式下先按 `Esc`，然后输入：

```vim
:%d
```

含义：

- `%`：整个文件范围。
- `d`：delete，删除。

也可以用可视化方式全选后删除：

```text
ggVGd
```

含义：

- `gg`：跳到文件第一行。
- `V`：进入行级可视化选择。
- `G`：选到文件最后一行。
- `d`：删除选中内容。

常用记忆：

```text
:%d     最快删除全文
ggVGd   像“全选后删除”一样操作
```

```vim
:set list
```

显示不可见字符，方便看出哪里是 Tab、哪里是行尾。

关闭显示：

```vim
:set nolist
```

### 批量缩进

普通模式下，当前行向右缩进：

```text
>>
```

当前行向左缩进：

```text
<<
```

可视化模式下：

1. 按 `V` 进入行选择。
2. 选中多行。
3. 按 `>` 向右缩进，按 `<` 向左缩进。

如果想连续缩进多次，可以按 `.` 重复上一次操作。

### Tab 和空格互相转换

把 Tab 转成空格：

```vim
:set expandtab
:retab
```

把空格按当前规则重新整理成 Tab 或空格，取决于 `expandtab` / `noexpandtab` 设置。

如果只是想把真正的 Tab 字符替换成 4 个空格，也可以用替换命令：

```vim
:%s/\t/    /g
```

这里 `/\t/` 表示匹配 Tab 字符，后面是 4 个空格。

### vim 适合什么时候用

- 远程服务器、最小化系统、救援环境。
- 需要搜索、跳行、批量修改、复制粘贴。
- 编辑较长文件。
- 想长期提升 Linux/服务器操作效率。
- 教程、运维文档、报错排查里默认使用 `vim` 或 `vi`。

## 同时出现时优先使用哪个

### 推荐判断规则

| 场景 | 优先选择 | 原因 |
|---|---|---|
| 新手临时改配置 | `nano` | 直接输入，保存退出简单，不容易卡住 |
| 只改一两行 | `nano` | 操作成本低 |
| 服务器很简陋 | `vi` / `vim` | 兼容性最好，很多系统默认有 |
| 长期做 Linux/后端/运维/远程开发 | `vim` | 值得学习，效率更高 |
| 教程明确写 `vim xxx` | `vim` | 跟教程一致，减少差异 |
| 怕误操作、只想安全退出 | `nano` | 交互提示更直观 |
| 文件很大或要频繁搜索跳转 | `vim` | 搜索、跳行、移动更强 |

### 我的默认建议

如果只是为了完成当前任务：

```text
优先 nano，简单可靠。
```

如果你打算经常连服务器、做模型部署、改配置、排查 Linux 问题：

```text
逐步熟悉 vim，至少掌握 i、Esc、:wq、:q!、/搜索、dd、u。
```

## 最小生存命令

### nano 最小生存命令

```text
nano 文件名
直接编辑
Ctrl + O 保存
Enter 确认
Ctrl + X 退出
```

### vim 最小生存命令

```text
vim 文件名
i       进入编辑
Esc     退出编辑模式
:wq     保存并退出
:q!     不保存强制退出
```

## 常见卡住场景

### Vim 里打不了字

原因：还在普通模式。

解决：按 `i` 进入插入模式。

### Vim 里不知道怎么退出

保存退出：

```vim
:wq
```

不保存退出：

```vim
:q!
```

如果输入命令前不确定当前状态，先按几次 `Esc`。

### nano 里 `^X` 是什么意思

`^X` 表示 `Ctrl + X`，不是输入 `^` 和 `X` 两个字符。

### 没有 nano 命令

可以安装：

Ubuntu/Debian：

```bash
sudo apt update
sudo apt install nano
```

CentOS/RHEL/Rocky：

```bash
sudo yum install nano
```

或者先用系统自带的：

```bash
vi 文件名
```

### 没有 vim 命令

先试：

```bash
vi 文件名
```

或安装：

Ubuntu/Debian：

```bash
sudo apt update
sudo apt install vim
```

CentOS/RHEL/Rocky：

```bash
sudo yum install vim
```

## 记忆方式

```text
nano：像普通记事本，打开就能写。
vim：像专业编辑器，需要先切模式，但熟练后很快。
```

最关键的 Vim 四件套：

```text
i      进入编辑
Esc    回到普通模式
:wq    保存退出
:q!    放弃退出
```

## 关联笔记

- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\curl 查看接口和 jq JSON 格式化.md`
- `D:\面试准备及其笔记\troubleshooting\远程连接与传输\SSH 本地端口转发.md`

## 更新时间

- 2026-06-11：整理 `vim` 和 `nano` 的使用方法、适用环境，以及同时存在时的优先选择规则。
- 2026-06-15：补充"查看文件绝对路径"小节（`:echo expand('%:p')`、`Ctrl+G`、状态栏 `%F`）。
