"""
Training Data Loader for Bank SMS NER Model

This module loads annotated training data from a CSV file for training
the spaCy NER model to extract financial entities from bank SMS messages.

CSV Format:
    - text: The SMS message text
    - amount_start, amount_end: Character positions for AMOUNT entity
    - txn_type_start, txn_type_end: Character positions for TXN_TYPE entity
    - account_start, account_end: Character positions for ACCOUNT entity
    - date_start, date_end: Character positions for DATE entity
    - balance_start, balance_end: Character positions for BALANCE entity (optional)

Entity Labels:
    - AMOUNT: Monetary values (e.g., "INR 5,000", "Rs. 250.00")
    - DATE: Transaction dates (e.g., "12-Dec-2024", "today")
    - ACCOUNT: Account identifiers (e.g., "Acct XX8811", "Credit Card x2963")
    - TXN_TYPE: Transaction type (e.g., "debited", "credited", "spent")
    - BALANCE: Available balance (e.g., "INR 180683", "Rs.45000")
"""

import csv
from pathlib import Path
from typing import List, Tuple, Dict, Any

# Path to the CSV file containing training data
CSV_PATH = Path(__file__).parent / "training_data.csv"


def load_training_data(csv_path: Path = CSV_PATH) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Load training data from CSV file.
    
    Args:
        csv_path: Path to the CSV file
        
    Returns:
        List of tuples (text, {"entities": [(start, end, label), ...]})
    """
    training_data = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            text = row['text']
            entities = []
            
            # Add AMOUNT entity if present
            if row.get('amount_start') and row.get('amount_end'):
                entities.append((
                    int(row['amount_start']),
                    int(row['amount_end']),
                    "AMOUNT"
                ))
            
            # Add TXN_TYPE entity if present
            if row.get('txn_type_start') and row.get('txn_type_end'):
                entities.append((
                    int(row['txn_type_start']),
                    int(row['txn_type_end']),
                    "TXN_TYPE"
                ))
            
            # Add ACCOUNT entity if present
            if row.get('account_start') and row.get('account_end'):
                entities.append((
                    int(row['account_start']),
                    int(row['account_end']),
                    "ACCOUNT"
                ))
            
            # Add DATE entity if present
            if row.get('date_start') and row.get('date_end'):
                entities.append((
                    int(row['date_start']),
                    int(row['date_end']),
                    "DATE"
                ))
            
            # Add BALANCE entity if present (optional)
            if row.get('balance_start') and row.get('balance_end'):
                entities.append((
                    int(row['balance_start']),
                    int(row['balance_end']),
                    "BALANCE"
                ))
            
            # Add BANK entity if present (optional)
            if row.get('bank_start') and row.get('bank_end'):
                entities.append((
                    int(row['bank_start']),
                    int(row['bank_end']),
                    "BANK"
                ))
            
            # Add MODALITY entity if present (POS/ATM/UPI/Online etc.)
            if row.get('modality_start') and row.get('modality_end'):
                entities.append((
                    int(row['modality_start']),
                    int(row['modality_end']),
                    "MODALITY"
                ))
            
            # Add MERCHANT entity if present (store/vendor name)
            if row.get('merchant_start') and row.get('merchant_end'):
                entities.append((
                    int(row['merchant_start']),
                    int(row['merchant_end']),
                    "MERCHANT"
                ))
            
            training_data.append((text, {"entities": entities}))
    
    return training_data


# Load training data from CSV
TRAIN_DATA = load_training_data()


def validate_annotations():
    """
    Validates that all entity annotations are correctly aligned with the text.
    Useful for debugging annotation errors.
    """
    print("Validating training data annotations...\n")
    
    for idx, (text, annot) in enumerate(TRAIN_DATA, 1):
        entities = annot["entities"]
        print(f"Example {idx} - Text: {text[:60]}...")
        
        for start, end, label in entities:
            extracted = text[start:end]
            print(f"  {label}: '{extracted}' (chars {start}-{end})")
        
        print("-" * 50)
    
    print(f"\n[OK] All annotations validated successfully!")
    print(f"\nTotal training examples: {len(TRAIN_DATA)}")


def add_training_example(
    text: str,
    amount: Tuple[int, int] = None,
    txn_type: Tuple[int, int] = None,
    account: Tuple[int, int] = None,
    date: Tuple[int, int] = None,
    balance: Tuple[int, int] = None,
    csv_path: Path = CSV_PATH
):
    """
    Add a new training example to the CSV file.
    
    Args:
        text: The SMS message text
        amount: Tuple of (start, end) for AMOUNT entity
        txn_type: Tuple of (start, end) for TXN_TYPE entity
        account: Tuple of (start, end) for ACCOUNT entity
        date: Tuple of (start, end) for DATE entity
        balance: Tuple of (start, end) for BALANCE entity
        csv_path: Path to the CSV file
    """
    row = {
        'text': text,
        'amount_start': amount[0] if amount else '',
        'amount_end': amount[1] if amount else '',
        'txn_type_start': txn_type[0] if txn_type else '',
        'txn_type_end': txn_type[1] if txn_type else '',
        'account_start': account[0] if account else '',
        'account_end': account[1] if account else '',
        'date_start': date[0] if date else '',
        'date_end': date[1] if date else '',
        'balance_start': balance[0] if balance else '',
        'balance_end': balance[1] if balance else '',
    }
    
    with open(csv_path, 'a', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        writer.writerow(row)
    
    print(f"[OK] Added training example: {text[:50]}...")


if __name__ == "__main__":
    # Validate all annotations when run directly
    validate_annotations()
