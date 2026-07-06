# Yuntao Nie's Academic Homepage

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Active-brightgreen)](https://1571859588.github.io)

> My personal academic website powered by Jekyll and the [Academic Pages](https://github.com/academicpages/academicpages.github.io) theme.

---

## Quick Start

### Local Development

```bash
# Install dependencies
bundle install

# Run local server
bundle exec jekyll serve -l -H localhost

# Visit http://localhost:4000
```

---

## Project Structure

| Directory/File | Description |
|----------------|-------------|
| `_config.yml` | Site configuration (profile, social links, etc.) |
| `_data/` | Data files: `papers.yml`, `cv.yml`, `navigation.yml` |
| `_pages/` | Static pages: `about.md`, `cv.md`, `publications.md`, `notes.md` |
| `_posts/` | Blog posts (formal) |
| `_notes/` | **Auto-generated** notes (from `notes-src/` via plugin) |
| `notes-src/` | **Source notes** — copy local notes here, .gitignore-filtered |
| `_plugins/` | Jekyll plugins: `notes-sync.rb` |
| `_layouts/` | Page layouts: `notes.html` (3-column) |
| `_sass/` | Stylesheets (including `_notes.scss`) |
| `images/` | Images and avatars |
| `files/` | PDFs and downloadable files |

---

## Key Files to Edit

- **Homepage content**: `_pages/about.md`
- **Publications**: `_data/papers.yml`
- **CV**: `_data/cv.yml`
- **Notes (content)**: `notes-src/` → copy local notes here
- **Notes (series)**: auto-discovered from `notes-src/` directory structure
- **Navigation menu**: `_data/navigation.yml`
- **Site settings**: `_config.yml`

---

---

## NOTES System（笔记专栏）

NOTES hosts informal, fragmented Chinese-language notes in a 3-column layout (left sidebar + content + right TOC scrollspy). **No manual frontmatter needed** — a Jekyll plugin auto-generates everything from directory structure.

### Quick Start

```bash
# 1. Copy your local notes into the repo
cp -r "D:\面试准备及其笔记\*" notes-src/

# 2. Build — plugin auto-syncs notes-src/ → _notes/
bundle exec jekyll serve
```

### Directory Structure

```
notes-src/                          ← Copy your local notes here
├── LLM 面试笔记/                   ← Top-level dir = series（专题）
│   ├── 1. Transformer 架构详解.md  ← N. prefix = order
│   ├── 2. LLaMA 架构与 RoPE.md
│   ├── 3. Layer Normalization.md
│   ├── 3. Layer Normalization.assets/  ← Images for this note
│   │   └── diagram.png
│   ├── 无编号笔记.md               ← No prefix → ordered by file ctime
│   └── 子专题/                     ← Subdir = section group in sidebar
│       ├── 1. 子笔记.md
│       └── 2. 子笔记.md
├── AI 基础设施/
│   └── 1. RAG 系统架构.md
└── 杂项笔记/
    └── Git 常用命令.md
```

### Naming Rules

| Rule | Example | Result |
|------|---------|--------|
| `N.` prefix in filename | `3. Layer Normalization.md` | Order = 3, Title = "Layer Normalization" |
| No `N.` prefix | `RAG 系统架构.md` | Order = file creation time |
| Numbered before unnumbered | — | 1, 2, 3... then ctime-ordered |
| Subdirectory | `子专题/` | Sidebar section group label |
| `.assets/` directory | `note.assets/` | Images, tracked by Git |

### Image Handling

Images are stored in an `.assets` directory next to their markdown file:

```markdown
![Diagram](3. Transformer 架构详解.assets/diagram.png)
```

> `.md` and `.assets/` are tracked by Git. All other file types (`.pdf`, `.py`, `.cpp`, `.ipynb`, etc.) are gitignored.

### Content Features

| Feature | Syntax | Notes |
|---------|--------|-------|
| LaTeX inline | `$E = mc^2$` | Same as Blog, via MathJax |
| LaTeX block | `$$...$$` or `\[...\]` | Display math |
| Images | `![caption](.assets/img.png)` | Relative path to `.assets/` |
| Code blocks | ```` ``` ```` (triple backtick) | Syntax highlighting via Rouge |
| Tables / Blockquotes | Standard Markdown | Full support |

### How to Add Notes

1. Write notes locally in `D:\面试准备及其笔记\` (any editor: Typora, VS Code, Obsidian)
2. Copy to `notes-src/`
3. Build: `bundle exec jekyll serve`
4. Commit & push — only `.md` and `.assets/` are tracked

### How to Add a New Series

Create a new top-level directory in `notes-src/`. The Hub page and sidebar auto-discover it.

### How It Works

```
notes-src/               _plugins/notes-sync.rb          _notes/ (gitignored)
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│ LLM 面试笔记/     │     │ Jekyll :after_init   │     │ (auto-generated    │
│ ├ 1. Trans.md    │ ──→ │ hook:                │ ──→ │  .md files with    │
│ └ 2. LLaMA.md    │     │  1. Scan notes-src/  │     │  YAML frontmatter) │
│ AI 基础设施/      │     │  2. Extract series,  │     └────────────────────┘
│ └ RAG.md         │     │     order, section    │
└──────────────────┘     │  3. Generate _notes/ │
                         └──────────────────────┘
```

---

## Configuration Options

Edit `_config.yml` to customize the site:

| Option | Default | Description |
|--------|---------|-------------|
| `show_contributions` | `false` | Set to `true` to display "My Contribution" sections on Publications and CV pages. When `false`, contribution details are hidden but remain in the data files. |

**Example:**
```yaml
# In _config.yml
show_contributions: false  # Hide contribution details on website
```

---

## Deployment

Pushing to the `main` branch automatically deploys to GitHub Pages.

## License

- Theme: [Academic Pages](https://github.com/academicpages/academicpages.github.io) (MIT License)
- Content: Yuntao Nie
