import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";

export default function ComingSoon() {
  const { page } = useParams();
  const title = page.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return (
    <AppLayout>
      <article className="card soon">
        <h1>{title}</h1>
        <p className="muted">This section is part of a later CreatorIQ module and is not built yet.</p>
        <Link to="/dashboard" className="btn-link">Back to dashboard</Link>
      </article>
    </AppLayout>
  );
}
