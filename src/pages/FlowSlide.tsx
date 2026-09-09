import { useLocale } from '../context/LocaleContext'

export function FlowSlide() {
  const { t } = useLocale()

  return (
    <div
      id="flow-slide-container"
      className="w-[1920px] h-[1080px] bg-gradient-to-br from-[#f8faf9] via-[#f0f4f3] to-[#e4ece9] text-[#102a2c] p-12 flex flex-col justify-between font-sans select-none overflow-hidden"
      style={{ fontFamily: '"Figtree", system-ui, -apple-system, sans-serif' }}
    >
      {/* Header Bar */}
      <div className="flex items-end justify-between border-b-2 border-[#1f6f6a]/20 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-[#1f6f6a] text-white text-sm font-extrabold tracking-widest uppercase rounded-lg shadow-sm">
              Wave Architecture
            </span>
            <span className="text-[#3a5557] text-lg font-semibold">
              심리학 종단 연구를 위한 모바일 퍼스트 설문 플랫폼
            </span>
          </div>
          <h1
            className="text-4xl font-extrabold text-[#0f3d3e] mt-2.5 tracking-tight"
            style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
          >
            앱 전체 워크플로우 : 제작 → 수집 → 채점 → 내보내기
          </h1>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#1f6f6a]">
            {t('Wave Survey Platform', 'Wave Survey Platform')}
          </p>
          <p className="text-xs text-[#3a5557] font-medium tracking-wide">
            End-to-End Longitudinal Research Pipeline
          </p>
        </div>
      </div>

      {/* 4 Process Cards */}
      <div className="grid grid-cols-4 gap-7 my-auto items-stretch">
        {/* STEP 1: 제작 */}
        <div className="flex flex-col bg-white rounded-3xl border-2 border-[#d8e4e1] shadow-xl overflow-hidden">
          <div className="bg-[#1f6f6a] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1f6f6a] font-extrabold text-base shadow-sm">
                1
              </span>
              <h2 className="text-xl font-bold tracking-tight">1. 제작 (Design)</h2>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-white font-semibold">
              설문 & 척도 구성
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {/* Real UI Mockup */}
            <div className="bg-[#f4f8f7] rounded-2xl border border-[#d8e4e1] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#d8e4e1] pb-1.5">
                <span className="font-extrabold text-[#0f3d3e] text-xs">
                  검증된 척도 & 커스텀 빌더
                </span>
                <span className="text-[10px] bg-[#1f6f6a]/15 text-[#1f6f6a] px-2 py-0.5 rounded font-bold">
                  8 Scales
                </span>
              </div>

              {/* Scale Item Card */}
              <div className="bg-white rounded-xl border border-[#d8e4e1] p-2.5 shadow-2xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0f3d3e] text-xs">
                    삶의 만족도 척도 (SWLS)
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    추가됨
                  </span>
                </div>
                <p className="text-[11px] text-[#3a5557] line-clamp-1">
                  Diener et al. (1985) · 5문항 7점 척도
                </p>
                <span className="inline-block text-[10px] text-[#1f6f6a] underline font-semibold">
                  ▼ show apa citation
                </span>
              </div>

              {/* Custom Scale Form */}
              <div className="bg-white rounded-xl border border-[#d8e4e1] p-2.5 shadow-2xs space-y-1.5">
                <span className="font-bold text-[#0f3d3e] text-xs block">
                  + 직접 척도 & 다중 문항 추가
                </span>
                <div className="flex gap-1.5 text-[10px] text-[#3a5557]">
                  <span className="bg-[#e7f1ef] px-2 py-0.5 rounded font-medium">한/영 이중언어</span>
                  <span className="bg-[#e7f1ef] px-2 py-0.5 rounded font-medium">드래그 순서변경</span>
                </div>
              </div>
            </div>

            {/* Feature Bullets */}
            <ul className="text-xs text-[#3a5557] space-y-2 border-t border-[#d8e4e1]/70 pt-3.5">
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>8종 공인 척도 라이브러리</strong> & APA 인용문</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>다중 문항 커스텀 척도</strong> 일괄 생성</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>드래그 & 드롭</strong> 순서 재배치 (한눈에 보기)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* STEP 2: 수집 */}
        <div className="flex flex-col bg-white rounded-3xl border-2 border-[#d8e4e1] shadow-xl overflow-hidden">
          <div className="bg-[#1f6f6a] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1f6f6a] font-extrabold text-base shadow-sm">
                2
              </span>
              <h2 className="text-xl font-bold tracking-tight">2. 수집 (Collect)</h2>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-white font-semibold">
              모바일 & 종단 발송
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {/* Phone UI Mockup */}
            <div className="bg-[#f4f8f7] rounded-2xl border border-[#d8e4e1] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#3a5557]">
                <span className="font-bold text-[#1f6f6a]">Day 1 / 14</span>
                <span className="bg-[#0f3d3e] text-white px-2 py-0.5 rounded font-mono text-[11px] font-bold">
                  DEMO01
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#d8e4e1] rounded-full overflow-hidden">
                <div className="bg-[#1f6f6a] h-full w-[40%]" />
              </div>

              {/* Question Box */}
              <div className="bg-white rounded-xl border border-[#d8e4e1] p-3 shadow-2xs space-y-2">
                <p className="font-bold text-[#0f3d3e] text-xs leading-snug">
                  Q2. 나의 삶의 상황들은 아주 좋다.
                </p>
                <div className="space-y-1.5">
                  <div className="bg-[#1f6f6a] text-white rounded-xl p-2 text-xs font-bold flex items-center gap-2 shadow-xs">
                    <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px]">4</span>
                    <span>동의한다 (Agree)</span>
                  </div>
                  <div className="bg-[#f4f8f7] text-[#3a5557] rounded-xl p-2 text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#d8e4e1] flex items-center justify-center text-[10px]">5</span>
                    <span>매우 동의한다</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Bullets */}
            <ul className="text-xs text-[#3a5557] space-y-2 border-t border-[#d8e4e1]/70 pt-3.5">
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>모바일 한 문항씩</strong> 집중 진행 (큰 터치 타깃)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>5대 발송 프리셋</strong> (Daily, EMA, Wave, T1-T3)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>익명 고유 코드</strong>로 반복 응답 자동 연동</span>
              </li>
            </ul>
          </div>
        </div>

        {/* STEP 3: 채점 */}
        <div className="flex flex-col bg-white rounded-3xl border-2 border-[#d8e4e1] shadow-xl overflow-hidden">
          <div className="bg-[#1f6f6a] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1f6f6a] font-extrabold text-base shadow-sm">
                3
              </span>
              <h2 className="text-xl font-bold tracking-tight">3. 채점 (Score)</h2>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-white font-semibold">
              자동 역코딩 & 집계
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {/* Scoring UI Mockup */}
            <div className="bg-[#f4f8f7] rounded-2xl border border-[#d8e4e1] p-3.5 space-y-2.5">
              <div className="flex justify-between items-center border-b border-[#d8e4e1] pb-1.5">
                <span className="font-extrabold text-[#0f3d3e] text-xs">
                  채점 프로토콜 설정
                </span>
                <span className="text-[11px] text-[#1f6f6a] font-bold font-mono">
                  scoreAll()
                </span>
              </div>

              {/* Protocol Config */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-white p-2 rounded-xl border border-[#d8e4e1]">
                  <span className="text-[10px] text-[#3a5557] block">집계 방식</span>
                  <strong className="text-[#0f3d3e] text-[11px]">Sum / Mean 선택</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#d8e4e1]">
                  <span className="text-[10px] text-[#3a5557] block">역코딩 규칙</span>
                  <strong className="text-amber-800 text-[11px] font-bold">[R] 자동 반전</strong>
                </div>
              </div>

              {/* Live Scored Table */}
              <div className="bg-white rounded-xl border border-[#d8e4e1] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#e7f1ef] text-[#0f3d3e] font-bold text-[10px]">
                    <tr>
                      <th className="p-1.5 pl-2.5">Code</th>
                      <th className="p-1.5">Wave</th>
                      <th className="p-1.5 text-right pr-2.5">swls_total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d8e4e1] text-[11px]">
                    <tr>
                      <td className="p-1.5 pl-2.5 font-mono font-bold text-[#1f6f6a]">DEMO01</td>
                      <td className="p-1.5 text-[#3a5557]">Day 1</td>
                      <td className="p-1.5 text-right pr-2.5 font-mono font-bold text-[#0f3d3e]">25.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Bullets */}
            <ul className="text-xs text-[#3a5557] space-y-2 border-t border-[#d8e4e1]/70 pt-3.5">
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>역코딩(Reverse Scored)</strong> 자동 연산 처리</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>합산/평균/결측치 규칙</strong> 실시간 반영</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>하위척도(Subscales) & 총점</strong> 자동 산출</span>
              </li>
            </ul>
          </div>
        </div>

        {/* STEP 4: 내보내기 */}
        <div className="flex flex-col bg-white rounded-3xl border-2 border-[#d8e4e1] shadow-xl overflow-hidden">
          <div className="bg-[#1f6f6a] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1f6f6a] font-extrabold text-base shadow-sm">
                4
              </span>
              <h2 className="text-xl font-bold tracking-tight">4. 내보내기 (Export)</h2>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full text-white font-semibold">
              연구용 3종 CSV
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {/* Export UI Mockup */}
            <div className="bg-[#f4f8f7] rounded-2xl border border-[#d8e4e1] p-3.5 space-y-2.5">
              <div className="flex justify-between items-center border-b border-[#d8e4e1] pb-1.5">
                <span className="font-extrabold text-[#0f3d3e] text-xs">
                  1-클릭 연구 데이터 다운로드
                </span>
                <span className="text-[10px] text-[#1f6f6a] font-bold">
                  .CSV Ready
                </span>
              </div>

              {/* 3 Download Buttons */}
              <div className="space-y-2">
                <div className="bg-[#1f6f6a] text-white rounded-xl p-2.5 flex justify-between items-center text-xs font-bold shadow-xs">
                  <span>📊 원자료 (Raw Data CSV)</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">Wide format</span>
                </div>
                <div className="bg-[#1f6f6a] text-white rounded-xl p-2.5 flex justify-between items-center text-xs font-bold shadow-xs">
                  <span>📈 채점 데이터 (Scored CSV)</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">Subscales</span>
                </div>
                <div className="bg-white border-2 border-[#1f6f6a] text-[#1f6f6a] rounded-xl p-2.5 flex justify-between items-center text-xs font-bold">
                  <span>📑 코드북 (Codebook CSV)</span>
                  <span className="bg-[#e7f1ef] px-2 py-0.5 rounded text-[10px]">Metadata</span>
                </div>
              </div>
            </div>

            {/* Feature Bullets */}
            <ul className="text-xs text-[#3a5557] space-y-2 border-t border-[#d8e4e1]/70 pt-3.5">
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>참가자 × 회차 와이드 매트릭스</strong> 원자료</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>하위요인 및 총점 변수</strong> 채점 데이터셋</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1f6f6a] font-bold text-sm leading-none">✓</span>
                <span className="leading-tight"><strong>R / SPSS / Python</strong> 통계 분석에 즉시 투입</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="bg-white rounded-2xl border-2 border-[#d8e4e1] px-6 py-4 flex items-center justify-between text-sm text-[#3a5557] shadow-sm">
        <div className="flex items-center gap-8 font-medium">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span><strong>모바일 최적화 UX</strong> (스마트폰 즉시 응답)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span><strong>한/영 이중언어</strong> (글로벌 연구 대응)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span><strong>자동 채점 & 코드북</strong> (데이터 정제 공수 90% 절감)</span>
          </span>
        </div>
        <div className="font-extrabold text-[#0f3d3e] text-base">
          Wave : Psychological Research Survey Platform
        </div>
      </div>
    </div>
  )
}
