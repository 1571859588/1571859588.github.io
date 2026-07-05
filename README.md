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
| `_data/papers.yml` | Publications list |
| `_data/navigation.yml` | Header navigation menu |
| `_includes/cv-content.html` | **Reusable CV render template** (param: `track` + `lang`) |
| `_pages/cv.md` | CV hub — track selection page (EN) |
| `_pages/cv-zh.md` | CV hub — track selection page (CN) |
| `_pages/cv-{track}.md` | Per-track CV page (EN) |
| `_pages/cv-{track}-zh.md` | Per-track CV page (CN) |
| `_pages/about.md` | Homepage / About |
| `_posts/` | Blog posts |
| `_sass/_cv.scss` | CV styles (including track selector + print) |
| `assets/js/cv-pdf.js` | One-click PDF download |
| `images/` | Images and avatars |
| `files/` | PDFs and downloadable files |

---

## Key Files to Edit

- **Homepage content**: `_pages/about.md`
- **Publications**: `_data/papers.yml`
- **CV (shared data)**: `_data/cv.yml` — personal info, education, awards
- **CV (track data)**: `_data/cv-tracks.yml` — track-specific content
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
