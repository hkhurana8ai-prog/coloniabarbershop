// public/js/site.js
(function () {
  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var navLinksEl = document.querySelector(".nav-links");
  if (toggle && navLinksEl) {
    toggle.addEventListener("click", function () {
      var open = navLinksEl.style.display === "flex";
      navLinksEl.style.display = open ? "none" : "flex";
      navLinksEl.style.flexDirection = "column";
      navLinksEl.style.position = "absolute";
      navLinksEl.style.top = "100%";
      navLinksEl.style.left = "0";
      navLinksEl.style.right = "0";
      navLinksEl.style.background = "var(--paper)";
      navLinksEl.style.padding = "16px 24px";
      navLinksEl.style.borderBottom = "1px solid var(--line)";
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  // Highlight today's row in the hours table
  var hoursTable = document.getElementById("hoursTable");
  if (hoursTable) {
    var dayIndex = new Date().getDay(); // 0 = Sunday
    var orderMonFirst = [1, 2, 3, 4, 5, 6, 0]; // table is printed Mon..Sun
    var rowIndex = orderMonFirst.indexOf(dayIndex);
    var rows = hoursTable.querySelectorAll("tbody tr");
    if (rows[rowIndex]) rows[rowIndex].classList.add("is-today");
  }

  // Lead capture form ("Request a callback")
  var leadForm = document.getElementById("leadForm");
  var leadMsg = document.getElementById("leadFormMsg");
  if (leadForm) {
    leadForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var fd = new FormData(leadForm);
      var payload = {
        name: fd.get("name"),
        phone: fd.get("phone"),
        message: fd.get("message"),
        honeypot: fd.get("hp_field"),
      };
      var submitBtn = leadForm.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      leadMsg.textContent = "Sending…";
      leadMsg.style.color = "var(--text-muted)";

      try {
        var res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("request failed");
        leadMsg.textContent = "Got it — we'll reach out shortly.";
        leadMsg.style.color = "var(--steel-deep)";
        leadForm.reset();
      } catch (err) {
        // Demo fallback: no backend reachable (e.g. previewing this file directly).
        leadMsg.textContent = "Demo mode: this wasn't actually sent. Connect the backend to start receiving real callback requests.";
        leadMsg.style.color = "var(--ember)";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
