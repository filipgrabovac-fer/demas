from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from graph.models import composer_model_name
from graph.output_formats import build_dynamic_model
from graph.states import MessagesState
from dotenv import load_dotenv
load_dotenv()


def composer_node(state: MessagesState) -> MessagesState:
    schema_dict = state["schema"]
    DynamicDataModel = build_dynamic_model(schema_dict, "ComposerResponse")
    
    class ComposerResponseWrapper(BaseModel):
        composed_data: list[DynamicDataModel] = Field(
            description="The final formatted dataset as a list of record dictionaries"
        )
    
    composer_model = ChatGoogleGenerativeAI(
        model=composer_model_name,
        temperature=0,
    ).with_structured_output(ComposerResponseWrapper)

    enhanced_data = state["enhanced_data"]

    prompt = PromptTemplate.from_template("""
        You are a Data Composer and Formatter.
        Your goal is to assemble the final data product by combining the original data with any newly fetched information, and then formatting it for the user.

        **Enhanced Data:**
        {enhanced_data}

        **Instructions:**
        1. **Combine & Merge:** - Ensure that the "fetched data" corresponds correctly to the "original data" rows. 
        - If the data is fragmented (e.g., a separate list of emails), merge it into the main dataframe now.

        2. **Final Formatting:**
        - Convert the combined dataset into the format requested by the user (CSV, JSON, Markdown, etc.).
        - If no format is specified, default to a clean Markdown table for chat or CSV for files.

        **Output:**
        - Return the final formatted string.
        - Do not add commentary or summaries; just provide the data artifact.
        - Do not add annotations or comments to the data.
    """).format(enhanced_data=enhanced_data)

    response = composer_model.invoke(prompt)
    return {
        "messages": [
            *state["messages"],
            AIMessage(str(response.composed_data)),
        ],
        "composed_data": response.composed_data,
    }