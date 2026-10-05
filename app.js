const STORE_KEY = "aureum-state-v1";

function money(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);
  const bids = {};
  window.AUREUM_LOTS.forEach((lot) => {
    const seed = lot.startPrice + Math.round(Math.random() * 6) * lot.increment;
    bids[lot.id] = {
      current: seed,
      history: [
        { user: "Collector_17", amount: seed - lot.increment, t: Date.now() - 3600_000 },
        { user: "MaisonNord", amount: seed, t: Date.now() - 900_000 }
      ],
      endsAt: Date.now() + lot.endsInHours * 3600_000,
      watch: false
    };
  });
  const state = { user: null, bids };
  saveState(state);
  return state;
}

function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

const state = loadState();

function currentUser() {
  return state.user;
}

function setUser(name) {
  state.user = name;
  saveState(state);
  renderHeader();
}

function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function pageName() {
  const file = location.pathname.split("/").pop() || "index.html";
  return file || "index.html";
}

function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const file = pageName();
  const user = currentUser();
  header.innerHTML = `
    <div class="topbar">
      <div class="container topbar-inner">
        <a class="logo" href="index.html">AURE<span>UM</span></a>
        <nav class="nav" id="nav">
          <a class="${file.includes("index") || file === "" ? "active" : ""}" href="index.html">Главная</a>
          <a class="${file.includes("catalog") ? "active" : ""}" href="catalog.html">Каталог</a>
          <a class="${file.includes("how") ? "active" : ""}" href="how.html">Как это работает</a>
          <a class="${file.includes("sell") ? "active" : ""}" href="sell.html">Продать лот</a>
          <a class="${file.includes("profile") ? "active" : ""}" href="profile.html">Кабинет</a>
        </nav>
        <div class="nav-cta">
          <button class="btn btn-ghost" id="auth-btn">${user ? user : "Войти"}</button>
          <a class="btn btn-gold" href="catalog.html">К торгам</a>
          <button class="menu-btn" id="menu-btn" aria-label="Меню">☰</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("menu-btn").onclick = () => {
    document.getElementById("nav").classList.toggle("open");
  };
  document.getElementById("auth-btn").onclick = () => {
    if (user) {
      location.href = "profile.html";
    } else {
      openAuth();
    }
  };
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <footer>
      <div class="container foot">
        <div>
          <div class="logo">AURE<span>UM</span></div>
          <p>Онлайн-аукцион частных коллекций. Искусство, часы, авто, вино.</p>
        </div>
        <div>
          <div>Поддержка: hello@aureum.auction</div>
          <div>Торги 24/7 · Эскроу · Экспертиза лотов</div>
        </div>
      </div>
    </footer>
    <div class="toast" id="toast"></div>
    <div class="modal-bg" id="auth-modal">
      <div class="modal">
        <h3>Войти в зал</h3>
        <p class="muted">Демо-кабинет. Имя сохранится в браузере.</p>
        <div class="field" style="margin-top:16px">
          <label>Имя или псевдоним</label>
          <input id="auth-name" placeholder="Например, Atlas" maxlength="24">
        </div>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-gold" id="auth-ok">Продолжить</button>
          <button class="btn btn-ghost" id="auth-cancel">Отмена</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("auth-ok").onclick = () => {
    const name = document.getElementById("auth-name").value.trim();
    if (name.length < 2) return toast("Введите имя");
    setUser(name);
    closeAuth();
    toast("Добро пожаловать, " + name);
  };
  document.getElementById("auth-cancel").onclick = closeAuth;
}

function openAuth() {
  document.getElementById("auth-modal").classList.add("open");
}
function closeAuth() {
  document.getElementById("auth-modal").classList.remove("open");
}

function remain(endsAt) {
  const d = Math.max(0, endsAt - Date.now());
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function lotCard(lot) {
  const b = state.bids[lot.id];
  return `
    <article class="lot-card">
      <a href="lot.html?id=${lot.id}"><img src="${lot.image}" alt="${lot.title}"></a>
      <div class="lot-body">
        <div class="lot-cat">${lot.category}</div>
        <h3><a href="lot.html?id=${lot.id}">${lot.title}</a></h3>
        <div class="price-row">
          <span>Текущая ставка<br><b>${money(b.current)}</b></span>
          <span>До закрытия<br><b class="js-timer" data-end="${b.endsAt}">${remain(b.endsAt)}</b></span>
        </div>
      </div>
    </article>
  `;
}

function tickTimers() {
  document.querySelectorAll(".js-timer").forEach((el) => {
    el.textContent = remain(Number(el.dataset.end));
  });
}

function requireUser() {
  if (!currentUser()) {
    openAuth();
    return false;
  }
  return true;
}

function placeBid(lotId, amount) {
  const lot = window.AUREUM_LOTS.find((l) => l.id === lotId);
  const rec = state.bids[lotId];
  if (!lot || !rec) return { ok: false, msg: "Лот не найден" };
  if (Date.now() > rec.endsAt) return { ok: false, msg: "Торги закрыты" };
  if (!currentUser()) return { ok: false, msg: "Войдите, чтобы ставить" };
  const min = rec.current + lot.increment;
  if (amount < min) return { ok: false, msg: "Минимум " + money(min) };
  rec.current = amount;
  rec.history.unshift({ user: currentUser(), amount, t: Date.now() });
  if (rec.endsAt - Date.now() < 120000) rec.endsAt += 120000;
  saveState(state);
  return { ok: true, msg: "Ставка принята" };
}

function toggleWatch(lotId) {
  if (!requireUser()) return;
  state.bids[lotId].watch = !state.bids[lotId].watch;
  saveState(state);
}

function simulateMarket() {
  const live = window.AUREUM_LOTS.filter((l) => state.bids[l.id].endsAt > Date.now());
  if (!live.length) return;
  const lot = live[Math.floor(Math.random() * live.length)];
  const rec = state.bids[lot.id];
  const bots = ["NordLot", "Atelier88", "SilkRoad", "VaultOne", "HermitageBid"];
  const user = bots[Math.floor(Math.random() * bots.length)];
  if (user === currentUser()) return;
  rec.current += lot.increment;
  rec.history.unshift({ user, amount: rec.current, t: Date.now() });
  saveState(state);
  document.dispatchEvent(new CustomEvent("market", { detail: lot.id }));
}

setInterval(tickTimers, 1000);
setInterval(simulateMarket, 14000);

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
});
