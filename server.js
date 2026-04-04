const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");

console.log("🔥 Iniciando servidor...");

const app = express();
app.use(cors());

// carpeta uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage });

// ruta de prueba
app.get("/", (req, res) => {
    res.send("Servidor funcionando 🚀");
});

// subir archivo + ejecutar python
app.post("/upload", upload.single("file"), (req, res) => {

  const filePath = req.file.path;

  exec(`python script.py "${filePath}"`, (error, stdout, stderr) => {
    
    if (error) {
      console.error("ERROR:", error);
      console.error("STDERR:", stderr);
      return res.status(500).json({ error: "Error procesando archivo" });
    }

    const outputPath = filePath.replace(".pdf", ".xlsx");

    console.log("Excel generado:", outputPath); // 👈 debug

    res.json({
      message: "Archivo procesado",
      output: stdout,
      file: outputPath
    });
  });

});

// levantar servidor
app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en http://localhost:3000");
});
app.use("/uploads", express.static("uploads"));