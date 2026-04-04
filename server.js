const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🔥 Iniciando servidor...");

const app = express();
app.use(cors());

// carpeta temporal segura para Render
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

// Subir archivo y ejecutar Python
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = path.resolve(req.file.path);
  const outputPath = filePath.replace(".pdf", ".xlsx");

  // Ejecutamos Python con python3 explícitamente
  exec(`python3 script.py "${filePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("ERROR:", error);
      console.error("STDERR:", stderr);
      return res.status(500).json({ error: "Error procesando archivo" });
    }

    console.log("Excel generado:", outputPath);

    res.json({
      message: "Archivo procesado",
      output: stdout,       // JSON con los datos
      file: outputPath      // Path del Excel generado
    });
  });
});

// Servir archivos temporales si quieres permitir descarga
app.use("/uploads", express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));