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

COLUMN_WIDTH = 2


# team1, flight1, team2, flight2, race#
class Race:
    def __init__(self, team1: str, team2: str, race_num: int):
        self.team1 = team1
        self.team2 = team2
        self.race_num = race_num

    def __str__(self):
        indent = 0  # "\t" * COLUMN_WIDTH * ((self.race_num - 1) % len(FLIGHTS))
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

    if ts % 2 == 0:
        n = ts // 2
        team1s = teams[:n]
        team2s = teams[n:]
        # even number of teams
        print("even")
        for _ in range(n - 1):
            pairings = {t: set() for t in teams}
            for _ in range(2):
                for t1, t2 in zip(team1s, team2s):
                    pairings[t1].add(t2)
                    pairings[t2].add(t1)

                # rotate according to https://en.wikipedia.org/wiki/Round-robin_tournament
                team1s[1], team1s[2:], team2s[:-1], team2s[-1] = (
                    team2s[0],
                    team1s[1:-1],
                    team2s[1:],
                    team1s[-1],
                )

            # make these pairings into a full round
            # form a chain starting with l
            current = teams[0]
            round = []
            for i in range(ts):
                # get another team which matches with current
                other = pairings[current].pop()
                pairings[other].discard(current)
                # add to round
                race = (current, other) if i % 2 == 0 else (other, current)
                round.append(race)
                current = other
            yield round

        # add leftover round
        yield list(zip(team1s, team2s))
    else:
        # # Walecki's algorithm
        # for k in range(1, (ts // 2) + 1):
        #     order = []
        #     current = 1
        #     for _ in range(ts):
        #         order.append(current - 1)
        #         current = ((current + k - 1) % (ts - 1)) + 2
        #     # order.pop()
        #     print("ts", ts, "k", k, "order", order)
        #     round = []
        #     for i in range(ts):
        #         t1, t2 = teams[order[i] % ts], teams[order[(i + 1) % ts] % ts]
        #         round.append((t1, t2) if i % 2 == 0 else (t2, t1))
        #     yield round

        # reorder teams
        n = ts // 2
        team1s = teams[:n]  # first half rounded down
        team2s = teams[n:]  # second half rounded up
        team2s[:-1] = team2s[:-1][::-1]

        for _ in range(n):
            # print("====")
            # print(team1s)
            # print(team2s)
            races = [(team2s[-1], team2s[0])]
            for t1, t2a, t2b in zip(team1s, team2s[:-1], team2s[1:]):
                races.append((t1, t2a))
                races.append((t1, t2b))
            yield races

            # rotates first n of each list, but keeps last team2s uneffected
            team1s[0], team1s[1:], team2s[-2], team2s[:-2] = (
                team2s[0],
                team1s[:-1],
                team1s[-1],
                team2s[1:-1],
            )

        #     # rotate according to https://en.wikipedia.org/wiki/Round-robin_tournament
        #     team1s[1], team1s[2:], team2s[:-1], team2s[-1] = (
        #         team2s[0],
        #         team1s[1:-1],
        #         team2s[1:],
        #         team1s[-1],
        #     )

        # make mini rounds

        # odd number of teams
        # benched = team2s.pop()  # makes sure len(team1s) == len(team2s)

        # # make mini rounds
        # mini_rounds = {}
        # for _ in range(ts):
        #     mini_round = list(zip(team1s, team2s))
        #     remainder = benched
        #     mini_rounds[remainder] = mini_round

        #     # clockwise rotate with remainder on the right
        #     team1s[0], team1s[1:], benched, team2s[-1], team2s[:-1] = (
        #         team2s[0],
        #         team1s[:-1],
        #         team1s[-1],
        #         benched,
        #         team2s[1:],
        #     )

        # # there should be ts mini rounds
        # # take the first mini round, and use it to pair off the other rounds
        # # ARBITRARILY CHOOSE THE FIRST MINI ROUND
        # mr = next(iter(mini_rounds.values()))
        # for l, r in mr:
        #     # pair the l mini round with the r mini round
        #     pairings = {t: set() for t in teams}
        #     pairings[l].add(r)
        #     pairings[r].add(l)
        #     for t1, t2 in mini_rounds[l]:
        #         pairings[t1].add(t2)
        #         pairings[t2].add(t1)
        #     for t1, t2 in mini_rounds[r]:
        #         pairings[t1].add(t2)
        #         pairings[t2].add(t1)
        #     # pairings should specify everyone playing everyone twice

        #     print("making round")
        #     print((l, r))
        #     print(mini_rounds[l])
        #     print(mini_rounds[r])

        #     # form a chain starting with l
        #     current = l
        #     round = []
        #     for i in range(ts):
        #         # get another team which matches with current
        #         other = pairings[current].pop()
        #         pairings[other].discard(current)
        #         # add to round
        #         race = (current, other) if i % 2 == 0 else (other, current)
        #         round.append(race)
        #         print("adding race", race)
        #         current = other
        #     yield round


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

        if not extend(races, pairings, last_race, fuel):
            return None
        pairings = {t: set() for t in teams}

        break

        # if we have passed a breakpoint
        # min_breakpoint = min(breakpoints)
        # if race_number >= min_breakpoint:
        #     print("breakpoint", min_breakpoint)
        #     breakpoints.remove(min_breakpoint)
        #     # return []
        #     # run round robin
        #     if not extend(races, pairings, last_race, fuel):
        #         return None
        #     # print_schedule(teams, races)

        #     # reset pairings
        #     pairings = {t: set() for t in teams}

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


def check_schedule(races: List[Race], teams: List[str], flights: List[Flight]):
    """
    criteria:
    - every team plays every other team exactly once
    - no team races more than 2 times in a row
    - races[i] is disjoint from races[i-1], ..., races[i-F] (otherwise they'd be busy)
    """
    f = len(flights)
    problems = []

    # - every team plays every other team exactly once
    pairings = {t: set(teams).difference(set([t])) for t in teams}
    for race in races:
        if (
            race.team2 not in pairings[race.team1]
            or race.team1 not in pairings[race.team2]
        ):
            problems.append(f"Team {race.team1} and {race.team2} raced more than once")

        pairings[race.team1].discard(race.team2)
        pairings[race.team2].discard(race.team1)
    if not all(len(p) == 0 for p in pairings.values()):
        problems.append(f"Pairings remain: {pairings}")

    # - no team races more than 2 times in a row
    for i, race in enumerate(races):
        if i >= f + f:
            if (
                races[i - f].team1 == race.team1
                and races[i - f - f].team1 == race.team1
            ):
                # team1 raced in the two races before this one
                problems.append(f"Team {race.team1} has raced three times in a row")

            if (
                races[i - f].team2 == race.team2
                and races[i - f - f].team2 == race.team2
            ):
                # team2 raced in the two races before this one
                problems.append(f"Team {race.team2} has raced three times in a row")

    # - people aren't required to be in a boat too soon after being in another boat
    for i, race in enumerate(races):
        last_row = races[i - len(flights) : i]
        if len(last_row) > 0:
            busy_teams = {r.team1 for r in last_row}.union({r.team2 for r in last_row})
            if last_row[0].team1 == race.team1:
                busy_teams.remove(
                    race.team1
                )  # they're not preoccupied because already in correct boat
            if last_row[0].team2 == race.team2:
                busy_teams.remove(
                    race.team2
                )  # they're not preoccupied because already in correct boat

            if race.team1 in busy_teams:
                problems.append(
                    f"Team {race.team1} can't race on race {race.race_num} because they're busy"
                )
            if race.team2 in busy_teams:
                problems.append(
                    f"Team {race.team2} can't race on race {race.race_num} because they're busy"
                )

    if len(problems) > 0:
        print("problems:")
        print("\n".join(problems))
        raise ValueError(f"Schedule is invalid {len(problems)} problems")


def block_extend(
    races: List[Race],
    teams: List[str],
    flights: List[Flight],
    rounds: Dict[int, List[Tuple[str, str]]],
    best_schedule: List[Race],
) -> bool:
    """
    Trys to make a block which can be put on the end of races
    Returns True iff successful
    If unsuccessful, resets datastructures
    """
    if len(rounds) == 0:
        return True

    # try every block
    for round_num, r in list(rounds.items()):

        valid_block_found = False
        print("new block")
        for _ in range(2 * len(r)):
            # form block
            block = [None] * len(r)
            i = 0
            flight = 0
            for lt, rt in r:
                block[i] = (lt, rt)
                i += len(flights)
                if i >= len(block):
                    flight += 1
                    i = flight

            print("trying block rotation", block)
            # check if this rotation works
            # CHECK: of the first F races, neither team has participated in one of the last F races
            last_row = races[-len(flights) :]
            busy_teams = {r.team1 for r in last_row}.union({r.team2 for r in last_row})
            clash = False
            for flight in range(len(flights)):
                t1, t2 = block[flight]
                if t1 in busy_teams or t2 in busy_teams:
                    clash = True
                    break
                else:
                    pass

                if len(races) > len(flights) - flight - 1:
                    busy_teams.discard(races[flight - len(flights)].team1)
                    busy_teams.discard(races[flight - len(flights)].team2)

            if clash:
                # this block clashes with the previous races
                # rotate races so different block is tried
                first_race = r[-1]
                if len(r) % 2 == 1:
                    first_race = (first_race[1], first_race[0])
                r[0], r[1:] = first_race, r[:-1]
            else:
                # valid block was found
                valid_block_found = True
                break

        if valid_block_found:
            # valid block was found
            print("valid block found")
            for lt, rt in block:
                races.append(Race(lt, rt, len(races) + 1))
            r = rounds.pop(round_num)

            if len(races) > len(best_schedule):
                best_schedule[:] = races

            if block_extend(races, teams, flights, rounds, best_schedule):
                return True
            rounds[round_num] = r
            for _ in block:
                races.pop()

    return False


def greedy_blocks(teams: List[str], flights: List[Flight]) -> List[Race]:
    """
    strategy: at each stage, pick the block which can be built with the least double handovers
    """

    races = []
    best_schedule = []
    rounds = dict(enumerate(generate_rounds(teams)))
    for round_num, r in rounds.items():
        print("round", round_num)
        print(r)

    if block_extend(races, teams, flights, rounds, best_schedule):
        return races
    else:
        print("failed to form blocks")
        return best_schedule


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

    teams = TEAMS[10:]  # [f"T{n}" for n in range(1, 8 + 1)]
    flights = FLIGHTS[2:]  # [(f"F{n}", (n, n, n)) for n in range(1, 1 + 1)]

    # num_raced = {t: set(teams).difference(set([t])) for t in teams}
    # for r in generate_rounds(teams):
    #     print(r)
    #     for t1, t2 in r:
    #         num_raced[t1].remove(t2)
    #         num_raced[t2].remove(t1)
    # print(num_raced)
    schedule = greedy_blocks(teams, flights)
    with open(f"schedule/test.tsv", "w") as f:
        f.write(tsv_schedule(teams, flights, schedule))

    for i, race in enumerate(schedule):
        if i % len(teams) == 0:
            print("breakpoint")
        print("\t" * (4 * (i % len(flights))) + str(race))

    if len(schedule) > 0:
        check_schedule(schedule, teams, flights)

    # r = next(generate_rounds([f"T{i + 1}" for i in range(7)]))
    # pairings = {t: set() for t in teams}
    # for t1, t2 in r:
    #     pairings[t1].add(t2)
    #     pairings[t2].add(t1)

    # races = []

    # for round in generate_rounds([f"T{i + 1}" for i in range(7)]):
    #     print(round)

    # team1s = ["T1", "T2", "T3", "T4"]
    # team2s = ["T7", "T6", "T5"]

    # team1s[1], team1s[2:], team2s[:-1], team2s[-1] = (
    #     team2s[0],
    #     team1s[1:-1],
    #     team2s[1:],
    #     team1s[-1],
    # )

    # print(team1s)
    # print(team2s)
