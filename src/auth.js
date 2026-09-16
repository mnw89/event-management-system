export const AUTH_STORAGE_KEY = "eventManagement_auth";

const DEMO_USER = {
  id: "user-001",
  username: "admin",
  password: "admin123",
  role: "admin"
};

export function getAuthState() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
    return auth?.isAuthenticated ? auth : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function login(username, password) {
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    return { ok: false, message: "Incorrect username or password." };
  }

  const auth = {
    isAuthenticated: true,
    userId: DEMO_USER.id,
    username: DEMO_USER.username,
    role: DEMO_USER.role
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  return { ok: true, auth };
}

export function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
