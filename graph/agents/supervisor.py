from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from graph.models import supervisor_model_name
from graph.states import MessagesState
from dotenv import load_dotenv
load_dotenv()

class SupervisorResponse(BaseModel):
    """Response schema for the Supervisor agent."""
    response: str = Field(description="Reasoning for the routing decision")
    cmd: Literal["composer", "enhancer"] = Field(description="Next agent to route to")

supervisor_model = ChatGoogleGenerativeAI(
    model=supervisor_model_name,
    temperature=0,
).with_structured_output(SupervisorResponse)

def supervisor_node(state: MessagesState) -> MessagesState:
    last_message = state["messages"][-1].content if len(state["messages"]) > 0 else ""
    review_count = state["review_count"]

    prompt = PromptTemplate.from_template("""
    You are the Supervisor of a Data Enhancement pipeline.
        Your role is to orchestrate the workflow between two workers:
        1. "Enhancer": Modifies, cleans, and researches data.
        2. "Composer": Formats and exports the final data.

        ### DECISION LOGIC:


        - IF the status is "APPROVED":
        -> Your only job is to route to the "Composer".
        -> Do not provide new modification instructions.

        - If this is the first message (user request) or the status is "NEEDS_REVISION":
        -> You must route to the "Enhancer".
        -> You must provide a "reasoning" for the decision and instructions for the Enhancer for current task.

        ### OUTPUT
        - make sure to set the "cmd" field to the appropriate value after the decision is made.
        - make sure to provide reasoning for the decision in the "response" field.

    This is the last message from the REVIEWER agent:
    {last_message}

    If the review count is greater than 1, you must route to the "Composer".
    Review count: {review_count}
    """).format(last_message=last_message, review_count=review_count)

    response = supervisor_model.invoke(prompt)

    return {
        "messages": [
            *state["messages"],
            AIMessage(response.response),
        ],
        "cmd": response.cmd,
    }