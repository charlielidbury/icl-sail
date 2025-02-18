import uuid
import pyperclip
import itertools
import random
from typing import Dict, Iterator, List, Optional, Set, Tuple


# 21 teams
TEAMS = [
    "Plymouth Black",
    "TCD",
    "Solent Black",
    "Portsmouth Brown",
    "Portsmouth Blue",
    "Bath Glossy White",
    "Bath Matte Black",
    "UCD",
    "Warwick Blue",
    "Rutland Rockets",
    "Sevenoaks Pirate Hawks",
    "Northern RoyalT",
    "Emirates Team Kickflip",
    "Imperial White",
    "Brunel Blue",
    "UCL Purple",
    "UCLove",
    "Cambridge Green",
    "Oxford",
    "Durham White",
    "Durham Bubblegum Pink",
]

# TEAMS = list("ABCD")

# 4 flights
FLIGHTS = [
    (("Pink and Black Stripe", (7, 8, 9)), ("Pink and Black Stripe", (10, 11, 12))),
    (("Green Circle", (7, 8, 9)), ("Black Diamond", (10, 11, 12))),
    (
        ("Red and Blue striped jibs", (1, 2, 3)),
        ("Red and Blue striped jibs", (4, 5, 6)),
    ),
    (("Red and Blue stripe", (1, 2, 3)), ("Red and Blue stripe", (4, 5, 6))),
]
HalfFlight = Tuple[str, Tuple[int, int, int]]
Flight = Tuple[HalfFlight, HalfFlight]

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
    teams: List[str], flights: List[Flight], seed: int = None
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

        # make mini rounds
        mini_rounds = {}
        for _ in range(ts):
            mini_round = list(zip(team1s, team2s))
            remainder = benched
            mini_rounds[remainder] = mini_round

            # rotate according to custom logic
            team1s[0], team1s[1:], benched, team2s[-1], team2s[:-1] = (
                team2s[0],
                team1s[:-1],
                team1s[-1],
                benched,
                team2s[1:],
            )

        # there should be ts mini rounds
        # take the first mini round, and use it to pair off the other rounds
        # ARBITRARILY CHOOSE THE FIRST MINI ROUND
        _, mr = next(iter(mini_rounds.items()))
        for l, r in mr:
            # pair the l mini round with the r mini round
            yield [(l, r), *mini_rounds[l], *mini_rounds[r]]


def rr_with_breakpoints(
    teams: List[str],
    flights: List[Flight],
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
    flights: List[Flight],
    breakpoints: Set[int],
    seed: Optional[int] = None,
) -> List[Race]:
    while True:
        schedule = rr_with_breakpoints(teams, flights, breakpoints, seed=seed)
        if schedule is not None:
            break
        print("failed, retrying")

    return schedule


flight_uuids = {}
race_uuids = {}
team_uuids = {}
races_output = 0


def sql_schedule(
    teams: List[str],
    flights: List[Flight],
    races: List[Race],
    league: str,
) -> str:
    global races_output
    race_num_offset = (
        races_output  # for races that were generated by this script previously
    )
    races_output += len(races)
    sql = ""

    # insert flight (halve)s
    flights_sql = ""
    for left_flight, right_flight in flights:
        if left_flight not in flight_uuids:
            flights_sql += f"('{flight_uuids.setdefault(left_flight, str(uuid.uuid4()))}', '{left_flight[0]}', ARRAY[{','.join(map(str, left_flight[1]))}]),\n"
        if right_flight not in flight_uuids:
            flights_sql += f"('{flight_uuids.setdefault(right_flight, str(uuid.uuid4()))}', '{right_flight[0]}', ARRAY[{','.join(map(str, right_flight[1]))}]),\n"
    if flights_sql != "":
        sql += "DELETE FROM leaderboard;\n\n"
        sql += "DELETE FROM raceteam;\n\n"
        sql += "DELETE FROM race;\n\n"
        sql += "DELETE FROM halfflight;\n\n"
        sql += "DELETE FROM team;\n\n"
        sql += f"INSERT INTO halfflight (id, name, numbers) VALUES\n{flights_sql[:-2]};\n\n"

    # insert teams
    teams_sql = ""
    for team in teams:
        if team not in team_uuids:
            teams_sql += (
                f"('{team_uuids.setdefault(team, str(uuid.uuid4()))}', '{team}'),\n"
            )
    if teams_sql != "":
        sql += f"INSERT INTO team (id, name) VALUES\n{teams_sql[:-2]};\n\n"

    # insert races
    races_sql = ""
    for race in races:
        race_uuids[race] = str(uuid.uuid4())  # always override
        races_sql += (
            f"('{race_uuids[race]}', {race_num_offset + race.race_num}, '{league}'),\n"
        )
    if races_sql != "":
        sql += f"INSERT INTO race (id, number, league) VALUES\n{races_sql[:-2]};\n\n"

    # insert raceteams
    raceteams_sql = ""
    for race in races:
        flight_num = (race.race_num - 1) % len(flights)
        left_flight, right_flight = flights[flight_num]

        raceteams_sql += f"('{race_uuids[race]}', '{team_uuids[race.team1]}', '{flight_uuids[left_flight]}'),\n"
        raceteams_sql += f"('{race_uuids[race]}', '{team_uuids[race.team2]}', '{flight_uuids[right_flight]}'),\n"
    if raceteams_sql != "":
        sql += f"INSERT INTO raceteam (race, team, halfflight) VALUES\n{raceteams_sql[:-2]};\n\n"

    return sql


# for pasting into google sheets or excel
def tsv_schedule(teams: List[str], flights: List[Flight], races: List[Race]) -> str:
    # header
    output = (
        "race\t"
        + "\t".join(f"{f1[0]}{f1[1]}\t{f2[0]}{f2[1]}" for f1, f2 in flights)
        + "\n"
    )

    # body
    total_raced = {t: 0 for t in teams}
    for race in races:
        total_raced[race.team1] += 1
        total_raced[race.team2] += 1

        output += f"{race.race_num}\t"
        flight_num = (race.race_num - 1) % len(flights)
        output += "\t" * (flight_num * 2)
        output += f"{race.team1}\t{race.team2}"
        min_raced = min(total_raced.values())
        max_raced = max(total_raced.values())
        output += (
            "\t" * ((len(flights) - flight_num - 1) * 2)
            + f"\t{min_raced}\t{max_raced}\t{max_raced - min_raced}\n"
        )

        # keep track of how many races each team has raced

        # if all teams have raced the same number of times, add a divider
        if all(total_raced[t] == total_raced[teams[0]] for t in teams):
            output += "breakpoint\n"

    # footer
    return output


def block_extend(
    races: List[Race],
    teams: List[str],
    flights: List[Flight],
    rounds: Dict[int, List[Tuple[str, str]]],
) -> List[Race]:
    pass


def greedy_blocks(teams: List[str], flights: List[Flight]) -> List[Race]:
    """
    strategy: at each stage, pick the block which can be built with the least double handovers
    """

    races = []

    rounds = dict(enumerate(list(generate_rounds(teams))))

    block_extend(races, teams, flights, rounds)

    for round in range(len(rounds)):
        pass


if __name__ == "__main__":
    # for league, teams, flights, breakpoints in [
    #     ("quali", TEAMS, FLIGHTS, {50, 75, 100, 125, 150, 175}),  # Qualifying
    #     ("gold", TEAMS[:11], FLIGHTS[:2], {40, 60, 80}),  # Gold
    #     ("silver", TEAMS[11:], FLIGHTS[2:], {40, 60, 80}),  # Silver
    # ]:
    #     schedule = rr_breakpoints_retry(teams, flights, breakpoints, seed=None)
    #     with open(f"schedule/{league}.tsv", "w") as f:
    #         f.write(tsv_schedule(teams, flights, schedule))
    #     with open(f"schedule/{league}.sql", "w") as f:
    #         f.write(sql_schedule(teams, flights, schedule, league))

    schedule = rr_breakpoints_retry(
        TEAMS, FLIGHTS, {21 * (i + 1) for i in range(10)}, seed=None
    )
    with open(f"schedule/test.tsv", "w") as f:
        f.write(tsv_schedule(TEAMS, FLIGHTS, schedule))
