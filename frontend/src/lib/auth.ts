type AuthData = {
  user: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    department: {
      _id: string;
      name: string;
    };
    designation: string;
    isActive: boolean;
  };
  token: string;
};

// getAuthData retrieves and parses the auth data from localStorage
export const getAuthData = (): AuthData | null => {
  if (typeof window === "undefined") return null;
  const authDataString = localStorage.getItem("authData");
  const parsed = authDataString ? JSON.parse(authDataString) : null;
  return parsed;
};

export const getToken = (): string | null => {
  const authData = getAuthData();
  const token = authData?.token || null;
  return token;
};

export const getUser = () => {
  const authData = getAuthData();
  return authData?.user || null;
};

export const getUserId = (): string | null => {
  const user = getUser();
  return user?.id || null;
};

export const getUserRole = (): string | null => {
  const user = getUser();
  return user?.role || null;
};

export const getUserDesignation = (): string | null => {
  const user = getUser();
  return user?.designation || null;
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const setAuthCookies = (token: string, role: string, designation: string): void => {
  if (typeof window === "undefined") return;
  let maxAge = 60 * 60 * 24; // 24h default
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number") {
      maxAge = Math.max(0, Math.floor(payload.exp - Date.now() / 1000));
    }
  } catch { /* non-JWT token, use default */ }

  const opts = `path=/; max-age=${maxAge}; SameSite=Strict`;
  document.cookie = `authToken=${token}; ${opts}`;
  document.cookie = `userRole=${role}; ${opts}`;
  document.cookie = `userDesignation=${encodeURIComponent(designation)}; ${opts}`;
};

export const clearAuthCookies = (): void => {
  if (typeof window === "undefined") return;
  const expire = "path=/; max-age=0; SameSite=Strict";
  document.cookie = `authToken=; ${expire}`;
  document.cookie = `userRole=; ${expire}`;
  document.cookie = `userDesignation=; ${expire}`;
};
