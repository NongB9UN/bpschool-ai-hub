/**
 * Main Application Logic & View Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  let allData = { ...PRELOADED_DATES };
  let currentDateKey = "2026-09-01";

  // Elements
  const dateSelect = document.getElementById("date-select");
  const quickPills = document.querySelectorAll(".quick-btn");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const copyLineBtn = document.getElementById("btn-copy-line");
  const previewLineBtn = document.getElementById("btn-preview-line");
  const modalOverlay = document.getElementById("line-modal");
  const closeModalBtn = document.getElementById("btn-close-modal");
  const modalCopyBtn = document.getElementById("btn-modal-copy");
  const linePreviewContent = document.getElementById("line-preview-text");

  // Ingestion elements
  const btnProcessChat = document.getElementById("btn-process-chat");
  const rawChatInput = document.getElementById("raw-chat-input");

  // Initialize UI
  initTheme();
  populateDateDropdown();
  renderDashboard(currentDateKey);

  // Event Listeners
  if (dateSelect) {
    dateSelect.addEventListener("change", (e) => {
      currentDateKey = e.target.value;
      updateActiveQuickPill(currentDateKey);
      renderDashboard(currentDateKey);
    });
  }

  quickPills.forEach(btn => {
    btn.addEventListener("click", () => {
      const dateVal = btn.getAttribute("data-date");
      if (allData[dateVal]) {
        currentDateKey = dateVal;
        dateSelect.value = dateVal;
        updateActiveQuickPill(dateVal);
        renderDashboard(currentDateKey);
      }
    });
  });

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.style.display = "none");

      btn.classList.add("active");
      const activePane = document.getElementById(`tab-${targetTab}`);
      if (activePane) activePane.style.display = "block";
    });
  });

  if (copyLineBtn) {
    copyLineBtn.addEventListener("click", () => {
      const data = allData[currentDateKey];
      if (data) {
        window.dashboardExporter.copyToClipboard(data.lineFormatted, "คัดลอกข้อความสรุปสำหรับ LINE เรียบร้อยแล้ว! 📲");
      }
    });
  }

  if (previewLineBtn) {
    previewLineBtn.addEventListener("click", () => {
      const data = allData[currentDateKey];
      if (data && modalOverlay && linePreviewContent) {
        linePreviewContent.textContent = data.lineFormatted;
        modalOverlay.classList.add("active");
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => modalOverlay.classList.remove("active"));
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove("active");
    });
  }

  if (modalCopyBtn) {
    modalCopyBtn.addEventListener("click", () => {
      const data = allData[currentDateKey];
      if (data) {
        window.dashboardExporter.copyToClipboard(data.lineFormatted, "คัดลอกข้อความเรียบร้อย!");
        modalOverlay.classList.remove("active");
      }
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Live Chat Ingest Process
  if (btnProcessChat && rawChatInput) {
    btnProcessChat.addEventListener("click", () => {
      const rawText = rawChatInput.value.trim();
      if (!rawText) {
        window.dashboardExporter.showToast("กรุณาวางข้อความแชท LINE ก่อนกดประมวลผลครับ", "danger");
        return;
      }

      window.dashboardExporter.showToast("กำลังประมวลผลด้วย AI...", "info");
      
      setTimeout(() => {
        const parsedDays = window.schoolChatParser.parseFullChat(rawText);
        const dayKeys = Object.keys(parsedDays);

        if (dayKeys.length === 0) {
          window.dashboardExporter.showToast("ไม่พบรูปแบบวันที่ในแชท (เช่น 2026.09.01 Tuesday)", "danger");
          return;
        }

        // Merge parsed days into allData
        allData = { ...allData, ...parsedDays };
        populateDateDropdown();

        // Switch to the most recent parsed day
        currentDateKey = dayKeys[dayKeys.length - 1];
        dateSelect.value = currentDateKey;
        renderDashboard(currentDateKey);

        // Switch to overview tab
        document.querySelector('[data-tab="overview"]').click();
        window.dashboardExporter.showToast(`วิเคราะห์สำเร็จ ${dayKeys.length} วัน! แสดงผลวันที่ ${currentDateKey}`, "success");
      }, 400);
    });
  }

  // Helper Functions
  function populateDateDropdown() {
    if (!dateSelect) return;
    dateSelect.innerHTML = "";
    Object.keys(allData).sort().reverse().forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = allData[key].dateDisplay || key;
      dateSelect.appendChild(option);
    });
    dateSelect.value = currentDateKey;
  }

  function updateActiveQuickPill(activeKey) {
    quickPills.forEach(btn => {
      if (btn.getAttribute("data-date") === activeKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function renderDashboard(dateKey) {
    const data = allData[dateKey];
    if (!data) return;

    // 1. Briefing Banner
    const briefingDate = document.getElementById("briefing-date-badge");
    const briefingText = document.getElementById("briefing-text");
    if (briefingDate) briefingDate.textContent = data.dateDisplay;
    if (briefingText) briefingText.textContent = data.executiveBriefing;

    // 2. KPIs
    const kpiUrgent = document.getElementById("kpi-urgent");
    const kpiAcademic = document.getElementById("kpi-academic");
    const kpiOps = document.getElementById("kpi-ops");
    const kpiAttendance = document.getElementById("kpi-attendance");

    if (kpiUrgent) kpiUrgent.textContent = data.kpi.urgentCount;
    if (kpiAcademic) kpiAcademic.textContent = data.kpi.academicCount;
    if (kpiOps) kpiOps.textContent = data.kpi.operationsCount;
    if (kpiAttendance) kpiAttendance.textContent = data.kpi.attendanceStatus;

    // 3. Incidents List
    const incidentsContainer = document.getElementById("incidents-list");
    if (incidentsContainer) {
      if (data.incidents.length === 0) {
        incidentsContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">✨</div><p>ไม่มีประเด็นด่วนหรือเหตุการณ์เฝ้าระวังในวันนี้</p></div>`;
      } else {
        incidentsContainer.innerHTML = data.incidents.map(inc => `
          <div class="incident-item ${inc.type}">
            <div class="incident-content">
              <div class="incident-title">${inc.title} <span class="badge badge-${inc.type === 'danger' ? 'danger' : inc.type === 'warning' ? 'warning' : 'primary'}">${inc.badge}</span></div>
              <div class="incident-desc">${inc.desc}</div>
              <div class="incident-meta">
                <span>👤 ผู้แจ้ง: <strong>${inc.reporter}</strong></span>
                <span>⏰ เวลา: ${inc.time}</span>
              </div>
            </div>
          </div>
        `).join("");
      }
    }

    // 4. Academic Cards
    const academicContainer = document.getElementById("academic-grid");
    if (academicContainer) {
      if (data.academic.length === 0) {
        academicContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📖</div><p>ไม่มีรายการแนวข้อสอบหรือแผนงานในวันนี้</p></div>`;
      } else {
        academicContainer.innerHTML = data.academic.map(ac => `
          <div class="exam-card">
            <div class="exam-card-header">
              <span class="exam-grade">${ac.grade}</span>
              <span class="badge ${ac.status.includes('ห้าม') ? 'badge-danger' : 'badge-success'}">${ac.status}</span>
            </div>
            <div class="exam-subject">${ac.subject}</div>
            <div class="exam-topics">${ac.details}</div>
            <div style="font-size:0.78rem; color:var(--text-light); margin-top:auto;">
              ผู้ส่ง/ตรวจ: <strong>${ac.reviewer}</strong>
            </div>
          </div>
        `).join("");
      }
    }

    // 5. Tasks Matrix Table
    const taskTbody = document.getElementById("task-tbody");
    if (taskTbody) {
      if (data.tasks.length === 0) {
        taskTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem;">ไม่มีงานค้างติดตาม</td></tr>`;
      } else {
        taskTbody.innerHTML = data.tasks.map(t => `
          <tr>
            <td><strong>${t.task}</strong></td>
            <td><span class="person-tag">👤 ${t.assignee}</span></td>
            <td><span class="badge badge-warning">⏰ ${t.deadline}</span></td>
            <td>
              <span class="badge ${t.status === 'Completed' ? 'badge-success' : 'badge-primary'}">
                ${t.status === 'Completed' ? '✅ เสร็จสิ้น' : '⏳ รอดำเนินการ'}
              </span>
            </td>
          </tr>
        `).join("");
      }
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    if (themeToggleBtn) {
      themeToggleBtn.textContent = theme === "dark" ? "☀️ สว่าง" : "🌙 มืด";
    }
  }
});
