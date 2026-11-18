import Home from "./home";
import Landing from "./landing";
import { requestCompetition } from "@/request-competition";

export default async function Page() {
  const { host, competition } = await requestCompetition();
  if (competition === null) {
    return <Landing host={host} />;
  }
  return <Home competitionId={competition.id} />;
}
