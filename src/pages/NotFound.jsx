import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <div className="card empty-state">
        <h1>Nothing here</h1>
        <p>That event doesn't exist, or the link is incomplete.</p>
        <Link className="btn btn-primary" to="/">
          Create an event
        </Link>
      </div>
    </div>
  );
}
