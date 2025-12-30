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
        className="h-4 w-4"
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
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
);

const UserIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
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
                        className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-white/30">
                        {userInitial}
                    </div>
                )}
                <div className="hidden lg:flex flex-col items-start">
                    <span className="text-gray-700 dark:text-gray-200 text-sm font-semibold">
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
                        className="absolute right-0 mt-3 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-xl py-2 z-50 border border-white/30 dark:border-gray-600/30"
                    >
                        <div className="px-4 py-3 border-b border-gray-100/50 dark:border-gray-700/50">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {user?.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user?.email || user?.nik}
                            </p>
                        </div>

                        <Link
                            href={
                                isEmployee
                                    ? route("employee.employees.edit", {
                                          employee: user.id,
                                      })
                                    : route("profile.edit")
                            }
                            className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 border-b border-gray-100/50 dark:border-gray-700/50"
                            onClick={() => setIsOpen(false)}
                        >
                            <UserIcon className="w-4 h-4 mr-3" />
                            Edit Profile
                        </Link>

                        {!isEmployee && isAdmin && (
                            <Link
                                href={route("cronjob-settings.index")}
                                className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 border-b border-gray-100/50 dark:border-gray-700/50"
                                onClick={() => setIsOpen(false)}
                            >
                                <svg
                                    className="w-4 h-4 mr-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                </svg>
                                Cronjob Settings
                            </Link>
                        )}

                        <Link
                            href={route("logout")}
                            method="post"
                            as="button"
                            className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-200"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg
                                className="w-4 h-4 mr-3"
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
            <div className="block bg-gray-300 dark:bg-gray-700 w-14 h-7 rounded-full transition-colors duration-300" />
            <motion.div
                animate={{ x: isDark ? 28 : 0 }}
                className="absolute left-1 top-1 bg-white dark:bg-gray-300 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg"
            >
                {isDark ? <MoonIcon /> : <SunIcon />}
            </motion.div>
        </div>
    </motion.label>
);

// Navigation Items Configuration
const navigationConfig = (
    user,
    isAdmin,
    hasUserLevelAccess,
    isEmployee,
    isForkliftOperator
) => {
    const baseNav = [
        {
            href: route("dashboard"),
            label: isAdmin
                ? "Admin Dashboard"
                : `${user?.role?.toUpperCase() || "User"} Dashboard`,
            active: route().current("dashboard"),
            show: isAdmin || hasUserLevelAccess,
        },
        {
            href: route("manpower-requests.index"),
            label: "Manpower Requests",
            active: route().current("manpower-requests.index"),
            show: isAdmin || hasUserLevelAccess,
        },
        {
            href: route("schedules.index"),
            label: "Schedules",
            active: route().current("schedules.index"),
            show: isAdmin || hasUserLevelAccess,
        },
        {
            href: route("employee-attendance.index"),
            label: "Employees",
            active: route().current("employee-attendance.index"),
            show: isAdmin || hasUserLevelAccess,
        },
        {
            href: route("equipments.index"),
            label: "Inventory",
            active: route().current("equipments.index"),
            show: isAdmin,
        },
        {
            href: route("employee-blind-test.index"),
            label: "Blind Tests",
            active: route().current("employee-blind-test.index"),
            show: isAdmin,
        },
        {
            href: route("shifts.index"),
            label: "Shifts",
            active: route().current("shifts.index"),
            show: isAdmin,
        },
        {
            href: route("sections.index"),
            label: "Sections",
            active: route().current("sections.index"),
            show: isAdmin,
        },
        {
            href: route("admin.permits.index"),
            label: "Admin Permits",
            active: route().current("admin.permits.index"),
            show: isAdmin,
        },
        {
            href: route("employee.bank-account-change.index"),
            label: "Bank Account Changes",
            active: route().current("employee.bank-account-change.index"),
            show: isAdmin,
        },
        {
            href: route("lunch-coupons.index"),
            label: "Lunch Coupons",
            active: route().current("lunch-coupons.index"),
            show: isAdmin,
        },
        {
            href: route("employee-picking-priorities.index"),
            label: "Emp priority Setup",
            active: route().current("employee-picking-priorities.index"),
            show: isAdmin,
        },
    ];

    const employeeNav = [
        {
            href: route("employee.dashboard"),
            label: "Employee Dashboard",
            active: route().current("employee.dashboard"),
            show: !isAdmin && !hasUserLevelAccess,
        },
        {
            href: route("employee.permits.index"),
            label: "Leave Requests",
            active: route().current("employee.permits.index"),
            show: !isAdmin && !hasUserLevelAccess,
        },
        {
            href: route("employee.license"),
            label: "SIO Input",
            active: route().current("employee.license"),
            show: !isAdmin && !hasUserLevelAccess && isForkliftOperator,
        },
        {
            href: route("employee.employees.edit", { employee: user?.id }),
            label: "Edit Profile",
            active: route().current("employee.employees.edit"),
            show: !isAdmin && !hasUserLevelAccess,
        },
         {
        href: route('employee.bank-account-change.create'),
        label: 'Ganti Rekening',
        active: route().current('employee.bank-account-change.*'),
        show: !isAdmin && !hasUserLevelAccess,
    },
    {
        href: route('employee.bank-account-change.history'),
        label: 'Riwayat Rekening',
        active: route().current('employee.bank-account-change.history'),
        show: !isAdmin && !hasUserLevelAccess,
    },
    ];

    return [...baseNav, ...employeeNav].filter((item) => item.show);
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

    // User role checks
    const isAdmin = user?.role === "admin";
    const isUser = user?.role === "user";
    const isLogistic = user?.role === "logistic";
    const isRmPm = user?.role === "rm/pm";
    const isFsb = user?.role === "fsb";
    const isEmployee =
        user?.nik && typeof user.nik === "string" && user.nik.trim() !== "";
    const hasUserLevelAccess = isUser || isLogistic || isRmPm || isFsb;

    // Forklift operator check
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
        user?.nik && forkliftOperatorNiks.includes(user.nik);

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

    const navItems = navigationConfig(
        user,
        isAdmin,
        hasUserLevelAccess,
        isEmployee,
        isForkliftOperator
    );
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
        <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 font-sans antialiased transition-all duration-300">
            {/* Mobile & Tablet Header */}
            <header className="lg:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center sticky top-0 z-40">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMobileMenu}
                    className="text-gray-600 dark:text-gray-300 focus:outline-none"
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
                                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
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
                        <div className="flex items-center justify-between px-6 pb-6 border-b border-gray-200/50 dark:border-gray-700/50">
                            <Link
                                href="/dashboard"
                                className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                            >
                                <ApplicationLogo className="h-10 w-auto fill-current text-indigo-600 dark:text-indigo-400 ease-in ease-out" />
                            </Link>
                            {/* Close button for mobile/tablet */}
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                                aria-label="Close menu"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-6 space-y-3">
                            {navItems.map((item, index) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <NavLink
                                        href={item.href}
                                        active={item.active}
                                        className={navItemStyle(item.active)}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <span className="text-xl mr-4">
                                            {item.icon}
                                        </span>
                                        <span className="font-semibold">
                                            {item.label}
                                        </span>
                                    </NavLink>
                                </motion.div>
                            ))}
                        </nav>

                        {/* Mobile & Tablet Profile Section */}
                        <div className="lg:hidden p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm space-y-4">
                            <div className="flex items-center space-x-4">
                                {user?.photo ? (
                                    <img
                                        src={`/storage/${user.photo}`}
                                        alt={user.name}
                                        className="h-12 w-12 rounded-full object-cover border-2 border-white/30"
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-white/30">
                                        {userInitial}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-800 dark:text-gray-100 text-base truncate">
                                        {user?.name || "Loading..."}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {user?.email || user?.nik || ""}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Link
                                    href={
                                        isEmployee
                                            ? route("employee.employees.edit", {
                                                  employee: user.id,
                                              })
                                            : route("profile.edit")
                                    }
                                    className="text-center py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all duration-200"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Edit Profile
                                </Link>

                                <Link
                                    href={route("logout")}
                                    method="post"
                                    as="button"
                                    className="text-center py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
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
                            className="xl:hidden text-gray-600 dark:text-gray-300 focus:outline-none"
                            aria-label="Toggle menu"
                        >
                            <MenuIcon />
                        </motion.button>
                        <div className="flex-1">
                            {header && (
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 transition-colors duration-200">
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