# mood-tracker-frontend

오늘 기분 기록기의 프론트엔드 (Next.js + Tailwind). 달력에서 날짜를 골라 기분을 기록하고, 데이터는 백엔드 API에서 가져와요.

백엔드: [mood-tracker-backend](../mood-tracker-backend) 를 먼저 실행하세요 (기본 `http://localhost:4000`).

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 환경변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | 백엔드 API 주소 (`.env.example` 참고) |

> 배경의 뽀로로 이미지(`public/pororo.png`)는 캐릭터 저작권이 있는 자료예요. 공개 배포 시 사용 권한에 유의하세요.
