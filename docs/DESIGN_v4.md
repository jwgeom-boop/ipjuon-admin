# 입주ON · 잔금대출 상담 관리 시스템

은행 잔금대출 상담사가 엑셀 없이 사이트 하나로 상담부터 대출실행 정산까지 완결 처리하는 웹 애플리케이션입니다. 본 문서는 Claude Code가 일관된 맥락으로 개발하도록 프로젝트 루트에 둡니다.

> **v4 (전면 재기획)**: 기존 "단계 중심 파이프라인"을 폐기하고, **오늘의 리스트 + 위저드형 하이브리드**로 전환. 상담사는 단계를 의식하지 않고 "오늘 할 일"만 봄. 노션/린어 스타일의 여백 넉넉한 생산성 툴 비주얼.

---

## 1. 프로젝트 개요

### 1.1 서비스 정의
- **이름**: 입주ON
- **사용자**: 은행 잔금대출 상담사
- **업무 범위**: 아파트 입주 시점 집단 잔금대출 처리 전 과정 (상담~실행정산)
- **핵심 가치**: 엑셀/별도 파일 없이 사이트 하나로 모든 업무 완결. 단계를 의식하지 않고 "오늘의 할 일"만 따라가면 됨.

### 1.2 대체하는 도구
- 고객 관리 엑셀 (총괄 파일)
- 정산 엑셀 (상환조회, 은행별 계좌 관리)
- 은행 담당자 연락처 목록
- 자서 일정 캘린더, 메모장, SMS 전송 도구

### 1.3 디자인 철학

노션(Notion)과 린어(Linear)에서 빌린 원칙:
- **여백이 곧 UI** — 정보 밀도보다 가독성 우선
- **키보드 퍼스트** — ⌘K 명령 팔레트, 숫자 단축키로 화면 전환
- **작업은 문장으로** — "5단계 자서"가 아니라 "한오영 자서 10:30 준비"
- **호버 시 강조** — 기본 상태는 최대한 담백, 인터랙션 순간에만 시각적 피드백
- **테두리보다 배경** — 1px 보더 남발 금지, 배경색 차이로 영역 구분

---

## 2. 핵심 기획 전환 (v3 → v4)

### 2.1 없어진 것
- 단계별 파이프라인 사이드바 (상담신청/상담중/심사중/결과대기/...)
- 단계별 카운트 뱃지 (3/6/2/5/4/2)
- 3단 분할 상세 모달 (좌-중-우 동시 표시)
- 긴급 대시보드 별도 탭 (홈에 통합)
- 칸반 뷰 (작업 카드로 대체)

### 2.2 새로 생긴 것
- **홈 = 오늘의 리스트**: 긴급도 순 작업 카드, 단계 개념 노출 안 함
- **위저드**: 작업 유형별 단계식 입력 (한 번에 하나의 일)
- **명령 팔레트 (⌘K)**: 어디서든 고객 검색·화면 이동·작업 실행
- **"다음 작업" 문장**: "정산 확정 · 오늘 마감", "자서 10:30 — 30분 후"

### 2.3 유지된 것 (내부 개념)
- 6단계 상태 머신 (시스템 내부, UI 비노출)
- 긴급도 판정 규칙 (체류일 × 입주 D-day 교차)
- 정산 내역 모델 (중도금/잔금/옵션/...)
- 엑셀 대체라는 최상위 목표

---

## 3. 전체 화면 구조 (IA)

### 3.1 4개의 메인 화면 + 위저드

```
홈 (오늘의 리스트)     ⌘1
  └─ 작업 카드 클릭 → 위저드 진입

전체 고객              ⌘2
  └─ 고객 클릭 → 위저드 진입

캘린더                 ⌘3

리포트                 ⌘4

명령 팔레트 ⌘K         — 오버레이, 어디서든
```

### 3.2 위저드 6종 (작업 유형별)

| 위저드 | 스텝 수 | 주요 내용 |
|---|---|---|
| 상담 W | 4 | 고객 정보 → 물건 → 소득·기존대출 → 한도 제시 |
| 가심사 W | 3 | 서류 취합 → 은행 접수 → 심사 대기 등록 |
| 결과안내 W | 2 | 승인 조건 입력 → 고객 통보 기록 |
| 자서예약 W | 3 | 일시 확정 → 지참서류 안내 → 캘린더 등록 |
| 자서 W | 3 | 서명 완료 → 실행일 확정 → 정산 금액 사전 입력 |
| 실행 W | 4 | 중도금 상환 → 잔금 상환 → 기타 항목 → 필요자금 확정 |

### 3.3 네비게이션 계층

- **상단 바**: 로고 · 탭 4개 · ⌘K 팔레트 · 사용자
- **본문**: 각 화면의 컨텐츠 (좌우 여백 넉넉, 최대 너비 제한)
- **하단 푸터**: 요약 통계 · 단축키 힌트

탭 외에는 사이드바 없음. 린어처럼 상단 네비만으로 충분.

---

## 4. 홈 (오늘의 리스트)

### 4.1 레이아웃

```
────────────────────────────────────────────────
상단 바 (50px)
────────────────────────────────────────────────
   인사말 "안녕하세요, 박민수님"         (60px)
   오늘 날짜 · 단지 · 입주 D-day

   5개 통계 숫자 (오늘 할 일 / 긴급 / 자서 / 실행 / 주간 완료)
                                            (60px)
────────────────────────────────────────────────
   ▸ 지금 바로 처리  [긴급 3건]           (섹션)
     ● 한오영 · 101-603 · 신한 서면
        대출실행 정산 확정 — 필요자금 127...
        [자서+4일] [D-1 · 오늘 마감] →
     ● 조윤경 · ...
     ● 강동원 · ...

   ▸ 오늘 중 처리  [6건]                  (섹션)
     ○ 이복희 · 101-801 · 국민 부전동
        대출 실행 — 정산 내역 확인 완료 ...
        [실행] [11:00] →
     ○ ...
────────────────────────────────────────────────
푸터 (40px)
```

### 4.2 컨텐츠 폭

- 본문 최대 너비 **820px** (린어의 이슈 목록과 동일)
- 좌우 여백 자동 (화면 가운데 정렬)
- 행 높이 약 56px (12+44, 여유 있게)

### 4.3 상단 통계 (5개)

패딩 넉넉한 가로 배치. 각 항목:
- `18px / 500` 숫자
- `11px / 400 / tertiary` 라벨
- 구분선은 얇은 `border-right`

항목: 오늘 할 일 / 긴급 / 오늘 자서 / 오늘 실행 / 이번주 N/30

### 4.4 작업 카드 구조

각 카드는 **한 줄 grid**:

```
[체크/마크] [이름+주소 | 작업 문장] [태그] [시간/D-day] [→]
  18px        1fr (유동)            auto    auto        auto
```

- **마크**: `●` 긴급 빨강, `●` 주의 노랑, `●` 정보 파랑, `○` 일반 회색
- **이름+주소**: `고객명` (500) + ` 101-603 · 신한 서면` (tertiary, 11px)
- **작업 문장**: "대출실행 정산 확정 — 필요자금 127,413,216원 고객 납부 대기" (secondary, 12px)
- **태그**: 긴급 사유 한 단어 ("자서+4일", "지연", "30분 후")
- **시간**: "D-1 · 오늘 마감" 또는 "10:30" (tertiary, 11px, tabular-nums)
- **화살표**: 호버 시에만 표시

### 4.5 섹션 분류

2~3개 섹션으로 나눔:
1. **지금 바로 처리** (긴급도 urgent/critical)
2. **오늘 중 처리** (오늘 일정이 있거나 오늘 마감)
3. **이번 주 예정** (해당 시만)

섹션 헤더는 작고 담백하게: `13px / 500 / secondary` + 개수 pill

### 4.6 상호작용

- **행 클릭** → 해당 작업의 위저드로 진입
- **행 호버** → 배경 `secondary`, 화살표 표시, 경계선 표시
- **체크박스** → 해당 작업 완료 처리 (단, 실제 완료 조건은 위저드에서만)
- **키보드**: `↑↓` 행 이동, `↵` 선택, `j/k` vim 스타일

---

## 5. 위저드 (작업 실행 화면)

### 5.1 공통 레이아웃

```
────────────────────────────────────────────────
상단 바 (40px)
  ← 오늘의 리스트 [ESC]       한오영 · 101-603 · 신한 서면 · D-1
────────────────────────────────────────────────
진행 스텝 바 (40px)
  ✓ Step 1    ● Step 2 (현재)    ○ Step 3    ○ Step 4
────────────────────────────────────────────────
  STEP 2 / 4                                 (body, 40 80px 패딩)

  큰 타이틀 (22px / 500)
  설명 한 문장 (13px / secondary)

  [입력 행들] — 라벨 140px + 입력 1fr 그리드

  [소계/요약 박스] — secondary 배경

  [체크박스들] — 선택적 확인
────────────────────────────────────────────────
액션 바 (50px, 고정)
  방금 자동 저장됨               [← 이전 ⌘←]  [다음 ⌘↵]
```

### 5.2 본문 폭

- 최대 **680px** (홈보다 더 좁게 — 집중)
- 좌우 80px 패딩

### 5.3 입력 행 디자인 (노션 스타일)

```css
.row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 0.5px solid var(--border-tertiary);
}
.inp {
  border: none;
  background: transparent;
  padding: 2px 0;
  border-bottom: 1px solid transparent;
}
.inp:focus {
  border-bottom-color: var(--info);
}
```

- 테두리 없는 입력창. 포커스 시에만 밑줄
- 라벨은 왼쪽 140px 고정, 값은 유동
- 행 사이 얇은 하단 보더만

### 5.4 진행 스텝 바

린어 스타일:
- 원형 번호 (18px)
- 완료: 초록 배경 + `✓`
- 현재: 검정 배경 + 숫자, 텍스트 굵게
- 미완료: 회색 테두리 + 숫자

```
✓ 중도금 상환 확인   ● 분양잔금 상환   ○ 기타 항목   ○ 필요자금 확정
```

### 5.5 실행 위저드 4스텝 (핵심 위저드)

| Step | 제목 | 입력 항목 |
|---|---|---|
| 1 | 중도금 상환 확인 | 원금, 이자, 중도금 은행, 상환 계좌 |
| 2 | 분양잔금 상환 | 원금, 이자, 상환 은행, 시행사 계좌 |
| 3 | 기타 항목 정산 | 발코니, 유상옵션, 보증수수료, 선수관리비, 이주비 |
| 4 | 필요자금 확정 | 자동 계산 결과 + 고객 추가 납부 or 환급 안내 |

### 5.6 자동 저장 & 이탈 방지

- 필드 blur 시 자동 저장
- 하단에 "방금 자동 저장됨" / "N초 전 저장됨" 표시
- 스텝 이동 시 현재 스텝 필수값 검증
- ESC 또는 뒤로가기 시 "변경사항 저장 안 됨" 방지 로직 (자동저장으로 실질 문제 없음)

### 5.7 완료 후 처리

위저드 마지막 스텝 "완료" 버튼 클릭 시:
1. 시스템 내부 단계 상태 업데이트
2. 토스트 "○○○ 고객 실행완료 처리됨"
3. **자동으로 홈의 다음 작업 카드로 이동** (린어의 "Issue handled, moving to next")
4. 더 이상 작업이 없으면 "오늘 할 일 완료" 화면

---

## 6. 전체 고객 리스트 (보조 뷰)

### 6.1 역할
- 검색·필터용 전체 목록
- 홈에 안 뜨는 건 찾거나, 특정 고객 빠르게 접근
- 관리자가 전체 현황 볼 때

### 6.2 레이아웃

```
상단 바
────────────────────
페이지 타이틀 "전체 고객 [69건]"       필터 칩 (전체/내 담당/긴급/진행중/완료)
────────────────────
검색창 (⌘F)
────────────────────
테이블 헤더 (11px uppercase, tertiary)
  [마크] [고객] [단지] [단계] [은행] [입주 D-day] [다음 작업]
테이블 바디 (최대 20행)
  ●  한오영     101-603   대출실행   신한 서면   D-1     정산 확정 · 오늘 마감
  ●  조윤경     ...
  ...
────────────────────
푸터: 페이지네이션 · 단축키 안내
```

### 6.3 컬럼 구성 (여기만 "단계" 노출)

| 컬럼 | 내용 |
|---|---|
| 마크 | 긴급도 점 색상 |
| 고객 | 이름 + 연락처 (2줄) |
| 단지 | 동-호(타입) |
| 단계 | pill 형태, 6단계 중 하나 |
| 은행 | 은행명 + 지점 |
| 입주 D-day | tabular-nums, 긴급 색 |
| 다음 작업 | 문장형 설명 |

여기서는 "단계"를 **필터링 수단**으로만 사용. 사용자 시선은 여전히 "다음 작업" 컬럼에 감.

### 6.4 인터랙션

- 행 클릭 → 해당 고객의 현재 단계에 맞는 위저드 진입
- ⌘F: 검색창 포커스
- ↑↓ / j/k: 행 이동
- ↵: 위저드 열기

---

## 7. 캘린더 (보조 뷰)

주간 기본, 월간 전환 가능. 자서·실행·이사일 표시. 충돌 감지.
(v3 스펙 유지, 비주얼만 노션/린어 스타일로)

상세: 이전 버전 참조. 핵심 원칙:
- 주간 뷰가 기본 (9~16시만 표시, 점심 제외)
- 이벤트 색: 자서(파랑), 실행(초록), 이사일(노랑), 긴급(빨강)
- 시간 충돌 자동 감지
- 이벤트 클릭 → 해당 위저드 진입

---

## 8. 명령 팔레트 (⌘K)

### 8.1 트리거
- `⌘K` (Mac) / `Ctrl+K` (Windows)
- 어디서든 작동

### 8.2 기능
오버레이 모달. 검색창 + 결과 리스트.

#### 지원 명령어:
1. **고객 검색**: "한오영" 입력 → 해당 고객 찾고 위저드 진입
2. **화면 이동**: "캘린더" → 캘린더 탭 이동
3. **작업 실행**: "실행 완료 처리" → 현재 고객의 실행 완료
4. **새 항목**: "새 상담 생성" → 상담 W 신규
5. **최근**: 최근 조회 고객 5명

### 8.3 비주얼
- 모달 너비 540px
- 배경 흐린 블러 없이 투명 검정 오버레이
- 결과 리스트 최대 8개, 카테고리 구분
- 키보드 ↑↓로 이동, ↵ 실행, ESC 닫기

---

## 9. 긴급도 판정 (내부 로직)

### 9.1 레벨
- `normal` · `warning` · `urgent` · `critical`

### 9.2 판정 규칙 (체류일 × 입주 D-day 교차)

| 조건 | 레벨 |
|---|---|
| 자서 완료 + 실행 미완 + 입주일 경과 | critical |
| 자서 완료 + 실행 미완 + 입주일 당일 | urgent |
| 자서 미완 + 입주일 D-3 이내 | urgent |
| 자서 완료 + 실행 미완 + 입주일 D-3 이내 | urgent |
| 자서 후 4일+ | urgent |
| 자서 후 6일+ | critical |
| 같은 단계 SLA 초과 | warning |
| 실행 완료 + 입주일 전 | normal |

### 9.3 규칙 엔진

```typescript
type UrgencyLevel = 'normal' | 'warning' | 'urgent' | 'critical';

interface UrgencyRule {
  id: string;
  when: (data: ConsultationData, today: Date) => boolean;
  level: UrgencyLevel;
  message: string;  // 카드 태그에 표시
}
```

메시지는 카드의 태그(예: "자서+4일", "지연", "30분 후")로 사용.

---

## 10. 작업 자동 분류 (홈 섹션 결정 로직)

홈의 "지금 바로 처리" vs "오늘 중 처리" 자동 분류:

```typescript
function classify(task: Task, now: Date): Section {
  if (task.urgency === 'critical' || task.urgency === 'urgent') return 'now';
  if (task.scheduledTime && isToday(task.scheduledTime, now)) return 'today';
  if (task.dueDate && isToday(task.dueDate, now)) return 'today';
  if (task.weekScheduled) return 'week';
  return 'none';
}
```

우선순위 순서:
1. 긴급도 (critical → urgent → warning → normal)
2. 예약 시간 (빠른 순)
3. 입주 D-day (가까운 순)
4. 체류일 (오래된 순)

---

## 11. 디자인 토큰 (노션/린어 스타일)

### 11.1 색상

```css
/* Neutrals */
--bg-primary:   #ffffff;
--bg-secondary: #f7f7f5;     /* 살짝 따뜻한 회색 (린어 스타일) */
--bg-tertiary:  #f0f0ed;
--text-primary:   #1a1a1a;
--text-secondary: #5c5c59;
--text-tertiary:  #8b8b87;

/* Semantic (담백하게) */
--info:    #2563eb;   /* 파랑 */
--success: #16a34a;   /* 초록 */
--warning: #d97706;   /* 주황 */
--danger:  #dc2626;   /* 빨강 */

/* Semantic 배경 (매우 연하게, tint 느낌) */
--bg-info:    #eff6ff;
--bg-success: #f0fdf4;
--bg-warning: #fffbeb;
--bg-danger:  #fef2f2;

/* Border — 0.5px 미묘하게 */
--border-tertiary: rgba(0,0,0,0.06);
--border-secondary: rgba(0,0,0,0.10);
--border-primary: rgba(0,0,0,0.15);
```

### 11.2 타이포그래피

| 용도 | 크기 / 굵기 | 비고 |
|---|---|---|
| 대형 제목 (위저드 스텝) | 22px / 500 | letter-spacing: -0.3px |
| 페이지 타이틀 | 18px / 500 | letter-spacing: -0.2px |
| 인사말 | 22px / 500 | — |
| 섹션 헤더 | 13px / 500 | secondary color |
| 행 제목 | 14px / 500 | — |
| 본문 | 13~14px / 400 | line-height 1.6 |
| 라벨 | 13px / 400 | secondary |
| 메타 (시간, ID, 힌트) | 11~12px / 400 | tertiary |
| 통계 숫자 | 18~20px / 500 | tabular-nums |
| 테이블 헤더 | 11px / 500 / uppercase | letter-spacing: 0.5px |
| 단축키 (kbd) | 10px / mono | background secondary |

**기본 line-height 1.6** (린어와 비슷). 여백이 숨쉬는 UI.

### 11.3 간격

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
--spacing-2xl: 32px;   /* 섹션 간 */
--spacing-3xl: 40px;   /* 페이지 패딩 */
```

### 11.4 모서리

```css
--radius-sm: 3px;   /* 태그, 배지 */
--radius-md: 5px;   /* 버튼, 카드 */
--radius-lg: 8px;   /* 모달, 큰 영역 */
```

### 11.5 그림자 없음
린어는 그림자 거의 안 씀. 깊이는 배경색 차이와 얇은 보더로 표현.

유일한 예외: 모달 오버레이의 `box-shadow: 0 10px 38px rgba(0,0,0,0.08)`

### 11.6 호버 상태

```css
.row:hover {
  background: var(--bg-secondary);
  border-color: var(--border-tertiary);
}
```

기본 상태는 보더 없이 투명, 호버 시에만 살짝 강조.

---

## 12. 단축키 체계 (린어 스타일)

| 단축키 | 동작 |
|---|---|
| `⌘K` | 명령 팔레트 열기 |
| `⌘1~4` | 탭 전환 (오늘/고객/캘린더/리포트) |
| `⌘F` | 현재 화면 검색 |
| `⌘↵` | 위저드 다음 스텝 |
| `⌘←` | 위저드 이전 스텝 |
| `ESC` | 위저드 취소 · 팔레트 닫기 |
| `↑↓` / `j/k` | 리스트 행 이동 |
| `↵` | 선택한 행 열기 |
| `?` | 단축키 도움말 표시 |
| `c` | 새 상담 생성 |
| `/` | 검색창 포커스 |

모든 버튼 옆에 `kbd` 형태로 단축키 표시 (린어 특징).

---

## 13. 정산 모델 (데이터)

### 13.1 정산 항목

| 항목 | 원금 | 이자 | 상환 계좌 |
|---|---|---|---|
| 중도금 | O | O | 중도금 대출 은행 |
| 분양잔금 | O | O | 시행사 계좌 |
| 발코니 확장 | O | — | 시행사 계좌 |
| 유상옵션 | O | — | 시행사 계좌 |
| 보증수수료 (대납이자) | — | O | 시행사 계좌 |
| 선수관리비 | O | — | 관리사무소 |
| 이주비 | O | — | 이주비 은행 |
| 인지대 (대출/추가대출) | 정액 | — | — |

### 13.2 필요자금 계산

```
A = 중도금합계 + 잔금합계 + 발코니 + 옵션 + 보증수수료
    + 선수관리비 + 이주비 + 인지대
B = 대출금 + 추가대출
필요자금 = A - B  (양수: 추가납부, 음수: 환급)
```

### 13.3 TypeScript 모델

```typescript
interface Consultation {
  id: string;
  stage: Stage;              // 내부 상태
  urgencyLevel: UrgencyLevel;
  nextAction: string;        // "정산 확정 · 오늘 마감"
  customer: Customer;
  property: Property;
  loan: LoanDetails;
  settlement?: Settlement;
  schedule: Schedule;
  documents: DocumentChecklist;
  memos: TimestampedMemo[];
  assignedTo: string;
}

type Stage =
  | 'consultation' | 'pre_review' | 'result_notice'
  | 'signing_reservation' | 'signing' | 'execution' | 'completed';

interface Settlement {
  middlePayment: { principal: number; interest: number; account: Account };
  balance: { principal: number; interest: number; account: Account };
  balconyExtension: number;
  paidOptions: number;
  guaranteeFee: number;
  prepaidMgmtFee: number;
  movingAllowance: number;
  stampDuty: number;
  stampDutyAdditional: number;
  totalRepayment: number;   // computed
  totalLoan: number;         // computed
  requiredFund: number;      // computed
}
```

---

## 14. 컴포넌트 구조

```
components/
├── layout/
│   ├── AppShell.tsx              # 상단바 + 본문 영역
│   ├── TopNav.tsx                # 로고 + 탭 + 팔레트 트리거
│   └── Footer.tsx
├── Home/
│   ├── Greeting.tsx              # "안녕하세요, 박민수님"
│   ├── StatBar.tsx               # 5개 숫자
│   ├── TaskSection.tsx           # "지금 바로 처리" 섹션
│   └── TaskRow.tsx               # 작업 1줄
├── Wizard/
│   ├── WizardShell.tsx           # 위저드 공통 레이아웃
│   ├── StageStrip.tsx            # 상단 스텝 바
│   ├── FieldRow.tsx              # 라벨+입력 한 줄
│   ├── SubtotalBox.tsx           # 소계 박스
│   ├── ActionBar.tsx             # 하단 [이전][다음]
│   └── wizards/
│       ├── ConsultationWizard.tsx    # 상담 4스텝
│       ├── PreReviewWizard.tsx       # 가심사 3스텝
│       ├── ResultNoticeWizard.tsx    # 결과안내 2스텝
│       ├── SigningReservationWizard.tsx
│       ├── SigningWizard.tsx
│       └── ExecutionWizard.tsx        # 실행 4스텝 (핵심)
├── Customers/
│   ├── CustomerList.tsx
│   ├── FilterChips.tsx
│   └── SearchBar.tsx
├── Calendar/
│   ├── WeekView.tsx
│   └── EventCell.tsx
├── CommandPalette/
│   ├── Palette.tsx               # ⌘K 모달
│   ├── SearchInput.tsx
│   └── ResultList.tsx
├── shared/
│   ├── Kbd.tsx                   # 단축키 배지
│   ├── UrgencyMark.tsx           # ● 마크
│   ├── StagePill.tsx             # pill (전체 고객에서만)
│   └── MoneyInput.tsx
└── hooks/
    ├── useAutoSave.ts
    ├── useHotkeys.ts
    ├── useNextTask.ts            # 완료 시 다음 작업으로
    └── useCommandPalette.ts
```

---

## 15. API 엔드포인트

```
GET    /api/tasks/today                  # 오늘 할 일 (분류됨)
GET    /api/consultations                # 전체 고객
GET    /api/consultations/:id
PATCH  /api/consultations/:id            # 자동 저장
POST   /api/consultations/:id/advance    # 단계 진행
POST   /api/consultations/:id/cancel

POST   /api/wizards/:type/:id/step/:n    # 위저드 스텝 저장
POST   /api/wizards/:type/:id/complete   # 위저드 완료

GET    /api/calendar
POST   /api/command-palette/search       # 팔레트 검색
GET    /api/reports/monthly

POST   /api/import/excel
POST   /api/notifications/sms
```

---

## 16. 우선순위 로드맵

### Phase 1 — 비주얼 시스템
- [ ] 디자인 토큰 (11장)을 Tailwind config + globals.css로 구현
- [ ] AppShell + TopNav (탭 네비)
- [ ] Kbd, UrgencyMark 등 공통 컴포넌트
- [ ] 다크 모드 (선택)

### Phase 2 — 홈 화면
- [ ] 오늘의 리스트 (TaskRow, TaskSection)
- [ ] StatBar 통계
- [ ] 긴급도 분류 로직 (`classify()`, `urgencyRules`)
- [ ] 자동 새로고침 (1분)

### Phase 3 — 실행 위저드 (최우선 기능)
- [ ] WizardShell + StageStrip
- [ ] ExecutionWizard 4스텝
- [ ] 필요자금 실시간 계산
- [ ] 자동 저장 + 다음 작업 이동

### Phase 4 — 나머지 위저드
- [ ] 상담/가심사/결과안내/자서예약/자서 5개 위저드
- [ ] 단계 간 자동 전이 로직

### Phase 5 — 보조 뷰
- [ ] 전체 고객 리스트
- [ ] 캘린더 주간 뷰
- [ ] 리포트 (기본)

### Phase 6 — 생산성 강화
- [ ] ⌘K 명령 팔레트
- [ ] 모든 단축키 구현
- [ ] 단축키 도움말 (`?`)

### Phase 7 — 고도화
- [ ] SMS 자동 전송
- [ ] 엑셀 마이그레이션
- [ ] 일정 충돌 감지
- [ ] 담당자 업무량 시각화

---

## 17. 참고 비주얼

### 17.1 린어(Linear)에서 가져온 것
- 상단 네비 + 탭 숫자 단축키 (⌘1~4)
- 이슈 리스트의 한 줄 레이아웃 (마크 + 제목 + 메타)
- 호버 시만 강조되는 담백한 기본 상태
- `kbd` 요소로 단축키 상시 노출
- 작은 원형 stage indicator

### 17.2 노션(Notion)에서 가져온 것
- 넉넉한 여백 (좌우 40~80px 패딩)
- 테두리 없는 입력창, 포커스 시 밑줄
- 라벨-값 그리드 레이아웃
- 인라인 편집
- 슬래시 커맨드 감성 (팔레트로 구현)

### 17.3 피해야 할 것
- Material Design 특유의 그림자·elevation
- Bootstrap의 두꺼운 보더
- 과도한 아이콘 사용
- 카드 난립 (여백과 구분선으로 충분)
- 주황/빨강/파랑 원색 남발

---

## 18. 용어 정의

| 용어 | 정의 |
|---|---|
| 작업(Task) | 사용자가 처리해야 할 한 단위 액션. 고객+단계로 결정됨 |
| 위저드(Wizard) | 작업을 여러 스텝으로 나눠 한 번에 하나씩 입력받는 UI |
| 오늘의 리스트 | 홈 화면의 작업 카드 모음. 긴급도 + 시간 순 정렬 |
| 명령 팔레트 | ⌘K로 부르는 전역 검색·이동·실행 UI |
| LTV/DTI/DSR | 담보/총부채/총원리금 상환 비율 |
| 잔금대출 | 입주 시점 잔금 지급용 주담대 |
| 기표 | 대출 실제 실행, 자금 지급 |
| 자서 | 대출 계약서 고객 직접 서명 |
| 필요자금 | 상환 총액 - 대출 총액 |
| 발코니/옵션/수수료/관리비/이주비/인지대 | 대출실행 시 정산 항목들 |

---

_문서 버전: v4.0_
_최종 수정: 2026-04-21_
_변경 이력: v1(기존 6단계) → v2(실무 플로우) → v3(스크롤 최소화) → v4(오늘의 리스트+위저드, 노션/린어 스타일)_
