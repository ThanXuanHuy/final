import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            favorites: [],
            login: (user, token) => set({ user, token, isAuthenticated: true }),
            updateUser: (updatedUser) => set((state) => ({ user: state.user ? { ...state.user, ...updatedUser } : updatedUser })),
            logout: () => set({ user: null, token: null, isAuthenticated: false, favorites: [] }),
            toggleFavorite: (id) => set((state) => ({
                favorites: state.favorites.includes(id)
                    ? state.favorites.filter((f) => f !== id)
                    : [...state.favorites, id]
            })),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ favorites: state.favorites, user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
