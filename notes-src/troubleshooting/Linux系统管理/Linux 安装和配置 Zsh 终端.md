# Linux 安装和配置 Zsh 终端

> 更新：2026-06-20 | 触发：记录 Linux 下 Zsh 安装和配置全流程

## 一句话结论

三步走：`apt install zsh` → 装 `oh-my-zsh` → 配插件和主题，终端体验质变。

## 背景与现象

- 目标：把 Linux 默认的 bash 换成功能更强大的 zsh，获得自动补全、语法高亮、命令历史提示等能力。
- 环境：Ubuntu / Debian 系 Linux（CentOS 用 `yum` 替换 `apt` 即可）。

## 安装步骤

### 1. 安装 Zsh

```bash
sudo apt update
sudo apt install zsh -y
```

验证：

```bash
zsh --version
# 输出类似 zsh 5.8 (x86_64-ubuntu-linux-gnu)
```

### 2. 设为默认 Shell

```bash
chsh -s $(which zsh)
```

退出重新登录生效。不想改默认的话，也可以每次手动输入 `zsh` 启动。

### 3. 安装 Oh My Zsh

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

安装完后 `~/.zshrc` 会自动生成。

> 如果 `curl` 没装：`sudo apt install curl -y`

### 4. 推荐插件

**zsh-autosuggestions**（自动提示历史命令，按 `→` 补全）：

```bash
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

**zsh-syntax-highlighting**（命令语法高亮，正确绿色、错误红色）：

```bash
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

**z**（快速跳转常用目录，oh-my-zsh 内置无需安装）。

然后在 `~/.zshrc` 中找到 `plugins=(git)` 一行，改为：

```bash
plugins=(git z zsh-autosuggestions zsh-syntax-highlighting)
```

### 5. 推荐主题

`~/.zshrc` 中修改：

```bash
ZSH_THEME="agnoster"
```

`agnoster` 显示完整路径 + git 状态，颜值高。也可用 `robbyrussell`（简洁）、`powerlevel10k`（功能最强但需额外安装）。

### 6. 应用配置

```bash
source ~/.zshrc
```

## 踩坑记录

- **`chsh: user is not in /etc/passwd`**：某些 Linux 发行版不直接用 `/etc/passwd`，改用 `sudo usermod -s $(which zsh) $USER`。
- **插件没生效**：确认 `plugins=(...)` 写在 `source $ZSH/oh-my-zsh.sh` 那一行**之前**，否则不会加载。
- **`agnoster` 主题字体乱码**：需要安装 Powerline 字体，推荐 `sudo apt install fonts-powerline -y`。
- **卸载 oh-my-zsh**：`uninstall_oh_my_zsh` 命令或直接 `rm -rf ~/.oh-my-zsh`。
- **服务器无外网**：可先在本机下载 oh-my-zsh 安装脚本和插件 repo，SCP 上传后手动安装。

## 类似问题如何判断

- 共同点：任何 Linux 发行版的终端美化都适用这套流程。
- 区别点：CentOS/RHEL 用 `yum install zsh`；macOS 自带 zsh 且已设为默认，直接装 oh-my-zsh 即可。
- 下次优先检查：`zsh --version` 确认已安装 → `echo $SHELL` 确认当前 shell → `~/.zshrc` 中插件顺序是否正确。

## 相关链接或关联笔记

- [SSH 免密登录 (Windows 公钥配置)](./SSH%20免密登录%20(Windows%20公钥配置).md)
- [SCP 文件传输到远程服务器](./SCP%20文件传输到远程服务器.md)
