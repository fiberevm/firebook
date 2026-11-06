import { Navigate, Route, Routes, useParams } from "react-router";
import { AppLayout } from "./components/AppLayout";
import ApiKeysPage from "./containers/ApiKeys";
import Docs from "./containers/Docs";
import Entries from "./containers/Entries";
import Home from "./containers/Home";
import Settings from "./containers/Settings";
import { useUser } from "./context/UserManager";

function Authenticated() {
  const { orgId } = useParams();
  const { user } = useUser();

  // unknown org (e.g. stale link or removed membership): go to the first org
  if (!user.organizations.some((o) => o.id === orgId)) {
    return <Navigate to={`/o/${user.organizations[0]!.id}`} replace />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="entries" element={<Entries />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="docs" element={<Docs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}

export default Authenticated;
