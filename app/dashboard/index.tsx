import { Redirect } from 'expo-router';
import React from 'react';

export default function DashboardIndex() {
  return <Redirect href="/dashboard/home" />;
}
