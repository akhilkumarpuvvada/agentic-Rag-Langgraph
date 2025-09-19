import { initLLM } from "../llm.js";

const llm = initLLM();


export const checkTruthFullness = async (answer, context) => {
    const messages = [
        {
            role: "system", content: "You are a strict fact-checker. Only check if the answer is supported or not"
        },

        { role: "user",
            content:  `Context:\n${context}\n\nAnswer:\n${answer}\n\nQuestion: Is the answer fully supported by the context? Reply only with "yes" or "no"`,
        }

    ]
    const res = await llm.invoke(messages);
    const reply = res.content.toLowerCase();
    return {
        isFaithful: reply.includes("yes"),
    }
}

