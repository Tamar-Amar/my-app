import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";


 export default function Login() {
    const [operatorId, setOperatorId] = useState("");
    const navigate = useNavigate();
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      const result = await login(operatorId);
      if (result.message === "הזדהות הצליחה!") {
        localStorage.setItem("operatorId", operatorId);
        navigate("/attendance");
      } else {
        alert(result.message);
      }
    };
  
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
          <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">
            הזדהות מפעיל
          </h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="operatorId" className="block text-sm font-medium text-gray-700">
              שם מפעיל:
            </label>
            <input
              type="text"
              id="operatorId"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              required
              className="w-full mt-2 mb-4 p-2 border rounded-md"
            />
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              התחל
            </button>
          </form>
        </div>
      </div>
    );
  }
  