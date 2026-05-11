"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Restaurant, UserRole } from "@/lib/types";

interface RestaurantStore {
  restaurant: Restaurant | null;
  restaurantId: string | null;
  userRole: UserRole | null;
  setRestaurant: (restaurant: Restaurant, role: UserRole) => void;
  clearRestaurant: () => void;
}

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set) => ({
      restaurant: null,
      restaurantId: null,
      userRole: null,
      setRestaurant: (restaurant, userRole) =>
        set({ restaurant, restaurantId: restaurant.id, userRole }),
      clearRestaurant: () =>
        set({ restaurant: null, restaurantId: null, userRole: null }),
    }),
    {
      name: "restoos-restaurant",
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        userRole: state.userRole,
      }),
    }
  )
);

export function useRestaurantId() {
  return useRestaurantStore((s) => s.restaurantId);
}

export function useUserRole() {
  return useRestaurantStore((s) => s.userRole);
}

export function canEdit(role: UserRole | null): boolean {
  return role === "owner" || role === "manager";
}

export function isOwner(role: UserRole | null): boolean {
  return role === "owner";
}
