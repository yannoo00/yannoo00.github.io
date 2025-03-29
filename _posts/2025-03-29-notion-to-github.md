---
layout: post
title: "Notion to 블로그"
categories: other
tags: python
---

## Notion to Github.io

노션에 PS 기록을 해왔는데 이번에 github 블로그로 내용들을 모두 옮겼다.  

Claude에게 노션 page의 html을 주고 이 html을 주어진 양식에 맞춰 md 형식으로 변환하는 python 코드를 작성해달라고 요청했다.  

![Image](https://github.com/user-attachments/assets/40d13296-63d0-48f2-be24-6d6608072831)  
원래 이런 식으로 노션의 테이블로 문제별 페이지를 볼 수 있게 해뒀다.  
그랬더니 page별로 따로 html을 가지는데 페이지로 가는 url 구조가 규칙성이 없어보여서 크롤링이 어려웠고, 원래는 selenium으로 접속해서 페이지별로 크롤링 -> html을 받은 후 거기서 바로 md로 변환하려 했으나 직접 html을 다운 받은 다음 그것들을 변환만 해주는 것이 훨씬 쉽다는 것을 깨달았다...  

<br>

![Image](https://github.com/user-attachments/assets/41a0d9de-cb67-4596-8634-f3fc0f6fbb79)  

이렇게 하위 페이지 포함으로 html 내보내기를 한 후 
문제별로 생긴(404개) html 파일을 .md 파일로 변환하는 코드를 생성,

```py
import os
import re
from bs4 import BeautifulSoup
import html2text
from datetime import datetime
from tqdm import tqdm

def html_to_markdown(html_file_path):
    """Convert HTML file to markdown format"""
    
    # Read HTML file
    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Get title from the page title
    title = soup.find('h1', class_='page-title').text.strip() if soup.find('h1', class_='page-title') else "제목 없음"
    
    # Get metadata from the properties table
    properties = {}
    if soup.find('table', class_='properties'):
        rows = soup.find('table', class_='properties').find_all('tr')
        for row in rows:
            key_elem = row.find('th')
            value_elem = row.find('td')
            if key_elem and value_elem:
                key = key_elem.text.strip()
                # Handle different property types
                if 'link' in row.get('class', []) or row.find('a', class_='url-value'):
                    value = value_elem.find('a').get('href') if value_elem.find('a') else ""
                elif row.find('span', class_='selected-value'):
                    value = value_elem.find('span', class_='selected-value').text.strip()
                elif row.find('time'):
                    value = value_elem.find('time').text.strip()
                    # Remove @ if present
                    value = value.replace('@', '')
                else:
                    value = value_elem.text.strip()
                
                properties[key] = value
    
    # Create markdown header
    md_content = "---\n"
    md_content += f"layout: post\n"
    md_content += f"title: \"{title}\"\n"
    
    # Add categories and tags if available
    if '유형' in properties:
        categories = "PS"  # Default category
        tags = properties.get('유형', '')
        
        md_content += f"categories: {categories}\n"
        md_content += f"tags: {tags}\n"
    
    md_content += "---\n\n"
    
    # Add problem info section
    md_content += "## 문제 정보\n"
    
    if '링크' in properties:
        md_content += f"- 문제 링크: [{title}]({properties['링크']})\n"
    
    if '난이도' in properties:
        difficulty = properties['난이도']
        color_code = get_difficulty_color(difficulty)
        md_content += f"- 난이도: <span style=\"color:{color_code}\">{difficulty}</span>\n"
    
    if '완료일' in properties:
        md_content += f"- 완료일: {properties['완료일']}\n"
    
    if '유형' in properties:
        md_content += f"- 유형: {properties['유형']}\n"
    
    if '특이사항' in properties and properties['특이사항']:
        md_content += f"- 특이사항: {properties['특이사항']}\n"
    
    md_content += "\n"
    
    # Extract main content
    main_content = soup.find('div', class_='page-body')
    if main_content:
        # Process code blocks first
        code_blocks = main_content.find_all('pre', class_='code')
        for code_block in code_blocks:
            code = code_block.find('code')
            if code:
                language = code.get('class', [''])[0].replace('language-', '') if code.get('class') else ''
                code_content = code.text
                markdown_code = f"```{language}\n{code_content}\n```"
                # Replace the code block with a placeholder
                placeholder = f"CODE_BLOCK_{hash(code_content) & 0xffffffff}"
                code_block.replace_with(BeautifulSoup(f"<div>{placeholder}</div>", 'html.parser'))
                # Store the markdown code
                properties[placeholder] = markdown_code
    
        # Convert to markdown
        h2t_handler = html2text.HTML2Text()
        h2t_handler.ignore_links = False
        h2t_handler.body_width = 0  # No wrapping
        h2t_handler.protect_links = True
        h2t_handler.unicode_snob = True
        h2t_handler.ignore_images = False
        h2t_handler.skip_internal_links = False
        
        markdown_body = h2t_handler.handle(str(main_content))
        
        # Replace code block placeholders with actual markdown code
        for placeholder, markdown_code in properties.items():
            if placeholder.startswith('CODE_BLOCK_'):
                markdown_body = markdown_body.replace(placeholder, markdown_code)
        
        # Clean up markdown
        markdown_body = clean_markdown(markdown_body)
        
        md_content += markdown_body
    
    return md_content

def get_difficulty_color(difficulty):
    """Return color code based on difficulty level"""
    difficulty_lower = difficulty.lower()
    
    if '브론즈' in difficulty_lower:
        return "#D2A28D"
    elif '실버' in difficulty_lower:
        if '실버1' in difficulty_lower:
            return "#544831"
        else:
            return "#B5C78A"
    elif '골드' in difficulty_lower:
        return "#FFA500"
    else:
        return "#000000"  # Default black

def clean_markdown(markdown_text):
    """Clean up the markdown text"""
    # Remove extra blank lines
    markdown_text = re.sub(r'\n{3,}', '\n\n', markdown_text)
    
    # Fix header formatting (remove excess spaces)
    markdown_text = re.sub(r'##\s+', '## ', markdown_text)
    markdown_text = re.sub(r'###\s+', '### ', markdown_text)
    
    # Fix list formatting
    markdown_text = re.sub(r'\*\s+', '* ', markdown_text)
    
    # Fix indentation (convert "    " to proper markdown)
    lines = markdown_text.split('\n')
    for i in range(len(lines)):
        if lines[i].startswith('    ') and not lines[i].strip().startswith('```'):
            lines[i] = '> ' + lines[i].strip()
    
    markdown_text = '\n'.join(lines)
    
    return markdown_text

def process_html_files(input_dir, output_dir):
    """Process all HTML files in the input directory and convert them to MD files in the output directory"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all HTML files
    html_files = [f for f in os.listdir(input_dir) if f.endswith('.html')]
    
    print(f"Found {len(html_files)} HTML files to convert")
    
    for html_file in tqdm(html_files):
        input_path = os.path.join(input_dir, html_file)
        
        # Generate output filename (remove random ID part from Notion exports)
        filename = html_file.split('.html')[0]
        # Remove the random ID part if it exists (typically 32 characters)
        filename = re.sub(r'[a-f0-9]{32}$', '', filename)
        filename = filename.strip()
        
        # Extract date if available (format: YYYY-MM-DD)
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        if date_match:
            date_str = date_match.group(1)
        else:
            # Use current date
            date_str = datetime.now().strftime('%Y-%m-%d')
        
        # Add date prefix if not already there
        if not filename.startswith(date_str):
            filename = f"{date_str}-{filename}"
        
        # Clean up filename
        filename = re.sub(r'\s+', '-', filename)  # Replace spaces with hyphens
        filename = re.sub(r'[^\w\-]', '', filename)  # Remove special characters
        
        output_path = os.path.join(output_dir, f"{filename}.md")
        
        # Convert HTML to MD
        md_content = html_to_markdown(input_path)
        
        # Write MD file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        print(f"Converted {html_file} to {filename}.md")

def main():
    # Google Colab interface
    from google.colab import files
    import zipfile
    import shutil
    
    print("HTML to Markdown Converter for Algorithm Problem Posts")
    print("------------------------------------------------------")
    print("이 코드는 HTML 파일을 마크다운(MD) 파일로 변환합니다.")
    print("HTML 파일을 업로드하면 자동으로 변환하여 다운로드 링크를 제공합니다.")
    
    print("\n1. HTML 파일 업로드 중...")
    uploaded = files.upload()
    
    # Create temporary directories
    temp_input_dir = 'temp_input'
    temp_output_dir = 'temp_output'
    os.makedirs(temp_input_dir, exist_ok=True)
    os.makedirs(temp_output_dir, exist_ok=True)
    
    # Extract zip files if uploaded
    for filename, content in uploaded.items():
        if filename.endswith('.zip'):
            with open(filename, 'wb') as f:
                f.write(content)
            
            with zipfile.ZipFile(filename, 'r') as zip_ref:
                zip_ref.extractall(temp_input_dir)
            
            print(f"압축 파일 {filename}을 풀었습니다.")
        else:
            # Save individual files
            with open(os.path.join(temp_input_dir, filename), 'wb') as f:
                f.write(content)
    
    print("\n2. HTML 파일 변환 중...")
    process_html_files(temp_input_dir, temp_output_dir)
    
    print("\n3. 변환된 마크다운 파일 압축 중...")
    output_zip = 'converted_markdown_files.zip'
    with zipfile.ZipFile(output_zip, 'w') as zipf:
        for root, dirs, files in os.walk(temp_output_dir):
            for file in files:
                zipf.write(os.path.join(root, file), 
                          os.path.relpath(os.path.join(root, file), 
                                          os.path.join(temp_output_dir, '..')))
    
    print("\n4. 변환된 파일 다운로드 중...")
    files.download(output_zip)
    
    # Clean up
    shutil.rmtree(temp_input_dir)
    shutil.rmtree(temp_output_dir)
    os.remove(output_zip)
    
    print("\n변환 완료! 변환된 마크다운 파일이 'converted_markdown_files.zip'로 다운로드됩니다.")

if __name__ == "__main__":
    main()
```

404개 html파일을 지정한 양식에 맞춰 md 파일로 변환할 수 있었다.  
모두 다운받은 후 _post 파일에 옮겨 push했다.