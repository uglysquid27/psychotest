// resources/js/Layouts/AuthenticatedLayout.jsx

import { useState, useEffect } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import NavLink from "@/Components/NavLink";
import { Link, usePage, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";

// SVG Icons (with proper definitions)
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

const SettingsIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

const ChevronDownIcon = ({ className = "w-5 h-5", style = {} }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
        />
    </svg>
);

// ICONS FOR MENUS
const PsychologyIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
    </svg>
);

const CalculatorIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
    </svg>
);

const DashboardIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
    </svg>
);

const AttendanceIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const QuestionIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

const NumberSeriesIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
    </svg>
);

const AssignmentIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
    </svg>
);

const TestManagementIcon = ({ style = {} }) => (
    <svg
        className="mr-3 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={style}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
    </svg>
);

// Theme definitions with CSS color values
const themes = {
    kraepelin: {
        name: "Kraepelin",
        colors: {
            primary: "#f59e0b", // amber-500
            secondary: "#ea580c", // orange-600
            light: "#fef3c7", // amber-100
            medium: "#fbbf24", // amber-400
            dark: "#d97706", // amber-600
            text: "#92400e", // amber-900
            textLight: "#b45309", // amber-700
            bgFrom: "#fffbeb", // amber-50
            bgVia: "#ffedd5", // orange-50
            bgTo: "#fef3c7", // yellow-50
            border: "#fde68a", // amber-200
            shadow: "rgba(245, 158, 11, 0.15)", // amber-500 with opacity
        },
    },
    ketelitian: {
        name: "Ketelitian",
        colors: {
            primary: "#3b82f6", // blue-500
            secondary: "#4f46e5", // indigo-600
            light: "#dbeafe", // blue-100
            medium: "#60a5fa", // blue-400
            dark: "#1d4ed8", // blue-700
            text: "#1e40af", // blue-900
            textLight: "#1d4ed8", // blue-700
            bgFrom: "#eff6ff", // blue-50
            bgVia: "#eef2ff", // indigo-50
            bgTo: "#e0e7ff", // purple-50
            border: "#bfdbfe", // blue-200
            shadow: "rgba(59, 130, 246, 0.15)", // blue-500 with opacity
        },
    },
    hitungan: {
        name: "Hitungan",
        colors: {
            primary: "#10b981", // emerald-500
            secondary: "#059669", // emerald-600
            light: "#d1fae5", // emerald-100
            medium: "#34d399", // emerald-400
            dark: "#059669", // emerald-600
            text: "#065f46", // emerald-900
            textLight: "#047857", // emerald-700
            bgFrom: "#ecfdf5", // emerald-50
            bgVia: "#d1fae5", // emerald-100
            bgTo: "#a7f3d0", // emerald-200
            border: "#a7f3d0", // emerald-200
            shadow: "rgba(16, 185, 129, 0.15)", // emerald-500 with opacity
        },
    },
    deret: {
        name: "Deret",
        colors: {
            primary: "#8b5cf6", // violet-500
            secondary: "#7c3aed", // violet-600
            light: "#ede9fe", // violet-100
            medium: "#a78bfa", // violet-400
            dark: "#7c3aed", // violet-600
            text: "#5b21b6", // violet-900
            textLight: "#6d28d9", // violet-700
            bgFrom: "#f5f3ff", // violet-50
            bgVia: "#ede9fe", // violet-100
            bgTo: "#ddd6fe", // violet-200
            border: "#ddd6fe", // violet-200
            shadow: "rgba(139, 92, 246, 0.15)", // violet-500 with opacity
        },
    },
    default: {
        name: "Default",
        colors: {
            primary: "#6366f1", // indigo-500
            secondary: "#8b5cf6", // purple-500
            light: "#e0e7ff", // indigo-100
            medium: "#818cf8", // indigo-400
            dark: "#4f46e5", // indigo-600
            text: "#3730a3", // indigo-900
            textLight: "#4338ca", // indigo-700
            bgFrom: "#f8fafc", // slate-50
            bgVia: "#f1f5f9", // gray-50
            bgTo: "#f4f4f5", // zinc-50
            border: "#e2e8f0", // slate-200
            shadow: "rgba(100, 116, 139, 0.15)", // slate-500 with opacity
        },
    },
};

// Helper function to detect current page theme
const detectTheme = (currentRoute) => {
    if (!currentRoute) return themes.default;
    
    const route = currentRoute.toLowerCase();
    
    // Check for specific test pages first
    if (route.includes('kraepelin')) {
        // Check if it's a settings page
        if (route.includes('settings')) {
            return themes.kraepelin; // Use Kraepelin theme for settings too
        }
        return themes.kraepelin;
    } else if (route.includes('ketelitian')) {
        return themes.ketelitian;
    } else if (route.includes('hitungan')) {
        return themes.hitungan;
    } else if (route.includes('deret')) {
        return themes.deret;
    } else if (route.includes('wartegg')) {
        return themes.default;
    } else if (route.includes('analogi')) {
        return themes.default;
    } else if (route.includes('spasial')) {
        return themes.default;
    } else if (route.includes('numerik')) {
        return themes.default;
    } else if (route.includes('disc')) {
        return themes.default;
    } else if (route.includes('personality')) {
        return themes.default;
    } else if (route.includes('test-assignments')) {
        return themes.default;
    }
    
    // Check for employee dashboard or pages
    if (route.includes('employee')) {
        return themes.default;
    }
    
    // Check for admin dashboard
    if (route.includes('dashboard')) {
        return themes.default;
    }
    
    return themes.default;
};

// Profile Dropdown Component with inline styles
const ProfileDropdown = ({ user, isEmployee, isAdmin, currentTheme }) => {
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
                        className="border-2 rounded-full w-10 h-10 object-cover shadow-lg"
                        style={{ borderColor: currentTheme.colors.border }}
                    />
                ) : (
                    <div
                        className="flex justify-center items-center border-2 rounded-full w-10 h-10 font-bold text-white text-lg shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                            borderColor: currentTheme.colors.border,
                        }}
                    >
                        {userInitial}
                    </div>
                )}
                <div className="hidden lg:flex flex-col items-start">
                    <span
                        className="font-bold text-sm"
                        style={{ color: currentTheme.colors.text }}
                    >
                        {user?.name || "User"}
                    </span>
                    <span
                        className="text-xs font-medium"
                        style={{ color: currentTheme.colors.textLight }}
                    >
                        {user?.role ? user.role.toUpperCase() : "USER"}
                    </span>
                </div>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="w-5 h-5"
                    style={{ color: currentTheme.colors.textLight }}
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
                        className="right-0 z-50 absolute shadow-xl backdrop-blur-md mt-3 py-2 border-2 rounded-2xl w-56"
                        style={{
                            background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                            borderColor: currentTheme.colors.border,
                        }}
                    >
                        <div
                            className="px-4 py-3 border-b"
                            style={{
                                borderColor: `${currentTheme.colors.border}80`,
                            }}
                        >
                            <p
                                className="font-bold text-sm truncate"
                                style={{ color: currentTheme.colors.text }}
                            >
                                {user?.name}
                            </p>
                            <p
                                className="text-xs truncate font-medium"
                                style={{ color: currentTheme.colors.textLight }}
                            >
                                {user?.email || user?.nik}
                            </p>
                        </div>

                        {isEmployee ? (
                            <Link
                                href={route("employee.employees.edit", {
                                    employee: user.id,
                                })}
                                className="flex items-center px-4 py-3 border-b text-sm transition-all duration-200"
                                style={{
                                    borderColor: `${currentTheme.colors.border}80`,
                                    color: currentTheme.colors.text,
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor = `${currentTheme.colors.light}80`)
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                }
                                onClick={() => setIsOpen(false)}
                            >
                                <UserIcon />
                                <span className="ml-3">Edit Profile</span>
                            </Link>
                        ) : null}

                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="flex items-center px-4 py-3 w-full text-sm text-left transition-all duration-200"
                            style={{ color: "#dc2626" }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "#fef2f280")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "transparent")
                            }
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
                className="top-1 left-1 absolute flex justify-center items-center bg-white shadow-lg rounded-full w-5 h-5 transition-all duration-300"
            >
                {isDark ? <MoonIcon /> : <SunIcon />}
            </motion.div>
        </div>
    </motion.label>
);

// Generic Admin Dropdown Component with inline styles
const AdminDropdown = ({
    icon: Icon,
    label,
    isOpen,
    setIsOpen,
    children,
    isActive,
    currentTheme,
}) => {
    const activeStyle = {
        background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
        borderColor: currentTheme.colors.medium,
        color: "white",
        boxShadow: `0 10px 15px -3px ${currentTheme.colors.shadow}`,
    };

    const inactiveStyle = {
        color: currentTheme.colors.text,
        borderColor: "transparent",
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-4 px-6 text-base font-bold rounded-2xl transition-all duration-300 border-2"
                style={isActive ? activeStyle : inactiveStyle}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${currentTheme.colors.light}, ${currentTheme.colors.bgVia})`;
                        e.currentTarget.style.color = currentTheme.colors.text;
                        e.currentTarget.style.borderColor =
                            currentTheme.colors.medium;
                        e.currentTarget.style.boxShadow = `0 10px 15px -3px ${currentTheme.colors.shadow}`;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = currentTheme.colors.text;
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.boxShadow = "none";
                    }
                }}
            >
                <div className="flex items-center">
                    <Icon
                        style={{
                            color: isActive
                                ? "white"
                                : currentTheme.colors.textLight,
                        }}
                    />
                    <span className="font-bold ml-3">{label}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="transition-transform duration-300"
                >
                    <ChevronDownIcon
                        className="w-5 h-5"
                        style={{
                            color: isActive
                                ? "white"
                                : currentTheme.colors.textLight,
                        }}
                    />
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
                        <div
                            className="space-y-1 backdrop-blur-sm p-2 border-2 rounded-xl shadow-inner"
                            style={{
                                background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                                borderColor: currentTheme.colors.border,
                            }}
                        >
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Generic Dropdown Component for Employees
const EmployeeDropdown = ({
    icon: Icon,
    label,
    isOpen,
    setIsOpen,
    children,
    isActive,
    currentTheme,
}) => {
    const activeStyle = {
        background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
        borderColor: currentTheme.colors.medium,
        color: "white",
        boxShadow: `0 10px 15px -3px ${currentTheme.colors.shadow}`,
    };

    const inactiveStyle = {
        color: currentTheme.colors.text,
        borderColor: "transparent",
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-4 px-6 text-base font-bold rounded-2xl transition-all duration-300 border-2"
                style={isActive ? activeStyle : inactiveStyle}
                onMouseEnter={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${currentTheme.colors.light}, ${currentTheme.colors.bgVia})`;
                        e.currentTarget.style.color = currentTheme.colors.text;
                        e.currentTarget.style.borderColor =
                            currentTheme.colors.medium;
                        e.currentTarget.style.boxShadow = `0 10px 15px -3px ${currentTheme.colors.shadow}`;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = currentTheme.colors.text;
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.boxShadow = "none";
                    }
                }}
            >
                <div className="flex items-center">
                    <Icon
                        style={{
                            color: isActive
                                ? "white"
                                : currentTheme.colors.textLight,
                        }}
                    />
                    <span className="font-bold ml-3">{label}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="transition-transform duration-300"
                >
                    <ChevronDownIcon
                        className="w-5 h-5"
                        style={{
                            color: isActive
                                ? "white"
                                : currentTheme.colors.textLight,
                        }}
                    />
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
                        <div
                            className="space-y-1 backdrop-blur-sm p-2 border-2 rounded-xl shadow-inner"
                            style={{
                                background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                                borderColor: currentTheme.colors.border,
                            }}
                        >
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Navigation Items Configuration for ADMIN
const adminNavigationConfig = (
    user,
    openStates,
    setOpenState,
    currentTheme,
) => {
    const createDropdown = (IconComponent, label, key, routes) => (
        <AdminDropdown
            key={key}
            icon={IconComponent}
            label={label}
            isOpen={openStates[key]}
            setIsOpen={(value) => setOpenState(key, value)}
            isActive={routes.some((route) => route.active)}
            currentTheme={currentTheme}
        >
            {routes.map((item, index) => (
                <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <NavLink
                        href={item.href}
                        active={item.active}
                        className="flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                        style={{ color: currentTheme.colors.text }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = `${currentTheme.colors.light}80`)
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                                "transparent")
                        }
                        onClick={() => setOpenState(key, false)}
                    >
                        <span className="font-bold">{item.label}</span>
                    </NavLink>
                </motion.div>
            ))}
        </AdminDropdown>
    );

    return [
        {
            type: "dropdown",
            component: createDropdown(DashboardIcon, "Dashboard", "dashboard", [
                {
                    href: route("dashboard"),
                    label: "Admin Dashboard",
                    active: route().current("dashboard"),
                },
            ]),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(
                AttendanceIcon,
                "Attendance",
                "attendance",
                [
                    {
                        href: route("employee-attendance.index"),
                        label: "Employee Attendance",
                        active: route().current("employee-attendance.index"),
                    },
                ],
            ),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(
                TestManagementIcon,
                "Test Management",
                "testManagement",
                [
                    {
                        href: route("admin.test-assignments.index"),
                        label: "Test Assignments",
                        active: route().current("admin.test-assignments.*"),
                    },
                    {
                        href: route("admin.test-assignments.create"),
                        label: "Assign New Test",
                        active: route().current(
                            "admin.test-assignments.create",
                        ),
                    },
                ],
            ),
            show: true,
        },
        // ADD NEW KRAEPELIN SETTINGS DROPDOWN HERE
        {
            type: "dropdown",
            component: createDropdown(
                SettingsIcon,
                "Test Settings",
                "testSettings",
                [
                    {
                        href: route("admin.kraepelin.settings.index"),
                        label: "Kraepelin Settings",
                        active: route().current("admin.kraepelin.settings.*"),
                    },
                ],
            ),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(PsychologyIcon, "Psikotes", "psikotes", [
                {
                    href: route("kraepelin.index"),
                    label: "Kraepelin Test",
                    active: route().current("kraepelin.*"),
                },
                {
                    href: route("ketelitian.index"),
                    label: "Ketelitian Test",
                    active: route().current("ketelitian.index"),
                },
                {
                    href: route("hitungan.test"),
                    label: "Hitungan Test",
                    active: route().current("hitungan.test"),
                },
                {
                    href: route("deret.index"),
                    label: "Deret Test",
                    active: route().current("deret.*"),
                },
                {
                    href: route("wartegg.index"),
                    label: "Wartegg Test",
                    active: route().current("wartegg.*"),
                },
                {
                    href: route("analogi.index"),
                    label: "Analogi Test",
                    active: route().current("analogi.*"),
                },
                {
                    href: route("spasial.index"),
                    label: "Spasial Test",
                    active: route().current("spasial.*"),
                },
                {
                    href: route("numerik.index"),
                    label: "Numerik Test",
                    active: route().current("numerik.*"),
                },
                {
                    href: route("disc.index"),
                    label: "DISC Test",
                    active: route().current("disc.*"),
                },
                {
                    href: route("personality.index"),
                    label: "Personality Test",
                    active: route().current("personality.*"),
                },
            ]),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(
                QuestionIcon,
                "Kelola Soal Ketelitian",
                "ketelitianQuestions",
                [
                    {
                        href: route("admin.ketelitian.questions.index"),
                        label: "Kelola Soal Ketelitian",
                        active: route().current(
                            "admin.ketelitian.questions.index",
                        ),
                    },
                    {
                        href: route("admin.ketelitian.questions.create"),
                        label: "Tambah Soal",
                        active: route().current(
                            "admin.ketelitian.questions.create",
                        ),
                    },
                ],
            ),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(
                CalculatorIcon,
                "Kelola Soal Hitungan",
                "hitunganQuestions",
                [
                    {
                        href: route("admin.hitungan.questions.index"),
                        label: "Kelola Soal Hitungan",
                        active: route().current(
                            "admin.hitungan.questions.index",
                        ),
                    },
                    {
                        href: route("admin.hitungan.questions.create"),
                        label: "Tambah Soal",
                        active: route().current(
                            "admin.hitungan.questions.create",
                        ),
                    },
                ],
            ),
            show: true,
        },
        {
            type: "dropdown",
            component: createDropdown(
                NumberSeriesIcon,
                "Kelola Soal Deret",
                "deretQuestions",
                [
                    {
                        href: route("admin.deret.questions.index"),
                        label: "Kelola Soal Deret",
                        active: route().current("admin.deret.questions.index"),
                    },
                    {
                        href: route("admin.deret.questions.create"),
                        label: "Tambah Soal",
                        active: route().current("admin.deret.questions.create"),
                    },
                ],
            ),
            show: true,
        },
    ].filter((item) => item.show);
};

// Navigation Items Configuration for EMPLOYEE
const employeeNavigationConfig = (
    user,
    isForkliftOperator,
    openStates,
    setOpenState,
    currentTheme,
) => {
    const employeeNavItems = [
        {
            type: "link",
            href: route("employee.dashboard"),
            label: "Employee Dashboard",
            active: route().current("employee.dashboard"),
            show: true,
        },
        {
            type: "link",
            href: route("employee.test-assignments.my"),
            label: "My Test Assignments",
            active: route().current("employee.test-assignments.*"),
            show: true,
        },
        {
            type: "link",
            href: route("employee.permits.index"),
            label: "Leave Requests",
            active: route().current("employee.permits.index"),
            show: true,
        },
        {
            type: "link",
            href: route("employee.bank-account-change.create"),
            label: "Ganti Rekening",
            active: route().current("employee.bank-account-change.*"),
            show: true,
        },
        {
            type: "link",
            href: route("employee.bank-account-change.history"),
            label: "Riwayat Rekening",
            active: route().current("employee.bank-account-change.history"),
            show: true,
        },
        {
            type: "link",
            href: route("employee.employees.edit", { employee: user?.id }),
            label: "Edit Profile",
            active: route().current("employee.employees.edit"),
            show: true,
        },
    ];

    // Add SIO Input for forklift operators
    if (isForkliftOperator) {
        employeeNavItems.splice(2, 0, {
            type: "link",
            href: route("employee.license"),
            label: "SIO Input",
            active: route().current("employee.license"),
            show: true,
        });
    }

    return employeeNavItems;
};

export default function AuthenticatedLayout({
    header,
    children,
    hideSidebar = false,
}) {
    const { auth, url } = usePage().props;
    const user = auth?.user;
    const [isDark, setIsDark] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Detect current theme based on URL - NOW WORKS FOR ALL PAGES
    const currentTheme = detectTheme(url);

    // Manage all dropdown states
    const [dropdownStates, setDropdownStates] = useState({
        dashboard: false,
        attendance: false,
        testManagement: false,
        psikotes: false,
        ketelitianQuestions: false,
        hitunganQuestions: false,
        deretQuestions: false,
    });

    // Function to set a specific dropdown state
    const setDropdownState = (key, value) => {
        if (value === true) {
            const newState = {};
            Object.keys(dropdownStates).forEach((k) => {
                newState[k] = k === key;
            });
            setDropdownStates(newState);
        } else {
            setDropdownStates((prev) => ({
                ...prev,
                [key]: value,
            }));
        }
    };

    // Close all dropdowns when mobile menu closes
    useEffect(() => {
        if (!isMobileMenuOpen) {
            setDropdownStates({
                dashboard: false,
                attendance: false,
                testManagement: false,
                psikotes: false,
                testSettings: false, // Add this
                ketelitianQuestions: false,
                hitunganQuestions: false,
                deretQuestions: false,
            });
        }
    }, [isMobileMenuOpen]);

    // User role checks
    const isAdmin = user?.role === "admin";
    const isEmployee =
        user?.nik && typeof user.nik === "string" && user.nik.trim() !== "";

    // Forklift operator check (for employees only)
    const forkliftOperatorNiks = [
        "10797",
        "10485",
        "10640",
        "11299",
        "10933",
        "11321",
        "10843",
        "10866",
        "11302",
        "10494",
        "10803",
        "11108",
        "10858",
        "10786",
        "11301",
        "10625",
        "10833",
        "10850",
        "10838",
        "10954",
        "10845",
        "10864",
        "10859",
        "10630",
        "10873",
        "10855",
        "10818",
        "10726",
        "10871",
        "11319",
        "10828",
        "10781",
        "10616",
        "10824",
        "10484",
        "11324",
        "10612",
        "10798",
        "10576",
        "10804",
        "10821",
    ];
    const isForkliftOperator =
        isEmployee && user?.nik && forkliftOperatorNiks.includes(user.nik);

    // Get navigation items based on user role
    const navItems = isAdmin
        ? adminNavigationConfig(
              user,
              dropdownStates,
              setDropdownState,
              currentTheme,
          )
        : employeeNavigationConfig(
              user,
              isForkliftOperator,
              dropdownStates,
              setDropdownState,
              currentTheme,
          );

    // Theme management
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedTheme = localStorage.getItem("theme");
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
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

    return (
        <div
            className="flex lg:flex-row flex-col min-h-screen font-sans antialiased transition-all duration-300"
            style={{
                background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia}, ${currentTheme.colors.bgTo})`,
            }}
        >
            {/* Mobile & Tablet Header */}
            <header
                className="lg:hidden top-0 z-40 sticky flex justify-between items-center shadow-lg backdrop-blur-sm p-4"
                style={{
                    background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary}, ${currentTheme.colors.primary})`,
                }}
            >
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMobileMenu}
                    className="focus:outline-none text-white"
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
                        className={`fixed lg:sticky lg:top-0 lg:self-start lg:h-screen top-0 inset-y-0 left-0 w-80 lg:w-96 backdrop-blur-md rounded-2xl shadow-lg border-2 flex flex-col pt-6 z-40 border-r-2 overflow-y-auto ${
                            isMobileMenuOpen ? "block" : "hidden lg:flex"
                        }`}
                        style={{
                            background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                            borderColor: currentTheme.colors.border,
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex justify-between items-center px-6 pb-6 border-b-2"
                            style={{
                                borderColor: `${currentTheme.colors.border}80`,
                            }}
                        >
                            <Link
                                href={
                                    isAdmin
                                        ? "/dashboard"
                                        : "/employee/dashboard"
                                }
                                className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                            >
                                <ApplicationLogo
                                    className="fill-current w-auto h-10 ease-in ease-out"
                                    style={{
                                        color: currentTheme.colors.primary,
                                    }}
                                />
                                <div>
                                    <h1
                                        className="font-bold text-lg"
                                        style={{
                                            color: currentTheme.colors.text,
                                        }}
                                    >
                                        {isAdmin
                                            ? "Admin Dashboard"
                                            : "Employee Portal"}
                                    </h1>
                                    <p
                                        className="text-xs font-medium"
                                        style={{
                                            color: currentTheme.colors
                                                .textLight,
                                        }}
                                    >
                                        {isAdmin
                                            ? "Management System"
                                            : "Psikotes Platform"}
                                    </p>
                                </div>
                            </Link>
                            {/* Close button for mobile/tablet */}
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="lg:hidden p-2"
                                style={{ color: currentTheme.colors.textLight }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.color =
                                        currentTheme.colors.text)
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.color =
                                        currentTheme.colors.textLight)
                                }
                                aria-label="Close menu"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-3 p-6">
                            {navItems.map((item, index) => {
                                if (item.type === "dropdown") {
                                    return (
                                        <motion.div
                                            key={`dropdown-${index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            {item.component}
                                        </motion.div>
                                    );
                                }
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <NavLink
                                            href={item.href}
                                            active={item.active}
                                            className="flex items-center py-4 px-6 text-base font-bold rounded-2xl transition-all duration-300 border-2"
                                            style={{
                                                color: item.active
                                                    ? "white"
                                                    : currentTheme.colors.text,
                                                background: item.active
                                                    ? `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`
                                                    : "transparent",
                                                borderColor: item.active
                                                    ? currentTheme.colors.medium
                                                    : "transparent",
                                                boxShadow: item.active
                                                    ? `0 10px 15px -3px ${currentTheme.colors.shadow}`
                                                    : "none",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!item.active) {
                                                    e.currentTarget.style.background = `linear-gradient(135deg, ${currentTheme.colors.light}, ${currentTheme.colors.bgVia})`;
                                                    e.currentTarget.style.color =
                                                        currentTheme.colors.text;
                                                    e.currentTarget.style.borderColor =
                                                        currentTheme.colors.medium;
                                                    e.currentTarget.style.boxShadow = `0 10px 15px -3px ${currentTheme.colors.shadow}`;
                                                    e.currentTarget.style.transform =
                                                        "scale(1.05)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!item.active) {
                                                    e.currentTarget.style.background =
                                                        "transparent";
                                                    e.currentTarget.style.color =
                                                        currentTheme.colors.text;
                                                    e.currentTarget.style.borderColor =
                                                        "transparent";
                                                    e.currentTarget.style.boxShadow =
                                                        "none";
                                                    e.currentTarget.style.transform =
                                                        "scale(1)";
                                                }
                                            }}
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                setDropdownStates({
                                                    dashboard: false,
                                                    attendance: false,
                                                    testManagement: false,
                                                    psikotes: false,
                                                    testSettings: false, // Add this
                                                    ketelitianQuestions: false,
                                                    hitunganQuestions: false,
                                                    deretQuestions: false,
                                                });
                                            }}
                                        >
                                            <span className="font-bold">
                                                {item.label}
                                            </span>
                                        </NavLink>
                                    </motion.div>
                                );
                            })}
                        </nav>

                        {/* Mobile & Tablet Profile Section */}
                        <div
                            className="lg:hidden space-y-4 backdrop-blur-sm p-6 border-t-2"
                            style={{
                                background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                                borderColor: `${currentTheme.colors.border}80`,
                            }}
                        >
                            <div className="flex items-center space-x-4">
                                {user?.photo ? (
                                    <img
                                        src={`/storage/${user.photo}`}
                                        alt={user.name}
                                        className="border-2 rounded-full w-12 h-12 object-cover shadow-lg"
                                        style={{
                                            borderColor:
                                                currentTheme.colors.border,
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="flex justify-center items-center border-2 rounded-full w-12 h-12 font-bold text-white text-lg shadow-lg"
                                        style={{
                                            background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})`,
                                            borderColor:
                                                currentTheme.colors.border,
                                        }}
                                    >
                                        {userInitial}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="font-bold text-base truncate"
                                        style={{
                                            color: currentTheme.colors.text,
                                        }}
                                    >
                                        {user?.name || "Loading..."}
                                    </div>
                                    <div
                                        className="text-sm truncate font-medium"
                                        style={{
                                            color: currentTheme.colors
                                                .textLight,
                                        }}
                                    >
                                        {user?.email || user?.nik || ""}
                                    </div>
                                </div>
                            </div>

                            <div className="gap-3 grid grid-cols-2">
                                {isEmployee && (
                                    <Link
                                        href={route("employee.employees.edit", {
                                            employee: user.id,
                                        })}
                                        className="py-3 rounded-xl font-bold text-sm text-center transition-all duration-200 border-2"
                                        style={{
                                            color: currentTheme.colors.text,
                                            borderColor:
                                                currentTheme.colors.border,
                                            background: "transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = `linear-gradient(135deg, ${currentTheme.colors.light}, ${currentTheme.colors.bgVia})`;
                                            e.currentTarget.style.borderColor =
                                                currentTheme.colors.medium;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                                "transparent";
                                            e.currentTarget.style.borderColor =
                                                currentTheme.colors.border;
                                        }}
                                        onClick={() =>
                                            setIsMobileMenuOpen(false)
                                        }
                                    >
                                        Edit Profile
                                    </Link>
                                )}
                                <Link
                                    href={route("logout")}
                                    method="post"
                                    as="button"
                                    className="py-3 rounded-xl font-bold text-sm text-center transition-all duration-200 border-2"
                                    style={{
                                        color: "#dc2626",
                                        borderColor: "#fecaca",
                                        background: "transparent",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                            "#fef2f280";
                                        e.currentTarget.style.borderColor =
                                            "#fca5a5";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                            "transparent";
                                        e.currentTarget.style.borderColor =
                                            "#fecaca";
                                    }}
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
                    className={`hidden lg:flex items-center justify-between p-8 backdrop-blur-md rounded-2xl shadow-xl border-2 transition-colors duration-300 mx-8 mt-8 sticky top-0 z-30`}
                    style={{
                        background: `linear-gradient(135deg, ${currentTheme.colors.bgFrom}, ${currentTheme.colors.bgVia})`,
                        borderColor: currentTheme.colors.border,
                    }}
                >
                    <div className="flex items-center space-x-4">
                        {/* Burger button for tablet (md) screens */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={toggleMobileMenu}
                            className="xl:hidden focus:outline-none"
                            style={{ color: currentTheme.colors.textLight }}
                            aria-label="Toggle menu"
                        >
                            <MenuIcon />
                        </motion.button>
                        <div className="flex-1">
                            {header && (
                                <h1
                                    className="font-bold text-2xl transition-colors duration-200"
                                    style={{ color: currentTheme.colors.text }}
                                >
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
                            currentTheme={currentTheme}
                        />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-6 lg:p-8 transition-all duration-300">
                    {children}
                </div>
            </main>
        </div>
    );
}
