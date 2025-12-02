import LogRocket from "logrocket";
import env from "./env";
import { isLoggedInState, userState } from "../../../src/recoil/userAtoms";
import { useRecoilValue } from "recoil";

const useInitializeLogRocket = () => {
  const userInfo = useRecoilValue(userState);
  const isLoggedIn = useRecoilValue(isLoggedInState);
  const { username } = userInfo;
  if (!env.logRocketId || window.location.hostname === 'localhost') return;

  const isRecorded = isLoggedIn;
  const isProd = env.envName === "NA-PROD";

  if (isRecorded) {
    LogRocket.init(env.logRocketId, {
      dom: {
        inputSanitizer: isProd,
      },
      network: {
        requestSanitizer: (request) => {
          request.body = isProd ? null : request.body;
          return request;
        },
        responseSanitizer: (response) => {
          response.body = isProd ? null : response.body;
          return response;
        },
      },
    });
    LogRocket.identify(username, {
      userId: username
    });
  }
};

export default useInitializeLogRocket;
