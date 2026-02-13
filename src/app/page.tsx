import { headers } from "next/headers";
import Home from "./home";

export default async function Page() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  return <Home hostname={hostname} />;
}
