---
layout: archive
title: "个人简历"
permalink: /cv-zh/
author_profile: true
---

<div class="cv-actions">
  <button onclick="window.print()" class="btn btn--primary"><i class="fa fa-download"></i> 下载 PDF</button>
  <a href="/cv/" class="btn btn--info">English</a>
</div>

<div class="cv-content" id="cv-content">

<div class="cv-header">
  {% if site.data.cv.personal.photo %}
  <div class="cv-photo">
    <img src="{{ site.data.cv.personal.photo }}" alt="{{ site.data.cv.personal.name.zh }}">
  </div>
  {% endif %}
  <div class="cv-header-info">
    <h2 class="cv-name">{{ site.data.cv.personal.name.zh }} ({{ site.data.cv.personal.name.en }})</h2>
  </div>
</div>

<div class="cv-contact">
  <span><i class="fa fa-envelope"></i> {{ site.data.cv.personal.email }}</span>
  <span><i class="fa fa-globe"></i> <a href="{{ site.data.cv.personal.website }}">{{ site.data.cv.personal.website }}</a></span>
  <span><i class="fa fa-github"></i> <a href="https://github.com/{{ site.data.cv.personal.github }}">{{ site.data.cv.personal.github }}</a></span>
  <span><i class="fa fa-map-marker"></i> {{ site.data.cv.personal.location.zh }}</span>
</div>

<h2 class="cv-section-title">研究兴趣</h2>

<ul class="cv-list">
{% for interest in site.data.cv.research_interests.zh %}
  <li>{{ interest }}</li>
{% endfor %}
</ul>

<h2 class="cv-section-title">教育经历</h2>

{% for edu in site.data.cv.education %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ edu.institution.zh }}</strong>
    <span class="cv-date">{{ edu.date.zh }}</span>
  </div>
  <div class="cv-entry-content">
    {{ edu.degree.zh }}{% if edu.supervisor %}, 导师: <a href="{{ edu.supervisor_url }}">{{ edu.supervisor.zh }}</a>{% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">发表论文</h2>

{% assign sorted_papers = site.data.papers.papers | sort: "date" | reverse %}
{% for paper in sorted_papers %}
<div class="cv-entry cv-publication">
  <div class="cv-entry-content">
    <strong>{{ paper.title }}</strong><br>
    {{ paper.authors | join: ", " }}<br>
    <em>{{ paper.venue }}</em>, {{ paper.date | date: "%Y" }}
    {% if paper.contribution %}
    <div class="cv-contribution">
      <strong>个人贡献:</strong>
      {{ paper.contribution | markdownify }}
    </div>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">项目经历</h2>

{% for project in site.data.cv.projects %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ project.name.zh }}</strong>
    <span class="cv-date">{{ project.date.zh }}</span>
  </div>
  <div class="cv-entry-content">
    <em>{{ project.role.zh }}</em><br>
    {{ project.description.zh }}
    {% if project.highlights.zh %}
    <ul class="cv-highlights">
      {% for highlight in project.highlights.zh %}
      <li>{{ highlight }}</li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">实习经历</h2>

{% for intern in site.data.cv.internships %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ intern.company.zh }}</strong>, {{ intern.location.zh }}
    <span class="cv-date">{{ intern.date.zh }}</span>
  </div>
  <div class="cv-entry-content">
    <em>{{ intern.position.zh }}</em>
    {% if intern.description.zh %}<br>{{ intern.description.zh }}{% endif %}
    {% if intern.responsibilities.zh %}
    <ul class="cv-highlights">
      {% for resp in intern.responsibilities.zh %}
      <li>{{ resp }}</li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">荣誉奖项</h2>

<ul class="cv-list">
{% for award in site.data.cv.awards %}
  <li>{{ award.title.zh }}{% if award.year %}, {{ award.year }}{% endif %}</li>
{% endfor %}
</ul>

<h2 class="cv-section-title">技能</h2>

<ul class="cv-list">
{% for skill in site.data.cv.skills %}
  <li><strong>{{ skill.category.zh }}</strong>: {{ skill.items }}</li>
{% endfor %}
</ul>

</div>
