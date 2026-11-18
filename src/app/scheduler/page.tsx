import type { Metadata } from "next";
import Scheduler from "./scheduler";

export const metadata: Metadata = {
  title: "Schedule Generator",
  description: "Make a team racing round robin schedule for any number of teams and flights.",
};

export default function Page() {
  return <Scheduler />;
}
