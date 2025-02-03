import { Card, Flex, Text, Button, VStack } from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RaceResult } from "../shared";

function RaceCard({ race }: { race: RaceResult; active: boolean }) {
  return (
    <Flex gap="4" align="center">
      <Text>{race.number}</Text>
      <Flex gap="4" justify="center" align="center">
        {race.raceteam[0] && (
          <VStack>
            <Text textStyle="2xl">{race.raceteam[0].team.name}</Text>
            {race.raceteam[0].result?.join(",")}
          </VStack>
        )}
        <Text>vs</Text>
        {race.raceteam[1] && (
          <VStack>
            <Text textStyle="2xl">{race.raceteam[1].team.name}</Text>
            {race.raceteam[1].result?.join(",")}
          </VStack>
        )}
      </Flex>
    </Flex>
  );
}

export default function Race({
  race,
  active,
}: {
  race: RaceResult;
  active: boolean;
}) {
  return (
    <DialogRoot size="full" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        {/* Visible Card */}
        <Card.Root
          onClick={() => {}}
          _hover={{ cursor: "pointer" }}
          borderWidth={active ? "2px" : "1px"}
          borderColor={active ? "red.500" : "inherit"}
        >
          <Card.Body>
            <RaceCard race={race} active={active} />
          </Card.Body>
        </Card.Root>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Race {race.number}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RaceCard race={race} active={active} />
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </DialogActionTrigger>
          <Button>Save</Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}
