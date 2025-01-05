const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT||5000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 
const ORIGIN_SHEET_NAME = process.env.ORIGIN_SHEET_NAME; 
const EDIT_SHEET_NAME = process.env.EDIT_SHEET_NAME;

app.use(bodyParser.json());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://my-app-client-liart.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// Google Sheets API Configuration
const auth = new google.auth.GoogleAuth({
  credentials: {
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


// Check if operator name exists
async function isOperatorNameExists(operatorName) {
  try {
    console.log(`Checking if operator exists: ${operatorName}`); // בדיקת הנתון שהתקבל
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ORIGIN_SHEET_NAME}!A:A`, // עמודת שמות המפעילים
    });

    console.log('Google Sheets API response:', response.data); // הדפסת התגובה מה-API

    const rows = response.data.values || [];
    return rows.flat().includes(operatorName.trim());
  } catch (error) {
    console.error('Error in isOperatorNameExists:', error); // הדפסת השגיאה לקונסולה
    throw error;
  }
}


// Login endpoint
app.post('/login', async (req, res) => {
  const { operatorName } = req.body;

  try {
    const exists = await isOperatorNameExists(operatorName);
    if (!exists) {
      return res.status(404).json({ message: 'שם המפעיל לא קיים במערכת' });
    }
    res.json({ message: 'הזדהות הצליחה!' });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ message: 'שגיאה בעת בדיקת שם המפעיל' });
  }
});

// Fetch symbols by operator name
app.get('/symbols', async (req, res) => {
  const { operatorName } = req.query;

  try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${ORIGIN_SHEET_NAME}!A:D`, // עמודות A עד D
      });

      const rows = response.data.values || [];
      const symbols = rows.filter(row => row[0]?.trim() === operatorName.trim());

      if (symbols.length === 0) {
          return res.status(404).json({ message: 'לא נמצאו סמלים עבור המפעיל' });
      }

      res.json({ symbols });
  } catch (error) {
      console.error('שגיאה בשליפת סמלים:', error);
      res.status(500).json({ message: 'שגיאה בשליפת סמלים' });
  }
});

// Save attendance data
app.post('/save', async (req, res) => {
  const { operatorName, data } = req.body;
  console.log('Data received:', data);

  try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${EDIT_SHEET_NAME}!A:Z`,
      });
      const rows = response.data.values || [];
      const dataRows = rows.slice(1);

      for (const [key, value] of data) { // שימי לב שפה מדובר במערך
        console.log('Processing key:', key, 'value:', value);
      
        const symbolId = key; // המפתח במערך שלך הוא ה-symbolId
        const { checked, day } = value;
      
        if (checked) {
          const matchingRow = dataRows.find(row => row[0] === symbolId);
          if (matchingRow) {
            const rowIndex = dataRows.indexOf(matchingRow) + 2;
            const weeksColumns = ['F', 'H', 'J', 'L', 'N'];
      
            for (const column of weeksColumns) {
              const cell = `${EDIT_SHEET_NAME}!${column}${rowIndex}`;
              await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: cell,
                valueInputOption: 'RAW',
                resource: {
                  values: [[operatorName]],
                },
              });
            }
          } else {
            console.log(`לא נמצאה שורה מתאימה לסמל ${symbolId}`);
          }
        }
      }
      
      

      res.json({ message: 'הנתונים נשמרו בהצלחה!' });
  } catch (error) {
      console.error('שגיאה בשמירת הנתונים:', error);
      res.status(500).json({ message: 'שגיאה בשמירת הנתונים' });
  }
});



const PDFDocument = require('pdfkit');
const path = require('path');


app.post('/generate-pdf', async (req, res) => {
  const { operatorName, data } = req.body; // קבלת המידע מהלקוח

  try {
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'אין נתונים ליצירת PDF' });
    }

    const doc = new PDFDocument({ lang: 'he', margin: 50 });
    const fontPath = path.join(__dirname, '../fonts/Alef-Regular.ttf');
    doc.font(fontPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.pdf');
    doc.pipe(res);

    function reverseTextForRTL(text) { return (" "+text+" ").split(' ').reverse().join(' '); }

    doc
      .fontSize(18)
      .text(reverseTextForRTL(`דוח נוכחות למפעיל: ${operatorName}`), {
        align: 'right',
      })
      .moveDown();

    const startY = 90; 
    const rowHeight = 20; 
    const columnWidths = { day: 65, name: 300, symbol: 55 }; 
    const startX = 500; 
      
    doc
      .fontSize(12)
      .text(" בשבוע יום ", startX, startY, { width: columnWidths.day, align: 'right' })
      .text(" מוסד שם ", startX - columnWidths.day - columnWidths.name, startY, { width: columnWidths.name, align: 'right' })
      .text(' מוסד סמל ', startX - columnWidths.day - columnWidths.name - columnWidths.symbol, startY, { width: columnWidths.symbol, align: 'right' });
    
    let y = startY + rowHeight;
    data.forEach((item) => {
    doc        
      .text(reverseTextForRTL(item.symbolId), startX - columnWidths.day - columnWidths.name - columnWidths.symbol, y, { width: columnWidths.symbol, align: 'right' })
      .text(reverseTextForRTL(item.name || 'לא נבחר'), startX - columnWidths.day - columnWidths.name, y, { width: columnWidths.name, align: 'right' })
      .text(reverseTextForRTL(item.day || 'לא נבחר'), startX, y, { width: columnWidths.day, align: 'right' });
      y += rowHeight;
    });
      
    doc.end();
    
  } catch (error) {
    console.error('שגיאה ביצירת PDF:', error);
    res.status(500).json({ message: 'שגיאה ביצירת PDF' });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the API server!');
});


// Start server
if (process.env.VERCEL_ENV) {
  module.exports = app; 
} else {
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}