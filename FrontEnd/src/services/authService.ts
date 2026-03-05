import apiClient from "./apiClient";

export const authService = {
    login: async (email: string, pass: string) => {
        try {
            const { data } = await apiClient.post("/auth/login", {
                identifier: email, // supports both username and email
                password: pass,
            });

            if (typeof window !== "undefined" && data.access_token) {
                localStorage.setItem("token", data.access_token);
                // Keep user profile so useAuth can restore it
                localStorage.setItem("ai_bharat_user", JSON.stringify({
                    name: data.username ?? email,
                    email: data.email ?? email,
                    user_id: data.user_id,
                    rank: data.rank ?? "Novice",
                }));
            }
            return data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 422) throw new Error("Invalid credentials format");
            if (status === 401) throw new Error("Email or password is incorrect");
            if (!error.response) throw new Error("Cannot connect to server");
            throw new Error(error.response?.data?.detail || "Failed to login");
        }
    },

    signup: async (name: string, email: string, pass: string) => {
        try {
            const { data } = await apiClient.post("/auth/signup", {
                username: name,
                email,
                password: pass,
            });

            if (typeof window !== "undefined" && data.access_token) {
                localStorage.setItem("token", data.access_token);
                localStorage.setItem("ai_bharat_user", JSON.stringify({
                    name: data.username ?? name,
                    email: data.email ?? email,
                    user_id: data.user_id,
                    rank: data.rank ?? "Novice",
                }));
            }
            return data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 409) throw new Error("An account with this email already exists.");
            if (status === 422) throw new Error("Invalid request. Please check your input.");
            if (!error.response) throw new Error("Cannot connect to server");
            throw new Error(error.response?.data?.detail || "Registration failed");
        }
    },

    logout: async () => {
        try {
            // Notify server (best-effort — auth header still attached by interceptor)
            await apiClient.post("/auth/logout");
        } catch {
            // Ignore — local cleanup is what matters
        }
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("ai_bharat_user");
        }
        return true;
    },

    getToken: () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("token");
    },

    isAuthenticated: () => {
        if (typeof window === "undefined") return false;
        return !!localStorage.getItem("token");
    },
};
