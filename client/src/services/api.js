const API_URL = "http://localhost:5000";

export async function login(operatorName) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ operatorName }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

export async function fetchSymbols(operatorName) {
  const response = await fetch(`${API_URL}/symbols?operatorName=${operatorName}`);
  return response.json();
}

export async function saveAttendance(operatorName, data) {
  const response = await fetch(`${API_URL}/save`, {
    method: "POST",
    body: JSON.stringify({ operatorName, data }),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}
