import type { ApiCurrentUser } from "@accounting/shared";
import useSWR from "swr";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { getFetcher } from "./api/api";
import Authenticated from "./Authenticated";
import Loader from "./components/Loader";
import Login from "./containers/Login";
import NewOrgPage from "./containers/NewOrgPage";
import Register from "./containers/Register";
import SsoCallback from "./containers/SsoCallback";
import UserManager from "./context/UserManager";

const App = () => {
  const { data, error, isLoading } = useSWR<ApiCurrentUser>("/user", getFetcher, {
    shouldRetryOnError: false,
  });

  if (isLoading) {
    return <Loader />;
  }

  if (error || !data) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<Register />} />
          <Route path="/auth/callback" element={<SsoCallback />} />
          <Route path="/" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const firstOrg = data.organizations[0];

  return (
    <UserManager user={data}>
      <BrowserRouter>
        <Routes>
          <Route path="/new" element={<NewOrgPage />} />
          {firstOrg ? <Route path="/o/:orgId/*" element={<Authenticated />} /> : null}
          <Route path="*" element={<Navigate to={firstOrg ? `/o/${firstOrg.id}` : "/new"} replace />} />
        </Routes>
      </BrowserRouter>
    </UserManager>
  );
};

export default App;
