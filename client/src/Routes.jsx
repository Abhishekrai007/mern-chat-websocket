import { useContext } from "react";
import Register from "./Register";
import { UserContext } from "./UserContext";

const Routes = () => {
  const { username, id } = useContext(UserContext);

  if (username) {
    return "Logeed In";
  }
  console.log(username);
  return <Register />;
};

export default Routes;
