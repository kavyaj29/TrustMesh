# Bank SMS NER Model

A custom Named Entity Recognition (NER) model built with spaCy to extract financial entities from Indian bank SMS messages.

## 🎯 Entities Extracted

| Entity | Description | Examples |
|--------|-------------|----------|
| **AMOUNT** | Monetary values | `INR 5,000`, `Rs. 250.00`, `5000` |
| **DATE** | Transaction dates | `12-Dec-2024`, `today`, `12/05/25` |
| **ACCOUNT** | Account identifiers | `Acct XX8811`, `a/c ending 1234` |
| **TXN_TYPE** | Transaction type | `debited`, `credited`, `spent`, `deposited` |

## 📁 Project Structure

```
expense-tracker/
├── train_data.py      # Training data with 25 annotated SMS examples
├── train_model.py     # Model training script
├── api.py             # FastAPI REST API wrapper
├── requirements.txt   # Python dependencies
├── README.md          # Documentation
└── bank_ner_model/    # Trained model (generated after training)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train_model.py
```

This will:
- Create a blank spaCy English model
- Train the NER component on 25 annotated bank SMS examples
- Save the trained model to `./bank_ner_model`
- Test the model on sample SMS messages

Expected output:
```
============================================================
BANK SMS NER MODEL TRAINING
============================================================
✓ Created blank model with NER component
  Entity labels: ['AMOUNT', 'DATE', 'ACCOUNT', 'TXN_TYPE']

============================================================
Starting NER Training
============================================================
Training examples: 25
Iterations: 30

  Iteration   1/30 | Loss: 45.2341
  Iteration   5/30 | Loss: 12.3456
  ...
  Iteration  30/30 | Loss: 0.5678

✓ Training completed!
✓ Model saved to: ./bank_ner_model
```

### 3. Run the API Server

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Or simply:
```bash
python api.py
```

### 4. Test the API

**Using curl:**
```bash
curl -X POST "http://localhost:8000/extract" \
     -H "Content-Type: application/json" \
     -d '{"sms": "HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024"}'
```

**Expected Response:**
```json
{
    "sms": "HDFC Bank: Rs. 5,000 credited to a/c XX1234 on 14-Dec-2024",
    "entities": [
        {"text": "Rs. 5,000", "label": "AMOUNT", "start": 12, "end": 21},
        {"text": "credited", "label": "TXN_TYPE", "start": 22, "end": 30},
        {"text": "a/c XX1234", "label": "ACCOUNT", "start": 34, "end": 44},
        {"text": "14-Dec-2024", "label": "DATE", "start": 48, "end": 59}
    ],
    "entity_count": 4
}
```

## 📚 API Documentation

Once the server is running, access the interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information |
| `GET` | `/health` | Health check |
| `POST` | `/extract` | Extract entities from single SMS |
| `POST` | `/extract/batch` | Extract entities from multiple SMS |

## 🔧 Customization

### Adding More Training Data

Edit `train_data.py` to add more examples:

```python
TRAIN_DATA = [
    # Add your new examples here
    (
        "Your bank SMS text here",
        {"entities": [
            (start, end, "ENTITY_LABEL"),
            # More entities...
        ]}
    ),
    # Existing examples...
]
```

### Validating Annotations

Run the validation script:
```bash
python train_data.py
```

This will verify that all entity annotations are correctly aligned with the text.

### Adjusting Training Parameters

In `train_model.py`, you can modify:
- `n_iter`: Number of training iterations (default: 30)
- `drop`: Dropout rate for regularization (default: 0.35)
- Batch size: Adjust `compounding(4.0, 32.0, 1.001)` parameters

## 📊 Training Data Coverage

The training data includes 25 examples covering:

- ✅ **Credit transactions**: Salary, refunds, cashback, UPI credits
- ✅ **Debit transactions**: ATM withdrawal, UPI payments, bill payments
- ✅ **Multiple banks**: HDFC, SBI, ICICI, Axis, Kotak, PNB, and more
- ✅ **Date formats**: `12-Dec-2024`, `12/05/25`, `today`
- ✅ **Amount formats**: `INR 5,000`, `Rs. 250.00`, `Rs.1,299`, `5000`

## 🛠️ Troubleshooting

### Model not loading
```
⚠ Model not found at: ./bank_ner_model
```
**Solution**: Run `python train_model.py` to train and save the model.

### Poor entity recognition
- Add more diverse training examples
- Increase training iterations
- Verify annotation accuracy with `python train_data.py`

## 📝 License

MIT License - Feel free to use and modify for your projects.
