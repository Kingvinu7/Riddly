import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAPI() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello!' }],
      max_tokens: 50,
    });
    
    console.log('✅ OpenAI API works!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

testAPI();
