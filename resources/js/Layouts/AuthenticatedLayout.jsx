// AuthenticatedLayout.jsx
import { useState, useEffect } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import NavLink from "@/Components/NavLink";
import { Link, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons
const SunIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707-.707zm-.707-10.607a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
        />
    </svg>
);

const MoonIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
);

const UserIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
        />
    </svg>
);

const MenuIcon = () => (
    <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
        />
    </svg>
);

const CloseIcon = () => (
    <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>
);

const ChevronDownIcon = ({ className = "w-5 h-5" }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
        />
    </svg>
);

// ADD THIS - PsychologyIcon component
const PsychologyIcon = () => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
    </svg>
);

// Profile Dropdown Component
const ProfileDropdown = ({ user, isEmployee, isAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest(".profile-dropdown")) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

    return (
        <div className="relative profile-dropdown">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 focus:outline-none"
            >
                {user?.photo ? (
                    <img
                        src={`/storage/${user.photo}`}
                        alt={user.name}
                        className="border-2 border-white/30 rounded-full w-10 h-10 object-cover"
                    />
                ) : (
                    <div className="flex justify-center items-center bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/30 rounded-full w-10 h-10 font-semibold text-white text-lg">
                        {userInitial}
                    </div>
                )}
                <div className="hidden lg:flex flex-col items-start">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                        {user?.name || "User"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {user?.role ? user.role.toUpperCase() : "USER"}
                    </span>
                </div>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="w-5 h-5 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </motion.svg>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="right-0 z-50 absolute bg-white/95 dark:bg-gray-800/95 shadow-xl backdrop-blur-md mt-3 py-2 border border-white/30 dark:border-gray-600/30 rounded-2xl w-56"
                    >
                        <div className="px-4 py-3 border-gray-100/50 dark:border-gray-700/50 border-b">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                                {user?.name}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                {user?.email || user?.nik}
                            </p>
                        </div>

                        {isEmployee ? (
                            // EMPLOYEE: Edit Profile link
                            <Link
                                href={route("employee.employees.edit", { employee: user.id })}
                                className="flex items-center hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 px-4 py-3 border-gray-100/50 dark:border-gray-700/50 border-b text-gray-700 dark:text-gray-200 text-sm transition-all duration-200"
                                onClick={() => setIsOpen(false)}
                            >
                                <UserIcon className="mr-3 w-4 h-4" />
                                Edit Profile
                            </Link>
                        ) : (
                            // ADMIN: No Edit Profile (since we removed profile.edit route)
                            null
                        )}

                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="flex items-center hover:bg-red-50/50 dark:hover:bg-red-900/20 px-4 py-3 w-full text-red-600 dark:text-red-400 text-sm text-left transition-all duration-200"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg
                                className="mr-3 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Log Out
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Theme Toggle Component
const ThemeToggle = ({ isDark, toggleDarkMode }) => (
    <motion.label
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        htmlFor="theme-toggle"
        className="flex items-center cursor-pointer"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
        <input
            type="checkbox"
            id="theme-toggle"
            className="sr-only"
            checked={isDark}
            onChange={toggleDarkMode}
        />
        <div className="relative">
            <div className="block bg-gray-300 dark:bg-gray-700 rounded-full w-14 h-7 transition-colors duration-300" />
            <motion.div
                animate={{ x: isDark ? 28 : 0 }}
                className="top-1 left-1 absolute flex justify-center items-center bg-white dark:bg-gray-300 shadow-lg rounded-full w-5 h-5 transition-all duration-300"
            >
                {isDark ? <MoonIcon /> : <SunIcon />}
            </motion.div>
        </div>
    </motion.label>
);

// Psikotes Dropdown Component (ONLY FOR ADMIN)
const PsikotesDropdown = ({ isAdmin, isOpen, setIsOpen }) => {
    const psikotesRoutes = [
        { href: route("kraepelin.index"), label: "Kraepelin Test", active: route().current("kraepelin.*") },
        // { href: route("wartegg.index"), label: "Wartegg Test", active: route().current("wartegg.*") },
        // { href: route("analogi.index"), label: "Analogi Test", active: route().current("analogi.*") },
        { href: route("ketelitian.index"), label: "Ketelitian Test", active: route().current("ketelitian.*") },
        { href: route("hitungan.index"), label: "Hitungan Test", active: route().current("hitungan.*") },
        { href: route("deret.index"), label: "Deret Test", active: route().current("deret.*") },
        // { href: route("spasial.index"), label: "Spasial Test", active: route().current("spasial.*") },
        // { href: route("numerik.index"), label: "Numerik Test", active: route().current("numerik.*") },
        // { href: route("disc.index"), label: "DISC Test", active: route().current("disc.*") },
        // { href: route("personality.index"), label: "Personality Test", active: route().current("personality.*") },
    ];

    const isAnyPsikotesActive = psikotesRoutes.some(route => route.active);

    if (!isAdmin) return null;

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full py-4 px-6 text-base font-medium rounded-2xl transition-all duration-300 ${
                    isAnyPsikotesActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50 shadow-md"
                        : "text-gray-700 dark:text-gray-200 hover:bg-indigo-50/60 dark:hover:bg-gray-700/60 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg"
                }`}
            >
                <div className="flex items-center">
                    <PsychologyIcon />
                    <span className="font-semibold">Psikotes</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="transition-transform duration-300"
                >
                    <ChevronDownIcon className="w-5 h-5" />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="mt-2 ml-6 overflow-hidden"
                    >
                        <div className="space-y-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 border border-gray-200/50 dark:border-gray-700/50 rounded-xl">
                            {psikotesRoutes.map((item, index) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <NavLink
                                        href={item.href}
                                        active={item.active}
                                        className="flex items-center hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 px-4 py-3 rounded-xl font-medium hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-all duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Navigation Items Configuration for ADMIN
const adminNavigationConfig = (user, psikotesOpen, setPsikotesOpen) => {
    return [
        {
            type: "link",
            href: route("dashboard"),
            label: "Admin Dashboard",
            active: route().current("dashboard"),
            show: true,
        },
        {
            type: "link",
            href: route("employee-attendance.index"),
            label: "Employee Attendance",
            active: route().current("employee-attendance.index"),
            show: true,
        },
        {
            type: "dropdown",
            component: (
                <PsikotesDropdown 
                    key="psikotes"
                    isAdmin={true} 
                    isOpen={psikotesOpen} 
                    setIsOpen={setPsikotesOpen} 
                />
            ),
            show: true,
        },
    ].filter((item) => item.show);
};

// Navigation Items Configuration for EMPLOYEE (KEEP ALL ORIGINAL MENUS)
const employeeNavigationConfig = (user, isForkliftOperator) => {
    const employeeNav = [
        {
            href: route("employee.dashboard"),
            label: "Employee Dashboard",
            active: route().current("employee.dashboard"),
            show: true,
        },
        {
            href: route("employee.permits.index"),
            label: "Leave Requests",
            active: route().current("employee.permits.index"),
            show: true,
        },
        {
            href: route("employee.bank-account-change.create"),
            label: 'Ganti Rekening',
            active: route().current('employee.bank-account-change.*'),
            show: true,
        },
        {
            href: route('employee.bank-account-change.history'),
            label: 'Riwayat Rekening',
            active: route().current('employee.bank-account-change.history'),
            show: true,
        },
        {
            href: route("employee.employees.edit", { employee: user?.id }),
            label: "Edit Profile",
            active: route().current("employee.employees.edit"),
            show: true,
        },
    ];

    // Add SIO Input only for forklift operators
    if (isForkliftOperator) {
        employeeNav.splice(2, 0, {
            href: route("employee.license"),
            label: "SIO Input",
            active: route().current("employee.license"),
            show: true,
        });
    }

    return employeeNav;
};

export default function AuthenticatedLayout({
    header,
    children,
    hideSidebar = false,
}) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [isDark, setIsDark] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [psikotesOpen, setPsikotesOpen] = useState(false);

    // User role checks
    const isAdmin = user?.role === "admin";
    const isEmployee = user?.nik && typeof user.nik === "string" && user.nik.trim() !== "";
    
    // Forklift operator check (for employees only)
    const forkliftOperatorNiks = [
        "10797", "10485", "10640", "11299", "10933", "11321", "10843", "10866", "11302", "10494",
        "10803", "11108", "10858", "10786", "11301", "10625", "10833", "10850", "10838", "10954",
        "10845", "10864", "10859", "10630", "10873", "10855", "10818", "10726", "10871", "11319",
        "10828", "10781", "10616", "10824", "10484", "11324", "10612", "10798", "10576", "10804", "10821",
    ];
    const isForkliftOperator = isEmployee && user?.nik && forkliftOperatorNiks.includes(user.nik);

    // Get navigation items based on user role
    const navItems = isAdmin 
        ? adminNavigationConfig(user, psikotesOpen, setPsikotesOpen)
        : employeeNavigationConfig(user, isForkliftOperator);

    // Theme management
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedTheme = localStorage.getItem("theme");
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            const shouldBeDark =
                storedTheme === "dark" || (!storedTheme && prefersDark);

            setIsDark(shouldBeDark);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const root = window.document.documentElement;
            if (isDark) {
                root.classList.add("dark");
                localStorage.setItem("theme", "dark");
            } else {
                root.classList.remove("dark");
                localStorage.setItem("theme", "light");
            }
        }
    }, [isDark]);

    const toggleDarkMode = () => setIsDark(!isDark);
    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

    const cardStyle =
        "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 dark:border-gray-600/30";

    const navItemStyle = (isActive) =>
        `flex items-center py-4 px-6 text-base font-medium rounded-2xl transition-all duration-300
        ${
            isActive
                ? "bg-gradient-to-r from-indigo-500/20 to-purple-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50 shadow-md"
                : "text-gray-700 dark:text-gray-200 hover:bg-indigo-50/60 dark:hover:bg-gray-700/60 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg hover:scale-105"
        }`;

    return (
        <div className="flex lg:flex-row flex-col bg-gradient-to-br from-blue-50 dark:from-gray-900 to-purple-50 dark:to-gray-800 min-h-screen font-sans antialiased transition-all duration-300">
            {/* Mobile & Tablet Header */}
            <header className="lg:hidden top-0 z-40 sticky flex justify-between items-center bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm p-4">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMobileMenu}
                    className="focus:outline-none text-gray-600 dark:text-gray-300"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </motion.button>

                <div className="flex items-center space-x-4">
                    <ThemeToggle
                        isDark={isDark}
                        toggleDarkMode={toggleDarkMode}
                    />
                </div>
            </header>

            {/* Sidebar - Always visible on lg+ screens, overlay on mobile and tablet */}
            {!hideSidebar && (
                <>
                    {/* Mobile & Tablet Overlay */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="lg:hidden z-30 fixed inset-0 bg-black/50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                        )}
                    </AnimatePresence>

                    {/* Sidebar Content */}
                    <motion.aside
                        initial={false}
                        animate={{
                            x: isMobileMenuOpen ? 0 : [-400, 0],
                        }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                        }}
                        className={`fixed lg:sticky lg:top-0 lg:self-start lg:h-screen top-0 inset-y-0 left-0 w-80 lg:w-96 ${cardStyle} flex flex-col pt-6 z-40 border-r border-white/30 dark:border-gray-600/30 overflow-y-auto ${
                            isMobileMenuOpen ? 'block' : 'hidden lg:flex'
                        }`}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 pb-6 border-gray-200/50 dark:border-gray-700/50 border-b">
                            <Link
                                href={isAdmin ? "/dashboard" : "/employee/dashboard"}
                                className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                            >
                                <ApplicationLogo className="fill-current w-auto h-10 text-indigo-600 dark:text-indigo-400 ease-in ease-out" />
                            </Link>
                            {/* Close button for mobile/tablet */}
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-400"
                                aria-label="Close menu"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-3 p-6">
                            {isAdmin ? (
                                // ADMIN NAVIGATION
                                navItems.map((item, index) => {
                                    if (item.type === "dropdown") {
                                        return (
                                            <motion.div key={`dropdown-${index}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                                {item.component}
                                            </motion.div>
                                        );
                                    }
                                    return (
                                        <motion.div key={item.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                            <NavLink
                                                href={item.href}
                                                active={item.active}
                                                className={navItemStyle(item.active)}
                                                onClick={() => {
                                                    setIsMobileMenuOpen(false);
                                                    setPsikotesOpen(false);
                                                }}
                                            >
                                                <span className="font-semibold">{item.label}</span>
                                            </NavLink>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                // EMPLOYEE NAVIGATION (original full menu)
                                navItems.map((item, index) => (
                                    <motion.div key={item.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                        <NavLink
                                            href={item.href}
                                            active={item.active}
                                            className={navItemStyle(item.active)}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <span className="font-semibold">{item.label}</span>
                                        </NavLink>
                                    </motion.div>
                                ))
                            )}
                        </nav>

                        {/* Mobile & Tablet Profile Section */}
                        <div className="lg:hidden space-y-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-6 border-gray-200/50 dark:border-gray-700/50 border-t">
                            <div className="flex items-center space-x-4">
                                {user?.photo ? (
                                    <img
                                        src={`/storage/${user.photo}`}
                                        alt={user.name}
                                        className="border-2 border-white/30 rounded-full w-12 h-12 object-cover"
                                    />
                                ) : (
                                    <div className="flex justify-center items-center bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/30 rounded-full w-12 h-12 font-semibold text-white text-lg">
                                        {userInitial}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-800 dark:text-gray-100 text-base truncate">
                                        {user?.name || "Loading..."}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 text-sm truncate">
                                        {user?.email || user?.nik || ""}
                                    </div>
                                </div>
                            </div>

                            <div className="gap-3 grid grid-cols-2">
                                {isEmployee && (
                                    <Link
                                        href={route("employee.employees.edit", { employee: user.id })}
                                        className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 py-3 rounded-xl font-medium text-indigo-600 dark:text-indigo-400 text-sm text-center transition-all duration-200"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Edit Profile
                                    </Link>
                                )}
                                <Link
                                    href={route("logout")}
                                    method="post"
                                    as="button"
                                    className="hover:bg-red-50/50 dark:hover:bg-red-900/20 py-3 rounded-xl font-medium text-red-600 dark:text-red-400 text-sm text-center transition-all duration-200"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Log Out
                                </Link>
                            </div>
                        </div>
                    </motion.aside>
                </>
            )}

            {/* Main Content */}
            <main
                className={`flex-1 transition-all duration-300 min-h-screen ${
                    hideSidebar ? "w-full" : ""
                }`}
            >
                {/* Desktop Header */}
                <header
                    className={`hidden lg:flex items-center justify-between p-8 ${cardStyle} shadow-xl transition-colors duration-300 mx-8 mt-8 sticky top-0 z-30`}
                >
                    <div className="flex items-center space-x-4">
                        {/* Burger button for tablet (md) screens */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleMobileMenu}
                            className="xl:hidden focus:outline-none text-gray-600 dark:text-gray-300"
                            aria-label="Toggle menu"
                        >
                            <MenuIcon />
                        </motion.button>
                        <div className="flex-1">
                            {header && (
                                <h1 className="font-bold text-gray-800 dark:text-gray-200 text-2xl transition-colors duration-200">
                                    {header}
                                </h1>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <ThemeToggle
                            isDark={isDark}
                            toggleDarkMode={toggleDarkMode}
                        />
                        <ProfileDropdown
                            user={user}
                            isEmployee={isEmployee}
                            isAdmin={isAdmin}
                        />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 transition-all duration-300">
                    {children}
                </div>
            </main>
        </div>
    );
}