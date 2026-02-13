import { headers } from "next/headers";
import Page from "./controls";

export default async function P() {
  const hostname = (await headers()).get("host")?.split(":")[0];
  return <Page hostname={hostname} />;
}
