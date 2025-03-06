import { headers } from "next/headers";
import Home from "./home";
import { Provider as JotaiProvider } from "jotai";

export default async function Page() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  return (
    <JotaiProvider>
      <Home hostname={hostname} />
    </JotaiProvider>
  );
}
