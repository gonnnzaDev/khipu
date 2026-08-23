from pydantic import BaseModel

class Party(BaseModel):
    ruc: str
    name: str = ""

class Item(BaseModel):
    code: str | None = None
    description: str
    quantity: float
    unitPrice: float

class Invoice(BaseModel):
    invoiceNumber: str
    supplier: Party
    payer: Party
    date: str = ""
    currency: str = "PEN"
    items: list[Item]
    subtotal: float
    tax: float
    total: float