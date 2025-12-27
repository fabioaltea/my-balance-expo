import { Redirect } from "expo-router";
import { JSX } from "react/jsx-dev-runtime";

const Index:React.FC = () => {
  return <Redirect href="/dashboard/home" />;
}

export default Index;