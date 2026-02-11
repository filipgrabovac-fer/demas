from typing import Literal

from graph.states import MessagesState

def supervisor_routing(state: MessagesState) -> Literal["composer", "enhancer"]:
    return state["cmd"]
