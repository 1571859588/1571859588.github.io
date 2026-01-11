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

<div class="cv-header">
  {% if site.data.cv.personal.photo %}
  <div class="cv-photo">
    <img src="{{ site.data.cv.personal.photo }}" alt="{{ site.data.cv.personal.name.en }}">
  </div>
  {% endif %}
  <div class="cv-header-info">
    <h2 class="cv-name">{{ site.data.cv.personal.name.en }}</h2>
  </div>
</div>

<div class="cv-contact">
  <span><i class="fa fa-envelope"></i> {{ site.data.cv.personal.email }}</span>
  <span><i class="fa fa-globe"></i> <a href="{{ site.data.cv.personal.website }}">{{ site.data.cv.personal.website }}</a></span>
  <span><i class="fa fa-github"></i> <a href="https://github.com/{{ site.data.cv.personal.github }}">{{ site.data.cv.personal.github }}</a></span>
  <span><i class="fa fa-map-marker"></i> {{ site.data.cv.personal.location.en }}</span>
</div>

<h2 class="cv-section-title">Research Interests</h2>

<ul class="cv-list">
{% for interest in site.data.cv.research_interests.en %}
  <li>{{ interest }}</li>
{% endfor %}
</ul>

<h2 class="cv-section-title">Education</h2>

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

<h2 class="cv-section-title">Publications</h2>

{% assign sorted_papers = site.data.papers.papers | sort: "date" | reverse %}
{% for paper in sorted_papers %}
<div class="cv-entry cv-publication">
  <div class="cv-entry-content">
    <strong>{{ paper.title }}</strong><br>
    {{ paper.authors | join: ", " }}<br>
    <em>{{ paper.venue }}</em>, {{ paper.date | date: "%Y" }}
    {% if paper.contribution %}
    <div class="cv-contribution">
      <strong>My Contribution:</strong>
      {{ paper.contribution | markdownify }}
    </div>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">Projects</h2>

{% for project in site.data.cv.projects %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ project.name.en }}</strong>
    <span class="cv-date">{{ project.date.en }}</span>
  </div>
  <div class="cv-entry-content">
    <em>{{ project.role.en }}</em><br>
    {{ project.description.en }}
    {% if project.highlights.en %}
    <ul class="cv-highlights">
      {% for highlight in project.highlights.en %}
      <li>{{ highlight }}</li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">Internships</h2>

{% for intern in site.data.cv.internships %}
<div class="cv-entry">
  <div class="cv-entry-header">
    <strong>{{ intern.company.en }}</strong>, {{ intern.location.en }}
    <span class="cv-date">{{ intern.date.en }}</span>
  </div>
  <div class="cv-entry-content">
    <em>{{ intern.position.en }}</em>
    {% if intern.description.en %}<br>{{ intern.description.en }}{% endif %}
    {% if intern.responsibilities.en %}
    <ul class="cv-highlights">
      {% for resp in intern.responsibilities.en %}
      <li>{{ resp }}</li>
      {% endfor %}
    </ul>
    {% endif %}
  </div>
</div>
{% endfor %}

<h2 class="cv-section-title">Honors & Awards</h2>

<ul class="cv-list">
{% for award in site.data.cv.awards %}
  <li>{{ award.title.en }}{% if award.year %}, {{ award.year }}{% endif %}</li>
{% endfor %}
</ul>

<h2 class="cv-section-title">Skills</h2>

<ul class="cv-list">
{% for skill in site.data.cv.skills %}
  <li><strong>{{ skill.category.en }}</strong>: {{ skill.items }}</li>
{% endfor %}
</ul>

</div>
