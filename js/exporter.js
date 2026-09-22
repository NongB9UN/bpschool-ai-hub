/**
 * Exporter & Clipboard Integration Utility
 */

class DashboardExporter {
  /**
   * Copy text to clipboard and show toast
   */
  async copyToClipboard(text, successMsg = "คัดลอกข้อความสำเร็จเรียบร้อยแล้ว!") {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(successMsg, "success");
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      this.showToast(successMsg, "success");
    }
  }

  /**
   * Print executive summary
   */
  printReport() {
    window.print();
  }

  /**
   * Show Toast Notification
   */
  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "📋";
    if (type === "success") icon = "✅";
    if (type === "danger") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.dashboardExporter = new DashboardExporter();
