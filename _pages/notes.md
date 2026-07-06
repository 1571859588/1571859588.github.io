---
layout: single
title: "笔记"
permalink: /notes/
author_profile: true
---

<div class="notes-hub">
  <p class="notes-hub-subtitle">零散的技术笔记与学习记录，按主题整理为系列。将本地笔记目录复制到 <code>notes-src/</code>，构建时自动同步。</p>

  <div class="notes-series-grid">
  {% comment %}Collect unique series{% endcomment %}
  {% assign series_list = "" | split: "" %}
  {% for note in site.notes %}
    {% assign st = note.series_title | default: note.series %}
    {% unless series_list contains st %}
      {% assign series_list = series_list | push: st %}
    {% endunless %}
  {% endfor %}

  {% for st in series_list %}
    {% assign series_notes = "" | split: "" %}
    {% assign last_note = nil %}
    {% for note in site.notes %}
      {% assign nt = note.series_title | default: note.series %}
      {% if nt == st %}
        {% assign series_notes = series_notes | push: note %}
        {% assign last_note = note %}
      {% endif %}
    {% endfor %}
    {% assign sorted = series_notes | sort: "series_order" %}
    {% assign first = sorted | first %}
    {% assign count = sorted | size %}

    {% if first and count > 0 %}
    <div class="notes-series-card">
      <div class="notes-series-card-top">
        <h3 class="notes-series-card-title">
          <a href="{{ first.url | relative_url }}">{{ st }}</a>
        </h3>
        <span class="notes-series-card-count">{{ count }} 篇</span>
      </div>

      {% comment %}Preview first 5 note titles{% endcomment %}
      {% if count > 0 %}
      <ul class="notes-series-card-toc">
        {% for note in sorted limit:5 %}
        <li>
          <a href="{{ note.url | relative_url }}">{{ note.title }}</a>
        </li>
        {% endfor %}
        {% if count > 5 %}
        <li class="notes-series-card-more">…还有 {{ count | minus: 5 }} 篇</li>
        {% endif %}
      </ul>
      {% endif %}
    </div>
    {% endif %}
  {% endfor %}
  </div>
</div>
