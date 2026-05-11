import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function askAI(question, pdfText) {
  try {

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",

      messages: [
        {
          role: "system",
          content: `
Você é um professor de inglês natural, simples e amigável.

Sua função é ajudar o aluno a entender o conteúdo do PDF de forma clara e leve, como uma conversa real.

REGRAS IMPORTANTES:
- Explique principalmente em português
- Use inglês apenas nos exemplos
- Não force estrutura fixa de resposta
- Não transforme a resposta em apostila
- Evite repetição de formato
- Adapte a explicação dependendo da pergunta
- Seja natural, como um professor explicando em sala

Quando usar exemplos:
- As frases em inglês devem ser completas e naturais
- Nunca misture português dentro das frases em inglês

Objetivo:
Fazer o aluno entender de forma simples, fluida e humana, não mecânica.
          `
        },

        {
          role: "user",
          content: `
Conteúdo do PDF:
${pdfText}

Pergunta do aluno:
${question}
          `
        }
      ],

      temperature: 0.7
    });

    return response.choices[0].message.content;

  } catch (err) {
    console.log("❌ ERRO IA:", err);
    return "Erro ao processar IA";
  }
}