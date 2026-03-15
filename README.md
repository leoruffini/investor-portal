# Agente Inversor PVX

Sistema automatizado para extraer datos de documentos legales de inversores y generar Protocolos de Inversión rellenados.

---

## Qué hace este proyecto

Toma los **PDFs legales** de un inversor (escritura de constitución, nombramiento del órgano de administración, poderes del representante legal) y produce:

1. Un **JSON estructurado** con todos los datos societarios extraídos.
2. Un **Word del Protocolo de Inversión** con los campos del inversor ya rellenados.

```
PDFs del inversor ──> Extracción de texto ──> LLM (Claude/GPT) ──> JSON ──> Word rellenado
```

---

## Estructura del proyecto

```
Agente Inversor/
├── app.py                                                 # Webapp (Streamlit)
├── 02a. Plantilla Borrador Protocolo de Inversión.docx    # Plantilla base
├── 08 VENTU EUROPE (240K)/                                # Ejemplo: carpeta de inversor
│   ├── Escritura de constitución ...pdf
│   ├── Escritura de nombramiento ...pdf
│   └── Poderes del representante legal ...pdf
├── output/                                                # Resultados generados
│   ├── VENTU_EUROPE_datos_extraidos.json
│   └── Protocolo_Inversion_VENTU_EUROPE.docx
├── scripts/
│   ├── agente_inversor.py                                 # Motor principal (CLI + lógica)
│   └── rellenar_protocolo.py                              # Rellenador de plantilla (PoC)
└── README.md
```

---

## Requisitos previos

### 1. Python 3.10 o superior

Comprueba tu versión:

```bash
python3 --version
```

### 2. Instalar dependencias

**Primera vez** (crear entorno virtual e instalar):

```bash
cd "/Users/leoruffini/Desktop/Agente Inversor (by Claude)"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Cada vez que abras una terminal nueva**, activa el entorno antes de ejecutar:

```bash
cd "/Users/leoruffini/Desktop/Agente Inversor (by Claude)"
source venv/bin/activate
```

| Paquete | Para qué sirve |
|---|---|
| `python-docx` | Leer y escribir archivos Word (.docx) |
| `PyMuPDF` | Extraer texto de PDFs digitales |
| `anthropic` | Conectarse a la API de Claude para la extracción inteligente |
| `python-dotenv` | Cargar la API key desde el archivo `.env` |

**Opcionales** (solo si tus PDFs son escaneados/imágenes):

```bash
source venv/bin/activate
pip install pdf2image pytesseract
brew install tesseract tesseract-lang poppler   # macOS
```

**Alternativa a Claude** (si prefieres usar OpenAI):

```bash
source venv/bin/activate
pip install openai
```

### 3. Configurar la API key

Copia el archivo de ejemplo y rellena tu clave:

```bash
cp .env.example .env
```

Edita `.env` y pon tu clave real:

```
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
```

(Si prefieres OpenAI, descomenta `OPENAI_API_KEY` y comenta la de Anthropic.)

---

## Cómo usarlo

### Opción A: Webapp (recomendado)

La forma más sencilla. No requiere terminal ni conocimientos técnicos.

```bash
cd "/Users/leoruffini/Desktop/Agente Inversor (by Claude)"
source venv/bin/activate
streamlit run app.py
```

Se abre el navegador automáticamente. Desde ahí:

1. Escribe el **nombre del inversor** y el **importe de inversión**.
2. Arrastra los **PDFs** desde tu carpeta de OneDrive.
3. Pulsa **Generar Protocolo**.
4. Descarga el **JSON** y el **Word** con un clic.

Para que otros equipos de la oficina puedan acceder desde sus ordenadores:

```bash
streamlit run app.py --server.address 0.0.0.0
```

Y acceden desde su navegador a `http://<IP-de-tu-equipo>:8501`.

---

### Opción B: Línea de comandos

#### Paso 1: Preparar la carpeta del inversor

Crea una carpeta con este formato de nombre:

```
NN NOMBRE DEL INVERSOR (IMPORTE_K)
```

Ejemplo: `08 VENTU EUROPE (240K)` significa inversor "VENTU EUROPE" con inversión de 240.000 EUR.

Dentro de la carpeta, coloca los **3 PDFs** del inversor:
- Escritura de constitución de la sociedad
- Escritura de nombramiento del órgano de administración
- Poderes del representante legal

#### Paso 2: Ejecutar el agente

```bash
cd "/Users/leoruffini/Desktop/Agente Inversor (by Claude)"
source venv/bin/activate
python3 scripts/agente_inversor.py --carpeta "08 VENTU EUROPE (240K)"
```

#### Paso 3: Recoger los resultados

Se generan en la carpeta `output/`:

| Archivo | Contenido |
|---|---|
| `VENTU_EUROPE_datos_extraidos.json` | Todos los datos societarios en formato estructurado |
| `Protocolo_Inversion_VENTU_EUROPE.docx` | Protocolo de Inversión con campos del inversor rellenados |

---

## Opciones del comando

```bash
python3 scripts/agente_inversor.py \
  --carpeta "08 VENTU EUROPE (240K)" \    # Obligatorio: carpeta del inversor
  --importe 240000 \                       # Opcional: importe en EUR (si no, lo toma del nombre)
  --llm anthropic \                        # Opcional: "anthropic" (default) o "openai"
  --template "ruta/plantilla.docx" \       # Opcional: plantilla personalizada
  --output-dir "ruta/salida"               # Opcional: directorio de salida
```

---

## Ejemplo completo paso a paso

```bash
# 1. Ir al proyecto y activar entorno
cd "/Users/leoruffini/Desktop/Agente Inversor (by Claude)"
source venv/bin/activate

# 2. Configurar API key (solo la primera vez)
cp .env.example .env
# Edita .env con tu clave real

# 3. Ejecutar
python3 scripts/agente_inversor.py --carpeta "08 VENTU EUROPE (240K)"

# 4. Abrir el resultado
open output/Protocolo_Inversion_VENTU_EUROPE.docx
```

---

## Qué datos extrae

El JSON de salida contiene:

| Sección | Campos principales |
|---|---|
| **Datos societarios** | Denominación actual y anteriores, NIF, domicilio social, objeto social, CNAE |
| **Constitución** | Notario, localidad, fecha, número de protocolo |
| **Capital social** | Importe, número de participaciones, valor nominal |
| **Datos registrales** | Registro Mercantil, tomo, folio, hoja, inscripción |
| **Órgano de administración** | Tipo (Consejo/Administrador Único), cargos y miembros |
| **Representante legal** | Nombre, DNI, cargo, domicilio |
| **Importes de inversión** | Total, tramo 30%, tramo 70% (en cifra y en texto) |

---

## Qué campos rellena en el Protocolo

El Word generado rellena automáticamente todos los campos `[*]` que corresponden al **inversor**:

- Nombre del representante legal
- Denominación de la sociedad inversora
- Domicilio social
- Datos del notario y escritura de constitución
- Registro Mercantil y NIF
- Importes de inversión (total, 30% y 70%)
- Firma del representante

Los `[*]` que quedan sin rellenar corresponden al lado **Provalix/Proyecto** (datos del vehículo de inversión, nombre del proyecto, fechas del acto), que deben completarse por separado.

---

## Resolución de problemas

> **Nota:** Los comandos `pip install` deben ejecutarse con el entorno activado (`source venv/bin/activate`).

### "No module named 'docx'"
```bash
source venv/bin/activate
pip install python-docx    # OJO: es "python-docx", no "docx"
```

### "No module named 'fitz'"
```bash
pip install PyMuPDF    # El paquete se llama PyMuPDF, el import es "fitz"
```

### "No se pudo extraer texto de X.pdf"
El PDF puede ser escaneado (imágenes en vez de texto). Instala las herramientas de OCR:
```bash
pip install pdf2image pytesseract
brew install tesseract tesseract-lang poppler
```

### "LLM 'anthropic' no disponible"
Verifica que tengas el SDK instalado y la API key en `.env`:
```bash
source venv/bin/activate
pip install anthropic
cat .env    # Debe contener ANTHROPIC_API_KEY=sk-ant-...
```

### El importe no se detecta automáticamente
Si la carpeta no sigue el formato `(240K)`, indica el importe manualmente:
```bash
python3 scripts/agente_inversor.py --carpeta "Mi Carpeta" --importe 240000
```

---

## Añadir un nuevo inversor

1. Crea la carpeta: `09 NOMBRE INVERSOR (IMPORTE_K)/`
2. Coloca los 3 PDFs dentro.
3. Ejecuta: `python3 scripts/agente_inversor.py --carpeta "09 NOMBRE INVERSOR (IMPORTE_K)"`
4. Revisa los resultados en `output/`.

---

## Limitaciones actuales

- Solo rellena los campos del **inversor** (no los de Provalix/Proyecto).
- El texto de los PDFs escaneados requiere OCR (calidad depende de la imagen).
- Textos muy largos (>150.000 caracteres) se truncan antes de enviarse al LLM.
- La conversión de números a texto es básica y cubre hasta millones.
- La webapp requiere que un equipo ejecute `streamlit run app.py` (no es una app desplegada en la nube).
