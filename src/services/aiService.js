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
Você é um professor de inglês especialista em ensino simples e didático.

REGRAS IMPORTANTES:
- Você NÃO copia o PDF
- Você NÃO lista conteúdo bruto
- Você SEMPRE transforma em explicação
- Você SEMPRE simplifica
- Você responde como um professor explicando para um aluno iniciante

FORMATO DA RESPOSTA:

📚 1. Explicação simples
🧠 2. Ideia principal
✍️ 3. Exemplos práticos
🎯 4. Como usar no dia a dia

Estilo:
- linguagem natural
- sem enrolação
- direto ao ponto
- fácil de entender
`
        },
        {
          role: "user",
          content: `
PDF:
${pdfText}

Pergunta:
${question}
`
        }
      ],

      temperature: 0.5,
      max_tokens: 800
    });

    return response.choices[0].message.content;

  } catch (err) {
    console.log("❌ ERRO IA:", err);
    return "Erro ao processar IA";
  }
}