import { useState, useEffect } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import NavLink from '@/Components/NavLink';
import { Link, usePage } from '@inertiajs/react';

// SVGs for Sun and Moon icons
const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707-.707zm-.707-10.607a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
);

export default function AuthenticatedLayout({ header, children, hideSidebar = false }) {
    const { auth } = usePage().props;
    const user = auth && auth.user ? auth.user : null;
    const [isDark, setIsDark] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Effect to initialize theme
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
                setIsDark(true);
            } else {
                setIsDark(false);
            }
        }
    }, []);

    // Effect to apply dark mode class
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = window.document.documentElement;
            if (isDark) {
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                root.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        }
    }, [isDark]);

    const toggleDarkMode = () => {
        setIsDark(!isDark);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const isAdmin = user && user.role === 'admin';
    const isUser = user && user.role === 'user';
    const isEmployee = user && typeof user.nik === 'string' && user.nik.trim() !== '';

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 font-sans antialiased transition-all duration-300">
            {/* Mobile Header */}
            <header className="md:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center sticky top-0 z-40 transition-colors duration-300">
                <button
                    onClick={toggleMobileMenu}
                    className="text-gray-600 dark:text-gray-300 focus:outline-none transition-transform hover:scale-110"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <label htmlFor="theme-toggle-checkbox-mobile" className="flex items-center cursor-pointer transition-transform hover:scale-110" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                    <div className="relative">
                        <input
                            type="checkbox"
                            id="theme-toggle-checkbox-mobile"
                            className="sr-only"
                            checked={isDark}
                            onChange={toggleDarkMode}
                        />
                        <div className="block bg-gray-300 dark:bg-gray-700 w-12 h-7 rounded-full transition-colors duration-300 ease-in-out"></div>
                        <div className={`dot absolute left-1 top-1 bg-white dark:bg-gray-300 w-5 h-5 rounded-full transition-all duration-300 ease-in-out transform ${isDark ? 'translate-x-full' : ''} flex items-center justify-center shadow-md`}>
                            {isDark ? <MoonIcon /> : <SunIcon />}
                        </div>
                    </div>
                </label>
            </header>

            {/* Sidebar */}
            {!hideSidebar && (
                <aside className={`fixed md:sticky top-0 inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg flex flex-col shadow-2xl pt-4 md:pt-8 z-40 transition-transform duration-300 ease-in-out h-screen border-r border-gray-200 dark:border-gray-700 rounded-r-3xl`}>
                    {/* Close button for mobile */}
                    <div className="md:hidden flex justify-end p-4">
                        <button
                            onClick={toggleMobileMenu}
                            className="text-gray-600 dark:text-gray-300 focus:outline-none transition-transform hover:scale-110"
                            aria-label="Close menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex h-16 md:h-20 items-center justify-center px-4 transition-opacity duration-200">
                        <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                            <ApplicationLogo className="h-8 md:h-10 w-auto fill-current text-indigo-600 dark:text-indigo-400" />
                        </Link>
                    </div>

                    {/* Main Navigation */}
                    <nav className="flex flex-col flex-grow p-3 space-y-2 overflow-y-auto custom-scrollbar">
                        {/* Admin/User Links - Shown at the top */}
                        {(isAdmin || isUser) && (
                            <>
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                    className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('dashboard')
                                            ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <span className="block">{isAdmin ? 'Admin Dashboard' : 'User Dashboard'}</span>
                                </NavLink>

                                {(isAdmin || isUser) && (
                                    <>
                                        <NavLink
                                            href={route('manpower-requests.index')}
                                            active={route().current('manpower-requests.index')}
                                            className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('manpower-requests.index')
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="block">Manpower Requests</span>
                                        </NavLink>
                                        <NavLink
                                            href={route('schedules.index')}
                                            active={route().current('schedules.index')}
                                            className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('schedules.index')
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="block">Schedules</span>
                                        </NavLink>
                                        <NavLink
                                            href={route('employee-attendance.index')}
                                            active={route().current('employee-attendance.index')}
                                            className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee-attendance.index')
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="block">Employees</span>
                                        </NavLink>
                                        <NavLink
                                            href={route('employee-blind-test.index')}
                                            active={route().current('employee-blind-test.index')}
                                            className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee-blind-test.index')
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="block">Blind Tests</span>
                                        </NavLink>
                                        {isAdmin && (
                                            <>
                                                <NavLink
                                                    href={route('shifts.index')}
                                                    active={route().current('shifts.index')}
                                                    className="block py-3 md:py-4 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 ease-in-out text-center md:text-left"
                                                    activeClassName="bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold"

                                                >
                                                    <span className="block">Shifts</span>
                                                </NavLink>
                                                <NavLink
                                                    href={route('admin.permits.index')}
                                                    active={route().current('admin.permits.index')}
                                                    className="block py-3 md:py-4 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 ease-in-out text-center md:text-left"
                                                    activeClassName="bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold"

                                                >
                                                    <span className="block">Admin Permits</span>
                                                </NavLink>
                                            </>
                                        )}
                                        <NavLink
                                            href={route('lunch-coupons.index')}
                                            active={route().current('lunch-coupons.index')}
                                            className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('lunch-coupons.index')
                                                    ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <span className="block">Lunch Coupons</span>
                                        </NavLink>
                                    </>
                                )}
                            </>
                        )}

                        {/* Employee Links - Shown at the bottom */}
                        {!isAdmin && !isUser && (
                            <>
                                <NavLink
                                    href={route('employee.dashboard')}
                                    active={route().current('employee.dashboard')}
                                    className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee.dashboard')
                                            ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <span className="block">Employee Dashboard</span>
                                </NavLink>

                                <NavLink
                                    href={route('employee.permits.index')}
                                    active={route().current('employee.permits.index')}
                                    className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee-permits.index')
                                            ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <span className="block">Leave Requests</span>
                                </NavLink>
                                <NavLink
                                    href={route('employee.license')}
                                    active={route().current('employee.license')}
                                    className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee.license')
                                            ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <span className="block">SIO Input</span>
                                </NavLink>
                                <NavLink
                                    href={route('employee.employees.edit', { employee: auth.user.id })}
                                    active={route().current('employee.employees.edit')}
                                    className={`block py-3 md:py-4 px-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-center md:text-left
        hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400
        ${route().current('employee.employees.edit')
                                            ? 'bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <span className="block">Edit Profile</span>
                                </NavLink>
                            </>
                        )}

                        <div className="flex-grow"></div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="w-full text-left py-4 md:py-6 px-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-red-100/50 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 ease-in-out"
                        >
                            Log Out
                        </Link>
                    </nav>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex flex-col space-y-3 transition-colors duration-200 rounded-br-3xl">
                        <div className="font-semibold text-gray-800 dark:text-gray-100">{user ? user.name : 'Memuat...'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user ? (user.email || user.nik) : ''}</div>
                    </div>
                </aside>
            )}
            {/* Overlay for mobile menu */}

            {!hideSidebar && isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ease-in-out opacity-100"
                    onClick={toggleMobileMenu}
                ></div>
            )}

            <div className="flex-1 flex flex-col">
                {header && (
                    <header className="hidden md:block bg-transparent px-4 sm:px-6 lg:px-8 pt-4 sticky top-0 z-50">
                        <div className="p-4 shadow-xl rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-between items-center transition-colors duration-200 border border-white/50 dark:border-gray-700/50">
                            <div className="flex-grow text-gray-800 dark:text-gray-200">
                                {header}
                            </div>

                            <label htmlFor="theme-toggle-checkbox-desktop" className="flex items-center cursor-pointer ml-4 transition-transform hover:scale-110" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        id="theme-toggle-checkbox-desktop"
                                        className="sr-only"
                                        checked={isDark}
                                        onChange={toggleDarkMode}
                                    />
                                    <div className="block bg-gray-300 dark:bg-gray-700 w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors duration-300 ease-in-out"></div>
                                    <div className={`dot absolute left-1 top-1 bg-white dark:bg-gray-300 w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-300 ease-in-out transform ${isDark ? 'translate-x-full sm:translate-x-6' : ''} flex items-center justify-center shadow-md`}>
                                        {isDark ? <MoonIcon /> : <SunIcon />}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </header>
                )}
                <main className="">
                    {children}
                </main>
            </div>
        </div>
    );
}