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

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Google Sheets API Configuration
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json', 
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Check if operator name exists
async function isOperatorNameExists(operatorName) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ORIGIN_SHEET_NAME}!A:A`, // עמודת שמות המפעילים
    });

    const rows = response.data.values || [];
    return rows.flat().includes(operatorName.trim());
  } catch (error) {
    console.error('Error checking operator name:', error);
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

  try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${EDIT_SHEET_NAME}!A:Z`,
      });
      const rows = response.data.values || [];
      const dataRows = rows.slice(1);

      for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('weekly_') && value === 'on') {
              const symbolId = key.split('_')[1]; 
              const matchingRow = dataRows.find(row => row[0] === symbolId);
      
              if (matchingRow) {
                  const rowIndex = dataRows.indexOf(matchingRow) + 2; 
                  const weeksColumns = ['F', 'H', 'J', 'L', 'N']; 
      
                  for (const column of weeksColumns) {
                      const cell = `${EDIT_SHEET_NAME}!${column}${rowIndex}`;
                      try {
                          await sheets.spreadsheets.values.update({
                              spreadsheetId: SPREADSHEET_ID,
                              range: cell,
                              valueInputOption: 'RAW',
                              resource: {
                                  values: [[operatorName]],
                              },
                          });
                          console.log(`הנתונים עודכנו בהצלחה ב-${cell}`);
                      } catch (updateError) {
                          console.error(`שגיאה בעת עדכון ${cell}:`, updateError);
                      }
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
    const fontPath = path.join(__dirname, 'fonts', 'Alef-Regular.ttf');
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
