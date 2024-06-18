import axios from "axios";
import { UserContext, UserContextProvider } from "./UserContext";
import { useContext } from "react";
import Routes from "./Routes";
function App() {
  axios.defaults.baseURL = "http://localhost:3000";
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}

export default App;
