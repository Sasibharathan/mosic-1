import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CloseIcon, ListIcon } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import LogoutModal from "./LogoutModal";

export default function AppHeader() {
  const { isMobileOpen, toggleMobileSidebar, toggleSidebar } = useSidebar();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "U";

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    setIsDropdownOpen(false);
    logout();
    navigate("/signin", { replace: true });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownOpen(false);
    };
    if (isDropdownOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDropdownOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] lg:hidden"
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            title={isMobileOpen ? "Close menu" : "Open menu"}
          >
            {isMobileOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <ListIcon className="h-5 w-5" />
            )}
          </button>

          {/* Desktop sidebar collapse/expand */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] lg:inline-flex"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <ListIcon className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="relative hidden w-full max-w-md sm:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
                <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-brand-400"
            />
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <ThemeToggleButton />

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {/* Avatar circle */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                {initials}
              </span>
              {/* Username — hidden on very small screens */}
              {user?.username && (
                <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-200 sm:block">
                  {user.username}
                </span>
              )}
              {/* Chevron */}
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">

                {/* User info */}
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white">
                    {user?.username ?? "User"}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                    {user?.gmail ?? ""}
                  </p>
                </div>

                {/* Sign out */}
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 17L21 12M21 12L16 7M21 12H9M9 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H9" />
                    </svg>
                    Sign out
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </header>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}