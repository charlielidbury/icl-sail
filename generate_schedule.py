import random
from typing import Dict, List, Optional, Set, Tuple


# team1, flight1, team2, flight2, race#
class Race:
    def __init__(
        self, team1: str, flight1: str, team2: str, flight2: str, race_num: int
    ):
        self.team1 = team1
        self.flight1 = flight1
        self.team2 = team2
        self.flight2 = flight2
        self.race_num = race_num

    def __str__(self):
        indent = " " * 75 * ((self.race_num - 1) % 3)
        return f"{indent}{self.race_num}: {self.team1}({self.flight1}) vs {self.team2} ({self.flight2})"


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
    f: int,
    fuel: int,
) -> Tuple[Optional[str], Optional[str]]:
    if fuel == 0:
        return None, None

    # pick a team1
    if len(races) >= f and not (
        len(races) >= f + f and races[-f - f].team1 == races[-f].team1
    ):
        # the team which is already in this flight has only raced once
        team1 = races[-f].team1
        print("A", team1)
    else:
        # can't reuse encumbent team, so pick a random team
        team1 = random_set_choice(
            {k for k, v in pairings.items() if len(v) > 0}.difference(cant_race)
        )
        print("B", team1)
    # pick a team2
    if (
        len(races) >= f  # there is a team in this flight already
        and not (
            len(races) >= f + f and races[-f - f].team2 == races[-f].team2
        )  # the team in the flight isn't on their second race
        and races[-f].team2
        in pairings[team1]  # the team in the flight is yet to go against team1
    ):
        # the team which is already in this flight has only raced once
        team2 = races[-f].team2
    else:
        # can't reuse encumbent team, so pick a random team
        candidates = set(pairings[team1]).difference(cant_race)
        if len(candidates) == 0:
            # no teams left to race against, try again but avoid team1
            return pick_two(races, pairings, cant_race.union({team1}), f, fuel - 1)
        team2 = random_set_choice(candidates)

    # remove this race from the pairings
    pairings[team1].remove(team2)
    pairings[team2].remove(team1)

    return team1, team2


# potentially input seed
# 1. As round robin as possible (most equal)
# 2. People on for two races in same flight if possible (3 races)
# 3. No unrealistically short changes
def round_robin_schedule(
    teams: List[str], flights: List[Tuple[str, str]], seed: int = None
) -> List[Race]:
    if seed is not None:
        random.seed(seed)

    f = len(flights)
    t = len(teams)

    races = []

    # pairings[team] = set of teams they are yet to race against
    pairings = {t: set(teams).difference(set([t])) for t in teams}

    while len(races) < t * (t - 1) // 2:
        # teams that have already raced in the last 3 races are busy doing that race
        cant_race = {race.team1 for race in races[-f:]}.union(
            {race.team2 for race in races[-f:]}
        )

        team1, team2 = pick_two(races, pairings, cant_race, f, 10)
        if team1 is None and team2 is None:
            # couldn't schedule a race, remove a race and try again
            r = races.pop()
            pairings[r.team1].add(r.team2)
            pairings[r.team2].add(r.team1)
            print("retrying")
            continue

        (flight1, flight2) = flights[len(races) % f]

        races.append(Race(team1, flight1, team2, flight2, len(races) + 1))

        # if race_number_0 > 20:
        #     break

    print("=" * 150)
    print("\n".join(map(str, races)))

    return races


TEAMS = [
    "Imperial Castaways",
    "Edinburgh Blue",
    "Edinburgh Black",
    "UCL Purple",
    "UCL Blue",
    "St Andrews Pink",
    "St Andrews Yellow",
    "Castaways",
    "Deckhead's",
    "Plymouth Pink",
    "Plymouth Blue",
    "Exeter Yellow",
    "Hoisin Crispy Owl",
    "Oxford the Gray",
    "Welsh Harp Sailing Club",
]

FLIGHTS = [
    ("Pink(4,5,8)", "Black(10,11,12)"),
    ("Green(7,8,9)", "Black2(10,11,12)"),
    ("Red Stripe(1,2,3)", "Blue Stripe(4,5,6)"),
]


def sql_schedule(races: List[Race]) -> str:
    # return a sql query to insert the schedule into the database
    pass


# for pasting into google sheets or excel
def tsv_schedule(races: List[Race]) -> str:
    pass


if __name__ == "__main__":
    schedule = round_robin_schedule(TEAMS, FLIGHTS, seed=None)
    print(schedule)
