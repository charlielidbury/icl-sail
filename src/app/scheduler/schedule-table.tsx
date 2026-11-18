// A generated schedule as a table laid out like the site's printed schedules:
// two columns per flight under its name, each half's header coloured like its
// sails, and every race a grey band on its own flight's columns.
import type { Schedule } from "@/scheduler/types";
import type { Colour } from "./lib";
import styles from "./scheduler.module.css";

export type BoatLabel = { name: string; colour: Colour };

export function ScheduleTable({
  schedule,
  teamNames,
  boats,
}: {
  schedule: Schedule;
  teamNames: string[];
  /** Two per flight, in flight order. */
  boats: BoatLabel[];
}) {
  const flights = Array.from({ length: schedule.nFlights }, (_, f) => f);
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th rowSpan={2} className={styles.raceHeader}>
            Race
          </th>
          {flights.map((f) => (
            <th key={f} colSpan={2} className={`${styles.flightHeader} ${styles.flightStart}`}>
              Flight {f + 1}
            </th>
          ))}
        </tr>
        <tr>
          {boats.map((b, i) => (
            <th
              key={i}
              className={`${styles.halfHeader} ${i % 2 === 0 ? styles.flightStart : ""}`}
              style={{ background: b.colour.fill, color: b.colour.text }}
            >
              {b.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {schedule.races.map(([a, b], k) => {
          const flight = k % schedule.nFlights;
          // A rule above each race where the flights come round again.
          return (
            <tr key={k} className={flight === 0 ? styles.cycleStart : undefined}>
              <td className={styles.raceNumber}>{k + 1}</td>
              {flights.flatMap((f) => {
                const here = f === flight;
                const team = here ? styles.team : "";
                return [
                  <td key={`${f}a`} className={`${styles.flightStart} ${team}`}>
                    {here ? teamNames[a] : null}
                  </td>,
                  <td key={`${f}b`} className={`${styles.secondHalf} ${team}`}>
                    {here ? teamNames[b] : null}
                  </td>,
                ];
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
