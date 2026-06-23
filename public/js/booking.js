// public/js/booking.js
(function () {
  "use strict";

  /* ---------------- Fallback / demo data ----------------
     Mirrors server/seed.js. Used only if the API isn't reachable, so this
     page still demos the full booking flow when opened as a static file
     or previewed without the backend running. Real deployments with the
     Express server running will always use the live API instead. */

  var FALLBACK_SERVICES = [
    { id: 1, name: "Haircut", duration_minutes: 30, price_cents: 2500, is_featured: 1 },
    { id: 2, name: "Fade Cut", duration_minutes: 40, price_cents: 3000, is_featured: 1 },
    { id: 3, name: "Buzz Cut", duration_minutes: 20, price_cents: 2000, is_featured: 0 },
    { id: 5, name: "Hair Shape Up", duration_minutes: 15, price_cents: 1500, is_featured: 1 },
    { id: 10, name: "Kids' Cut", duration_minutes: 25, price_cents: 2000, is_featured: 1 },
    { id: 11, name: "Beard Trim", duration_minutes: 15, price_cents: 1500, is_featured: 1 },
    { id: 14, name: "Hot Towel Shave", duration_minutes: 35, price_cents: 3000, is_featured: 1 },
  ];
  var FALLBACK_BARBERS = [
    { id: 1, name: "Jose" },
    { id: 2, name: "Imad" },
  ];
  // 0 = Sunday ... 6 = Saturday
  var FALLBACK_HOURS = {
    0: ["08:30", "14:00"],
    1: ["08:30", "20:00"],
    2: ["08:30", "20:00"],
    3: ["08:30", "20:00"],
    4: ["08:30", "20:00"],
    5: ["08:30", "20:00"],
    6: ["08:30", "18:00"],
  };

  function toMinutes(hhmm) {
    var p = hhmm.split(":").map(Number);
    return p[0] * 60 + p[1];
  }
  function toHHMM(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  function fmtTime12(hhmm) {
    var p = hhmm.split(":").map(Number);
    var h = p[0], m = p[1];
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
  }
  function fmtMoney(cents) {
    return "$" + (cents / 100).toFixed(0);
  }
  function todayStr() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function fmtDateLong(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  function demoSlotsFor(dateStr, durationMinutes) {
    var dow = new Date(dateStr + "T00:00:00").getDay();
    var range = FALLBACK_HOURS[dow];
    if (!range) return [];
    var open = toMinutes(range[0]), close = toMinutes(range[1]);
    var slots = [];
    var nowMinutes = -1;
    if (dateStr === todayStr()) {
      var now = new Date();
      nowMinutes = now.getHours() * 60 + now.getMinutes();
    }
    for (var t = open; t + durationMinutes <= close; t += 15) {
      if (t > nowMinutes) slots.push(toHHMM(t));
    }
    return slots;
  }

  var state = {
    step: 1,
    services: [],
    barbers: [],
    isDemo: false,
    selectedService: null,
    selectedBarber: undefined, // undefined = not chosen yet, null = "no preference"
    date: todayStr(),
    time: null,
    confirmation: null,
  };

  var bodyEl = document.getElementById("stepContent");
  var footEl = document.getElementById("bookerFoot");
  var stepsEl = document.getElementById("bookerSteps");
  var demoBanner = document.getElementById("demoBanner");

  function setDemo(on) {
    state.isDemo = state.isDemo || on;
    if (state.isDemo && demoBanner) demoBanner.classList.add("is-visible");
  }

  async function loadData() {
    try {
      var sRes = await fetch("/api/services");
      var bRes = await fetch("/api/barbers");
      if (!sRes.ok || !bRes.ok) throw new Error("bad response");
      state.services = await sRes.json();
      state.barbers = await bRes.json();
    } catch (err) {
      setDemo(true);
      state.services = FALLBACK_SERVICES;
      state.barbers = FALLBACK_BARBERS;
    }
    renderStep();
  }

  async function loadSlots() {
    var service = state.selectedService;
    if (!service) return [];
    var params = new URLSearchParams({ date: state.date, serviceId: service.id });
    if (state.selectedBarber) params.set("barberId", state.selectedBarber.id);

    try {
      var res = await fetch("/api/availability?" + params.toString());
      if (!res.ok) throw new Error("bad response");
      var data = await res.json();
      return data.slots || [];
    } catch (err) {
      setDemo(true);
      return demoSlotsFor(state.date, service.duration_minutes);
    }
  }

  function updateStepsUI() {
    var items = stepsEl.querySelectorAll("li");
    items.forEach(function (li) {
      var n = Number(li.getAttribute("data-step"));
      li.classList.remove("is-active", "is-done");
      if (n === state.step) li.classList.add("is-active");
      else if (n < state.step) li.classList.add("is-done");
    });
  }

  function setFooter(buttons) {
    footEl.innerHTML = "";
    buttons.forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "btn " + (b.primary ? "btn-primary" : "btn-ghost");
      btn.textContent = b.label;
      btn.disabled = !!b.disabled;
      btn.addEventListener("click", b.onClick);
      footEl.appendChild(btn);
    });
  }

  function renderStep() {
    updateStepsUI();
    if (state.step === 1) renderStep1();
    else if (state.step === 2) renderStep2();
    else if (state.step === 3) renderStep3();
    else if (state.step === 4) renderConfirm();
  }

  function renderStep1() {
    var html = '<div class="service-grid">';
    state.services.forEach(function (s) {
      var selected = state.selectedService && state.selectedService.id === s.id;
      html +=
        '<button type="button" class="pick-card' + (selected ? " is-selected" : "") + '" data-id="' + s.id + '">' +
        '<span class="name">' + s.name + (s.is_featured ? " ★" : "") + "</span>" +
        '<span class="meta">' + s.duration_minutes + " min · " + fmtMoney(s.price_cents) + "</span>" +
        "</button>";
    });
    html += "</div>";
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll(".pick-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = Number(card.getAttribute("data-id"));
        state.selectedService = state.services.find(function (s) { return s.id === id; });
        renderStep1();
        updateFooter();
      });
    });
    updateFooter();
  }

  function renderStep2() {
    var html = "";
    html += '<div class="barber-grid" style="margin-bottom:16px;">';
    html +=
      '<button type="button" class="pick-card no-preference' +
      (state.selectedBarber === null ? " is-selected" : "") +
      '" data-id="any"><span class="name">No preference</span><span class="meta">First available</span></button>';
    state.barbers.forEach(function (b) {
      var selected = state.selectedBarber && state.selectedBarber.id === b.id;
      html +=
        '<button type="button" class="pick-card' + (selected ? " is-selected" : "") + '" data-id="' + b.id + '">' +
        '<span class="name">' + b.name + "</span><span class=\"meta\">Barber</span></button>";
    });
    html += "</div>";

    html += '<div class="field-row"><label for="dateInput">Date</label>';
    html += '<input type="date" id="dateInput" min="' + todayStr() + '" value="' + state.date + '" /></div>';

    html += '<div id="slotWrap"><div class="slot-grid"><div class="slot-empty">Loading times…</div></div></div>';

    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll(".barber-grid .pick-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-id");
        state.selectedBarber = id === "any" ? null : state.barbers.find(function (b) { return String(b.id) === id; });
        state.time = null;
        renderStep2();
      });
    });

    var dateInput = document.getElementById("dateInput");
    dateInput.addEventListener("change", function () {
      state.date = dateInput.value;
      state.time = null;
      refreshSlots();
    });

    refreshSlots();
    updateFooter();
  }

  async function refreshSlots() {
    var wrap = document.getElementById("slotWrap");
    if (!wrap) return;
    wrap.innerHTML = '<div class="slot-grid"><div class="slot-empty">Loading times…</div></div>';
    var slots = await loadSlots();

    if (!slots.length) {
      wrap.innerHTML = '<div class="slot-grid"><div class="slot-empty">No openings that day — try another date.</div></div>';
      updateFooter();
      return;
    }
    var html = '<div class="slot-grid">';
    slots.forEach(function (t) {
      var selected = state.time === t;
      html += '<button type="button" class="slot-btn' + (selected ? " is-selected" : "") + '" data-time="' + t + '">' + fmtTime12(t) + "</button>";
    });
    html += "</div>";
    wrap.innerHTML = html;

    wrap.querySelectorAll(".slot-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.time = btn.getAttribute("data-time");
        refreshSlots();
        updateFooter();
      });
    });
    updateFooter();
  }

  function renderStep3() {
    var summary =
      state.selectedService.name +
      " · " +
      (state.selectedBarber ? state.selectedBarber.name : "first available") +
      " · " +
      fmtDateLong(state.date) +
      " at " +
      fmtTime12(state.time);

    bodyEl.innerHTML =
      '<p class="field-hint" style="margin-bottom:16px;font-size:13.5px;">' + summary + "</p>" +
      '<div class="field-row"><label for="custName">Full name</label><input type="text" id="custName" required /></div>' +
      '<div class="field-row"><label for="custPhone">Phone number</label><input type="tel" id="custPhone" required placeholder="(555) 555-5555" /></div>' +
      '<div class="field-row"><label for="custEmail">Email (optional, for a confirmation)</label><input type="email" id="custEmail" /></div>' +
      '<div class="field-row"><label for="custNotes">Anything your barber should know? (optional)</label><textarea id="custNotes" rows="2"></textarea></div>' +
      '<input type="text" id="hp" class="visually-hidden" tabindex="-1" autocomplete="off" />' +
      '<p class="field-hint" id="formError" style="color:var(--ember);"></p>';

    updateFooter();
  }

  function renderConfirm() {
    var c = state.confirmation;
    bodyEl.innerHTML =
      '<div class="confirm-screen">' +
      "<p>You're booked.</p>" +
      '<div class="confirm-code">' + c.confirmation_code + "</div>" +
      "<p>" + c.service + " with " + c.barber + "<br/>" + fmtDateLong(c.date) + " at " + fmtTime12(c.time) + "</p>" +
      (c.demo
        ? '<p class="field-hint" style="color:var(--ember);max-width:360px;margin:10px auto 0;">Demo mode — this booking was not actually saved. Connect the live backend to start taking real appointments.</p>'
        : '<p class="field-hint">Save your confirmation code — call (848) 235-5919 if you need to reschedule.</p>' +
          '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + c.addToCalendarUrl + '" style="margin-top:14px;">Add to calendar</a>') +
      "</div>";
    setFooter([
      {
        label: "Book another",
        onClick: function () {
          state.step = 1;
          state.selectedService = null;
          state.selectedBarber = undefined;
          state.time = null;
          state.confirmation = null;
          renderStep();
        },
      },
    ]);
  }

  function updateFooter() {
    if (state.step === 1) {
      setFooter([{ label: "Continue", primary: true, disabled: !state.selectedService, onClick: function () { state.step = 2; renderStep(); } }]);
    } else if (state.step === 2) {
      setFooter([
        { label: "Back", onClick: function () { state.step = 1; renderStep(); } },
        { label: "Continue", primary: true, disabled: !state.time, onClick: function () { state.step = 3; renderStep(); } },
      ]);
    } else if (state.step === 3) {
      setFooter([
        { label: "Back", onClick: function () { state.step = 2; renderStep(); } },
        { label: "Confirm booking", primary: true, onClick: submitBooking },
      ]);
    }
  }

  async function submitBooking() {
    var name = document.getElementById("custName").value.trim();
    var phone = document.getElementById("custPhone").value.trim();
    var email = document.getElementById("custEmail").value.trim();
    var notes = document.getElementById("custNotes").value.trim();
    var errEl = document.getElementById("formError");

    if (!name) { errEl.textContent = "Please enter your name."; return; }
    if (phone.replace(/\D/g, "").length < 7) { errEl.textContent = "Please enter a valid phone number."; return; }
    errEl.textContent = "";

    var payload = {
      customer_name: name,
      customer_phone: phone,
      customer_email: email || undefined,
      service_id: state.selectedService.id,
      barber_id: state.selectedBarber ? state.selectedBarber.id : undefined,
      date: state.date,
      time: state.time,
      notes: notes || undefined,
      honeypot: document.getElementById("hp").value,
    };

    var confirmBtn = footEl.querySelectorAll("button")[1];
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Booking…";
    }

    try {
      var res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || "Something went wrong. Please call the shop.";
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Confirm booking";
        }
        return;
      }
      state.confirmation = Object.assign({}, data.booking, { addToCalendarUrl: data.addToCalendarUrl, demo: false });
      state.step = 4;
      renderStep();
    } catch (err) {
      // Demo fallback — no backend reachable.
      setDemo(true);
      state.confirmation = {
        confirmation_code: Math.random().toString(16).slice(2, 8).toUpperCase(),
        date: state.date,
        time: state.time,
        service: state.selectedService.name,
        barber: state.selectedBarber ? state.selectedBarber.name : "First available",
        demo: true,
      };
      state.step = 4;
      renderStep();
    }
  }

  loadData();
})();
