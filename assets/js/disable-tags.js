// 태그 링크 비활성화
document.addEventListener('DOMContentLoaded', function() {
  // 모든 태그 링크 찾기
  const tagLinks = document.querySelectorAll('.post-tag');
  
  // 각 태그 링크에 대해
  tagLinks.forEach(function(link) {
    // 링크의 텍스트 콘텐츠 저장
    const text = link.textContent;
    
    // 링크 클릭 이벤트 방지
    link.addEventListener('click', function(e) {
      e.preventDefault();
      return false;
    });
    
    // 또는 링크를 span으로 대체할 수도 있음
    // const span = document.createElement('span');
    // span.className = 'post-tag';
    // span.textContent = text;
    // link.parentNode.replaceChild(span, link);
  });
});
