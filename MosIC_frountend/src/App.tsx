/**
 * App.tsx — Router setup with JWT-protected routes
 *
 * FOLDER STRUCTURE
 * ─────────────────────────────────────────
 * src/
 *   utils/
 *     axiosInstance.ts          ← axios + JWT interceptor
 *   context/
 *     AuthContext.tsx            ← token + user state, login/logout/register
 *   routes/
 *     ProtectedRoute.tsx         ← redirects to /signin if no token
 *   components/
 *     auth/
 *       SignInForm.tsx            ← login form (gmail + password)
 *       SignUpForm.tsx            ← register form (requires JWT)
 *     common/  ...
 *     form/    ...
 *     ui/      ...
 *   pages/
 *     AuthPages/
 *       AuthPageLayout.tsx
 *       SignIn.tsx
 *       SignUp.tsx
 *     Dashboard/
 *       Home.tsx
 *     FileIndex/
 *       FileIndexPage.tsx
*      Sales/
 *      SalesDetails.tsx
 *     Purchase/
 *      PurchaseDetails.tsx
*      Stocks/
*       StocksDetails.tsx
*      Customer/
 *      CustomerDetails.tsx
*      Employee/
 *      EmployeePage.tsx
 *     UserProfiles.tsx
 *
 *
 *
 *
 *   App.tsx                      ← this file
 *   main.tsx
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import { AuthProvider }       from "./context/AuthContext";
import ProtectedRoute         from "./routes/ProtectedRoute";
import SignInForm             from "./components/auth/SignInForm";
import SignUpForm             from "./components/auth/SignUpForm";
import UserProfiles           from "./pages/UserProfiles";
import AppLayout              from "./layout/AppLayout";
import Home                   from "./pages/Dashboard/Home";
import FileIndexPage          from "./pages/FileIndex/FileIndexPage";
import FileActivityPage       from "./pages/FileIndex/FileActivityPage";
import SalesDetails           from "./pages/Sales/SalesDetails";
import PurchaseDetails        from "./pages/Purchase/PurchaseDetails";

import EmployeePage           from "./pages/Employee/EmpPage";
import EmpPayslipDetails      from "./pages/Employee/EmpPagePayslip";
import EmpPositionDetails     from "./pages/HR/EmpPositionPage";

import CustomerDetails from "./pages/Customer/CustomerDetails";
import PartyDetails from "./pages/Customer/PartyDetails";

import StockItemsListPage  from "./pages/Stocks/Stockitempage";      // the LIST page
import MaterialPass  from "./pages/MatPass/Matpasspage";      // the LIST page


export default function App() {
  return (
      <AuthProvider>
        <BrowserRouter>

        <Routes>
          {/* Public signin */}
          <Route path="/signin" element={<SignInForm />} />

          {/* Protected: all app routes (require valid JWT)*/}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Home />} />

              {/* Files */}
              <Route path="/file-index"                  element={<FileIndexPage />} />
              <Route path="/file-index/:fileId/activity" element={<FileActivityPage />} />
              <Route path="/files" element={<FileIndexPage />} />
              <Route path="/sales" element={<SalesDetails />} />
              <Route path="/purchase" element={<PurchaseDetails />} />

              <Route path="/hr" element={<EmpPositionDetails />} />

              <Route path="/employees" element={<EmployeePage />} />
              <Route path="/employees/:empId/payslips" element={<EmpPayslipDetails />} />

              <Route path="/customers" element={<CustomerDetails />} />
              <Route path="/customers/:customerId/parties" element={<PartyDetails />} />

              <Route path="/stocks/items"   element={<StockItemsListPage />} />
              <Route path="/matpass"   element={<MaterialPass />} />

              <Route path="/users" element={<UserProfiles />} />
              <Route path="/signup" element={<SignUpForm />} />
              <Route path="/profile" element={<UserProfiles />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>

  );
}
