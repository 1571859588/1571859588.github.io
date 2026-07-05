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
| `_data/cv.yml` | Shared CV data (personal info, education, awards) |
| `_data/cv-tracks.yml` | **Per-track CV data** (interests, projects, internships, skills) |
| `_data/notes.yml` | **Notes series definitions** (titles, descriptions) |
| `_data/papers.yml` | Publications list |
| `_data/navigation.yml` | Header navigation menu |
| `_includes/cv-content.html` | **Reusable CV render template** (param: `track` + `lang`) |
| `_layouts/notes.html` | **3-column notes layout** (left nav + content + right TOC) |
| `_pages/cv.md` | CV hub — track selection page (EN) |
| `_pages/cv-zh.md` | CV hub — track selection page (CN) |
| `_pages/cv-{track}.md` | Per-track CV page (EN) |
| `_pages/cv-{track}-zh.md` | Per-track CV page (CN) |
| `_pages/notes.md` | Notes hub — series listing page |
| `_pages/about.md` | Homepage / About |
| `_posts/` | Blog posts (formal) |
| `_notes/` | **Informal notes** (Chinese, organized by series) |
| `_sass/_cv.scss` | CV styles (including track selector + print) |
| `_sass/_notes.scss` | Notes layout styles (3-column, responsive) |
| `assets/js/cv-pdf.js` | One-click PDF download |
| `assets/js/notes-toc.js` | Notes TOC scrollspy + mobile sidebar toggle |
| `images/` | Images and avatars |
| `files/` | PDFs and downloadable files |

---

## Key Files to Edit

- **Homepage content**: `_pages/about.md`
- **Publications**: `_data/papers.yml`
- **CV (shared data)**: `_data/cv.yml` — personal info, education, awards
- **CV (track data)**: `_data/cv-tracks.yml` — track-specific content
- **Notes (series)**: `_data/notes.yml` — series definitions
- **Notes (content)**: `_notes/` — individual note files
- **Navigation menu**: `_data/navigation.yml`
- **Site settings**: `_config.yml`

---

## Multi-Track CV System

The CV is organized into **tracks** (directions), each with English and Chinese versions. Currently there are 3 tracks:

| Track Key | Name | Page (EN) | Page (CN) |
|-----------|------|-----------|-----------|
| `agent` | AI Agent | `/cv-agent/` | `/cv-agent-zh/` |
| `infra` | AI Infrastructure | `/cv-infra/` | `/cv-infra-zh/` |
| `eda` | AI4EDA | `/cv-eda/` | `/cv-eda-zh/` |

The **CV Hub** (`/cv/` and `/cv-zh/`) shows track cards linking to all available tracks.

### Architecture

```
Shared data (_data/cv.yml)          Track data (_data/cv-tracks.yml)
┌─────────────────────────┐         ┌──────────────────────────────────┐
│ personal (name, photo,   │         │ tracks:                          │
│   email, github, etc.)   │         │   agent:                         │
│ education                │    +    │     name, description,           │
│ awards                   │         │     research_interests,          │
└─────────────────────────┘         │     projects, internships, skills │
                                    │   infra:                          │
                                    │     ...                           │
                                    │   eda:                            │
                                    │     ...                           │
                                    └──────────────────────────────────┘
         │                                        │
         └────────────────┬───────────────────────┘
                          ▼
              _includes/cv-content.html
            (track="agent", lang="en")
                          │
                          ▼
              _pages/cv-agent.md
              (thin page, ~10 lines)
```

### How to Add a New Track

To add a new direction (e.g., "AI Safety"), follow these two steps:

#### Step 1: Add track data in `_data/cv-tracks.yml`

Open `_data/cv-tracks.yml` and add a new entry under `tracks:`:

```yaml
  # ============================================================================
  # AI Safety Track  ← Add this block
  # ============================================================================
  safety:
    name:
      en: "AI Safety"
      zh: "AI 安全"
    description:
      en: "Focus on AI alignment, robustness, and safe deployment of LLM systems."
      zh: "聚焦AI对齐、鲁棒性与大语言模型系统的安全部署。"
    research_interests:
      en:
        - "AI Alignment & Safety"
        - "Robustness of LLMs"
        - "Red Teaming & Jailbreak Defense"
        - "Interpretability & Mechanistic Understanding"
      zh:
        - "AI对齐与安全"
        - "大语言模型鲁棒性"
        - "红队测试与越狱防御"
        - "可解释性与机制理解"
    internships:
      []  # ← Empty if no internships to show; or copy an entry from another track
    projects:
      []  # ← Empty if no projects to show; or copy an entry from another track
    skills:
      - category:
          en: "Programming Languages"
          zh: "编程语言"
        items: "Python, C/C++"
      - category:
          en: "AI & Safety"
          zh: "AI与安全"
        items: "PyTorch, Transformer, Guardrails"
```

> **Tip**: Set `internships: []` or `projects: []` to hide that section entirely for a track. Any section with an empty array will be skipped on the page.

#### Step 2: Create two page files

Create `_pages/cv-safety.md` (English):

```markdown
---
layout: archive
title: "CV – AI Safety"
permalink: /cv-safety/
author_profile: true
---

{% include cv-content.html track="safety" lang="en" %}
```

Create `_pages/cv-safety-zh.md` (Chinese):

```markdown
---
layout: archive
title: "简历 – AI 安全"
permalink: /cv-safety-zh/
author_profile: true
---

{% include cv-content.html track="safety" lang="zh" %}
```

**Key points when creating track pages:**
- `permalink` must be `/cv-{track_key}/` for EN, `/cv-{track_key}-zh/` for CN
- `track` parameter must match the key in `cv-tracks.yml`
- `lang` is `"en"` or `"zh"`

> That's it! The CV hub (`/cv/`) will **automatically** show the new track card, and the track selector tab on each CV page will **automatically** include the new direction. No other files need to be changed.

### How to Modify Track Content

All track-specific content lives in `_data/cv-tracks.yml`. Each section supports bilingual (`en`/`zh`) fields:

| Field | Structure | Description |
|-------|-----------|-------------|
| `name` | `{en, zh}` | Track display name |
| `description` | `{en, zh}` | One-line summary shown on hub cards |
| `research_interests` | `{en: [...], zh: [...]}` | List of research interests |
| `internships` | Array of internship objects | Each has `company`, `position`, `date`, `description`, `responsibilities` (all bilingual) |
| `projects` | Array of project objects | Each has `name`, `tech`, `date`, `role`, `description`, `highlights` (all bilingual) |
| `skills` | Array of skill objects | Each has `category` (`{en, zh}`) and `items` (string, shared across languages) |

**Example — Adding a project to a track:**

In `_data/cv-tracks.yml`, find the track section (e.g., `agent:`) and add under its `projects:` list:

```yaml
    projects:
      - name:
          en: "Your Project Name"
          zh: "你的项目名"
        tech: "Python, PyTorch, LangChain"
        date:
          en: "2025.01 - 2025.06"
          zh: "2025.01 - 2025.06"
        role:
          en: "Core Developer"
          zh: "核心开发者"
        description:
          en: "Brief description of the project."
          zh: "项目的简要描述。"
        highlights:
          en:
            - "Achievement 1 in English"
            - "Achievement 2 in English"
          zh:
            - "成果1（中文）"
            - "成果2（中文）"
```

### Data Split: cv.yml vs cv-tracks.yml

| Data | Where | Reason |
|------|-------|--------|
| Name, photo, email, github | `cv.yml` | Same across all tracks |
| Education | `cv.yml` | Same across all tracks |
| Awards | `cv.yml` | Same across all tracks |
| Research interests | `cv-tracks.yml` | Varies by direction |
| Projects | `cv-tracks.yml` | Tailored to each direction |
| Internships | `cv-tracks.yml` | Described from track's angle |
| Skills | `cv-tracks.yml` | Track-relevant skill set |

---

## NOTES System（笔记专栏）

The NOTES system hosts informal, fragmented Chinese-language notes organized into **series** (topic-based collections). Each note page features a 3-column layout: left chapter navigation + main content + right TOC with scroll tracking.

### Current Series

| Series ID | Title | Notes Count |
|-----------|-------|-------------|
| `llm-interview` | LLM 面试笔记 | 6 |
| `ai-infra` | AI 基础设施 | 1 |
| `eda-notes` | EDA 笔记 | 1 |
| `misc` | 杂项笔记 | 1 |

### Page Structure

```
/notes/                              → Notes hub（series cards）
/notes/llm-interview/transformer/    → Individual note page (3-column layout)
```

Each note page has:
- **Left sidebar** — all chapters in the current series (auto-generated), current page highlighted
- **Main content** — the note body with LaTeX formulas ($...$) and images (![caption](url))
- **Right TOC** — auto-generated from headings (h2–h4), with scroll-position tracking
- **Previous / Next** — auto-generated chapter navigation at the bottom

### How to Add a New Note

Adding a note requires **only one step**: create a `.md` file in `_notes/`.

#### Example: Adding "Attention 机制详解" to the LLM Interview series

Create `_notes/llm-interview-attention.md`:

```markdown
---
layout: notes
title: "Attention 机制详解"
series: llm-interview
series_order: 3
date: 2025-06-10
---

## 1. 什么是 Attention

Attention 机制的核心思想是让模型在处理每个 token 时，
动态地关注输入序列中**最相关的部分**。

![Attention 示意图](/images/blogs/attention-diagram.png)

## 2. Scaled Dot-Product Attention

核心公式：

\[
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V
\]

### 2.1 Q、K、V 的含义

- **Q (Query)**：当前 token 想要"查询"什么
- **K (Key)**：每个 token 提供了什么"索引"
- **V (Value)**：每个 token 实际包含的"内容"

## 3. 代码实现

```python
import torch

def scaled_dot_product_attention(Q, K, V):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / torch.sqrt(d_k)
    attn_weights = torch.softmax(scores, dim=-1)
    return torch.matmul(attn_weights, V)
```
```

> That's it! The left sidebar, right TOC, breadcrumb, and prev/next links are all **auto-generated**. The note will automatically appear in the correct position within its series.

### Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `layout` | Yes | Always `notes` |
| `title` | Yes | Note title (shown in sidebar, heading, and browser tab) |
| `series` | Yes | Series ID matching a key in `_data/notes.yml` |
| `series_order` | Yes | Integer position within the series (determines sidebar order) |
| `date` | No | Publication date (shown below title), format: `YYYY-MM-DD` |

### How to Add a New Series

#### Step 1: Define the series in `_data/notes.yml`

```yaml
  - id: your-series-id
    title: "你的系列标题"
    description: "简短的系列描述，显示在 Hub 卡片上"
```

#### Step 2: Create at least one note with `series: your-series-id`

The series will **automatically appear** on the Notes hub page and in the navigation once it has at least one note.

### Content Features

| Feature | Syntax | Notes |
|---------|--------|-------|
| LaTeX inline | `$E = mc^2$` | Same as Blog, via MathJax |
| LaTeX block | `$$...$$` or `\[...\]` | Display math |
| Images | `![caption](url)` | Standard Markdown, like Typora |
| Code blocks | ```` ``` ```` (triple backtick) | Syntax highlighting via Rouge |
| Tables | Standard Markdown table | Full support |
| Blockquotes | `> quote` | Styled with blue left border |

### How It Works

```
_data/notes.yml              _notes/*.md
┌──────────────────┐         ┌──────────────────────────────┐
│ series:           │         │ ---                           │
│   - id: llm-int   │         │ layout: notes                 │
│     title: "..."  │   +    │ series: llm-interview         │
│     description   │         │ series_order: 1               │
│   - id: ai-infra  │         │ title: "Transformer 详解"     │
│     ...           │         │ ---                           │
└──────────────────┘         │ Content...                    │
         │                   └──────────────────────────────┘
         │         ┌─────────────────┐
         └─────────┤ _layouts/notes  │
                   │ (auto-builds    │
                   │  sidebar, TOC,  │
                   │  breadcrumb,    │
                   │  prev/next)     │
                   └─────────────────┘
```

The `notes.html` layout automatically:
1. Finds all `_notes/` files with the same `series` value
2. Sorts them by `series_order`
3. Renders the left sidebar with all chapters
4. Parses the main content for headings to build the right TOC
5. Generates prev/next chapter links
6. Activates scrollspy to highlight the current TOC section

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
