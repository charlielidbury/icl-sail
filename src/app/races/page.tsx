import { headers } from "next/headers";
import Page from "./races";

export default async function P() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  return <Page hostname={hostname} />;
}
