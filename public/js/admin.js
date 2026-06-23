// public/js/admin.js
(function () {
  "use strict";

  var token = null; // kept in memory only — re-login after a page refresh.
  var activeTab = "bookings";

  var loginView = document.getElementById("loginView");
  var dashView = document.getElementById("dashView");
  var loginError = document.getElementById("loginError");

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("loginPass").addEventListener("keydown", function (e) {
    if (e.key === "Enter") login();
  });
  document.getElementById("logoutBtn").addEventListener("click", function () {
    token = null;
    dashView.style.display = "none";
    loginView.style.display = "block";
  });

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      activeTab = btn.getAttribute("data-tab");
      document.getElementById("bookingsPanel").style.display = activeTab === "bookings" ? "block" : "none";
      document.getElementById("leadsPanel").style.display = activeTab === "leads" ? "block" : "none";
      if (activeTab === "leads") loadLeads();
    });
  });

  document.getElementById("filterDate").addEventListener("change", loadBookings);
  document.getElementById("filterStatus").addEventListener("change", loadBookings);
  document.getElementById("clearFilters").addEventListener("click", function () {
    document.getElementById("filterDate").value = "";
    document.getElementById("filterStatus").value = "";
    loadBookings();
  });

  async function login() {
    var username = document.getElementById("loginUser").value.trim();
    var password = document.getElementById("loginPass").value;
    loginError.textContent = "";

    try {
      var res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password }),
      });
      var data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || "Login failed.";
        return;
      }
      token = data.token;
      loginView.style.display = "none";
      dashView.style.display = "block";
      loadOverview();
      loadBookings();
    } catch (err) {
      loginError.textContent = "Couldn't reach the server. Is the backend running?";
    }
  }

  function authHeaders() {
    return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  }

  async function loadOverview() {
    try {
      var res = await fetch("/api/admin/overview", { headers: authHeaders() });
      var data = await res.json();
      var grid = document.getElementById("statGrid");
      grid.innerHTML = [
        ["Today", data.todayCount],
        ["Upcoming", data.upcomingCount],
        ["New leads", data.newLeads],
        ["Last 7 days", data.last7DaysBookings],
      ]
        .map(function (s) {
          return '<div class="stat-card"><div class="n">' + s[1] + '</div><div class="l">' + s[0] + "</div></div>";
        })
        .join("");
    } catch (err) {
      /* non-fatal */
    }
  }

  async function loadBookings() {
    var date = document.getElementById("filterDate").value;
    var status = document.getElementById("filterStatus").value;
    var params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status) params.set("status", status);

    var tbody = document.getElementById("bookingsBody");
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading…</td></tr>';

    try {
      var res = await fetch("/api/admin/bookings?" + params.toString(), { headers: authHeaders() });
      var rows = await res.json();
      if (!rows.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No bookings match these filters.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(bookingRow).join("");
      tbody.querySelectorAll(".status-select").forEach(function (sel) {
        sel.addEventListener("change", function () {
          updateBookingStatus(sel.getAttribute("data-id"), sel.value);
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Couldn\'t load bookings.</td></tr>';
    }
  }

  function bookingRow(b) {
    var statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"];
    var options = statuses
      .map(function (s) {
        return '<option value="' + s + '"' + (s === b.status ? " selected" : "") + ">" + s.replace("_", " ") + "</option>";
      })
      .join("");
    return (
      "<tr>" +
      "<td>" + b.date + "</td>" +
      "<td>" + b.time + "</td>" +
      "<td>" + escapeHtml(b.customer_name) + "<br/><span style=\"color:var(--text-muted);font-size:12px;\">" + escapeHtml(b.customer_phone) + "</span></td>" +
      "<td>" + escapeHtml(b.service_name) + "</td>" +
      "<td>" + escapeHtml(b.barber_name || "Any") + "</td>" +
      '<td><select class="status-select" data-id="' + b.id + '">' + options + "</select></td>" +
      "</tr>"
    );
  }

  async function updateBookingStatus(id, status) {
    try {
      await fetch("/api/admin/bookings/" + id, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: status }),
      });
      loadOverview();
    } catch (err) {
      alert("Couldn't update status — try again.");
    }
  }

  async function loadLeads() {
    var tbody = document.getElementById("leadsBody");
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading…</td></tr>';
    try {
      var res = await fetch("/api/admin/leads", { headers: authHeaders() });
      var rows = await res.json();
      if (!rows.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No leads yet.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(leadRow).join("");
      tbody.querySelectorAll(".status-select").forEach(function (sel) {
        sel.addEventListener("change", function () {
          updateLeadStatus(sel.getAttribute("data-id"), sel.value);
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Couldn\'t load leads.</td></tr>';
    }
  }

  function leadRow(l) {
    var statuses = ["new", "contacted", "converted", "closed"];
    var options = statuses
      .map(function (s) {
        return '<option value="' + s + '"' + (s === l.status ? " selected" : "") + ">" + s + "</option>";
      })
      .join("");
    return (
      "<tr>" +
      "<td>" + l.created_at + "</td>" +
      "<td>" + escapeHtml(l.name) + "</td>" +
      "<td>" + escapeHtml(l.phone || "—") + "</td>" +
      "<td>" + escapeHtml(l.email || "—") + "</td>" +
      "<td>" + escapeHtml(l.message || "—") + "</td>" +
      '<td><select class="status-select" data-id="' + l.id + '">' + options + "</select></td>" +
      "</tr>"
    );
  }

  async function updateLeadStatus(id, status) {
    try {
      await fetch("/api/admin/leads/" + id, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: status }),
      });
    } catch (err) {
      alert("Couldn't update status — try again.");
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
