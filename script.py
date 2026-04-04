import sys
sys.stdout.reconfigure(encoding='utf-8')

import PyPDF2
import pandas as pd
import re
import json

# Obtener ruta del archivo
file_path = sys.argv[1]

# Leer PDF
with open(file_path, "rb") as file:
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()

# Separar líneas
lines = text.split("\n")

# Limpiar líneas 
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

# Crear Excel
df = pd.DataFrame(data)

output_path = file_path.replace(".pdf", ".xlsx")
df.to_excel(output_path, index=False)

print(json.dumps(data))