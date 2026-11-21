"use client";

// The admin's Generate and Clear buttons on the leaderboard's Gold/Silver tab:
// make the Gold and Silver round robins from the qualifying standings
// (src/groups.ts), or delete them. The database only lets admins insert
// non-qualifying races and delete Gold/Silver races without a result
// (db/2026-11-21-stages.sql), and both are checked here first too.
import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Link,
  List,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useState } from "react";
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupsConfig } from "@/competitions";
import {
  ordinal,
  planGroups,
  racedGroupRaces,
  type Group,
  type GroupsPlan,
  type NewRace,
  type PlanRace,
} from "@/groups";
import { GROUP_LEAGUES, leagueName } from "@/leagues";
import {
  leaderboardAtom,
  racesAtom,
  useCompetition,
  type RaceResult,
} from "@/shared";
import supabase from "@/supabase";

type Message = { status: "error" | "success"; text: string };

const describeFailure = (message: string) =>
  /fetch|network/i.test(message)
    ? "couldn't reach the server. Check your connection and try again."
    : `${message}.`;

const raceList = (numbers: number[]) =>
  `${numbers.length === 1 ? "Race" : "Races"} ${numbers.join(", ")}`;

/**
 * Deletes the competition's Gold/Silver races, refusing if any has a result.
 * Checks the database rather than what's on screen, and treats rows the
 * database refused (fewer deleted than found) as a failure. Returns an error
 * message, or null.
 */
async function deleteGroupRaces(competitionId: string): Promise<string | null> {
  try {
    const { data: existing, error } = await supabase
      .from("race")
      .select("id, number, finishtime, lresult, rresult")
      .eq("competition", competitionId)
      .in("league", GROUP_LEAGUES);
    if (error) return `Nothing changed: ${describeFailure(error.message)}`;
    const raced = existing
      .filter((r) => r.finishtime !== null || r.lresult !== null || r.rresult !== null)
      .map((r) => r.number)
      .sort((a, b) => a - b);
    if (raced.length > 0) {
      return (
        `Nothing changed: ${raceList(raced)} already ${raced.length === 1 ? "has a result" : "have results"}, ` +
        "and Gold/Silver races with results can't be deleted. Remove the results first if they really should go."
      );
    }
    if (existing.length === 0) return null;

    const { data: deleted, error: deleteError } = await supabase
      .from("race")
      .delete()
      .eq("competition", competitionId)
      .in("league", GROUP_LEAGUES)
      .select("id");
    if (deleteError) return `Not deleted: ${describeFailure(deleteError.message)}`;
    const n = deleted?.length ?? 0;
    if (n < existing.length) {
      return n === 0
        ? "Not deleted: the database refused. Make sure you're logged in as an admin of this competition, then try again."
        : `Only ${n} of the ${existing.length} Gold/Silver races were deleted; the database refused the rest ` +
            "(maybe a result was just entered). Check the races list.";
    }
    return null;
  } catch (e) {
    return `Not done: ${describeFailure(e instanceof Error ? e.message : String(e))}`;
  }
}

/** Inserts the new races in one go. Returns an error message, or null. */
async function insertRaces(competitionId: string, races: NewRace[]): Promise<string | null> {
  try {
    const rows = races.map((r) => ({ competition: competitionId, ...r }));
    const { data, error } = await supabase.from("race").insert(rows).select("id");
    if (error) return describeFailure(error.message);
    if (!data || data.length !== rows.length) {
      return `only ${data?.length ?? 0} of the ${rows.length} races were created. Check the races list.`;
    }
    return null;
  } catch (e) {
    return describeFailure(e instanceof Error ? e.message : String(e));
  }
}

const toPlanRace = (r: RaceResult): PlanRace => ({
  number: r.number,
  league: r.league,
  flight: r.flight.id,
  lteam: r.lteam?.id ?? null,
  rteam: r.rteam?.id ?? null,
  finished: r.finishtime !== null,
});

const raceRange = (numbers: number[]) =>
  numbers.length === 0
    ? ""
    : `${Math.min(...numbers)}–${Math.max(...numbers)}`;

function GroupColumn({ group, flightName }: { group: Group; flightName: string }) {
  return (
    <Box>
      <Heading as="h3" size="sm" mb={1}>
        {leagueName(group.league)}
      </Heading>
      <Text fontSize="xs" color="gray.600" mb={2}>
        {group.teams.length} teams · {group.races.length} races on {flightName}
      </Text>
      <List.Root as="ol" listStyle="none" gap={1}>
        {group.teams.map((t) => (
          <List.Item key={t.id} fontSize="sm">
            <Flex justify="space-between" gap={2}>
              <Text>
                <Text as="span" color="gray.500" display="inline-block" minW="2.5em">
                  {ordinal(t.rank)}
                </Text>
                {t.name}
              </Text>
              <Text color="gray.500" flexShrink={0}>
                {t.wins}W {t.losses}L
              </Text>
            </Flex>
          </List.Item>
        ))}
      </List.Root>
    </Box>
  );
}

export default function GroupsAdmin({ released }: { released: boolean }) {
  const competition = useCompetition();
  const queryClient = useQueryClient();
  const leaderboards = useAtomValue(leaderboardAtom);
  const races = useAtomValue(racesAtom).data?.races;

  const [plan, setPlan] = useState<GroupsPlan | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  if (races === undefined || leaderboards === undefined) return null;

  const groupRaces = races.filter((r) => GROUP_LEAGUES.includes(r.league));
  const raced = racedGroupRaces(races.map(toPlanRace)).map((r) => r.number);
  const flightNames = new Map(races.map((r) => [r.flight.id, r.flight.name]));

  const refusedForResults = () =>
    setMessage({
      status: "error",
      text:
        `${raceList(raced)} already ${raced.length === 1 ? "has a result" : "have results"}, ` +
        "so the Gold/Silver races can't be replaced or cleared. Remove the results first if they really should go.",
    });

  const openGenerate = () => {
    setMessage(null);
    if (raced.length > 0) return refusedForResults();
    try {
      const standings = (leaderboards.get("quali") ?? []).map((row) => ({
        id: row.team.id,
        name: row.team.name,
        wins: row.wins,
        losses: row.losses,
        totalPoints: row.total_pts,
      }));
      setPlan(
        planGroups({
          standings,
          races: races.map(toPlanRace),
          config: groupsConfig(competition),
        }),
      );
    } catch (e) {
      setMessage({ status: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const generate = async () => {
    if (plan === null) return;
    setBusy(true);
    const deleteError = await deleteGroupRaces(competition.id);
    let error = deleteError;
    if (deleteError === null) {
      const insertError = await insertRaces(competition.id, plan.races);
      if (insertError !== null) {
        error =
          `The new races weren't created: ${insertError} ` +
          (groupRaces.length > 0 ? "The old Gold/Silver races were deleted. " : "") +
          "Try Generate again.";
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["races_data"] });
    setBusy(false);
    setPlan(null);
    const numbers = plan.races.map((r) => r.number);
    setMessage(
      error === null
        ? {
            status: "success",
            text: `Created ${plan.races.length} Gold/Silver races, ${raceRange(numbers)}.`,
          }
        : { status: "error", text: error },
    );
  };

  const clear = async () => {
    setBusy(true);
    const error = await deleteGroupRaces(competition.id);
    await queryClient.invalidateQueries({ queryKey: ["races_data"] });
    setBusy(false);
    setConfirmClear(false);
    setMessage(
      error === null
        ? { status: "success", text: "Deleted the Gold/Silver races." }
        : { status: "error", text: error },
    );
  };

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
      <Heading as="h2" size="sm" mb={1}>
        Admin
      </Heading>
      <Text fontSize="sm" color="gray.600">
        {groupRaces.length === 0
          ? "No Gold/Silver races yet. "
          : `${groupRaces.length} Gold/Silver races, ${raceRange(groupRaces.map((r) => r.number))}. `}
        {released ? (
          "Visitors can see them."
        ) : (
          <>
            Visitors can&apos;t see them yet: they&apos;re told Gold/Silver hasn&apos;t
            started. Release them by setting the stage in{" "}
            <Link href="/controls" color="blue.600">
              Controls
            </Link>
            .
          </>
        )}
      </Text>
      <Flex gap={2} mt={3} wrap="wrap">
        <Button size="sm" bg={competition.accentColour} color="white" onClick={openGenerate}>
          {groupRaces.length === 0 ? "Generate" : "Generate again"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          colorPalette="red"
          disabled={groupRaces.length === 0}
          onClick={() => {
            setMessage(null);
            if (raced.length > 0) return refusedForResults();
            setConfirmClear(true);
          }}
        >
          Clear
        </Button>
      </Flex>
      {message && (
        <Alert.Root status={message.status} size="sm" mt={3} role="alert">
          <Alert.Indicator />
          <Alert.Description>{message.text}</Alert.Description>
        </Alert.Root>
      )}

      {/* Generate: check the split, then go */}
      <DialogRoot
        open={plan !== null}
        onOpenChange={(e) => !e.open && !busy && setPlan(null)}
        size="lg"
        scrollBehavior="inside"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Gold and Silver</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {plan && (
              <Stack gap={4}>
                <Text fontSize="sm">
                  From the qualifying standings. {plan.races.length} races,{" "}
                  {raceRange(plan.races.map((r) => r.number))}, Gold and Silver taking
                  turns on their own flights.
                </Text>
                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                  <GroupColumn group={plan.gold} flightName={flightNames.get(plan.gold.flight) ?? "?"} />
                  <GroupColumn
                    group={plan.silver}
                    flightName={flightNames.get(plan.silver.flight) ?? "?"}
                  />
                </SimpleGrid>
                {plan.warnings.map((w) => (
                  <Alert.Root key={w} status="warning" size="sm">
                    <Alert.Indicator />
                    <Alert.Description>{w}</Alert.Description>
                  </Alert.Root>
                ))}
                <Text fontSize="sm" color="gray.600">
                  {released
                    ? "Gold/Silver is released, so visitors will see these races straight away."
                    : "Visitors won't see these races until you set the stage to Gold/Silver in Controls."}
                </Text>
              </Stack>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlan(null)} disabled={busy}>
              Cancel
            </Button>
            <Button bg={competition.accentColour} color="white" onClick={generate} loading={busy}>
              Create {plan?.races.length} races
            </Button>
          </DialogFooter>
          <DialogCloseTrigger disabled={busy} />
        </DialogContent>
      </DialogRoot>

      {/* Clear */}
      <DialogRoot
        open={confirmClear}
        onOpenChange={(e) => !e.open && !busy && setConfirmClear(false)}
        role="alertdialog"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete the Gold/Silver races?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text fontSize="sm">
              All {groupRaces.length} Gold/Silver races (
              {raceRange(groupRaces.map((r) => r.number))}) will be deleted. None has a
              result yet. You can generate them again afterwards.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)} disabled={busy}>
              Cancel
            </Button>
            <Button colorPalette="red" onClick={clear} loading={busy}>
              Delete {groupRaces.length} races
            </Button>
          </DialogFooter>
          <DialogCloseTrigger disabled={busy} />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
