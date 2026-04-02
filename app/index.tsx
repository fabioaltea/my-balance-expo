import { Redirect } from 'expo-router';
import React from 'react';

const Index: React.FC = () => {
  return <Redirect href="/dashboard/home" />;
};

export default Index;
