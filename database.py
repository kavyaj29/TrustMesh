"""
Database Layer for Expense Tracker

This module provides SQLite database operations for storing and retrieving
financial transactions parsed from bank SMS messages.

Tables:
    - transactions: Stores all parsed transactions with entities
"""

import sqlite3
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

# Database file path
DB_PATH = Path("./expense_tracker.db")


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    """
    Initialize the database with required tables.
    Call this on application startup.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Create ledgers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ledgers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT DEFAULT '📒',
                color TEXT DEFAULT '#3B82F6',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
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
            )
        """)
        
        # Add ledger_id column if it doesn't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN ledger_id INTEGER REFERENCES ledgers(id)")
        except:
            pass  # Column already exists
        
        # Add note column if it doesn't exist
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN note TEXT")
        except:
            pass  # Column already exists
        
        # Add modality column (POS/ATM/UPI/Online etc.) for Delegated Trust Protocol
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN modality TEXT")
        except:
            pass  # Column already exists
        
        # Add channel column (physical/remote) for verification routing
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN channel TEXT")
        except:
            pass  # Column already exists
        
        # Add verified column for mesh verification status
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN verified BOOLEAN DEFAULT FALSE")
        except:
            pass  # Column already exists
        
        # Add verified_by column (device alias that verified the transaction)
        try:
            cursor.execute("ALTER TABLE transactions ADD COLUMN verified_by TEXT")
        except:
            pass  # Column already exists
        
        # ============ Phase 2: Multi-Device Mesh Tables ============
        
        # Create trusted_devices table for registered family devices
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trusted_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_uuid TEXT UNIQUE NOT NULL,
                alias TEXT NOT NULL,
                registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        
        # Create mesh_telemetry table for device location updates
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mesh_telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER REFERENCES trusted_devices(id),
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                accuracy REAL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        print("[OK] Database initialized successfully")


def add_transaction(
    amount: float,
    txn_type: str,
    txn_date: str,
    account: Optional[str] = None,
    balance: Optional[float] = None,
    merchant: Optional[str] = None,
    category: str = "Other",
    raw_sms: Optional[str] = None,
    ledger_id: Optional[int] = None,
    modality: Optional[str] = None,
    channel: Optional[str] = None,
    verified: bool = False,
    verified_by: Optional[str] = None
) -> int:
    """
    Add a new transaction to the database.
    
    Args:
        modality: Transaction channel indicator (POS/ATM/UPI/Online)
        channel: Classification (physical/remote) for verification routing
        verified: Whether transaction was mesh-verified
        verified_by: Device alias that verified the transaction
    
    Returns:
        int: The ID of the newly created transaction
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions 
            (amount, txn_type, account, txn_date, balance, merchant, category, raw_sms, ledger_id, modality, channel, verified, verified_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (amount, txn_type, account, txn_date, balance, merchant, category, raw_sms, ledger_id, modality, channel, verified, verified_by))
        conn.commit()
        return cursor.lastrowid


def get_all_transactions(
    limit: int = 100,
    offset: int = 0,
    txn_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve transactions with optional filters.
    
    Args:
        limit: Maximum number of transactions to return
        offset: Number of transactions to skip
        txn_type: Filter by transaction type (debited/credited/spent)
        start_date: Filter transactions from this date (YYYY-MM-DD)
        end_date: Filter transactions until this date (YYYY-MM-DD)
    
    Returns:
        List of transaction dictionaries
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []
        
        if txn_type:
            query += " AND LOWER(txn_type) = LOWER(?)"
            params.append(txn_type)
        
        if start_date:
            query += " AND txn_date >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND txn_date <= ?"
            params.append(end_date)
        
        query += " ORDER BY txn_date DESC, created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]


def get_transaction_by_id(txn_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve a single transaction by ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE id = ?", (txn_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_transaction(txn_id: int) -> bool:
    """Delete a transaction by ID. Returns True if deleted."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ?", (txn_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_summary(
    period: str = "daily",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get spending summary for a given period.
    
    Args:
        period: 'daily', 'weekly', or 'monthly'
        start_date: Start date for the summary
        end_date: End date for the summary
    
    Returns:
        Dictionary with summary statistics
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Set default date range based on period
        today = date.today()
        if not end_date:
            # Include future-dated transactions (up to 7 days ahead)
            end_date = (today + __import__('datetime').timedelta(days=7)).isoformat()
        
        if not start_date:
            if period == "daily":
                start_date = today.isoformat()
            elif period == "weekly":
                start_date = (today - __import__('datetime').timedelta(days=7)).isoformat()
            else:  # monthly
                start_date = (today - __import__('datetime').timedelta(days=30)).isoformat()
        
        # Get total spent (debited/spent transactions)
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_spent
            FROM transactions
            WHERE LOWER(txn_type) IN ('debited', 'debit', 'spent', 'withdrawn', 'charged', 'transferred')
            AND txn_date >= ? AND txn_date <= ?
        """, (start_date, end_date))
        total_spent = cursor.fetchone()[0]
        
        # Get total credited
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0) as total_credited
            FROM transactions
            WHERE LOWER(txn_type) IN ('credited', 'credit', 'received', 'deposited')
            AND txn_date >= ? AND txn_date <= ?
        """, (start_date, end_date))
        total_credited = cursor.fetchone()[0]
        
        # Get transaction count
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM transactions
            WHERE txn_date >= ? AND txn_date <= ?
        """, (start_date, end_date))
        txn_count = cursor.fetchone()[0]
        
        # Get category-wise breakdown (for debits only)
        cursor.execute("""
            SELECT category, SUM(amount) as total
            FROM transactions
            WHERE LOWER(txn_type) IN ('debited', 'debit', 'spent', 'withdrawn', 'charged')
            AND txn_date >= ? AND txn_date <= ?
            GROUP BY category
            ORDER BY total DESC
        """, (start_date, end_date))
        categories = [{"category": row[0], "total": row[1]} for row in cursor.fetchall()]
        
        return {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "total_spent": round(total_spent, 2),
            "total_credited": round(total_credited, 2),
            "net_flow": round(total_credited - total_spent, 2),
            "transaction_count": txn_count,
            "category_breakdown": categories
        }


def update_transaction(
    txn_id: int,
    category: Optional[str] = None,
    merchant: Optional[str] = None,
    ledger_id: Optional[int] = None
) -> bool:
    """Update transaction category, merchant, or ledger."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if category:
            updates.append("category = ?")
            params.append(category)
        
        if merchant:
            updates.append("merchant = ?")
            params.append(merchant)
        
        if ledger_id is not None:
            updates.append("ledger_id = ?")
            params.append(ledger_id if ledger_id > 0 else None)
        
        if not updates:
            return False
        
        params.append(txn_id)
        query = f"UPDATE transactions SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        return cursor.rowcount > 0


# ============ LEDGER FUNCTIONS ============

def create_ledger(
    name: str,
    description: Optional[str] = None,
    icon: str = "📒",
    color: str = "#3B82F6"
) -> int:
    """Create a new ledger. Returns the ledger ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ledgers (name, description, icon, color)
            VALUES (?, ?, ?, ?)
        """, (name, description, icon, color))
        conn.commit()
        return cursor.lastrowid


def get_all_ledgers() -> List[Dict[str, Any]]:
    """Get all ledgers with transaction count and totals."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                l.*,
                COUNT(t.id) as transaction_count,
                COALESCE(SUM(CASE WHEN LOWER(t.txn_type) IN ('debited', 'debit', 'spent', 'withdrawn', 'charged') THEN t.amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN LOWER(t.txn_type) IN ('credited', 'credit', 'received', 'deposited') THEN t.amount ELSE 0 END), 0) as total_credited
            FROM ledgers l
            LEFT JOIN transactions t ON t.ledger_id = l.id
            GROUP BY l.id
            ORDER BY l.created_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_ledger_by_id(ledger_id: int) -> Optional[Dict[str, Any]]:
    """Get a ledger by ID with its transactions."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get ledger info
        cursor.execute("SELECT * FROM ledgers WHERE id = ?", (ledger_id,))
        ledger = cursor.fetchone()
        if not ledger:
            return None
        
        ledger_dict = dict(ledger)
        
        # Get transactions for this ledger
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE ledger_id = ? 
            ORDER BY txn_date DESC, created_at DESC
        """, (ledger_id,))
        transactions = [dict(row) for row in cursor.fetchall()]
        
        ledger_dict['transactions'] = transactions
        return ledger_dict


def delete_ledger(ledger_id: int) -> bool:
    """Delete a ledger. Transactions will have their ledger_id set to NULL."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Unlink transactions
        cursor.execute("UPDATE transactions SET ledger_id = NULL WHERE ledger_id = ?", (ledger_id,))
        # Delete ledger
        cursor.execute("DELETE FROM ledgers WHERE id = ?", (ledger_id,))
        conn.commit()
        return cursor.rowcount > 0


def add_manual_transaction(
    amount: float,
    txn_type: str,
    txn_date: str,
    ledger_id: Optional[int] = None,
    category: str = "Other",
    note: Optional[str] = None,
    account: Optional[str] = None
) -> int:
    """Add a manual transaction (without SMS parsing). Returns transaction ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions 
            (amount, txn_type, txn_date, ledger_id, category, note, account)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (amount, txn_type, txn_date, ledger_id, category, note, account))
        conn.commit()
        return cursor.lastrowid


# ============ Phase 2: Multi-Device Mesh Functions ============

def register_device(device_uuid: str, alias: str) -> int:
    """
    Register a new trusted device in the mesh.
    
    Args:
        device_uuid: Unique hardware identifier
        alias: Human-readable name ("Sister", "Father", etc.)
        
    Returns:
        Device ID
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO trusted_devices (device_uuid, alias)
            VALUES (?, ?)
        """, (device_uuid, alias))
        conn.commit()
        return cursor.lastrowid


def get_all_devices() -> List[Dict[str, Any]]:
    """Get all registered trusted devices."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, device_uuid, alias, registered_at, is_active
            FROM trusted_devices
            ORDER BY registered_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_device_by_uuid(device_uuid: str) -> Optional[Dict[str, Any]]:
    """Get a device by its UUID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, device_uuid, alias, registered_at, is_active
            FROM trusted_devices
            WHERE device_uuid = ?
        """, (device_uuid,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_device_status(device_id: int, is_active: bool) -> bool:
    """Activate or deactivate a device."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE trusted_devices
            SET is_active = ?
            WHERE id = ?
        """, (is_active, device_id))
        conn.commit()
        return cursor.rowcount > 0


def update_telemetry(device_id: int, latitude: float, longitude: float, accuracy: Optional[float] = None) -> int:
    """
    Store a location update from a device.
    
    Args:
        device_id: ID of the reporting device
        latitude: GPS latitude
        longitude: GPS longitude
        accuracy: Optional GPS accuracy in meters
        
    Returns:
        Telemetry record ID
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO mesh_telemetry (device_id, latitude, longitude, accuracy)
            VALUES (?, ?, ?, ?)
        """, (device_id, latitude, longitude, accuracy))
        conn.commit()
        return cursor.lastrowid


def get_active_device_locations() -> List[Dict[str, Any]]:
    """
    Get the latest location for each active device.
    
    Returns:
        List of devices with their most recent GPS coordinates
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                d.id as device_id,
                d.alias,
                d.device_uuid,
                t.latitude,
                t.longitude,
                t.accuracy,
                t.timestamp
            FROM trusted_devices d
            INNER JOIN (
                SELECT device_id, latitude, longitude, accuracy, timestamp,
                       ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY timestamp DESC) as rn
                FROM mesh_telemetry
            ) t ON d.id = t.device_id AND t.rn = 1
            WHERE d.is_active = TRUE
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def update_transaction_verification(txn_id: int, verified: bool, verified_by: Optional[str] = None) -> bool:
    """
    Update the verification status of a transaction.
    
    Args:
        txn_id: Transaction ID to update
        verified: Whether transaction was verified
        verified_by: Alias of device that verified (e.g., "Sister")
        
    Returns:
        True if transaction was updated
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE transactions
            SET verified = ?, verified_by = ?
            WHERE id = ?
        """, (verified, verified_by, txn_id))
        conn.commit()
        return cursor.rowcount > 0


# Initialize database when module is imported
if __name__ == "__main__":
    init_database()
    print(f"Database created at: {DB_PATH.absolute()}")

