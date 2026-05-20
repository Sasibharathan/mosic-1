// ── Add these two routes in your router config ───────────────────────────────
//
// Place both at the same level (siblings, NOT nested) so both pages render
// inside your normal AppLayout (with sidebar + header).

//import FileIndexPage    from "./pages/FileIndex/FileIndexPage";
//import FileActivityPage from "./pages/FileIndex/FileActivityPage";

// React Router v6 — JSX style
//<Route path="/file-index"                   element={<FileIndexPage />} />
//<Route path="/file-index/:fileId/activity"  element={<FileActivityPage />} />

// React Router v6 — object style (createBrowserRouter)
//{
 // path: "/file-index",
  //element: <FileIndexPage />,
//},
//{
//  path: "/file-index/:fileId/activity",
// element: <FileActivityPage />,
//},

// ── File layout inside /pages/FileIndex/ ─────────────────────────────────────
//
//  FileIndexPage.tsx     ← Page 1 (this file)
//  FileActivityPage.tsx  ← Page 2 (this file)
//  fileIndex.shared.ts   ← All shared types + helpers + URL constants
//
// ── How navigation works ─────────────────────────────────────────────────────
//
//  Clicking a row in FileIndexPage calls:
//    navigate(`/file-index/${row.id}/activity`, { state: { file: row } })
//
//  FileActivityPage reads:
//    const { fileId } = useParams();            // e.g. "42"
//    const file = useLocation().state?.file;    // FileIndexRow (no extra API call)
//
//  If a user opens /file-index/42/activity directly (no state),
//  FileActivityPage auto-fetches GET /api/files/42 as a fallback.
//
//  Back button calls navigate("/file-index") — browser history works normally.