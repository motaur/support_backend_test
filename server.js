// Import dependencies
const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');

require('dotenv').config();
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs-extra');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Store conversations in memory for this example (in production, use a database)
const conversations = {};

// System instructions for the model
let systemInstruction = '';

readFileSync();

async function readFileSync() {
    const files = ['base'];
    try {
        // Reading all the files concurrently
        const fileContents = await Promise.all(files.map(file => fs.readFile(`instructions/${file}.txt`, 'utf8')));
        
        // Joining the content with line breaks
        systemInstruction = fileContents.join('\n');
        
    } catch (err) {
        console.error(err);
    }

    const words = systemInstruction.split(/\s+/);  // Split by one or more spaces
    console.log('words:', words.length);
    console.log('chars:', systemInstruction.length);
}

// Endpoint to interact with OpenAI SDK
app.post('/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).send('userId and message are required.');
  }

  // Initialize or continue the conversation for this user
  if (!conversations[userId]) {
    conversations[userId] = [
      { role: 'system', content: systemInstruction },
    ];
  }

  // Add user's message to the conversation
  conversations[userId].push({
    role: 'user',
    content: message,
  });

  try {
    // Send the conversation to OpenAI
    const response = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: conversations[userId],
    });

    // Get the assistant's response
    const assistantMessage = response.data.choices[0].message.content;

    // Add assistant's message to the conversation history
    conversations[userId].push({
      role: 'assistant',
      content: assistantMessage,
    });

    const x = {
        role: 'system',
        content: 'generate short question in the same topic as it started,  that can be answered from the knowlege base. Do not repeat questions that already been asked',
      }

    const conversationWithSuggestionRequest = [...conversations[userId], x];

    const suggestionsResponse = await openai.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: conversationWithSuggestionRequest
      });

     // Respond with the assistant's message and suggested questions
    res.json({ response: assistantMessage, suggestions: suggestionsResponse.data.choices[0].message.content });
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    res.status(500).send('Error communicating with OpenAI');
  }
});

app.get('/avatar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/assistant.png'));
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

