from typing import Optional
from pydantic import BaseModel, create_model

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
    schema: dict[str, str | type],
    model_name: str = "DynamicDataModel",
) -> type[BaseModel]:
    """Build a Pydantic model dynamically from a schema.
    
    Args:
        schema: Dictionary mapping field names to type specs ("str", "int", "str | null", etc.)
        model_name: Name for the generated model class.
    
    Example:
        >>> schema = {"id": "int", "name": "str", "age": "int | null"}
        >>> Model = build_dynamic_model(schema, "UserModel")
    """
    cache_key = f"{model_name}:{str(sorted(schema.items()))}"
    if cache_key in _model_cache:
        return _model_cache[cache_key]
    
    fields = {name: (_parse_type(spec), ...) for name, spec in schema.items()}
    model = create_model(model_name, **fields)
    _model_cache[cache_key] = model
    return model

DummyData = build_dynamic_model({
    "id": "int",
    "company_name": "str",
    "industry": "str",
    "ceo": "str",
    "founded_year": "int",
    "age": "int",
})