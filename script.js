(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } }
  };

  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("role", "status");
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------- favourites (hearts, saved in the browser) ---------- */
  const favs = new Set(store.get("traveloop:favs", []));
  $$(".heart i").forEach(icon => {
    const name = icon.closest(".card-content").querySelector("h3").textContent.trim();
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("aria-label", "Save " + name);

    const paint = on => {
      icon.classList.toggle("active", on);
      icon.classList.toggle("fa-solid", on);
      icon.classList.toggle("fa-regular", !on);
      icon.setAttribute("aria-pressed", String(on));
    };
    paint(favs.has(name));

    const toggle = e => {
      e.preventDefault();
      e.stopPropagation();
      const on = !favs.has(name);
      on ? favs.add(name) : favs.delete(name);
      store.set("traveloop:favs", [...favs]);
      paint(on);
      toast(on ? name + " saved to favourites" : name + " removed from favourites");
    };
    icon.addEventListener("click", toggle);
    icon.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") toggle(e); });
  });

  /* ---------- search form ---------- */
  const form = $("form");
  const dest = $("#destination"), cin = $("#checkin"), cout = $("#checkout"), guests = $("#guests");

  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = new Date();
  cin.min = iso(today);
  cout.min = iso(new Date(today.getTime() + 864e5));

  cin.addEventListener("change", () => {
    if (!cin.value) return;
    const next = new Date(cin.value);
    next.setDate(next.getDate() + 1);
    cout.min = iso(next);
    if (!cout.value || cout.value <= cin.value) cout.value = iso(next);
  });

  [dest, cin, cout, guests].forEach(el => el.addEventListener("blur", () => el.classList.add("touched")));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const place = dest.value.trim();
    if (!place) { toast("Enter a destination"); dest.focus(); return; }
    if (cout.value <= cin.value) { toast("Check-out must be after check-in"); cout.focus(); return; }
    const n = Math.min(20, Math.max(1, parseInt(guests.value, 10) || 1));
    guests.value = n;
    const q = `hotels in ${place} ${cin.value} to ${cout.value} for ${n} guest${n > 1 ? "s" : ""}`;
    window.open("https://www.google.com/search?q=" + encodeURIComponent(q), "_blank", "noopener");
  });

  /* ---------- currency switcher (approximate demo rates) ---------- */
  const currencies = {
    INR: { sym: "₹", rate: 1, locale: "en-IN", icon: "fa-indian-rupee-sign" },
    USD: { sym: "$", rate: 0.012, locale: "en-US", icon: "fa-dollar-sign" },
    EUR: { sym: "€", rate: 0.0105, locale: "de-DE", icon: "fa-euro-sign" },
    GBP: { sym: "£", rate: 0.009, locale: "en-GB", icon: "fa-sterling-sign" }
  };

  const priceNodes = [];
  $$(".price, .price2 > div:last-child").forEach(el => {
    const node = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.nodeValue.includes("₹"));
    if (!node) return;
    const inr = parseInt(node.nodeValue.replace(/[^\d]/g, ""), 10);
    if (!isNaN(inr)) priceNodes.push({ node, inr });
  });

  function applyCurrency(code) {
    const c = currencies[code];
    priceNodes.forEach(({ node, inr }) => {
      const v = Math.round(inr * c.rate);
      node.nodeValue = c.sym + v.toLocaleString(c.locale) + " ";
    });
    const btn = items.currency;
    btn.innerHTML = `<i class="fa-solid ${c.icon}"></i>  ${code}`;
    store.set("traveloop:currency", code);
  }

  /* ---------- header: dropdowns, menu, sign-in ---------- */
  const nav = $(".option");
  const [lang, currency, menu, signin] = $$(".option-item", nav);
  const items = { lang, currency, menu, signin };
  $$(".option-item", nav).forEach(el => {
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
  });

  function makeDropdown(anchor) {
    const dd = document.createElement("div");
    dd.className = "dropdown";
    nav.appendChild(dd);
    anchor._dd = dd;
    return dd;
  }
  function closeDropdowns() { $$(".dropdown", nav).forEach(d => d.classList.remove("open")); }
  function openDropdown(anchor) {
    const wasOpen = anchor._dd.classList.contains("open");
    closeDropdowns();
    if (wasOpen) return;
    const dd = anchor._dd;
    dd.style.left = anchor.offsetLeft + "px";
    dd.style.right = "auto";
    dd.classList.add("open");
    // keep inside the viewport
    const r = dd.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) dd.style.left = Math.max(0, anchor.offsetLeft - (r.right - window.innerWidth + 8)) + "px";
  }
  document.addEventListener("click", e => { if (!e.target.closest(".option")) closeDropdowns(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDropdowns(); closeModal(); } });

  // currency
  const cdd = makeDropdown(currency);
  Object.keys(currencies).forEach(code => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${currencies[code].sym}  ${code}`;
    b.addEventListener("click", () => {
      applyCurrency(code);
      $$("button", cdd).forEach(x => x.classList.toggle("current", x === b));
      closeDropdowns();
      if (code !== "INR") toast("Prices shown are approximate");
    });
    cdd.appendChild(b);
  });
  currency.addEventListener("click", () => openDropdown(currency));

  // language (English only for now)
  const ldd = makeDropdown(lang);
  const en = document.createElement("button");
  en.type = "button"; en.className = "current"; en.textContent = "English";
  const soon = document.createElement("button");
  soon.type = "button"; soon.textContent = "हिन्दी (coming soon)";
  soon.addEventListener("click", () => { closeDropdowns(); toast("More languages are coming soon"); });
  en.addEventListener("click", closeDropdowns);
  ldd.append(en, soon);
  lang.addEventListener("click", () => openDropdown(lang));

  // menu (jump links)
  const mdd = makeDropdown(menu);
  const popularHeading = $$("#h2").find(h => /popular/i.test(h.textContent));
  [
    ["Search hotels", $("#content")],
    ["Hot deals", $("#deals")],
    ["Popular searches", popularHeading],
    ["Why Traveloop", $("#benefits")],
    ["Contact", $("#contact")]
  ].forEach(([label, target]) => {
    if (!target) return;
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = label;
    a.addEventListener("click", e => {
      e.preventDefault();
      closeDropdowns();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    mdd.appendChild(a);
  });
  menu.addEventListener("click", () => openDropdown(menu));

  /* ---------- sign-in modal (demo only, no real account) ---------- */
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="si-title" novalidate>
      <button type="button" class="modal-close" aria-label="Close">✕</button>
      <h3 id="si-title">Sign in</h3>
      <p>Save favourites and pick up where you left off.</p>
      <label for="si-email">Email</label>
      <input id="si-email" type="email" placeholder="you@example.com" autocomplete="email">
      <label for="si-pass">Password</label>
      <input id="si-pass" type="password" placeholder="At least 6 characters" autocomplete="current-password">
      <button type="submit" id="btn" class="submit">Sign in</button>
      <small>Demo only: nothing is sent or stored on a server.</small>
    </form>`;
  document.body.appendChild(backdrop);
  const modalForm = $("form", backdrop);
  const email = $("#si-email", backdrop), pass = $("#si-pass", backdrop);

  function openModal() { backdrop.classList.add("open"); email.focus(); }
  function closeModal() { backdrop.classList.remove("open"); }
  backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
  $(".modal-close", backdrop).addEventListener("click", closeModal);

  function setSignedIn(name) {
    signin.innerHTML = name
      ? `<i class="fa-solid fa-circle-user"></i>  ${name}`
      : `<i class="fa-solid fa-circle-user"></i>  Sign In`;
  }
  const savedUser = store.get("traveloop:user", "");
  setSignedIn(savedUser);

  signin.addEventListener("click", () => {
    if (store.get("traveloop:user", "")) {
      if (confirm("Sign out?")) { store.set("traveloop:user", ""); setSignedIn(""); toast("Signed out"); }
    } else openModal();
  });

  modalForm.addEventListener("submit", e => {
    e.preventDefault();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    if (!okEmail) { toast("Enter a valid email address"); email.focus(); return; }
    if (pass.value.length < 6) { toast("Password needs at least 6 characters"); pass.focus(); return; }
    const name = email.value.trim().split("@")[0];
    store.set("traveloop:user", name);
    setSignedIn(name);
    modalForm.reset();
    closeModal();
    toast("Welcome, " + name);
  });

  /* ---------- restore currency ---------- */
  const savedCur = store.get("traveloop:currency", "INR");
  if (currencies[savedCur] && savedCur !== "INR") applyCurrency(savedCur);
  $$("button", cdd).forEach(b => b.classList.toggle("current", b.textContent.includes(savedCur)));
})();