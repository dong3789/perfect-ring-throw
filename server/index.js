const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes placeholder
app.get('/api/scores', (req, res) => {
    // TODO: Connect to PostgreSQL
    res.json({
        leaderboard: [
            { rank: 1, name: 'ProGamer', score: 127, date: '2026-01-15' },
            { rank: 2, name: 'RingMaster', score: 89, date: '2026-01-14' },
            { rank: 3, name: 'Player123', score: 76, date: '2026-01-13' }
        ]
    });
});

app.post('/api/scores', express.json(), (req, res) => {
    const { name, score } = req.body;
    // TODO: Save to PostgreSQL
    console.log(`New score: ${name} - ${score}`);
    res.json({ success: true, rank: 1 });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, () => {
    console.log(`🎯 Perfect Ring Toss server running on http://localhost:${PORT}`);
});
