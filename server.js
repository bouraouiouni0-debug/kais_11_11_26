const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());   // pour la page web (JSON)
app.use(express.text());   // pour l'ESP32 (texte simple)
app.use(express.static(path.join(__dirname, "public")));

let lcd = { line1: "", line2: "" };
let lastSeen = 0;
let aEnvoyer = { messages: [], randoms: [] };
let journal = [];

function log(qui, texte) {
  journal.push({ t: Date.now(), qui, texte });
  if (journal.length > 50) journal.shift();
}

// ===== ESP32 =====
// Reçoit : ligne1 \n ligne2 \n accusé (optionnel)
// Répond : une ligne par élément, "M:texte" (message) ou "N:123" (nombre)
app.post("/api/esp32", (req, res) => {
  const [l1 = "", l2 = "", ack = ""] = String(req.body || "").split("\n");
  lcd.line1 = l1;
  lcd.line2 = l2;
  lastSeen = Date.now();
  if (ack) log("esp32", ack);

  const lignes = [
    ...aEnvoyer.messages.map(m => "M:" + m.replace(/[\r\n]/g, " ")),
    ...aEnvoyer.randoms.map(n => "N:" + n)
  ];
  aEnvoyer = { messages: [], randoms: [] };
  res.type("text").send(lignes.join("\n"));
});

// ===== Page web =====
app.post("/api/message", (req, res) => {
  const texte = String((req.body && req.body.text) || "").slice(0, 100);
  if (texte) {
    aEnvoyer.messages.push(texte);
    log("moi", texte);
  }
  res.json({ ok: true });
});

app.post("/api/random", (req, res) => {
  const v = parseInt(req.body && req.body.value);
  if (!isNaN(v)) {
    aEnvoyer.randoms.push(v);
    log("moi", "Nombre aléatoire : " + v);
  }
  res.json({ ok: true });
});

app.get("/api/state", (req, res) => {
  res.json({ lcd, online: Date.now() - lastSeen < 8000, journal });
});

app.listen(process.env.PORT || 3000, () => console.log("Serveur démarré"));
