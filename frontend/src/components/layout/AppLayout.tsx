
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Network, Users, LogOut, Home, Calendar, MapPin } from 'lucide-react';

const AppLayout: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { label: 'Dashboard', path: '/', icon: Home },
        { label: 'Family Tree', path: '/tree', icon: Network },
        { label: 'People', path: '/people', icon: Users },
        { label: 'Events', path: '/events', icon: Calendar },
        { label: 'Places', path: '/places', icon: MapPin },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                        <Network className="w-8 h-8" />
                        GenGraph
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 md:hidden">
                    {/* Mobile Header stuff here eventually */}
                    <span className="font-bold text-gray-800">GenGraph</span>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
