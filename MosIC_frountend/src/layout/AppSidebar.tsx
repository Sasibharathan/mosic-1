import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  BoxIcon,
  ChatIcon,
  CheckLineIcon,
  DocsIcon,
  DollarLineIcon,
  GridIcon,
  GroupIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
  UserIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import LogoutModal from "./LogoutModal";

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
};

const mainItems: NavItem[] = [
  { name: "Dashboard",   path: "/",              icon: <GridIcon /> },
  { name: "File Index",  path: "/file-index",    icon: <TableIcon /> },
  { name: "Sales",       path: "/sales",         icon: <DollarLineIcon /> },
  { name: "Purchase",    path: "/purchase",      icon: <CheckLineIcon /> },
  { name: "Matpass",     path: "/matpass",       icon: <DocsIcon /> },
  { name: "Stock Items", path: "/stocks/items",  icon: <BoxIcon /> },
  { name: "HR",          path: "/hr",            icon: <UserIcon /> },
  { name: "Employee",    path: "/employees",     icon: <UserCircleIcon /> },
  { name: "Customer",    path: "/customers",     icon: <ChatIcon /> },
  { name: "Users",       path: "/Users",         icon: <GroupIcon /> },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const showLabels = isExpanded || isHovered || isMobileOpen;

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate("/signin", { replace: true });
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "U";

  // Use startsWith so /stocks/matpass stays highlighted when drilling into /stocks/matpass/5
  const isActive = (itemPath: string) => {
    if (itemPath === "/") return location.pathname === "/";
    return location.pathname.startsWith(itemPath);
  };

  const renderNavItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <li key={item.name}>
            <Link
              to={item.path}
              className={`menu-item group ${
                active ? "menu-item-active" : "menu-item-inactive"
              } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span
                className={`menu-item-icon-size ${
                  active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                }`}
              >
                {item.icon}
              </span>
              {showLabels && (
                <span className="menu-item-text">{item.name}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <aside
        className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100dvh-4rem)] lg:h-screen overflow-hidden transition-all duration-300 ease-in-out z-50 border-r border-gray-200
          ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div
          className={`py-8 flex ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          <Link to="/" className="flex items-center gap-3">
            {/*<span className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white shrink-0">
              M
            </span>*/}
            <img
                src="/favicon.png"
                alt="MosIC Solutions Logo"
                className="size-8 rounded-lg object-contain"
              />
            {showLabels && (
              <span className="text-base font-semibold text-gray-800 dark:text-white/90">
                MosIC_Solutions
              </span>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="mb-6">
              {showLabels && (
                <h2 className="mb-4 text-xs uppercase leading-[20px] text-gray-400">
                  Main
                </h2>
              )}
              {renderNavItems(mainItems)}
            </div>
          </nav>
        </div>

        {/* Account — pinned to the bottom */}
        <div className="pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-800 pt-4 shrink-0">
          {showLabels && (
            <h2 className="mb-3 text-xs uppercase leading-[20px] text-gray-400">
              Account
            </h2>
          )}

          {/* User info */}
          {user && (
            <div
              className={`flex items-center gap-3 mb-3 px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 ${
                !showLabels ? "lg:justify-center px-0 bg-transparent dark:bg-transparent" : ""
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                {initials}
              </span>
              {showLabels && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {user.username}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                    {user.gmail}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sign Out button */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className={`menu-item group w-full menu-item-inactive hover:!bg-red-50 dark:hover:!bg-red-500/10 hover:!text-red-500 dark:hover:!text-red-400
              ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            aria-label="Sign out"
          >
            <span className="menu-item-icon-size text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
              <PlugInIcon />
            </span>
            {showLabels && (
              <span className="menu-item-text group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
};

export default AppSidebar;