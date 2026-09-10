const API_URL = "https://script.google.com/macros/s/AKfycbzA9_n1_DKpNayQiV0hoWw3VyxRDrS34-Gwfv-RkAPySy09jcCEC3ZWoNqw34GWDdgB/exec";
const MAX_UPLOAD_FILES = 3;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const DRAFT_KEY_PREFIX = "stealthIntakeDraftV12:";
const LEGACY_DRAFT_KEYS = ["patentIntakeDraft","patentIntakeDraftV11","patentIntakeDraftV10","patentIntakeDraftV9","patentIntakeDraftV8"];

function currentDraftKey() {
  return `${DRAFT_KEY_PREFIX}${serviceType}`;
}


const homeView = document.getElementById("homeView");
const wizardView = document.getElementById("wizardView");
const successView = document.getElementById("successView");
const statusView = document.getElementById("statusView");
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

// 브라우저가 이전 테스트값을 임의로 자동완성하지 않도록 합니다.
form?.querySelectorAll("input, textarea").forEach(field => field.setAttribute("autocomplete", "off"));

document.querySelectorAll("[data-scroll]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
    document.querySelector(".main-nav")?.classList.remove("mobile-open");
    document.querySelectorAll(".menu-item.open").forEach(item => item.classList.remove("open"));
  });
});

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    window.location.href = `detail.html?page=${encodeURIComponent(button.dataset.page)}`;
  });
});

const requestedStart = new URLSearchParams(window.location.search).get("start");
if (["consultation", "precheck", "filing", "brand", "status"].includes(requestedStart)) {
  const entryKey = `stealthEntryHandled:${requestedStart}`;
  const alreadyHandled = sessionStorage.getItem(entryKey) === "1";

  if (!alreadyHandled) {
    sessionStorage.setItem(entryKey, "1");
    window.addEventListener("load", () => {
      startWizard(requestedStart);
      history.replaceState({}, "", window.location.pathname);
    }, { once: true });
  } else {
    history.replaceState({}, "", window.location.pathname);
  }
}

const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const mainNav = document.querySelector(".main-nav");
mobileMenuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("mobile-open");
  mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
  mobileMenuToggle.textContent = isOpen ? "×" : "☰";
});

document.querySelectorAll(".menu-item > button").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest(".menu-item");
    const willOpen = !item.classList.contains("open");
    document.querySelectorAll(".menu-item.open").forEach(openItem => openItem.classList.remove("open"));
    item.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });
});

document.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("mouseenter", () => {
    document.querySelectorAll(".menu-item.open").forEach(openItem => {
      if (openItem !== item) openItem.classList.remove("open");
    });
  });
});

const heroSlider = document.querySelector(".hero-slider");
const heroSlides = [...document.querySelectorAll(".hero-slide")];
const slideDots = [...document.querySelectorAll(".slide-dot")];
let activeSlide = 0;
let slideTimer;

function showSlide(index) {
  activeSlide = (index + heroSlides.length) % heroSlides.length;
  heroSlides.forEach((slide, i) => {
    const active = i === activeSlide;
    slide.classList.toggle("active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  slideDots.forEach((dot, i) => dot.classList.toggle("active", i === activeSlide));
}
function startSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(activeSlide + 1), 6000);
}
slideDots.forEach(dot => dot.addEventListener("click", () => {
  showSlide(Number(dot.dataset.slide));
  startSlideTimer();
}));
document.addEventListener("visibilitychange", () => document.hidden ? clearInterval(slideTimer) : startSlideTimer());
if (heroSlides.length) startSlideTimer();

let currentStep = 0;
let serviceType = "precheck";
let activeSteps = steps;

function setActiveSteps(type) {
  // 온라인 상담은 특허출원용 전문 질문을 제외한 별도 간편 절차입니다.
  const consultationIndexes = [0, 1, 3, 5, 6, 10, 11];
  activeSteps = type === "consultation"
    ? consultationIndexes.map(index => steps[index])
    : steps;
  steps.forEach(step => step.classList.remove("active"));
  currentStep = 0;
}

const serviceMeta = {
  consultation: {
    title: "온라인 상담 신청",
    subtitle: "상담 분야와 현재 상황을 편하게 알려주세요. 대표변리사가 확인 후 연락드립니다."
  },
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

const consultationCategoryField = document.getElementById("consultationCategoryField");
const consultationCategory = document.getElementById("consultationCategory");
const originalStepCopy = steps.map(step => ({
  title: step.querySelector("h3")?.textContent || "",
  desc: step.querySelector(".step-desc")?.textContent.trim() || "",
  label: step.querySelector(".field > span")?.textContent || "",
  placeholder: step.querySelector("textarea, input[name='inventionTitle']")?.placeholder || ""
}));

const consultationStepCopy = [
  null,
  ["상담 제목","궁금한 내용을 한 문장으로 적어주세요.","상담 제목 *","예: 상표 등록 가능성과 출원 비용을 상담받고 싶습니다"],
  null,
  ["현재 상황","현재 진행된 내용과 가장 고민되는 점을 알려주세요.","현재 상황과 고민 *","예: 상호를 사용 중인데 비슷한 상표가 발견되어 등록 가능성이 궁금합니다"],
  null,
  ["상담 문의 내용","궁금한 점과 원하는 도움을 자유롭게 적어주세요.","문의 내용 *","예: 등록 가능성, 예상 비용과 기간, 준비할 자료 등을 알고 싶습니다"],
  ["참고자료 첨부","상담 내용을 이해하는 데 도움이 되는 자료가 있을 때만 선택적으로 첨부해주세요.","자료 설명","예: 관련 공문, 제품 사진, 계약서 중 문의할 부분"],
  null,
  null,
  null,
  ["진행 여부 · 제출 동의","이미 출원·등록·공개·판매 또는 분쟁이 진행 중인지 알려주세요.",null,null]
];

function configureWizardCopy(type){
  const consultation = type === "consultation";
  setActiveSteps(type);
  const sidebarTip = document.querySelector(".sidebar-note p");
  if(sidebarTip) sidebarTip.textContent = consultation
    ? "법률용어나 전문적인 문장으로 작성하지 않아도 됩니다. 현재 상황과 궁금한 점을 평소 설명하듯 적어주세요."
    : "완벽한 특허 문장으로 쓰지 않아도 됩니다. 평소 설명하듯 적어주시면 됩니다.";
  consultationCategoryField?.classList.toggle("hidden", !consultation);
  if(consultationCategory) consultationCategory.required = consultation;
  const firstDesc=steps[0]?.querySelector(".step-desc");
  if(firstDesc) firstDesc.textContent=consultation?"상담 내용을 확인하고 연락드릴 기본 정보를 입력해 주세요.":originalStepCopy[0].desc;
  steps.forEach((step,index)=>{
    if(index===0 || index===steps.length-1) return;
    const copy = consultation ? consultationStepCopy[index] : [originalStepCopy[index].title,originalStepCopy[index].desc,originalStepCopy[index].label,originalStepCopy[index].placeholder];
    if(!copy) return;
    const title=step.querySelector("h3"),desc=step.querySelector(".step-desc"),label=step.querySelector(".field > span"),input=step.querySelector("textarea, input[name='inventionTitle']");
    if(title) title.textContent=copy[0];
    if(desc) desc.textContent=copy[1];
    if(label && copy[2]) label.textContent=copy[2];
    if(input && copy[3]!==null) input.placeholder=copy[3];
  });
  const disclosureLegend=steps[10]?.querySelector("legend");
  if(disclosureLegend) disclosureLegend.textContent=consultation?"이미 출원·등록·공개·판매 또는 분쟁이 진행 중입니까? *":"공개한 적이 있습니까? *";
  const disclosureLabel=steps[10]?.querySelector("textarea[name='disclosureNote']")?.closest("label")?.querySelector("span");
  if(disclosureLabel) disclosureLabel.textContent=consultation?"진행 내용 또는 추가 참고사항":"공개 내용 또는 참고사항";
  const uploadNotice=document.querySelector(".upload-email-notice");
  if(uploadNotice) uploadNotice.innerHTML=consultation?'용량을 초과하거나 지원하지 않는 형식의 자료는 <b><span id="supportEmailText">회사 상담 이메일 주소</span>로 별도 전송</b>해 주세요. 이메일 제목에는 신청자명과 상담 제목을 함께 적어주세요.':'용량을 초과하거나 위 형식 외의 자료는 <b><span id="supportEmailText">회사 상담 이메일 주소</span>로 별도 전송</b>해 주세요. 이메일 제목에는 신청자명과 발명의 명칭을 함께 적어주세요.';
  const uploadStrong=steps[6]?.querySelector(".upload-placeholder > strong");
  const uploadHelp=steps[6]?.querySelector(".upload-main-help");
  const uploadBox=steps[6]?.querySelector(".upload-help-box");
  if(consultation){
    if(uploadStrong) uploadStrong.textContent="참고 이미지 · PDF 첨부 (선택)";
    if(uploadHelp) uploadHelp.textContent="필요한 경우에만 JPG, PNG, PDF 파일을 최대 3개까지 첨부할 수 있습니다.";
    if(uploadBox) uploadBox.innerHTML='<p><b>첨부는 필수가 아닙니다.</b> 상담에 참고할 공문, 제품 사진, 계약서 일부, 등록공보 등이 있을 때만 올려주세요.</p><p class="upload-email-notice">한글·워드 등 다른 형식은 상담 접수 후 안내받은 이메일로 보내실 수 있습니다.</p>';
  }
}

function showView(view) {
  [homeView, wizardView, successView, statusView].filter(Boolean).forEach(v => v.classList.add("hidden"));
  view.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startWizard(type = "precheck") {
  serviceType = type;
  wizardView.dataset.service = type;
  const meta = serviceMeta[type] || serviceMeta.precheck;
  wizardTitle.textContent = meta.title;
  wizardSubtitle.textContent = meta.subtitle;
  configureWizardCopy(type);

  if (type === "status") {
    const receiptInput = document.getElementById("statusReceiptNo");
    const phoneInput = document.getElementById("statusPhone");
    const resultBox = document.getElementById("statusResult");
    if (receiptInput) receiptInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (resultBox) {
      resultBox.innerHTML = "";
      resultBox.classList.add("hidden");
    }
    showView(statusView);
    setTimeout(() => receiptInput?.focus(), 100);
    return;
  }

  // 다른 서비스에서 입력한 값이 현재 화면으로 넘어오지 않도록 먼저 초기화합니다.
  form.reset();
  if (phoneFirst) phoneFirst.value = "010";
  if (emailDomain) emailDomain.value = "naver.com";
  if (emailDomainDirect) {
    emailDomainDirect.value = "";
    emailDomainDirect.classList.add("hidden");
  }
  // 새 접수는 언제나 빈 양식으로 시작합니다. 이전 테스트값은 자동 복원하지 않습니다.
  localStorage.removeItem(currentDraftKey());
  syncContactFields();
  showView(wizardView);
  renderStep();
}

function renderStep() {
  const section = activeSteps[currentStep];
  steps.forEach(step => step.classList.toggle("active", step === section));

  const isReview = currentStep === activeSteps.length - 1;
  const title = section.querySelector("h3")?.textContent || "접수";
  const displayStep = currentStep + 1;
  const inputStepCount = activeSteps.length - 1;

  stepLabel.textContent = isReview ? "REVIEW" : `STEP ${String(displayStep).padStart(2, "0")} / ${String(inputStepCount).padStart(2, "0")}`;
  const sheetLabel = section.querySelector(".sheet-label");
  if(sheetLabel && !isReview) sheetLabel.textContent = `STEP ${String(displayStep).padStart(2, "0")}${section === steps[6] ? " · 선택" : ""}`;
  stepTitleTop.textContent = title;
  progressBar.style.width = `${((currentStep + 1) / activeSteps.length) * 100}%`;

  prevBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
  nextBtn.classList.toggle("hidden", isReview);
  submitBtn.classList.toggle("hidden", !isReview);

  if (isReview) buildReview();
}

function validateStep(section) {
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

function validateCurrentStep() {
  return validateStep(activeSteps[currentStep]);
}

// 최종 접수 전에 이전 단계 전체를 다시 확인합니다. 누락 항목이 있으면
// 해당 화면으로 즉시 이동하므로 마지막 화면에서 뒤늦게 오류가 나지 않습니다.
function validateAllInputSteps() {
  const inputSteps = activeSteps.slice(0, -1);
  const originalStep = currentStep;

  for (let index = 0; index < inputSteps.length; index += 1) {
    currentStep = index;
    renderStep();
    if (!validateCurrentStep()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
  }

  currentStep = originalStep;
  renderStep();
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
  localStorage.setItem(currentDraftKey(), JSON.stringify({
    serviceType,
    currentStep,
    data: formDataObject()
  }));
  saveState.textContent = manual ? "임시저장 완료" : "자동저장됨";
  if (manual) setTimeout(() => saveState.textContent = "임시저장됨", 1400);
}

function clearLegacyDrafts() {
  // 예전 버전 및 서비스별 저장소에 남은 테스트 입력값을 모두 제거합니다.
  LEGACY_DRAFT_KEYS.forEach(key => localStorage.removeItem(key));
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("patentIntakeDraft") || key.startsWith(DRAFT_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}
clearLegacyDrafts();

window.addEventListener("pageshow", () => {
  if (!localStorage.getItem(currentDraftKey())) {
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
  const raw = localStorage.getItem(currentDraftKey());
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
  consultationCategory: "상담 분야",
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

const consultationLabels = {
  name:"성함 / 담당자명",company:"회사명 · 소속",phone:"연락처",email:"이메일",consultationCategory:"상담 분야",
  inventionTitle:"상담 제목",existingProblem:"현재 상황과 고민",implementation:"문의 내용",
  drawingDescription:"참고자료 설명",disclosed:"관련 절차 진행 여부",disclosureNote:"진행 내용 / 참고사항"
};

function buildReview() {
  const data = formDataObject();
  reviewContent.innerHTML = "";

  Object.entries(serviceType === "consultation" ? consultationLabels : labels).forEach(([key, label]) => {
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
  currentStep = Math.min(currentStep + 1, activeSteps.length - 1);
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

  if (!validateAllInputSteps()) return;

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
    currentStep = serviceType === "consultation" ? 4 : Math.min(6, activeSteps.length - 1);
    renderStep();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "접수 중...";
  saveState.textContent = "접수 처리 중...";

  try {
    const submittedData = formDataObject();

    // 구버전 Apps Script가 특허출원 전용 필드를 검사하더라도 온라인 상담이
    // 중단되지 않도록 상담 내용을 호환 필드에도 함께 전달합니다.
    if (serviceType === "consultation") {
      const category = submittedData.consultationCategory || "온라인 상담";
      const inquiry = submittedData.implementation || submittedData.existingProblem || submittedData.inventionTitle;
      submittedData.technicalField ||= category;
      submittedData.objective ||= inquiry;
      submittedData.effects ||= inquiry;
      submittedData.differentiation ||= inquiry;
    }

    const payload = {
      action: "submit",
      ...submittedData,
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

    localStorage.removeItem(currentDraftKey());
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


// ===== 고객용 진행상황 조회 V1 =====

const statusReceiptNo = document.getElementById("statusReceiptNo");
const statusPhone = document.getElementById("statusPhone");
const statusSearchBtn = document.getElementById("statusSearchBtn");
const statusResult = document.getElementById("statusResult");

function escapeStatusHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeStatusPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatStatusPhone(value) {
  const digits = normalizeStatusPhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

statusPhone?.addEventListener("input", () => {
  statusPhone.value = formatStatusPhone(statusPhone.value);
});

[statusReceiptNo, statusPhone].forEach(el => el?.addEventListener("keydown", e => {
  if (e.key === "Enter") statusSearchBtn?.click();
}));

function statusStageIndex(status) {
  const text = String(status || "").trim();
  if (text === "신규접수") return 0;
  if (text === "검토중" || text === "추가자료 요청") return 1;
  if (text === "출원진행") return 2;
  if (text === "출원완료" || text === "특허청 심사중" || text === "의견제출통지 대응") return 3;
  if (text === "등록결정" || text === "등록완료") return 4;
  return 0;
}

function renderStatusResult(data) {
  const stages = ["접수완료","담당자 검토","출원 준비","특허청 진행","등록"];
  const idx = statusStageIndex(data.status);
  const progress = stages.map((label, i) => {
    const cls = i < idx ? "done" : (i === idx ? "current" : "");
    return `<span class="${cls}">${label}</span>`;
  }).join("");

  statusResult.innerHTML = `
    <div class="status-result-head">
      <div>
        <div class="status-receipt">${escapeStatusHtml(data.receiptNo)}</div>
        <div class="status-current">${escapeStatusHtml(data.status || "진행상태 확인 중")}</div>
      </div>
      <span class="status-badge">${escapeStatusHtml(data.serviceType || "온라인 접수")}</span>
    </div>
    <div class="status-progress">${progress}</div>
    <div class="status-info">
      <div><small>신청인</small><strong>${escapeStatusHtml(data.name || "-")}</strong></div>
      <div><small>접수일시</small><strong>${escapeStatusHtml(data.submittedAt || "-")}</strong></div>
      <div><small>발명·상담 제목</small><strong>${escapeStatusHtml(data.inventionTitle || "-")}</strong></div>
      <div><small>담당자</small><strong>${escapeStatusHtml(data.manager || "담당자 배정 전")}</strong></div>
      <div><small>최근 업데이트</small><strong>${escapeStatusHtml(data.updatedAt || "-")}</strong></div>
    </div>`;
  statusResult.classList.remove("hidden");
}

statusSearchBtn?.addEventListener("click", async () => {
  const receiptNo = String(statusReceiptNo?.value || "").trim().toUpperCase();
  const phone = normalizeStatusPhone(statusPhone?.value);

  if (!receiptNo) {
    alert("접수번호를 입력해 주세요.");
    statusReceiptNo?.focus();
    return;
  }
  if (phone.length < 9) {
    alert("접수할 때 입력한 연락처를 입력해 주세요.");
    statusPhone?.focus();
    return;
  }

  statusSearchBtn.disabled = true;
  statusSearchBtn.textContent = "조회 중...";
  statusResult.classList.add("hidden");

  try {
    const data = await apiPost({ action: "status", receiptNo, phone });
    renderStatusResult(data);
  } catch (err) {
    statusResult.innerHTML = `<div class="status-error">${escapeStatusHtml(err.message || "진행상황을 조회하지 못했습니다.")}</div>`;
    statusResult.classList.remove("hidden");
  } finally {
    statusSearchBtn.disabled = false;
    statusSearchBtn.textContent = "진행상황 조회";
  }
});
