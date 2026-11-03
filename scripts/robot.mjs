// Robot de noticias — La Plata de la Ciencia (Vibras Positivas HM)
// Lo corre GitHub Actions cada 30 minutos. Trae noticias reales de Google News
// y actualiza noticias.json sin borrar las que ya había.
import { readFile, writeFile } from 'node:fs/promises';

const BUSQUEDAS = [
  'MinCiencias 9.800 millones',
  'Claudia Benavides hallazgos Minciencias',
  'Ministerio de Ciencia irregularidades Contraloría',
  'Minciencias Fiscalía Procuraduría almuerzos',
  'Minciencias congela pagos contratos'
];
// Solo se guardan noticias que hablen del caso
const CLAVES = /(minciencias|ministerio de ciencia|ministra de ciencia|claudia benavides|9\.?800|plata de la ciencia)/i;

const limpiar = s => (s || '')
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim();

async function buscar(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:30d')}&hl=es-419&gl=CO&ceid=CO:es-419`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VibrasPositivasHM robot)' } });
  if (!r.ok) throw new Error(`${r.status} en ${q}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const it = m[1];
    const tag = t => limpiar((it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)) || [])[1]);
    let titulo = tag('title');
    const fuente = tag('source') || 'Google Noticias';
    titulo = titulo.replace(new RegExp(`\\s+-\\s+${fuente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    return { titulo, fuente, url: tag('link'), fecha: new Date(tag('pubDate') || Date.now()).toISOString() };
  });
}

const actual = JSON.parse(await readFile('noticias.json', 'utf8').catch(() => '{"noticias":[]}'));
const mapa = new Map(actual.noticias.map(n => [n.titulo.toLowerCase(), n]));
let nuevas = 0;
for (const q of BUSQUEDAS) {
  try {
    for (const n of await buscar(q)) {
      if (!n.titulo || !CLAVES.test(n.titulo)) continue;
      const k = n.titulo.toLowerCase();
      if (!mapa.has(k)) { mapa.set(k, n); nuevas++; }
    }
  } catch (e) { console.error('Falló búsqueda:', e.message); }
}
const noticias = [...mapa.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 80);
await writeFile('noticias.json', JSON.stringify({ actualizado: new Date().toISOString(), noticias }, null, 2) + '\n');
console.log(`Listo: ${nuevas} nuevas, ${noticias.length} en total.`);
