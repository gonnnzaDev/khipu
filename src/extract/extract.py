import json

from tetherto.qvac_sdk import Client

from src.ocr.ocr import extraer_datos_imagen_ocr
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
        Te paso una factura. Extrae los datos y devolvelos
        EXCLUSIVAMENTE en formato JSON válido.
        No agregues explicaciones ni texto fuera del JSON.
        Si un dato no aparece en la factura, utiliza null.
        {format_output}
        """


async def estructurar_texto_a_json(factura):
    
    async with Client() as client:
        
        t = None
        model_id = None
        final = None

        try:
            datos = await extraer_datos_imagen_ocr(factura)
            t = client.transport
            final = None

            model_id = await load_model(t, model_src=QWEN3VL_2B_MULTIMODAL_Q4_K.src)

            run = completion(t, model_id=model_id,
                history=[{"role":"user",
                          "content":f"""{prompt}
                Texto extraído de la factura: 
                --------------------------------------
                {datos}
                --------------------------------------
                """}],
                response_format={"type":"json_object"})

            final = await run.final
            return json.loads(final.content_text)

        except json.JSONDecodeError as e:
            txt = final.content_text[:500] if final else "sin respuesta del modelo"
            raise ValueError(f"JSON inválido: {txt}") from e
        

        finally: 
            if t is not None and model_id is not None:
                await unload_model(t, model_id=model_id)



