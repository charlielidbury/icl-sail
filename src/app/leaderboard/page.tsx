import Page from "./leaderboard";
import Landing from "../landing";
import { requestCompetition } from "@/request-competition";

export default async function P() {
  const { host, competition } = await requestCompetition();
  if (competition === null) {
    return <Landing host={host} path="/leaderboard" />;
  }
  return <Page competitionId={competition.id} />;
}
