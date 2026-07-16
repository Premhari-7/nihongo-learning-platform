const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ msg: 'Message is required and must be text' });
        }

        // Basic Prompt Injection Protection
        const blockedKeywords = ['ignore previous', 'forget previous', 'system prompt', 'you are not', 'disregard', 'bypass'];
        const isInjectionAttempt = blockedKeywords.some(kw => message.toLowerCase().includes(kw));

        if (isInjectionAttempt || message.length > 2000) {
            return res.status(400).json({ reply: "A true samurai does not fall for trickery. Please ask a proper question about Japanese." });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a wise and highly knowledgeable Japanese Samurai AI named Jin Sakai. You assist users in learning the Japanese language (Nihongo). CRITICAL: Keep your answers extremely concise, clear, and simple so beginners can easily understand. Do not be overly verbose. You are a master of all languages, so you must always detect the user\'s language and respond in that exact same language to clear their doubts. Infuse a subtle touch of samurai spirit and Japanese words (with Romaji), but prioritize efficiency and simplicity in your explanations.'
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            model: 'llama-3.3-70b-versatile', // Highly knowledgeable model
            temperature: 0.5, // Lower temperature for more focused, direct answers
            max_tokens: 400,
        });

        const reply = completion.choices[0]?.message?.content || 'Silence is a warrior\'s best answer.';

        res.json({ reply });
    } catch (err) {
        console.error('Groq API Error:', err);
        res.status(500).json({ error: 'Failed to connect to Samurai brain.' });
    }
});

module.exports = router;
