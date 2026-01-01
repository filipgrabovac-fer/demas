from pydantic import BaseModel


class DummyDataCSV(BaseModel):
    id: int
    company_name: str
    industry: str
    ceo: str
    founded_year: int
    age: int


class DummyDataJSON(BaseModel):
    records: list[DummyDataCSV]
    
DummyData = DummyDataJSON