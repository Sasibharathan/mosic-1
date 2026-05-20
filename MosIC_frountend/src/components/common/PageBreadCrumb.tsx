import { Link } from "react-router";

type BreadcrumbItem = {
  label: string;
  href?: string;
  path?: string;
};

type PageBreadcrumbProps = {
  pageTitle?: string;
  items?: BreadcrumbItem[];
};

export default function PageBreadcrumb({ pageTitle, items }: PageBreadcrumbProps) {
  const crumbs: BreadcrumbItem[] = items ?? (pageTitle ? [{ label: pageTitle }] : []);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {pageTitle && (
          <h2 className="truncate text-xl font-semibold text-gray-800 dark:text-white/90">
            {pageTitle}
          </h2>
        )}
        <nav className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-gray-700 dark:hover:text-gray-300"
              >
                Dashboard
              </Link>
            </li>
            {crumbs.map((crumb, idx) => {
              const href = crumb.href ?? crumb.path;
              return (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400">/</span>
                  {href ? (
                    <Link
                      to={href}
                      className="truncate transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate text-gray-600 dark:text-gray-300">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
