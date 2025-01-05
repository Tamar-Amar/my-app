const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export async function login(operatorId) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ operatorId }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

export async function fetchSymbols(operatorId) {
  const response = await fetch(`${API_URL}/symbols?operatorId=${operatorId}`);
  return response.json();
}

export async function saveAttendance(operatorId, data) {
  const response = await fetch(`${API_URL}/save`, {
    method: "POST",
    body: JSON.stringify({ operatorId, data }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}
