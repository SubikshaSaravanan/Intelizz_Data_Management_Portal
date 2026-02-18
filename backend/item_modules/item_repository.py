from sqlalchemy import text
from datetime import datetime
from database import db


def save_item(payload: dict, created_by: int):
    """
    Save new Item
    Stores full dynamic payload as JSON
    """

    query = text("""
        INSERT INTO items (
            payload,
            created_by,
            created_at,
            updated_at
        )
        VALUES (
            :payload,
            :created_by,
            :created_at,
            :updated_at
        )
        RETURNING id, payload, created_at, updated_at
    """)

    result = db.session.execute(
        query,
        {
            "payload": payload,
            "created_by": created_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ).fetchone()

    db.session.commit()

    return result


def update_item_by_id(item_id: int, payload: dict, updated_by: int):
    """
    Update existing Item
    """

    query = text("""
        UPDATE items
        SET
            payload = :payload,
            updated_by = :updated_by,
            updated_at = :updated_at
        WHERE id = :item_id
        RETURNING id, payload, created_at, updated_at
    """)

    result = db.session.execute(
        query,
        {
            "item_id": item_id,
            "payload": payload,
            "updated_by": updated_by,
            "updated_at": datetime.utcnow()
        }
    ).fetchone()

    db.session.commit()

    return result


def fetch_item_by_id(item_id: int):
    """
    Fetch Item by ID
    Used by View / Edit page
    """

    query = text("""
        SELECT
            id,
            payload,
            created_at,
            updated_at
        FROM items
        WHERE id = :item_id
    """)

    result = db.session.execute(
        query,
        {"item_id": item_id}
    ).fetchone()

    return result
