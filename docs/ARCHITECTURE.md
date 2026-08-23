
## 📄 2. `docs/ARCHITECTURE.md`

```markdown
# 🏗️ Khipu Architecture

## High-Level Flow

```mermaid
flowchart LR
    A[📄 Invoice<br/>Photo/PDF] --> B[FastAPI<br/>/validate]
    C[📋 Purchase Order<br/>JSON] --> B
    D[🚚 Delivery Guide<br/>JSON] --> B
    
    B --> E[OCR Layer<br/>extraer_datos_imagen_ocr]
    E --> F[QVAC SDK<br/>QWEN3VL-2B Q4_K]
    F --> G[Normalize<br/>src/normalize/]
    
    G --> H[Reconcile<br/>7 checks]
    H --> I{Decision}
    
    I -->|Score ≥ 90| J[🟢 APPROVE]
    I -->|Score 70-89| K[🟡 REVIEW]
    I -->|Score < 70| L[🔴 BLOCK]
    
    J --> M[/pay<br/>MetaMask USDT]
