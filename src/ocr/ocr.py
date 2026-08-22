import json
from pathlib import Path

from tetherto.qvac_sdk import Client, load_model, completion, unload_model
from tetherto.qvac_sdk.models import QWEN3VL_2B_MULTIMODAL_Q4_K

promt = f"""
        Te paso una factura. Extrae los datos de la imagen 
        """

async def ocr_factura(archivo):
    async with Client() as client:
        t = client.transport
        model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)
        final = None

        try:
            run = completion(t, model_id=model_id,
                history=[{"role":"user","content":promt,"attachments":[{"path":archivo}]}],
                response_format={"type":"json_object"})
            final = await run.final
            return final.content_text
        except json.JSONDecodeError as e:
            txt = final.content_text[:500] if final else "sin respuesta del modelo"
            raise ValueError(f"JSON inválido: {txt}") from e
            #lo puse para que tenga una excepcion clara
        finally:
            await unload_model(t, model_id=model_id)

        






    
    


