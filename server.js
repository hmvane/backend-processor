const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { PDFExtract } = require("pdf.js-extract");
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
    const filePath = req.file.path;

    const pdfExtract = new PDFExtract();
    pdfExtract.extract(filePath, {}, async (err, data) => {
      if (err) {
        console.error("Error leyendo PDF:", err);
        return res.status(500).json({ error: "Error procesando archivo", details: err.message });
      }

      // Extraer texto plano de todas las páginas
      // Extraer texto plano de todas las páginas
const lines = [];
data.pages.forEach(page => {
    page.content.forEach(item => {
        if (item.str) {
            lines.push(item.str);
        }
    });
});

console.log("Texto extraído:", lines);

      if (!lines.length) {
        return res.status(400).json({ error: "No se pudieron extraer datos del PDF" });
      }

      // Convertir líneas en objetos
      const parsed = lines.map(line => {
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
      worksheet.addRows(parsed);

      const excelPath = path.join(UPLOAD_DIR, path.basename(filePath).replace(".pdf", ".xlsx"));
      await workbook.xlsx.writeFile(excelPath);

      // Enviar respuesta
      res.json({
        message: "Archivo procesado",
        output: JSON.stringify(parsed),
        file: `/uploads/${path.basename(excelPath)}`,
      });
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