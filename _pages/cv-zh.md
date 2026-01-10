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

## {{ site.data.cv.personal.name.zh }} ({{ site.data.cv.personal.name.en }})

<div class="cv-contact">
  <span><i class="fa fa-envelope"></i> {{ site.data.cv.personal.email }}</span>
  <span><i class="fa fa-globe"></i> <a href="{{ site.data.cv.personal.website }}">{{ site.data.cv.personal.website }}</a></span>
  <span><i class="fa fa-github"></i> <a href="https://github.com/{{ site.data.cv.personal.github }}">{{ site.data.cv.personal.github }}</a></span>
  <span><i class="fa fa-map-marker"></i> {{ site.data.cv.personal.location.zh }}</span>
</div>

## 研究兴趣

{% for interest in site.data.cv.research_interests.zh %}
- {{ interest }}
{% endfor %}

## 教育经历

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

## 发表论文

{% assign sorted_papers = site.data.papers.papers | sort: "date" | reverse %}
{% for paper in sorted_papers %}
<div class="cv-entry">
  <div class="cv-entry-content">
    <strong>{{ paper.title }}</strong><br>
    {{ paper.authors | join: ", " }}<br>
    <em>{{ paper.venue }}</em>, {{ paper.date | date: "%Y" }}
  </div>
</div>
{% endfor %}

## 实习经历

{% for intern in site.data.cv.internships %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ intern.company.zh }}</strong>, {{ intern.location.zh }}
    <span class="cv-date">{{ intern.date.zh }}</span>
  </div>
  <div class="cv-entry-content">
    {{ intern.position.zh }}{% if intern.description.zh %}<br>{{ intern.description.zh }}{% endif %}
  </div>
</div>
{% endfor %}

## 荣誉奖项

{% for award in site.data.cv.awards %}
- {{ award.title.zh }}{% if award.year %}, {{ award.year }}{% endif %}
{% endfor %}

## 技能

{% for skill in site.data.cv.skills %}
- **{{ skill.category.zh }}**: {{ skill.items }}
{% endfor %}

</div>
