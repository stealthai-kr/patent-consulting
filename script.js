const API_URL = "https://script.google.com/macros/s/AKfycbzA9_n1_DKpNayQiV0hoWw3VyxRDrS34-Gwfv-RkAPySy09jcCEC3ZWoNqw34GWDdgB/exec";
const MAX_UPLOAD_FILES = 3;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const DRAFT_KEY = "patentIntakeDraftV11";
const LEGACY_DRAFT_KEYS = ["patentIntakeDraft","patentIntakeDraftV10","patentIntakeDraftV9","patentIntakeDraftV8"];


const homeView = document.getElementById("homeView");
const wizardView = document.getElementById("wizardView");
const successView = document.getElementById("successView");
const form = document.getElementById("intakeForm");
const steps = [...document.querySelectorAll(".step")];

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const saveBtn = document.getElementById("saveBtn");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const stepTitleTop = document.getElementById("stepTitleTop");
const saveState = document.getElementById("saveState");
const wizardTitle = document.getElementById("wizardTitle");
const wizardSubtitle = document.getElementById("wizardSubtitle");
const reviewContent = document.getElementById("reviewContent");
const receiptNo = document.getElementById("receiptNo");

let currentStep = 0;
let serviceType = "precheck";

const serviceMeta = {
  precheck: {
    title: "특허 가능성 사전검토",
    subtitle: "핵심 정보만 순서대로 입력해주세요."
  },
  filing: {
    title: "특허출원 접수",
    subtitle: "출원 준비에 필요한 발명 내용을 단계별로 작성합니다."
  },
  brand: {
    title: "상표·디자인 상담",
    subtitle: "현재 데모에서는 특허 질문 흐름으로 연결됩니다. 실제 운영 시 별도 폼으로 분리합니다."
  },
  status: {
    title: "진행상황 조회",
    subtitle: "실제 운영 버전에서 접수번호 조회 기능을 연결합니다."
  }
};

function showView(view) {
  [homeView, wizardView, successView].forEach(v => v.classList.add("hidden"));
  view.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startWizard(type = "precheck") {
  serviceType = type;
  const meta = serviceMeta[type] || serviceMeta.precheck;
  wizardTitle.textContent = meta.title;
  wizardSubtitle.textContent = meta.subtitle;

  if (type === "status") {
    alert("진행상황 조회는 백엔드 연결 단계에서 접수번호 기반으로 구현하면 됩니다.");
    return;
  }

  loadDraft();
  if (!localStorage.getItem(DRAFT_KEY) && phoneFirst) phoneFirst.value = "010";
  syncContactFields();
  showView(wizardView);
  renderStep();
}

function renderStep() {
  steps.forEach((step, idx) => step.classList.toggle("active", idx === currentStep));

  const isReview = currentStep === steps.length - 1;
  const title = steps[currentStep].querySelector("h3")?.textContent || "접수";
  const displayStep = Math.min(currentStep + 1, 11);

  stepLabel.textContent = isReview ? "REVIEW" : `STEP ${String(displayStep).padStart(2, "0")} / 11`;
  stepTitleTop.textContent = title;
  progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;

  prevBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
  nextBtn.classList.toggle("hidden", isReview);
  submitBtn.classList.toggle("hidden", !isReview);

  if (isReview) buildReview();
}

function validateCurrentStep() {
  const section = steps[currentStep];
  const required = [...section.querySelectorAll("[required]")];

  for (const el of required) {
    if (el.type === "radio") {
      const group = form.querySelectorAll(`[name="${el.name}"]`);
      if (![...group].some(r => r.checked)) {
        alert("필수 항목을 선택해주세요.");
        return false;
      }
      continue;
    }
    if (el.type === "checkbox" && !el.checked) {
      alert("필수 동의 항목을 확인해주세요.");
      return false;
    }
    if (!el.value.trim()) {
      el.focus();
      el.reportValidity();
      return false;
    }
  }
  return true;
}


// V4 연락처/이메일 조합 입력
const phoneFirst = document.getElementById("phoneFirst");
const phoneMiddle = document.getElementById("phoneMiddle");
const phoneLast = document.getElementById("phoneLast");
const phoneValue = document.getElementById("phoneValue");
const emailLocal = document.getElementById("emailLocal");
const emailDomain = document.getElementById("emailDomain");
const emailDomainDirect = document.getElementById("emailDomainDirect");
const emailValue = document.getElementById("emailValue");

function phoneDigits(el, max=4){
  if (!el) return;
  el.value = el.value.replace(/\D/g, "").slice(0,max);
}
function syncContactFields(){
  phoneDigits(phoneFirst,4);
  phoneDigits(phoneMiddle,4);
  phoneDigits(phoneLast,4);
  const first=(phoneFirst?.value||"").trim();
  const middle=(phoneMiddle?.value||"").trim();
  const last=(phoneLast?.value||"").trim();
  const phoneValid = first.length >= 2 && middle.length >= 3 && last.length === 4;
  if (phoneValue) phoneValue.value = phoneValid ? `${first}-${middle}-${last}` : "";
  const local=(emailLocal?.value||"").trim().replace(/\s/g,"");
  const domain=(emailDomain?.value==="direct" ? (emailDomainDirect?.value||"") : (emailDomain?.value||"")).trim().replace(/^@/,"").replace(/\s/g,"");
  if (emailValue) emailValue.value = local && domain ? `${local}@${domain}` : "";
}
function toggleEmailDomain(){
  const direct=emailDomain?.value==="direct";
  emailDomainDirect?.classList.toggle("hidden",!direct);
  if (emailDomainDirect) emailDomainDirect.required=direct;
  syncContactFields();
}
[phoneFirst,phoneMiddle,phoneLast,emailLocal,emailDomainDirect].forEach(el=>el?.addEventListener("input",syncContactFields));
phoneFirst?.addEventListener("input",()=>{ if(phoneFirst.value.length>=3) phoneMiddle?.focus(); });
phoneMiddle?.addEventListener("input",()=>{ if(phoneMiddle.value.length===4) phoneLast?.focus(); });
emailDomain?.addEventListener("change",toggleEmailDomain);
toggleEmailDomain();

function formDataObject() {
  syncContactFields();
  const fd = new FormData(form);
  const obj = {};
  for (const [key, value] of fd.entries()) {
    if (value instanceof File) continue;
    if (obj[key]) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  obj.serviceType = serviceType;
  return obj;
}

function saveDraft(manual = false) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    serviceType,
    currentStep,
    data: formDataObject()
  }));
  saveState.textContent = manual ? "임시저장 완료" : "자동저장됨";
  if (manual) setTimeout(() => saveState.textContent = "임시저장됨", 1400);
}

function clearLegacyDrafts() {
  // 예전 버전에서 남은 테스트값(예: 1, 11 등)을 V11 최초 실행 시 모두 제거합니다.
  LEGACY_DRAFT_KEYS.forEach(key => localStorage.removeItem(key));
}
clearLegacyDrafts();

window.addEventListener("pageshow", () => {
  if (!localStorage.getItem(DRAFT_KEY)) {
    const nameField = form?.querySelector('[name="name"]');
    const companyField = form?.querySelector('[name="company"]');
    const titleField = form?.querySelector('[name="inventionTitle"]');

    if (nameField && nameField.value === "1") nameField.value = "";
    if (companyField && companyField.value === "1") companyField.value = "";
    if (titleField && /^1+$/.test(titleField.value || "")) titleField.value = "";

    if (phoneFirst) phoneFirst.value = "010";
    if (phoneMiddle && /^1+$/.test(phoneMiddle.value || "")) phoneMiddle.value = "";
    if (phoneLast && /^1+$/.test(phoneLast.value || "")) phoneLast.value = "";
    if (emailLocal && emailLocal.value === "1") emailLocal.value = "";

    syncContactFields();
  }
});


function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    if (!draft?.data) return;
    Object.entries(draft.data).forEach(([name, value]) => {
      const fields = [...form.querySelectorAll(`[name="${name}"]`)];
      if (!fields.length) return;
      fields.forEach(field => {
        if (field.type === "radio") {
          field.checked = field.value === value;
        } else if (field.type === "checkbox") {
          field.checked = value === "on" || value === true;
        } else {
          field.value = Array.isArray(value) ? value[0] : value;
        }
      });
    });

    // 조합형 연락처/이메일 복원
    const savedPhone = String(draft.data.phone || "").replace(/\s/g, "");
    const phoneParts = savedPhone.split("-");
    if (phoneParts.length === 3) {
      if (phoneFirst) phoneFirst.value = phoneParts[0];
      if (phoneMiddle) phoneMiddle.value = phoneParts[1];
      if (phoneLast) phoneLast.value = phoneParts[2];
    }

    const savedEmail = String(draft.data.email || "").trim();
    const at = savedEmail.lastIndexOf("@");
    if (at > 0) {
      const local = savedEmail.slice(0, at);
      const domain = savedEmail.slice(at + 1);
      if (emailLocal) emailLocal.value = local;
      const known = [...emailDomain.options].some(o => o.value === domain);
      if (known) {
        emailDomain.value = domain;
      } else {
        emailDomain.value = "direct";
        emailDomainDirect.value = domain;
      }
      toggleEmailDomain();
    }
    syncContactFields();
  } catch (e) {
    console.warn("Draft load failed", e);
  }
}

const labels = {
  name: "성함 / 담당자명",
  company: "회사명 · 소속",
  phone: "연락처",
  email: "이메일",
  inventionTitle: "발명의 명칭",
  technicalField: "기술 분야",
  existingProblem: "기존 방식의 문제점",
  objective: "해결 과제",
  implementation: "구성 및 구현 방법",
  drawingDescription: "도면 설명",
  results: "실험·성능 데이터",
  effects: "기대 효과",
  differentiation: "핵심 차별점",
  disclosed: "공개 여부",
  disclosureNote: "공개 내용 / 참고사항"
};

function buildReview() {
  const data = formDataObject();
  reviewContent.innerHTML = "";

  Object.entries(labels).forEach(([key, label]) => {
    const value = data[key] || "—";
    const item = document.createElement("div");
    item.className = "review-item";
    item.innerHTML = `<strong>${label}</strong><span></span>`;
    item.querySelector("span").textContent = value;
    reviewContent.appendChild(item);
  });
}


nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  saveDraft();
  currentStep = Math.min(currentStep + 1, steps.length - 1);
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

prevBtn.addEventListener("click", () => {
  currentStep = Math.max(currentStep - 1, 0);
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

saveBtn.addEventListener("click", () => saveDraft(true));

form.addEventListener("input", () => {
  clearTimeout(window.__draftTimer);
  saveState.textContent = "저장 중...";
  window.__draftTimer = setTimeout(() => saveDraft(), 600);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  syncContactFields();

  if (!validateCurrentStep()) return;

  if (!phoneValue.value) {
    alert("연락처를 확인해주세요.");
    phoneFirst.focus();
    return;
  }

  if (!emailValue.value) {
    alert("이메일을 확인해주세요.");
    emailLocal.focus();
    return;
  }

  const selectedFiles = [...fileInput.files];
  const fileProblem = validateSelectedFiles(selectedFiles);
  if (fileProblem) {
    alert(fileProblem);
    currentStep = Math.min(6, steps.length - 1);
    renderStep();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "접수 중...";
  saveState.textContent = "접수 처리 중...";

  try {
    const payload = {
      action: "submit",
      ...formDataObject(),
      attachmentNames: selectedFiles.map(file => file.name).join(" · ")
    };

    const result = await apiPost(payload);
    const newReceiptNo = result.receiptNo;

    let uploadWarnings = [];

    if (selectedFiles.length) {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        submitBtn.textContent = `첨부 ${i + 1}/${selectedFiles.length} 업로드 중...`;
        saveState.textContent = `${file.name} 업로드 중...`;

        try {
          const base64 = await fileToBase64(file);
          await apiPost({
            action: "uploadAttachment",
            receiptNo: newReceiptNo,
            uploadToken: result.uploadToken,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            base64
          });
        } catch (uploadErr) {
          uploadWarnings.push(`${file.name}: ${uploadErr.message || uploadErr}`);
        }
      }

      try {
        await apiPost({
          action: "finalizeUpload",
          receiptNo: newReceiptNo,
          uploadToken: result.uploadToken
        });
      } catch (finalizeErr) {
        console.warn("finalizeUpload failed", finalizeErr);
      }
    }

    localStorage.removeItem(DRAFT_KEY);
    receiptNo.textContent = newReceiptNo;

    form.reset();
    if (phoneFirst) phoneFirst.value = "010";
    if (emailDomain) emailDomain.value = "naver.com";
    if (emailDomainDirect) emailDomainDirect.classList.add("hidden");
    syncContactFields();

    currentStep = 0;
    showView(successView);

    if (uploadWarnings.length) {
      setTimeout(() => {
        alert(
          "접수는 정상 완료되었지만 일부 첨부파일 업로드에 실패했습니다.\n\n" +
          uploadWarnings.join("\n") +
          "\n\n실패한 자료는 안내된 상담 이메일로 보내주세요."
        );
      }, 100);
    }
  } catch (err) {
    alert(err.message || "접수 처리 중 오류가 발생했습니다.");
    saveState.textContent = "접수 실패";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "접수하기";
  }
});

document.querySelectorAll("[data-start]").forEach(btn => {
  btn.addEventListener("click", () => startWizard(btn.dataset.start));
});
document.querySelectorAll("[data-service]").forEach(btn => {
  btn.addEventListener("click", () => startWizard(btn.dataset.service));
});
document.querySelectorAll("[data-go-home]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    showView(homeView);
  });
});

const fileInput = document.getElementById("fileInput");
const fileButton = document.getElementById("fileButton");
const fileList = document.getElementById("fileList");
fileButton.addEventListener("click", () => fileInput.click());
function validateSelectedFiles(files) {
  const problems = [];

  if (files.length > MAX_UPLOAD_FILES) {
    problems.push(`파일은 최대 ${MAX_UPLOAD_FILES}개까지 첨부할 수 있습니다.`);
  }

  files.forEach(file => {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      problems.push(`${file.name}: JPG, PNG, PDF 파일만 첨부할 수 있습니다.`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      problems.push(`${file.name}: 파일당 5MB를 초과했습니다.`);
    }
  });

  return problems.join("\n");
}

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files];
  const problem = validateSelectedFiles(files);

  if (problem) {
    fileInput.value = "";
    fileList.textContent = problem.replace(/\n/g, " ");
    fileList.classList.add("file-error");
    return;
  }

  fileList.classList.remove("file-error");
  fileList.textContent = files.length
    ? files.map(file => `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`).join(" · ")
    : "선택된 파일이 없습니다.";
});


async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`서버 응답 오류 (${response.status})`);
  }

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.message || "요청 처리에 실패했습니다.");
  }

  return result;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };

    reader.onerror = () => reject(new Error(`${file.name} 파일을 읽지 못했습니다.`));
    reader.readAsDataURL(file);
  });
}

async function loadPublicConfig() {
  try {
    const response = await fetch(`${API_URL}?action=config`, { redirect: "follow" });
    const result = await response.json();
    const emailEl = document.getElementById("supportEmailText");

    if (emailEl) {
      if (result.ok && result.supportEmail) {
        emailEl.textContent = result.supportEmail;
      } else {
        emailEl.textContent = "회사 상담 이메일 주소";
      }
    }
  } catch (err) {
    console.warn("config load failed", err);
  }
}
loadPublicConfig();


renderStep();
