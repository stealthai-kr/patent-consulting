# StealthAI 특허상담 온라인 접수 포털

친구 회사용 독립 프론트엔드입니다.

## 연결된 백엔드
https://script.google.com/macros/s/AKfycbzA9_n1_DKpNayQiV0hoWw3VyxRDrS34-Gwfv-RkAPySy09jcCEC3ZWoNqw34GWDdgB/exec

## 포함 파일
- index.html
- style.css
- script.js
- admin.html
- admin.css
- admin.js

## 현재 기준
- 고객 연락처 첫 칸 010 기본값, 수정 가능
- 관리자 연락처 검색 첫 칸 010 기본값, 수정 가능
- 고객 이메일 도메인 선택창 확대
- V11 임시저장 키 사용
- V9 Google Drive 첨부 업로드 구조 유지
- 친구 회사 Google Apps Script / Google Sheet / Drive 계정으로 분리 연결

## 관리자 비밀번호
Apps Script Code.gs의 CONFIG.ADMIN_KEY 값을 사용합니다.
현재 친구 계정 백엔드는 1207로 설정한 기준입니다.

## GitHub 새 저장소 권장명
stealthai-patent-intake-portal

## 첫 업로드 명령어
git init
git add .
git commit -m "StealthAI 특허상담 독립 포털 초기 버전"
git branch -M main
git remote add origin <새 GitHub 저장소 주소>
git push -u origin main
