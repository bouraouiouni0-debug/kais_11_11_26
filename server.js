const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let lcd = { line1: "", line2: "" };
let lastSeen = 0;
let aEnvoyer = { messages: [], randoms: [] };
let journal = [];

function log(qui, texte) {
  journal.push({ t: Date.now(), qui, texte });
  if (journal.length > 50) journal.shift();
}

// Appelé par l'ESP32 toutes les 2 s
app.post("/api/esp32", (req, res) => {
  const { line1, line2, ack } = req.body;
  if (line1 !== undefined) lcd.line1 = line1;
  if (line2 !== undefined) lcd.line2 = line2;
  lastSeen = Date.now();
  if (ack) log("esp32", ack);
  const out = aEnvoyer;
  aEnvoyer = { messages: [], randoms: [] };
  res.json(out);
});

// Appelé par la page web
app.post("/api/message", (req, res) => {
  const texte = String(req.body.text || "").slice(0, 100);
  if (texte) { aEnvoyer.messages.push(texte); log("moi", texte); }
  res.json({ ok: true });
});

app.post("/api/random", (req, res) => {
  const v = parseInt(req.body.value);
  if (!isNaN(v)) { aEnvoyer.randoms.push(v); log("moi", "Nombre aléatoire : " + v); }
  res.json({ ok: true });
});

app.get("/api/state", (req, res) => {
  res.json({ lcd, online: Date.now() - lastSeen < 8000, journal });
});

app.listen(process.env.PORT || 3000, () => console.log("Serveur démarré"));
