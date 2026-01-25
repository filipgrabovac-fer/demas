from typing import Optional
from pydantic import BaseModel, Field, create_model

_model_cache: dict[str, type[BaseModel]] = {}

def _parse_type(type_spec: str | type) -> type:
    """Parse type specification to Python type."""
    if isinstance(type_spec, type):
        return type_spec
    
    if not isinstance(type_spec, str):
        return str
    
    type_map = {"str": str, "int": int, "float": float, "bool": bool}
    type_spec = type_spec.strip().lower()
    
    if "|" in type_spec:
        parts = [p.strip() for p in type_spec.split("|")]
        base_type = type_map.get(parts[0], str)
        if any(p in ("null", "none") for p in parts):
            return Optional[base_type]
        return base_type
    
    return type_map.get(type_spec, str)


def build_dynamic_model(
    schema: dict[str, dict[str, str]],
    model_name: str = "DynamicDataModel",
) -> type[BaseModel]:
    """Build a Pydantic model dynamically from a schema.
    
    Args:
        schema: Dictionary mapping field names to field specs.
                Each field spec must have "type" key, and optionally "description".
                Type specs: "str", "int", "float", "bool", "str | null", etc.
        model_name: Name for the generated model class.
    
    Example:
        >>> schema = {
        ...     "id": {"type": "int", "description": "User ID"},
        ...     "name": {"type": "str", "description": "User name"},
        ...     "age": {"type": "int | null", "description": "User age"}
        ... }
        >>> Model = build_dynamic_model(schema, "UserModel")
    """
    schema_items = tuple(sorted(
        (name, spec.get("type", "str"), spec.get("description", ""))
        for name, spec in schema.items()
    ))
    cache_key = f"{model_name}:{str(schema_items)}"
    
    if cache_key in _model_cache:
        return _model_cache[cache_key]
    
    fields = {}
    for name, field_spec in schema.items():
        field_type = _parse_type(field_spec.get("type", "str"))
        description = field_spec.get("description", "")
        
        if description:
            fields[name] = (field_type, Field(..., description=description))
        else:
            fields[name] = (field_type, ...)
    
    model = create_model(model_name, **fields)
    _model_cache[cache_key] = model
    return model

DummyData = build_dynamic_model({
    "id": {"type": "int", "description": "The id of the company"},
    "company_name": {"type": "str", "description": "The name of the company"},
    "industry": {"type": "str", "description": "The industry of the company"},
    "ceo": {"type": "str", "description": "The CEO of the company"},
    "founded_year": {"type": "int", "description": "The year the company was founded"},
    "age": {"type": "int", "description": "The age of the company"},
    "ceo_net_worth": {"type": "int", "description": "The net worth of the CEO"},
})
