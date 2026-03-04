export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  WorkoutForm: { workoutId?: string } | undefined;
  FoodEntryForm: { entryId?: string } | undefined;
  SleepForm: { checkInId?: string } | undefined;
  GoalForm: { goalId?: string } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Body: undefined;
  Energy: undefined;
  Goals: undefined;
  Insights: undefined;
  Settings: undefined;
};
