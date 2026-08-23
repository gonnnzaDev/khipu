import json

try:
    from tetherto.qvac_sdk import Client, load_model, completion, unload_model
    from tetherto.qvac_sdk.models import QWEN3VL_2B_MULTIMODAL_Q4_K
except ModuleNotFoundError:
    Client = None
    load_model = None
    completion = None
    unload_model = None
    QWEN3VL_2B_MULTIMODAL_Q4_K = None

prompt = """
        Extrae todo el texto visible de la imagen y conviértelo a texto plano.

        - Respeta el contenido original.
        - Mantén, en lo posible, el orden y la estructura del texto.
        - No inventes información.
        - Si hay tablas, conserva su estructura de forma clara.
        - Si algún texto no se puede leer, indícalo como [ilegible].
        - Devuelve únicamente el texto extraído, sin explicaciones adicionales.

        """

formato_prompt = """
Recibís un JSON con datos de un ticket/factura.
Tu tarea: devolver ese mismo contenido con formato prolijo y legible para una persona.

Reglas:
- Usá secciones claras con títulos (Emisor, Cliente, Items, Totales).
- Alineá los montos y destacá el total final.
- NO inventes, NO agregues ni modifiques ningún dato: usá exactamente los valores del JSON.
- NO devuelvas JSON: devolvé únicamente texto plano formateado, sin explicaciones adicionales.
"""


async def extraer_datos_imagen_ocr(archivo):
    if Client is None:
        raise RuntimeError("QVAC SDK no está instalado. Instalar tetherto.qvac_sdk para OCR real.")

    async with Client() as client:

        t = None
        model_id = None
        final = None
 
        try:

            t = client.transport
            model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)
            final = None

            run = completion(t, model_id=model_id,
                history=[{"role":"user","content":prompt,"attachments":[{"path":archivo}]}],
                response_format={"type":"text"})

            final = await run.final
            return final.content_text
        finally: 
            if t is not None and model_id is not None:
                await unload_model(t, model_id=model_id)


async def transformar_ticket(datos):
    """Recibe un JSON (dict), la IA local lo formatea lindo y devuelve el texto."""
    if Client is None:
        raise RuntimeError("QVAC SDK no está instalado. Instalar tetherto.qvac_sdk para formatear comprobantes.")

    async with Client() as client:

        t = None
        model_id = None

        try:
            t = client.transport
            model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)

            run = completion(t, model_id=model_id,
                history=[{"role":"user","content":
                    f"{formato_prompt}\n\nJSON:\n{json.dumps(datos, ensure_ascii=False, indent=2)}"}],
                response_format={"type":"text"})

            final = await run.final
            return final.content_text
        finally:
            if t is not None and model_id is not None:
                await unload_model(t, model_id=model_id)
