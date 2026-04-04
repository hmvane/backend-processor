import sys
import os
import PyPDF2
import pandas as pd
import re
import json

# Aseguramos UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Obtener ruta absoluta del PDF
file_path = os.path.abspath(sys.argv[1])

# Carpeta temporal segura para Render
tmp_dir = "/tmp"
filename = os.path.basename(file_path)
output_path = os.path.join(tmp_dir, filename.replace(".pdf", ".xlsx"))

# Leer PDF
with open(file_path, "rb") as file:
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

# Separar líneas
lines = text.split("\n")

# Limpiar líneas y unir fragmentos
clean_lines = []
buffer = ""

for line in lines:
    if re.match(r"^\d+\s+\d+", line):  # empieza con item + código
        if buffer:
            clean_lines.append(buffer)
        buffer = line
    else:
        buffer += " " + line

if buffer:
    clean_lines.append(buffer)

# Procesar datos
data = []

for line in clean_lines:
    match = re.match(r"(\d+)\s+(\d+)\s+(.+?)\s+([\d\.]+)", line)
    if match:
        item = match.group(1)
        codigo = match.group(2)
        descripcion = match.group(3).strip()
        valor = match.group(4).replace(".", "")
        data.append({
            "Item": int(item),
            "Codigo": codigo,
            "Descripcion": descripcion,
            "Valor": int(valor)
        })

# Crear Excel en /tmp
df = pd.DataFrame(data)
df.to_excel(output_path, index=False)

# Imprimir JSON para que Node lo reciba
print(json.dumps(data))

# Debug opcional
sys.stderr.write(f"Excel guardado en: {output_path}\n")