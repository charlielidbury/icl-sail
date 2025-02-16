import pyperclip
import itertools
import random
from typing import Dict, Iterator, List, Optional, Set, Tuple


# 20 teams
TEAMS = [f"team{i}" for i in range(1, 22)]

# TEAMS = list("ABCD")

# 4 flights
FLIGHTS = [(f"left{i}", f"right{i}") for i in range(1, 5)]

# number of flights
F = len(FLIGHTS)

COLUMN_WIDTH = 40


# team1, flight1, team2, flight2, race#
class Race:
    def __init__(self, team1: str, team2: str, race_num: int):
        self.team1 = team1
        self.team2 = team2
        self.race_num = race_num

    def __str__(self):
        indent = " " * COLUMN_WIDTH * ((self.race_num - 1) % len(FLIGHTS))
        flight1, flight2 = FLIGHTS[(self.race_num - 1) % len(FLIGHTS)]
        return f"{indent}{self.race_num}: {self.team1} vs {self.team2}"


# 15-18 teams. 2-3 flights.


def random_set_choice(choices: Set[str]) -> str:
    if len(choices) == 0:
        raise ValueError("No choices left")

    choices = list(choices)
    choices.sort()  # sort is required to make the choice deterministic
    return random.choice(choices)


# Picks two teams to race against each other, and removes those pairings from the pairings dict
def pick_two(
    races: List[Race],
    pairings: Dict[str, Set[str]],
    cant_race: Set[str],
    fuel: int,
) -> Tuple[Optional[str], Optional[str]]:
    if fuel == 0:
        return None, None

    # pick a team1
    if len(races) >= F and not (
        len(races) >= F + F and races[-F - F].team1 == races[-F].team1
    ):
        # the team which is already in this flight has only raced once
        team1 = races[-F].team1
        print("A", team1)
    else:
        # can't reuse encumbent team, so pick a random team
        team1 = random_set_choice(
            {k for k, v in pairings.items() if len(v) > 0}.difference(cant_race)
        )
        print("B", team1)
    # pick a team2
    if (
        len(races) >= F  # there is a team in this flight already
        and not (
            len(races) >= F + F and races[-F - F].team2 == races[-F].team2
        )  # the team in the flight isn't on their second race
        and races[-F].team2
        in pairings[team1]  # the team in the flight is yet to go against team1
    ):
        # the team which is already in this flight has only raced once
        team2 = races[-F].team2
    else:
        # can't reuse encumbent team, so pick a random team
        candidates = set(pairings[team1]).difference(cant_race)
        if len(candidates) == 0:
            # no teams left to race against, try again but avoid team1
            return pick_two(races, pairings, cant_race.union({team1}), F, fuel - 1)
        team2 = random_set_choice(candidates)

    # remove this race from the pairings
    pairings[team1].remove(team2)
    pairings[team2].remove(team1)

    return team1, team2


def races_left(pairings: Dict[str, Set[str]]) -> int:
    return sum(len(v) for v in pairings.values())


# adds all the pairings in {pairings} to {races} if possible,
# otherwise returns false (aka not possible to start from this set of races)
# if returns false, leaves input unchanged
def extend(
    races: List[Race],
    pairings: Dict[str, Set[str]],
    last_race: Dict[str, int],
    fuel: List[int],
) -> bool:
    if fuel[0] <= 0:
        return False
    fuel[0] -= 1

    if races_left(pairings) == 0:
        # print(" " * len(races), len(races), "round complete")
        return True
    # print(" " * len(races), len(races))

    # teams that are already in the water can't race in this race
    cant_race = {race.team1 for race in races[-F:]}.union(
        {race.team2 for race in races[-F:]}
    )

    # any team which has races yet to race can be a candidate
    team1_candidates = {k for k, v in pairings.items() if len(v) > 0}.difference(
        cant_race
    )
    team1_candidates = list(team1_candidates)
    team1_candidates.sort(key=lambda x: last_race[x], reverse=True)
    random.shuffle(team1_candidates)

    # bonus candidate: the team which is already in this flight
    if len(races) >= F and not (
        len(races) >= F + F and races[-F - F].team1 == races[-F].team1
    ):
        team1_candidates.append(races[-F].team1)

    # reversed to try the teams which are already in this flight first
    for team1 in reversed(team1_candidates):
        # team2 candidates are those which have yet to race vs team1
        team2_candidates = pairings[team1].difference(cant_race)
        team2_candidates = list(team2_candidates)
        team2_candidates.sort(key=lambda x: last_race[x], reverse=True)

        # bonus candidate: the team which is already in this flight
        if (
            len(races) >= F  # there is a team in this flight already
            and not (
                len(races) >= F + F and races[-F - F].team2 == races[-F].team2
            )  # the team in the flight isn't on their second race
            and races[-F].team2
            in pairings[team1]  # the team in the flight is yet to go against team1
        ):
            # the team which is already in this flight has only raced once
            team2_candidates.append(races[-F].team2)

        for team2 in reversed(team2_candidates):
            race_num = len(races) + 1
            races.append(Race(team1, team2, race_num))
            pairings[team1].remove(team2)
            pairings[team2].remove(team1)
            old_last_race_team1 = last_race[team1]
            old_last_race_team2 = last_race[team2]
            last_race[team1] = race_num
            last_race[team2] = race_num

            if extend(races, pairings, last_race, fuel):
                return True

            # failure case: reset the tings
            pairings[team2].add(team1)
            pairings[team1].add(team2)
            races.pop()
            last_race[team1] = old_last_race_team1
            last_race[team2] = old_last_race_team2

    return False


def print_schedule(teams, races: List[Race]):
    total_raced = {t: 0 for t in teams}
    print("=" * 150)
    for race in races:
        print("\t", race)
        total_raced[race.team1] += 1
        total_raced[race.team2] += 1
        # print(total_raced)
        # print("min = ", min(total_raced.values()), "max = ", max(total_raced.values()))
        if all(total_raced[t] == total_raced[teams[0]] for t in teams):
            print("ALL EQUAL", total_raced[teams[0]])


# potentially input seed
# 1. As round robin as possible (most equal)
# 2. People on for two races in same flight if possible (3 races)
# 3. No unrealistically short changes
def rr_schedule(
    teams: List[str], flights: List[Tuple[str, str]], seed: int = None
) -> List[Race]:
    if seed is not None:
        random.seed(seed)

    f = len(flights)
    t = len(teams)

    races = []

    # pairings[team] = set of teams they are yet to race against
    pairings = {t: set(teams).difference(set([t])) for t in teams}

    if not extend(races, pairings, {t: 0 for t in teams}, [1_000_000]):
        raise ValueError("Failed to generate schedule")

    print_schedule(teams, races)
    return races


# iterates over a possible set of rounds
# if even number of teams, each round consists of each team playing against one other team
# if odd number of teams, each team plays two other teams
def generate_rounds(teams: List[str]) -> Iterator[List[Tuple[str, str]]]:
    ts = len(teams)
    team1s = teams[: ts // 2]
    team2s = teams[ts // 2 :]

    if ts % 2 == 0:
        # even number of teams
        print("even")
        for _ in range(ts - 1):
            # pair off teams
            yield list(zip(team1s, team2s))

            # rotate according to https://en.wikipedia.org/wiki/Round-robin_tournament
            team1s[1], team1s[2:], team2s[:-1], team2s[-1] = (
                team2s[0],
                team1s[1:-1],
                team2s[1:],
                team1s[-1],
            )
    else:
        # odd number of teams
        benched = team2s.pop()  # makes sure len(team1s) == len(team2s)

        for _ in range((ts - 1) // 2):
            mini_round_1 = list(zip(team1s, team2s))
            remainder_1 = benched

            # rotate according to custom logic
            team1s[0], team1s[1:], benched, team2s[-1], team2s[:-1] = (
                team2s[0],
                team1s[:-1],
                team1s[-1],
                benched,
                team2s[1:],
            )

            mini_round_2 = list(zip(team1s, team2s))
            remainder_2 = benched

            # rotate according to custom logic
            team1s[0], team1s[1:], benched, team2s[-1], team2s[:-1] = (
                team2s[0],
                team1s[:-1],
                team1s[-1],
                benched,
                team2s[1:],
            )

            yield [*mini_round_1, *mini_round_2, (remainder_1, remainder_2)]


def rr_with_breakpoints(
    teams: List[str],
    flights: List[Tuple[str, str]],
    breakpoints: Set[int],  # break AFTER ith round
    # (there will be len(teams) - 1 rounds)
    seed: int = None,
    max_fuel: Optional[int] = None,
) -> List[Race]:
    if seed is not None:
        random.seed(seed)

    f = len(flights)
    t = len(teams)
    half = t // 2

    if max_fuel is None:
        max_fuel = 5 * len(teams) ** 2
    fuel = [max_fuel]

    # always a breakpoint at the end
    total_races = t * (t - 1) // 2
    breakpoints = set(breakpoints)
    breakpoints.add(total_races)

    # pairs ith team with (i + len(teams)/2)th team
    # then each round rotates tail of the teams around
    races = []
    race_number = 0

    pairings = {t: set() for t in teams}
    last_race = {t: 0 for t in teams}

    for round in generate_rounds(teams):
        # pairs each team in the first half with each team in the second half
        for t1, t2 in round:
            pairings[t1].add(t2)
            pairings[t2].add(t1)
            race_number += 1

        # if we have passed a breakpoint
        min_breakpoint = min(breakpoints)
        if race_number >= min_breakpoint:
            print("breakpoint", min_breakpoint)
            breakpoints.remove(min_breakpoint)
            # return []
            # run round robin
            if not extend(races, pairings, last_race, fuel):
                return None
            # print_schedule(teams, races)

            # reset pairings
            pairings = {t: set() for t in teams}

    print("succeeded after using", max_fuel - fuel[0], "fuel")

    return races


def rr_breakpoints_retry(
    teams: List[str],
    flights: List[Tuple[str, str]],
    breakpoints: Set[int],
    seed: Optional[int] = None,
) -> List[Race]:
    while True:
        schedule = rr_with_breakpoints(teams, flights, breakpoints, seed=seed)
        if schedule is not None:
            break
        print("failed, retrying")

    return schedule


def sql_schedule(races: List[Race]) -> str:
    # return a sql query to insert the schedule into the database
    pass


# for pasting into google sheets or excel
def tsv_schedule(
    teams: List[str], flights: List[Tuple[str, str]], races: List[Race]
) -> str:
    # header
    output = "race\t" + "\t".join(f1 + "\t" + f2 for f1, f2 in flights) + "\n"

    # body
    total_raced = {t: 0 for t in teams}
    for race in races:
        output += f"{race.race_num}\t"
        flight_num = (race.race_num - 1) % len(flights)
        output += "\t" * (flight_num * 2)
        output += f"{race.team1}\t{race.team2}\n"

        # keep track of how many races each team has raced
        total_raced[race.team1] += 1
        total_raced[race.team2] += 1

        # if all teams have raced the same number of times, add a divider
        if all(total_raced[t] == total_raced[teams[0]] for t in teams):
            output += "breakpoint\n"

    # footer
    return output


if __name__ == "__main__":
    schedule = rr_breakpoints_retry(
        TEAMS, FLIGHTS, {25, 50, 75, 100, 125, 150, 175, 200}, seed=None
    )

    # put tsv schedule into clipboard
    pyperclip.copy(tsv_schedule(TEAMS, FLIGHTS, schedule))
