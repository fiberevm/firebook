import { useEffect, useState } from "react";
import { Link } from "react-router";
import { storeToken } from "../api/auth";
import { AuthShell } from "../components/AuthShell";
import Loader from "../components/Loader";
import { focusRing } from "../components/ui/primitives";

/** Landing page after single sign-on: the API puts the session token in the URL fragment. */
function SsoCallback() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    // drop the token from the address bar and history before anything else
    window.history.replaceState(null, "", "/");
    if (!token) {
      setFailed(true);
      return;
    }
    // App re-renders signed in once the user loads
    void storeToken(token);
  }, []);

  if (!failed) return <Loader />;
  return (
    <AuthShell title="Sign-in link is incomplete" description="The single sign-on response did not include a session.">
      <Link to="/" className={`rounded text-[13px] font-medium text-[#1968ad] hover:underline ${focusRing}`}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export default SsoCallback;
