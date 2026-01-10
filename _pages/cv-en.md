---
layout: archive
title: "Curriculum Vitae"
permalink: /cv/
author_profile: true
---

<div class="cv-actions">
  <button onclick="window.print()" class="btn btn--primary"><i class="fa fa-download"></i> Download PDF</button>
  <a href="/cv-zh/" class="btn btn--info">中文版</a>
</div>

<div class="cv-content" id="cv-content">

## {{ site.data.cv.personal.name.en }}

<div class="cv-contact">
  <span><i class="fa fa-envelope"></i> {{ site.data.cv.personal.email }}</span>
  <span><i class="fa fa-globe"></i> <a href="{{ site.data.cv.personal.website }}">{{ site.data.cv.personal.website }}</a></span>
  <span><i class="fa fa-github"></i> <a href="https://github.com/{{ site.data.cv.personal.github }}">{{ site.data.cv.personal.github }}</a></span>
  <span><i class="fa fa-map-marker"></i> {{ site.data.cv.personal.location.en }}</span>
</div>

## Research Interests

{% for interest in site.data.cv.research_interests.en %}
- {{ interest }}
{% endfor %}

## Education

{% for edu in site.data.cv.education %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ edu.institution.en }}</strong>
    <span class="cv-date">{{ edu.date.en }}</span>
  </div>
  <div class="cv-entry-content">
    {{ edu.degree.en }}{% if edu.supervisor %}, Supervisor: <a href="{{ edu.supervisor_url }}">{{ edu.supervisor.en }}</a>{% endif %}
  </div>
</div>
{% endfor %}

## Publications

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

## Internships

{% for intern in site.data.cv.internships %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ intern.company.en }}</strong>, {{ intern.location.en }}
    <span class="cv-date">{{ intern.date.en }}</span>
  </div>
  <div class="cv-entry-content">
    {{ intern.position.en }}{% if intern.description.en %}<br>{{ intern.description.en }}{% endif %}
  </div>
</div>
{% endfor %}

## Honors & Awards

{% for award in site.data.cv.awards %}
- {{ award.title.en }}{% if award.year %}, {{ award.year }}{% endif %}
{% endfor %}

## Skills

{% for skill in site.data.cv.skills %}
- **{{ skill.category.en }}**: {{ skill.items }}
{% endfor %}

</div>
