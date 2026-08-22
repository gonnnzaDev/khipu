KHIPU  
 **AI-Powered Invoice Guardian**

**Propuesta técnica, producto, arquitectura y plan de ejecución — Aleph Hackathon 2026**

Versión optimizada para 48 horas | MVP demostrable | Human-in-the-loop | USD₮ Testnet

# **1\. Resumen ejecutivo**

KHIPU es un agente inteligente de control de cuentas por pagar. Recibe una factura y sus documentos de respaldo  orden de compra y guía de entrega, entiende la información mediante OCR e IA local, verifica los datos con reglas deterministas, detecta discrepancias y señales de riesgo, produce una decisión explicable y solicita autorización humana antes de preparar un pago en USD₮ sobre una red de prueba.

La propuesta mejorada prioriza una sola experiencia de extremo a extremo que funcione de manera confiable en 48 horas. El producto no pretende automatizar toda la contabilidad: resuelve un momento crítico y fácil de demostrar decidir si una factura está suficientemente respaldada para ser pagada.

Principio central: LA IA INTERPRETA → LAS REGLAS VERIFICAN → EL HUMANO AUTORIZA → LA BLOCKCHAIN REGISTRA.

# **2\. Problema**

Las cuentas por pagar suelen depender de la revisión manual de documentos que deberían coincidir entre sí. Una factura puede tener el proveedor correcto pero una cantidad incorrecta; puede coincidir con la orden pero no con lo recibido; o puede contener un total que no corresponde a sus líneas.

| Problema | Consecuencia | Respuesta de KHIPU |
| :---- | :---- | :---- |
| Revisión manual | Lentitud y errores | Extracción y comparación automática |
| Factura vs OC inconsistente | Pago indebido | Reglas de conciliación |
| Factura vs entrega inconsistente | Sobrepago | Validación contra guía |
| Duplicados | Pago repetido | Detección de duplicidad |
| IA poco explicable | Riesgo operativo | Reglas \+ explicación |
| Automatización sin control | Riesgo financiero | Aprobación humana |
| Falta de evidencia | Auditoría difícil | Log \+ hash de testnet |

# **3\. Propuesta de valor**

KHIPU reduce la fricción entre recepción de una factura y autorización del pago, entregando una decisión explicable en segundos y dejando evidencia de cómo se llegó a ella.

| Antes | Con KHIPU |
| :---- | :---- |
| Persona revisa documentos uno por uno | Sistema extrae y compara automáticamente |
| Errores se detectan tarde | Discrepancias aparecen antes del pago |
| La decisión vive en correos/chats | La decisión queda estructurada y registrada |
| Automatización puede ser opaca | Cada regla produce una explicación |
| Pago y revisión están separados | Validación → aprobación → pago en un flujo |

# **4\. Qué NO es KHIPU**

●   	No es un ERP.  
●   	No es un sistema contable completo.  
●   	No es un detector de fraude infalible.  
●   	No permite que un LLM autorice pagos por sí mismo.  
●   	No utiliza dinero real en la demo.  
●   	No intenta construir un frontend complejo durante el hackathon.

# **5\. MVP competitivo para 48 horas**

Para evitar sobrealcance, el MVP queda limitado a seis capacidades que deben funcionar de punta a punta:

1\.      Cargar factura \+ OC \+ guía.  
2\.      Extraer y normalizar la información.  
3\.      Conciliar documentos con reglas deterministas.  
4\.      Generar semáforo, score y explicación.  
5\.      Obtener aprobación humana.  
6\.      Preparar/enviar un pago USD₮ en testnet y mostrar su hash.

La detección avanzada, aprendizaje y analítica adicional se mantienen como extensiones, no como dependencias del demo.

# **6\. Experiencia de usuario**

La demo debe sentirse como una operación real y no como una colección de scripts.

7\.      Usuario selecciona factura, OC y guía.  
8\.      KHIPU procesa los documentos.  
9\.      Aparece un resumen de lo encontrado.  
10\.    El motor muestra coincidencias y discrepancias.  
11\.    Aparece el semáforo.  
12\.    El usuario revisa la explicación.  
13\.    El usuario aprueba o rechaza.  
14\.    Si aprueba, se muestra preview de pago.  
15\.    Se ejecuta la transacción de prueba.  
16\.    KHIPU muestra hash, estado y evidencia.

El tiempo objetivo de la demo es inferior a 60–90 segundos desde la carga hasta la decisión, excluyendo esperas externas de red.

# **7\. Arquitectura**

FACTURA/PDF/PNG \+ OC.json \+ GUIA.json  
 ↓  
 OCR LOCAL  
 ↓  
 EXTRACTOR LLM LOCAL  
 ↓  
 ZOD / NORMALIZACIÓN  
 ↓  
 CONCILIACIÓN DETERMINISTA  
 ↓  
 ANOMALÍAS \+ SCORE  
 ↓  
 SEMÁFORO \+ EXPLICACIÓN  
 ↓  
 APROBACIÓN HUMANA  
 ↓  
 PAYMENT PREVIEW  
 ↓  
 WDK / USD₮ TESTNET  
 ↓  
 HASH \+ COMPROBANTE  
 ↓  
 RUN LOG \+ MÉTRICAS

## **Separación crítica**

| Capa | Puede usar IA? | Puede decidir pago? |
| :---- | :---- | :---- |
| OCR | Sí, si es local | No |
| Extracción | Sí | No |
| Conciliación | No; determinista | No |
| Score | No; reglas reproducibles | No |
| Humano | No | Sí |
| WDK | No | Solo después de autorización |

# **8\. Stack cerrado**

| Tecnología | Uso |
| :---- | :---- |
| Node 22.18 \+ ESM | Runtime |
| TypeScript \+ tsx | Código y ejecución |
| commander | CLI |
| picocolors | Semáforo/estados |
| @clack/prompts | Confirmación humana |
| zod | Validación de estructuras |
| @qvac/sdk | OCR local según documentación |
| LLM local | Extracción estructurada |
| @tetherto/wdk | Pago en testnet según documentación |
| Git | Versionamiento |

Regla: no inventar métodos de SDK. La versión instalada y su documentación son la fuente de verdad.

# **9\. Contratos de datos**

El modelo de factura debe representar como mínimo: invoiceNumber, supplier, date, currency, items\[\], subtotal, tax y total. Cada item: description, quantity, unitPrice y, si existe, código.

## **Resultado de conciliación**

El resultado debe ser estructurado: score, status, checks\[\], discrepancies\[\], riskFlags\[\], recommendation y metadata.

| Check | Ejemplo |
| :---- | :---- |
| supplier\_match | Proveedor factura \= proveedor OC |
| quantity\_match | Cantidad facturada compatible con OC/guía |
| price\_match | Precio dentro de tolerancia |
| subtotal\_math | Suma de líneas \= subtotal |
| total\_math | Subtotal \+ impuesto \= total |
| duplicate\_invoice | Factura no repetida |
| delivery\_match | Guía respalda cantidad |

# **10\. OCR local**

Objetivo: recuperar texto, no tomar decisiones.

●   	Entrada: JPG/PNG o imagen derivada de PDF.  
●   	Salida: texto y confianza cuando el SDK la entregue.  
●   	Prueba mínima: dos fotos reales y una entrada problemática.  
●   	Error controlado: OCR\_ERROR; nunca continuar silenciosamente con datos inexistentes.

Definition of Done: dos facturas reales procesadas correctamente, salida legible y error controlado para imagen no válida.

# **11\. Extracción con LLM local**

El LLM transforma el texto OCR en un objeto estructurado. Debe recibir instrucciones estrictas y producir JSON.

17\.    Prompt de extracción.  
18\.    Parseo JSON.  
19\.    Validación Zod.  
20\.    Hasta dos reintentos controlados.  
21\.    Si falla: EXTRACTION\_ERROR y bloqueo.

El modelo no calcula ni decide el pago. Los cálculos monetarios y las comparaciones se realizan después con código.

## **Guardrails**

●   	No aceptar texto fuera del JSON.  
●   	No inventar valores faltantes.  
●   	Registrar versión/modelo.  
●   	Conservar evidencia del OCR.  
●   	Separar valor extraído de valor calculado.

# **12\. Conciliación determinista**

La conciliación es el corazón de confiabilidad de KHIPU. Debe ser reproducible, explicable y testeable.

| Regla | Ejemplo de fallo |
| :---- | :---- |
| Proveedor | Factura: A / OC: B |
| Cantidad | Factura: 12 / OC: 10 |
| Precio | Factura: 110 / OC: 100 |
| Subtotal | Líneas suman 1.000 / subtotal 1.100 |
| Impuesto | Subtotal \+ impuesto no coincide con total |
| Guía | Recibido 8 / facturado 10 |
| Duplicado | Mismo proveedor \+ número ya procesado |

Todas las reglas deben devolver PASS, REVIEW o FAIL con evidencia. Las tolerancias deben ser configurables y documentadas.

# **13\. Detección de anomalías**

Versión MVP: reglas explicables. Una versión futura puede incorporar modelos estadísticos.

●   	Duplicado de factura.  
●   	Cantidad superior a OC.  
●   	Precio fuera de tolerancia.  
●   	Proveedor inconsistente.  
●   	Guía incompatible.  
●   	Moneda inesperada.  
●   	Campos críticos ausentes.  
●   	Aritmética inconsistente.

KHIPU debe decir 'señal de riesgo' y no 'fraude confirmado'.

# **14\. Score y semáforo**

El score debe ser un score de validación, no una probabilidad estadística, salvo que se calibre y demuestre lo contrario.

| Score | Estado | Acción |
| :---- | :---- | :---- |
| 90–100 | 🟢 VERDE | Puede pasar a aprobación humana |
| 70–89 | 🟡 AMARILLO | Revisión obligatoria; override con motivo |
| 0–69 | 🔴 ROJO | Bloquear pago |

Ejemplo: una cantidad inconsistente puede restar más que un campo secundario ausente. Las penalizaciones deben definirse antes de la demo y cubrirse con pruebas.

# **15\. Explicación de decisión**

No mostrar solamente '96%'. Mostrar el razonamiento.

🟢 FACTURA APROBABLE — 96/100  
 ✓ Proveedor coincide  
 ✓ OC coincide  
 ✓ 10/10 unidades respaldadas  
 ✓ Precio coincide  
 ✓ Subtotal correcto  
 ✓ Impuesto correcto  
 ✓ Total correcto  
 ✓ No duplicada

 RECOMENDACIÓN: continuar a aprobación humana.

Para un caso rojo: '🔴 BLOQUEADA — 54/100. Se facturan 12 unidades; OC autoriza 10\. Diferencia: \+2 unidades. El pago queda bloqueado.'

# **16\. Human-in-the-loop**

La regla de seguridad es innegociable: la IA propone; el motor verifica; el humano autoriza.

| Estado | Siguiente paso |
| :---- | :---- |
| VERDE | Solicitar aprobación |
| AMARILLO | Solicitar revisión y motivo |
| ROJO | Bloquear |
| REJECTED | Finalizar sin pago |
| APPROVED | Permitir payment preview |
| PAYMENT\_PREVIEW | Mostrar destino/monto/red |
| PAYMENT\_SENT | Guardar hash/estado |

Nunca guardar claves privadas en Git. Usar variables de entorno y únicamente activos de prueba.

# **17\. WDK y USD₮**

La parte Web3 debe ser el cierre de la historia, no el centro de la complejidad. Implementar únicamente las funciones realmente disponibles en la versión de WDK que use el equipo.

22\.    Validar configuración de testnet.  
23\.    Preparar preview.  
24\.    Mostrar monto, destino y red.  
25\.    Pedir confirmación humana.  
26\.    Enviar transacción.  
27\.    Capturar hash/estado.  
28\.    Mostrar comprobante.

Si WDK se retrasa, la demo debe seguir funcionando hasta PAYMENT\_PREVIEW; el pago es un módulo desacoplado.

# **18\. Fallback técnico**

El MVP debe tener una estrategia de recuperación para no perder el hackathon por un SDK externo:

●   	Si WDK funciona: demo completa con hash.  
●   	Si WDK presenta una incidencia de entorno: mostrar preview real y estado de integración, manteniendo la decisión y auditoría funcionando.  
●   	Nunca simular una transacción real como si hubiera ocurrido.

La presentación debe ser transparente sobre qué fue ejecutado realmente.

# **19\. CLI**

Comando principal recomendado:  
 khupu validate \--invoice ./data/invoice.png \--oc ./data/oc.json \--guide ./data/guide.json

Comandos secundarios:  
 khupu reconcile ...  
 khupu pay ...  
 khupu report ...

La CLI es el producto. No gastar horas construyendo Next.js, Express o un monorepo.

# **20\. Estructura del repositorio**

khupu/  
   src/  
 	cli.ts  
 	ocr.ts  
 	extract.ts  
 	schema.ts  
 	reconcile.ts  
 	anomalies.ts  
 	score.ts  
 	pay.ts  
 	report.ts  
 	types.ts  
   tests/  
 	reconcile.test.ts  
 	extract.test.ts  
 	score.test.ts  
   data/  
 	invoices/  
 	oc/  
 	guides/  
 	ground-truth/  
   runs/  
   README.md  
   package.json  
   tsconfig.json  
   .env.example

# **21\. Plan de 48 horas**

| Etapa | Prioridad | Definition of Done |
| :---- | :---- | :---- |
| A — OCR | P0 | 2 fotos reales → texto \+ confianza/error |
| B — Extract | P0 | 3 facturas → JSON válido por Zod |
| C — Reconcile | P0 | Ground truth → pruebas verdes |
| D — CLI | P0 | Flujo A+B+C \+ semáforo |
| E — Pay | P1 | Preview \+ aprobación \+ testnet \+ hash |
| F — Report | P1 | Métricas y README |
| Demo | P0 | Caso verde \+ caso rojo \+ aprobación/pago |

## **Estrategia de tiempo**

29\.    Primero hacer que A+B+C funcionen independientemente.  
30\.    Después integrar D.  
31\.    Solo con D verde invertir tiempo en WDK.  
32\.    Reportar métricas en paralelo.  
33\.    Últimas horas: estabilizar, probar y preparar demo; no añadir funcionalidades grandes.

# **22\. Dataset y ground truth**

El dataset debe contener casos normales y casos problemáticos que el equipo no haya seleccionado solo por facilidad.

●   	Factura correcta.  
●   	Cantidad incorrecta.  
●   	Precio incorrecto.  
●   	Total incorrecto.  
●   	Duplicado.  
●   	Proveedor inconsistente.  
●   	Guía incompleta.  
●   	OCR difícil.  
●   	Campos faltantes.

Cada caso debe tener una expectativa conocida para poder calcular métricas.

# **23\. Métricas**

| Métrica | Objetivo |
| :---- | :---- |
| Exactitud de extracción | Qué porcentaje de campos se extrae correctamente |
| Exactitud de conciliación | Casos correctamente clasificados |
| Falsos positivos | Casos correctos marcados como riesgo |
| Falsos negativos | Casos problemáticos que pasan |
| Bloqueo correcto | Problemas bloqueados correctamente |
| Tiempo de decisión | Tiempo de entrada a resultado |
| Intervención humana | Porcentaje que requiere revisión |

En el pitch mostrar solo 3–4 métricas claras; el README puede contener el detalle.

# **24\. Casos de demo**

| Caso | Resultado |
| :---- | :---- |
| Factura perfecta | 🟢 96+ → aprobación → pago testnet |
| Cantidad 12 vs OC 10 | 🔴 → bloqueo |
| Factura duplicada | 🔴 → bloqueo |
| Total incorrecto | 🔴 → bloqueo |
| Caso ambiguo | 🟡 → revisión/override con motivo |
| LLM JSON inválido | Reintentos → error seguro |
| Usuario rechaza | Sin pago |

# **25\. Seguridad y privacidad**

●   	Procesamiento local de documentos en el MVP.  
●   	No exponer datos sensibles innecesariamente.  
●   	Secretos fuera del repositorio.  
●   	Logs sin PII innecesaria.  
●   	Testnet para pago.  
●   	Fail closed ante errores.  
●   	No usar una salida del LLM como autorización financiera.  
●   	Validar red, token, monto y destino antes del envío.

# **26\. Roles del equipo**

| Rol | Responsabilidades |
| :---- | :---- |
| Data/Validation | Schemas, ground truth, conciliación, score, métricas |
| AI/OCR | OCR, prompt, LLM, retries |
| CLI/Integration | Commander, Clack, Picocolors, integración |
| Web3 | WDK, wallet, testnet, preview, hash |
| Todos | Pruebas, documentación, pitch y demo |

Para Luis Guillermo, la posición recomendada es Data/Validation con apoyo en IA/ETL. Es donde puede aportar experiencia inmediatamente y aprender la parte WDK sin bloquear al equipo.

# **27\. Pitch de 60 segundos**

“Las empresas no deberían pagar una factura solo porque un documento parece correcto. KHIPU es un Invoice Guardian que verifica la factura contra la orden de compra y la evidencia de entrega. La IA local entiende los documentos, pero no toma la decisión financiera. Un motor determinista verifica proveedor, cantidades, precios, impuestos, totales y duplicados. KHIPU explica cada discrepancia y genera un score de validación. Si el caso es correcto, una persona autoriza el pago. Solo entonces preparamos y ejecutamos USD₮ en una red de prueba mediante WDK y guardamos la evidencia de la transacción. En resumen: la IA interpreta, las reglas verifican, el humano autoriza y blockchain registra.”

# **28\. Pitch de 20 segundos**

“KHIPU verifica facturas antes de pagar: IA para entender, reglas para conciliar, humano para autorizar y blockchain para dejar evidencia. Detecta discrepancias entre factura, orden y entrega y bloquea pagos cuando algo no cuadra.”

# **29\. Diferenciadores**

| Diferenciador | Por qué importa |
| :---- | :---- |
| IA local | Privacidad y menor dependencia externa en el procesamiento |
| Determinismo financiero | Evita que una alucinación del LLM autorice dinero |
| Human-in-the-loop | Control humano explícito |
| Explicabilidad | Cada bloqueo tiene una razón |
| Web3 | Pago y evidencia verificable |
| Ground truth | La calidad se mide, no se afirma |
| CLI-first | Viable en 48 horas |

# **30\. Roadmap posterior al hackathon**

●   	Integración con ERP/AP.  
●   	Proveedores y catálogos reales.  
●   	OCR especializado por país/idioma.  
●   	Detección estadística de anomalías.  
●   	Panel web de auditoría.  
●   	Políticas de aprobación por monto.  
●   	Multi-moneda.  
●   	Reportes de auditoría y exportación.  
●   	Integración con otras redes/tokens cuando sea apropiado.

# **31\. Riesgos**

| Riesgo | Probabilidad | Mitigación |
| :---- | :---- | :---- |
| OCR/SDK falla | Media | Probar primero y aislar adapter |
| LLM produce JSON inválido | Media | Zod \+ retries \+ bloqueo |
| Reglas incompletas | Media | Ground truth \+ pruebas |
| WDK tarda | Alta | P1; integrar después de CLI estable |
| Alcance excesivo | Alta | No frontend complejo; P0/P1 |
| Demo inestable | Media | Dataset reproducible \+ casos preparados |
| Seguridad de claves | Alta | Variables de entorno; testnet |

# **32\. Definition of Done del producto**

●   	Una factura real de prueba puede recorrer todo el pipeline.  
●   	Los datos extraídos pasan Zod.  
●   	La conciliación es determinista y testeada.  
●   	Existen casos verde, amarillo y rojo.  
●   	Las discrepancias se explican en lenguaje claro.  
●   	Un rojo no puede llegar a pago.  
●   	Un amarillo exige revisión.  
●   	Un verde exige aprobación humana.  
●   	Payment preview muestra monto/destino/red.  
●   	El pago, si se ejecuta, es en testnet.  
●   	Se guarda el hash real de la transacción.  
●   	Se generan métricas contra ground truth.  
●   	README permite reproducir la demo.

# **33\. Checklist del equipo antes de codificar**

●   	Confirmar reto/categoría oficial del hackathon.  
●   	Confirmar reglas de uso de código y SDK.  
●   	Confirmar versiones de Node y paquetes.  
●   	Confirmar documentación de qvac y WDK.  
●   	Confirmar red/testnet y token.  
●   	Recibir ground truth.  
●   	Repartir roles.  
●   	Crear repositorio desde la hora oficial permitida.  
●   	Definir contratos de datos antes de integrar.

# **34\. Recomendación estratégica**

KHIPU es una propuesta viable y con alto potencial de demo, pero solo si se protege el alcance. El error sería intentar construir una plataforma empresarial completa. La versión competitiva es una única experiencia de 60–90 segundos que resuelve un problema real y deja evidencia.

Si el reto oficial del hackathon cambia el foco, KHIPU debe adaptarse al reto sin perder su núcleo: documentos → verificación → decisión explicable → aprobación → evidencia.

La prioridad no es tener más funcionalidades que otros equipos. Es tener una historia clara, una demo estable, una arquitectura defendible y evidencia de que el sistema realmente funciona.

 

