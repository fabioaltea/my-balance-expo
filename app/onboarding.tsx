import React from 'react';
import OnboardingView from '@/src/views/onboarding-view';
import { ScreenView } from '@/src/components/core';
import { Text } from 'react-native';

export default function Onboarding() {
  return (
    <ScreenView>
      <OnboardingView />
    </ScreenView>
  );
}
