import { useContext } from "react";

import { UserContext } from "./UserContext";
import RegisterAndLogin from "./RegisterAndLogin";
import Chat from "./Chat";

const Routes = () => {
  const { username, id } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }
  console.log(username);
  return <RegisterAndLogin />;
};

export default Routes;
