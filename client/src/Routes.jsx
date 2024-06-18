import { useContext } from "react";

import { UserContext } from "./UserContext";
import RegisterAndLogin from "./RegisterAndLogin";

const Routes = () => {
  const { username, id } = useContext(UserContext);

  if (username) {
    return (
      <div>
        Logged In <h1>{username}</h1>
      </div>
    );
  }
  console.log(username);
  return <RegisterAndLogin />;
};

export default Routes;
