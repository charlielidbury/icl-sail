// A short, plain-English reading of the scheduler's Report.
import { Box, Code, Collapsible, DataList, Flex, Icon, Text } from "@chakra-ui/react";
import { TbChevronDown, TbCircleCheckFilled, TbCircleXFilled } from "react-icons/tb";
import type { Report } from "@/scheduler/types";

// Long race lists are cut short; the full report has them all.
function races(xs: number[], max = 12) {
  if (xs.length <= max) return xs.join(", ");
  return `${xs.slice(0, max).join(", ")}, … (${xs.length - max} more)`;
}

export function Quality({ report, elapsedMs }: { report: Report; elapsedMs: number }) {
  const n = report.nTeams;
  const until = report.breakpointsEveryNUntil;
  const problems = [
    report.missingPairs > 0 && `${report.missingPairs} pairings missing`,
    report.duplicatePairs.length > 0 && `${report.duplicatePairs.length} pairings repeated`,
    report.gapViolations.length > 0 &&
      `${report.gapViolations.length} races without time to change boats`,
    report.stintViolations.length > 0 &&
      `${report.stintViolations.length} stints longer than ${report.maxStint} races`,
    report.maxSpread > 2 && `teams get ${report.maxSpread} races apart`,
  ].filter(Boolean);

  const rows: [string, React.ReactNode][] = [
    [
      "Teams level",
      until === 0
        ? `Not after the first ${n} races`
        : until === report.nRaces
          ? `Every ${n} races, right to the end`
          : `Every ${n} races until race ${until} (of ${report.nRaces})`,
    ],
    [
      "Breakpoints",
      report.breakpoints.length ? `After races ${races(report.breakpoints)}` : "None",
    ],
    [
      "Double changeovers",
      report.doubleChangeovers.length
        ? `${report.doubleChangeovers.length} (races ${races(report.doubleChangeovers, 8)})`
        : "None",
    ],
    ["Max spread", `${report.maxSpread} ${report.maxSpread === 1 ? "race" : "races"}`],
  ];

  return (
    <Box borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
      <Flex align="flex-start" gap={2} mb={3}>
        <Icon
          as={report.hardOk ? TbCircleCheckFilled : TbCircleXFilled}
          color={report.hardOk ? "green.600" : "red.600"}
          boxSize={5}
          mt="1px"
          flexShrink={0}
        />
        <Box>
          <Text fontWeight="semibold">
            {report.hardOk ? "All hard rules hold" : "Some hard rules are broken"}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {report.hardOk
              ? `Everyone races everyone once, there's time to change boats, nobody stays in a boat more than ${report.maxStint} races, and no team gets more than 2 races ahead.`
              : problems.join(", ") + "."}
          </Text>
        </Box>
      </Flex>

      <DataList.Root orientation="horizontal" size="sm" gap={2}>
        {rows.map(([label, value]) => (
          <DataList.Item key={label} alignItems="flex-start">
            <DataList.ItemLabel minW={{ base: "120px", md: "160px" }}>{label}</DataList.ItemLabel>
            <DataList.ItemValue>{value}</DataList.ItemValue>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Collapsible.Root mt={3}>
        <Collapsible.Trigger asChild>
          <Flex
            as="button"
            align="center"
            gap={1}
            fontSize="sm"
            color="fg.muted"
            cursor="pointer"
            css={{ "&[data-state=open] svg": { transform: "rotate(180deg)" } }}
          >
            Full report <TbChevronDown />
          </Flex>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Code
            display="block"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            p={3}
            mt={2}
            fontSize="xs"
          >
            {report.summary}
            {`\n  generated in:         ${(elapsedMs / 1000).toFixed(1)} s`}
          </Code>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}
