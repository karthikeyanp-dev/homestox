
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home } from '../types';
import { homeService } from '../services/homeService';

interface HomeState {
    homes: Home[];
    currentHome: Home | null;
    currentHomeId: string | null;
    homeAccessTimes: Record<string, number>;
    isLoading: boolean;
    refreshHomes: (userId: string) => Promise<void>;
    setCurrentHome: (home: Home) => void;
    getSortedHomes: () => Home[];
    createHome: (name: string, userId: string) => Promise<void>;
    updateHome: (homeId: string, name: string) => Promise<void>;
    deleteHome: (homeId: string) => Promise<void>;
}

export const useHomeStore = create<HomeState>()(
    persist(
        (set, get) => ({
            homes: [],
            currentHome: null,
            currentHomeId: null,
            homeAccessTimes: {},
            isLoading: false,
            refreshHomes: async (userId: string) => {
                set({ isLoading: true });
                try {
                    const homes = await homeService.getUserHomes(userId);
                    const { currentHomeId } = get();
                    
                    // Use persisted home if it exists in the list, otherwise fall back to first home
                    let currentHome: Home | null = null;
                    if (currentHomeId) {
                        currentHome = homes.find(h => h.id === currentHomeId) || null;
                    }
                    if (!currentHome && homes.length > 0) {
                        currentHome = homes[0];
                    }
                    
                    set({ 
                        homes, 
                        currentHome, 
                        currentHomeId: currentHome?.id || null,
                        isLoading: false 
                    });
                } catch (error) {
                    // Silently handle error - could integrate with error tracking service here
                    set({ isLoading: false });
                }
            },
            setCurrentHome: (home) => set({
                currentHome: home,
                currentHomeId: home.id,
                homeAccessTimes: { ...get().homeAccessTimes, [home.id]: Date.now() },
            }),
            getSortedHomes: () => {
                const { homes, homeAccessTimes } = get();
                return [...homes].sort(
                    (a, b) => (homeAccessTimes[b.id] ?? 0) - (homeAccessTimes[a.id] ?? 0)
                );
            },
            createHome: async (name: string, userId: string) => {
                set({ isLoading: true });
                try {
                    const newHome = await homeService.createHome(name, userId);
                    const homes = [...get().homes, newHome];
                    set({
                        homes,
                        currentHome: newHome,
                        currentHomeId: newHome.id,
                        homeAccessTimes: { ...get().homeAccessTimes, [newHome.id]: Date.now() },
                        isLoading: false
                    });
                } catch (error) {
                    // Silently handle error - could integrate with error tracking service here
                    set({ isLoading: false });
                    throw error;
                }
            },
            updateHome: async (homeId: string, name: string) => {
                const updated = await homeService.updateHome(homeId, name);
                const homes = get().homes.map(home => (home.id === homeId ? updated : home));
                const { currentHome } = get();
                set({
                    homes,
                    currentHome: currentHome?.id === homeId ? updated : currentHome,
                });
            },
            deleteHome: async (homeId: string) => {
                set({ isLoading: true });
                try {
                    await homeService.deleteHome(homeId);
                    const homes = get().homes.filter(home => home.id !== homeId);
                    // If the deleted home was the current home, set currentHome to null or first home
                    const { currentHome } = get();
                    let newCurrentHome = currentHome;
                    if (currentHome && currentHome.id === homeId) {
                        newCurrentHome = homes.length > 0 ? homes[0] : null;
                    }
                    // Drop the deleted home's persisted access timestamp
                    const { [homeId]: _removed, ...homeAccessTimes } = get().homeAccessTimes;
                    set({
                        homes,
                        currentHome: newCurrentHome,
                        currentHomeId: newCurrentHome?.id || null,
                        homeAccessTimes,
                        isLoading: false
                    });
                } catch (error) {
                    // Silently handle error - could integrate with error tracking service here
                    set({ isLoading: false });
                    throw error;
                }
            },
        }),
        {
            name: 'home-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                currentHomeId: state.currentHomeId,
                homeAccessTimes: state.homeAccessTimes,
            }),
        }
    )
);
