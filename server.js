const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();
const port = 3000;

// Enable CORS for frontend to access backend
app.use(cors());

// Middleware to parse JSON and url-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define a route to get the feedbacks
app.get('/api/feedback', (req, res) => {
    // Path to your Excel file
    const filePath = path.join(__dirname, 'feedback.xlsx');  // Update the path to your Excel file
    
    // Read the Excel file
    const workbook = xlsx.readFile(filePath);

    // Get the first sheet from the workbook (change if your data is in a different sheet)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Send the data as response
    res.json(data);
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
