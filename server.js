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
app.get("/", (req, res) => res.send("Servidor funcionando"));

// SUBIR PDF Y PROCESAR

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const pdfExtract = new PDFExtract();

    pdfExtract.extract(filePath, {}, async (err, data) => {
      if (err) {
        console.error("Error leyendo PDF:", err);
        return res.status(500).json({
          error: "Error procesando archivo",
          details: err.message,
        });
      }

      // EXTRAER TEXTO
      const lines = [];
      data.pages.forEach((page) => {
        page.content.forEach((item) => {
          if (item.str) lines.push(item.str.trim());
        });
      });

      console.log("Texto extraído:", lines);

      // LIMPIAR TOKENS
      const tokens = lines.filter((l) => l && l.trim() !== "");
      console.log("Tokens:", tokens);
      const parsed = [];
      let i = 0;

      while (i < tokens.length) {
        const item = tokens[i];

        // Detectar Item (número)
        if (/^\d+$/.test(item)) {
          let codigo = tokens[i + 1];
          let offset = 2;

          if (/^\d{3}$/.test(codigo) && /^\d$/.test(tokens[i + 2])) {
            codigo = codigo + tokens[i + 2];
            offset = 3;
          }
          if (codigo && /^\d{3,4}$/.test(codigo)) {
            let descripcion = "";
            let j = i + offset;
            // Construir descripción hasta encontrar valor
            while (j < tokens.length && !/^\d[\d\.]+$/.test(tokens[j])) {
              descripcion += tokens[j] + " ";
              j++;
            }

            const valor = tokens[j];

            parsed.push({
              Item: parseInt(item),
              Codigo: codigo,
              Descripcion: descripcion.trim(),
              Valor: valor ? parseInt(valor.replace(/\./g, "")) : null,
            });

            i = j + 1;
            continue;
          }
        }

        i++;
      }

      console.log("✅ Datos finales:", parsed);

      if (!parsed.length) {
        return res.status(400).json({
          error: "No se pudieron extraer datos válidos del PDF",
        });
      }

      // CREAR EXCEL
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Facturas");

      worksheet.columns = [
        { header: "Item", key: "Item" },
        { header: "Codigo", key: "Codigo" },
        { header: "Descripcion", key: "Descripcion" },
        { header: "Valor", key: "Valor" },
      ];

      worksheet.addRows(parsed);

      const excelFileName = path.basename(filePath).replace(".pdf", ".xlsx");
      const excelPath = path.join(UPLOAD_DIR, excelFileName);

      await workbook.xlsx.writeFile(excelPath);

      // RESPUESTA
      res.json({
        message: "Archivo procesado",
        output: JSON.stringify(parsed),
        file: `/uploads/${excelFileName}`,
      });
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      error: "Error procesando archivo",
      details: err.message,
    });
  }
});

// Servir archivos
app.use("/uploads", express.static(UPLOAD_DIR));

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);