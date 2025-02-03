import { Card, Flex, Text, Button } from "@chakra-ui/react";
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

export default function Race() {
  return (
    <DialogRoot size="full" motionPreset="slide-in-bottom">
      <DialogTrigger asChild>
        {/* Visible Card */}
        <Card.Root onClick={() => {}} _hover={{ cursor: "pointer" }}>
          <Card.Body>
            <Flex gap="4">
              <Text>13</Text>
              <Text>Cambridge White</Text>
              <Text>vs</Text>
              <Text>Imperial Blue</Text>
            </Flex>
          </Card.Body>
        </Card.Root>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
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
