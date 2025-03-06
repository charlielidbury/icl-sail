import { headers } from "next/headers";
import Page from "./leaderboard";
import { Provider as JotaiProvider } from "jotai";

export default async function P() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  return (
    <JotaiProvider>
      <Page hostname={hostname} />
    </JotaiProvider>
  );
}
