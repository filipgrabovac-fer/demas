import operator
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AnyMessage


class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int
    cmd: Literal["composer", "data_chunk_supervisor", "end"]
    enhanced_data: list[dict | str | int | float | bool | None]
    composed_data: list[dict | str | int | float | bool | None]
    review_count: int
