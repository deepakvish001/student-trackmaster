
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to dashboard by default
  return <Navigate to="/dashboard" replace />;
};

export default Index;
