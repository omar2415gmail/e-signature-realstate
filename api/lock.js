// api/lock.js — يفحص ويقفل الروابط (رابط لكل عقد يُستخدم مرة واحدة).
// يعتمد على Upstash Redis عبر REST: KV_REST_API_URL + KV_REST_API_TOKEN
// طريقة الاستخدام:
//   GET  /api/lock?id=XXXX        -> { locked: true|false }
//   POST /api/lock  { id: "XXXX" } -> يقفل المعرّف، { ok:true, already:false|true }

const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(cmdArray) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmdArray),
  });
  return r.json(); // { result: ... }
}

export default async function handler(req, res) {
  try {
    if (!URL || !TOKEN) return res.status(500).json({ error: "KV not configured" });

    const id = (req.method === "GET" ? req.query.id : (typeof req.body === "string" ? JSON.parse(req.body||"{}").id : (req.body||{}).id));
    if (!id || !/^[A-Za-z0-9_-]{4,40}$/.test(id)) return res.status(400).json({ error: "bad id" });
    const key = `lock:${id}`;

    if (req.method === "GET") {
      const out = await redis(["EXISTS", key]);
      return res.status(200).json({ locked: out.result === 1 });
    }

    if (req.method === "POST") {
      // SET key 1 NX  -> result "OK" إذا أُنشئ الآن، null إذا كان موجوداً مسبقاً
      const out = await redis(["SET", key, "1", "NX"]);
      const already = out.result === null;
      return res.status(200).json({ ok: true, already });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
