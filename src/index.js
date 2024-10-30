import fs from 'fs';
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import 'dotenv/config'

const model = 'gemini-1.5-pro';

const llm = new ChatGoogleGenerativeAI({
  model,
  temperature: 0,
  maxRetries: 2,
});

const memory = new BufferMemory({
  memoryKey: 'history',
  returnMessages: true,
});

async function readProjectDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const fileStat = fs.statSync(filePath);

    if (fileStat.isDirectory()) {
      await readProjectDirectory(filePath);
    } else if (fileStat.isFile() && path.extname(filePath) === '.js') {
      const content = fs.readFileSync(filePath, 'utf-8');
      await interpretFileContent(content, filePath);
    }
  }
}

async function interpretFileContent(content, filePath) {
  try {
    const historicalContext = await memory.loadMemoryVariables();

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful assistant who understands everything about programming in the Javascript language.",
      ],
      ["human", `Considering the context: ${historicalContext?.historico || ''}\nInterpret the following code:\n{content}`],
        
    ]);

    const chain = prompt.pipe(llm);

    const response = await chain.invoke({
      content
    });

    const interpretation = response?.content;

    console.log(`File interpretation ${filePath}:\n`, interpretation);
    await memory.saveContext({inputValues: content} , {outputValues: interpretation});

  } catch (error) {
    console.error(`Error interpreting file ${filePath}:`, error);
  }
}


// Before running the script, set the desired path.
readProjectDirectory('./src/codes');
