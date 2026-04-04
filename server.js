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
      const lines = [];
      data.pages.forEach(page => {
        page.content.forEach(item => {
          if (item.str) lines.push(item.str.trim());
        });
      });

      console.log("Texto extraído:", lines);

      if (!lines.length) {
        return res.status(400).json({ error: "No se pudieron extraer datos del PDF" });
      }

      // --------------------------------------------------------
      // Reconstruir las filas de la tabla
      // --------------------------------------------------------
      const dataRows = [];
      let buffer = [];

      for (let line of lines) {
        // Si la línea es un número (Item), empieza un nuevo registro
        if (/^\d+$/.test(line)) {
          if (buffer.length) dataRows.push(buffer);
          buffer = [line];
        } else {
          buffer.push(line);
        }
      }
      if (buffer.length) dataRows.push(buffer);

      // Convertir a objetos
      const parsed = dataRows.map(parts => {
        if (parts.length < 4) return null; // saltamos líneas incompletas
        return {
          Item: parseInt(parts[0]),
          Codigo: parts[1],
          Descripcion: parts.slice(2, -1).join(" "), // todo el texto intermedio
          Valor: parseInt(parts[parts.length - 1].replace(/\./g, "")),
        };
      }).filter(Boolean);

      console.log("Datos parseados:", parsed);

      if (!parsed.length) {
        return res.status(400).json({ error: "No se pudieron extraer datos válidos del PDF" });
      }

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