from PIL import Image, ImageDraw, ImageFont

# 1920x1080 16:9 Slide
W, H = 1920, 1080
img = Image.new('RGB', (W, H), '#f4f8f7')
draw = ImageDraw.Draw(img)

font_regular_path = "/workspace/fonts/NotoSansCJK-Regular.ttc"
font_bold_path = "/workspace/fonts/NotoSansCJK-Bold.ttc"

def get_font(size, bold=False):
    path = font_bold_path if bold else font_regular_path
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# Palette
C_DARK_TEAL = '#0f3d3e'
C_SEA = '#1f6f6a'
C_SEA_LIGHT = '#e7f1ef'
C_INK_SOFT = '#3a5557'
C_SAND = '#d8e4e1'
C_WHITE = '#ffffff'
C_WARN = '#9a5b2f'
C_EMERALD = '#059669'

# Header Container
draw.rectangle([0, 0, W, 140], fill='#ffffff')
draw.line([0, 140, W, 140], fill=C_SAND, width=2)

# Top Left Tag & Title
draw.rounded_rectangle([70, 32, 235, 66], radius=8, fill=C_SEA)
draw.text((85, 38), "WAVE PLATFORM", fill=C_WHITE, font=get_font(14, bold=True))

draw.text((255, 39), "심리학 종단 연구를 위한 모바일 퍼스트 설문 플랫폼", fill=C_INK_SOFT, font=get_font(18))
draw.text((70, 78), "앱 전체 흐름 : 제작  →  수집  →  채점  →  내보내기", fill=C_DARK_TEAL, font=get_font(36, bold=True))

# Top Right Meta
draw.text((W - 350, 42), "Wave Survey Platform", fill=C_SEA, font=get_font(22, bold=True))
draw.text((W - 350, 76), "End-to-End Longitudinal Research Pipeline", fill=C_INK_SOFT, font=get_font(13))

# 4 Columns Grid
card_w = 410
card_h = 760
gap = 35
start_x = 70
start_y = 180

steps = [
    {
        "num": "1",
        "title": "1. 제작 (Design)",
        "sub": "공인 척도 & 커스텀 빌더",
        "bullets": [
            "8종 공인 심리학 척도 라이브러리",
            "APA 7th 공식 학술 인용문 제공",
            "커스텀 척도 다중 문항 일괄 제작",
            "드래그 앤 드롭 문항 순서 재배치",
            "한눈에 보기 (Condensed Table) 지원"
        ],
        "preview_title": "척도 라이브러리 & 빌더",
        "preview_items": [
            ("삶의 만족도 척도 (SWLS)", "Diener et al. (1985) · 5문항", True),
            ("10문항 성격 검사 (TIPI)", "Gosling et al. (2003) · 10문항", False),
            ("+ 직접 척도 & 문항 추가", "한/영 이중언어 · 변수명 자동", False),
        ]
    },
    {
        "num": "2",
        "title": "2. 수집 (Collect)",
        "sub": "모바일 UI & 종단 발송",
        "bullets": [
            "모바일 한 화면에 한 문항씩 집중",
            "엄지 터치에 최적화된 큰 선택지 버튼",
            "5대 발송 스케줄 (Daily, EMA, Wave)",
            "회차별 응답 마감 시한 (Window)",
            "익명 고유 코드로 종단 응답 연동"
        ],
        "preview_title": "모바일 설문 화면 (Phone UX)",
    },
    {
        "num": "3",
        "title": "3. 채점 (Score)",
        "sub": "자동 역코딩 & 프로토콜",
        "bullets": [
            "scoreAll() 엔진 실시간 자동 연산",
            "역코딩 [R] 항목 자동 반전 채점",
            "합산(Sum) / 평균(Mean) 방식 설정",
            "결측치 규칙 (Listwise / Prorate)",
            "하위요인 (Subscales) 및 총점 산출"
        ],
        "preview_title": "채점 프로토콜 & 실시간 테이블",
    },
    {
        "num": "4",
        "title": "4. 내보내기 (Export)",
        "sub": "연구용 3종 CSV 데이터셋",
        "bullets": [
            "와이드 포맷 원자료 (Raw Data CSV)",
            "하위척도·총점 계산 (Scored CSV)",
            "변수 메타데이터 명세서 (Codebook)",
            "참가자 × 회차 매트릭스 구성",
            "R / SPSS / Python 분석에 즉시 투입"
        ],
        "preview_title": "1-클릭 데이터 다운로드",
    }
]

for idx, step in enumerate(steps):
    cx = start_x + idx * (card_w + gap)
    cy = start_y
    
    # Outer Card
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=24, fill=C_WHITE, outline=C_SAND, width=2)
    
    # Card Header
    draw.rounded_rectangle([cx, cy, cx + card_w, cy + 90], radius=22, fill=C_SEA)
    draw.rectangle([cx, cy + 60, cx + card_w, cy + 90], fill=C_SEA)
    
    # Number badge
    draw.rounded_rectangle([cx + 18, cy + 18, cx + 64, cy + 68], radius=14, fill=C_WHITE)
    draw.text((cx + 31, cy + 22), step["num"], fill=C_SEA, font=get_font(28, bold=True))
    
    # Header Text
    draw.text((cx + 78, cy + 22), step["title"], fill=C_WHITE, font=get_font(21, bold=True))
    draw.text((cx + 78, cy + 54), step["sub"], fill='#d8e4e1', font=get_font(13))
    
    # --- Inner UI Mockup Box ---
    mx = cx + 20
    my = cy + 112
    mw = card_w - 40
    mh = 355
    draw.rounded_rectangle([mx, my, mx + mw, my + mh], radius=18, fill=C_SEA_LIGHT, outline=C_SAND, width=1)
    
    # Inner box header
    draw.text((mx + 15, my + 14), step["preview_title"], fill=C_DARK_TEAL, font=get_font(15, bold=True))
    draw.line([mx + 15, my + 40, mx + mw - 15, my + 40], fill=C_SAND, width=1)
    
    if idx == 0:
        # Step 1: Scales mockup
        sy = my + 52
        for title, author, added in step["preview_items"]:
            draw.rounded_rectangle([mx + 12, sy, mx + mw - 12, sy + 76], radius=12, fill=C_WHITE, outline=C_SAND, width=1)
            draw.text((mx + 22, sy + 10), title, fill=C_DARK_TEAL, font=get_font(14, bold=True))
            draw.text((mx + 22, sy + 32), author, fill=C_INK_SOFT, font=get_font(12))
            draw.text((mx + 22, sy + 52), "▼ show apa citation", fill=C_SEA, font=get_font(11, bold=True))
            if added:
                draw.rounded_rectangle([mx + mw - 65, sy + 10, mx + mw - 20, sy + 30], radius=6, fill='#d1fae5')
                draw.text((mx + mw - 57, sy + 12), "추가됨", fill=C_EMERALD, font=get_font(11, bold=True))
            sy += 90
            
    elif idx == 1:
        # Step 2: Phone Survey Mockup
        sy = my + 50
        draw.text((mx + 16, sy), "Day 1 / 14", fill=C_SEA, font=get_font(13, bold=True))
        draw.rounded_rectangle([mx + mw - 80, sy - 2, mx + mw - 16, sy + 20], radius=6, fill=C_DARK_TEAL)
        draw.text((mx + mw - 72, sy), "DEMO01", fill=C_WHITE, font=get_font(11, bold=True))
        
        # Progress Bar
        draw.rounded_rectangle([mx + 16, sy + 26, mx + mw - 16, sy + 34], radius=4, fill=C_SAND)
        draw.rounded_rectangle([mx + 16, sy + 26, mx + (mw * 0.45), sy + 34], radius=4, fill=C_SEA)
        
        # Question card
        qy = sy + 46
        draw.rounded_rectangle([mx + 12, qy, mx + mw - 12, qy + 226], radius=14, fill=C_WHITE, outline=C_SAND, width=1)
        draw.text((mx + 20, qy + 12), "Q2. 나의 삶의 상황들은 아주 좋다.", fill=C_DARK_TEAL, font=get_font(14, bold=True))
        draw.text((mx + 20, qy + 32), "The conditions of my life are excellent.", fill=C_INK_SOFT, font=get_font(11))
        
        # Selected option
        draw.rounded_rectangle([mx + 18, qy + 60, mx + mw - 18, qy + 115], radius=12, fill=C_SEA)
        draw.rounded_rectangle([mx + 28, qy + 72, mx + 60, qy + 104], radius=16, fill='#ffffff33')
        draw.text((mx + 39, qy + 74), "4", fill=C_WHITE, font=get_font(17, bold=True))
        draw.text((mx + 72, qy + 75), "동의한다 (Agree)", fill=C_WHITE, font=get_font(14, bold=True))
        
        # Unselected option
        draw.rounded_rectangle([mx + 18, qy + 125, mx + mw - 18, qy + 175], radius=12, fill='#f8faf9', outline=C_SAND, width=1)
        draw.rounded_rectangle([mx + 28, qy + 135, mx + 60, qy + 165], radius=16, fill=C_SEA_LIGHT)
        draw.text((mx + 39, qy + 137), "5", fill=C_DARK_TEAL, font=get_font(15, bold=True))
        draw.text((mx + 72, qy + 139), "매우 동의한다 (Strongly agree)", fill=C_INK_SOFT, font=get_font(13))
        
        draw.text((mx + 20, qy + 196), "실시간 자동 저장됨 ✓", fill=C_SEA, font=get_font(12, bold=True))
        
    elif idx == 2:
        # Step 3: Scoring Protocol & Table Mockup
        sy = my + 50
        # Protocol boxes
        draw.rounded_rectangle([mx + 12, sy, mx + (mw/2) - 4, sy + 65], radius=10, fill=C_WHITE, outline=C_SAND, width=1)
        draw.text((mx + 20, sy + 9), "집계 방식 (Aggregation)", fill=C_INK_SOFT, font=get_font(11))
        draw.text((mx + 20, sy + 32), "Sum / Mean 설정", fill=C_DARK_TEAL, font=get_font(13, bold=True))
        
        draw.rounded_rectangle([mx + (mw/2) + 4, sy, mx + mw - 12, sy + 65], radius=10, fill=C_WHITE, outline=C_SAND, width=1)
        draw.text((mx + (mw/2) + 12, sy + 9), "역코딩 (Reverse-Score)", fill=C_INK_SOFT, font=get_font(11))
        draw.text((mx + (mw/2) + 12, sy + 32), "[R] (min+max)-raw", fill=C_WARN, font=get_font(13, bold=True))
        
        # Scored table mockup
        ty = sy + 80
        draw.rounded_rectangle([mx + 12, ty, mx + mw - 12, ty + 198], radius=12, fill=C_WHITE, outline=C_SAND, width=1)
        draw.rectangle([mx + 12, ty, mx + mw - 12, ty + 35], fill='#e7f1ef')
        draw.text((mx + 22, ty + 8), "Code", fill=C_DARK_TEAL, font=get_font(12, bold=True))
        draw.text((mx + 110, ty + 8), "Occasion", fill=C_DARK_TEAL, font=get_font(12, bold=True))
        draw.text((mx + 230, ty + 8), "swls_total", fill=C_DARK_TEAL, font=get_font(12, bold=True))
        
        rows = [
            ("DEMO01", "Day 1 (Wave 1)", "25.0"),
            ("DEMO01", "Day 2 (Wave 2)", "23.0"),
            ("DEMO02", "Day 1 (Wave 1)", "18.0"),
            ("DEMO03", "Day 1 (Wave 1)", "21.0"),
        ]
        ry = ty + 46
        for c, o, s in rows:
            draw.text((mx + 22, ry), c, fill=C_SEA, font=get_font(13, bold=True))
            draw.text((mx + 110, ry), o, fill=C_INK_SOFT, font=get_font(12))
            draw.text((mx + 245, ry), s, fill=C_DARK_TEAL, font=get_font(14, bold=True))
            draw.line([mx + 16, ry + 25, mx + mw - 16, ry + 25], fill='#f0f4f3', width=1)
            ry += 36
            
    elif idx == 3:
        # Step 4: 3 CSV Export Buttons Mockup
        sy = my + 50
        draw.text((mx + 16, sy), "연구용 데이터셋 3종 내보내기", fill=C_DARK_TEAL, font=get_font(13, bold=True))
        
        # Button 1
        b1_y = sy + 30
        draw.rounded_rectangle([mx + 12, b1_y, mx + mw - 12, b1_y + 70], radius=14, fill=C_SEA)
        draw.text((mx + 25, b1_y + 14), "[CSV]  원자료 (Raw Data)", fill=C_WHITE, font=get_font(15, bold=True))
        draw.text((mx + 25, b1_y + 40), "참가자 × 문항 와이드 매트릭스 전체", fill='#d8e4e1', font=get_font(12))
        
        # Button 2
        b2_y = b1_y + 82
        draw.rounded_rectangle([mx + 12, b2_y, mx + mw - 12, b2_y + 70], radius=14, fill=C_SEA)
        draw.text((mx + 25, b2_y + 14), "[CSV]  채점 데이터 (Scored)", fill=C_WHITE, font=get_font(15, bold=True))
        draw.text((mx + 25, b2_y + 40), "하위요인 및 총점 자동 산출 데이터셋", fill='#d8e4e1', font=get_font(12))
        
        # Button 3
        b3_y = b2_y + 82
        draw.rounded_rectangle([mx + 12, b3_y, mx + mw - 12, b3_y + 70], radius=14, fill=C_WHITE, outline=C_SEA, width=2)
        draw.text((mx + 25, b3_y + 14), "[CSV]  코드북 (Codebook)", fill=C_SEA, font=get_font(15, bold=True))
        draw.text((mx + 25, b3_y + 40), "변수명, 역코딩, 척도 메타데이터 명세서", fill=C_INK_SOFT, font=get_font(12))

    # --- Bullets Section at Bottom of Card ---
    by = my + mh + 24
    for b in step["bullets"]:
        draw.text((cx + 22, by), "•", fill=C_SEA, font=get_font(16, bold=True))
        draw.text((cx + 42, by), b, fill=C_INK_SOFT, font=get_font(14))
        by += 28

# Bottom Footer
draw.rounded_rectangle([70, H - 95, W - 70, H - 35], radius=16, fill=C_WHITE, outline=C_SAND, width=2)
draw.ellipse([95, H - 68, 107, H - 56], fill=C_EMERALD)
draw.text((118, H - 72), "모바일 최적화 UX (스마트폰 즉시 응답)", fill=C_DARK_TEAL, font=get_font(15, bold=True))

draw.ellipse([450, H - 68, 462, H - 56], fill=C_EMERALD)
draw.text((473, H - 72), "한/영 이중언어 (글로벌 연구 대응)", fill=C_DARK_TEAL, font=get_font(15, bold=True))

draw.ellipse([780, H - 68, 792, H - 56], fill=C_EMERALD)
draw.text((803, H - 72), "자동 채점 & 코드북 (데이터 정제 공수 90% 절감)", fill=C_DARK_TEAL, font=get_font(15, bold=True))

draw.text((W - 370, H - 72), "Wave : Longitudinal Survey Platform", fill=C_SEA, font=get_font(15, bold=True))

output_path = "/opt/cursor/artifacts/wave_app_workflow_slide.png"
img.save(output_path, quality=95)
print(f"Generated clean Korean 16:9 slide at {output_path}")
