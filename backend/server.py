import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SHOP_ID = "mayank_store"


# ---------- Models ----------
class PinIn(BaseModel):
    pin: str = Field(pattern=r"^[0-9]{4}$")


class PinChangeIn(BaseModel):
    current_pin: str = Field(pattern=r"^[0-9]{4}$")
    new_pin: str = Field(pattern=r"^[0-9]{4}$")


class PartyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=200)
    firm_name: Optional[str] = Field(default=None, max_length=120)
    contact_person: Optional[str] = Field(default=None, max_length=80)
    gst_number: Optional[str] = Field(default=None, max_length=20)
    # Opening balance in INR. Positive => party owes shop (receivable);
    # Negative => shop owes party (payable). Zero if no opening balance.
    opening_balance: float = 0.0


class PartyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=200)
    firm_name: Optional[str] = Field(default=None, max_length=120)
    contact_person: Optional[str] = Field(default=None, max_length=80)
    gst_number: Optional[str] = Field(default=None, max_length=20)


class Party(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    firm_name: Optional[str] = None
    contact_person: Optional[str] = None
    gst_number: Optional[str] = None
    balance: float = 0.0
    last_transaction_at: Optional[str] = None
    created_at: str


class TransactionCreate(BaseModel):
    party_id: str
    type: Literal["gave", "got"]
    amount: float = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=200)
    date: Optional[str] = None  # ISO date string, defaults to now


class Transaction(BaseModel):
    id: str
    party_id: str
    type: Literal["gave", "got"]
    amount: float
    note: Optional[str] = None
    date: str
    created_at: str


class Summary(BaseModel):
    total_receivable: float
    total_payable: float
    net: float
    party_count: int
    transaction_count: int


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def compute_balance(party_id: str) -> tuple[float, Optional[str]]:
    """Positive balance = party owes shop (receivable). Negative = shop owes party (payable)."""
    cursor = db.transactions.find({"party_id": party_id}, {"_id": 0})
    balance = 0.0
    last_date: Optional[str] = None
    async for t in cursor:
        if t["type"] == "gave":
            balance += t["amount"]  # shop gave money, party owes back
        else:
            balance -= t["amount"]  # shop got money
        d = t.get("date") or t.get("created_at")
        if d and (last_date is None or d > last_date):
            last_date = d
    return balance, last_date


# ---------- Auth ----------
@api.get("/auth/status")
async def auth_status():
    doc = await db.shop_settings.find_one({"shop_id": SHOP_ID}, {"_id": 0})
    return {"pin_set": bool(doc and doc.get("pin_hash"))}


@api.post("/auth/setup-pin")
async def setup_pin(body: PinIn):
    existing = await db.shop_settings.find_one({"shop_id": SHOP_ID}, {"_id": 0})
    if existing and existing.get("pin_hash"):
        raise HTTPException(status_code=409, detail="PIN already set")
    await db.shop_settings.update_one(
        {"shop_id": SHOP_ID},
        {"$set": {"pin_hash": pwd.hash(body.pin), "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}

@app.post("/api/auth/reset-pin")
async def reset_pin():
    # TODO: remove the saved PIN

    global SETTINGS

    SETTINGS["pin_hash"] = None

    return {
        "ok": True
    }
    
@api.post("/auth/verify-pin")
async def verify_pin(body: PinIn):
    doc = await db.shop_settings.find_one({"shop_id": SHOP_ID}, {"_id": 0})
    if not doc or not doc.get("pin_hash"):
        raise HTTPException(status_code=404, detail="PIN not set")
    if not pwd.verify(body.pin, doc["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return {"ok": True}


@api.post("/auth/change-pin")
async def change_pin(body: PinChangeIn):
    doc = await db.shop_settings.find_one({"shop_id": SHOP_ID}, {"_id": 0})
    if not doc or not pwd.verify(body.current_pin, doc["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid current PIN")
    await db.shop_settings.update_one(
        {"shop_id": SHOP_ID},
        {"$set": {"pin_hash": pwd.hash(body.new_pin), "updated_at": now_iso()}},
    )
    return {"ok": True}

@app.post("/api/auth/reset-pin")
async def reset_pin():
    await db.shop_settings.update_one(
        {"shop_id": SHOP_ID},
        {
            "$set": {
                "pin_hash": None,
                "updated_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    return {"ok": True}

# ---------- Parties ----------
@api.get("/parties", response_model=List[Party])
async def list_parties(search: Optional[str] = None):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    cursor = db.parties.find(query, {"_id": 0}).sort("name", 1)
    parties = []
    async for p in cursor:
        balance, last_date = await compute_balance(p["id"])
        parties.append(Party(
            id=p["id"],
            name=p["name"],
            phone=p.get("phone"),
            address=p.get("address"),
            firm_name=p.get("firm_name"),
            contact_person=p.get("contact_person"),
            gst_number=p.get("gst_number"),
            balance=balance,
            last_transaction_at=last_date,
            created_at=p["created_at"],
        ))
    # Sort by last activity desc (parties with balance first)
    parties.sort(key=lambda x: (x.last_transaction_at or ""), reverse=True)
    return parties


@api.post("/parties", response_model=Party)
async def create_party(body: PartyCreate):
    party_id = str(uuid.uuid4())
    created = now_iso()
    doc = {
        "id": party_id,
        "name": body.name.strip(),
        "phone": body.phone.strip() if body.phone else None,
        "address": body.address.strip() if body.address else None,
        "firm_name": body.firm_name.strip() if body.firm_name else None,
        "contact_person": body.contact_person.strip() if body.contact_person else None,
        "gst_number": body.gst_number.strip().upper() if body.gst_number else None,
        "created_at": created,
    }
    await db.parties.insert_one(dict(doc))

    # If opening balance provided, create a seed transaction so balance is reflected.
    ob = float(body.opening_balance or 0.0)
    if ob != 0.0:
        tx = {
            "id": str(uuid.uuid4()),
            "party_id": party_id,
            # Positive => shop is owed => "gave" (shop gave earlier, now to receive)
            # Negative => shop owes => "got" (party gave earlier, now to pay back)
            "type": "gave" if ob > 0 else "got",
            "amount": abs(ob),
            "note": "Opening balance",
            "date": created,
            "created_at": created,
        }
        await db.transactions.insert_one(dict(tx))

    balance, last_date = await compute_balance(party_id)
    return Party(
        id=party_id,
        name=doc["name"],
        phone=doc["phone"],
        address=doc["address"],
        firm_name=doc["firm_name"],
        contact_person=doc["contact_person"],
        gst_number=doc["gst_number"],
        balance=balance,
        last_transaction_at=last_date,
        created_at=created,
    )


@api.get("/parties/{party_id}", response_model=Party)
async def get_party(party_id: str):
    p = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")
    balance, last_date = await compute_balance(party_id)
    return Party(
        id=p["id"],
        name=p["name"],
        phone=p.get("phone"),
        address=p.get("address"),
        firm_name=p.get("firm_name"),
        contact_person=p.get("contact_person"),
        gst_number=p.get("gst_number"),
        balance=balance,
        last_transaction_at=last_date,
        created_at=p["created_at"],
    )


@api.patch("/parties/{party_id}", response_model=Party)
async def update_party(party_id: str, body: PartyUpdate):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.parties.update_one({"id": party_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    return await get_party(party_id)


@api.delete("/parties/{party_id}")
async def delete_party(party_id: str):
    result = await db.parties.delete_one({"id": party_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    await db.transactions.delete_many({"party_id": party_id})
    return {"ok": True}


# ---------- Transactions ----------
@api.get("/parties/{party_id}/transactions", response_model=List[Transaction])
async def list_party_transactions(party_id: str):
    cursor = db.transactions.find({"party_id": party_id}, {"_id": 0}).sort("date", -1)
    return [Transaction(**t) async for t in cursor]


@api.post("/transactions", response_model=Transaction)
async def create_transaction(body: TransactionCreate):
    p = await db.parties.find_one({"id": body.party_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")
    tx_id = str(uuid.uuid4())
    date = body.date or now_iso()
    doc = {
        "id": tx_id,
        "party_id": body.party_id,
        "type": body.type,
        "amount": float(body.amount),
        "note": body.note.strip() if body.note else None,
        "date": date,
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(dict(doc))
    return Transaction(**doc)


@api.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    result = await db.transactions.delete_one({"id": tx_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"ok": True}


# ---------- Summary / Reminders ----------
@api.get("/summary", response_model=Summary)
async def get_summary():
    total_receivable = 0.0
    total_payable = 0.0
    party_count = 0
    async for p in db.parties.find({}, {"_id": 0, "id": 1}):
        party_count += 1
        bal, _ = await compute_balance(p["id"])
        if bal > 0:
            total_receivable += bal
        elif bal < 0:
            total_payable += -bal
    tx_count = await db.transactions.count_documents({})
    return Summary(
        total_receivable=round(total_receivable, 2),
        total_payable=round(total_payable, 2),
        net=round(total_receivable - total_payable, 2),
        party_count=party_count,
        transaction_count=tx_count,
    )


@api.get("/reminders", response_model=List[Party])
async def get_reminders():
    """Parties who owe the shop money (receivables)."""
    parties = await list_parties()
    return [p for p in parties if p.balance > 0]


@api.get("/report/monthly")
async def monthly_report(year: int, month: int):
    """Return aggregated data for a given month for PDF generation on client."""
    start = datetime(year, month, 1, tzinfo=timezone.utc).isoformat()
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc).isoformat()

    cursor = db.transactions.find(
        {"date": {"$gte": start, "$lt": end}}, {"_id": 0}
    ).sort("date", 1)

    party_map = {}
    async for p in db.parties.find({}, {"_id": 0}):
        party_map[p["id"]] = p["name"]

    rows = []
    total_gave = 0.0
    total_got = 0.0
    async for t in cursor:
        rows.append({
            "date": t["date"],
            "party_name": party_map.get(t["party_id"], "Unknown"),
            "type": t["type"],
            "amount": t["amount"],
            "note": t.get("note") or "",
        })
        if t["type"] == "gave":
            total_gave += t["amount"]
        else:
            total_got += t["amount"]

    return {
        "year": year,
        "month": month,
        "rows": rows,
        "total_gave": round(total_gave, 2),
        "total_got": round(total_got, 2),
        "net": round(total_gave - total_got, 2),
    }


@api.get("/")
async def root():
    return {"app": "Mayank Store Khata", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
