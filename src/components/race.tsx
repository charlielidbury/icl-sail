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
import { useEffect, useRef, useState } from "react";

function RaceCard({ race, active }: { race: RaceResult; active: boolean }) {
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
  const [isVisible, setIsVisible] = useState(false);
  const raceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.5 } // Element is considered visible when 50% is in view
    );

    if (raceRef.current) {
      observer.observe(raceRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!active) {
    return (
      <Card.Root ref={raceRef} _hover={{ cursor: "pointer" }}>
        <Card.Body>
          <RaceCard race={race} active={active} />
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <>
      <Card.Root
        ref={raceRef}
        _hover={{ cursor: "pointer" }}
        borderWidth={active ? "2px" : "1px"}
        borderColor={active ? "red.500" : "inherit"}
      >
        <Card.Body>
          <RaceCard race={race} active={active} />
        </Card.Body>
      </Card.Root>

      {isVisible && (
        <DialogRoot size="full" motionPreset="slide-in-bottom">
          <DialogTrigger asChild>
            <Button
              position="fixed"
              bottom="4"
              right="4"
              borderRadius="full"
              width="60px"
              height="60px"
              zIndex={10}
            >
              {race.number}
            </Button>
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
      )}
    </>
  );
}
