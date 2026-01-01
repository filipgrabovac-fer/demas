from typing import Literal
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate
from langgraph.graph import START, END, StateGraph

from agents.composer import composer_node, ComposerResponse
from agents.enhancer import enhancer_node
from agents.reviewer import reviewer_node
from agents.supervisor import supervisor_node
from dummy_data import dummy_data
from states import MessagesState
from utils import CsvChunker

from dotenv import load_dotenv
load_dotenv()

def supervisor_routing(state: MessagesState) -> Literal["composer", "enhancer"]:
    return state["cmd"]

graph = StateGraph(MessagesState)
graph.add_node("supervisor", supervisor_node)
graph.add_node("composer", composer_node)
graph.add_node("enhancer", enhancer_node)
graph.add_node("reviewer", reviewer_node)

graph.add_edge(START, "supervisor")
graph.add_conditional_edges("supervisor", supervisor_routing, {
    "composer": "composer",
    "enhancer": "enhancer"
})

graph.add_edge("enhancer", "reviewer")
graph.add_edge("reviewer", "supervisor")
graph.add_edge("composer", END)

compiled_graph = graph.compile()

compiled_graph.get_graph().draw_mermaid_png()
    

for chunk in CsvChunker(dummy_data, 10).chunk():
    prompt_template = PromptTemplate.from_template("""I have a raw dataset of tech companies that needs cleaning and enrichment.

        1. Data Cleaning:

        Fix inconsistent capitalization in the company_name column (use Title Case, e.g., 'OpenAI').

        Standardize the industry column: map terms like 'Artificial Intelligence' or 'ML' to a single category: 'AI'.

        2. Enrichment:

        Search for and fill in any missing values in the ceo column using current real-world data. 

        ## IMPORTANT
        - don't add new columns or parameters if not specified in the output format
        - don't delete existing columns or parameters if not specified in the output format

        Here is the raw data:{chunk}
        
        Output format:
        {output_format}
        """).format(chunk=chunk, output_format=ComposerResponse.model_json_schema())
    result = compiled_graph.invoke({
        "messages": [
            HumanMessage(prompt_template),
        ],  
        "review_count": 0,
    })


    print(result["messages"][-1].content)

    exit(1)