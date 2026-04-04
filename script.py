import sys
import os
import PyPDF2
import pandas as pd
import re
import json

# Aseguramos UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Argumentos
file_path = os.path.abspath(sys.argv[1])
output_path = os.path.abspath(sys.argv[2])  # <- Segundo argumento: path final del Excel

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
    if re.match(r"^\d+\s+\d+", line):
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

# Crear Excel
df = pd.DataFrame(data)
df.to_excel(output_path, index=False)

# Devolver JSON para frontend
print(json.dumps(data))

# Debug
sys.stderr.write(f"Excel guardado en: {output_path}\n")