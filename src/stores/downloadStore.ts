import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DownloadJob, AppSettings } from '../types';

interface DownloadStore {
  // Estado actual
  activeView: 'download' | 'history' | 'settings';
  jobs: DownloadJob[];
  history: DownloadJob[];
  settings: AppSettings;
  
  // Acciones para navegación
  setActiveView: (view: 'download' | 'history' | 'settings') => void;
  
  // Acciones para jobs
  addJob: (jobData: Omit<DownloadJob, 'id' | 'status' | 'progress' | 'createdAt'>) => void;
  updateJob: (id: string, updates: Partial<DownloadJob>) => void;
  removeJob: (id: string) => void;
  clearQueue: () => void;
  
  // Acciones para historial
  moveToHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // Acciones para configuraciones
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  defaultFolder: '',
  defaultQuality: 'best',
  defaultType: 'video-audio',
  theme: 'dark',
  maxConcurrent: 3,
  autoStart: true,
  notifications: true,
  keepHistory: true,
  // Nuevas opciones avanzadas con valores por defecto
  customArgs: '',
  outputTemplate: '%(title).200s.%(ext)s',
  embedSubs: false,
  writeAutoSub: false,
  preferredLanguage: 'en'
};

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      activeView: 'download',
      jobs: [],
      history: [],
      settings: defaultSettings,

      setActiveView: (view) => set({ activeView: view }),

      addJob: (jobData) => {
        const newJob: DownloadJob = {
          ...jobData,
          id: Math.random().toString(36).substr(2, 9),
          status: 'pending',
          progress: 0,
          createdAt: new Date()
        };
        
        set((state) => ({
          jobs: [...state.jobs, newJob]
        }));
      },

      updateJob: (id, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id ? { ...job, ...updates } : job
          )
        }));
      },

      removeJob: (id) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id)
        }));
      },

      clearQueue: () => {
        set({ jobs: [] });
      },

      moveToHistory: (id) => {
        const state = get();
        const job = state.jobs.find(j => j.id === id);
        
        if (job && state.settings.keepHistory) {
          set((state) => ({
            jobs: state.jobs.filter(j => j.id !== id),
            history: [job, ...state.history]
          }));
        } else {
          // Si no se guarda historial, solo remover
          set((state) => ({
            jobs: state.jobs.filter(j => j.id !== id)
          }));
        }
      },

      removeFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id)
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      }
    }),
    {
      name: 'youtube-downloader-store',
      partialize: (state) => ({
        history: state.history,
        settings: state.settings
      })
    }
  )
);