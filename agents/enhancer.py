from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch
from models import enhancer_model_name
from states import MessagesState
from dotenv import load_dotenv
load_dotenv()

search_tool = TavilySearch(
    max_results=5,
    topic="general",
)


tools = [search_tool]

enhancer_model = ChatGoogleGenerativeAI(
    model=enhancer_model_name,
    temperature=0,
)

agent = create_agent(
    enhancer_model,
    tools=tools,
)



def enhancer_node(state: MessagesState) -> MessagesState:

    supervisor_instructions = state["messages"][-1].content if len(state["messages"]) > 0 else ""
    prompt = PromptTemplate.from_template("""
        You are an expert Data Scientist and Researcher.
        Your goal is to modify the dataset based on the Supervisor's instructions.

        **Current Context:**
        - Supervisor Instructions: {supervisor_instructions}

        **Response Strategy:**
        - If you have successfully modified the data, reply with: "TASK COMPLETED: [Brief summary of changes]."
        - If you encounter an error you cannot fix, reply with: "ERROR: [Description]."

        ## IMPORTANT 
        - make sure to follow the Supervisor's instructions strictly.
    {messages}
    """).format(supervisor_instructions=supervisor_instructions, messages=state["messages"])

    response = agent.invoke({"messages": [HumanMessage(prompt)]})
    agent_message = response["messages"][-1]
    return {
        "messages": [
            *state["messages"],
            agent_message
        ],
        "enhanced_data": agent_message.content,
    }