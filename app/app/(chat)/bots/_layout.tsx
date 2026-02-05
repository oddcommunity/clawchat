import { Stack } from 'expo-router';

export default function BotsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Bot Directory',
        }}
      />
      <Stack.Screen
        name="[botId]"
        options={{
          title: 'Bot Details',
        }}
      />
      <Stack.Screen
        name="add-private"
        options={{
          title: 'Add Private Bot',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
