'use client';

import { useState } from 'react';
import { LayoutDashboard, FolderTree as FolderIcon, CalendarClock, DollarSign } from 'lucide-react';
import FolderTree from '@/components/FolderTree';

export default function ProjectManagement() {
  const [activeTab, setActiveTab] = useState('folders');

  const tabs = [
    { id: 'folders', name: 'Thư mục', icon: FolderIcon },
    { id: 'progress', name: 'Kế hoạch - Tiến độ', icon: CalendarClock },
    { id: 'payment', name: 'Thanh toán - Giải ngân', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý dự án Bồi thường</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tuyến đường sắt Bến Thành - Cần Giờ</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-[80vh]">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${
                  isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                  : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-100' : 'text-slate-400'} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'folders' && (
            <div className="h-full">
              <FolderTree />
            </div>
          )}
          
          {activeTab === 'progress' && (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/20 dark:border-gray-800 border-dashed">
              <div className="text-center text-slate-500">
                <CalendarClock size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Kế hoạch - Tiến độ</h3>
                <p className="text-sm">Module đang được phát triển...</p>
              </div>
            </div>
          )}
          
          {activeTab === 'payment' && (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-white/20 dark:border-gray-800 border-dashed">
              <div className="text-center text-slate-500">
                <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Thanh toán - Giải ngân</h3>
                <p className="text-sm">Module đang được phát triển...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
