# grep 和 find 查内容与文件名

## 一句话结论

在 Linux 终端里：

- 查“文件内容里有没有某个字符串”，优先用 `grep`。
- 查“某个目录子树下有没有某个文件名”，优先用 `find`。

最常用命令：

```bash
grep -R -n -I "000000" /path/to/dir
```

用于递归查目录下所有文本文件中是否包含 `000000`。

```bash
find /path/to/dir -type f -iname "*database.db*"
```

用于递归查目录子树下是否存在文件名模糊匹配 `database.db` 的文件。

## grep：查某个目录下所有文件是否存在包含 000000 的行

### 基础用法

```bash
grep -R "000000" /path/to/dir
```

查 `/path/to/dir` 目录下所有文件内容里是否包含 `000000`。

查当前目录：

```bash
grep -R "000000" .
```

### 显示文件名和行号

最推荐的日常写法：

```bash
grep -R -n "000000" /path/to/dir
```

含义：

- `-R`：递归查目录下所有文件。
- `-n`：显示匹配行的行号。
- `"000000"`：要查的内容。
- `/path/to/dir`：目标目录。

输出可能类似：

```text
./config/a.txt:12:password=000000
./logs/test.log:88:user input 000000
```

格式是：

```text
文件路径:行号:匹配到的那一行
```

### 忽略二进制文件

如果目录里有图片、模型文件、压缩包、数据库文件等，建议加 `-I`：

```bash
grep -R -n -I "000000" /path/to/dir
```

`-I` 表示忽略二进制文件，避免输出乱码。

### 只列出包含 000000 的文件名

```bash
grep -R -l "000000" /path/to/dir
```

`-l` 表示只列出匹配到的文件名，不显示具体匹配行。

### 只判断是否存在，不输出内容

```bash
grep -R -q "000000" /path/to/dir
```

然后查看退出码：

```bash
echo $?
```

含义：

```text
0  找到了
1  没找到
2  grep 执行出错，比如目录不存在或权限问题
```

也可以写成判断脚本：

```bash
if grep -R -q "000000" /path/to/dir; then
  echo "找到了 000000"
else
  echo "没找到 000000"
fi
```

### 只查特定类型文件

只查 `.txt` 文件：

```bash
grep -R -n -I --include="*.txt" "000000" /path/to/dir
```

只查 `.py` 文件：

```bash
grep -R -n -I --include="*.py" "000000" /path/to/dir
```

### 排除某些目录

比如排除 `.git` 和 `node_modules`：

```bash
grep -R -n -I \
  --exclude-dir=".git" \
  --exclude-dir="node_modules" \
  "000000" /path/to/dir
```

### 查整行刚好等于 000000

如果只是包含 `000000`，用：

```bash
grep -R -n -I "000000" /path/to/dir
```

如果要求整行必须刚好等于 `000000`，用正则限定行首行尾：

```bash
grep -R -n -I "^000000$" /path/to/dir
```

含义：

- `^`：行开头。
- `$`：行结尾。
- `^000000$`：这一整行只能是 `000000`。

如果行前后可能有空格：

```bash
grep -R -n -I "^[[:space:]]*000000[[:space:]]*$" /path/to/dir
```

## find：查目录子树下是否有 database.db 文件名

### 精确查文件名 database.db

```bash
find /path/to/dir -type f -name "database.db"
```

查当前目录：

```bash
find . -type f -name "database.db"
```

含义：

- `find`：查找文件或目录。
- `/path/to/dir`：从这个目录开始查。
- `.`：从当前目录开始查。
- `-type f`：只查文件，不查目录。
- `-name "database.db"`：文件名精确匹配 `database.db`。

### 模糊匹配 database.db

如果文件名里只要包含 `database.db` 就算匹配：

```bash
find /path/to/dir -type f -name "*database.db*"
```

查当前目录：

```bash
find . -type f -name "*database.db*"
```

### 忽略大小写匹配

如果 `Database.db`、`DATABASE.DB` 也要匹配，用 `-iname`：

```bash
find . -type f -iname "*database.db*"
```

这是比较推荐的模糊查法。

### 只查名字里包含 database 的文件

```bash
find . -type f -iname "*database*"
```

### 只查所有 .db 文件

```bash
find . -type f -iname "*.db"
```

### 排除某些目录

比如排除 `.git` 和 `node_modules`：

```bash
find . \
  -path "./.git" -prune -o \
  -path "./node_modules" -prune -o \
  -type f -iname "*database.db*" -print
```

含义：

- `-prune`：跳过这个目录，不进入里面查。
- `-o`：or，或者。
- `-print`：打印最终匹配结果。

## grep 和 find 的区别

| 目标 | 命令 | 示例 |
|---|---|---|
| 查文件内容 | `grep` | `grep -R -n -I "000000" .` |
| 查文件名 | `find` | `find . -type f -iname "*database.db*"` |
| 查哪些文件内容包含某字符串 | `grep -l` | `grep -R -l "000000" .` |
| 查某类后缀文件里是否包含字符串 | `grep --include` | `grep -R -n --include="*.py" "000000" .` |
| 查所有 `.db` 文件 | `find` | `find . -type f -iname "*.db"` |

## 推荐默认命令

查目录下所有文本文件内容里有没有包含 `000000`：

```bash
grep -R -n -I "000000" /path/to/dir
```

查目录下是否有文件名模糊匹配 `database.db`：

```bash
find /path/to/dir -type f -iname "*database.db*"
```

查当前目录：

```bash
grep -R -n -I "000000" .
find . -type f -iname "*database.db*"
```

## 常见误区

### 用 grep 查文件名

`grep` 主要查文件内容，不是查文件名。虽然可以配合 `ls | grep`，但递归查子树文件名时不如 `find` 稳。

不推荐：

```bash
ls -R | grep database.db
```

推荐：

```bash
find . -type f -iname "*database.db*"
```

### 用 find 查文件内容

`find` 主要查路径、文件名、类型、大小、时间等元信息。查内容应该用 `grep`。

## 关联笔记

- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\vim 和 nano 终端编辑器速查.md`
- `D:\面试准备及其笔记\troubleshooting\Shell命令与工具\curl 查看接口和 jq JSON 格式化.md`

## 更新时间

- 2026-06-11：整理 Linux 终端里用 `grep` 递归查内容、用 `find` 递归查文件名的方法。
