// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pdfParseLib = require("pdf-parse");
const pdfParse = typeof pdfParseLib === "function" ? pdfParseLib : pdfParseLib.default;
const ExcelJS = require("exceljs");

const app = express();
app.use(cors());
app.use(express.json());

// Carpeta temporal
const UPLOAD_DIR = "/tmp/uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configuración multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Ruta de prueba
app.get("/", (req, res) => res.send("Servidor funcionando 🚀"));

// Subir PDF y generar Excel
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });

    const filePath = req.file.path;

    // Leer PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Procesar texto como tabla
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const cleanLines = [];
    let buffer = "";

    for (const line of lines) {
      if (/^\d+\s+\d+/.test(line)) { // empieza con item + código
        if (buffer) cleanLines.push(buffer);
        buffer = line;
      } else {
        buffer += " " + line;
      }
    }
    if (buffer) cleanLines.push(buffer);

    // Convertir a objetos
    const data = cleanLines.map(line => {
      const match = line.match(/(\d+)\s+(\d+)\s+(.+?)\s+([\d\.]+)/);
      if (!match) return null;
      return {
        Item: parseInt(match[1]),
        Codigo: match[2],
        Descripcion: match[3].trim(),
        Valor: parseInt(match[4].replace(/\./g, "")),
      };
    }).filter(Boolean);

    // Crear Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Facturas");
    worksheet.columns = [
      { header: "Item", key: "Item" },
      { header: "Codigo", key: "Codigo" },
      { header: "Descripcion", key: "Descripcion" },
      { header: "Valor", key: "Valor" },
    ];
    worksheet.addRows(data);

    const excelPath = path.join(UPLOAD_DIR, path.basename(filePath).replace(".pdf", ".xlsx"));
    await workbook.xlsx.writeFile(excelPath);

    // Enviar respuesta
    res.json({
      message: "Archivo procesado",
      output: JSON.stringify(data),
      file: excelPath, // path del Excel para descarga
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Error procesando archivo", details: err.message });
  }
});

// Servir archivos temporales para descarga
app.use("/uploads", express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));