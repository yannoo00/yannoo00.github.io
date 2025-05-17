---
layout: vintage
title: Categories
---

<h1>Categories</h1>

<div class="categories">
  {% for category_array in site.categories %}
    {% assign cat_name = category_array[0] %}
    {% assign cat_posts = category_array[1] %}
    <div class="category" id="{{ cat_name | slugify }}">
      <h2>{{ cat_name }}</h2>
      <ul>
        {% for post in cat_posts %}
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
