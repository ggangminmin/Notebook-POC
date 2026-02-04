import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 기존에 등록된 OPENAI_API_KEY를 자동으로 사용합니다.
const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    temperature: 0.7
});

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "{customInstructions}\n\n규칙:\n1. 각 질문은 반드시 한 줄에 하나씩 작성하십시오.\n2. 질문 앞에 숫자, 하이픈, 점 등의 기호를 절대 붙이지 마십시오.\n3. 오직 질문 문장만 출력하고 다른 설명은 생략하십시오."],
    ["user", "{keyword}"]
]);

// 랭체인 사슬(Chain) 구성
export const recommendationChain = prompt.pipe(model).pipe(new StringOutputParser());
