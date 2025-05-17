---
layout: vintage
title: Tags
---

<h1>Tags</h1>

<div class="tags">
  {% for tag in site.tags %}
  <div class="tag">
    <h2 id="{{ tag[0] | slugify }}">{{ tag[0] }}</h2>
    <ul>
      {% for post in tag[1] %}
      <li>
        <a href="{{ post.url | relative_url }}">
          {{ post.title }}
        </a>
        <small>({{ post.date | date: "%b %d, %Y" }})</small>
      </li>
      {% endfor %}
    </ul>
  </div>
  {% endfor %}
</div>
