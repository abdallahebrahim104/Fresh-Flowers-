/* Fresh Flowers: vanilla JavaScript, no dependencies. */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Data: add a product by adding one object here ---------- */
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "bouquets", label: "Signature Bouquets", icon: "💐" },
  { id: "roses", label: "Premium Roses", icon: "🌹" },
  { id: "plants", label: "Green Plants", icon: "🪴" },
  { id: "gifts", label: "Floral Gifts", icon: "🎁" }
];
const PRODUCTS = [
  { id: "rose-bouquet", name: "Romantic Rose Bouquet", price: 39.99, img: "RomanticRoseBouquet.png", cats: ["bouquets", "roses"], desc: "A hand-tied bouquet of fresh roses, made for love and celebrations." },
  { id: "pink-blossom", name: "Pink Blossom Bouquet", price: 34.99, img: "PinkBlossomBouquet.png", cats: ["bouquets", "gifts"], desc: "Soft pink blooms arranged into a light, cheerful bouquet." },
  { id: "white-roses", name: "Luxury White Roses", price: 49.99, img: "LuxuryWhiteRoses.png", cats: ["roses", "gifts"], desc: "Premium white roses with a clean, elegant finish." },
  { id: "orchid", name: "Elegant Orchid Arrangement", price: 54.99, img: "ElegantOrchidArrangement.png", cats: ["plants", "gifts"], desc: "A graceful orchid arrangement that lasts and brightens any room." }
];

/* ---------- State ---------- */
const state = { filter: "all", query: "", cart: {} };
const money = (n) => `$${n.toFixed(2)}`;
const labelOf = (id) => CATEGORIES.find((c) => c.id === id).label;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
};

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- Theme (persistent) ---------- */
function initTheme() {
  const root = document.documentElement, btn = $("#themeToggle");
  const apply = (t) => {
    root.dataset.theme = t;
    btn.innerHTML = `<i class="fa-solid ${t === "dark" ? "fa-sun" : "fa-moon"}" aria-hidden="true"></i>`;
    btn.setAttribute("aria-label", `Switch to ${t === "dark" ? "light" : "dark"} theme`);
  };
  apply(root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    apply(next); store.set("ff-theme", next);
  });
}

/* ---------- Loader, header, menu, active link ---------- */
function initLoader() {
  const hide = () => $("#loader").classList.add("hide");
  const wait = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 900));
  const loaded = new Promise((r) => document.readyState === "complete" ? r() : addEventListener("load", r, { once: true }));
  Promise.all([wait, loaded]).then(hide);
  setTimeout(hide, 4000); // safety net
}
function initHeader() {
  const header = $("#siteHeader");
  const update = () => header.classList.toggle("scrolled", scrollY > 50);
  update(); addEventListener("scroll", update, { passive: true });

  const btn = $("#menuBtn"), links = $("#navLinks");
  const setOpen = (open) => {
    links.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    btn.innerHTML = `<i class="fa-solid ${open ? "fa-xmark" : "fa-bars"}" aria-hidden="true"></i>`;
  };
  btn.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  // Highlight the link of the section currently in view
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) $$("a", links).forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id], footer[id]").forEach((s) => io.observe(s));
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const items = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("in"));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Cart (persistent count) ---------- */
function cartTotals() {
  let n = 0, sum = 0;
  for (const [id, q] of Object.entries(state.cart)) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (p) { n += q; sum += q * p.price; }
  }
  return { n, sum };
}
function renderCart(bump) {
  const { n } = cartTotals(), badge = $("#cartCount");
  badge.textContent = n; $("#cartBtn").setAttribute("aria-label", `Cart, ${n} item${n === 1 ? "" : "s"}`);
  if (bump) { badge.classList.add("bump"); setTimeout(() => badge.classList.remove("bump"), 250); }
}
function addToCart(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  state.cart[id] = (state.cart[id] || 0) + 1;
  store.set("ff-cart", JSON.stringify(state.cart));
  renderCart(true); toast(`${p.name} added to cart`);
}
function initCart() {
  try { state.cart = JSON.parse(store.get("ff-cart")) || {}; } catch { state.cart = {}; }
  renderCart();
  $("#cartBtn").addEventListener("click", () => {
    const { n, sum } = cartTotals();
    toast(n ? `${n} item${n === 1 ? "" : "s"} in your cart, total ${money(sum)}` : "Your cart is empty");
  });
}

/* ---------- Shop: categories, filter chips, search, grid ---------- */
function setFilter(id) { state.filter = id; renderShop(); }

function renderShop() {
  const q = state.query.trim().toLowerCase();
  const list = PRODUCTS.filter((p) =>
    (state.filter === "all" || p.cats.includes(state.filter)) && (!q || p.name.toLowerCase().includes(q)));

  $$(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === state.filter)));
  $("#count").textContent = `Showing ${list.length} of ${PRODUCTS.length} flowers` + (state.filter !== "all" ? ` in ${labelOf(state.filter)}` : "");
  $("#grid").innerHTML = list.length ? list.map((p, i) => `
    <article class="card" style="--i:${i}">
      <button class="card-media" type="button" data-open="${p.id}" aria-label="Quick view: ${esc(p.name)}">
        <img src="${p.img}" alt="${esc(p.name)}" width="400" height="400" loading="lazy">
      </button>
      <h3>${esc(p.name)}</h3>
      <p class="price">${money(p.price)}</p>
      <div class="card-actions">
        <button class="btn btn-sm btn-ghost" type="button" data-open="${p.id}">Details</button>
        <button class="btn btn-sm" type="button" data-add="${p.id}">Buy</button>
      </div>
    </article>`).join("") : `<p class="empty">No flowers match your search. Try another word or category.</p>`;
}

function initShop() {
  $("#catGrid").innerHTML = CATEGORIES.slice(1).map((c) =>
    `<button class="cat reveal" type="button" data-pick="${c.id}"><span aria-hidden="true">${c.icon}</span>${c.label}</button>`).join("");
  $("#chips").innerHTML = CATEGORIES.map((c) =>
    `<button class="chip" type="button" data-filter="${c.id}" aria-pressed="false">${c.label}</button>`).join("");

  $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-filter]"); if (b) setFilter(b.dataset.filter); });
  $("#catGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]"); if (!b) return;
    state.query = ""; $("#search").value = ""; setFilter(b.dataset.pick);
    $("#featured").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderShop(); });
  $("#grid").addEventListener("click", (e) => {
    const open = e.target.closest("[data-open]"), add = e.target.closest("[data-add]");
    if (open) openModal(open.dataset.open); else if (add) addToCart(add.dataset.add);
  });
  renderShop();
}

/* ---------- Product modal (native <dialog>: focus trap + Esc built in) ---------- */
function openModal(id) {
  const p = PRODUCTS.find((x) => x.id === id), m = $("#modal");
  $("#mImg").src = p.img; $("#mImg").alt = p.name;
  $("#mTitle").textContent = p.name; $("#mPrice").textContent = money(p.price); $("#mDesc").textContent = p.desc;
  $("#mTags").innerHTML = p.cats.map((c) => `<span>${esc(labelOf(c))}</span>`).join("");
  $("#mAdd").onclick = () => { addToCart(p.id); m.close(); };
  m.showModal();
}
function initModal() {
  const m = $("#modal");
  $("#mClose").addEventListener("click", () => m.close());
  m.addEventListener("click", (e) => { if (e.target === m) m.close(); }); // click on backdrop
}

/* ---------- Boot: each part is isolated so one error never breaks the page ---------- */
function safe(fn) {
  try { fn(); } catch (err) { console.error(`${fn.name} failed:`, err); document.documentElement.classList.remove("js"); }
}
document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();
  [initTheme, initLoader, initHeader, initCart, initShop, initModal, initReveal].forEach(safe);
});