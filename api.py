"""
Bank SMS NER FastAPI Service

This module provides a REST API for extracting financial entities
from Indian bank SMS messages using a trained spaCy NER model.

Endpoints:
    POST /extract - Extract entities from SMS text
    GET /health - Health check endpoint
    GET / - API information

Usage:
    uvicorn api:app --reload --host 0.0.0.0 --port 8000

Example Request:
    curl -X POST "http://localhost:8000/extract" \
         -H "Content-Type: application/json" \
         -d '{"sms": "HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024"}'
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import spacy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import database functions
from database import (
    init_database, add_transaction, get_all_transactions,
    get_transaction_by_id, delete_transaction, get_summary, update_transaction,
    # Phase 2: Mesh functions
    register_device, get_all_devices, get_device_by_uuid, update_device_status,
    update_telemetry, get_active_device_locations, update_transaction_verification
)


# ============ Configuration ============

# Path to the trained NER model
MODEL_PATH = Path("./bank_ner_model")

# API metadata
API_TITLE = "Bank SMS Entity Extractor"
API_DESCRIPTION = """
A REST API for extracting financial entities from Indian bank SMS messages.

## Entities Extracted

| Entity | Description | Examples |
|--------|-------------|----------|
| **AMOUNT** | Monetary values | INR 5,000, Rs. 250.00, 5000 |
| **DATE** | Transaction dates | 12-Dec-2024, today, 12/05/25 |
| **ACCOUNT** | Account identifiers | Acct XX8811, a/c ending 1234 |
| **TXN_TYPE** | Transaction type | debited, credited, spent |
| **MODALITY** | Transaction channel | POS, ATM, UPI, Online |
| **MERCHANT** | Business/vendor name | Amazon, Swiggy, DMart |

## Delegated Trust Protocol

Transactions are classified as **Physical** (requires location verification) or **Remote** (no location needed).

## Usage

Send a POST request to `/extract` with the SMS text to get extracted entities.
"""
API_VERSION = "2.0.0"


# ============ Modality Classification (Delegated Trust Protocol) ============

# Physical transaction indicators - require GPS mesh verification
PHYSICAL_INDICATORS = [
    "pos", "atm", "swipe", "terminal", "store", "retail", "counter",
    "cash", "withdrawal", "branch", "outlet", "shop", "mart", "bazaar"
]

# Remote transaction indicators - skip GPS verification
REMOTE_INDICATORS = [
    "upi", "online", "netbanking", "imps", "neft", "rtgs", "www",
    "wallet", "gpay", "phonepe", "paytm", "googlepay", "amazonpay",
    "internet", "mobile", "app", "web", ".com", ".in"
]


def classify_modality(entities: list, sms_text: str) -> str:
    """
    Classify transaction as Physical or Remote for Delegated Trust Protocol.
    
    Physical transactions require mesh GPS verification.
    Remote transactions can skip location verification.
    
    Args:
        entities: List of extracted entities from NER
        sms_text: Original SMS text
        
    Returns:
        'physical', 'remote', or 'unknown'
    """
    sms_lower = sms_text.lower()
    
    # First check NER-detected MODALITY entity (most reliable)
    for ent in entities:
        if isinstance(ent, dict) and ent.get('label') == 'MODALITY':
            modality_text = ent['text'].lower()
            if any(ind in modality_text for ind in PHYSICAL_INDICATORS):
                return 'physical'
            if any(ind in modality_text for ind in REMOTE_INDICATORS):
                return 'remote'
    
    # Fallback: keyword search in full SMS
    for ind in PHYSICAL_INDICATORS:
        if ind in sms_lower:
            return 'physical'
    
    for ind in REMOTE_INDICATORS:
        if ind in sms_lower:
            return 'remote'
    
    return 'unknown'


# ============ Pydantic Models ============

class SMSRequest(BaseModel):
    """Request model for SMS entity extraction."""
    sms: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The SMS text to extract entities from",
        examples=["HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024"]
    )


class Entity(BaseModel):
    """Model representing a single extracted entity."""
    text: str = Field(..., description="The extracted entity text")
    label: str = Field(..., description="Entity label (AMOUNT, DATE, ACCOUNT, TXN_TYPE)")
    start: int = Field(..., description="Start character position in the SMS")
    end: int = Field(..., description="End character position in the SMS")


class ExtractionResponse(BaseModel):
    """Response model for entity extraction."""
    sms: str = Field(..., description="The original SMS text")
    entities: List[Entity] = Field(
        default_factory=list,
        description="List of extracted entities"
    )
    entity_count: int = Field(..., description="Total number of entities found")


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    model_loaded: bool
    model_path: str


class APIInfoResponse(BaseModel):
    """Response model for API information."""
    name: str
    version: str
    description: str
    endpoints: dict


# ============ FastAPI App ============

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware for cross-origin requests
# This allows the API to be called from web applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Model Loading ============

# Global variable to hold the loaded model
# We load once at startup rather than on each request for performance
nlp_model: Optional[spacy.language.Language] = None


def load_model():
    """
    Loads the trained spaCy NER model from disk.
    
    Returns:
        spacy.Language: The loaded model, or None if loading fails
    """
    global nlp_model
    
    if not MODEL_PATH.exists():
        print(f"[WARNING] Model not found at: {MODEL_PATH.absolute()}")
        print("  Please run 'python train_model.py' first to train the model.")
        return None
    
    try:
        nlp_model = spacy.load(MODEL_PATH)
        print(f"[OK] Model loaded successfully from: {MODEL_PATH.absolute()}")
        return nlp_model
    except Exception as e:
        print(f"[ERROR] Error loading model: {e}")
        return None


@app.on_event("startup")
async def startup_event():
    """Load the model and initialize database when the API starts."""
    init_database()
    load_model()


# ============ API Endpoints ============

@app.get("/", response_model=APIInfoResponse, tags=["Info"])
async def root():
    """
    Get API information and available endpoints.
    """
    return APIInfoResponse(
        name=API_TITLE,
        version=API_VERSION,
        description="Extract financial entities from Indian bank SMS messages",
        endpoints={
            "POST /extract": "Extract entities from SMS text",
            "GET /health": "Check API and model health",
            "GET /docs": "Interactive API documentation (Swagger UI)",
            "GET /redoc": "API documentation (ReDoc)"
        }
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Check the health status of the API and model.
    
    Returns:
        HealthResponse: Health status information
    """
    return HealthResponse(
        status="healthy" if nlp_model else "degraded",
        model_loaded=nlp_model is not None,
        model_path=str(MODEL_PATH.absolute())
    )


@app.post("/extract", response_model=ExtractionResponse, tags=["Extraction"])
async def extract_entities(request: SMSRequest):
    """
    Extract financial entities from a bank SMS message.
    
    This endpoint processes the input SMS text through the trained NER model
    and returns all identified entities (AMOUNT, DATE, ACCOUNT, TXN_TYPE).
    
    Args:
        request: SMSRequest containing the SMS text
        
    Returns:
        ExtractionResponse: Original SMS with extracted entities
        
    Raises:
        HTTPException: If the model is not loaded
    """
    # Check if model is loaded
    if nlp_model is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Model not loaded",
                "message": "The NER model is not available. Please ensure the model is trained and saved to './bank_ner_model'.",
                "solution": "Run 'python train_model.py' to train and save the model."
            }
        )
    
    # Process the SMS through the model
    doc = nlp_model(request.sms)
    
    # Extract entities from the processed document
    entities = [
        Entity(
            text=ent.text,
            label=ent.label_,
            start=ent.start_char,
            end=ent.end_char
        )
        for ent in doc.ents
    ]
    
    return ExtractionResponse(
        sms=request.sms,
        entities=entities,
        entity_count=len(entities)
    )


@app.post("/extract/batch", tags=["Extraction"])
async def extract_entities_batch(sms_list: List[str]):
    """
    Extract entities from multiple SMS messages in a single request.
    
    Args:
        sms_list: List of SMS strings to process
        
    Returns:
        List of ExtractionResponse objects
    """
    if nlp_model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run 'python train_model.py' first."
        )
    
    results = []
    for sms in sms_list:
        doc = nlp_model(sms)
        entities = [
            Entity(
                text=ent.text,
                label=ent.label_,
                start=ent.start_char,
                end=ent.end_char
            )
            for ent in doc.ents
        ]
        results.append(ExtractionResponse(
            sms=sms,
            entities=entities,
            entity_count=len(entities)
        ))
    
    return results


# ============ Transaction Models ============

class TransactionCreate(BaseModel):
    """Request model for creating a transaction."""
    amount: float
    txn_type: str
    txn_date: str
    account: Optional[str] = None
    balance: Optional[float] = None
    merchant: Optional[str] = None
    category: str = "Other"
    raw_sms: Optional[str] = None


class TransactionResponse(BaseModel):
    """Response model for a transaction."""
    id: int
    amount: float
    txn_type: str
    txn_date: str
    account: Optional[str]
    balance: Optional[float]
    merchant: Optional[str]
    category: str
    raw_sms: Optional[str]
    modality: Optional[str] = None  # POS/ATM/UPI/Online etc.
    channel: Optional[str] = None   # physical/remote
    verified: Optional[bool] = False  # Mesh verification status
    verified_by: Optional[str] = None  # Device alias that verified
    created_at: str


class ParseAndSaveRequest(BaseModel):
    """Request to parse SMS and save as transaction."""
    sms: str
    category: str = "Other"
    merchant: Optional[str] = None
    ledger_id: Optional[int] = None


class SummaryResponse(BaseModel):
    """Response model for spending summary."""
    period: str
    start_date: str
    end_date: str
    total_spent: float
    total_credited: float
    net_flow: float
    transaction_count: int
    category_breakdown: List[dict]


# ============ Phase 2: Mesh Pydantic Models ============

class DeviceRegisterRequest(BaseModel):
    """Request to register a new trusted device."""
    device_uuid: str = Field(..., description="Unique hardware identifier")
    alias: str = Field(..., description="Human-readable name (e.g., Sister, Father)")


class DeviceResponse(BaseModel):
    """Response model for a trusted device."""
    id: int
    device_uuid: str
    alias: str
    registered_at: str
    is_active: bool


class TelemetryRequest(BaseModel):
    """Request to update device location."""
    device_id: int = Field(..., description="ID of the reporting device")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, description="GPS accuracy in meters")


class TelemetryResponse(BaseModel):
    """Response after telemetry update."""
    id: int
    device_id: int
    latitude: float
    longitude: float
    accuracy: Optional[float]
    timestamp: str


class VerifyTransactionRequest(BaseModel):
    """Request to verify a transaction location against mesh."""
    merchant_lat: float = Field(..., ge=-90, le=90)
    merchant_lng: float = Field(..., ge=-180, le=180)
    threshold_meters: float = Field(200, description="Maximum distance for verification")


class VerifyTransactionResponse(BaseModel):
    """Response from transaction verification."""
    transaction_id: int
    verified: bool
    verified_by: Optional[str] = None
    distance_meters: Optional[float] = None
    message: str


# ============ Transaction Endpoints ============

# Import database functions
import re
from database import (
    init_database, add_transaction, get_all_transactions,
    get_transaction_by_id, delete_transaction, get_summary, update_transaction,
    create_ledger, get_all_ledgers, get_ledger_by_id, delete_ledger, add_manual_transaction
)


def parse_amount(amount_str: str) -> float:
    """Parse amount string to float."""
    # Remove currency symbols, letters, and spaces but keep digits, commas, and dots
    cleaned = re.sub(r'[^\d,.]', '', amount_str)
    
    # Handle multiple dots (keep only the last one as decimal)
    if cleaned.count('.') > 1:
        parts = cleaned.split('.')
        cleaned = ''.join(parts[:-1]) + '.' + parts[-1]
    
    # Remove leading dots
    cleaned = cleaned.lstrip('.')
    
    # Remove commas (used as thousand separators in India)
    cleaned = cleaned.replace(',', '')
    
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def normalize_date(date_str: str) -> str:
    """Normalize date string to YYYY-MM-DD format."""
    import datetime
    
    # Handle 'today'
    if date_str.lower() == 'today':
        return datetime.date.today().isoformat()
    
    # Common date patterns
    patterns = [
        (r'(\d{2})-(\w{3})-(\d{4})', '%d-%b-%Y'),  # 25-DEC-2025
        (r'(\d{2})-(\w{3})-(\d{2})', '%d-%b-%y'),  # 25-Dec-24
        (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),  # 2025-12-25
        (r'(\d{2})-(\d{2})-(\d{4})', '%d-%m-%Y'),  # 25-12-2025
        (r'(\d{2})-(\d{2})-(\d{2})', '%d-%m-%y'),  # 25-12-25
        (r'(\d{2})/(\d{2})/(\d{2})', '%d/%m/%y'),  # 25/12/24
        (r'(\d{2})/(\d{2})/(\d{4})', '%d/%m/%Y'),  # 25/12/2024
    ]
    
    for pattern, fmt in patterns:
        try:
            parsed = datetime.datetime.strptime(date_str, fmt)
            return parsed.date().isoformat()
        except ValueError:
            continue
    
    # Return original if no pattern matches
    return date_str


@app.post("/transactions/parse-save", response_model=TransactionResponse, tags=["Transactions"])
async def parse_and_save_transaction(request: ParseAndSaveRequest):
    """
    Parse SMS, extract entities, and save as a transaction.
    This is the main endpoint for the mobile app.
    
    Now includes Delegated Trust Protocol:
    - Extracts MODALITY (POS/ATM/UPI etc.) and MERCHANT entities
    - Classifies transaction as 'physical' or 'remote'
    - Physical transactions will require mesh GPS verification
    """
    if nlp_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Parse the SMS
    doc = nlp_model(request.sms)
    
    # Extract entities
    amount = None
    txn_type = None
    account = None
    txn_date = None
    balance = None
    modality = None
    merchant = None
    
    for ent in doc.ents:
        if ent.label_ == "AMOUNT" and amount is None:
            amount = parse_amount(ent.text)
        elif ent.label_ == "TXN_TYPE" and txn_type is None:
            txn_type = ent.text.lower()
        elif ent.label_ == "ACCOUNT" and account is None:
            account = ent.text
        elif ent.label_ == "DATE" and txn_date is None:
            txn_date = normalize_date(ent.text)
        elif ent.label_ == "BALANCE" and balance is None:
            balance = parse_amount(ent.text)
        elif ent.label_ == "MODALITY" and modality is None:
            modality = ent.text
        elif ent.label_ == "MERCHANT" and merchant is None:
            merchant = ent.text
    
    if amount is None or txn_type is None:
        raise HTTPException(
            status_code=400,
            detail="Could not extract required entities (AMOUNT, TXN_TYPE) from SMS"
        )
    
    if txn_date is None:
        import datetime
        txn_date = datetime.date.today().isoformat()
    
    # Use request merchant if provided, otherwise use extracted
    final_merchant = request.merchant if request.merchant else merchant
    
    # Classify transaction channel for Delegated Trust Protocol
    entities_list = [{"label": e.label_, "text": e.text} for e in doc.ents]
    channel = classify_modality(entities_list, request.sms)
    
    # Save to database with new modality/channel fields
    txn_id = add_transaction(
        amount=amount,
        txn_type=txn_type,
        txn_date=txn_date,
        account=account,
        balance=balance,
        merchant=final_merchant,
        category=request.category,
        raw_sms=request.sms,
        ledger_id=request.ledger_id,
        modality=modality,
        channel=channel,
        verified=False,  # Will be verified by mesh in Phase 2
        verified_by=None
    )
    
    # Return the created transaction
    txn = get_transaction_by_id(txn_id)
    return TransactionResponse(**txn)


@app.get("/transactions", response_model=List[TransactionResponse], tags=["Transactions"])
async def list_transactions(
    limit: int = 100,
    offset: int = 0,
    txn_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get all transactions with optional filters."""
    transactions = get_all_transactions(
        limit=limit,
        offset=offset,
        txn_type=txn_type,
        start_date=start_date,
        end_date=end_date
    )
    return [TransactionResponse(**txn) for txn in transactions]


@app.get("/transactions/summary", response_model=SummaryResponse, tags=["Transactions"])
async def get_transactions_summary(
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get spending summary for a period.
    
    Args:
        period: 'daily', 'weekly', or 'monthly'
    """
    summary = get_summary(period=period, start_date=start_date, end_date=end_date)
    return SummaryResponse(**summary)


@app.get("/transactions/{txn_id}", response_model=TransactionResponse, tags=["Transactions"])
async def get_transaction(txn_id: int):
    """Get a single transaction by ID."""
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionResponse(**txn)


@app.delete("/transactions/{txn_id}", tags=["Transactions"])
async def remove_transaction(txn_id: int):
    """Delete a transaction by ID."""
    if delete_transaction(txn_id):
        return {"message": "Transaction deleted successfully"}
    raise HTTPException(status_code=404, detail="Transaction not found")


@app.patch("/transactions/{txn_id}", response_model=TransactionResponse, tags=["Transactions"])
async def modify_transaction(
    txn_id: int,
    category: Optional[str] = None,
    merchant: Optional[str] = None
):
    """Update transaction category or merchant."""
    if not update_transaction(txn_id, category=category, merchant=merchant):
        raise HTTPException(status_code=404, detail="Transaction not found or no updates provided")
    
    txn = get_transaction_by_id(txn_id)
    return TransactionResponse(**txn)


# ============ Main Entry Point ============

if __name__ == "__main__":
    import uvicorn
    
    # Initialize database
    init_database()
    
    print("\n" + "=" * 60)
    print("Starting Expense Tracker API Server")
    print("=" * 60)
    
    # Run the server
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


# ============ LEDGER ENDPOINTS ============

class LedgerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "📒"
    color: str = "#3B82F6"


class LedgerResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: str
    color: str
    created_at: str
    transaction_count: Optional[int] = 0
    total_spent: Optional[float] = 0
    total_credited: Optional[float] = 0


@app.post("/ledgers", response_model=LedgerResponse, tags=["Ledgers"])
async def create_ledger_endpoint(ledger: LedgerCreate):
    """Create a new ledger."""
    ledger_id = create_ledger(
        name=ledger.name,
        description=ledger.description,
        icon=ledger.icon,
        color=ledger.color
    )
    return get_ledger_by_id(ledger_id)


@app.get("/ledgers", tags=["Ledgers"])
async def list_ledgers():
    """Get all ledgers with transaction counts and totals."""
    return get_all_ledgers()


@app.get("/ledgers/{ledger_id}", tags=["Ledgers"])
async def get_ledger(ledger_id: int):
    """Get a ledger by ID with all its transactions."""
    ledger = get_ledger_by_id(ledger_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return ledger


@app.delete("/ledgers/{ledger_id}", tags=["Ledgers"])
async def delete_ledger_endpoint(ledger_id: int):
    """Delete a ledger. Transactions will be unlinked but not deleted."""
    if delete_ledger(ledger_id):
        return {"message": "Ledger deleted successfully"}
    raise HTTPException(status_code=404, detail="Ledger not found")


# ============ MANUAL TRANSACTION ENDPOINT ============

class ManualTransactionCreate(BaseModel):
    amount: float
    txn_type: str  # 'debit' or 'credit'
    txn_date: str  # YYYY-MM-DD format
    ledger_id: Optional[int] = None
    category: str = "Other"
    note: Optional[str] = None
    account: Optional[str] = None


@app.post("/transactions/manual", tags=["Transactions"])
async def create_manual_transaction(txn: ManualTransactionCreate):
    """Create a manual transaction without SMS parsing."""
    txn_id = add_manual_transaction(
        amount=txn.amount,
        txn_type=txn.txn_type,
        txn_date=txn.txn_date,
        ledger_id=txn.ledger_id,
        category=txn.category,
        note=txn.note,
        account=txn.account
    )
    return get_transaction_by_id(txn_id)


class LinkTransactionRequest(BaseModel):
    transaction_id: int
    ledger_id: int  # 0 to unlink


@app.post("/transactions/link-to-ledger", tags=["Transactions"])
async def link_transaction_to_ledger(request: LinkTransactionRequest):
    """Link or unlink a transaction to a ledger."""
    if update_transaction(request.transaction_id, ledger_id=request.ledger_id):
        return get_transaction_by_id(request.transaction_id)
    raise HTTPException(status_code=404, detail="Transaction not found")


@app.get("/transactions/unlinked", tags=["Transactions"])
async def get_unlinked_transactions(limit: int = 50):
    """Get transactions not linked to any ledger."""
    all_txns = get_all_transactions(limit=limit)
    return [txn for txn in all_txns if txn.get('ledger_id') is None]


# ============ Phase 2: Multi-Device Mesh Endpoints ============

import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points.
    
    Args:
        lat1, lon1: Coordinates of point 1 (degrees)
        lat2, lon2: Coordinates of point 2 (degrees)
        
    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def verify_with_mesh(merchant_lat: float, merchant_lng: float, threshold_meters: float = 200):
    """
    Check if any trusted device in the mesh is near the merchant location.
    
    Returns:
        dict with verification result
    """
    devices = get_active_device_locations()
    
    if not devices:
        return {
            "verified": False,
            "reason": "No active devices in mesh",
            "nearest_device": None,
            "distance": None
        }
    
    nearest_device = None
    min_distance = float('inf')
    
    for device in devices:
        distance = haversine_distance(
            merchant_lat, merchant_lng,
            device['latitude'], device['longitude']
        )
        
        if distance < min_distance:
            min_distance = distance
            nearest_device = device
        
        if distance <= threshold_meters:
            return {
                "verified": True,
                "verified_by": device['alias'],
                "distance": round(distance, 2),
                "device_id": device['device_id']
            }
    
    return {
        "verified": False,
        "reason": f"No device within {threshold_meters}m of merchant",
        "nearest_device": nearest_device['alias'] if nearest_device else None,
        "distance": round(min_distance, 2) if nearest_device else None
    }


@app.get("/mesh/devices", response_model=List[DeviceResponse], tags=["Mesh"])
async def list_devices():
    """Get all registered trusted devices."""
    devices = get_all_devices()
    return [DeviceResponse(**d) for d in devices]


@app.post("/mesh/register", response_model=DeviceResponse, tags=["Mesh"])
async def register_new_device(request: DeviceRegisterRequest):
    """
    Register a new trusted device in the mesh.
    
    Each device needs a unique UUID and a human-readable alias.
    """
    # Check if device already exists
    existing = get_device_by_uuid(request.device_uuid)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Device with UUID {request.device_uuid} already registered as '{existing['alias']}'"
        )
    
    device_id = register_device(request.device_uuid, request.alias)
    
    return DeviceResponse(
        id=device_id,
        device_uuid=request.device_uuid,
        alias=request.alias,
        registered_at=datetime.now().isoformat(),
        is_active=True
    )


@app.post("/mesh/telemetry", tags=["Mesh"])
async def update_device_location(request: TelemetryRequest):
    """
    Update the location of a device.
    
    Mobile apps should call this periodically to keep the mesh updated.
    """
    telemetry_id = update_telemetry(
        device_id=request.device_id,
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy=request.accuracy
    )
    
    return {
        "id": telemetry_id,
        "device_id": request.device_id,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "accuracy": request.accuracy,
        "timestamp": datetime.now().isoformat(),
        "message": "Location updated successfully"
    }


@app.get("/mesh/locations", tags=["Mesh"])
async def get_mesh_locations():
    """Get current locations of all active devices in the mesh."""
    return get_active_device_locations()


@app.post("/mesh/verify/{txn_id}", response_model=VerifyTransactionResponse, tags=["Mesh"])
async def verify_transaction(txn_id: int, request: VerifyTransactionRequest):
    """
    Verify a transaction's location against the device mesh.
    
    Checks if any trusted device was near the merchant location when the
    transaction occurred. Updates the transaction's verification status.
    """
    # Get the transaction
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check if transaction is physical (requires verification)
    if txn.get('channel') == 'remote':
        return VerifyTransactionResponse(
            transaction_id=txn_id,
            verified=True,
            verified_by="auto",
            distance_meters=None,
            message="Remote transaction - verification not required"
        )
    
    # Verify against mesh
    result = verify_with_mesh(
        request.merchant_lat,
        request.merchant_lng,
        request.threshold_meters
    )
    
    # Update transaction verification status
    if result['verified']:
        update_transaction_verification(txn_id, True, result['verified_by'])
        return VerifyTransactionResponse(
            transaction_id=txn_id,
            verified=True,
            verified_by=result['verified_by'],
            distance_meters=result['distance'],
            message=f"Verified by {result['verified_by']} at {result['distance']}m"
        )
    else:
        update_transaction_verification(txn_id, False, None)
        return VerifyTransactionResponse(
            transaction_id=txn_id,
            verified=False,
            verified_by=None,
            distance_meters=result.get('distance'),
            message=result['reason']
        )


@app.patch("/mesh/devices/{device_id}/status", tags=["Mesh"])
async def toggle_device_status(device_id: int, is_active: bool):
    """Activate or deactivate a trusted device."""
    if update_device_status(device_id, is_active):
        return {"device_id": device_id, "is_active": is_active, "message": "Status updated"}
    raise HTTPException(status_code=404, detail="Device not found")


# ============ Phase 3: Google Places API Integration ============

import requests

# Google Places API configuration
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

# Mock merchant database for testing (when API key not available)
MOCK_MERCHANT_LOCATIONS = {
    "big bazaar": {"lat": 12.9352, "lng": 77.6245, "address": "Big Bazaar, Koramangala"},
    "dmart": {"lat": 12.9716, "lng": 77.5946, "address": "DMart, Indiranagar"},
    "reliance fresh": {"lat": 12.9656, "lng": 77.6000, "address": "Reliance Fresh, HSR Layout"},
    "amazon fresh": {"lat": 12.9580, "lng": 77.6420, "address": "Amazon Fresh Store, Marathahalli"},
    "swiggy": {"lat": 12.9716, "lng": 77.5946, "address": "Swiggy Delivery Point"},
    "zomato": {"lat": 12.9700, "lng": 77.5900, "address": "Zomato Delivery Point"},
    "flipkart": {"lat": 12.8460, "lng": 77.6600, "address": "Flipkart Hub, Electronic City"},
    "sbi atm": {"lat": 12.9720, "lng": 77.5950, "address": "SBI ATM, MG Road"},
    "hdfc atm": {"lat": 12.9750, "lng": 77.6100, "address": "HDFC ATM, Koramangala"},
}


def lookup_merchant_location(merchant_name: str, city: str = "Bangalore") -> dict:
    """
    Look up merchant GPS coordinates using Google Places API.
    Falls back to mock data if API key not configured.
    
    Args:
        merchant_name: Name of the merchant/store
        city: City for location context
        
    Returns:
        dict with lat, lng, address or error
    """
    # First try mock database
    merchant_lower = merchant_name.lower()
    for key, location in MOCK_MERCHANT_LOCATIONS.items():
        if key in merchant_lower:
            return {
                "found": True,
                "source": "mock",
                "lat": location["lat"],
                "lng": location["lng"],
                "address": location["address"]
            }
    
    # If API key available, use Google Places
    if GOOGLE_PLACES_API_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
            params = {
                "input": f"{merchant_name} {city}",
                "inputtype": "textquery",
                "fields": "geometry,name,formatted_address",
                "key": GOOGLE_PLACES_API_KEY
            }
            
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data.get("candidates"):
                candidate = data["candidates"][0]
                location = candidate["geometry"]["location"]
                return {
                    "found": True,
                    "source": "google_places",
                    "lat": location["lat"],
                    "lng": location["lng"],
                    "address": candidate.get("formatted_address", merchant_name)
                }
        except Exception as e:
            return {"found": False, "error": f"API error: {str(e)}"}
    
    return {
        "found": False,
        "error": f"Merchant '{merchant_name}' not found in mock database and API key not configured"
    }


class AutoVerifyResponse(BaseModel):
    """Response from auto-verification."""
    transaction_id: int
    merchant: Optional[str]
    merchant_location: Optional[dict]
    verified: bool
    verified_by: Optional[str] = None
    distance_meters: Optional[float] = None
    message: str


@app.post("/mesh/auto-verify/{txn_id}", response_model=AutoVerifyResponse, tags=["Mesh"])
async def auto_verify_transaction(txn_id: int, threshold_meters: float = 200):
    """
    Automatically verify a physical transaction:
    1. Get merchant name from transaction
    2. Look up GPS coordinates via Google Places (or mock data)
    3. Verify location against device mesh
    
    This is the end-to-end verification endpoint for the Delegated Trust Protocol.
    """
    # Get the transaction
    txn = get_transaction_by_id(txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check if transaction is remote (skip verification)
    if txn.get('channel') == 'remote':
        return AutoVerifyResponse(
            transaction_id=txn_id,
            merchant=txn.get('merchant'),
            merchant_location=None,
            verified=True,
            verified_by="auto",
            distance_meters=None,
            message="Remote transaction - verification not required"
        )
    
    # Get merchant name
    merchant = txn.get('merchant')
    if not merchant:
        # Try to extract from raw SMS
        raw_sms = txn.get('raw_sms', '')
        # Simple extraction: look for "at <merchant>" pattern
        import re
        match = re.search(r'at\s+([A-Za-z\s]+?)(?:\s+on|\s*\.|\s*$)', raw_sms, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
    
    if not merchant:
        return AutoVerifyResponse(
            transaction_id=txn_id,
            merchant=None,
            merchant_location=None,
            verified=False,
            message="Could not determine merchant name from transaction"
        )
    
    # Look up merchant location
    location = lookup_merchant_location(merchant)
    
    if not location.get('found'):
        return AutoVerifyResponse(
            transaction_id=txn_id,
            merchant=merchant,
            merchant_location=location,
            verified=False,
            message=location.get('error', 'Merchant location not found')
        )
    
    # Verify against mesh
    result = verify_with_mesh(location['lat'], location['lng'], threshold_meters)
    
    # Update transaction verification status
    if result['verified']:
        update_transaction_verification(txn_id, True, result['verified_by'])
        return AutoVerifyResponse(
            transaction_id=txn_id,
            merchant=merchant,
            merchant_location=location,
            verified=True,
            verified_by=result['verified_by'],
            distance_meters=result['distance'],
            message=f"Verified by {result['verified_by']} at {result['distance']}m from {location['address']}"
        )
    else:
        update_transaction_verification(txn_id, False, None)
        return AutoVerifyResponse(
            transaction_id=txn_id,
            merchant=merchant,
            merchant_location=location,
            verified=False,
            distance_meters=result.get('distance'),
            message=result['reason']
        )


@app.get("/mesh/lookup-merchant", tags=["Mesh"])
async def lookup_merchant(merchant_name: str, city: str = "Bangalore"):
    """
    Look up a merchant's GPS coordinates.
    Useful for testing the Places API integration.
    """
    return lookup_merchant_location(merchant_name, city)
