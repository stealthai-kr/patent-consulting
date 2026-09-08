const API_URL = "https://script.google.com/macros/s/AKfycbwty1ir537jUHhGDE088UtX3tkqhqXfShEa_KXEa2JU6lpX83dCI23UIUMm5GNrprCq/exec";
const SESSION_KEY = "patentAdminKeySession";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const adminKeyInput = document.getElementById("adminKeyInput");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const refreshBtn = document.getElementById("refreshBtn");

const tbody = document.getElementById("applicationTableBody");
const listCount = document.getElementById("listCount");
const activeFilterText = document.getElementById("activeFilterText");

const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const serviceFilter = document.getElementById("serviceFilter");
const statusFilter = document.getElementById("statusFilter");
const managerFilter = document.getElementById("managerFilter");
const nameFilter = document.getElementById("nameFilter");
const companyFilter = document.getElementById("companyFilter");
const phoneFirstFilter = document.getElementById("phoneFirstFilter");
const phoneMiddleFilter = document.getElementById("phoneMiddleFilter");
const phoneLastFilter = document.getElementById("phoneLastFilter");
const emailFilter = document.getElementById("emailFilter");
const titleFilter = document.getElementById("titleFilter");
const technicalFieldFilter = document.getElementById("technicalFieldFilter");
const disclosedFilter = document.getElementById("disclosedFilter");
const keywordFilter = document.getElementById("keywordFilter");
const sortSelect = document.getElementById("sortSelect");

const searchBtn = document.getElementById("searchBtn");
const resetSearchBtn = document.getElementById("resetSearchBtn");
const clearQuickBtn = document.getElementById("clearQuickBtn");
const toggleSearchBtn = document.getElementById("toggleSearchBtn");
const advancedSearchBody = document.getElementById("advancedSearchBody");

const modal = document.getElementById("detailModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const basicDetail = document.getElementById("basicDetail");
const inventionDetail = document.getElementById("inventionDetail");
const detailReceiptNo = document.getElementById("detailReceiptNo");
const detailStatusBadge = document.getElementById("detailStatusBadge");
const editStatus = document.getElementById("editStatus");
const editManagerSelect = document.getElementById("editManagerSelect");
const editManagerCustom = document.getElementById("editManagerCustom");
const customManagerField = document.getElementById("customManagerField");
const editMemo = document.getElementById("editMemo");
const saveDetailBtn = document.getElementById("saveDetailBtn");
const saveDetailMessage = document.getElementById("saveDetailMessage");
const historyList = document.getElementById("historyList");

let adminKey = sessionStorage.getItem(SESSION_KEY) || "";
let applications = [];
let currentReceiptNo = "";

const MANAGER_OPTIONS = [];

function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function showLogin() {
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
}

async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`서버 응답 오류 (${response.status})`);

  const result = await response.json();
  if (!result.ok) throw new Error(result.message || "요청 처리 실패");
  return result;
}

async function login() {
  const key = adminKeyInput.value.trim();
  if (!key) {
    loginMessage.textContent = "관리자 비밀번호를 입력해주세요.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "확인 중...";
  loginMessage.textContent = "";

  try {
    await apiPost({ action: "adminList", adminKey: key });
    adminKey = key;
    sessionStorage.setItem(SESSION_KEY, key);
    showDashboard();
    await loadApplications();
  } catch (err) {
    loginMessage.textContent = err.message || String(err);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "관리자 로그인";
  }
}

async function loadApplications() {
  tbody.innerHTML = `<tr><td colspan="8" class="empty">접수 내역을 불러오는 중입니다.</td></tr>`;

  try {
    const result = await apiPost({
      action: "adminList",
      adminKey
    });

    applications = result.items || [];
    updateSummary(result.summary || {});
    updateOperationalAlerts();
    refreshManagerFilter();
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(err.message || String(err))}</td></tr>`;
  }
}

function parseSubmittedDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const d = new Date(raw.replace(/\./g, "-"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getElapsedDays(item) {
  const d = parseSubmittedDate(item.submittedAt);
  if (!d) return 0;
  const now = new Date();
  d.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  return Math.max(0, Math.floor((now - d) / 86400000));
}

function updateOperationalAlerts() {
  const unassigned = applications.filter(item => !String(item.manager || "").trim()).length;
  const stale = applications.filter(item => item.status !== "출원완료" && getElapsedDays(item) >= 7).length;

  const unassignedEl = document.getElementById("countUnassigned");
  const staleEl = document.getElementById("countStale");

  if (unassignedEl) unassignedEl.textContent = `${unassigned}건`;
  if (staleEl) staleEl.textContent = `${stale}건`;
}

function updateSummary(summary) {
  document.getElementById("countAll").textContent = summary.all || 0;
  document.getElementById("countNew").textContent = summary["신규접수"] || 0;
  document.getElementById("countReview").textContent = summary["검토중"] || 0;
  document.getElementById("countRequest").textContent = summary["추가자료 요청"] || 0;
  document.getElementById("countFiling").textContent = summary["출원진행"] || 0;
  document.getElementById("countDone").textContent = summary["출원완료"] || 0;
}

function refreshManagerFilter() {
  const current = managerFilter.value;
  const names = [...new Set(
    applications
      .map(x => String(x.manager || "").trim())
      .filter(Boolean)
  )].sort((a,b) => a.localeCompare(b, "ko"));

  managerFilter.innerHTML = `<option value="">전체 담당자</option>` +
    names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  if (names.includes(current)) managerFilter.value = current;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function dateOnly(value) {
  return String(value || "").slice(0,10);
}

function getFilteredApplications() {
  const f = {
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    service: serviceFilter.value,
    status: statusFilter.value,
    manager: managerFilter.value,
    name: normalize(nameFilter.value),
    company: normalize(companyFilter.value),
    phone: [phoneFirstFilter.value, phoneMiddleFilter.value, phoneLastFilter.value]
      .map(v => normalizePhone(v))
      .filter(Boolean)
      .join(""),
    email: normalize(emailFilter.value),
    title: normalize(titleFilter.value),
    technical: normalize(technicalFieldFilter.value),
    disclosed: disclosedFilter.value,
    keyword: normalize(keywordFilter.value)
  };

  let rows = applications.filter(item => {
    const submittedDate = dateOnly(item.submittedAt);

    if (f.dateFrom && submittedDate < f.dateFrom) return false;
    if (f.dateTo && submittedDate > f.dateTo) return false;
    if (f.service && item.serviceType !== f.service) return false;
    if (f.status && item.status !== f.status) return false;
    if (f.manager && item.manager !== f.manager) return false;
    if (f.name && !normalize(item.name).includes(f.name)) return false;
    if (f.company && !normalize(item.company).includes(f.company)) return false;
    if (f.phone && !normalizePhone(item.phone).includes(f.phone)) return false;
    if (f.email && !normalize(item.email).includes(f.email)) return false;
    if (f.title && !normalize(item.inventionTitle).includes(f.title)) return false;
    if (f.technical && !normalize(item.technicalField).includes(f.technical)) return false;
    if (f.disclosed && item.disclosed !== f.disclosed) return false;

    if (f.keyword) {
      const haystack = [
        item.receiptNo,
        item.name,
        item.company,
        item.phone,
        item.email,
        item.inventionTitle,
        item.technicalField,
        item.existingProblem,
        item.objective,
        item.implementation,
        item.effects,
        item.differentiation,
        item.disclosureNote,
        item.manager,
        item.memo,
        item.serviceType,
        item.status
      ].map(normalize).join(" ");

      if (!haystack.includes(f.keyword)) return false;
    }

    return true;
  });

  const sort = sortSelect.value;

  rows.sort((a,b) => {
    if (sort === "oldest") return String(a.submittedAt).localeCompare(String(b.submittedAt));
    if (sort === "updated") return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    if (sort === "name") return String(a.name || "").localeCompare(String(b.name || ""), "ko");
    return String(b.submittedAt).localeCompare(String(a.submittedAt));
  });

  return rows;
}

function buildFilterSummary() {
  const parts = [];

  if (dateFrom.value || dateTo.value) parts.push(`기간 ${dateFrom.value || "처음"} ~ ${dateTo.value || "현재"}`);
  if (serviceFilter.value) parts.push(`서비스: ${serviceFilter.value}`);
  if (statusFilter.value) parts.push(`상태: ${statusFilter.value}`);
  if (managerFilter.value) parts.push(`담당자: ${managerFilter.value}`);
  if (nameFilter.value.trim()) parts.push(`신청자: ${nameFilter.value.trim()}`);
  if (companyFilter.value.trim()) parts.push(`회사: ${companyFilter.value.trim()}`);
  const phoneFirstText = phoneFirstFilter.value.trim();
  const phoneMiddleText = phoneMiddleFilter.value.trim();
  const phoneLastText = phoneLastFilter.value.trim();
  if (!(phoneFirstText === "010" && !phoneMiddleText && !phoneLastText)) {
    const phoneParts = [phoneFirstText, phoneMiddleText, phoneLastText].filter(Boolean);
    if (phoneParts.length) parts.push(`연락처: ${phoneParts.join("-")}`);
  }
  if (emailFilter.value.trim()) parts.push(`이메일: ${emailFilter.value.trim()}`);
  if (titleFilter.value.trim()) parts.push(`발명명칭: ${titleFilter.value.trim()}`);
  if (technicalFieldFilter.value.trim()) parts.push(`기술분야: ${technicalFieldFilter.value.trim()}`);
  if (disclosedFilter.value) parts.push(`공개: ${disclosedFilter.value}`);
  if (keywordFilter.value.trim()) parts.push(`키워드: ${keywordFilter.value.trim()}`);

  return parts.length ? parts.join(" · ") : "전체 접수건을 표시합니다.";
}

function renderTable() {
  const filtered = getFilteredApplications();

  listCount.textContent = `${filtered.length}건`;
  activeFilterText.textContent = buildFilterSummary();

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">조건에 맞는 접수 내역이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr data-receipt="${escapeHtml(item.receiptNo)}" title="클릭하여 접수 상세보기">
      <td><button type="button" class="receipt-link" tabindex="-1">${escapeHtml(item.receiptNo)}</button></td>
      <td>${escapeHtml((item.submittedAt || "").slice(0,10))}</td>
      <td>${escapeHtml(item.name || "")}</td>
      <td>${escapeHtml(item.company || "")}</td>
      <td class="title-cell">${escapeHtml(item.inventionTitle || "")}</td>
      <td><span class="status-chip" data-status="${escapeHtml(item.status || "")}">${escapeHtml(item.status || "")}</span></td>
      <td>${escapeHtml(item.manager || "미지정")}</td>
      <td><button type="button" class="manage-btn" tabindex="-1">상세보기</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr[data-receipt]").forEach(tr => {
    tr.addEventListener("click", () => openDetail(tr.dataset.receipt));
  });
}

function resetSearch() {
  [
    dateFrom,dateTo,serviceFilter,statusFilter,managerFilter,nameFilter,companyFilter,
    phoneFirstFilter,phoneMiddleFilter,phoneLastFilter,emailFilter,titleFilter,technicalFieldFilter,disclosedFilter,keywordFilter
  ].forEach(el => {
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
  });

  if (phoneFirstFilter) phoneFirstFilter.value = "010";
  sortSelect.value = "newest";
  renderTable();
}

async function openDetail(receiptNo) {
  currentReceiptNo = receiptNo;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  detailReceiptNo.textContent = receiptNo;
  basicDetail.innerHTML = `<div class="empty">불러오는 중...</div>`;
  inventionDetail.innerHTML = "";
  historyList.innerHTML = "";
  saveDetailMessage.textContent = "";

  try {
    const result = await apiPost({
      action: "adminDetail",
      adminKey,
      receiptNo
    });

    const d = result.item;

    detailStatusBadge.textContent = d.status || "신규접수";
    detailStatusBadge.dataset.status = d.status || "신규접수";
    editStatus.value = d.status || "신규접수";
    setManagerValue(d.manager || "");
    editMemo.value = d.memo || "";

    basicDetail.innerHTML = [
      ["접수일시", d.submittedAt],
      ["서비스", d.serviceType],
      ["신청자", d.name],
      ["회사/소속", d.company],
      ["연락처", formatPhone(d.phone)],
      ["이메일", d.email]
    ].map(([label,value]) => detailItem(label,value)).join("");

    const inventionItems = [
      {label:"발명의 명칭",value:d.inventionTitle,wide:true,featured:true},
      {label:"기술 분야",value:d.technicalField},
      {label:"기존 방식의 문제점",value:d.existingProblem},
      {label:"해결 과제",value:d.objective},
      {label:"구성 및 구현 방법",value:d.implementation},
      {label:"도면 설명",value:d.drawingDescription},
      {label:"실험/성능 데이터",value:d.results},
      {label:"기대 효과",value:d.effects},
      {label:"핵심 차별점",value:d.differentiation,wide:true,featured:true},
      {label:"공개 여부",value:d.disclosed},
      {label:"공개 내용/참고사항",value:d.disclosureNote,wide:true},
      {label:"첨부파일",value:d.attachmentInfo,attachments:d.attachments || [],wide:true}
    ];

    inventionDetail.innerHTML = inventionItems.map(inventionItem).join("");

    const history = result.history || [];
    historyList.innerHTML = history.length
      ? history.map(h => `
          <div class="history-item">
            <strong>${escapeHtml(h.oldStatus || "—")} → ${escapeHtml(h.newStatus || "")}</strong>
            <small>${escapeHtml(h.time || "")} · ${escapeHtml(h.actor || "")} · ${escapeHtml(h.note || "")}</small>
          </div>
        `).join("")
      : `<div class="empty">진행이력이 없습니다.</div>`;
  } catch (err) {
    basicDetail.innerHTML = `<div class="empty">${escapeHtml(err.message || String(err))}</div>`;
  }
}

function detailItem(label,value) {
  return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
}

function inventionItem(item) {
  const classes = ["detail-item",item.wide?"wide":"",item.featured?"featured":""].filter(Boolean).join(" ");

  if (item.label === "첨부파일") {
    const files = Array.isArray(item.attachments) ? item.attachments : [];
    return `
      <div class="${classes}">
        <span>${escapeHtml(item.label)}</span>
        ${renderAttachments(files, item.value)}
      </div>
    `;
  }

  return `<div class="${classes}"><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.value || "—")}</p></div>`;
}

function renderAttachments(files, fallbackValue) {
  if (files.length) {
    return `
      <div class="attachment-list">
        ${files.map(file => {
          const name = escapeHtml(file.name || "첨부파일");
          const url = safeDriveUrl(file.url || "");
          const size = Number(file.size || 0);
          const sizeText = size ? ` · ${(size / 1024 / 1024).toFixed(1)}MB` : "";

          if (!url) {
            return `<div class="attachment-row"><span class="attachment-name">${name}${sizeText}</span></div>`;
          }

          return `
            <div class="attachment-row">
              <div>
                <strong class="attachment-name">${name}</strong>
                <small>${escapeHtml(file.mimeType || "")}${sizeText}</small>
              </div>
              <a class="attachment-open-btn" href="${url}" target="_blank" rel="noopener noreferrer">Drive에서 열기 ↗</a>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  return `<p>${escapeHtml(fallbackValue || "첨부파일 없음")}</p>`;
}

function safeDriveUrl(value) {
  const url = String(value || "").trim();
  return /^https:\/\/(drive|docs)\.google\.com\//i.test(url) ? escapeHtml(url) : "";
}

function populateManagerOptions() {
  MANAGER_OPTIONS.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    editManagerSelect.insertBefore(option,editManagerSelect.querySelector('option[value="__custom__"]'));
  });
}

function setManagerValue(manager) {
  const normalized = String(manager || "").trim();

  if (!normalized) {
    editManagerSelect.value = "";
    editManagerCustom.value = "";
    customManagerField.classList.add("hidden");
    return;
  }

  const hasOption = [...editManagerSelect.options].some(opt => opt.value === normalized);

  if (hasOption) {
    editManagerSelect.value = normalized;
    editManagerCustom.value = "";
    customManagerField.classList.add("hidden");
  } else {
    editManagerSelect.value = "__custom__";
    editManagerCustom.value = normalized;
    customManagerField.classList.remove("hidden");
  }
}

function getManagerValue() {
  return editManagerSelect.value === "__custom__"
    ? editManagerCustom.value.trim()
    : editManagerSelect.value.trim();
}

async function saveDetail() {
  if (!currentReceiptNo) return;

  saveDetailBtn.disabled = true;
  saveDetailBtn.textContent = "저장 중...";
  saveDetailMessage.textContent = "";

  try {
    await apiPost({
      action: "adminUpdate",
      adminKey,
      receiptNo: currentReceiptNo,
      newStatus: editStatus.value,
      manager: getManagerValue(),
      memo: editMemo.value.trim()
    });

    saveDetailMessage.textContent = "저장되었습니다.";
    await loadApplications();
    await openDetail(currentReceiptNo);
  } catch (err) {
    saveDetailMessage.textContent = err.message || String(err);
  } finally {
    saveDetailBtn.disabled = false;
    saveDetailBtn.textContent = "변경사항 저장";
  }
}

function closeModal() {
  modal.classList.add("hidden");
  currentReceiptNo = "";
  document.body.style.overflow = "";
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("02")) {
    if (digits.length === 9) return `${digits.slice(0,2)}-${digits.slice(2,5)}-${digits.slice(5)}`;
    if (digits.length === 10) return `${digits.slice(0,2)}-${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  return String(value || "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function sanitizePhoneFilterInput(el){
  if (!el) return;
  el.value = el.value.replace(/\D/g, "").slice(0,4);
}
[phoneFirstFilter, phoneMiddleFilter, phoneLastFilter].forEach(el => {
  el?.addEventListener("input", () => sanitizePhoneFilterInput(el));
});
phoneFirstFilter?.addEventListener("input", () => { if (phoneFirstFilter.value.length >= 3) phoneMiddleFilter?.focus(); });
phoneMiddleFilter?.addEventListener("input", () => { if (phoneMiddleFilter.value.length === 4) phoneLastFilter?.focus(); });

loginBtn.addEventListener("click",login);
adminKeyInput.addEventListener("keydown",e => { if (e.key === "Enter") login(); });
logoutBtn.addEventListener("click",() => {
  sessionStorage.removeItem(SESSION_KEY);
  adminKey = "";
  adminKeyInput.value = "";
  showLogin();
});
refreshBtn.addEventListener("click",loadApplications);
searchBtn.addEventListener("click",renderTable);
resetSearchBtn.addEventListener("click",resetSearch);
clearQuickBtn.addEventListener("click",resetSearch);
sortSelect.addEventListener("change",renderTable);
keywordFilter.addEventListener("keydown",e => { if (e.key === "Enter") renderTable(); });
toggleSearchBtn.addEventListener("click",() => {
  const hidden = advancedSearchBody.classList.toggle("hidden");
  toggleSearchBtn.textContent = hidden ? "검색조건 펼치기⌄" : "검색조건 접기⌃";
});

modalCloseBtn.addEventListener("click",closeModal);
document.querySelector(".modal-backdrop").addEventListener("click",closeModal);
saveDetailBtn.addEventListener("click",saveDetail);

editManagerSelect.addEventListener("change",() => {
  const custom = editManagerSelect.value === "__custom__";
  customManagerField.classList.toggle("hidden",!custom);
  if (custom) setTimeout(() => editManagerCustom.focus(),0);
});

document.addEventListener("keydown",e => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

function setTodayLabel(){
  const el = document.getElementById("todayLabel");
  if (!el) return;
  const now = new Date();
  const weekdays = ["일","월","화","수","목","금","토"];
  el.textContent = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${weekdays[now.getDay()]})`;
}
setTodayLabel();

populateManagerOptions();

if (adminKey) {
  showDashboard();
  loadApplications().catch(() => {
    sessionStorage.removeItem(SESSION_KEY);
    adminKey = "";
    showLogin();
  });
} else {
  showLogin();
}
