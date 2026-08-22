import json
from pathlib import Path

from tetherto.qvac_sdk import Client, load_model, completion, unload_model
from tetherto.qvac_sdk.models import QWEN3VL_2B_MULTIMODAL_Q4_K

format_output = """
{
    "tipo_comprobante": "tipo de comprobante, por ejemplo FACTURA ELECTRÓNICA",
    "serie": "serie del comprobante",
    "numero": "número del comprobante",

    "emisor": {
        "razon_social": "razón social del emisor",
        "ruc": "RUC del emisor",
        "direccion": "dirección del emisor"
    },

    "cliente": {
        "razon_social": "razón social del cliente",
        "ruc": "RUC del cliente",
        "direccion": "dirección del cliente"
    },

    "fecha_emision": "fecha de emisión en formato YYYY-MM-DD",
    "fecha_vencimiento": "fecha de vencimiento en formato YYYY-MM-DD",

    "moneda": "moneda utilizada en la factura",

    "items": [
        {
            "codigo": "código del producto o servicio",
            "descripcion": "descripción del producto o servicio",
            "cantidad": "cantidad facturada",
            "precio_unitario": "precio unitario",
            "descuento": "descuento aplicado",
            "total": "importe total del item"
        }
    ],

    "totales": {
        "subtotal": "subtotal antes de impuestos",
        "igv": "importe correspondiente al IGV",
        "total": "importe total de la factura"
    },

    "observaciones": "observaciones adicionales de la factura",
    "estado": "estado de la factura, si está indicado"
}
"""

prompt = f"""
        Te paso una factura. Extrae los datos de la imagen 
        EXCLUSIVAMENTE en formato JSON válido.
        No agregues explicaciones ni texto fuera del JSON.
        Si un dato no aparece en la factura, utiliza null.
        ´´´json
        {format_output}
        ´´´
        """

async def extraer_datos_imagen_ocr(archivo):
    async with Client() as client:
        t = client.transport
        model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)
        run = completion(t, model_id=model_id,
            history=[{"role":"user","content":prompt,"attachments":[{"path":archivo}]}],
            response_format={"type":"text"})
        final = await run.final
        return final.content_text


async def ocr_factura(archivo):
    async with Client() as client:
        t = client.transport
        model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)
        final = None

        try:
            run = completion(t, model_id=model_id,
                history=[{"role":"user","content":prompt,"attachments":[{"path":archivo}]}],
                response_format={"type":"json_object"})
            final = await run.final
            return final.content_text
        except json.JSONDecodeError as e:
            txt = final.content_text[:500] if final else "sin respuesta del modelo"
            raise ValueError(f"JSON inválido: {txt}") from e
            #lo puse para que tenga una excepcion clara
        finally:
            await unload_model(t, model_id=model_id)

        






    
    


