// ===== Configuración de Azura (la usan la tienda y el panel admin) =====

// Datos de Supabase: Project Settings → API Keys / Data API.
// La clave "anon" / "publishable" es pública por diseño; NUNCA pongas acá la "service_role" / "secret".
const SUPABASE_URL = "https://kzzflxqonistdcpgnjkm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-VtCfa0IoKlcB31UBqUtzQ_lOOrDTcT";

const WHATSAPP_NUMBER = "5492995131264"; // 299 513-1264 (formato internacional: 54 9 + área + número)
// Envío gratis a partir de estos montos
const FREE_SHIPPING_NEUQUEN = 20000;   // Neuquén
const FREE_SHIPPING_PAIS = 60000;      // resto del país

// Promo por cantidad de productos en el carrito.
// Se apaga sola al llegar a "until" (hora de Argentina). Para cortarla antes: enabled: false.
const PROMO = {
  enabled: true,
  until: "2026-11-07T00:00:00-03:00", // dura hasta el viernes 6/11 inclusive
  untilText: "hasta el viernes 6/11",
  name: "Promo inauguración",
  tiers: [               // de mayor a menor cantidad
    { min: 4, pct: 50 }, // 4 o más productos: 50% OFF
    { min: 2, pct: 30 }  // 2 o 3 productos: 30% OFF
  ],
  get active() { return this.enabled && Date.now() < Date.parse(this.until); }
};

// code: prefijo del código de producto (ej. COL-28)
const CATEGORIES = [
  { id: "collares", name: "Collares", code: "COL" },
  { id: "aretes", name: "Aros", code: "ARO" },
  { id: "anillos", name: "Anillos", code: "ANI" },
  { id: "pulseras", name: "Pulseras", code: "PUL" },
  { id: "pelo", name: "Para el pelo", code: "PEL" },
  { id: "joyeros", name: "Joyeros", code: "JOY" }
];

// Código único de cada producto: prefijo de la categoría + número de producto (ej. COL-28)
const productCode = (category, id) =>
  `${CATEGORIES.find(c => c.id === category)?.code ?? "AZ"}-${id}`;

// El primero es el predeterminado
const MATERIALS = [
  { id: "acero", name: "Acero blanco" },
  { id: "plata", name: "Plata" }
];
const materialName = id => (MATERIALS.find(m => m.id === id) ?? MATERIALS[0]).name;

const STOCK_STATES = [
  { id: "disponible", name: "Disponible" },
  { id: "ultimas", name: "Últimas unidades" },
  { id: "agotado", name: "Agotado" }
];

const PHOTO_BUCKET = "productos";

const db = SUPABASE_URL && SUPABASE_KEY && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "$" + Number(n).toLocaleString("es-AR");

// Fila de la base de datos → producto de la tienda
const fromRow = r => ({
  id: r.id, name: r.name, cat: r.category, price: r.price,
  oldPrice: r.old_price || undefined, badge: r.badge || undefined,
  img: r.image_url || undefined, desc: r.description || "",
  visible: r.visible, order: r.sort_order,
  stock: r.stock_status || "disponible",  // disponible | ultimas | agotado
  material: r.material || MATERIALS[0].id // acero | plata
});
