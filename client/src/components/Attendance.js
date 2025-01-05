import React, { useState, useEffect } from "react";
import { fetchSymbols, saveAttendance } from "../services/api";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Attendance() {
  const [symbols, setSymbols] = useState([]);
  const [formData, setFormData] = useState({}); 
  const operatorName = localStorage.getItem("operatorName") || "משתמש";

  useEffect(() => {
    async function loadSymbols() {
      try {
        const data = await fetchSymbols(operatorName);
        setSymbols(data.symbols || []);
      } catch (error) {
        console.error("שגיאה בשליפת סמלים:", error);
      }
    }
    loadSymbols();
  }, [operatorName]);

  
  const handleInputChange = (symbolId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [symbolId]: {
        ...prev[symbolId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filteredData = Object.entries(formData).filter(
      ([_, data]) => data.checked
    );

    try {
      const result = await saveAttendance(operatorName, filteredData);
      alert(result.message);
    } catch (error) {
      console.error("שגיאה בעת שמירת הנתונים:", error);
    }
  };
  

  const handleDownloadPDF = async () => {
    const filteredData = Object.entries(formData)
      .filter(([_, data]) => data.checked)
      .map(([symbolId, data]) => ({
        symbolId,
        name: symbols.find((symbol) => symbol[1] === symbolId)?.[2] || "", // הוספת שם מוסד
        day: data.day || "לא נבחר",
      }));
    const response = await fetch(`${API_URL}/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorName, data: filteredData }),
    });
  
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_report.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  
  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen py-10">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">דיווח חודשי</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 w-3/4"
      >
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-4 py-2">סמל מוסד</th>
              <th className="px-4 py-2">שם מוסד</th>
              <th className="px-4 py-2">הפעלה פעם בשבוע</th>
              <th className="px-4 py-2">יום בשבוע</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol, index) => (
              <tr key={index}>
                <td className="text-black">{symbol[1]}</td>
                <td>{symbol[2]}</td>
                <td>
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      handleInputChange(symbol[1], "checked", e.target.checked)
                    }
                  />
                </td>
                <td>
                  <select
                    onChange={(e) =>
                      handleInputChange(symbol[1], "day", e.target.value)
                    }
                  >
                    <option value="">בחר יום</option>
                    <option value="ראשון">ראשון</option>
                    <option value="שני">שני</option>
                    <option value="שלישי">שלישי</option>
                    <option value="רביעי">רביעי</option>
                    <option value="חמישי">חמישי</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="submit"
          className="mt-4 w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          שמור
        </button>
      </form>
      <button
        onClick={handleDownloadPDF}
        className="mt-4 w-3/4 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        הורד דוח נוכחות
      </button>
    </div>
  );
}