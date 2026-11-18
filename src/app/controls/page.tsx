import Page from "./controls";
import Landing from "../landing";
import { requestCompetition } from "@/request-competition";

export default async function P() {
  const { host, competition } = await requestCompetition();
  if (competition === null) {
    return <Landing host={host} path="/controls" />;
  }
  return <Page competitionId={competition.id} />;
}
