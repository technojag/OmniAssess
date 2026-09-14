import { create } from "zustand";

type User = { id: string; email: string; name: string; role: string } | null;

type AuthState = {
  token: string | null;
  user: User;
  setAuth: (token: string, user: NonNullable<User>) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("oa_token"),
  user: localStorage.getItem("oa_user") ? JSON.parse(localStorage.getItem("oa_user")!) : null,
  setAuth: (token, user) => {
    localStorage.setItem("oa_token", token);
    localStorage.setItem("oa_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("oa_token");
    localStorage.removeItem("oa_user");
    set({ token: null, user: null });
  },
}));
