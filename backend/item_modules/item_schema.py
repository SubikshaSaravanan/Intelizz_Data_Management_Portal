from typing import Optional, Dict, Any, List
from pydantic import BaseModel, model_validator, ConfigDict

class ItemBaseSchema(BaseModel):
    # Allow extra fields so Pydantic doesn't crash on unknown OTM fields
    model_config = ConfigDict(extra='allow') 

    itemGid: Optional[str] = None
    itemXid: Optional[str] = None
    itemName: Optional[str] = None
    domainName: Optional[str] = "INTL"
    
    # These are explicitly handled, others will be caught by 'extra'
    packaging: Optional[List[Dict[str, Any]]] = None
    itemDetails: Optional[List[Dict[str, Any]]] = None

    @model_validator(mode="before")
    @classmethod
    def handle_empty_strings(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {
                k: (None if str(v).strip() == "" or str(v).lower() == "none" else v) 
                for k, v in data.items()
            }
        return data

def validate_item_payload(data: dict):
    # We use a try/except here so the 400 error actually tells us what is wrong
    try:
        return ItemBaseSchema(**data)
    except Exception as e:
        # This print will show up in your Flask terminal
        print(f"SCHEMA VALIDATION ERROR: {str(e)}")
        raise e