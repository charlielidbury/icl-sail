import { headers } from "next/headers";
import Home from "./home";
import Landing from "./landing";
import { isLandingHost } from "@/landing-hosts";

export default async function Page() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  if (isLandingHost(hostname)) {
    return <Landing />;
  }
  return <Home hostname={hostname} />;
}
