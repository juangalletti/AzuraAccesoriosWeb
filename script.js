// La configuración (WhatsApp, categorías, Supabase) está en config.js

const ICONS = {
  collares: '<path d="M4 3c0 8 4 12 8 12s8-4 8-12"/><path d="M12 15l-2.5 3 2.5 3.5 2.5-3.5z"/>',
  aretes: '<path d="M8 3v5"/><circle cx="8" cy="12" r="4"/><path d="M17 3v8"/><path d="M17 11l-2 3 2 4 2-4z"/>',
  anillos: '<circle cx="12" cy="15" r="6"/><path d="M9.5 6.5L12 3l2.5 3.5L12 9z"/>',
  pulseras: '<ellipse cx="12" cy="12" rx="9" ry="5"/><ellipse cx="12" cy="12" rx="6" ry="2.5"/><circle cx="12" cy="17" r="1"/>',
  joyeros: '<path d="M4 11h16v9H4z"/><path d="M5 11l1.5-5h11L19 11"/><path d="M10.5 14.5h3"/>',
  pelo: '<path d="M3 12c3-5 6-5 9 0s6 5 9 0"/><path d="M3 12c3 5 6 5 9 0s6-5 9 0"/>'
};

const TONES = [
  "linear-gradient(160deg,#f6e7df,#ead3c8)",
  "linear-gradient(160deg,#efe6dc,#e1d1bf)",
  "linear-gradient(160deg,#f4e4e6,#e6cdd2)",
  "linear-gradient(160deg,#ece8e1,#d9d0c3)"
];

// Catálogo de respaldo: se usa solo si Supabase no está configurado o no responde.
// Con Supabase activo, los productos se cargan desde el panel admin (admin.html).
const LOCAL_PRODUCTS = [
  {
    id: 1, name: "Collar Frutilla", cat: "collares", price: 12000, badge: "Nuevo",
    img: "img/collar-frutilla.jpg",
    desc: "Cadena fina de acero blanco con un dije de frutilla roja con relieve de cristalitos. Un toque de color, dulce y divertido, para el día a día."
  },
  {
    id: 2, name: "Collar Mariposa", cat: "collares", price: 12000,
    img: "img/collar-mariposa.jpg",
    desc: "Delicada cadena de acero blanco con dije de mariposa en tono nacarado y borde plateado. Romántico y luminoso, ideal para regalar."
  },
  {
    id: 3, name: "Collar Bolitas", cat: "collares", price: 9500,
    img: "img/collar-bolitas.jpg",
    desc: "Cadena fina de acero blanco con pequeñas esferas distribuidas a lo largo. Minimalista y versátil: perfecto solo o combinado con otros collares."
  },
  {
    id: 4, name: "Collar Hojas Brillantes", cat: "collares", price: 13500,
    img: "img/collar-hojas-brillantes.jpg",
    desc: "Cadena de acero blanco con dije de tres hojas cubiertas de pequeñas piedras brillantes. Elegante y sutil, ilumina cualquier look."
  },
  {
    id: 5, name: "Collar Enredadera", cat: "collares", price: 14000,
    img: "img/collar-enredadera.jpg",
    desc: "Cadena de acero blanco con hojitas caladas y esferas intercaladas, como una enredadera alrededor del cuello. Natural y femenino."
  },
  {
    id: 6, name: "Collar Océano", cat: "collares", price: 18000, badge: "Favorito",
    img: "img/collar-oceano.jpg",
    desc: "Cadena de acero blanco de eslabones rectangulares con dijes marinos: ancla, caracolas, estrella de mar rosa, delfín, tortuga, estrella con strass y perla. Para llevar el verano siempre encima."
  },
  {
    id: 7, name: "Collar Corazón", cat: "collares", price: 16500,
    img: "img/collar-corazon.jpg",
    desc: "Cadena de acero blanco de eslabones gruesos con un gran dije de corazón con textura en relieve. Una pieza protagonista con mucha personalidad."
  }
];

// ===== Utilidades =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const icon = cat => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[cat] ?? ICONS.collares}</svg>`;
const tone = id => TONES[id % TONES.length];
const catName = id => CATEGORIES.find(c => c.id === id)?.name ?? id;
const isOut = p => p.stock === "agotado";
const stockBadge = p =>
  isOut(p) ? `<span class="product__badge product__badge--out">Agotado</span>`
  : p.stock === "ultimas" ? `<span class="product__badge product__badge--stock">Últimas unidades</span>`
  : "";
const media = p => p.img
  ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
  : icon(p.cat);

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

let PRODUCTS = db ? [] : LOCAL_PRODUCTS;
let loading = !!db;
let cart = store.get("azura-cart", {});      // { productId: qty }
let favs = new Set(store.get("azura-favs", []));
let activeCat = "todos";

// ===== Categorías =====
function renderCategories() {
  $(".categories").innerHTML = CATEGORIES.map(c => {
    const count = PRODUCTS.filter(p => p.cat === c.id).length;
    const label = loading ? "&nbsp;" : count ? `${count} ${count === 1 ? "producto" : "productos"}` : "Próximamente";
    return `<button class="category" data-cat="${c.id}" ${count || loading ? "" : "disabled"}>
      <span class="category__icon">${icon(c.id)}</span>
      <strong>${c.name}</strong>
      <small>${label}</small>
    </button>`;
  }).join("");
}

// ===== Filtros y productos =====
function renderFilters() {
  const withProducts = CATEGORIES.filter(c => PRODUCTS.some(p => p.cat === c.id));
  const all = [{ id: "todos", name: "Todos" }, ...withProducts];
  $(".filters").innerHTML = all.map(c =>
    `<button class="chip" role="tab" data-cat="${c.id}" aria-selected="${c.id === activeCat}">${c.name}</button>`
  ).join("");
}

function setCategory(cat) {
  activeCat = cat;
  renderFilters();
  renderProducts();
}

function renderProducts() {
  const sort = $("#sort").value;
  let list = PRODUCTS.filter(p => activeCat === "todos" || p.cat === activeCat);
  if (sort === "precio-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "precio-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (sort === "nombre") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  list = [...list].sort((a, b) => isOut(a) - isOut(b));   // agotados al final

  if (loading) {
    $(".products").innerHTML = `<p class="empty">Cargando productos…</p>`;
    return;
  }
  if (!list.length) {
    $(".products").innerHTML = `<p class="empty">No hay productos en esta categoría por ahora.</p>`;
    return;
  }

  $(".products").innerHTML = list.map((p, i) => {
    const badge = stockBadge(p) || (p.oldPrice
      ? `<span class="product__badge product__badge--sale">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>`
      : p.badge ? `<span class="product__badge">${esc(p.badge)}</span>` : "");
    return `<article class="product${isOut(p) ? " product--out" : ""}" style="animation-delay:${i * 40}ms">
      <div class="product__media${p.img ? " product__media--photo" : ""}" data-open="${p.id}" style="background:${tone(p.id)}">
        ${badge}
        <button class="icon-btn product__fav" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="Agregar ${esc(p.name)} a favoritos">
          <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>
        </button>
        ${media(p)}
        <button class="btn btn--primary product__add" data-add="${p.id}" ${isOut(p) ? "disabled" : ""}>${isOut(p) ? "Agotado" : "Agregar al carrito"}</button>
      </div>
      <div class="product__info">
        <span class="product__cat">${catName(p.cat)} · Acero blanco</span>
        <h3 class="product__name"><a href="#producto-${p.id}">${esc(p.name)}</a></h3>
        <span class="product__code">Cód. ${productCode(p.cat, p.id)}</span>
        ${p.desc ? `<p class="product__desc">${esc(p.desc)}</p>` : ""}
        <div class="product__price"><strong>${money(p.price)}</strong>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
      </div>
    </article>`;
  }).join("");
}

// ===== Carrito =====
function addToCart(id) {
  const prod = PRODUCTS.find(p => p.id === id);
  if (!prod || isOut(prod)) return toast("Este producto está agotado");
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  const p = PRODUCTS.find(p => p.id === id);
  toast(`“${p.name}” agregado al carrito`);
  const badge = $(".cart-count");
  badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  saveCart();
}

function saveCart() {
  store.set("azura-cart", cart);
  renderCart();
}

function cartLines() {
  return Object.entries(cart)
    .map(([id, qty]) => ({ product: PRODUCTS.find(p => p.id === Number(id)), qty }))
    .filter(l => l.product && !isOut(l.product));
}

// ===== Promo por cantidad =====
const promoTier = count => PROMO.active ? PROMO.tiers.find(t => count >= t.min) : undefined;

function cartSummary() {
  const lines = cartLines();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  const pct = promoTier(count)?.pct ?? 0;
  const discount = Math.round(subtotal * pct / 100);
  return { lines, count, subtotal, pct, discount, total: subtotal - discount };
}

// Texto que invita a sumar productos para llegar al siguiente descuento
function promoHint(count) {
  if (!PROMO.active || !count) return "";
  const next = [...PROMO.tiers].reverse().find(t => count < t.min);
  if (!next) return "";
  const n = next.min - count;
  return `Sumá ${n} producto${n > 1 ? "s" : ""} más y llevate <strong>${next.pct}% OFF</strong>`;
}

function renderCart() {
  const { lines, count, subtotal, pct, discount, total } = cartSummary();

  const badge = $(".cart-count");
  badge.textContent = count;
  badge.hidden = count === 0;

  $(".cart__items").innerHTML = lines.length
    ? lines.map(({ product: p, qty }) => `
      <div class="cart-item">
        <div class="cart-item__media" style="background:${tone(p.id)}">${media(p)}</div>
        <div>
          <div class="cart-item__name">${esc(p.name)}</div>
          <div class="product__code">Cód. ${productCode(p.cat, p.id)}</div>
          <div class="cart-item__price">${money(p.price)}</div>
          <div class="qty">
            <button data-qty="${p.id}" data-delta="-1" aria-label="Quitar uno">−</button>
            <span>${qty}</span>
            <button data-qty="${p.id}" data-delta="1" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-remove="${p.id}">Quitar</button>
      </div>`).join("")
    : `<p class="cart__empty">Tu carrito está vacío.<br>¡Descubrí nuestras piezas favoritas!</p>`;

  const hint = promoHint(count);
  $(".cart__promo").innerHTML = !lines.length ? "" :
    (pct ? `<div class="cart__row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
            <div class="cart__row cart__row--promo"><span>${PROMO.name} (${pct}% OFF)</span><span>−${money(discount)}</span></div>` : "") +
    (hint ? `<p class="cart__hint">🎁 ${hint}</p>` : "");

  $(".cart__shipping").innerHTML = total === 0 ? "" : shippingBar(total);

  $("#cart-total").textContent = money(total);
  $(".checkout").disabled = lines.length === 0;
}

function openCart(open) {
  const cartEl = $(".cart");
  cartEl.classList.toggle("open", open);
  cartEl.setAttribute("aria-hidden", String(!open));
  $(".overlay").hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) $(".cart-close").focus();
  else showOrder(false);
}

// ===== Envío gratis =====
// Neuquén: gratis desde FREE_SHIPPING_NEUQUEN · resto del país: desde FREE_SHIPPING_PAIS
function shippingBar(total) {
  const bar = goal => `<div class="progress"><div style="width:${Math.min(100, total / goal * 100)}%"></div></div>`;
  if (total < FREE_SHIPPING_NEUQUEN) {
    return `Te faltan <strong>${money(FREE_SHIPPING_NEUQUEN - total)}</strong> para el envío gratis en Neuquén` +
      bar(FREE_SHIPPING_NEUQUEN) +
      `<small class="cart__shipping-note">Resto del país: gratis desde ${money(FREE_SHIPPING_PAIS)}</small>`;
  }
  if (total < FREE_SHIPPING_PAIS) {
    return `🎉 Envío gratis en Neuquén · te faltan <strong>${money(FREE_SHIPPING_PAIS - total)}</strong> para tenerlo en todo el país` +
      bar(FREE_SHIPPING_PAIS);
  }
  return `🎉 ¡Tenés envío gratis a todo el país!` + bar(FREE_SHIPPING_PAIS);
}

const freeShipping = (total, zone) =>
  total >= (zone === "neuquen" ? FREE_SHIPPING_NEUQUEN : FREE_SHIPPING_PAIS);

// ===== Pedido (paso 2 del carrito) =====
const cartTotal = () => cartSummary().total;
const whatsapp = text => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");

function showOrder(show) {
  const form = $(".order");
  $(".cart__items").hidden = show;
  $(".cart__foot").hidden = show;
  form.hidden = !show;
  $(".cart__head h2").textContent = show ? "Tus datos" : "Tu carrito";
  if (show) {
    const sum = cartSummary();
    $("#order-total").textContent = money(sum.total);
    $(".order__discount").innerHTML = sum.pct
      ? `🎉 ${PROMO.name}: ${sum.pct}% OFF aplicado (ahorrás ${money(sum.discount)})` : "";
    $(".order__error").textContent = "";
    const saved = store.get("azura-customer", {});
    for (const key of ["name", "address", "city"]) if (saved[key] && !form[key].value) form[key].value = saved[key];
    if (saved.zone) form.zone.value = saved.zone;
    updateDelivery();
    form.name.focus();
  }
}

function updateDelivery() {
  const form = $(".order");
  const envio = form.delivery.value === "envio";
  const neuquen = form.zone.value === "neuquen";
  $(".order__address").hidden = !envio;
  $(".order__city").hidden = neuquen;
  form.address.required = envio;
  form.city.required = envio && !neuquen;

  const total = cartTotal();
  const goal = neuquen ? FREE_SHIPPING_NEUQUEN : FREE_SHIPPING_PAIS;
  $(".order__ship").innerHTML = freeShipping(total, form.zone.value)
    ? `🎉 <strong>Tu envío es gratis</strong>`
    : `Envío con costo, lo coordinamos por WhatsApp. Gratis sumando <strong>${money(goal - total)}</strong> más.`;
}

function sendOrder(e) {
  e.preventDefault();
  const form = e.target, err = $(".order__error");
  const lines = cartLines();
  if (!lines.length) return showOrder(false);

  const name = form.name.value.trim();
  const envio = form.delivery.value === "envio";
  const zone = form.zone.value;
  const address = form.address.value.trim();
  const city = zone === "neuquen" ? "Neuquén" : form.city.value.trim();
  if (!name) { err.textContent = "Escribí tu nombre."; return form.name.focus(); }
  if (envio && !address) { err.textContent = "Escribí la dirección de envío."; return form.address.focus(); }
  if (envio && !city) { err.textContent = "Escribí tu localidad y provincia."; return form.city.focus(); }
  err.textContent = "";
  store.set("azura-customer", { name, address, city: zone === "pais" ? city : "", zone });

  const notes = form.notes.value.trim();
  const text = [
    "¡Hola Azura! Quiero hacer este pedido:",
    "",
    ...lines.map(l =>
      `• ${l.qty} x ${l.product.name} · Cód. ${productCode(l.product.cat, l.product.id)} (${money(l.product.price)})\n` +
      `   Foto: ${productUrl(l.product.id)}`),
    ...(() => {
      const sum = cartSummary();
      return sum.pct
        ? [`Subtotal: ${money(sum.subtotal)}`,
           `${PROMO.name} (${sum.pct}% OFF): -${money(sum.discount)}`,
           `Total: ${money(sum.total)}`]
        : [`Total: ${money(sum.total)}`];
    })(),
    "",
    `Nombre: ${name}`,
    envio
      ? `Entrega: envío a ${address}, ${city}`
      : "Entrega: retiro en el stand (domingo, Casino Magic Neuquén)",
    ...(envio ? [`Envío: ${freeShipping(cartTotal(), zone) ? "GRATIS" : "con costo (a coordinar)"}`] : []),
    `Pago: ${form.payment.value}`,
    ...(notes ? [`Comentario: ${notes}`] : [])
  ].join("\n");
  whatsapp(text);
  toast("¡Listo! Enviá el mensaje en WhatsApp para confirmar tu pedido");
}

// ===== Ficha de producto (#producto-ID) =====
const productUrl = id => `${location.origin}${location.pathname}#producto-${id}`;
let sheetPushed = false;

function openSheet(id) {
  const p = PRODUCTS.find(p => p.id === id);
  const dlg = $(".pmodal");
  if (!p) {
    if (!loading) toast("Ese producto ya no está disponible");
    return;
  }
  $(".pmodal__content").innerHTML = `
    <div class="pmodal__media" style="background:${tone(p.id)}">${media(p)}</div>
    <div class="pmodal__info">
      <span class="product__cat">${catName(p.cat)} · Acero blanco</span>
      <h2 id="pmodal-name">${esc(p.name)}</h2>
      <span class="product__code">Código: ${productCode(p.cat, p.id)}</span>
      <div class="product__price pmodal__price"><strong>${money(p.price)}</strong>${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
      ${isOut(p) ? `<p class="pmodal__stock pmodal__stock--out">Agotado por ahora · consultanos si vuelve a entrar</p>`
        : p.stock === "ultimas" ? `<p class="pmodal__stock pmodal__stock--low">¡Quedan últimas unidades!</p>` : ""}
      ${p.desc ? `<p class="pmodal__desc">${esc(p.desc)}</p>` : ""}
      <ul class="pmodal__facts">
        <li>Acero blanco: no se oxida ni se pone negro</li>
        <li>Retiralo en el stand los domingos o pedí envío</li>
        ${PROMO.active ? `<li>${PROMO.name}: 2 productos 30% OFF · 4 o más 50% OFF</li>` : ""}
      </ul>
      <div class="pmodal__actions">
        <button class="btn btn--primary btn--block" data-sheet-add="${p.id}" ${isOut(p) ? "disabled" : ""}>${isOut(p) ? "Agotado" : "Agregar al carrito"}</button>
        <button class="btn btn--ghost" data-sheet-ask="${p.id}">Consultar por WhatsApp</button>
        <button class="btn btn--ghost" data-sheet-share="${p.id}">Compartir</button>
      </div>
    </div>`;
  if (!dlg.open) dlg.showModal();
  document.title = `${p.name} · Azura`;
}

function closeSheet() {
  const dlg = $(".pmodal");
  if (dlg.open) dlg.close();
}

function onSheetClosed() {
  document.title = BASE_TITLE;
  if (!location.hash.startsWith("#producto-")) return;
  if (sheetPushed) history.back();
  else history.replaceState(null, "", location.pathname + location.search);
  sheetPushed = false;
}

function handleHash() {
  const m = location.hash.match(/^#producto-(\d+)$/);
  if (m) openSheet(Number(m[1]));
  else closeSheet();
}

async function shareProduct(id) {
  const p = PRODUCTS.find(p => p.id === id);
  const url = productUrl(id);
  if (navigator.share) {
    try { await navigator.share({ title: `${p.name} · Azura`, text: `Mirá este ${p.name} de Azura`, url }); } catch {}
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copiado. ¡Pegalo donde quieras!");
  } catch {
    prompt("Copiá este link:", url);
  }
}

// ===== Toast =====
let toastTimer;
function toast(msg) {
  const el = $(".toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ===== Productos desde Supabase =====
async function loadProducts() {
  if (!db) return;
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("visible", true)
    .order("sort_order")
    .order("id");
  if (error) {
    console.error("No se pudieron cargar los productos:", error.message);
    PRODUCTS = LOCAL_PRODUCTS;
  } else {
    PRODUCTS = data.map(fromRow);
  }
  loading = false;
  renderCategories();
  renderFilters();
  renderProducts();
  renderCart();
  handleHash();
}

// ===== Eventos =====
function bindEvents() {
  $(".categories").addEventListener("click", e => {
    const btn = e.target.closest(".category");
    if (!btn) return;
    setCategory(btn.dataset.cat);
    $("#tienda").scrollIntoView();
  });

  $(".filters").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (chip) setCategory(chip.dataset.cat);
  });
  $("#sort").addEventListener("change", renderProducts);

  $(".products").addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) return addToCart(Number(add.dataset.add));
    const link = e.target.closest(".product__name a");
    const open = !e.target.closest("button") && e.target.closest("[data-open]");
    if (link || open) {
      e.preventDefault();
      const id = Number(link ? link.hash.replace("#producto-", "") : open.dataset.open);
      sheetPushed = true;
      location.hash = `producto-${id}`;
      return;
    }
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const id = Number(fav.dataset.fav);
      favs.has(id) ? favs.delete(id) : favs.add(id);
      fav.setAttribute("aria-pressed", favs.has(id));
      store.set("azura-favs", [...favs]);
      toast(favs.has(id) ? "Agregado a favoritos ♥" : "Quitado de favoritos");
    }
  });

  $(".cart__items").addEventListener("click", e => {
    const q = e.target.closest("[data-qty]");
    if (q) return changeQty(Number(q.dataset.qty), Number(q.dataset.delta));
    const r = e.target.closest("[data-remove]");
    if (r) { delete cart[r.dataset.remove]; saveCart(); }
  });

  $(".cart-toggle").addEventListener("click", () => openCart(true));
  $(".cart-close").addEventListener("click", () => openCart(false));
  $(".overlay").addEventListener("click", () => openCart(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") openCart(false); });
  $(".checkout").addEventListener("click", () => showOrder(true));
  $(".order__back").addEventListener("click", () => showOrder(false));
  $(".order").addEventListener("change", e => { if (["delivery", "zone"].includes(e.target.name)) updateDelivery(); });
  $(".order").addEventListener("submit", sendOrder);

  const dlg = $(".pmodal");
  window.addEventListener("hashchange", handleHash);
  dlg.addEventListener("close", onSheetClosed);
  dlg.addEventListener("click", e => { if (e.target === dlg) closeSheet(); });   // clic afuera
  $(".pmodal__close").addEventListener("click", closeSheet);
  $(".pmodal__content").addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.sheetAdd) { addToCart(Number(btn.dataset.sheetAdd)); closeSheet(); }
    if (btn.dataset.sheetShare) shareProduct(Number(btn.dataset.sheetShare));
    if (btn.dataset.sheetAsk) {
      const p = PRODUCTS.find(p => p.id === Number(btn.dataset.sheetAsk));
      whatsapp(`¡Hola Azura! Quería consultar por el ${p.name} (Cód. ${productCode(p.cat, p.id)}): ${productUrl(p.id)}`);
    }
  });

  const nav = $(".nav"), menuBtn = $(".menu-toggle");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", e => {
    if (e.target.matches("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); }
  });

  $(".newsletter__form").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("#email"), msg = $(".form-msg");
    if (!input.checkValidity() || !input.value) {
      msg.textContent = "Ingresá un email válido.";
      return;
    }
    msg.textContent = "¡Gracias! Tu código es BIENVENIDA10 ✨";
    input.value = "";
  });
}

// ===== Inicio =====
const BASE_TITLE = document.title;
if (PROMO.active) {
  $(".promo").hidden = false;
  $(".topbar").textContent = $(".topbar").dataset.promoText;
}
$(".wa-float").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("¡Hola Azura! Quería hacer una consulta.")}`;
$("#year").textContent = new Date().getFullYear();
renderCategories();
renderFilters();
renderProducts();
renderCart();
bindEvents();
if (db) loadProducts(); else handleHash();
