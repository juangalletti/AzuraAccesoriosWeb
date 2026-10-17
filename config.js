// ===== Configuración de Azura (la usan la tienda y el panel admin) =====

// Datos de Supabase: Project Settings → API Keys / Data API.
// La clave "anon" / "publishable" es pública por diseño; NUNCA pongas acá la "service_role" / "secret".
const SUPABASE_URL = "https://kzzflxqonistdcpgnjkm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-VtCfa0IoKlcB31UBqUtzQ_lOOrDTcT";

const WHATSAPP_NUMBER = "5492995131264"; // 299 513-1264 (formato internacional: 54 9 + área + número)
const FREE_SHIPPING_FROM = 60000;

const CATEGORIES = [
  { id: "collares", name: "Collares" },
  { id: "aretes", name: "Aretes" },
  { id: "anillos", name: "Anillos" },
  { id: "pulseras", name: "Pulseras" },
  { id: "bolsos", name: "Bolsos" },
  { id: "pelo", name: "Para el pelo" }
];

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
  stock: r.stock_status || "disponible"   // disponible | ultimas | agotado
});
