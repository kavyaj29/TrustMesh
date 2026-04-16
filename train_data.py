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
import re
from pathlib import Path
from typing import List, Tuple, Dict, Any

# Path to the CSV file containing training data
CSV_PATH = Path(__file__).parent / "training_data.csv"


# CSV column mapping for each entity label
ENTITY_COLUMNS = [
    ("amount_start", "amount_end", "AMOUNT"),
    ("txn_type_start", "txn_type_end", "TXN_TYPE"),
    ("account_start", "account_end", "ACCOUNT"),
    ("date_start", "date_end", "DATE"),
    ("balance_start", "balance_end", "BALANCE"),
    ("bank_start", "bank_end", "BANK"),
    ("modality_start", "modality_end", "MODALITY"),
    ("merchant_start", "merchant_end", "MERCHANT"),
]


def _looks_like_label(text: str, label: str) -> bool:
    """Basic guardrails to reject clearly mismatched annotations."""
    value = text.strip()
    if not value:
        return False

    if label in {"AMOUNT", "BALANCE"}:
        return bool(re.search(r"\d", value))
    if label == "TXN_TYPE":
        return bool(re.search(r"debit|credit|spent|withdraw|deposit|receive|transfer|charg", value, re.IGNORECASE))
    if label == "DATE":
        return bool(re.search(r"today|\d", value, re.IGNORECASE))
    if label == "ACCOUNT":
        return bool(re.search(r"a/c|acct|account|card|x\d|\*\d|XX\d|\d{4,}", value, re.IGNORECASE))

    # BANK, MODALITY and MERCHANT can be free-form text.
    return True


def _extract_entity(
    row: Dict[str, str],
    text: str,
    row_number: int,
    start_col: str,
    end_col: str,
    label: str,
) -> Tuple[int, int, str] | None:
    """Return a validated entity tuple, otherwise None."""
    start_raw = row.get(start_col, "")
    end_raw = row.get(end_col, "")

    if not start_raw or not end_raw:
        return None

    try:
        start = int(start_raw)
        end = int(end_raw)
    except ValueError:
        print(f"[WARN] Row {row_number}: Non-integer span for {label} ({start_raw}, {end_raw})")
        return None

    if not (0 <= start < end <= len(text)):
        print(
            f"[WARN] Row {row_number}: Out-of-range span for {label} "
            f"({start}, {end}) in text length {len(text)}"
        )
        return None

    entity_text = text[start:end]
    if not _looks_like_label(entity_text, label):
        print(
            f"[WARN] Row {row_number}: Suspicious span for {label} -> "
            f"'{entity_text}' (chars {start}-{end})"
        )
        return None

    return (start, end, label)


def load_training_data(csv_path: Path = CSV_PATH) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Load training data from CSV file.
    
    Args:
        csv_path: Path to the CSV file
        
    Returns:
        List of tuples (text, {"entities": [(start, end, label), ...]})
    """
    training_data = []
    total_rows = 0
    dropped_entities = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            total_rows += 1
            text = row['text']
            entities = []

            for start_col, end_col, label in ENTITY_COLUMNS:
                entity = _extract_entity(
                    row=row,
                    text=text,
                    row_number=total_rows + 1,
                    start_col=start_col,
                    end_col=end_col,
                    label=label,
                )
                if entity is None:
                    if row.get(start_col) and row.get(end_col):
                        dropped_entities += 1
                    continue
                entities.append(entity)
            
            training_data.append((text, {"entities": entities}))

    if dropped_entities:
        print(
            f"[INFO] Dropped {dropped_entities} invalid entity spans while loading "
            f"{total_rows} rows from {csv_path.name}."
        )

    return training_data


# Load training data from CSV
TRAIN_DATA = load_training_data()


def validate_annotations():
    """
    Validates that all entity annotations are correctly aligned with the text.
    Useful for debugging annotation errors.
    """
    print("Validating training data annotations...\n")

    issue_count = 0
    for idx, (text, annot) in enumerate(TRAIN_DATA, 1):
        entities = annot["entities"]
        print(f"Example {idx} - Text: {text[:60]}...")

        for start, end, label in entities:
            if not (0 <= start < end <= len(text)):
                issue_count += 1
                print(f"  [INVALID] {label}: chars {start}-{end} out of range")
                continue
            extracted = text[start:end]
            if not _looks_like_label(extracted, label):
                issue_count += 1
                print(f"  [SUSPICIOUS] {label}: '{extracted}' (chars {start}-{end})")
            else:
                print(f"  {label}: '{extracted}' (chars {start}-{end})")

        print("-" * 50)

    if issue_count:
        print(f"\n[WARN] Validation finished with {issue_count} suspicious annotations.")
    else:
        print("\n[OK] All loaded annotations look valid.")
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
