"use client";

import { Box, Stack, Heading, Button, Text } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import {
  NumberInputRoot,
  NumberInputField,
} from "@/components/ui/number-input";
import { Checkbox } from "@/components/ui/checkbox";
import NavBar from "@/components/navbar";
import { queryClient, sailingColour, SharedLogic, useAuth } from "@/shared";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import supabase from "@/supabase";
import { Database } from "@/database.types";
import { useEffect, useState } from "react";

type Settings = Database["public"]["Tables"]["settings"]["Row"];

function SettingsPage() {
  const { isAdmin } = useAuth();

  const { data: remoteSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  useEffect(() => {
    console.log("remoteSettings", remoteSettings);
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings]);

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Settings) => {
      if (!settings?.uuid) return;

      await supabase
        .from("settings")
        .update(newSettings)
        .eq("uuid", settings.uuid);
    },
  });

  if (!isAdmin) {
    return (
      <Box>
        <NavBar isAdmin={isAdmin} />
        <Box p={4}>
          <Text>You do not have permission to access this page.</Text>
        </Box>
      </Box>
    );
  }

  if (isLoading || !settings) {
    return (
      <Box>
        <NavBar isAdmin={isAdmin} />
        <Box p={4}>
          <Text>Loading...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Box position="sticky" top="0" zIndex="100">
        <NavBar isAdmin={isAdmin} />
      </Box>
      <Box maxW="container.xl" mx="auto" p={8}>
        <Box maxW="md" mx="auto" bg="white" borderRadius="xl" p={8} shadow="sm">
          <Heading size="lg" color="gray.700" mb={8}>
            Settings
          </Heading>

          <Stack gap={6}>
            <Field label="Go to Stand Notification">
              <NumberInputRoot
                value={settings.go_to_stand.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, go_to_stand: Number(value.value) })
                }
                min={0}
                max={10}
              >
                <NumberInputField />
              </NumberInputRoot>
            </Field>

            <Field label="Show Time Estimates">
              <Checkbox
                checked={settings.estimates}
                onCheckedChange={(v) =>
                  setSettings({ ...settings, estimates: !!v.checked })
                }
                colorScheme={sailingColour}
              />
            </Field>

            <Box mt={2}>
              <Button
                onClick={() => saveSettings.mutate(settings)}
                loading={saveSettings.isPending}
                disabled={
                  settings.estimates === remoteSettings?.estimates &&
                  settings.go_to_stand === remoteSettings?.go_to_stand
                }
                colorScheme="blue"
                bg={sailingColour}
                _hover={{ bg: `${sailingColour}dd` }}
                size="lg"
                w="full"
              >
                Save Changes
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedLogic />
      <SettingsPage />
    </QueryClientProvider>
  );
}
