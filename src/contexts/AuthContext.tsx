import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// User interface for type safety
interface User {
  id: string;
  email: string;
  name: string;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component that manages authentication state
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("finance_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Login function - validates credentials from localStorage
  const login = async (email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem("finance_users") || "[]");
    const foundUser = users.find(
      (u: any) => u.email === email && u.password === password
    );

    if (foundUser) {
      const userData = { id: foundUser.id, email: foundUser.email, name: foundUser.name };
      setUser(userData);
      localStorage.setItem("finance_user", JSON.stringify(userData));
      return true;
    }
    return false;
  };

  // Signup function - creates new user in localStorage
  const signup = async (
    email: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem("finance_users") || "[]");
    
    // Check if user already exists
    if (users.some((u: any) => u.email === email)) {
      return false;
    }

    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password,
      name,
    };

    users.push(newUser);
    localStorage.setItem("finance_users", JSON.stringify(users));

    // Auto-login after signup
    const userData = { id: newUser.id, email: newUser.email, name: newUser.name };
    setUser(userData);
    localStorage.setItem("finance_user", JSON.stringify(userData));
    return true;
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("finance_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
