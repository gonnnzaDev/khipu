from pathlib import Path

from tetherto.qvac_sdk import Client, load_model, completion, unload_model
from tetherto.qvac_sdk.models import QWEN3VL_2B_MULTIMODAL_Q4_K

prompt = """
        Extrae todo el texto visible de la imagen y conviértelo a texto plano.

        - Respeta el contenido original.
        - Mantén, en lo posible, el orden y la estructura del texto.
        - No inventes información.
        - Si hay tablas, conserva su estructura de forma clara.
        - Si algún texto no se puede leer, indícalo como [ilegible].
        - Devuelve únicamente el texto extraído, sin explicaciones adicionales.

        """

async def extraer_datos_imagen_ocr(archivo):
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
        






    
    


