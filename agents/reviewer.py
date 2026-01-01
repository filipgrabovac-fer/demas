from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from models import reviewer_model_name
from states import MessagesState
from dotenv import load_dotenv
load_dotenv()


class ReviewerResponse(BaseModel):
    """Response schema for the Reviewer agent."""
    status: Literal["APPROVED", "NEEDS_REVISION"] = Field(
        description="Whether the data modifications are approved or need revision"
    )
    reasoning: str = Field(description="Explanation of the review decision")


reviewer_model = ChatGoogleGenerativeAI(
    model=reviewer_model_name,
    temperature=0,
).with_structured_output(ReviewerResponse)

def reviewer_node(state: MessagesState) -> MessagesState:

    last_message = state["messages"][-1].content if len(state["messages"]) > 0 else ""

    prompt = PromptTemplate.from_template(
   """
    You are a Data Quality Auditor.
    You are reviewing a dataset modification performed by an automated agent.

    **Context:**
    - Enhancer's Claimed Actions and current data: {last_message}

    **Audit Checklist:**
    1. **Completeness:** Did the Enhancer actually do what was asked? (e.g., if asked to remove duplicates, are they gone?)
    2. **integrity:** Are there new NULL values where there shouldn't be?
    3. **Hallucination:** If data was enriched, does it look plausible?
    4. **Formatting:** Are the column names clean and consistent?

"""
    ).format(last_message=last_message)

    response = reviewer_model.invoke(prompt)
    return {
        "messages": [
            *state["messages"],
            AIMessage(f"Status: {response.status}. {response.reasoning}"),
        ],
        "review_count": state["review_count"] + 1,
    }