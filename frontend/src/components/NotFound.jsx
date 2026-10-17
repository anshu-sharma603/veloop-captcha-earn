import { Link } from 'react-router-dom';
import StatusScreen from '../components/StatusScreen.jsx';

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="Page not found"
      text="The page you are looking for does not exist or has moved."
      actions={(
        <>
          <Link className="st-btn pri" to="/captcha-earn">Go to CAPTCHA Earn</Link>
          <Link className="st-btn" to="/">Home</Link>
        </>
      )}
    />
  );
}