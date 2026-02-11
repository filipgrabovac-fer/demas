from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch
from graph.models import enhancer_model_name
from graph.states import MessagesState
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

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert Data Scientist and Researcher.
Your goal is to modify the dataset based on the Supervisor's instructions.

**Response Strategy:**
- If you have successfully modified the data, reply with: "TASK COMPLETED: [Brief summary of changes]."
- If you encounter an error you cannot fix, reply with: "ERROR: [Description]."

## IMPORTANT 
- make sure to follow the Supervisor's instructions strictly.
- always return all of the data you have both modified and the original data."""),
    MessagesPlaceholder(variable_name="messages"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_tool_calling_agent(enhancer_model, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

def enhancer_node(state: MessagesState) -> MessagesState:

    supervisor_instructions = state["messages"][-1].content if len(state["messages"]) > 0 else ""
    
    instruction_message = HumanMessage(
        content=f"Supervisor Instructions: {supervisor_instructions}\n\nPlease modify the dataset according to these instructions."
    )

    response = agent_executor.invoke({
        "messages": [*state["messages"], instruction_message]
    })
    
    agent_message = AIMessage(content=response.get("output", ""))
    
    return {
        "messages": [
            *state["messages"],
            agent_message
        ],
        "enhanced_data": [agent_message.content],
   } 