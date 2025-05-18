---
layout: vintage
title: 태그
permalink: /tags/
---

<h1>태그별 포스트</h1>

<div class="tags-page">
  {% assign sorted_tags = site.tags | sort %}
  {% for tag in sorted_tags %}
    <div class="tag-section" id="{{ tag[0] | slugify }}">
      <h2>{{ tag[0] }}</h2>
      <ul>
        {% for post in tag[1] %}
        <li>
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          <small>({{ post.date | date: "%b %d, %Y" }})</small>
        </li>
        {% endfor %}
      </ul>
    </div>
  {% endfor %}
</div>

<style>
  .tag-section {
    margin-bottom: 2rem;
  }
  .tag-section h2 {
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
  }
  .tag-section ul {
    list-style-type: disc;
    margin-left: 1.5rem;
  }
  .tag-section li {
    margin-bottom: 0.5rem;
  }
</style>