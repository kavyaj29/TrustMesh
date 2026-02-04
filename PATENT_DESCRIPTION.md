# Patent Novelty Verification Document

## Intelligent Expense Tracker with SMS-Based Financial Entity Extraction Using Custom NER Model

**Document Version:** 1.0  
**Date:** February 3, 2026  
**Author:** Kavyan Jain

---

## 1. Executive Summary

A mobile expense tracking application that automatically extracts and structures financial transaction data from Indian bank SMS messages using a custom-trained Named Entity Recognition (NER) machine learning model, combined with a ledger-based organization system for personal finance management.

The system eliminates manual data entry by intelligently parsing bank notification SMS messages, extracting relevant financial entities (amount, date, account, transaction type, balance, bank name), and automatically creating structured transaction records that can be organized, categorized, and analyzed.

---

## 2. Problem Statement

### Current Challenges in Personal Finance Tracking

1. **Manual Data Entry Burden**: Users must manually enter each transaction, leading to incomplete records and user fatigue
2. **Unstructured Bank Notifications**: Bank SMS messages contain valuable transaction data but in unstructured, varying formats
3. **Multi-Bank Complexity**: Different banks use different SMS formats, making standardization difficult
4. **Lack of Contextualization**: Transactions lack organizational context beyond basic categories
5. **Time-Consuming Reconciliation**: Users spend significant time entering and organizing expense data

### Market Gap

Existing expense tracking solutions either:
- Require complete manual entry
- Use rigid rule-based (regex) SMS parsing that fails on format variations
- Require bank API integrations that are complex and privacy-invasive
- Lack intelligent entity extraction capabilities

---

## 3. Proposed Solution

### 3.1 Solution Overview

An intelligent expense tracking system comprising:

1. **Custom NER Model**: Machine learning model trained specifically on Indian bank SMS formats
2. **REST API Backend**: FastAPI-based service for entity extraction and data management
3. **Mobile Application**: React Native app for user interaction and transaction management
4. **Ledger System**: Flexible transaction organization beyond traditional categories

### 3.2 Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MOBILE APPLICATION                          │
│                    (React Native / Expo)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐│
│  │ HomeScreen│  │  Ledgers  │  │  Add SMS  │  │ Transactions  ││
│  │ (Summary) │  │ (Groups)  │  │ (Parser)  │  │  (History)    ││
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘│
└────────┼──────────────┼──────────────┼────────────────┼────────┘
         │              │              │                │
         └──────────────┴──────────────┴────────────────┘
                                │
                         HTTP REST API
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                              │
│                    (FastAPI / Python)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  API Endpoints  │    │  NER Model      │                    │
│  │  - /extract     │───▶│  (spaCy)        │                    │
│  │  - /transactions│    │                 │                    │
│  │  - /ledgers     │    └─────────────────┘                    │
│  │  - /summary     │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │  SQLite Database│                                           │
│  │  - transactions │                                           │
│  │  - ledgers      │                                           │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **ML Framework** | spaCy 3.x | NER model training and inference |
| **Backend** | FastAPI (Python) | REST API server |
| **Database** | SQLite | Persistent data storage |
| **Mobile Framework** | React Native (Expo) | Cross-platform mobile app |
| **API Documentation** | Swagger UI / ReDoc | Interactive API docs |

---

## 4. Core Innovation: Custom NER Model

### 4.1 Model Architecture

The system employs a custom-trained Named Entity Recognition (NER) model built on spaCy's neural network architecture.

**Model Specifications:**
- **Base Model**: Blank English spaCy model (`spacy.blank("en")`)
- **Pipeline**: NER component only (lightweight, fast inference)
- **Entity Classes**: 6 custom financial entity types
- **Training Approach**: Supervised learning with annotated corpus

**Training Configuration:**
```python
Training Parameters:
├── Iterations (epochs): 30
├── Dropout Rate: 0.35 (regularization)
├── Batch Sizing: Compounding (4.0 → 32.0, factor 1.001)
└── Optimizer: Default spaCy optimizer (Adam variant)
```

### 4.2 Entity Classes

The model extracts six distinct financial entity types:

| Entity Label | Description | Example Values |
|--------------|-------------|----------------|
| **AMOUNT** | Monetary values in Indian Rupees | `Rs.45000`, `INR 5,000`, `Rs:170.00`, `275000.00` |
| **TXN_TYPE** | Transaction action/direction | `debited`, `credited`, `spent`, `withdrawn`, `deposited`, `transferred`, `charged` |
| **ACCOUNT** | Bank account or card identifiers | `a/c ending 4521`, `Acct XX6789`, `Credit Card x2963`, `A/c *0911` |
| **DATE** | Transaction dates (multiple formats) | `01-Dec-2024`, `today`, `2025-12-13`, `25-DEC-2025`, `22-12-2025` |
| **BALANCE** | Available/remaining balance | `INR 180683`, `Rs.45000`, `INR 2614.31` |
| **BANK** | Bank or financial institution name | `HDFC Bank`, `SBI`, `ICICI`, `Axis Bank`, `Kotak`, `IOB` |

### 4.3 Training Data

**Corpus Statistics:**
- **Total Examples**: 46 annotated Indian bank SMS messages
- **Banks Covered**: 10+ (HDFC, SBI, ICICI, Axis, Kotak, PNB, Union Bank, Canara Bank, IOB, etc.)
- **Transaction Types**: Credit, Debit, UPI, NEFT, IMPS, ATM, POS, Card payments
- **Date Formats**: DD-MMM-YYYY, DD/MM/YY, YYYY-MM-DD, relative dates

**Sample Training Examples:**

```
1. "HDFC Bank: Rs.45000 credited to a/c ending 4521 on 01-Dec-2024."
   Entities: BANK(0,9), AMOUNT(11,19), TXN_TYPE(20,28), ACCOUNT(32,48), DATE(52,63)

2. "INR 4683 spent on Kotak Credit Card x2963 on 25-DEC-2025 at AIR INDIA LTD. Avl limit INR 180683."
   Entities: AMOUNT(0,8), TXN_TYPE(9,14), ACCOUNT(18,41), DATE(45,56), BALANCE(85,95)

3. "A/c *0911 Debited for Rs:170.00 on 22-12-2025 19:08:34 by Mob Bk."
   Entities: ACCOUNT(0,9), TXN_TYPE(10,17), AMOUNT(22,31), DATE(35,45)
```

### 4.4 Model Training Process

```
Step 1: Create Blank Model
    └── spacy.blank("en") + NER pipeline component

Step 2: Add Entity Labels
    └── AMOUNT, DATE, ACCOUNT, TXN_TYPE, BALANCE, BANK

Step 3: Convert Training Data
    └── Text + Annotations → spaCy Example objects

Step 4: Training Loop (30 iterations)
    └── For each iteration:
        ├── Shuffle examples (prevent order bias)
        ├── Create mini-batches (compounding size)
        ├── Forward pass + loss computation
        ├── Backpropagation + weight update
        └── Track and report loss

Step 5: Save Trained Model
    └── nlp.to_disk("./bank_ner_model")
```

### 4.5 Inference Pipeline

```
INPUT SMS:
"HDFC Bank: Rs.5000 credited to a/c XX1234 on 14-Dec-2024"
                            │
                            ▼
                    ┌───────────────┐
                    │   NER Model   │
                    │    (spaCy)    │
                    └───────┬───────┘
                            │
                            ▼
EXTRACTED ENTITIES:
┌────────────┬─────────────┬───────┬─────┐
│   Label    │    Text     │ Start │ End │
├────────────┼─────────────┼───────┼─────┤
│ BANK       │ HDFC Bank   │   0   │  9  │
│ AMOUNT     │ Rs.5000     │  11   │ 18  │
│ TXN_TYPE   │ credited    │  19   │ 27  │
│ ACCOUNT    │ a/c XX1234  │  31   │ 41  │
│ DATE       │ 14-Dec-2024 │  45   │ 56  │
└────────────┴─────────────┴───────┴─────┘
                            │
                            ▼
POST-PROCESSING:
├── Amount: "Rs.5000" → 5000.00 (float)
├── Date: "14-Dec-2024" → 2024-12-14 (ISO)
├── TXN_TYPE: "credited" → "credit"
└── Account: "a/c XX1234" (preserved)
                            │
                            ▼
STRUCTURED TRANSACTION RECORD:
{
    "amount": 5000.00,
    "txn_type": "credit",
    "txn_date": "2024-12-14",
    "account": "a/c XX1234",
    "bank": "HDFC Bank",
    "raw_sms": "HDFC Bank: Rs.5000 credited..."
}
```

---

## 5. System Features

### 5.1 SMS Entity Extraction

**Capabilities:**
- Single SMS processing via `/extract` endpoint
- Batch SMS processing via `/extract/batch` endpoint
- Automatic date normalization (multiple input formats → ISO 8601)
- Amount parsing (handles Indian number formatting: lakhs, commas)
- Transaction type normalization

**API Example:**
```http
POST /extract
Content-Type: application/json

{
    "sms": "HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024"
}

Response:
{
    "sms": "HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024",
    "entities": [
        {"text": "HDFC Bank", "label": "BANK", "start": 0, "end": 9},
        {"text": "Rs. 5,000", "label": "AMOUNT", "start": 11, "end": 20},
        {"text": "credited", "label": "TXN_TYPE", "start": 21, "end": 29},
        {"text": "a/c XX1234", "label": "ACCOUNT", "start": 33, "end": 43},
        {"text": "14-Dec-2024", "label": "DATE", "start": 47, "end": 58}
    ],
    "entity_count": 5
}
```

### 5.2 Transaction Management

**Transaction Types:**
1. **SMS-Parsed Transactions**: Automatically extracted from bank SMS
2. **Manual Transactions**: User-entered expenses/income

**Features:**
- Full CRUD operations (Create, Read, Update, Delete)
- Filtering by date range, transaction type
- Categorization (Food, Transport, Shopping, Bills, etc.)
- Merchant tagging
- Pagination support

### 5.3 Ledger System

**Purpose:** Enable contextual organization of transactions beyond categories

**Use Cases:**
- "Trip to Goa" - group all trip-related expenses
- "Monthly Bills" - recurring utility payments
- "Project Expenses" - work-related costs
- "Shared Expenses" - costs to split with others

**Features:**
- Create custom ledgers with name, description, icon, color
- Link/unlink transactions to ledgers
- Per-ledger spending analytics
- Transaction count and totals per ledger

### 5.4 Analytics & Reporting

**Summary Endpoints:**
- Daily spending summary
- Weekly spending summary
- Monthly spending summary

**Metrics Provided:**
- Total amount debited (spent)
- Total amount credited (received)
- Net cash flow
- Transaction count
- Category-wise breakdown

---

## 6. Mobile Application

### 6.1 Application Screens

| Screen | Purpose |
|--------|---------|
| **HomeScreen** | Dashboard with spending summary and quick stats |
| **LedgersScreen** | View and manage ledgers |
| **LedgerDetailScreen** | View transactions within a specific ledger |
| **AddSMSScreen** | Paste SMS for automatic parsing and saving |
| **AddManualScreen** | Manually enter transaction details |
| **TransactionsScreen** | View all transactions with filters |
| **LinkTransactionsScreen** | Link unlinked transactions to ledgers |

### 6.2 User Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER RECEIVES                         │
│                    BANK SMS                              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 OPEN APP → ADD SMS                       │
│                 ┌─────────────────┐                      │
│                 │ Paste SMS text  │                      │
│                 │ Select category │                      │
│                 │ Select ledger   │                      │
│                 │ [SAVE]          │                      │
│                 └─────────────────┘                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              AUTOMATIC ENTITY EXTRACTION                 │
│                                                          │
│  "Rs.5000 credited to a/c XX1234 on 14-Dec-2024"        │
│           │           │          │                       │
│           ▼           ▼          ▼                       │
│       AMOUNT      ACCOUNT       DATE                     │
│       ₹5,000      XX1234      Dec 14                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              TRANSACTION SAVED                           │
│              ────────────────                            │
│  • Amount: ₹5,000                                        │
│  • Type: Credit                                          │
│  • Date: December 14, 2024                              │
│  • Account: XX1234                                       │
│  • Category: Salary                                      │
│  • Ledger: Income                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Novelty Claims

### 7.1 Primary Innovation

**Custom NER Model for Indian Bank SMS Financial Entity Extraction**

A machine learning-based Named Entity Recognition model specifically trained on the unique characteristics of Indian bank SMS notifications, capable of:
- Handling format variations across 10+ major Indian banks
- Extracting 6 distinct financial entity types simultaneously
- Processing diverse date, amount, and account number formats
- Adapting to credit card, debit card, UPI, NEFT, IMPS transaction types

### 7.2 Novel Aspects

1. **Domain-Specific NER Training**
   - Custom entity labels designed for financial domain (AMOUNT, TXN_TYPE, ACCOUNT, DATE, BALANCE, BANK)
   - Training corpus specifically curated from Indian bank SMS patterns
   - Handles regional formatting variations (lakhs notation, date formats)

2. **End-to-End Automated Pipeline**
   - Raw SMS text → NER extraction → Structured data → Database storage
   - No manual data entry required for basic transaction recording
   - Preserves original SMS for audit/verification

3. **Multi-Entity Simultaneous Extraction**
   - Single inference pass extracts all 6 entity types
   - Character-level position tracking for precise extraction
   - Confidence-based entity selection when multiple candidates exist

4. **Ledger-Based Organization**
   - Novel approach to transaction grouping beyond categories
   - User-defined contexts for expense organization
   - Enables project-based, event-based, or purpose-based tracking

5. **Hybrid Input System**
   - Seamless integration of automated (SMS) and manual transaction entry
   - Unified data model for both input methods
   - Consistent analytics across all transactions

### 7.3 Technical Differentiators

| Aspect | This System | Traditional Apps | Rule-Based Systems |
|--------|-------------|------------------|-------------------|
| **Parsing Method** | ML-based NER | Manual entry | Regex patterns |
| **Adaptability** | Learns patterns | N/A | Fixed rules |
| **Bank Coverage** | Multi-bank | N/A | Bank-specific |
| **Entity Types** | 6 simultaneous | N/A | Limited |
| **Format Handling** | Flexible | N/A | Rigid |
| **New Format Support** | Re-training | N/A | Code changes |

---

## 8. Prior Art Search Keywords

For comprehensive patent novelty verification, search using these terms:

### English Keywords
- "Bank SMS NER model expense tracking"
- "Named Entity Recognition financial transaction extraction"
- "Automated expense tracker SMS parsing"
- "Machine learning bank notification parsing"
- "Mobile expense tracker NLP"
- "Financial entity extraction neural network"
- "Bank transaction SMS classification"
- "Automated expense categorization from SMS"
- "spaCy NER financial domain"
- "Indian bank SMS text mining"

### Patent Classification Codes
- **G06F 40/30** - Natural language processing
- **G06N 3/08** - Neural networks learning methods
- **G06Q 40/02** - Banking, e.g., interest calculation or account maintenance
- **G06F 16/35** - Information retrieval; Database structures

### Relevant Patent Databases
- USPTO (United States Patent and Trademark Office)
- EPO Espacenet (European Patent Office)
- WIPO (World Intellectual Property Organization)
- Indian Patent Office (ipindiaonline.gov.in)
- Google Patents

---

## 9. Technical Specifications

### 9.1 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information |
| `GET` | `/health` | Health check and model status |
| `POST` | `/extract` | Extract entities from single SMS |
| `POST` | `/extract/batch` | Extract entities from multiple SMS |
| `POST` | `/transactions/parse-save` | Parse SMS and save as transaction |
| `POST` | `/transactions/manual` | Create manual transaction |
| `GET` | `/transactions` | List all transactions |
| `GET` | `/transactions/{id}` | Get single transaction |
| `PATCH` | `/transactions/{id}` | Update transaction |
| `DELETE` | `/transactions/{id}` | Delete transaction |
| `GET` | `/transactions/summary` | Get spending summary |
| `POST` | `/ledgers` | Create new ledger |
| `GET` | `/ledgers` | List all ledgers |
| `GET` | `/ledgers/{id}` | Get ledger with transactions |
| `DELETE` | `/ledgers/{id}` | Delete ledger |
| `POST` | `/transactions/link-to-ledger` | Link transaction to ledger |

### 9.2 Database Schema

```sql
-- Ledgers Table
CREATE TABLE ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📒',
    color TEXT DEFAULT '#3B82F6',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    txn_type TEXT NOT NULL,
    account TEXT,
    txn_date TEXT NOT NULL,
    balance REAL,
    merchant TEXT,
    category TEXT DEFAULT 'Other',
    raw_sms TEXT,
    ledger_id INTEGER REFERENCES ledgers(id),
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 File Structure

```
expense-tracker/
├── api.py                 # FastAPI REST API server
├── database.py            # SQLite database operations
├── train_model.py         # NER model training script
├── train_data.py          # Training data loader
├── training_data.csv      # Annotated SMS training corpus
├── requirements.txt       # Python dependencies
├── README.md              # Project documentation
├── bank_ner_model/        # Trained spaCy model directory
│   ├── config.cfg
│   ├── meta.json
│   ├── tokenizer
│   └── ner/
└── mobile/                # React Native mobile app
    ├── App.js             # Main app component
    ├── app.json           # Expo configuration
    ├── package.json       # Node.js dependencies
    ├── screens/           # Application screens
    │   ├── HomeScreen.js
    │   ├── AddSMSScreen.js
    │   ├── AddManualScreen.js
    │   ├── TransactionsScreen.js
    │   ├── LedgersScreen.js
    │   ├── LedgerDetailScreen.js
    │   └── LinkTransactionsScreen.js
    └── services/
        └── api.js         # API service layer
```

---

## 10. Conclusion

This system presents a novel approach to personal expense tracking by leveraging machine learning-based Named Entity Recognition specifically trained for Indian bank SMS formats. The combination of:

1. **Custom NER model** for financial entity extraction
2. **End-to-end automated pipeline** from SMS to structured data
3. **Ledger-based organization** for contextual expense grouping
4. **Hybrid input system** supporting both automated and manual entry

...creates a unique solution that addresses the pain points of manual expense tracking while providing intelligent automation and flexible organization capabilities.

---

## 11. Appendix

### A. Sample SMS Formats Supported

```
1. HDFC Bank: Rs.45000 credited to a/c ending 4521 on 01-Dec-2024.
2. SBI Alert: INR 3500 debited from Acct XX6789 on 03-Dec-2024.
3. INR 4683 spent on Kotak Credit Card x2963 on 25-DEC-2025 at AIR INDIA LTD.
4. A/c *0911 Debited for Rs:170.00 on 22-12-2025 19:08:34 by Mob Bk.
5. Your a/c XXXXX31 debited for payee COLABA SWEET MART for Rs. 855.00 on 2025-12-13. -IOB
6. Debit INR 275000.00 Axis Bank A/c XX5945 07-01-26
```

### B. Dependencies

```
# Python (Backend)
fastapi>=0.104.0
uvicorn>=0.24.0
spacy>=3.7.0
pydantic>=2.5.0

# JavaScript (Mobile)
react-native
expo
@react-navigation/native
@react-navigation/bottom-tabs
@react-navigation/native-stack
```

---

**Document Prepared For:** Patent Novelty Verification  
**Project:** Intelligent Expense Tracker with SMS-Based NER  
**Contact:** Kavyan Jain
