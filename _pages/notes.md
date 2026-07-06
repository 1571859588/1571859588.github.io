---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
---

<div class="notes-hub">
  <p class="notes-hub-subtitle">零散的技术笔记与学习记录。将本地笔记目录复制到 <code>notes-src/</code>，构建时自动同步。</p>

  <div class="notes-series-grid">
  {% comment %}
    Build unique series list from site.notes, grouped by series_title.
    Use raw Chinese titles (NOT slugify which strips CJK in Jekyll 3.x).
  {% endcomment %}

  {% comment %}Step 1: collect unique series_titles (using a delimiter trick){% endcomment %}
  {% assign series_list = "" | split: "" %}
  {% for note in site.notes %}
    {% assign st = note.series_title | default: note.series %}
    {% unless series_list contains st %}
      {% assign series_list = series_list | push: st %}
    {% endunless %}
  {% endfor %}

  {% comment %}Step 2: for each unique series, render a card{% endcomment %}
  {% for st in series_list %}
    {% comment %}Count notes in this series{% endcomment %}
    {% assign count = 0 %}
    {% assign first_note = nil %}
    {% for note in site.notes %}
      {% assign nt = note.series_title | default: note.series %}
      {% if nt == st %}
        {% assign count = count | plus: 1 %}
        {% unless first_note %}
          {% assign first_note = note %}
        {% endunless %}
      {% endif %}
    {% endfor %}

    {% if first_note and count > 0 %}
    <div class="notes-series-card">
      <h3 class="notes-series-card-title">
        <a href="{{ first_note.url | relative_url }}">{{ st }}</a>
      </h3>
      <p class="notes-series-card-desc">{{ count }} 篇笔记</p>
      <a href="{{ first_note.url | relative_url }}" class="notes-series-card-link">开始阅读 →</a>
    </div>
    {% endif %}
  {% endfor %}
  </div>
</div>
