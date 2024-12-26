const xlsx = require('xlsx');
const fs = require('fs');

// Read Excel file
const workbook = xlsx.readFile('feedbacks.xlsx');

// Get the first sheet
const sheet_name_list = workbook.SheetNames;
const feedbackSheet = workbook.Sheets[sheet_name_list[0]];

// Convert sheet to JSON
const feedbackData = xlsx.utils.sheet_to_json(feedbackSheet);

// Save as JSON file (or import to a database)
fs.writeFileSync('feedbackData.json', JSON.stringify(feedbackData, null, 2));

console.log("Feedback Data Imported Successfully!");

<script>
    // Fetch feedback data from backend API
    async function fetchFeedback() {
        try {
            const response = await fetch('http://localhost:3000/api/feedback');
            const feedbacks = await response.json();
            
            // Render the feedback on the page
            renderFeedback(feedbacks);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    }

    // Function to render feedback
    function renderFeedback(feedbacks) {
        const feedbackList = document.getElementById('feedback-list');
        feedbackList.innerHTML = ''; // Clear existing feedback list

        feedbacks.forEach(feedback => {
            const feedbackCard = document.createElement('div');
            feedbackCard.classList.add('card');

            feedbackCard.innerHTML = `
                <h3>${feedback.Title}</h3>
                <p>${feedback.Description}</p>
                <div class="vote-buttons">
                    <button class="upvote" onclick="vote(${feedback.id}, 'up')">Upvote</button>
                    <button class="downvote" onclick="vote(${feedback.id}, 'down')">Downvote</button>
                    <span>Votes: <span id="votes-${feedback.id}">${feedback.Votes}</span></span>
                </div>
            `;

            feedbackList.appendChild(feedbackCard);
        });
    }

    // Voting function (calls backend to register vote)
    async function vote(feedbackId, type) {
        try {
            const response = await fetch('http://localhost:3000/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ feedbackId, type })
            });
            const data = await response.json();
            console.log(data.message);

            // For now, simulate vote update in the UI (no DB updates in this example)
            const voteElement = document.getElementById(`votes-${feedbackId}`);
            const currentVotes = parseInt(voteElement.innerText);
            voteElement.innerText = currentVotes + (type === 'up' ? 1 : -1);
        } catch (error) {
            console.error('Error voting:', error);
        }
    }

    // Initial fetch of feedback when page loads
    fetchFeedback();
</script>
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize express app
const app = express();
const port = 3000;

// Enable CORS for frontend to access backend
app.use(cors());

// Middleware to parse JSON and url-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// The Google Sheets API requires OAuth2, so we need to authenticate
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

// Your Google Sheets ID (replace with your actual Sheet ID)
const SPREADSHEET_ID = '1PaeTKXwOnRtfIKou432nlxIUXiA-c2YANYtjMENi0pA';

// Authenticate and get the Google Sheets data
async function authenticateGoogle() {
    const credentials = JSON.parse(fs.readFileSync('credentials.json')); // Path to your credentials file

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have a stored token
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    // If no token, get a new one
    return getAccessToken(oAuth2Client);
}

// Get the access token for the first time authentication
function getAccessToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    reject('Error while trying to retrieve access token');
                } else {
                    oAuth2Client.setCredentials(token);
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    resolve(oAuth2Client);
                }
            });
        });
    });
}

// Fetch feedback from the Google Sheet
async function getFeedback() {
    const authClient = await authenticateGoogle();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A2:C', // Adjust the range depending on your sheet layout
    });

    // Format the response to a more user-friendly structure
    const feedbacks = res.data.values.map(row => ({
        title: row[0],
        description: row[1],
        votes: parseInt(row[2]) || 0, // Ensure the votes are parsed as integers
    }));

    return feedbacks;
}

// Define a route to get the feedback data
app.get('/api/feedback', async (req, res) => {
    try {
        const feedbacks = await getFeedback();
        res.json(feedbacks);
    } catch (error) {
        res.status(500).send('Error fetching feedback from Google Sheets');
    }
});

// Define the route to handle voting (Optional: store votes in a database)
app.post('/api/vote', (req, res) => {
    const { feedbackId, type } = req.body;
    
    // For simplicity, just send back a success message. 
    // You can store the vote count in a database here.
    res.json({
        message: `Vote registered for feedback ${feedbackId}: ${type}`,
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
