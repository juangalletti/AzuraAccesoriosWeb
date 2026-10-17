// ===== Panel admin de Azura =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const catName = id => CATEGORIES.find(c => c.id === id)?.name ?? id;

let products = [];
let editing = null;      // producto que se está editando (null = nuevo)
let newPhoto = null;     // Blob de la foto elegida, todavía sin subir

function show(view) {
  for (const v of ["setup", "login", "products"]) $(`#view-${v}`).hidden = v !== view;
  $("#logout").hidden = view !== "products";
}

let toastTimer;
function toast(msg) {
  const el = $(".toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

// ===== Sesión =====
async function start() {
  if (!db) return show("setup");
  const { data: { session } } = await db.auth.getSession();
  session ? enter() : show("login");
}

async function enter() {
  const { data, error } = await db.from("admins").select("user_id").limit(1);
  if (error || !data.length) {
    await db.auth.signOut();
    show("login");
    $("#login-form .form-error").textContent = "Este usuario no tiene permisos de admin.";
    return;
  }
  show("products");
  loadProducts();
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target, err = $(".form-error", form), btn = $("button", form);
  err.textContent = "";
  btn.disabled = true;
  const { error } = await db.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value
  });
  btn.disabled = false;
  if (error) {
    err.textContent = "Email o contraseña incorrectos.";
    return;
  }
  form.reset();
  enter();
});

$("#logout").addEventListener("click", async () => {
  await db.auth.signOut();
  show("login");
});

// ===== Lista de productos =====
async function loadProducts() {
  $(".admin__list").innerHTML = `<p class="muted">Cargando…</p>`;
  const { data, error } = await db.from("products").select("*").order("sort_order").order("id");
  if (error) {
    $(".admin__list").innerHTML = `<p class="form-error">No se pudieron cargar los productos: ${esc(error.message)}</p>`;
    return;
  }
  products = data;
  renderList();
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const list = products.filter(p => !q || p.name.toLowerCase().includes(q) || catName(p.category).toLowerCase().includes(q));
  const visibles = products.filter(p => p.visible).length;
  $("#product-count").textContent = `${products.length} en total · ${visibles} visibles en la tienda`;

  if (!list.length) {
    $(".admin__list").innerHTML = `<p class="muted">${products.length ? "No hay resultados." : "Todavía no cargaste productos. Tocá “+ Nuevo producto”."}</p>`;
    return;
  }

  $(".admin__list").innerHTML = list.map(p => `
    <article class="item${p.visible ? "" : " item--hidden"}">
      ${p.image_url ? `<img class="item__img" src="${esc(p.image_url)}" alt="">` : `<div class="item__img"></div>`}
      <div>
        <div class="item__name">${esc(p.name)}</div>
        <div class="item__meta">
          <strong>${money(p.price)}</strong>
          ${p.old_price ? `<s>${money(p.old_price)}</s>` : ""}
          <span>${esc(catName(p.category))}</span>
          ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
          ${p.visible ? "" : `<span class="tag tag--off">Oculto</span>`}
          ${p.stock_status === "ultimas" ? `<span class="tag tag--low">Últimas unidades</span>` : ""}
          ${p.stock_status === "agotado" ? `<span class="tag tag--out">Agotado</span>` : ""}
        </div>
      </div>
      <div class="item__buttons">
        <select class="item__stock" data-stock="${p.id}" aria-label="Stock de ${esc(p.name)}">
          ${STOCK_STATES.map(s => `<option value="${s.id}" ${(p.stock_status || "disponible") === s.id ? "selected" : ""}>${s.name}</option>`).join("")}
        </select>
        <button class="btn btn--ghost btn--sm" data-toggle="${p.id}">${p.visible ? "Ocultar" : "Mostrar"}</button>
        <button class="btn btn--ghost btn--sm" data-edit="${p.id}">Editar</button>
        <button class="btn btn--danger btn--sm" data-delete="${p.id}">Borrar</button>
      </div>
    </article>`).join("");
}

$("#search").addEventListener("input", renderList);

// Cambio rápido de stock desde la lista
$(".admin__list").addEventListener("change", async e => {
  const sel = e.target.closest("[data-stock]");
  if (!sel) return;
  const id = Number(sel.dataset.stock);
  const p = products.find(p => p.id === id);
  sel.disabled = true;
  const { error } = await db.from("products").update({ stock_status: sel.value }).eq("id", id);
  sel.disabled = false;
  if (error) {
    sel.value = p.stock_status || "disponible";
    return toast(friendlyError(error));
  }
  p.stock_status = sel.value;
  renderList();
  toast(`Stock: ${STOCK_STATES.find(s => s.id === sel.value).name}`);
});

function friendlyError(error) {
  const msg = error?.message || "error desconocido";
  return msg.includes("stock_status")
    ? "Falta activar el stock: corré el archivo supabase/stock.sql en Supabase (SQL Editor)."
    : "No se pudo guardar: " + msg;
}

$(".admin__list").addEventListener("click", async e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = Number(btn.dataset.edit || btn.dataset.delete || btn.dataset.toggle);
  const p = products.find(p => p.id === id);
  if (!p) return;

  if (btn.dataset.edit) openEditor(p);

  if (btn.dataset.toggle) {
    btn.disabled = true;
    const { error } = await db.from("products").update({ visible: !p.visible }).eq("id", id);
    if (error) return toast("No se pudo cambiar: " + error.message);
    p.visible = !p.visible;
    renderList();
    toast(p.visible ? "Ahora se ve en la tienda" : "Oculto de la tienda");
  }

  if (btn.dataset.delete) {
    if (!confirm(`¿Borrar “${p.name}”? Esta acción no se puede deshacer.`)) return;
    btn.disabled = true;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { btn.disabled = false; return toast("No se pudo borrar: " + error.message); }
    await removeStoredPhoto(p.image_url);
    products = products.filter(x => x.id !== id);
    renderList();
    toast("Producto borrado");
  }
});

// ===== Editor =====
$("#category-select").innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
$("#stock-select").innerHTML = STOCK_STATES.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

function openEditor(p = null) {
  editing = p;
  newPhoto = null;
  const form = $("#product-form");
  form.reset();
  $(".form-error", form).textContent = "";
  $("#editor-title").textContent = p ? "Editar producto" : "Nuevo producto";
  form.name.value = p?.name ?? "";
  form.category.value = p?.category ?? CATEGORIES[0].id;
  form.badge.value = p?.badge ?? "";
  form.price.value = p?.price ?? "";
  form.old_price.value = p?.old_price ?? "";
  form.description.value = p?.description ?? "";
  form.stock_status.value = p?.stock_status ?? "disponible";
  form.sort_order.value = p?.sort_order ?? (products.length ? Math.max(...products.map(x => x.sort_order)) + 1 : 1);
  form.visible.checked = p?.visible ?? true;
  setPreview(p?.image_url);
  $("#editor").showModal();
}

function setPreview(src) {
  $("#photo-preview").innerHTML = src ? `<img src="${esc(src)}" alt="Vista previa">` : `<span>Sin foto</span>`;
}

$("#new-product").addEventListener("click", () => openEditor());
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $("#editor").close()));

$("#photo-input").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    newPhoto = await shrinkImage(file);
    setPreview(URL.createObjectURL(newPhoto));
  } catch {
    toast("No se pudo leer esa imagen. Probá con otra.");
  }
  e.target.value = "";
});

// Achica la foto (máx. 1400 px) para que cargue rápido en la tienda
function shrinkImage(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => b ? resolve(b) : reject(), "image/jpeg", 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function uploadPhoto(blob) {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Borra la foto del almacenamiento (solo las subidas desde el panel)
async function removeStoredPhoto(url) {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  await db.storage.from(PHOTO_BUCKET).remove([decodeURIComponent(url.split(marker)[1])]);
}

$("#product-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target, err = $(".form-error", form), saveBtn = $("#save-btn");
  err.textContent = "";

  const price = parseInt(form.price.value, 10);
  const oldPrice = form.old_price.value ? parseInt(form.old_price.value, 10) : null;
  if (!form.name.value.trim()) return (err.textContent = "Poné un nombre.");
  if (!(price >= 0)) return (err.textContent = "Poné un precio válido (solo números).");
  if (oldPrice !== null && oldPrice <= price) return (err.textContent = "El precio anterior tiene que ser mayor al precio actual.");

  saveBtn.disabled = true;
  saveBtn.textContent = "Guardando…";
  try {
    let image_url = editing?.image_url ?? null;
    if (newPhoto) image_url = await uploadPhoto(newPhoto);

    const row = {
      name: form.name.value.trim(),
      category: form.category.value,
      badge: form.badge.value.trim() || null,
      price,
      old_price: oldPrice,
      description: form.description.value.trim() || null,
      sort_order: parseInt(form.sort_order.value, 10) || 0,
      visible: form.visible.checked,
      stock_status: form.stock_status.value,
      image_url
    };

    const query = editing
      ? db.from("products").update(row).eq("id", editing.id)
      : db.from("products").insert(row);
    const { error } = await query;
    if (error) throw error;

    if (newPhoto && editing?.image_url) await removeStoredPhoto(editing.image_url);
    $("#editor").close();
    toast(editing ? "Cambios guardados" : "Producto creado");
    loadProducts();
  } catch (ex) {
    err.textContent = friendlyError(ex);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardar";
  }
});

start();
